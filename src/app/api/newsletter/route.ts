import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, locale, user_id } = body;

  if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  // Check for existing active subscription
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('id, is_active')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (existing?.is_active) {
    return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  }

  if (existing && !existing.is_active) {
    // Re-activate existing subscription
    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ is_active: true, locale: locale || 'ja' })
      .eq('id', existing.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  }

  // Create new subscription
  const { error } = await supabase
    .from('newsletter_subscribers')
    .insert({
      email: email.toLowerCase().trim(),
      user_id: user_id || null,
      is_active: true,
      locale: locale || 'ja',
      created_at: new Date().toISOString(),
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  let supabase: ReturnType<typeof createServiceClient>;
  try {
    supabase = createServiceClient();
  } catch (e) {
    return NextResponse.json(
      { error: `Supabase config: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    );
  }

  const { error } = await supabase
    .from('newsletter_subscribers')
    .update({ is_active: false })
    .eq('email', email.toLowerCase().trim());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
