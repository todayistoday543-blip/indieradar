import { createClient } from '@supabase/supabase-js';

// Anon client — 実行時に毎回 env を読む（モジュールロード時固定を避ける）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL    || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);

// Service role client — 実行時に毎回 env を読む
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'Supabase env vars are not configured: ' +
      (!url ? 'NEXT_PUBLIC_SUPABASE_URL ' : '') +
      (!serviceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : '')
    );
  }

  return createClient(url, serviceKey);
}
