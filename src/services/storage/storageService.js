import { supabase, isConfigured } from '../supabase/supabaseClient';

/**
 * Supabase Storage Service
 * Manages document assets, attachments, PDF exports, and engineering drawings.
 */
export const storageService = {
  /**
   * Upload file to a designated storage bucket
   * @param {string} bucket - e.g. 'documents', 'drawings', 'certificates'
   * @param {string} path - destination file path
   * @param {File|Blob|ArrayBuffer} file - file contents
   * @param {object} [options] - e.g. { upsert: true, contentType: 'application/pdf' }
   */
  async uploadFile(bucket, path, file, options = {}) {
    if (!isConfigured) {
      return { data: null, error: new Error('Supabase Storage is not configured') };
    }
    return await supabase.storage.from(bucket).upload(path, file, {
      upsert: options.upsert ?? true,
      contentType: options.contentType,
    });
  },

  /**
   * Retrieve publicly accessible URL for a stored asset
   * @param {string} bucket
   * @param {string} path
   */
  getPublicUrl(bucket, path) {
    if (!isConfigured) return '';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || '';
  },

  /**
   * Generate temporary signed URL for private documents
   * @param {string} bucket
   * @param {string} path
   * @param {number} [expiresIn] seconds valid (default 3600 = 1 hour)
   */
  async createSignedUrl(bucket, path, expiresIn = 3600) {
    if (!isConfigured) {
      return { data: null, error: new Error('Supabase Storage is not configured') };
    }
    return await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  },

  /**
   * Download a file from a storage bucket as a Blob
   * @param {string} bucket
   * @param {string} path
   */
  async downloadFile(bucket, path) {
    if (!isConfigured) {
      return { data: null, error: new Error('Supabase Storage is not configured') };
    }
    return await supabase.storage.from(bucket).download(path);
  },

  /**
   * Delete a file or list of files from a bucket
   * @param {string} bucket
   * @param {string|string[]} paths
   */
  async deleteFile(bucket, paths) {
    if (!isConfigured) {
      return { data: null, error: new Error('Supabase Storage is not configured') };
    }
    const pathArray = Array.isArray(paths) ? paths : [paths];
    return await supabase.storage.from(bucket).remove(pathArray);
  },

  /**
   * List files within a bucket subfolder
   * @param {string} bucket
   * @param {string} [path]
   */
  async listBucketFiles(bucket, path = '') {
    if (!isConfigured) {
      return { data: [], error: null };
    }
    return await supabase.storage.from(bucket).list(path);
  },
};

export default storageService;
