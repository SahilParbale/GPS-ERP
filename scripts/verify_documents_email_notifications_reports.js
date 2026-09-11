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

const anonClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 9 VERIFICATION');
console.log('Documents, Email Activity, Notifications & Alerts, Live Reports');
console.log('='.repeat(80));
console.log(`Connected Project URL: ${url}\n`);

async function runVerification() {
  const results = {
    documents: {},
    email: {},
    notifications: {},
    reports: {},
    storage: {},
    security: {}
  };

  let allPassed = true;

  function reportCheck(category, checkName, passed, details = '') {
    const status = passed ? 'PASS' : 'FAIL';
    console.log(`  [${status}] ${checkName}${details ? ` (${details})` : ''}`);
    if (!results[category]) results[category] = {};
    results[category][checkName] = status;
    if (!passed) allPassed = false;
  }

  // ---------------------------------------------------------------------------
  // 1. DOCUMENTS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('[SECTION 1] VERIFYING DOCUMENTS & VERSIONS...');
  const { data: docs, error: docErr } = await adminClient
    .from('documents')
    .select('*, versions:document_versions(*)');

  reportCheck('documents', 'Documents Table Accessible', !docErr, `Count: ${docs?.length || 0}`);
  reportCheck('documents', 'Baseline Documents Present', (docs?.length || 0) >= 5, `${docs?.length} rows`);

  if (docs && docs.length > 0) {
    const allHaveStorage = docs.every(d => d.storage_bucket && d.storage_path);
    reportCheck('documents', 'Storage Path & Bucket Defined', allHaveStorage);

    const allHaveVersions = docs.every(d => d.versions && d.versions.length > 0);
    reportCheck('documents', 'Document Version Revisions Intact', allHaveVersions);

    const validBuckets = ['spindle-documents', 'quality-reports', 'invoices-ewb'];
    const bucketsValid = docs.every(d => validBuckets.includes(d.storage_bucket));
    reportCheck('documents', 'Private Storage Bucket Integrity', bucketsValid);
  }

  // ---------------------------------------------------------------------------
  // 2. EMAIL ACTIVITY VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 2] VERIFYING EMAIL ACTIVITY & TRANSMISSION REGISTER...');
  const { data: emails, error: emailErr } = await adminClient
    .from('email_activity')
    .select('*, customer:customers(id, company_name)');

  reportCheck('email', 'Email Activity Table Accessible', !emailErr, `Count: ${emails?.length || 0}`);
  reportCheck('email', 'Baseline Emails Present', (emails?.length || 0) >= 6, `${emails?.length} rows`);

  if (emails && emails.length > 0) {
    const validStatuses = ['Draft', 'Queued', 'Sent', 'Delivered', 'Failed', 'Opened'];
    const statusesValid = emails.every(e => validStatuses.includes(e.delivery_status));
    reportCheck('email', 'Delivery Status Values Conforming', statusesValid);

    const hasFailedStatus = emails.some(e => e.delivery_status === 'Failed');
    const hasDraftStatus = emails.some(e => e.delivery_status === 'Draft');
    const hasSentStatus = emails.some(e => e.delivery_status === 'Sent');
    reportCheck('email', 'Status Diversity (Sent/Draft/Failed Realism)', hasFailedStatus && hasDraftStatus && hasSentStatus);

    const allRecipientsValid = emails.every(e => Array.isArray(e.to_recipients) && e.to_recipients.length > 0);
    reportCheck('email', 'Recipient Arrays Valid', allRecipientsValid);

    // Verify natural key uniqueness (message_id)
    const msgIds = emails.map(e => e.message_id).filter(Boolean);
    const uniqueMsgIds = new Set(msgIds);
    reportCheck('email', 'Natural Key Uniqueness (message_id)', msgIds.length === uniqueMsgIds.size, `${uniqueMsgIds.size} unique`);
  }

  // ---------------------------------------------------------------------------
  // 3. NOTIFICATIONS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 3] VERIFYING NOTIFICATIONS & SHOP FLOOR ALERTS...');
  const { data: notifs, error: notifErr } = await adminClient
    .from('notifications')
    .select('*, recipient:employees(id, first_name, last_name, email)');

  reportCheck('notifications', 'Notifications Table Accessible', !notifErr, `Count: ${notifs?.length || 0}`);
  reportCheck('notifications', 'Baseline Notifications Present', (notifs?.length || 0) >= 6, `${notifs?.length} rows`);

  if (notifs && notifs.length > 0) {
    const validPriorities = ['Low', 'Normal', 'Urgent', 'Critical'];
    const prioritiesValid = notifs.every(n => validPriorities.includes(n.priority));
    reportCheck('notifications', 'Priority Levels Conforming', prioritiesValid);

    const hasUnread = notifs.some(n => !n.is_read);
    const hasRead = notifs.some(n => n.is_read);
    reportCheck('notifications', 'Read/Unread State Consistency', hasUnread && hasRead);

    const allHaveTitles = notifs.every(n => n.title && n.message && n.related_module);
    reportCheck('notifications', 'Required Notification Metadata Present', allHaveTitles);
  }

  // ---------------------------------------------------------------------------
  // 4. STORAGE SECURITY & SIGNED URLS
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 4] VERIFYING STORAGE SECURITY & SIGNED ACCESS...');
  
  // Test signed URL generation on private storage bucket
  const sampleDoc = docs?.[0];
  if (sampleDoc) {
    const { data: signed, error: signErr } = await adminClient.storage
      .from(sampleDoc.storage_bucket)
      .createSignedUrl(sampleDoc.storage_path, 60);

    reportCheck('storage', 'Signed URL Generation on Private Bucket', !signErr && Boolean(signed?.signedUrl));

    // Verify bucket is not public
    const { data: bucketInfo } = await adminClient.storage.getBucket(sampleDoc.storage_bucket);
    reportCheck('storage', 'Bucket Marked Private in Supabase Storage', bucketInfo?.public === false, `public: ${bucketInfo?.public}`);
  }

  // Test anonymous access denial on documents and storage
  const { data: anonDocs } = await anonClient.from('documents').select('*');
  reportCheck('security', 'Anonymous Access to documents Blocked by RLS', (anonDocs?.length || 0) === 0);

  const { data: anonEmails } = await anonClient.from('email_activity').select('*');
  reportCheck('security', 'Anonymous Access to email_activity Blocked by RLS', (anonEmails?.length || 0) === 0);

  const { data: anonNotifs } = await anonClient.from('notifications').select('*');
  reportCheck('security', 'Anonymous Access to notifications Blocked by RLS', (anonNotifs?.length || 0) === 0);

  // ---------------------------------------------------------------------------
  // 5. LIVE REPORTS & AGGREGATIONS VERIFICATION
  // ---------------------------------------------------------------------------
  console.log('\n[SECTION 5] VERIFYING LIVE REPORTS & BUSINESS DATA INTEGRATION...');
  
  // Spindle model volume share aggregation
  const { data: spindleData } = await adminClient.from('spindles').select('id, model_id');
  const { data: modelData } = await adminClient.from('spindle_models').select('id, model_code');
  reportCheck('reports', 'Spindle Models & Fleets Queryable', (spindleData?.length || 0) > 0 && (modelData?.length || 0) > 0);

  // Completed work order throughput
  const { data: woData } = await adminClient.from('work_orders').select('id, status, created_at');
  reportCheck('reports', 'Work Order Throughput Queryable', (woData?.length || 0) > 0, `${woData?.length} work orders`);

  // Invoices revenue aggregation
  const { data: invData } = await adminClient.from('invoices').select('id, total_amount, status');
  const totalRevenue = invData?.reduce((s, r) => s + (Number(r.total_amount) || 0), 0) || 0;
  reportCheck('reports', 'Gross Revenue Aggregatable from Live Invoices', !isNaN(totalRevenue) && totalRevenue > 0, `₹${totalRevenue.toLocaleString('en-IN')}`);

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION RESULT: ${allPassed ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}`);
  console.log('='.repeat(80));
  console.log(JSON.stringify(results, null, 2));

  if (!allPassed) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Verification encountered an unexpected error:', err);
  process.exit(1);
});
