'use client';

import { useEffect, useRef } from 'react';
import { useUser } from '@/components/user-context';

/**
 * Google AdSense ad slot component.
 *
 * - Hidden for Pro users (no ads)
 * - Renders in-feed or display ads for Free / Basic users
 * - Basic users see fewer ads (controlled by parent via `reducedForBasic`)
 */

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdSlotProps {
  /** AdSense ad slot ID — get from your AdSense dashboard */
  slot: string;
  /** Ad format: 'auto' for responsive, 'fluid' for in-feed, 'rectangle' for fixed */
  format?: 'auto' | 'fluid' | 'rectangle';
  /** If true, this slot is hidden for Basic users (used to reduce ads for Basic tier) */
  reducedForBasic?: boolean;
  /** Extra className for the wrapper */
  className?: string;
}

export function AdSlot({ slot, format = 'auto', reducedForBasic = false, className = '' }: AdSlotProps) {
  const { plan } = useUser();
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  // Pro users see no ads
  const showAds = plan !== 'pro';
  // Basic users see reduced ads — hide slots marked as reducedForBasic
  const hidden = !showAds || (plan === 'basic' && reducedForBasic);

  useEffect(() => {
    if (hidden || pushed.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not loaded yet or blocked
    }
  }, [hidden]);

  if (hidden) return null;

  const adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

  // Don't render if no client ID configured
  if (!adClient) {
    return (
      <div className={`ad-slot-placeholder flex items-center justify-center py-4 ${className}`}>
        <div className="border border-dashed border-[var(--ink-3)] rounded-lg px-6 py-8 text-center w-full max-w-[728px] mx-auto">
          <span className="text-[10px] tracking-[0.15em] text-[var(--ink-4)] uppercase" style={{ fontFamily: 'var(--font-mono)' }}>
            AD SPACE
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ad-slot flex justify-center py-4 ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adClient}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

/**
 * In-feed ad for article lists — inserted between article cards
 */
export function InFeedAd({ reducedForBasic = false }: { reducedForBasic?: boolean }) {
  return (
    <AdSlot
      slot={process.env.NEXT_PUBLIC_ADSENSE_INFEED_SLOT || 'INFEED_SLOT'}
      format="fluid"
      reducedForBasic={reducedForBasic}
      className="border-t border-b border-[var(--ink-2)]"
    />
  );
}

/**
 * Display ad for article detail pages — inserted between content sections
 */
export function DisplayAd({ reducedForBasic = false }: { reducedForBasic?: boolean }) {
  return (
    <AdSlot
      slot={process.env.NEXT_PUBLIC_ADSENSE_DISPLAY_SLOT || 'DISPLAY_SLOT'}
      format="auto"
      reducedForBasic={reducedForBasic}
      className="my-6"
    />
  );
}
