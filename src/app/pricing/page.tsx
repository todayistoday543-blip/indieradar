'use client';

import { useState } from 'react';
import { useI18n } from '@/i18n/context';
import { useUser } from '@/components/user-context';
import Link from 'next/link';

export default function PricingPage() {
  const { t } = useI18n();
  const { userId } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const isLoggedIn = !!userId;

  const handleSubscribe = async (plan: 'basic' | 'pro') => {
    if (!userId) return;
    setLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, user_id: userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Checkout creation failed');
      }
    } catch {
      setCheckoutError(t.common.error_network);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-20">
      <div className="text-center mb-14 animate-fade-in">
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--paper-3)] mb-3">
          {t.pricing.heading}
        </h1>
        <p className="text-[var(--ink-5)] text-lg">{t.pricing.subtitle}</p>
        <div className="mt-4 mx-auto w-12 h-[2px] bg-[var(--signal-gold)]" />
      </div>

      {checkoutError && (
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>{checkoutError}</span>
          <button
            onClick={() => setCheckoutError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
        {/* Free */}
        <div className="border border-[var(--ink-2)] bg-[var(--ink-1)] p-7 animate-fade-in-up stagger-1">
          <h2 className="text-xl font-bold text-[var(--paper-3)] mb-1">{t.pricing.free_name}</h2>
          <p className="text-[var(--paper-1)] text-sm mb-5">{t.pricing.free_desc}</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-[var(--signal-gold)]">&yen;0</span>
            <span className="text-[var(--ink-5)] text-sm ml-1">/mo</span>
          </div>
          <ul className="space-y-3 mb-8 text-sm">
            <PlanFeature checked>{t.pricing.free_f1}</PlanFeature>
            <PlanFeature checked>{t.pricing.free_f3}</PlanFeature>
            <PlanFeature>{t.pricing.basic_f1}</PlanFeature>
            <PlanFeature>{t.pricing.pro_f3}</PlanFeature>
          </ul>
          <Link
            href="/auth/signup"
            className="block text-center border border-[var(--ink-3)] px-6 py-3 text-[var(--paper-1)] font-medium hover:bg-[var(--ink-2)] hover:border-[var(--ink-5)] transition w-full font-mono text-sm tracking-wide"
          >
            {t.pricing.free_button}
          </Link>
        </div>

        {/* Basic — recommended */}
        <div className="border-2 border-[var(--signal-gold)] bg-[var(--ink-1)] p-7 relative animate-fade-in-up stagger-2">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--signal-gold)] text-[var(--ink-0)] text-xs font-semibold px-4 py-1.5 font-mono tracking-wide">
            {t.pricing.recommended}
          </span>
          <h2 className="text-xl font-bold text-[var(--paper-3)] mb-1">{t.pricing.basic_name}</h2>
          <p className="text-[var(--paper-1)] text-sm mb-5">{t.pricing.basic_desc}</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-[var(--signal-gold)]">&yen;500</span>
            <span className="text-[var(--ink-5)] text-sm ml-1">/mo</span>
          </div>
          <ul className="space-y-3 mb-8 text-sm">
            <PlanFeature checked>{t.pricing.basic_f1}</PlanFeature>
            <PlanFeature checked>{t.pricing.basic_f3}</PlanFeature>
            <PlanFeature checked>{t.pricing.basic_f4}</PlanFeature>
            <PlanFeature>{t.pricing.pro_f3}</PlanFeature>
          </ul>
          {isLoggedIn ? (
            <button
              onClick={() => handleSubscribe('basic')}
              disabled={loading !== null}
              className="bg-[var(--signal-gold)] px-6 py-3 text-[var(--ink-0)] font-semibold hover:brightness-110 transition-all w-full disabled:opacity-50 font-mono text-sm tracking-wide"
            >
              {loading === 'basic' ? '...' : t.pricing.basic_button}
            </button>
          ) : (
            <Link
              href="/auth/signup"
              className="block text-center bg-[var(--signal-gold)] px-6 py-3 text-[var(--ink-0)] font-semibold hover:brightness-110 transition-all w-full font-mono text-sm tracking-wide"
            >
              {t.pricing.signup_button}
            </Link>
          )}
        </div>

        {/* Pro */}
        <div className="border border-[var(--ink-2)] bg-[var(--ink-1)] p-7 relative animate-fade-in-up stagger-3">
          <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--signal-live)] text-[var(--ink-0)] text-xs font-semibold px-4 py-1.5 font-mono tracking-wide">
            {t.pricing.best}
          </span>
          <h2 className="text-xl font-bold text-[var(--paper-3)] mb-1">{t.pricing.pro_name}</h2>
          <p className="text-[var(--paper-1)] text-sm mb-5">{t.pricing.pro_desc}</p>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-[var(--signal-gold)]">&yen;1,500</span>
            <span className="text-[var(--ink-5)] text-sm ml-1">/mo</span>
          </div>
          <ul className="space-y-3 mb-8 text-sm">
            <PlanFeature checked>{t.pricing.pro_f1}</PlanFeature>
            <PlanFeature checked highlight>{t.pricing.pro_f3}</PlanFeature>
            <PlanFeature checked highlight>{t.pricing.pro_f4}</PlanFeature>
            <PlanFeature checked>{t.pricing.pro_f5}</PlanFeature>
          </ul>
          {isLoggedIn ? (
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={loading !== null}
              className="border border-[var(--ink-3)] bg-[var(--ink-2)] px-6 py-3 text-[var(--paper-1)] font-semibold hover:bg-[var(--ink-3)] transition-all w-full disabled:opacity-50 font-mono text-sm tracking-wide"
            >
              {loading === 'pro' ? '...' : t.pricing.pro_button}
            </button>
          ) : (
            <Link
              href="/auth/signup"
              className="block text-center border border-[var(--ink-3)] bg-[var(--ink-2)] px-6 py-3 text-[var(--paper-1)] font-semibold hover:bg-[var(--ink-3)] transition-all w-full font-mono text-sm tracking-wide"
            >
              {t.pricing.signup_button}
            </Link>
          )}
        </div>
      </div>

      {/* Comparison table */}
      <div className="mt-12 sm:mt-16 overflow-x-auto animate-fade-in-up -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="border border-[var(--ink-2)] bg-[var(--ink-1)] overflow-hidden min-w-[500px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--ink-2)] bg-[var(--ink-0)]">
                <th className="text-left py-4 px-5 font-medium text-[var(--ink-5)]">{t.pricing.table_feature}</th>
                <th className="text-center py-4 px-5 font-semibold text-[var(--paper-3)]">Free</th>
                <th className="text-center py-4 px-5 font-semibold text-[var(--signal-gold)]">Basic &yen;500</th>
                <th className="text-center py-4 px-5 font-semibold text-[var(--paper-3)]">Pro &yen;1,500</th>
              </tr>
            </thead>
            <tbody className="text-[var(--paper-1)]">
              <TR label={t.pricing.table_articles} f={t.pricing.table_free_articles} b={t.pricing.table_basic_articles} p={t.pricing.table_pro_articles} />
<TR label={t.pricing.table_prompt} f={t.pricing.table_none} b={t.pricing.table_none} p={t.pricing.table_sonnet} />
              <TR label={t.pricing.table_chat} f={t.pricing.table_none} b={t.pricing.table_none} p={t.pricing.table_available} />
              <TR label={t.pricing.table_post} f={t.pricing.table_available} b={t.pricing.table_available} p={t.pricing.table_available} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PlanFeature({ checked = false, highlight = false, children }: { checked?: boolean; highlight?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2.5 ${!checked ? 'text-[var(--ink-5)]' : highlight ? 'text-[var(--paper-3)] font-medium' : 'text-[var(--paper-1)]'}`}>
      {checked ? (
        <svg className="w-5 h-5 text-[var(--signal-gold)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-[var(--ink-3)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
        </svg>
      )}
      {children}
    </li>
  );
}

function TR({ label, f, b, p }: { label: string; f: string; b: string; p: string }) {
  return (
    <tr className="border-b border-[var(--ink-2)] last:border-b-0">
      <td className="py-3.5 px-5 font-medium text-[var(--paper-2)]">{label}</td>
      <td className="py-3.5 px-5 text-center text-[var(--ink-5)]">{f}</td>
      <td className="py-3.5 px-5 text-center font-medium text-[var(--signal-gold)]">{b}</td>
      <td className="py-3.5 px-5 text-center font-medium text-[var(--paper-3)]">{p}</td>
    </tr>
  );
}
