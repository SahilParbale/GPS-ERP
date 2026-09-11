import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 1. CONFIGURATION & CLIENT INITIALIZATION
const migrationEnv = fs.readFileSync('.env.migration', 'utf8');
const url = migrationEnv.match(/SUPABASE_URL=(.*)/)[1].trim();
const serviceKey = migrationEnv.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

const adminClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log('='.repeat(80));
console.log('GPS SPINDLE ERP — PHASE 9 DATABASE MIGRATION');
console.log('Module: Documents, Email Activity, Notifications & Alerts, Reports');
console.log('='.repeat(80));
console.log(`Connected Project URL: ${url}\n`);

async function runMigration() {
  const stats = {
    documents: { existing: 0, created: 0, updated: 0, skipped: 0 },
    document_versions: { existing: 0, created: 0, updated: 0, skipped: 0 },
    email_activity: { existing: 0, created: 0, updated: 0, skipped: 0 },
    notifications: { existing: 0, created: 0, updated: 0, skipped: 0 },
    storage_objects: { uploaded: 0, skipped: 0 }
  };

  // 1. Look up existing Phase 1-8 relational entities for foreign key consistency
  console.log('[STEP 1] RESOLVING PHASE 1–8 BASELINE ENTITIES...');
  
  const { data: employees } = await adminClient.from('employees').select('id, first_name, last_name, email');
  const rahulPatil = employees?.find(e => e.email === 'rahul.patil@gpsspindles.com') || employees?.[0];
  console.log(`  Resolved Primary Employee (Rahul Patil): ${rahulPatil ? rahulPatil.id : 'NOT FOUND'}`);

  const { data: customers } = await adminClient.from('customers').select('id, company_name, customer_code');
  const tataCust = customers?.find(c => c.company_name?.includes('Tata')) || customers?.[0];
  const bforgeCust = customers?.find(c => c.company_name?.includes('Bharat Forge')) || customers?.[1];
  const linamarCust = customers?.find(c => c.company_name?.includes('Linamar')) || customers?.[2];
  console.log(`  Resolved Customers: Tata (${tataCust?.id}), Bharat Forge (${bforgeCust?.id}), Linamar (${linamarCust?.id})`);

  const { data: spindles } = await adminClient.from('spindles').select('id, serial_number');
  const primarySpindle = spindles?.find(s => s.serial_number === 'GPS-2026-0840') || spindles?.[0];
  console.log(`  Resolved Primary Spindle: ${primarySpindle?.serial_number} (${primarySpindle?.id})`);

  const { data: workOrders } = await adminClient.from('work_orders').select('id, work_order_no');
  const primaryWo = workOrders?.find(w => w.work_order_no === 'WO-2026-0147') || workOrders?.[0];
  console.log(`  Resolved Primary Work Order: ${primaryWo?.work_order_no} (${primaryWo?.id})`);

  const { data: invoices } = await adminClient.from('invoices').select('id, invoice_number');
  const primaryInv = invoices?.find(i => i.invoice_number === 'INV-2026-048') || invoices?.[0];
  console.log(`  Resolved Primary Invoice: ${primaryInv?.invoice_number} (${primaryInv?.id})`);

  // 2. Ensure Storage Buckets & Seed Baseline Files
  console.log('\n[STEP 2] PROVISIONING STORAGE ARTIFACTS IN PRIVATE BUCKETS...');
  const samplePdfContent = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%%EOF');

  const storageSeeds = [
    { bucket: 'spindle-documents', path: 'spindle/dwg_hsk63_24k_rev3.pdf', mime: 'application/pdf' },
    { bucket: 'quality-reports', path: 'quality/qc_runout_gps0840.pdf', mime: 'application/pdf' },
    { bucket: 'invoices-ewb', path: 'invoices/inv_2026_048_tax.pdf', mime: 'application/pdf' },
    { bucket: 'spindle-documents', path: 'service/sr_2026_041_diagnostic.pdf', mime: 'application/pdf' },
    { bucket: 'spindle-documents', path: 'work_order/wo_2026_0147_router.pdf', mime: 'application/pdf' }
  ];

  for (const s of storageSeeds) {
    const { data: list } = await adminClient.storage.from(s.bucket).list(s.path.split('/')[0]);
    const exists = list?.some(f => f.name === s.path.split('/')[1]);
    if (!exists) {
      const { error: upErr } = await adminClient.storage.from(s.bucket).upload(s.path, samplePdfContent, {
        contentType: s.mime,
        upsert: true
      });
      if (!upErr) {
        stats.storage_objects.uploaded++;
      } else {
        console.warn(`  Warning: storage upload skipped: ${upErr.message}`);
      }
    } else {
      stats.storage_objects.skipped++;
    }
  }
  console.log(`  Storage Objects Uploaded: ${stats.storage_objects.uploaded}, Skipped (Already Exists): ${stats.storage_objects.skipped}`);

  // 3. Migrate Documents
  console.log('\n[STEP 3] MIGRATING DOCUMENTS & DOCUMENT VERSIONS...');
  const baselineDocs = [
    {
      title: 'HSK-A63 24,000 RPM Motorized Spindle Drawing Rev 3',
      document_type: 'Engineering Drawing',
      file_name: 'DWG-HSK63-24K-REV3.pdf',
      file_size_bytes: 2450000,
      mime_type: 'application/pdf',
      storage_bucket: 'spindle-documents',
      storage_path: 'spindle/dwg_hsk63_24k_rev3.pdf',
      version: 3,
      reference_type: 'SPINDLE',
      reference_id: primarySpindle?.serial_number || 'GPS-2026-0840',
      uploaded_by: rahulPatil?.id
    },
    {
      title: 'Metrology Runout Inspection Certificate: GPS-2026-0840',
      document_type: 'Metrology Cert',
      file_name: 'QC-RUNOUT-GPS0840.pdf',
      file_size_bytes: 1280000,
      mime_type: 'application/pdf',
      storage_bucket: 'quality-reports',
      storage_path: 'quality/qc_runout_gps0840.pdf',
      version: 1,
      reference_type: 'SPINDLE',
      reference_id: primarySpindle?.serial_number || 'GPS-2026-0840',
      uploaded_by: rahulPatil?.id
    },
    {
      title: 'Tax Invoice INV-2026-048 (GST Signed Official PDF)',
      document_type: 'Invoice PDF',
      file_name: 'INV-2026-048-TAX.pdf',
      file_size_bytes: 520000,
      mime_type: 'application/pdf',
      storage_bucket: 'invoices-ewb',
      storage_path: 'invoices/inv_2026_048_tax.pdf',
      version: 1,
      reference_type: 'INVOICE',
      reference_id: primaryInv?.invoice_number || 'INV-2026-048',
      uploaded_by: rahulPatil?.id
    },
    {
      title: 'Overhaul Teardown Diagnostic & Root Cause Report',
      document_type: 'Service Report',
      file_name: 'SR-2026-041-DIAGNOSTIC.pdf',
      file_size_bytes: 3100000,
      mime_type: 'application/pdf',
      storage_bucket: 'spindle-documents',
      storage_path: 'service/sr_2026_041_diagnostic.pdf',
      version: 1,
      reference_type: 'SERVICE_REQUEST',
      reference_id: 'SR-2026-041',
      uploaded_by: rahulPatil?.id
    },
    {
      title: 'Shop Floor Production Router & Stage Verification Sheet',
      document_type: 'Engineering Drawing',
      file_name: 'WO-2026-0147-ROUTER.pdf',
      file_size_bytes: 1850000,
      mime_type: 'application/pdf',
      storage_bucket: 'spindle-documents',
      storage_path: 'work_order/wo_2026_0147_router.pdf',
      version: 1,
      reference_type: 'WORK_ORDER',
      reference_id: primaryWo?.work_order_no || 'WO-2026-0147',
      uploaded_by: rahulPatil?.id
    }
  ];

  for (const doc of baselineDocs) {
    // Check if document already exists by natural key (storage_path)
    const { data: existing } = await adminClient
      .from('documents')
      .select('id')
      .eq('storage_path', doc.storage_path)
      .maybeSingle();

    let docId = existing?.id;
    if (existing) {
      stats.documents.existing++;
      stats.documents.skipped++;
    } else {
      const { data: created, error } = await adminClient
        .from('documents')
        .insert(doc)
        .select('id')
        .single();

      if (error) {
        console.error(`  Error creating document "${doc.title}":`, error.message);
      } else {
        docId = created.id;
        stats.documents.created++;
      }
    }

    // Version record in document_versions
    if (docId) {
      const { data: existingVer } = await adminClient
        .from('document_versions')
        .select('id')
        .eq('document_id', docId)
        .eq('version_number', 1)
        .maybeSingle();

      if (existingVer) {
        stats.document_versions.existing++;
        stats.document_versions.skipped++;
      } else {
        const { error: verErr } = await adminClient
          .from('document_versions')
          .insert({
            document_id: docId,
            version_number: 1,
            file_name: doc.file_name,
            file_size_bytes: doc.file_size_bytes,
            storage_path: doc.storage_path,
            change_notes: 'Baseline certified release',
            uploaded_by: doc.uploaded_by
          });
        if (!verErr) {
          stats.document_versions.created++;
        }
      }
    }
  }

  // 4. Migrate Email Activity
  console.log('\n[STEP 4] MIGRATING EMAIL TRANSMISSION REGISTER...');
  const baselineEmails = [
    {
      message_id: '<em-101-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['tanmay@tataadvanced.com'],
      cc_recipients: ['purchase@tataadvanced.com', 'accounts@tataadvanced.com'],
      subject: 'Invoice INV-2026-0098 — GPS Spindle Pvt. Ltd.',
      body_text: 'Please find attached the official Tax Invoice INV-2026-0098 for the precision spindle rebuild and balancing.',
      document_type: 'Tax Invoice',
      document_id: 'INV-2026-0098',
      related_customer_id: tataCust?.id,
      customer_name: 'Tata Advanced Systems Ltd',
      attachments_count: 1,
      delivery_status: 'Sent',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Rahul Patil',
      sent_at: '2026-09-10T11:45:00Z',
      metadata: { attachmentName: 'INV-2026-0098.pdf' }
    },
    {
      message_id: '<em-102-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['purchase@tataadvanced.com'],
      cc_recipients: ['accounts@tataadvanced.com'],
      subject: 'Quotation QT-2026-0184 — GPS-HSK-A63-24K Spindle',
      body_text: 'Please find attached our quotation QT-2026-0184 for the GPS-HSK-A63-24K high-speed motorized spindle.',
      document_type: 'Quotation',
      document_id: 'QT-2026-0184',
      related_customer_id: tataCust?.id,
      customer_name: 'Tata Advanced Systems Ltd',
      attachments_count: 1,
      delivery_status: 'Sent',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Rahul Patil',
      sent_at: '2026-09-09T09:30:00Z',
      metadata: { attachmentName: 'QT-2026-0184.pdf' }
    },
    {
      message_id: '<em-103-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['purchase@linamar.com'],
      cc_recipients: ['plant.head@linamar.com', 'accounts@linamar.com'],
      subject: 'Estimate QTN/2026-27/294 — LINAMAR INDIA PRIVATE LIMITED',
      body_text: 'Please find attached our detailed repair and replacement estimate for Kessler HSK-63 spindle rebuild.',
      document_type: 'Quotation',
      document_id: 'QTN/2026-27/294',
      related_customer_id: linamarCust?.id,
      customer_name: 'LINAMAR INDIA PRIVATE LIMITED',
      attachments_count: 2,
      delivery_status: 'Sent',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Rahul Patil',
      sent_at: '2026-09-08T16:45:00Z',
      metadata: { attachmentName: 'QTN-2026-27-294.pdf' }
    },
    {
      message_id: '<em-104-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['procurement@bharatforge.com'],
      cc_recipients: ['sunil.kadam@bharatforge.com', 'finance@bharatforge.com'],
      subject: 'Tax Invoice INV-2026-052 — Bharat Forge Ltd',
      body_text: 'Please find attached Tax Invoice INV-2026-052 for heavy milling spindle rebuild and test certificate.',
      document_type: 'Tax Invoice',
      document_id: 'INV-2026-052',
      related_customer_id: bforgeCust?.id,
      customer_name: 'Bharat Forge Ltd',
      attachments_count: 1,
      delivery_status: 'Sent',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Pooja Deshmukh',
      sent_at: '2026-09-07T14:10:00Z',
      metadata: { attachmentName: 'INV-2026-052.pdf' }
    },
    {
      message_id: '<em-105-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['sunil.kadam@bharatforge.com'],
      cc_recipients: ['procurement@bharatforge.com'],
      subject: 'Commercial Proposal Q-2026-090 — GPS-BT40-15K Direct Drive',
      body_text: 'Draft quotation for 2x GPS-BT40-15K spindles with 30-day payment term review.',
      document_type: 'Quotation',
      document_id: 'Q-2026-090',
      related_customer_id: bforgeCust?.id,
      customer_name: 'Bharat Forge Ltd - Chakan',
      attachments_count: 1,
      delivery_status: 'Draft',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Rahul Patil',
      sent_at: '2026-09-06T11:20:00Z',
      metadata: { attachmentName: 'Q-2026-090.pdf' }
    },
    {
      message_id: '<em-106-seed@gpsspindles.com>',
      from_address: 'sales@gpsspindle.com',
      to_recipients: ['accounts@mahindra.com'],
      cc_recipients: ['projects@mahindra.com'],
      subject: 'Payment Reminder: Overdue Balance for Invoice INV-2026-048',
      body_text: 'Mail delivery error (550 Mailbox temporarily unavailable). Requires resend.',
      document_type: 'Tax Invoice',
      document_id: 'INV-2026-048',
      related_customer_id: null,
      customer_name: 'Mahindra Heavy Engines Ltd',
      attachments_count: 1,
      delivery_status: 'Failed',
      sent_by: rahulPatil?.id,
      sent_by_name: 'Rahul Patil',
      sent_at: '2026-09-05T17:00:00Z',
      metadata: { attachmentName: 'INV-2026-048.pdf' }
    }
  ];

  for (const em of baselineEmails) {
    const { data: existing } = await adminClient
      .from('email_activity')
      .select('id')
      .eq('message_id', em.message_id)
      .maybeSingle();

    if (existing) {
      stats.email_activity.existing++;
      stats.email_activity.skipped++;
    } else {
      const { error } = await adminClient.from('email_activity').insert(em);
      if (error) {
        console.error(`  Error inserting email activity "${em.subject}":`, error.message);
      } else {
        stats.email_activity.created++;
      }
    }
  }

  // 5. Migrate Notifications
  console.log('\n[STEP 5] MIGRATING ERP PERSISTENT NOTIFICATIONS & ALERTS...');
  const baselineNotifications = [
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'Low Stock Alert',
      title: 'Low Stock Alert: FAG Bearings HC7008',
      message: 'Ceramic angular contact bearings FAG-HC7008 dropped to 8 pairs. Reorder threshold is 10.',
      priority: 'Urgent',
      is_read: false,
      related_module: 'Inventory',
      related_record_id: 'ITEM-BRG-7008',
      created_at: '2026-09-11T07:30:00Z'
    },
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'QC Passed',
      title: 'QC Passed: Spindle GPS-2026-0840',
      message: 'Spindle GPS-2026-0840 passed final dynamic balance audit (Grade G0.4 @ 24,000 RPM).',
      priority: 'Normal',
      is_read: false,
      related_module: 'Quality',
      related_record_id: primarySpindle?.serial_number || 'GPS-2026-0840',
      created_at: '2026-09-11T08:15:00Z'
    },
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'Overdue Work Order',
      title: 'Overdue Work Order: WO-2026-0147',
      message: 'Assembly Stage delayed on WO-2026-0147 due to shaft grind inspection backlog.',
      priority: 'Urgent',
      is_read: false,
      related_module: 'Manufacturing',
      related_record_id: primaryWo?.work_order_no || 'WO-2026-0147',
      created_at: '2026-09-11T08:45:00Z'
    },
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'Task Assigned',
      title: 'New Service Request Logged: SR-2026-041',
      message: 'Linamar India logged inward service case for Kessler HSK-63 spindle overhaul.',
      priority: 'Normal',
      is_read: false,
      related_module: 'Service',
      related_record_id: 'SR-2026-041',
      created_at: '2026-09-11T09:00:00Z'
    },
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'Approval Required',
      title: 'Purchase Order Approval: PO-2026-0087',
      message: 'PO for Schaeffler super precision bearings requires DGM Commercial authorization.',
      priority: 'Urgent',
      is_read: true,
      read_at: '2026-09-11T09:30:00Z',
      related_module: 'Procurement',
      related_record_id: 'PO-2026-0087',
      created_at: '2026-09-10T14:20:00Z'
    },
    {
      recipient_id: rahulPatil?.id,
      notification_type: 'EWB Expiry',
      title: 'E-Way Bill Expiry Warning: EWB-948271048201',
      message: 'E-Way Bill for Tata Advanced Systems spindle shipment expires in 6 hours.',
      priority: 'Critical',
      is_read: false,
      related_module: 'Commercial',
      related_record_id: 'EWB-948271048201',
      created_at: '2026-09-11T09:40:00Z'
    }
  ];

  for (const notif of baselineNotifications) {
    const { data: existing } = await adminClient
      .from('notifications')
      .select('id')
      .eq('notification_type', notif.notification_type)
      .eq('title', notif.title)
      .maybeSingle();

    if (existing) {
      stats.notifications.existing++;
      stats.notifications.skipped++;
    } else {
      const { error } = await adminClient.from('notifications').insert(notif);
      if (error) {
        console.error(`  Error inserting notification "${notif.title}":`, error.message);
      } else {
        stats.notifications.created++;
      }
    }
  }

  // 6. Record Migration Event in Immutable Audit Log
  console.log('\n[STEP 6] RECORDING AUDIT LEDGER ENTRY...');
  await adminClient.from('audit_logs').insert({
    user_name: 'Phase 9 Migration Engine',
    user_email: 'system.migration@gpsspindles.com',
    action: 'INSERT',
    module: 'System',
    table_name: 'documents,email_activity,notifications',
    record_id: 'PHASE-9-BASELINE-MIGRATION',
    summary_message: `Phase 9 Baseline Migration executed. Created ${stats.documents.created} docs, ${stats.email_activity.created} emails, ${stats.notifications.created} notifications.`,
    new_values: stats
  });

  // Final Summary Report
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 9 MIGRATION EXECUTION SUMMARY');
  console.log('='.repeat(80));
  console.log(JSON.stringify(stats, null, 2));

  return stats;
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
