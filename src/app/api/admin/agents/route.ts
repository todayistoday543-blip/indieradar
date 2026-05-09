import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALL_AGENTS = [
  'collect', 'backfill-all', 'backfill-translations',
  'content-quality', 'health-monitor', 'alert-notify',
  'newsletter-digest', 'analytics-summary', 'cleanup',
];

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const agentName = searchParams.get('agent_name');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const offset = parseInt(searchParams.get('offset') || '0');

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }

  // Fetch logs
  let query = supabase
    .from('agent_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (agentName) {
    query = query.eq('agent_name', agentName);
  }

  const { data: logs, error: logsErr } = await query;
  if (logsErr) {
    return NextResponse.json({ error: logsErr.message }, { status: 500 });
  }

  // Build per-agent summary
  const summary: Record<string, {
    last_run: string | null;
    last_status: string | null;
    last_duration_ms: number | null;
    last_items: number;
    runs_24h: number;
    failures_24h: number;
    success_rate_24h: number;
  }> = {};

  const yesterday = new Date(Date.now() - 86400_000).toISOString();

  for (const name of ALL_AGENTS) {
    // Last run
    const { data: lastRun } = await supabase
      .from('agent_logs')
      .select('status, started_at, duration_ms, items_processed')
      .eq('agent_name', name)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 24h stats
    const { data: recentRuns } = await supabase
      .from('agent_logs')
      .select('status')
      .eq('agent_name', name)
      .gte('started_at', yesterday);

    const total = recentRuns?.length || 0;
    const failures = recentRuns?.filter(r => r.status === 'failed').length || 0;

    summary[name] = {
      last_run: lastRun?.started_at || null,
      last_status: lastRun?.status || null,
      last_duration_ms: lastRun?.duration_ms || null,
      last_items: lastRun?.items_processed || 0,
      runs_24h: total,
      failures_24h: failures,
      success_rate_24h: total > 0 ? Math.round(((total - failures) / total) * 100) : 0,
    };
  }

  return NextResponse.json({
    logs: logs || [],
    summary,
    agents: ALL_AGENTS,
  });
}
