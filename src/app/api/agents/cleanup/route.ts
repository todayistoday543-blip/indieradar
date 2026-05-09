import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const BATCH_LIMIT = 1000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('cleanup', async (supabase) => {
    const deletions: Record<string, number> = {};
    let totalDeleted = 0;
    let errors = 0;

    // 1. Expired guide_cache (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    {
      const { data, error } = await supabase
        .from('guide_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');

      if (error) {
        errors++;
        deletions['guide_cache_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['guide_cache_expired'] = count;
        totalDeleted += count;
      }
    }

    // 2. Old article_views (older than 90 days) — aggregated view_count is preserved on articles
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString();
    {
      const { data, error } = await supabase
        .from('article_views')
        .delete()
        .lt('created_at', ninetyDaysAgo)
        .select('id')
        .limit(BATCH_LIMIT);

      if (error) {
        errors++;
        deletions['article_views_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['article_views_90d'] = count;
        totalDeleted += count;
      }
    }

    // 3. Old agent_logs (older than 90 days)
    {
      const { data, error } = await supabase
        .from('agent_logs')
        .delete()
        .lt('created_at', ninetyDaysAgo)
        .select('id')
        .limit(BATCH_LIMIT);

      if (error) {
        errors++;
        deletions['agent_logs_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['agent_logs_90d'] = count;
        totalDeleted += count;
      }
    }

    // 4. Old alert_notifications (older than 60 days)
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86400_000).toISOString();
    {
      const { data, error } = await supabase
        .from('alert_notifications')
        .delete()
        .lt('sent_at', sixtyDaysAgo)
        .select('id')
        .limit(BATCH_LIMIT);

      if (error) {
        errors++;
        deletions['alert_notifications_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['alert_notifications_60d'] = count;
        totalDeleted += count;
      }
    }

    // 5. Spam articles older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
    {
      const { data, error } = await supabase
        .from('articles')
        .delete()
        .eq('status', 'spam')
        .lt('created_at', sevenDaysAgo)
        .select('id')
        .limit(BATCH_LIMIT);

      if (error) {
        errors++;
        deletions['spam_articles_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['spam_articles_7d'] = count;
        totalDeleted += count;
      }
    }

    // 6. Flagged articles older than 14 days (auto-confirmed as removed)
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();
    {
      const { data, error } = await supabase
        .from('articles')
        .delete()
        .eq('status', 'flagged')
        .lt('created_at', fourteenDaysAgo)
        .select('id')
        .limit(BATCH_LIMIT);

      if (error) {
        errors++;
        deletions['flagged_articles_error'] = 0;
      } else {
        const count = data?.length || 0;
        deletions['flagged_articles_14d'] = count;
        totalDeleted += count;
      }
    }

    return {
      items_processed: totalDeleted,
      items_failed: errors,
      output: {
        total_deleted: totalDeleted,
        deletions,
        batch_limit: BATCH_LIMIT,
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
