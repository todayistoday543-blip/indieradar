import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results: string[] = [];

  // We use Supabase client to create tables via raw RPC
  // Since we can't run raw SQL, we create tables by attempting inserts and relying on
  // the Supabase dashboard migration. Instead, we'll create a migration endpoint
  // that tests connectivity and provides the SQL to run.

  // Test existing tables
  const tables = ['comments', 'bookmarks', 'alerts', 'newsletter_subscribers', 'alert_notifications'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error) {
      results.push(`${table}: NEEDS CREATION - ${error.message}`);
    } else {
      results.push(`${table}: OK`);
    }
  }

  return NextResponse.json({
    results,
    migration_sql_url: 'Run the SQL in supabase/migrations/005_community_features.sql via Supabase Dashboard > SQL Editor',
  });
}
