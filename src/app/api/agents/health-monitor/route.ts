import { NextRequest, NextResponse } from 'next/server';
import { logAgentRun } from '@/lib/agents/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const EXPECTED_AGENTS = [
  { name: 'collect', max_gap_hours: 8 },
  { name: 'backfill-all', max_gap_hours: 1 },
  { name: 'backfill-translations', max_gap_hours: 1 },
  { name: 'content-quality', max_gap_hours: 8 },
  { name: 'analytics-summary', max_gap_hours: 26 },
  { name: 'cleanup', max_gap_hours: 26 },
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { log, result } = await logAgentRun('health-monitor', async (supabase) => {
    const issues: string[] = [];
    const agentStatuses: Record<string, unknown> = {};

    // 1. Check last run of each expected agent
    for (const agent of EXPECTED_AGENTS) {
      const { data: lastRun } = await supabase
        .from('agent_logs')
        .select('status, started_at, duration_ms, error_message')
        .eq('agent_name', agent.name)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastRun) {
        agentStatuses[agent.name] = { status: 'never_run' };
        // Don't flag as issue — agent might not be deployed yet
        continue;
      }

      const gapHours = (Date.now() - new Date(lastRun.started_at).getTime()) / 3600_000;
      const isOverdue = gapHours > agent.max_gap_hours;
      const isFailed = lastRun.status === 'failed';

      agentStatuses[agent.name] = {
        last_status: lastRun.status,
        last_run: lastRun.started_at,
        hours_ago: Math.round(gapHours * 10) / 10,
        overdue: isOverdue,
      };

      if (isOverdue) {
        issues.push(`${agent.name} overdue: last ran ${Math.round(gapHours)}h ago (max ${agent.max_gap_hours}h)`);
      }
      if (isFailed) {
        issues.push(`${agent.name} last run FAILED: ${lastRun.error_message?.slice(0, 100)}`);
      }
    }

    // 2. Check agent failure rate (last 24h)
    const yesterday = new Date(Date.now() - 86400_000).toISOString();
    const { data: recentLogs } = await supabase
      .from('agent_logs')
      .select('agent_name, status')
      .gte('started_at', yesterday);

    if (recentLogs && recentLogs.length > 0) {
      const byAgent: Record<string, { total: number; failed: number }> = {};
      for (const l of recentLogs) {
        if (!byAgent[l.agent_name]) byAgent[l.agent_name] = { total: 0, failed: 0 };
        byAgent[l.agent_name].total++;
        if (l.status === 'failed') byAgent[l.agent_name].failed++;
      }
      for (const [name, stats] of Object.entries(byAgent)) {
        const failRate = stats.failed / stats.total;
        if (failRate > 0.5 && stats.total >= 3) {
          issues.push(`${name} high failure rate: ${stats.failed}/${stats.total} (${Math.round(failRate * 100)}%) in 24h`);
        }
      }
    }

    // 3. Check articles collected in last 24h
    const { count: articlesCount } = await supabase
      .from('articles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', yesterday);

    if (articlesCount === 0) {
      issues.push('No articles collected in the last 24h');
    }

    // 4. DB connectivity check
    const tables = ['articles', 'profiles', 'newsletter_subscribers'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('id', { head: true, count: 'exact' });
      if (error) {
        issues.push(`DB table '${table}' unreachable: ${error.message}`);
      }
    }

    // Determine overall status
    const criticalIssues = issues.filter(i => i.includes('unreachable') || i.includes('high failure'));
    const overallStatus = criticalIssues.length > 0
      ? 'critical'
      : issues.length > 0
        ? 'degraded'
        : 'healthy';

    return {
      items_processed: EXPECTED_AGENTS.length + tables.length,
      items_failed: issues.length,
      output: {
        status: overallStatus,
        issues,
        agents: agentStatuses,
        articles_24h: articlesCount ?? 0,
        checked_at: new Date().toISOString(),
      },
    };
  });

  return NextResponse.json({ success: log.status === 'completed', log, result });
}
