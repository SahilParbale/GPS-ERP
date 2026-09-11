import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const envFile = fs.readFileSync('.env', 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testAuthAccess() {
  const client = createClient(url, anonKey);
  
  // 1. Test Admin
  console.log('--- Testing ADMIN: rahul.patil@gpspindles.com ---');
  const { data: auth, error: aErr } = await client.auth.signInWithPassword({
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!'
  });
  if (aErr) return console.error('Sign in failed:', aErr.message);

  const { data: docs, error: dErr } = await client.from('documents').select('*').limit(5);
  console.log('Documents query:', dErr ? dErr.message : `SUCCESS (${docs.length} rows)`);

  const { data: notifs, error: nErr } = await client.from('notifications').select('*').limit(5);
  console.log('Notifications query:', nErr ? nErr.message : `SUCCESS (${notifs.length} rows)`);

  const { data: emails, error: eErr } = await client.from('email_activity').select('*').limit(5);
  console.log('Email Activity query:', eErr ? eErr.message : `SUCCESS (${emails.length} rows)`);

  // 2. Test Storage Bucket Access (spindle-documents)
  const { data: files, error: fErr } = await client.storage.from('spindle-documents').list();
  console.log('Spindle-documents bucket list:', fErr ? fErr.message : `SUCCESS (${files.length} files)`);

  // Sign out
  await client.auth.signOut();

  // 3. Test Anonymous access
  console.log('--- Testing ANONYMOUS ACCESS ---');
  const anonClient = createClient(url, anonKey);
  const { data: anonDocs, error: adErr } = await anonClient.from('documents').select('*').limit(5);
  console.log('Anonymous docs:', anonDocs?.length || 0, adErr?.message || 'blocked');

  const { data: anonNotifs, error: anErr } = await anonClient.from('notifications').select('*').limit(5);
  console.log('Anonymous notifications:', anonNotifs?.length || 0, anErr?.message || 'blocked');

  const { data: anonEmails, error: aeErr } = await anonClient.from('email_activity').select('*').limit(5);
  console.log('Anonymous emails:', anonEmails?.length || 0, aeErr?.message || 'blocked');
}

testAuthAccess();
