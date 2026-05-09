import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * Alert Notification Agent
 * Matches new articles against user-defined keyword alerts and records notifications.
 * Email sending is prepared but requires RESEND_API_KEY to be configured.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('alert-notify', async (supabase) => {
    // Fetch all active alerts with email notification enabled
    const { data: alerts, error: alertErr } = await supabase
      .from('alerts')
      .select('id, user_id, keywords, min_mrr, categories, last_notified_at')
      .eq('is_active', true)
      .eq('notify_email', true)
      .limit(100);

    if (alertErr) throw new Error(`Fetch alerts: ${alertErr.message}`);
    if (!alerts || alerts.length === 0) {
      return { items_processed: 0, items_failed: 0, output: { message: 'No active alerts with email notification' } };
    }

    let notificationsCreated = 0;
    let alertsProcessed = 0;
    let errors = 0;
    const matches: string[] = [];

    for (const alert of alerts) {
      alertsProcessed++;
      const since = alert.last_notified_at || new Date(Date.now() - 86400_000).toISOString();

      // Build keyword search: match any keyword in en_title, en_summary, ja_title, ja_summary
      const keywords: string[] = alert.keywords || [];
      if (keywords.length === 0) continue;

      // Fetch recent articles since last notification
      const { data: articles, error: artErr } = await supabase
        .from('articles')
        .select('id, en_title, en_summary, ja_title, ja_summary, mrr_mentioned, business_model, original_url')
        .gte('created_at', since)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);

      if (artErr) {
        errors++;
        continue;
      }

      if (!articles || articles.length === 0) continue;

      // Filter articles matching keywords
      const matched = articles.filter(article => {
        const searchText = [
          article.en_title,
          article.en_summary,
          article.ja_title,
          article.ja_summary,
        ].filter(Boolean).join(' ').toLowerCase();

        const keywordMatch = keywords.some(kw => searchText.includes(kw.toLowerCase()));
        const mrrMatch = !alert.min_mrr || (article.mrr_mentioned && article.mrr_mentioned >= alert.min_mrr);

        return keywordMatch && mrrMatch;
      });

      if (matched.length === 0) continue;

      // Create notification records
      for (const article of matched) {
        // Check for existing notification (dedup)
        const { data: existing } = await supabase
          .from('alert_notifications')
          .select('id')
          .eq('alert_id', alert.id)
          .eq('article_id', article.id)
          .maybeSingle();

        if (existing) continue;

        const { error: insertErr } = await supabase
          .from('alert_notifications')
          .insert({
            alert_id: alert.id,
            article_id: article.id,
            sent_at: new Date().toISOString(),
          });

        if (insertErr) {
          errors++;
        } else {
          notificationsCreated++;
          matches.push(`Alert ${alert.id} → Article "${article.en_title?.slice(0, 40)}"`);
        }
      }

      // Update last_notified_at
      await supabase
        .from('alerts')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', alert.id);
    }

    // Email sending (when RESEND_API_KEY is configured)
    let emailsSent = 0;
    if (process.env.RESEND_API_KEY && notificationsCreated > 0) {
      // Future: send batch emails via Resend
      // For now, just log that emails would be sent
    }

    return {
      items_processed: alertsProcessed,
      items_failed: errors,
      output: {
        alerts_checked: alertsProcessed,
        notifications_created: notificationsCreated,
        emails_sent: emailsSent,
        matches: matches.slice(0, 20), // cap output size
        email_configured: !!process.env.RESEND_API_KEY,
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
