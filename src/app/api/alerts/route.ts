import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
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

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alerts: data });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { user_id, keywords, min_mrr, categories, notify_email, is_active, id } = body;

  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return NextResponse.json({ error: 'At least one keyword is required' }, { status: 400 });
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

  // Verify user exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, subscription_plan')
    .eq('id', user_id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // TEMPORARY: Pro plan check disabled (trial period)
  // To restore: if (profile.subscription_plan !== 'pro') { return NextResponse.json({ error: 'Pro plan required' }, { status: 403 }); }

  const alertData = {
    user_id,
    keywords: keywords.map((k: string) => k.trim()).filter(Boolean),
    min_mrr: typeof min_mrr === 'number' ? min_mrr : null,
    categories: Array.isArray(categories) ? categories : [],
    notify_email: notify_email === true,
    // For updates (id present) honour the caller's is_active; new alerts always start active.
    is_active: id ? (typeof is_active === 'boolean' ? is_active : true) : true,
    updated_at: new Date().toISOString(),
  };

  if (id) {
    // Update existing alert — verify ownership
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('id', id)
      .eq('user_id', user_id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('alerts')
      .update(alertData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert: data });
  }

  // Create new alert
  const { data, error } = await supabase
    .from('alerts')
    .insert({ ...alertData, created_at: new Date().toISOString() })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ alert: data }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id, user_id } = body;

  if (!id || !user_id) {
    return NextResponse.json({ error: 'id and user_id are required' }, { status: 400 });
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

  // Verify ownership before deleting
  const { data: existing } = await supabase
    .from('alerts')
    .select('id')
    .eq('id', id)
    .eq('user_id', user_id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Alert not found or not owned by user' }, { status: 404 });
  }

  const { error } = await supabase
    .from('alerts')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
