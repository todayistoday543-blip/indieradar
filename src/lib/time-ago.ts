/**
 * Returns a human-readable relative time string in the given locale.
 * Falls back to a localised date when > 30 days ago.
 *
 * @param dateStr  ISO date string
 * @param locale   App locale code (default: 'ja')
 */
export function timeAgo(dateStr: string, locale = 'ja'): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.max(0, now - date);

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  switch (locale) {
    case 'ja': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('ja-JP');
      if (days > 0) return `${days}日前`;
      if (hours > 0) return `${hours}時間前`;
      if (minutes > 0) return `${minutes}分前`;
      return 'たった今';
    }
    case 'ko': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('ko-KR');
      if (days > 0) return `${days}일 전`;
      if (hours > 0) return `${hours}시간 전`;
      if (minutes > 0) return `${minutes}분 전`;
      return '방금';
    }
    case 'zh': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('zh-CN');
      if (days > 0) return `${days}天前`;
      if (hours > 0) return `${hours}小时前`;
      if (minutes > 0) return `${minutes}分钟前`;
      return '刚刚';
    }
    case 'hi': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('hi-IN');
      if (days > 0) return `${days} दिन पहले`;
      if (hours > 0) return `${hours} घंटे पहले`;
      if (minutes > 0) return `${minutes} मिनट पहले`;
      return 'अभी';
    }
    case 'de': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('de-DE');
      if (days > 0) return `vor ${days} Tag${days === 1 ? '' : 'en'}`;
      if (hours > 0) return `vor ${hours} Std.`;
      if (minutes > 0) return `vor ${minutes} Min.`;
      return 'gerade eben';
    }
    case 'fr': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('fr-FR');
      if (days > 0) return `il y a ${days} jour${days === 1 ? '' : 's'}`;
      if (hours > 0) return `il y a ${hours} h`;
      if (minutes > 0) return `il y a ${minutes} min`;
      return "à l'instant";
    }
    case 'es': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('es-ES');
      if (days > 0) return `hace ${days} día${days === 1 ? '' : 's'}`;
      if (hours > 0) return `hace ${hours} h`;
      if (minutes > 0) return `hace ${minutes} min`;
      return 'ahora mismo';
    }
    case 'pt': {
      if (days > 30) return new Date(dateStr).toLocaleDateString('pt-BR');
      if (days > 0) return `há ${days} dia${days === 1 ? '' : 's'}`;
      if (hours > 0) return `há ${hours} h`;
      if (minutes > 0) return `há ${minutes} min`;
      return 'agora';
    }
    default: {
      // English and any unknown locale
      if (days > 30) return new Date(dateStr).toLocaleDateString('en-US');
      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'just now';
    }
  }
}
