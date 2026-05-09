import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';
import { hasQualitySections } from '@/lib/translator';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SIMILARITY_THRESHOLD = 0.85;
const MIN_CONTENT_LENGTH = 100;
const LOOKBACK_HOURS = 48;

/** Simple normalized similarity (longest common substring ratio) */
function similarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  // Token overlap (Jaccard)
  const t1 = new Set(s1.split(/\s+/));
  const t2 = new Set(s2.split(/\s+/));
  const intersection = [...t1].filter(w => t2.has(w)).length;
  const union = new Set([...t1, ...t2]).size;
  return union === 0 ? 0 : intersection / union;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('content-quality', async (supabase) => {
    const since = new Date(Date.now() - LOOKBACK_HOURS * 3600_000).toISOString();

    // Fetch recent articles
    const { data: recent, error: recentErr } = await supabase
      .from('articles')
      .select('id, original_title, en_title, en_summary, original_content, status, created_at')
      .gte('created_at', since)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(100);

    if (recentErr) throw new Error(`Fetch recent: ${recentErr.message}`);
    if (!recent || recent.length === 0) {
      return { items_processed: 0, items_failed: 0, output: { message: 'No recent articles to check' } };
    }

    // Fetch older articles for duplicate comparison
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const { data: older } = await supabase
      .from('articles')
      .select('id, original_title, en_title')
      .gte('created_at', thirtyDaysAgo)
      .lt('created_at', since)
      .eq('status', 'published')
      .limit(500);

    const allTitles = [...(older || []), ...recent];
    const flagged: string[] = [];
    const duplicates: string[] = [];
    const lowQuality: string[] = [];
    let processed = 0;
    let failed = 0;

    for (const article of recent) {
      processed++;
      const issues: string[] = [];

      // Check 1: Very short content
      if (article.original_content && article.original_content.length < MIN_CONTENT_LENGTH) {
        issues.push('short_content');
      }

      // Check 2: Missing summary after enrichment window
      const age = Date.now() - new Date(article.created_at).getTime();
      if (age > 3600_000 && (!article.en_summary || article.en_summary.length < 200)) {
        issues.push('missing_summary');
      }

      // Check 2b: Summary exists but lacks 7-section structure (old-format content)
      if (article.en_summary && article.en_summary.length >= 200 && !hasQualitySections(article.en_summary)) {
        issues.push('missing_sections');
      }

      // Check 3: Duplicate title
      for (const other of allTitles) {
        if (other.id === article.id) continue;
        const title1 = article.original_title || article.en_title || '';
        const title2 = other.original_title || other.en_title || '';
        if (title1 && title2 && similarity(title1, title2) >= SIMILARITY_THRESHOLD) {
          issues.push(`duplicate_of:${other.id}`);
          duplicates.push(`${article.id} ≈ ${other.id}`);
          break;
        }
      }

      if (issues.length > 0) {
        // Only flag articles with critical issues (not just missing_sections which backfill-all will fix)
        const criticalIssues = issues.filter(i => i !== 'missing_sections');
        if (criticalIssues.length > 0) {
          const { error: updateErr } = await supabase
            .from('articles')
            .update({ status: 'flagged' })
            .eq('id', article.id);

          if (updateErr) {
            failed++;
          } else {
            flagged.push(`${article.id}: ${criticalIssues.join(', ')}`);
          }
        }

        if (issues.some(i => i === 'short_content' || i === 'missing_summary' || i === 'missing_sections')) {
          lowQuality.push(article.id);
        }
      }
    }

    return {
      items_processed: processed,
      items_failed: failed,
      output: {
        total_checked: processed,
        flagged_count: flagged.length,
        duplicates_found: duplicates.length,
        low_quality_found: lowQuality.length,
        flagged,
        duplicates,
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
