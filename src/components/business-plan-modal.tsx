'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';

interface PlanSection {
  id: string;
  title: string;
  content: string;
}

interface BusinessPlanModalProps {
  articleId: string;
  articleTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const STEP_KEYS = ['step_market', 'step_mvp', 'step_monetize', 'step_launch'] as const;

const SECTION_TITLE_MAP: Record<string, string> = {
  market_research: 'section_market',
  mvp_spec: 'section_mvp',
  monetization: 'section_monetize',
  launch_plan: 'section_launch',
  landing_copy: 'section_copy',
};

export default function BusinessPlanModal({
  articleId,
  articleTitle,
  isOpen,
  onClose,
}: BusinessPlanModalProps) {
  const { t, locale } = useI18n();
  const { userId, countryName } = useUser();
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const stepInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const plan = t.plan as Record<string, string>;

  // Animated progress steps during loading
  useEffect(() => {
    if (loading) {
      setStepIndex(0);
      stepInterval.current = setInterval(() => {
        setStepIndex((prev) => (prev < STEP_KEYS.length - 1 ? prev + 1 : prev));
      }, 3000);
    } else {
      if (stepInterval.current) clearInterval(stepInterval.current);
    }
    return () => {
      if (stepInterval.current) clearInterval(stepInterval.current);
    };
  }, [loading]);

  // Expand all sections once loaded
  useEffect(() => {
    if (sections.length > 0) {
      setExpandedSections(new Set(sections.map((s) => s.id)));
    }
  }, [sections]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSections([]);

    try {
      const res = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: articleId,
          user_id: userId,
          locale,
          country_name: countryName || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          setError(plan.daily_limit || 'Daily limit reached');
        } else {
          setError(data.error || t.common.error_load);
        }
        return;
      }

      setSections(data.sections || []);
    } catch {
      setError(t.common.error_network);
    } finally {
      setLoading(false);
    }
  }, [articleId, userId, locale, countryName, plan.daily_limit]);

  // Auto-generate on open
  useEffect(() => {
    if (isOpen && sections.length === 0 && !loading && !error) {
      generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* ignore */ }
  };

  const exportAll = async () => {
    const fullText = sections
      .map((s) => `# ${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');
    await copyToClipboard(fullText, '__export_all');
  };

  const getSectionTitle = (section: PlanSection): string => {
    const key = SECTION_TITLE_MAP[section.id];
    if (key && plan[key]) return plan[key];
    return section.title;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl mx-4 my-6 sm:my-10 max-h-[90vh] overflow-y-auto bg-[var(--ink-0)] border border-[var(--ink-2)] rounded-2xl shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[var(--ink-0)] border-b border-[var(--ink-2)] px-5 sm:px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="min-w-0 flex-1">
            <h2
              className="text-lg font-bold text-[var(--paper-3)] truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {plan.button || 'Start with this idea'}
            </h2>
            <p className="text-xs text-[var(--ink-5)] truncate mt-0.5">{articleTitle}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {sections.length > 0 && (
              <button
                onClick={exportAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--ink-3)] text-[var(--paper-1)] hover:border-[var(--signal-gold)] hover:text-[var(--signal-gold)] transition flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                {copiedId === '__export_all'
                  ? plan.copied || 'Copied!'
                  : plan.export_all || 'Export all'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-[var(--ink-5)] hover:text-[var(--paper-1)] hover:bg-[var(--ink-1)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-6 py-6">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16">
              {/* Spinner */}
              <div className="relative mb-8">
                <div className="w-16 h-16 rounded-full border-2 border-[var(--ink-2)]" />
                <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-2 border-transparent border-t-[var(--signal-gold)] animate-spin" />
              </div>

              {/* Steps */}
              <div className="space-y-3 w-full max-w-xs">
                {STEP_KEYS.map((key, i) => (
                  <div
                    key={key}
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      i <= stepIndex ? 'opacity-100' : 'opacity-20'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 transition-all duration-500 ${
                        i < stepIndex
                          ? 'bg-emerald-400'
                          : i === stepIndex
                          ? 'bg-[var(--signal-gold)] animate-pulse'
                          : 'bg-[var(--ink-3)]'
                      }`}
                    />
                    <span
                      className={`text-sm transition-all duration-500 ${
                        i === stepIndex
                          ? 'text-[var(--signal-gold)] font-medium'
                          : i < stepIndex
                          ? 'text-[var(--ink-5)]'
                          : 'text-[var(--ink-4)]'
                      }`}
                    >
                      {plan[key] || key}
                    </span>
                    {i < stepIndex && (
                      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-[var(--ink-5)] mt-6">
                {plan.generating || 'Generating business plan...'}
              </p>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div className="text-center py-12">
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={generate}
                className="text-sm text-[var(--signal-gold)] hover:opacity-80 transition"
              >
                {t.common.retry}
              </button>
            </div>
          )}

          {/* Generated plan */}
          {!loading && !error && sections.length > 0 && (
            <div className="space-y-3">
              {sections.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const displayTitle = getSectionTitle(section);
                return (
                  <div
                    key={section.id}
                    className="border border-[var(--ink-2)] rounded-xl overflow-hidden bg-[var(--ink-1)]"
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--ink-0)]/30 transition"
                    >
                      <h3
                        className="text-sm font-bold text-[var(--signal-gold)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {displayTitle}
                      </h3>
                      <svg
                        className={`w-4 h-4 text-[var(--ink-5)] transition-transform duration-200 ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>

                    {/* Section content */}
                    {isExpanded && (
                      <div className="px-4 pb-4">
                        <div className="text-sm text-[var(--paper-1)] leading-relaxed whitespace-pre-wrap border-t border-[var(--ink-2)] pt-3">
                          {section.content}
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => copyToClipboard(section.content, section.id)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--ink-3)] text-[var(--ink-5)] hover:border-[var(--signal-gold)] hover:text-[var(--signal-gold)] transition flex items-center gap-1.5"
                          >
                            {copiedId === section.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                                {plan.copied || 'Copied!'}
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                                </svg>
                                {plan.copy || 'Copy'}
                              </>
                            )}
                          </button>
                        </div>
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
