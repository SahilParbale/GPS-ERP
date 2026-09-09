-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 012_documents_notifications.sql
-- Module: Documents, File Versions, Email Communications, Alerts & Audit Trails
-- ==============================================================================

-- 1. DOCUMENTS MASTER (Engineering Drawings, Metrology Certs, Schematics)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL, -- 'Engineering Drawing', 'Metrology Cert', 'Invoice PDF', 'PO Attachment', 'CAD STEP', 'Service Report'
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    storage_bucket VARCHAR(100) DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    version INT DEFAULT 1,
    reference_type VARCHAR(50), -- 'SPINDLE', 'WORK_ORDER', 'INVOICE', 'PURCHASE_ORDER', 'SERVICE_REQUEST', 'QUALITY_CERTIFICATE'
    reference_id VARCHAR(100),
    uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. DOCUMENT VERSIONS (Revision History & CAD Check-ins)
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    change_notes TEXT,
    uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (document_id, version_number)
);

-- 3. EMAIL ACTIVITY & TRANSMISSION REGISTER (Outlook Integration History)
CREATE TABLE IF NOT EXISTS public.email_activity (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(150),
    from_address VARCHAR(150) NOT NULL,
    to_recipients TEXT[] NOT NULL,
    cc_recipients TEXT[],
    bcc_recipients TEXT[],
    subject VARCHAR(255) NOT NULL,
    body_text TEXT,
    body_html TEXT,
    document_type VARCHAR(50) NOT NULL, -- 'Quotation', 'Tax Invoice', 'Proforma Invoice', 'E-Way Bill', 'Purchase Order', 'Service Report'
    document_id VARCHAR(100) NOT NULL,
    related_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    related_supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    attachments_count INT DEFAULT 0,
    delivery_status VARCHAR(50) DEFAULT 'Sent' CHECK (delivery_status IN ('Draft', 'Queued', 'Sent', 'Delivered', 'Failed', 'Opened')),
    sent_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    sent_by_name VARCHAR(150) DEFAULT 'Rahul Patil',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB
);

-- 4. ERP PERSISTENT NOTIFICATIONS (Live Bell Alerts & Approvals)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) DEFAULT 'System' CHECK (notification_type IN ('System', 'Approval Required', 'Low Stock Alert', 'QC Passed', 'Overdue Work Order', 'EWB Expiry', 'Task Assigned')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(30) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'Urgent', 'Critical')),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    related_module VARCHAR(50), -- 'Manufacturing', 'Commercial', 'Procurement', 'Inventory', 'Quality', 'Service', 'Workforce'
    related_record_id VARCHAR(100),
    reference_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SYSTEM AUDIT LOG (Immutable Event Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    user_name VARCHAR(150),
    user_email VARCHAR(150),
    action VARCHAR(50) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'DISPATCH', 'CLOCK_IN', 'CLOCK_OUT'
    module VARCHAR(50) NOT NULL, -- 'Manufacturing', 'Commercial', 'Procurement', 'Inventory', 'Quality', 'Service', 'Workforce', 'Finance'
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    summary_message TEXT NOT NULL,
    previous_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_documents_ref ON public.documents(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_email_activity_doc ON public.email_activity(document_id);
CREATE INDEX IF NOT EXISTS idx_email_activity_cust ON public.email_activity(related_customer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs(module, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON public.audit_logs(table_name, record_id);
