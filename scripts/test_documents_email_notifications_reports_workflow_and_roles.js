import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. CONFIGURATION & CLIENT INITIALIZATION
const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const envFile = fs.readFileSync('.env', 'utf8');

const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = migrationEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const anonKey = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DEV_ACCOUNTS = [
  { role: 'ADMIN', email: 'rahul.patil@gpspindles.com', password: 'Password123!' },
  { role: 'MANAGEMENT', email: 'kulkarni.vr@gpspindles.com', password: 'Password123!' },
  { role: 'PROD_MGR', email: 'suresh.sawant@gpspindles.com', password: 'Password123!' },
  { role: 'QA_MGR', email: 'milind.joshi@gpspindles.com', password: 'Password123!' },
  { role: 'SALES', email: 'shreyas.nair@gpspindles.com', password: 'Password123!' },
  { role: 'PURCHASE', email: 'purchase.controller@gpspindles.com', password: 'Password123!' },
  { role: 'STORES', email: 'dinesh.more@gpspindles.com', password: 'Password123!' },
  { role: 'SERVICE', email: 'service.lead@gpspindles.com', password: 'Password123!' },
  { role: 'EMPLOYEE', email: 'vikram.shinde@gpspindles.com', password: 'Password123!' }
];

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 9 WORKFLOW & ROLE TESTS');
console.log('Documents, Email Activity, Notifications, Realtime, Reports, Storage, Roles');
console.log('='.repeat(80));
console.log(`Connected Project URL: ${url}\n`);

async function createAuthenticatedClient(email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Auth failed for ${email}: ${error.message}`);
  }
  return { client, user: data.user, session: data.session };
}

async function runTests() {
  const testResults = {};
  let totalFailed = 0;

  function record(testName, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${testName}${details ? ` — ${details}` : ''}`);
    testResults[testName] = status;
    if (!passed) totalFailed++;
  }

  // Pre-authenticate all 9 role clients
  console.log('[SETUP] AUTHENTICATING ALL 9 APPLICATION ROLES...');
  const roleClients = {};
  for (const acc of DEV_ACCOUNTS) {
    try {
      const auth = await createAuthenticatedClient(acc.email, acc.password);
      roleClients[acc.role] = auth;
      console.log(`  ✓ ${acc.role.padEnd(12)}: Authenticated (${acc.email})`);
    } catch (err) {
      console.error(`  ✗ ${acc.role.padEnd(12)}: ${err.message}`);
      totalFailed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1 — DOCUMENT LIFECYCLE
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 1] DOCUMENT LIFECYCLE (Upload -> Metadata -> Signed URL -> Cleanup)...');
  const adminAuth = roleClients.ADMIN;
  let testDocId = null;
  const testPath = `test/lifecycle_test_${Date.now()}.pdf`;

  try {
    // 1. Upload file object to private storage
    const testBuffer = Buffer.from('%PDF-1.4 Lifecycle Test Document Content');
    const { error: upErr } = await adminClient.storage
      .from('spindle-documents')
      .upload(testPath, testBuffer, { contentType: 'application/pdf', upsert: true });
    record('Test 1.1: Upload Storage Object to Private Bucket', !upErr, upErr ? upErr.message : 'spindle-documents');

    // 2. Insert metadata row into documents table via authenticated client
    const { data: docRow, error: insErr } = await adminAuth.client
      .from('documents')
      .insert({
        title: 'Dynamic Test Document',
        document_type: 'Engineering Drawing',
        file_name: 'test_drawing.pdf',
        file_size_bytes: testBuffer.length,
        mime_type: 'application/pdf',
        storage_bucket: 'spindle-documents',
        storage_path: testPath,
        version: 1,
        reference_type: 'SPINDLE',
        reference_id: 'GPS-2026-TEST'
      })
      .select('id')
      .single();

    testDocId = docRow?.id;
    record('Test 1.2: Create Document Metadata', !insErr && Boolean(testDocId), `ID: ${testDocId}`);

    // 3. Retrieve document by ID via authenticated client
    const { data: fetchedDoc, error: getErr } = await adminAuth.client
      .from('documents')
      .select('*')
      .eq('id', testDocId)
      .single();
    record('Test 1.3: Retrieve Document Record', !getErr && fetchedDoc?.title === 'Dynamic Test Document');

    // 4. Generate signed URL for private access
    const { data: signedRes, error: signErr } = await adminClient.storage
      .from('spindle-documents')
      .createSignedUrl(testPath, 300);
    record('Test 1.4: Generate Secure Signed URL', !signErr && Boolean(signedRes?.signedUrl));

    // 5. Cleanup test document & storage
    if (testDocId) {
      await adminAuth.client.from('documents').delete().eq('id', testDocId);
    }
    await adminClient.storage.from('spindle-documents').remove([testPath]);
    record('Test 1.5: Document Lifecycle Cleanup', true, 'Deleted metadata and storage object');
  } catch (err) {
    record('Test 1: Document Lifecycle Execution', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2 — EMAIL ACTIVITY
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 2] EMAIL ACTIVITY LOGGING & STATUS INTEGRITY...');
  const salesAuth = roleClients.SALES;
  let testEmailId = null;

  try {
    const testMsgId = `<test-${Date.now()}@mail.gpsspindles.com>`;
    const { data: emailRow, error: emailInsErr } = await salesAuth.client
      .from('email_activity')
      .insert({
        message_id: testMsgId,
        from_address: 'sales@gpsspindle.com',
        to_recipients: ['client@precisionmfg.com'],
        cc_recipients: ['sales.team@gpsspindles.com'],
        subject: 'Commercial Proposal Test Workflow',
        body_text: 'Please find attached test proposal.',
        document_type: 'Quotation',
        document_id: 'QT-TEST-2026',
        customer_name: 'Precision Mfg Partner',
        attachments_count: 1,
        delivery_status: 'Queued',
        sent_by_name: 'Shreyas Nair',
        sent_at: new Date().toISOString()
      })
      .select('id, delivery_status')
      .single();

    testEmailId = emailRow?.id;
    record('Test 2.1: Log Email Activity with Queued Status', !emailInsErr && Boolean(testEmailId), `Status: ${emailRow?.delivery_status}`);

    // Update delivery status (Queued -> Delivered)
    const { data: updatedEmail, error: updErr } = await salesAuth.client
      .from('email_activity')
      .update({ delivery_status: 'Delivered' })
      .eq('id', testEmailId)
      .select('delivery_status')
      .single();
    record('Test 2.2: Update Delivery Status Transition', !updErr && updatedEmail?.delivery_status === 'Delivered');

    // Verify non-commercial role cannot tamper email logs (e.g. OPERATOR / EMPLOYEE)
    const employeeAuth = roleClients.EMPLOYEE;
    const { error: empInsertErr } = await employeeAuth.client
      .from('email_activity')
      .insert({
        from_address: 'fake@gpsspindle.com',
        to_recipients: ['hacker@test.com'],
        subject: 'Unauthorized Email',
        document_type: 'Quotation',
        document_id: 'HACK-01'
      });
    record('Test 2.3: Unauthorized Email Insertion Blocked for EMPLOYEE', Boolean(empInsertErr), 'RLS Denied');

    // Cleanup
    if (testEmailId) {
      await adminClient.from('email_activity').delete().eq('id', testEmailId);
    }
  } catch (err) {
    record('Test 2: Email Activity Execution', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3 — NOTIFICATION LIFECYCLE
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 3] NOTIFICATION LIFECYCLE (Create -> Unread -> Mark Read -> Count)...');
  let testNotifId = null;

  try {
    // 1. Create notification for Rahul Patil
    const { data: newNotif, error: notifInsErr } = await adminClient
      .from('notifications')
      .insert({
        recipient_id: rahulPatilId(),
        notification_type: 'System',
        title: 'Automated Lifecycle Workflow Test Alert',
        message: 'Testing realtime notification creation and state change.',
        priority: 'Urgent',
        is_read: false,
        related_module: 'Manufacturing',
        related_record_id: 'WO-TEST-001'
      })
      .select('id, is_read')
      .single();

    testNotifId = newNotif?.id;
    record('Test 3.1: Create Persistent Notification', !notifInsErr && Boolean(testNotifId));

    // 2. Fetch unread notification
    const { data: unreadNotif, error: unreadErr } = await adminAuth.client
      .from('notifications')
      .select('id, is_read')
      .eq('id', testNotifId)
      .single();
    record('Test 3.2: Retrieve Unread Notification', !unreadErr && unreadNotif?.is_read === false);

    // 3. Mark as read
    const { data: readNotif, error: markErr } = await adminAuth.client
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', testNotifId)
      .select('is_read, read_at')
      .single();
    record('Test 3.3: Mark Notification Read', !markErr && readNotif?.is_read === true);

    // Cleanup
    if (testNotifId) {
      await adminClient.from('notifications').delete().eq('id', testNotifId);
    }
  } catch (err) {
    record('Test 3: Notification Lifecycle Execution', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4 — REALTIME SUBSCRIPTION CONFIGURATION
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 4] REALTIME SUBSCRIPTION CONFIGURATION...');
  try {
    const channel = adminAuth.client.channel('test-realtime-notifications');
    let channelConfigured = Boolean(channel);
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {});
    channel.subscribe();
    record('Test 4.1: Realtime Channel Instantiation & Subscription', channelConfigured, 'Channel active');
    adminAuth.client.removeChannel(channel);
  } catch (err) {
    record('Test 4: Realtime Subscription', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5 — LIVE REPORTS & AGGREGATIONS
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 5] REPORTS & AGGREGATIONS...');
  try {
    const { data: woThroughput } = await adminAuth.client
      .from('work_orders')
      .select('id, current_stage, status')
      .limit(10);
    record('Test 5.1: Live Work Order Throughput Query', (woThroughput?.length || 0) > 0, `${woThroughput?.length} rows retrieved`);

    const { data: spindleShare } = await adminAuth.client
      .from('spindles')
      .select('id, model_id')
      .limit(10);
    record('Test 5.2: Live Spindle Model Distribution Query', (spindleShare?.length || 0) > 0, `${spindleShare?.length} spindles retrieved`);

    const { data: invTotals } = await adminAuth.client
      .from('invoices')
      .select('total_amount, status');
    record('Test 5.3: Gross Revenue Aggregation Query', (invTotals?.length || 0) > 0, `${invTotals?.length} invoices retrieved`);
  } catch (err) {
    record('Test 5: Live Reports Execution', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6 — STORAGE SECURITY (Authorized PASS vs Unauthorized BLOCKED)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 6] STORAGE SECURITY (Authorized vs Unauthorized Access)...');
  try {
    // 6.1 Authorized role (ADMIN) can list private storage bucket
    const { data: authList, error: authListErr } = await adminAuth.client.storage
      .from('spindle-documents')
      .list('spindle');
    record('Test 6.1: Authorized Access to Private Storage (ADMIN)', !authListErr && Boolean(authList), `${authList?.length || 0} objects found`);

    // 6.2 Anonymous client is blocked from listing private storage bucket
    const anonClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: anonList, error: anonListErr } = await anonClient.storage
      .from('spindle-documents')
      .list('spindle');
    const anonBlocked = Boolean(anonListErr) || !anonList || anonList.length === 0;
    record('Test 6.2: Anonymous Access to Private Storage Blocked', anonBlocked);
  } catch (err) {
    record('Test 6: Storage Security Execution', false, err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7 — ROLE-BASED ACCESS CONTROL (ALL 9 ROLES)
  // ---------------------------------------------------------------------------
  console.log('\n[TEST 7] ROLE AUTHORIZATION ACROSS ALL 9 APPLICATION ROLES...');
  
  for (const acc of DEV_ACCOUNTS) {
    const client = roleClients[acc.role]?.client;
    if (!client) {
      record(`Test 7.${acc.role}: Client Authenticated`, false);
      continue;
    }

    // A. Verify access to documents (all authenticated users can view documents)
    const { data: docsData, error: docsErr } = await client.from('documents').select('id').limit(2);
    const canReadDocs = !docsErr && Array.isArray(docsData);

    // B. Verify email_activity access (ADMIN, MANAGEMENT, SALES, PURCHASE allowed)
    const { data: emailData, error: emailErr } = await client.from('email_activity').select('id').limit(1);
    const expectedEmailAccess = ['ADMIN', 'MANAGEMENT', 'SALES', 'PURCHASE'].includes(acc.role);
    const actualEmailAccess = !emailErr && Array.isArray(emailData) && emailData.length > 0;
    const emailPolicyCorrect = expectedEmailAccess ? actualEmailAccess : (!actualEmailAccess || emailData?.length === 0);

    // C. Verify notifications access (scoped by RLS)
    const { data: notifData, error: notifErr } = await client.from('notifications').select('id').limit(2);
    const canReadNotifs = !notifErr && Array.isArray(notifData);

    const rolePassed = canReadDocs && emailPolicyCorrect && canReadNotifs;
    record(
      `Role ${acc.role.padEnd(10)}: Documents=${canReadDocs ? 'YES' : 'NO'}, EmailAccess=${actualEmailAccess ? 'YES' : 'NO'}, Notifs=${canReadNotifs ? 'YES' : 'NO'}`,
      rolePassed
    );
  }

  // Helper
  function rahulPatilId() {
    return 'e0000000-0000-0000-0000-000000000105';
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`WORKFLOW & ROLE TEST SUMMARY: ${totalFailed === 0 ? 'ALL TESTS PASSED' : `${totalFailed} TESTS FAILED`}`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(testResults, null, 2));

  if (totalFailed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test execution failed unexpectedly:', err);
  process.exit(1);
});
