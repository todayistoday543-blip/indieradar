import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// One-time cleanup: demote non-business-case articles to draft
// Protected by CRON_SECRET to prevent unauthorized access
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-admin-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('articles')
    .update({ status: 'draft' })
    .eq('status', 'published')
    .or([
      'business_model.ilike.%該当なし%',
      'business_model.ilike.%非商用%',
      'business_model.ilike.%政治%',
      'ja_title.ilike.%ビジネス事例ではありません%',
      'ja_title.ilike.%収益事例ではない%',
      'ja_title.ilike.%誤認識%',
      'ja_title.ilike.%風刺記事%',
      'ja_title.ilike.%パロディ%',
    ].join(','))
    .select('id, ja_title');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    demoted: data?.length ?? 0,
    titles: data?.map((a: { ja_title: string }) => a.ja_title),
  });
}
