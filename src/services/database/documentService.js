import { baseService } from './baseService';
import { storageService } from '../storage/storageService';
import { supabase } from '../supabase/supabaseClient';

/**
 * Document Management Domain Service
 * Manages engineering drawings, metrology inspection certificates, invoice PDFs,
 * purchase order attachments, CAD STEP models, and customer service reports.
 * Interfaces with private Supabase Storage buckets ('spindle-documents', 'quality-reports', 'invoices-ewb')
 * with signed URL access and atomic rollback on failed operations.
 */
export const documentService = {
  /**
   * Fetch all documents with optional filters
   * @param {object} [options]
   */
  async getDocuments(options = {}) {
    return await baseService.select('documents', {
      select: `
        id,
        title,
        document_type,
        file_name,
        file_size_bytes,
        mime_type,
        storage_bucket,
        storage_path,
        version,
        reference_type,
        reference_id,
        uploaded_by,
        created_at,
        updated_at,
        uploader:employees(id, first_name, last_name, employee_code)
      `,
      orderBy: options.orderBy || 'created_at',
      ascending: options.ascending ?? false,
      ...options
    });
  },

  /**
   * Fetch single document by ID including version history
   * @param {string} id
   */
  async getDocumentById(id) {
    const docRes = await baseService.select('documents', {
      select: `
        *,
        uploader:employees(id, first_name, last_name, employee_code),
        versions:document_versions(
          id,
          version_number,
          file_name,
          file_size_bytes,
          storage_path,
          change_notes,
          uploaded_at,
          uploader:employees(id, first_name, last_name, employee_code)
        )
      `,
      eq: { id },
      single: true
    });

    return docRes;
  },

  /**
   * Fetch documents associated with a specific business entity
   * @param {string} referenceType - 'SPINDLE' | 'WORK_ORDER' | 'INVOICE' | 'PURCHASE_ORDER' | 'SERVICE_REQUEST' | 'QUALITY_CERTIFICATE'
   * @param {string} referenceId - Identifier or UUID of the referenced record
   */
  async getDocumentsByEntity(referenceType, referenceId) {
    return await baseService.select('documents', {
      select: `
        id,
        title,
        document_type,
        file_name,
        file_size_bytes,
        mime_type,
        storage_bucket,
        storage_path,
        version,
        reference_type,
        reference_id,
        created_at,
        uploader:employees(id, first_name, last_name, employee_code)
      `,
      eq: {
        reference_type: referenceType,
        reference_id: referenceId
      },
      orderBy: 'created_at',
      ascending: false
    });
  },

  /**
   * Determine default storage bucket based on document category
   * @param {string} documentType
   */
  resolveStorageBucket(documentType = '') {
    const dt = (documentType || '').toLowerCase();
    if (dt.includes('quality') || dt.includes('metrology') || dt.includes('cert') || dt.includes('test')) {
      return 'quality-reports';
    }
    if (dt.includes('invoice') || dt.includes('po') || dt.includes('purchase') || dt.includes('bill') || dt.includes('commercial')) {
      return 'invoices-ewb';
    }
    return 'spindle-documents';
  },

  /**
   * Upload file to private storage bucket and create document metadata atomically.
   * If metadata insertion fails, automatically performs compensating cleanup of uploaded file.
   * @param {object} params
   * @param {File|Blob} params.file
   * @param {string} params.title
   * @param {string} params.documentType
   * @param {string} [params.referenceType]
   * @param {string} [params.referenceId]
   * @param {string} [params.storageBucket]
   * @param {string} [params.uploadedBy]
   */
  async uploadDocument({
    file,
    title,
    documentType,
    referenceType = 'SPINDLE',
    referenceId = '',
    storageBucket,
    uploadedBy = null
  }) {
    if (!file) {
      return { data: null, error: { message: 'File is required for document upload' } };
    }

    const bucket = storageBucket || this.resolveStorageBucket(documentType);
    const sanitizedFileName = (file.name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = (referenceType || 'general').toLowerCase();
    const storagePath = `${folder}/${Date.now()}_${sanitizedFileName}`;

    // 1. Upload to Supabase Storage
    const uploadRes = await storageService.uploadFile(bucket, storagePath, file, {
      contentType: file.type || 'application/octet-stream'
    });

    if (uploadRes.error) {
      return {
        data: null,
        error: {
          message: `Storage upload failed: ${uploadRes.error.message || 'Access denied or quota exceeded'}`
        }
      };
    }

    // 2. Insert document record in database
    const docPayload = {
      title: title || file.name,
      document_type: documentType || 'Engineering Drawing',
      file_name: file.name,
      file_size_bytes: file.size || 0,
      mime_type: file.type || 'application/pdf',
      storage_bucket: bucket,
      storage_path: storagePath,
      version: 1,
      reference_type: referenceType,
      reference_id: referenceId,
      uploaded_by: uploadedBy
    };

    const docInsertRes = await baseService.insert('documents', docPayload);

    // Atomic compensating rollback if metadata insert failed
    if (docInsertRes.error) {
      console.warn('Compensating rollback: Deleting orphaned storage object due to database insertion failure', storagePath);
      await storageService.deleteFile(bucket, storagePath);
      return { data: null, error: docInsertRes.error };
    }

    const createdDoc = docInsertRes.data;

    // 3. Insert initial version into document_versions
    if (createdDoc && createdDoc.id) {
      await baseService.insert('document_versions', {
        document_id: createdDoc.id,
        version_number: 1,
        file_name: file.name,
        file_size_bytes: file.size || 0,
        storage_path: storagePath,
        change_notes: 'Initial release and check-in',
        uploaded_by: uploadedBy
      });
    }

    return { data: createdDoc, error: null };
  },

  /**
   * Generate temporary signed URL for secure private download
   * @param {string} storageBucket
   * @param {string} storagePath
   * @param {number} [expiresIn] - seconds, default 3600 (1 hr)
   */
  async getSignedDocumentUrl(storageBucket, storagePath, expiresIn = 3600) {
    if (!storageBucket || !storagePath) {
      return { data: null, error: { message: 'Missing bucket or path for signed URL' } };
    }
    return await storageService.createSignedUrl(storageBucket, storagePath, expiresIn);
  },

  /**
   * Direct download of file blob
   * @param {string} storageBucket
   * @param {string} storagePath
   */
  async downloadDocument(storageBucket, storagePath) {
    return await storageService.downloadFile(storageBucket, storagePath);
  },

  /**
   * Delete document and all revisions, cleaning up storage object
   * @param {string} documentId
   */
  async deleteDocument(documentId) {
    // 1. Fetch document to determine storage path
    const { data: doc, error: fetchErr } = await baseService.select('documents', {
      eq: { id: documentId },
      single: true
    });

    if (fetchErr || !doc) {
      return { data: null, error: fetchErr || { message: 'Document not found' } };
    }

    // 2. Delete database record (document_versions cascade deleted via FK)
    const deleteRes = await baseService.delete('documents', documentId);
    if (deleteRes.error) {
      return deleteRes;
    }

    // 3. Remove physical storage object
    if (doc.storage_bucket && doc.storage_path) {
      await storageService.deleteFile(doc.storage_bucket, doc.storage_path);
    }

    return { data: doc, error: null };
  }
};

export default documentService;
