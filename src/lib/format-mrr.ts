/**
 * Formats an MRR (Monthly Recurring Revenue) value into a human-readable string.
 * Handles K / M / B suffixes to prevent outlier data from producing output like "$1666666.7K".
 */
export function formatMrr(value: number): string {
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    return `$${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `$${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const k = value / 1_000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return `$${value.toLocaleString()}`;
}
