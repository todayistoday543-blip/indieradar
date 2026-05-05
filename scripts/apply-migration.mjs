#!/usr/bin/env node
/**
 * Apply SQL migration to Supabase via the Management API
 * Usage: node scripts/apply-migration.mjs <migration-file>
 *
 * Requires SUPABASE_ACCESS_TOKEN env var (from supabase login)
 * or falls back to using the REST API with service role key.
 */

import fs from 'fs';
import path from 'path';

// Load env
const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const vars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.+)/);
  if (match) vars[match[1].trim()] = match[2].trim();
});

const SUPABASE_URL = vars.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = vars.SUPABASE_SERVICE_ROLE_KEY;
const ref = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];

if (!ref) {
  console.error('Could not extract project ref from SUPABASE_URL');
  process.exit(1);
}

const migrationFile = process.argv[2] || 'supabase/migrations/005_community_features.sql';
const sql = fs.readFileSync(migrationFile, 'utf8');

console.log(`Applying migration: ${migrationFile}`);
console.log(`Project ref: ${ref}`);
console.log(`SQL length: ${sql.length} chars`);
console.log('');

// Split SQL into individual statements
const statements = sql
  .replace(/--[^\n]*/g, '') // Remove single-line comments
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 5);

console.log(`Found ${statements.length} SQL statements`);
console.log('');
console.log('=== SQL to execute in Supabase Dashboard > SQL Editor ===');
console.log('');
console.log(sql);
console.log('');
console.log('=== Instructions ===');
console.log('1. Go to: https://supabase.com/dashboard/project/' + ref + '/sql');
console.log('2. Paste the SQL above');
console.log('3. Click "Run"');
console.log('');

// Also try the REST endpoint for creating tables via Supabase's pg_net if available
async function tryExecute() {
  try {
    // Try using the Supabase Management API (requires personal access token)
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
    if (accessToken) {
      const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });

      if (res.ok) {
        console.log('✓ Migration applied successfully via Management API!');
        return;
      }
      console.log('Management API failed:', res.status, await res.text());
    }

    console.log('No SUPABASE_ACCESS_TOKEN found. Please run the SQL manually in the Dashboard.');
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Please run the SQL manually in the Supabase Dashboard.');
  }
}

tryExecute();
