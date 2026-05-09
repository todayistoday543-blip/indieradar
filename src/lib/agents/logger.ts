import { createServiceClient } from '@/lib/supabase';

export interface AgentResult {
  items_processed: number;
  items_failed: number;
  output: Record<string, unknown>;
}

export interface AgentLogEntry {
  id: string;
  agent_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  items_processed: number;
  items_failed: number;
  output: Record<string, unknown> | null;
  error_message: string | null;
}

/**
 * Wraps an agent's main logic with automatic logging to agent_logs table.
 * Creates a 'running' row at start, then updates to 'completed' or 'failed'.
 */
export async function logAgentRun(
  agentName: string,
  fn: (supabase: ReturnType<typeof createServiceClient>) => Promise<AgentResult>
): Promise<{ log: AgentLogEntry; result: AgentResult | null }> {
  const supabase = createServiceClient();
  const startedAt = new Date();

  // Create initial log entry
  const { data: logRow, error: insertError } = await supabase
    .from('agent_logs')
    .insert({
      agent_name: agentName,
      status: 'running',
      started_at: startedAt.toISOString(),
    })
    .select()
    .single();

  const logId = logRow?.id;

  try {
    const result = await fn(supabase);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    if (logId) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'completed',
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs,
          items_processed: result.items_processed,
          items_failed: result.items_failed,
          output: result.output,
        })
        .eq('id', logId);
    }

    return {
      log: {
        id: logId || '',
        agent_name: agentName,
        status: 'completed',
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        items_processed: result.items_processed,
        items_failed: result.items_failed,
        output: result.output,
        error_message: null,
      },
      result,
    };
  } catch (err) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = err instanceof Error ? err.message : String(err);

    if (logId) {
      await supabase
        .from('agent_logs')
        .update({
          status: 'failed',
          completed_at: completedAt.toISOString(),
          duration_ms: durationMs,
          error_message: errorMessage,
        })
        .eq('id', logId);
    }

    return {
      log: {
        id: logId || '',
        agent_name: agentName,
        status: 'failed',
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_ms: durationMs,
        items_processed: 0,
        items_failed: 0,
        output: null,
        error_message: errorMessage,
      },
      result: null,
    };
  }
}
