/**
 * Returns a human-readable relative time string.
 * Falls back to a localised date when > 30 days ago.
 *
 * @param dateStr  ISO date string
 * @param locale   BCP-47 locale code (default: 'ja')
 */
export function timeAgo(dateStr: string, locale = 'ja'): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.max(0, now - date);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (locale === 'ja') {
    if (days > 30) return new Date(dateStr).toLocaleDateString('ja-JP');
    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return 'たった今';
  }

  // English and other latin locales
  if (days > 30) return new Date(dateStr).toLocaleDateString('en-US');
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}
