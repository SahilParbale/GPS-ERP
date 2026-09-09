-- ==============================================================================
-- GPS SPINDLE ERP — DATABASE ARCHITECTURE MIGRATION
-- Migration: 020_storage_security.sql
-- Module: Supabase Storage Buckets & Storage Object Row Level Security
-- ==============================================================================

-- 1. Create Core Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('spindle-documents', 'spindle-documents', false, 52428800, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/acad', 'application/x-autocad', 'application/dxf', 'model/step', 'model/iges']),
    ('quality-reports', 'quality-reports', false, 20971520, ARRAY['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('invoices-ewb', 'invoices-ewb', false, 10485760, ARRAY['application/pdf', 'image/png', 'image/jpeg']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Storage Policies

-- A. AVATARS (Public read, authenticated upload)
DROP POLICY IF EXISTS p_storage_avatars_public_read ON storage.objects;
CREATE POLICY p_storage_avatars_public_read ON storage.objects
    FOR SELECT TO public
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS p_storage_avatars_auth_upload ON storage.objects;
CREATE POLICY p_storage_avatars_auth_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS p_storage_avatars_owner_delete ON storage.objects;
CREATE POLICY p_storage_avatars_owner_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars' AND (owner = auth.uid() OR public.is_admin()));

-- B. SPINDLE DOCUMENTS (Private: authenticated read, production/QA upload)
DROP POLICY IF EXISTS p_storage_spindle_docs_read ON storage.objects;
CREATE POLICY p_storage_spindle_docs_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'spindle-documents');

DROP POLICY IF EXISTS p_storage_spindle_docs_upload ON storage.objects;
CREATE POLICY p_storage_spindle_docs_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'spindle-documents' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'PROD_MGR', 'QA_MGR', 'SERVICE'));

DROP POLICY IF EXISTS p_storage_spindle_docs_delete ON storage.objects;
CREATE POLICY p_storage_spindle_docs_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'spindle-documents' AND public.is_management());

-- C. QUALITY REPORTS (Private: authenticated read, QA/Admin upload)
DROP POLICY IF EXISTS p_storage_qa_reports_read ON storage.objects;
CREATE POLICY p_storage_qa_reports_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'quality-reports');

DROP POLICY IF EXISTS p_storage_qa_reports_upload ON storage.objects;
CREATE POLICY p_storage_qa_reports_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'quality-reports' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'QA_MGR'));

DROP POLICY IF EXISTS p_storage_qa_reports_delete ON storage.objects;
CREATE POLICY p_storage_qa_reports_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'quality-reports' AND public.is_management());

-- D. INVOICES & E-WAY BILLS (Private: Commercial, Management & Admin read/write)
DROP POLICY IF EXISTS p_storage_invoices_read ON storage.objects;
CREATE POLICY p_storage_invoices_read ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'invoices-ewb' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_storage_invoices_upload ON storage.objects;
CREATE POLICY p_storage_invoices_upload ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'invoices-ewb' AND public.has_any_role('ADMIN', 'MANAGEMENT', 'SALES'));

DROP POLICY IF EXISTS p_storage_invoices_delete ON storage.objects;
CREATE POLICY p_storage_invoices_delete ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'invoices-ewb' AND public.is_admin());
