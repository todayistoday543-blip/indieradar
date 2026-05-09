import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('analytics-summary', async (supabase) => {
    const yesterday = new Date(Date.now() - 86400_000).toISOString();

    // 1. New articles by source (24h)
    const { data: newArticles } = await supabase
      .from('articles')
      .select('source')
      .gte('created_at', yesterday);

    const bySource: Record<string, number> = {};
    for (const a of newArticles || []) {
      bySource[a.source] = (bySource[a.source] || 0) + 1;
    }

    // 2. Views in 24h
    const { count: views24h } = await supabase
      .from('article_views')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    // 3. New signups (24h)
    const { count: newSignups } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    // 4. New newsletter subscribers (24h)
    const { count: newSubscribers } = await supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday)
      .eq('is_active', true);

    // 5. Active plans breakdown
    const { data: planData } = await supabase
      .from('profiles')
      .select('subscription_plan');

    const plans: Record<string, number> = { free: 0, basic: 0, pro: 0 };
    for (const p of planData || []) {
      const plan = p.subscription_plan || 'free';
      plans[plan] = (plans[plan] || 0) + 1;
    }

    // 6. Total articles & MRR stats
    const { count: totalArticles } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');

    const { count: mrrArticles } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
      .not('mrr_mentioned', 'is', null);

    // 7. Top articles by views (24h)
    const { data: topViewed } = await supabase
      .from('article_views')
      .select('article_id')
      .gte('created_at', yesterday);

    const viewCounts: Record<string, number> = {};
    for (const v of topViewed || []) {
      viewCounts[v.article_id] = (viewCounts[v.article_id] || 0) + 1;
    }
    const topArticleIds = Object.entries(viewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, views: count }));

    const snapshot = {
      date: new Date().toISOString().split('T')[0],
      new_articles: {
        total: newArticles?.length || 0,
        by_source: bySource,
      },
      views_24h: views24h ?? 0,
      new_signups: newSignups ?? 0,
      new_subscribers: newSubscribers ?? 0,
      active_plans: plans,
      total_articles: totalArticles ?? 0,
      mrr_articles: mrrArticles ?? 0,
      top_viewed: topArticleIds,
    };

    // Weekly rollup on Mondays
    let weeklyRollup = null;
    if (new Date().getUTCDay() === 1) {
      const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const { data: weekLogs } = await supabase
        .from('agent_logs')
        .select('output')
        .eq('agent_name', 'analytics-summary')
        .eq('status', 'completed')
        .gte('started_at', weekAgo)
        .order('started_at', { ascending: false })
        .limit(7);

      if (weekLogs && weekLogs.length > 0) {
        let totalViews = 0, totalSignups = 0, totalArticlesAdded = 0;
        for (const l of weekLogs) {
          const o = l.output as Record<string, unknown> | null;
          if (o) {
            totalViews += (o.views_24h as number) || 0;
            totalSignups += (o.new_signups as number) || 0;
            totalArticlesAdded += ((o.new_articles as Record<string, number>)?.total) || 0;
          }
        }
        weeklyRollup = {
          period: '7d',
          total_views: totalViews,
          total_signups: totalSignups,
          total_new_articles: totalArticlesAdded,
          days_with_data: weekLogs.length,
        };
      }
    }

    return {
      items_processed: 1,
      items_failed: 0,
      output: {
        ...snapshot,
        weekly_rollup: weeklyRollup,
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
