'use client';

import { useEffect, useState, useCallback } from 'react';
import { useUser } from '@/components/user-context';
import { useI18n } from '@/i18n/context';
import Link from 'next/link';

const CATEGORIES = [
  'saas',
  'marketplace',
  'ecommerce',
  'api',
  'digital_products',
  'services',
  'content',
  'community',
  'opensource',
  'hardware',
  'subscription',
] as const;

interface Alert {
  id: string;
  user_id: string;
  keywords: string[];
  min_mrr: number | null;
  categories: string[];
  is_active: boolean;
  notify_email: boolean;
  created_at: string;
  updated_at: string;
}

export default function AlertsPage() {
  const { userId, plan, loading: userLoading } = useUser();
  const { t } = useI18n();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [minMrr, setMinMrr] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [notifyEmail, setNotifyEmail] = useState(true);

  const categoryLabelMap: Record<string, string> = {
    saas: t.articles.cat_saas,
    marketplace: t.articles.cat_marketplace,
    ecommerce: t.articles.cat_ecommerce,
    api: t.articles.cat_api,
    digital_products: t.articles.cat_digital_products,
    services: t.articles.cat_services,
    content: t.articles.cat_content,
    community: t.articles.cat_community,
    opensource: t.articles.cat_opensource,
    hardware: t.articles.cat_hardware,
    subscription: t.articles.cat_subscription,
  };

  const fetchAlerts = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/alerts?user_id=${userId}`);
      const data = await res.json();
      if (data.alerts) setAlerts(data.alerts);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // TEMPORARY: plan check disabled (trial period). To restore: userId && plan === 'pro'
    if (userId) {
      fetchAlerts();
    } else {
      setLoading(false);
    }
  }, [userId, plan, fetchAlerts]);

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
    }
    setKeywordInput('');
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword();
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || keywords.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          keywords,
          min_mrr: minMrr ? parseInt(minMrr) : null,
          categories: selectedCategories,
          notify_email: notifyEmail,
        }),
      });

      if (res.ok) {
        // Reset form
        setKeywords([]);
        setKeywordInput('');
        setMinMrr('');
        setSelectedCategories([]);
        setNotifyEmail(true);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchAlerts();
      } else {
        const data = await res.json().catch(() => ({}));
        setSaveError(data.error || t.common.error_load);
      }
    } catch {
      setSaveError(t.common.error_network);
    }
    setSaving(false);
  };

  const toggleAlertActive = async (alert: Alert) => {
    // Optimistic update first for instant feedback
    const newActive = !alert.is_active;
    setAlerts((prev) =>
      prev.map((a) => (a.id === alert.id ? { ...a, is_active: newActive } : a))
    );

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.id,
          user_id: userId,
          keywords: alert.keywords,
          min_mrr: alert.min_mrr,
          categories: alert.categories,
          notify_email: alert.notify_email,
          is_active: newActive,
        }),
      });

      if (!res.ok) {
        // Revert optimistic update on failure
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, is_active: alert.is_active } : a))
        );
      }
    } catch {
      // Revert on network error
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, is_active: alert.is_active } : a))
      );
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!window.confirm(t.alerts.delete_confirm)) return;
    try {
      const res = await fetch('/api/alerts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, user_id: userId }),
      });

      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch {
      // silently fail
    }
  };

  if (userLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-40 w-full mb-4" />
        <div className="skeleton h-20 w-full" />
      </div>
    );
  }

  // Not logged in
  if (!userId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center animate-fade-in">
          <div className="mx-auto w-14 h-14 bg-[var(--ink-1)] border border-[var(--ink-2)] flex items-center justify-center mb-5">
            <svg className="w-7 h-7 text-[var(--ink-5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--paper-3)] mb-2">{t.alerts.heading}</h1>
          <p className="text-[var(--ink-5)] mb-6">{t.settings.login_required}</p>
          <Link
            href="/auth/login"
            className="inline-block bg-[var(--signal-gold)] px-7 py-3 text-[var(--ink-0)] font-semibold hover:brightness-110 transition-all font-mono text-sm tracking-wide"
          >
            {t.common.login}
          </Link>
        </div>
      </div>
    );
  }

  // TEMPORARY: plan gate disabled (trial period). To restore: plan !== 'pro'
  if (false) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center animate-fade-in">
        <div
          className="border border-[var(--ink-2)] rounded-lg p-8"
          style={{ background: 'var(--ink-1)' }}
        >
          <svg
            className="mx-auto mb-4 text-[var(--signal-gold)]"
            width="48"
            height="48"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          <h2
            className="text-xl font-bold text-[var(--paper-3)] mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {t.alerts.pro_required}
          </h2>
          <p className="text-sm text-[var(--ink-5)] mb-6">{t.alerts.pro_desc}</p>
          <Link
            href="/pricing"
            className="inline-block rounded-md bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-all"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.detail.upgrade_pro_button}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 animate-fade-in">
      <h1
        className="text-2xl font-bold text-[var(--paper-3)] mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {t.alerts.heading}
      </h1>
      <p className="text-sm text-[var(--ink-5)] mb-8">{t.alerts.subtitle}</p>

      {/* Create alert form */}
      <form
        onSubmit={handleSubmit}
        className="border border-[var(--ink-2)] rounded-lg p-6 mb-8"
        style={{ background: 'var(--ink-1)' }}
      >
        <h2
          className="text-sm uppercase tracking-wider text-[var(--signal-gold)] mb-4"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.15em' }}
        >
          {t.alerts.create}
        </h2>

        {/* Keywords */}
        <div className="mb-5">
          <label
            className="block text-xs text-[var(--ink-5)] mb-1.5 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.alerts.keywords_label}
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-[var(--signal-gold)] text-[var(--signal-gold)]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {kw}
                <button
                  type="button"
                  onClick={() => removeKeyword(kw)}
                  className="ml-1 hover:text-[var(--signal-warn)] transition-colors"
                >
                  x
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={handleKeywordKeyDown}
            onBlur={addKeyword}
            placeholder={t.alerts.keywords_placeholder}
            className="w-full bg-[var(--ink-0)] border border-[var(--ink-2)] rounded-lg px-4 py-3 text-sm text-[var(--paper-2)] placeholder-[var(--ink-4)] focus:border-[var(--signal-gold)] focus:outline-none transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Min MRR */}
        <div className="mb-5">
          <label
            className="block text-xs text-[var(--ink-5)] mb-1.5 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.alerts.min_mrr_label}
          </label>
          <input
            type="number"
            value={minMrr}
            onChange={(e) => setMinMrr(e.target.value)}
            min="0"
            placeholder="$0"
            className="w-full bg-[var(--ink-0)] border border-[var(--ink-2)] rounded-lg px-4 py-3 text-sm text-[var(--paper-2)] placeholder-[var(--ink-4)] focus:border-[var(--signal-gold)] focus:outline-none transition-colors"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>

        {/* Categories */}
        <div className="mb-5">
          <label
            className="block text-xs text-[var(--ink-5)] mb-2 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {t.alerts.categories_label}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <label
                key={cat}
                className="flex items-center gap-2 cursor-pointer text-xs text-[var(--paper-1)] hover:text-[var(--paper-2)] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat)}
                  onChange={() => toggleCategory(cat)}
                  className="accent-[var(--signal-gold)]"
                />
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  {categoryLabelMap[cat]}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Email notification toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-10 h-5 rounded-full transition-colors"
              style={{
                background: notifyEmail ? 'var(--signal-gold)' : 'var(--ink-3)',
              }}
              onClick={() => setNotifyEmail(!notifyEmail)}
            >
              <div
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                style={{
                  transform: notifyEmail ? 'translateX(22px)' : 'translateX(2px)',
                }}
              />
            </div>
            <span
              className="text-xs text-[var(--paper-1)] uppercase tracking-wider"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {t.alerts.email_notify}
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving || keywords.length === 0}
          className="rounded-lg bg-[var(--signal-gold)] text-[var(--ink-0)] px-6 py-3 text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {saving ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t.common.loading}
            </>
          ) : (
            t.alerts.save
          )}
        </button>

        {saveError && (
          <p className="text-sm text-red-400 mt-3 flex items-center gap-1.5">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c.866 1.5-.217 3.374-1.948 3.374H2.645c-1.73 0-2.813-1.874-1.948-3.374L10.051 3.378c.866-1.5 3.032-1.5 3.898 0L21.303 16.126z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75h.007v.008H12v-.008z" />
            </svg>
            {saveError}
          </p>
        )}
        {saveSuccess && (
          <p className="text-sm text-emerald-400 mt-3 animate-fade-in">{t.settings.saved}</p>
        )}
      </form>

      {/* Existing alerts list */}
      <div>
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-[var(--ink-5)] text-center py-8">
            {t.alerts.no_alerts}
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="border border-[var(--ink-2)] rounded-lg p-4 flex items-start justify-between gap-4"
                style={{
                  background: 'var(--ink-1)',
                  opacity: alert.is_active ? 1 : 0.5,
                }}
              >
                <div className="flex-1 min-w-0">
                  {/* Keyword pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {alert.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-block px-2 py-0.5 text-[10px] border border-[var(--signal-gold)] text-[var(--signal-gold)]"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                  {/* Meta line */}
                  <div
                    className="flex flex-wrap gap-3 text-[10px] text-[var(--ink-5)]"
                    style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
                  >
                    {alert.min_mrr && (
                      <span>MRR &ge; ${alert.min_mrr}</span>
                    )}
                    {alert.categories.length > 0 && (
                      <span>
                        {alert.categories
                          .map((c) => categoryLabelMap[c] || c)
                          .join(', ')}
                      </span>
                    )}
                    {alert.notify_email && <span>EMAIL ON</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAlertActive(alert)}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      borderColor: alert.is_active
                        ? 'var(--signal-live)'
                        : 'var(--ink-3)',
                      color: alert.is_active
                        ? 'var(--signal-live)'
                        : 'var(--ink-5)',
                    }}
                  >
                    {alert.is_active ? t.alerts.active : t.alerts.inactive}
                  </button>
                  <button
                    onClick={() => deleteAlert(alert.id)}
                    className="text-[10px] uppercase tracking-wider px-2.5 py-1 border border-[var(--signal-warn)] text-[var(--signal-warn)] hover:bg-[var(--signal-warn)] hover:text-[var(--ink-0)] transition-colors"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {t.alerts.delete}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Back link */}
      <div className="mt-10 pt-6 border-t border-[var(--ink-2)]">
        <Link
          href="/articles"
          className="text-sm text-[var(--signal-gold)] hover:opacity-80 transition flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          {t.common.back_to_articles}
        </Link>
      </div>
    </div>
  );
}
