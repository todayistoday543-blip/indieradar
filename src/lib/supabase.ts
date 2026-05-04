import { createClient } from '@supabase/supabase-js';

/**
 * Strip BOM (U+FEFF), zero-width chars, quotes, and whitespace from env values.
 * Prevents "Cannot convert argument to a ByteString" errors from invisible characters.
 */
function cleanEnv(val: string | undefined): string {
  if (!val) return '';
  let cleaned = val;
  // Remove surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Filter out any character with code > 127 that isn't a normal visible char
  // This removes BOM (65279), zero-width spaces (8203, 8204, 8205), etc.
  cleaned = Array.from(cleaned)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      // Keep ASCII printable (32-126) and extended latin (128-255)
      return code >= 32 && code <= 255;
    })
    .join('');
  return cleaned.trim();
}

// Anon client
export const supabase = createClient(
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) || 'https://placeholder.supabase.co',
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-anon-key'
);

// Service role client
export function createServiceClient() {
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const serviceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase env vars are not configured: ' +
        (!url ? 'NEXT_PUBLIC_SUPABASE_URL ' : '') +
        (!serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : '')
    );
  }

  return createClient(url, serviceKey);
}
