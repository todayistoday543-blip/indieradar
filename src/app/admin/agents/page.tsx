'use client';

import { useEffect, useState, useCallback } from 'react';

interface AgentSummary {
  last_run: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  last_items: number;
  runs_24h: number;
  failures_24h: number;
  success_rate_24h: number;
}

interface AgentLog {
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

const AGENT_META: Record<string, { emoji: string; label: string; description: string }> = {
  'collect':               { emoji: '📡', label: 'Collector',       description: '4ソースから記事を収集' },
  'backfill-all':          { emoji: '🔄', label: 'EN Enricher',     description: 'EN再エンリッチ + JA/ES翻訳' },
  'backfill-translations': { emoji: '🌐', label: 'Translator',      description: '未翻訳記事のJA/ES補完' },
  'content-quality':       { emoji: '🔍', label: 'Quality Check',   description: '重複・低品質記事の検出' },
  'health-monitor':        { emoji: '💚', label: 'Health Monitor',   description: 'システム全体の健全性チェック' },
  'alert-notify':          { emoji: '🔔', label: 'Alert Notifier',  description: 'ユーザーアラートのマッチング' },
  'newsletter-digest':     { emoji: '📰', label: 'Newsletter',      description: '週刊ダイジェスト配信' },
  'analytics-summary':     { emoji: '📊', label: 'Analytics',       description: '日次アナリティクス集計' },
  'cleanup':               { emoji: '🧹', label: 'Cleanup',         description: '古いデータの自動削除' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-emerald-500/20 text-emerald-400',
    running: 'bg-amber-500/20 text-amber-400',
    failed: 'bg-red-500/20 text-red-400',
    never_run: 'bg-zinc-500/20 text-zinc-400',
    healthy: 'bg-emerald-500/20 text-emerald-400',
    degraded: 'bg-amber-500/20 text-amber-400',
    critical: 'bg-red-500/20 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider ${colors[status] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {status}
    </span>
  );
}

export default function AgentDashboard() {
  const [summary, setSummary] = useState<Record<string, AgentSummary>>({});
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [cronSecret, setCronSecret] = useState('');
  const [secretInput, setSecretInput] = useState('');

  const fetchData = useCallback(async () => {
    if (!cronSecret) return;

    try {
      const url = filter === 'all'
        ? '/api/admin/agents?limit=50'
        : `/api/admin/agents?agent_name=${filter}&limit=50`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });

      if (!res.ok) {
        setError(`API error: ${res.status}`);
        return;
      }

      const data = await res.json();
      setSummary(data.summary || {});
      setLogs(data.logs || []);
      setAgents(data.agents || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, [cronSecret, filter]);

  useEffect(() => {
    if (cronSecret) {
      fetchData();
    }
  }, [cronSecret, filter, fetchData]);

  useEffect(() => {
    if (!autoRefresh || !cronSecret) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, cronSecret, fetchData]);

  // Auth gate — require CRON_SECRET
  if (!cronSecret) {
    return (
      <div className="min-h-screen bg-[var(--ink-0)] flex items-center justify-center">
        <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-xl p-8 max-w-md w-full">
          <h1 className="text-xl font-semibold text-[var(--paper-2)] mb-4 font-[family-name:var(--font-display)]">
            🤖 Agent Dashboard
          </h1>
          <p className="text-sm text-[var(--ink-5)] mb-6">
            管理者アクセスキーを入力してください
          </p>
          <form onSubmit={(e) => { e.preventDefault(); setCronSecret(secretInput); }}>
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="CRON_SECRET"
              className="w-full bg-[var(--ink-0)] border border-[var(--ink-3)] rounded-lg px-4 py-2.5 text-sm text-[var(--paper-2)] focus:outline-none focus:border-[var(--signal-gold)] mb-4 font-mono"
            />
            <button
              type="submit"
              className="w-full bg-[var(--signal-gold)] text-[var(--ink-0)] rounded-lg px-4 py-2.5 text-sm font-medium hover:brightness-110 transition-all"
            >
              アクセス
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--ink-0)] text-[var(--paper-2)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold font-[family-name:var(--font-display)]">
              🤖 Agent Operations
            </h1>
            <p className="text-sm text-[var(--ink-5)] mt-1">
              IndieRadar 自動運営システム
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-[var(--ink-5)]">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh (30s)
            </label>
            <button
              onClick={fetchData}
              className="text-xs bg-[var(--ink-2)] hover:bg-[var(--ink-3)] px-3 py-1.5 rounded-md transition-colors font-mono"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Agent Status Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {agents.map((name) => {
            const meta = AGENT_META[name] || { emoji: '⚙️', label: name, description: '' };
            const s = summary[name];
            return (
              <div
                key={name}
                className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-xl p-4 hover:border-[var(--ink-3)] transition-colors cursor-pointer"
                onClick={() => setFilter(filter === name ? 'all' : name)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{meta.emoji}</span>
                    <span className="text-sm font-medium font-mono">{meta.label}</span>
                  </div>
                  {s ? (
                    <StatusBadge status={s.last_status || 'never_run'} />
                  ) : (
                    <StatusBadge status="never_run" />
                  )}
                </div>

                <p className="text-[11px] text-[var(--ink-5)] mb-3">{meta.description}</p>

                {s && s.last_run ? (
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex justify-between text-[var(--ink-5)]">
                      <span>Last run</span>
                      <span className="text-[var(--paper-1)]">{timeAgo(s.last_run)}</span>
                    </div>
                    <div className="flex justify-between text-[var(--ink-5)]">
                      <span>Duration</span>
                      <span className="text-[var(--paper-1)]">{s.last_duration_ms ? `${(s.last_duration_ms / 1000).toFixed(1)}s` : '—'}</span>
                    </div>
                    <div className="flex justify-between text-[var(--ink-5)]">
                      <span>Items</span>
                      <span className="text-[var(--paper-1)]">{s.last_items}</span>
                    </div>
                    <div className="flex justify-between text-[var(--ink-5)]">
                      <span>24h success</span>
                      <span className={s.success_rate_24h >= 80 ? 'text-emerald-400' : s.success_rate_24h >= 50 ? 'text-amber-400' : 'text-red-400'}>
                        {s.runs_24h > 0 ? `${s.success_rate_24h}% (${s.runs_24h} runs)` : 'No runs'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--ink-4)] italic">Not yet run</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setFilter('all')}
            className={`text-[11px] font-mono px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-[var(--signal-gold)] text-[var(--ink-0)]' : 'bg-[var(--ink-2)] text-[var(--ink-5)] hover:text-[var(--paper-1)]'
            }`}
          >
            ALL
          </button>
          {agents.map((name) => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                filter === name ? 'bg-[var(--signal-gold)] text-[var(--ink-0)]' : 'bg-[var(--ink-2)] text-[var(--ink-5)] hover:text-[var(--paper-1)]'
              }`}
            >
              {AGENT_META[name]?.emoji || '⚙️'} {name}
            </button>
          ))}
        </div>

        {/* Recent Runs Timeline */}
        <div className="bg-[var(--ink-1)] border border-[var(--ink-2)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ink-2)]">
            <h2 className="text-sm font-medium font-mono">
              Recent Runs {filter !== 'all' && `— ${filter}`}
            </h2>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--ink-5)]">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[var(--ink-5)]">No agent runs recorded yet</div>
          ) : (
            <div className="divide-y divide-[var(--ink-2)]">
              {logs.map((log) => {
                const meta = AGENT_META[log.agent_name] || { emoji: '⚙️', label: log.agent_name };
                const isExpanded = expandedLog === log.id;
                return (
                  <div key={log.id}>
                    <div
                      className="px-4 py-3 flex items-center gap-4 hover:bg-[var(--ink-2)]/50 cursor-pointer transition-colors text-sm"
                      onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    >
                      <span className="text-xs text-[var(--ink-5)] font-mono w-[100px] shrink-0">
                        {new Date(log.started_at).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm shrink-0">{meta.emoji}</span>
                      <span className="text-xs font-mono text-[var(--paper-1)] w-[140px] shrink-0 truncate">
                        {log.agent_name}
                      </span>
                      <StatusBadge status={log.status} />
                      <span className="text-xs text-[var(--ink-5)] font-mono">
                        {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '—'}
                      </span>
                      <span className="text-xs text-[var(--ink-5)] font-mono">
                        {log.items_processed} items
                        {log.items_failed > 0 && <span className="text-red-400 ml-1">({log.items_failed} failed)</span>}
                      </span>
                      <span className="text-xs text-[var(--ink-4)] ml-auto">{isExpanded ? '▼' : '▶'}</span>
                    </div>

                    {isExpanded && (
                      <div className="px-4 pb-4 bg-[var(--ink-0)]/50">
                        {log.error_message && (
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 mb-2 text-xs text-red-400 font-mono">
                            {log.error_message}
                          </div>
                        )}
                        {log.output && (
                          <pre className="text-[11px] text-[var(--ink-5)] font-mono bg-[var(--ink-1)] rounded-lg p-3 overflow-x-auto max-h-[300px] overflow-y-auto">
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
