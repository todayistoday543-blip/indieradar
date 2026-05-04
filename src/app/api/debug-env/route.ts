import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnostic endpoint — reports env var health without exposing values.
 * DELETE THIS FILE after debugging.
 */
export async function GET() {
  const vars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'CRON_SECRET',
  ];

  const report: Record<string, unknown> = {};

  for (const name of vars) {
    const val = process.env[name];
    if (!val) {
      report[name] = { status: 'MISSING', length: 0 };
      continue;
    }

    const firstCharCode = val.charCodeAt(0);
    const lastCharCode = val.charCodeAt(val.length - 1);
    const hasNonAscii = Array.from(val).some((c) => c.charCodeAt(0) > 127);
    const prefix = val.slice(0, 8);
    const hasBOM = firstCharCode === 65279;

    report[name] = {
      status: 'SET',
      length: val.length,
      prefix: prefix.replace(/./g, (c) => (c.charCodeAt(0) > 127 ? `[U+${c.charCodeAt(0).toString(16).toUpperCase()}]` : c)),
      firstCharCode,
      lastCharCode,
      hasBOM,
      hasNonAscii,
    };
  }

  // Test Supabase connectivity
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let connectTest = 'not attempted';
  if (url) {
    try {
      const cleanUrl = url.replace(/[^\x20-\x7E]/g, '').trim();
      const res = await fetch(`${cleanUrl}/rest/v1/`, {
        headers: {
          'apikey': (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').replace(/[^\x20-\x7E]/g, '').trim(),
        },
      });
      connectTest = `${res.status} ${res.statusText}`;
    } catch (e) {
      connectTest = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json({ env: report, supabaseConnectTest: connectTest });
}
