import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Newsletter Digest Agent
 * Runs weekly (Monday 9:00 UTC / 18:00 JST).
 * Composes a weekly digest of top articles and sends to subscribers.
 * Requires RESEND_API_KEY + RESEND_FROM_EMAIL to send emails.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('newsletter-digest', async (supabase) => {
    // 1. Get top articles from the past week
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const weekStart = new Date(weekAgo);
    weekStart.setUTCHours(0, 0, 0, 0);

    const { data: articles, error: artErr } = await supabase
      .from('articles')
      .select('id, en_title, en_summary, ja_title, ja_summary, es_title, es_summary, mrr_mentioned, upvotes, view_count, original_url, source, business_model')
      .eq('status', 'published')
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (artErr) throw new Error(`Fetch articles: ${artErr.message}`);

    // Score and rank
    const scored = (articles || [])
      .map(a => ({
        ...a,
        score: (a.upvotes ?? 0) * 2 + (a.view_count ?? 0) + (a.mrr_mentioned ? 500 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (scored.length === 0) {
      return {
        items_processed: 0,
        items_failed: 0,
        output: { message: 'No articles this week to include in newsletter' },
      };
    }

    // 2. Compose newsletter content (structured data for email template)
    const digestData = {
      week_of: weekStart.toISOString().split('T')[0],
      top_article: scored[0]?.en_title || 'This Week on IndieRadar',
      articles: scored.map(a => ({
        id: a.id,
        en_title: a.en_title,
        ja_title: a.ja_title,
        es_title: a.es_title,
        en_summary: a.en_summary?.slice(0, 200),
        ja_summary: a.ja_summary?.slice(0, 200),
        es_summary: a.es_summary?.slice(0, 200),
        mrr: a.mrr_mentioned,
        source: a.source,
        model: a.business_model,
        url: a.original_url,
        score: a.score,
      })),
    };

    // 3. Fetch subscribers
    const { data: subscribers, error: subErr } = await supabase
      .from('newsletter_subscribers')
      .select('id, email, locale')
      .eq('is_active', true);

    if (subErr) throw new Error(`Fetch subscribers: ${subErr.message}`);

    const subscriberCount = subscribers?.length || 0;
    let emailsSent = 0;
    let emailErrors = 0;

    // 4. Send emails (when RESEND_API_KEY is configured)
    if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL && subscriberCount > 0) {
      const fromEmail = process.env.RESEND_FROM_EMAIL;
      const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://indieradars.com').trim();

      // Group subscribers by locale
      const byLocale: Record<string, string[]> = {};
      for (const sub of subscribers!) {
        const locale = sub.locale || 'en';
        if (!byLocale[locale]) byLocale[locale] = [];
        byLocale[locale].push(sub.email);
      }

      for (const [locale, emails] of Object.entries(byLocale)) {
        const titleKey = locale === 'ja' ? 'ja_title' : locale === 'es' ? 'es_title' : 'en_title';
        const summaryKey = locale === 'ja' ? 'ja_summary' : locale === 'es' ? 'es_summary' : 'en_summary';

        const subject = locale === 'ja'
          ? `IndieRadar週刊: ${digestData.articles[0]?.ja_title || digestData.top_article}`
          : locale === 'es'
            ? `IndieRadar Semanal: ${digestData.articles[0]?.es_title || digestData.top_article}`
            : `IndieRadar Weekly: ${digestData.top_article}`;

        const articleList = digestData.articles
          .map((a, i) => {
            const title = (a as Record<string, unknown>)[titleKey] as string || a.en_title;
            const summary = (a as Record<string, unknown>)[summaryKey] as string || a.en_summary || '';
            return `${i + 1}. <strong>${title}</strong>${a.mrr ? ` — $${a.mrr} MRR` : ''}<br/>${summary}...<br/><a href="${appUrl}/articles/${a.id}">Read more →</a>`;
          })
          .join('<br/><br/>');

        const html = `
          <div style="max-width:600px;margin:0 auto;font-family:sans-serif;color:#333">
            <h1 style="color:#E8A000">${subject}</h1>
            <p>${locale === 'ja' ? '今週のトップ記事:' : locale === 'es' ? 'Los mejores artículos de esta semana:' : 'Top articles this week:'}</p>
            ${articleList}
            <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
            <p style="font-size:12px;color:#888">
              <a href="${appUrl}/articles">${locale === 'ja' ? 'すべての記事を見る' : locale === 'es' ? 'Ver todos los artículos' : 'View all articles'}</a>
            </p>
          </div>
        `;

        // Send in batches of 50
        for (let i = 0; i < emails.length; i += 50) {
          const batch = emails.slice(i, i + 50);
          try {
            const res = await fetch('https://api.resend.com/emails/batch', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(batch.map(email => ({
                from: fromEmail,
                to: email,
                subject,
                html,
              }))),
            });

            if (res.ok) {
              emailsSent += batch.length;
            } else {
              emailErrors += batch.length;
            }
          } catch {
            emailErrors += batch.length;
          }
        }
      }
    }

    return {
      items_processed: scored.length,
      items_failed: emailErrors,
      output: {
        week_of: digestData.week_of,
        articles_in_digest: scored.length,
        subscriber_count: subscriberCount,
        emails_sent: emailsSent,
        email_errors: emailErrors,
        email_configured: !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
        top_article: digestData.top_article,
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
