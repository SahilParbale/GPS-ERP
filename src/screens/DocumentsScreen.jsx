import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { 
  FileText, Upload, Download, Search, Trash2, Eye, 
  RefreshCw, Filter, ShieldCheck, AlertCircle, CheckCircle2,
  FolderOpen, Layers, HardDrive, FileSpreadsheet, X
} from 'lucide-react';
import { documentService } from '../services/database/documentService';
import { useAuth } from '../context/AuthContext';

export default function DocumentsScreen({ onNotify }) {
  const { employee } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Engineering Drawing');
  const [referenceType, setReferenceType] = useState('SPINDLE');
  const [referenceId, setReferenceId] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Load documents from live Supabase
  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await documentService.getDocuments();
      if (res.error) {
        setError(res.error.message || 'Failed to retrieve documents from storage');
        setDocuments([]);
      } else {
        setDocuments(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Connection error while loading documents');
      setDocuments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  // Handle file download via secure signed URL
  const handleDownload = async (doc) => {
    try {
      if (onNotify) onNotify(`Generating secure signed URL for ${doc.file_name}...`);
      const { data, error } = await documentService.getSignedDocumentUrl(
        doc.storage_bucket,
        doc.storage_path,
        3600
      );

      if (error || !data?.signedUrl) {
        if (onNotify) onNotify(`Download failed: ${error?.message || 'Access restricted by security policy'}`, 'error');
        return;
      }

      // Open signed download link
      window.open(data.signedUrl, '_blank');
      if (onNotify) onNotify(`Downloading ${doc.file_name}`);
    } catch (err) {
      if (onNotify) onNotify(`Download failed: ${err.message}`, 'error');
    }
  };

  // Handle document deletion
  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await documentService.deleteDocument(doc.id);
      if (res.error) {
        if (onNotify) onNotify(`Delete failed: ${res.error.message || 'Permission denied'}`, 'error');
      } else {
        if (onNotify) onNotify(`Document "${doc.title}" deleted successfully`);
        loadDocuments();
      }
    } catch (err) {
      if (onNotify) onNotify(`Delete error: ${err.message}`, 'error');
    }
  };

  // Handle document upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const res = await documentService.uploadDocument({
        file: selectedFile,
        title: uploadTitle.trim() || selectedFile.name,
        documentType: uploadCategory,
        referenceType,
        referenceId: referenceId.trim(),
        uploadedBy: employee?.id || null
      });

      if (res.error) {
        setUploadError(res.error.message || 'Failed to upload document to private storage.');
      } else {
        if (onNotify) onNotify(`Document "${uploadTitle || selectedFile.name}" uploaded successfully`);
        setIsUploadOpen(false);
        setUploadTitle('');
        setSelectedFile(null);
        setReferenceId('');
        loadDocuments();
      }
    } catch (err) {
      setUploadError(err.message || 'Upload operation failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'ALL' || 
      (selectedCategory === 'DRAWINGS' && (doc.document_type || '').includes('Drawing')) ||
      (selectedCategory === 'QUALITY' && ((doc.document_type || '').includes('Cert') || (doc.document_type || '').includes('Metrology'))) ||
      (selectedCategory === 'INVOICES' && ((doc.document_type || '').includes('Invoice') || (doc.document_type || '').includes('PO') || (doc.document_type || '').includes('EWB'))) ||
      (selectedCategory === 'SERVICE' && (doc.document_type || '').includes('Service'));

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (doc.title || '').toLowerCase().includes(q) ||
      (doc.file_name || '').toLowerCase().includes(q) ||
      (doc.reference_id || '').toLowerCase().includes(q) ||
      (doc.document_type || '').toLowerCase().includes(q);

    return matchesCategory && matchesSearch;
  });

  // Helper for category badge styling
  const getCategoryBadgeStyle = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('drawing') || cat.includes('cad')) {
      return { bg: '#FDF2F4', color: '#7A1F3D', border: '#F2D2DC', icon: Layers };
    }
    if (cat.includes('cert') || cat.includes('metrology') || cat.includes('quality')) {
      return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', icon: ShieldCheck };
    }
    if (cat.includes('invoice') || cat.includes('po') || cat.includes('commercial')) {
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: FileSpreadsheet };
    }
    return { bg: '#f1f5f9', color: '#334155', border: '#cbd5e1', icon: FileText };
  };

  if (isLoading) {
    return (
      <TablePageSkeleton 
        hasMetrics={true} 
        metricCount={4} 
        columns={['260px', '160px', '130px', '90px', '120px', '130px', '110px', '120px']} 
        rows={7} 
      />
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Engineering Documents & Digital Assets" 
        subtitle="Secure repository for CAD drawings, metrology inspection reports, invoices, and service logs"
        badge={`${documents.length} Managed Files`}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={loadDocuments}
            disabled={isLoading}
            title="Refresh document registry"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setIsUploadOpen(true)}
          >
            <Upload size={14} />
            <span className="desktop-only-inline">Upload Document</span>
            <span className="mobile-only-inline">Upload</span>
          </button>
        </div>
      </PageHeader>

      <div className="content-body">

      {/* Metrics Summary Strip */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Documents</span>
            <div className="metric-icon-wrap"><HardDrive size={16} /></div>
          </div>
          <div className="metric-value">{documents.length} Files</div>
          <div className="metric-footer" style={{ color: '#059669' }}>Encrypted Private Storage</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Engineering Drawings</span>
            <div className="metric-icon-wrap"><Layers size={16} /></div>
          </div>
          <div className="metric-value">
            {documents.filter(d => (d.document_type || '').includes('Drawing') || (d.document_type || '').includes('CAD')).length} Drawings
          </div>
          <div className="metric-footer">CAD STEP & DXF Files</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Metrology & QC Certs</span>
            <div className="metric-icon-wrap" style={{ color: '#059669' }}><ShieldCheck size={16} /></div>
          </div>
          <div className="metric-value">
            {documents.filter(d => (d.document_type || '').includes('Cert') || (d.document_type || '').includes('Metrology')).length} Certs
          </div>
          <div className="metric-footer">Calibrated Inspection Trails</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Commercial & Invoices</span>
            <div className="metric-icon-wrap"><FileText size={16} /></div>
          </div>
          <div className="metric-value">
            {documents.filter(d => (d.document_type || '').includes('Invoice') || (d.document_type || '').includes('PO')).length} Records
          </div>
          <div className="metric-footer">Tax Invoices & E-Way Bills</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="section-card">
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search Title, File Name, Ref ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <CustomSelect 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'ALL', label: `All Categories (${documents.length})` },
                { value: 'DRAWINGS', label: 'Engineering Drawings' },
                { value: 'QUALITY', label: 'Metrology & QC Certificates' },
                { value: 'INVOICES', label: 'Invoices & Commercial PDFs' },
                { value: 'SERVICE', label: 'Service & Restoration Reports' }
              ]}
            />

            {(searchQuery || selectedCategory !== 'ALL') && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                style={{ height: '32px' }}
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="filter-summary-count">
            Showing <strong>{filteredDocuments.length}</strong> of {documents.length} files
          </div>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div style={{ margin: '16px 20px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary btn-sm"
              onClick={loadDocuments}
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Document Table (Desktop View) */}
        {!isLoading && !error && (
          <div className="table-responsive desktop-table-view">
            <table className="data-table" style={{ minWidth: '1080px' }}>
              <thead>
                <tr>
                  <th style={{ width: '260px' }}>Document Title & File</th>
                  <th style={{ width: '160px' }}>Category</th>
                  <th style={{ width: '130px' }}>Associated Entity</th>
                  <th style={{ width: '90px' }}>Size</th>
                  <th style={{ width: '120px' }}>Storage Bucket</th>
                  <th style={{ width: '130px' }}>Uploaded By</th>
                  <th style={{ width: '110px' }}>Date</th>
                  <th style={{ width: '120px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      <FolderOpen size={32} style={{ marginBottom: '12px', opacity: 0.4 }} />
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>No documents found</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        {searchQuery ? 'Try adjusting your search criteria' : 'Click "Upload Document" to archive an engineering drawing or metrology report.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map(doc => (
                    <tr key={doc.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '4px', 
                            background: '#f8fafc', 
                            border: '1px solid var(--border-color)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            flexShrink: 0
                          }}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                              {doc.title}
                            </div>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {doc.file_name}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ 
                          fontSize: '11px', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: '#f1f5f9', 
                          color: '#334155',
                          fontWeight: 500
                        }}>
                          {doc.document_type}
                        </span>
                      </td>

                      <td>
                        {doc.reference_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', color: '#1e40af' }}>
                              {doc.reference_type || 'REF'}
                            </span>
                            <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>
                              {doc.reference_id}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>General Archive</span>
                        )}
                      </td>

                      <td className="mono" style={{ fontSize: '12px' }}>
                        {formatBytes(doc.file_size_bytes)}
                      </td>

                      <td>
                        <span className="mono" style={{ fontSize: '11px', color: '#64748b' }}>
                          {doc.storage_bucket || 'spindle-documents'}
                        </span>
                      </td>

                      <td style={{ fontSize: '12px' }}>
                        {doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : 'Rahul Patil'}
                      </td>

                      <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDownload(doc)}
                            title="Download via secure signed URL"
                            style={{ padding: '4px 8px' }}
                          >
                            <Download size={13} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDelete(doc)}
                            title="Delete document"
                            style={{ padding: '4px 8px', color: '#ef4444' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Documents Mobile Card Feed (≤ 768px) */}
        {!isLoading && !error && (
          <div className="mobile-card-view">
            {filteredDocuments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <FolderOpen size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>No documents found</div>
                <div style={{ fontSize: '11.5px', marginTop: '2px' }}>
                  {searchQuery ? 'Try adjusting your search criteria' : 'Click "Upload Document" to archive an engineering drawing or metrology report.'}
                </div>
              </div>
            ) : (
              filteredDocuments.map(doc => {
                const badge = getCategoryBadgeStyle(doc.document_type);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={doc.id}
                    className="document-mobile-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                  >
                    {/* Card Top: Icon + Title + Category Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 }}>
                        <div style={{ 
                          width: '36px', 
                          height: '36px', 
                          borderRadius: '6px', 
                          background: badge.bg, 
                          border: `1px solid ${badge.border}`,
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          color: badge.color,
                          flexShrink: 0
                        }}>
                          <BadgeIcon size={18} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)', lineHeight: '1.3', wordBreak: 'break-word' }}>
                            {doc.title}
                          </div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {doc.file_name}
                          </div>
                        </div>
                      </div>

                      <span style={{ 
                        fontSize: '10.5px', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        background: badge.bg, 
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}>
                        {doc.document_type}
                      </span>
                    </div>

                    {/* Reference Entity & Storage Vault */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
                      <div>
                        {doc.reference_id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '3px', background: '#eff6ff', color: '#1e40af', fontWeight: 600 }}>
                              {doc.reference_type || 'REF'}
                            </span>
                            <span className="mono" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                              {doc.reference_id}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>General Archive</span>
                        )}
                      </div>

                      <div className="mono" style={{ fontSize: '10px', color: '#64748b', background: 'var(--bg-surface-subtle, #f8fafc)', padding: '2px 6px', borderRadius: '3px', border: '1px solid #e2e8f0' }}>
                        Vault: {doc.storage_bucket || 'spindle-documents'}
                      </div>
                    </div>

                    {/* 2-Column Meta Block: Size, Date & Uploader */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '8px',
                      fontSize: '11.5px',
                      padding: '8px 10px',
                      background: 'var(--bg-surface-subtle, #f8fafc)',
                      borderRadius: '6px'
                    }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>File Size & Date</div>
                        <div className="mono" style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: '1px' }}>
                          {formatBytes(doc.file_size_bytes)}
                          <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                            • {doc.created_at ? new Date(doc.created_at).toLocaleDateString('en-GB') : '—'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Uploaded By</div>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : 'Rahul Patil'}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: Action Buttons */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--border-color)',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                        <ShieldCheck size={13} />
                        <span>Signed URL Ready</span>
                      </div>

                      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDownload(doc)}
                          title="Download via secure signed URL"
                          style={{ padding: '4px 10px', fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#7A1F3D', color: '#7A1F3D', fontWeight: 600 }}
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDelete(doc)}
                          title="Delete document"
                          style={{ padding: '4px 8px', color: '#ef4444' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Document to Secure Storage"
        maxWidth="600px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => setIsUploadOpen(false)}
              disabled={isUploading}
              style={{ flex: '1 1 auto', minWidth: '70px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              form="upload-doc-form"
              className="btn btn-primary"
              disabled={isUploading || !selectedFile}
              style={{ flex: '1 1 auto', justifyContent: 'center' }}
            >
              {isUploading ? (
                <>
                  <RefreshCw size={14} className="spin" />
                  <span>Uploading to Vault...</span>
                </>
              ) : (
                <>
                  <Upload size={14} />
                  <span className="desktop-only-inline">Upload & Archive</span>
                  <span className="mobile-only-inline">Upload</span>
                </>
              )}
            </button>
          </div>
        }
      >
        <form id="upload-doc-form" onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {uploadError && (
            <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>{uploadError}</span>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Document Title *
            </label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. Dynamic Balance Test Sheet — GPS-2026-0840"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Document Category *
              </label>
              <CustomSelect 
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                options={[
                  { value: 'Engineering Drawing', label: 'Engineering Drawing (CAD / PDF)' },
                  { value: 'Metrology Cert', label: 'Metrology Cert (Quality)' },
                  { value: 'Invoice PDF', label: 'Invoice PDF (Commercial)' },
                  { value: 'PO Attachment', label: 'Purchase Order Attachment' },
                  { value: 'CAD STEP', label: 'CAD STEP 3D Model' },
                  { value: 'Service Report', label: 'Service Overhaul Report' }
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Reference Type
              </label>
              <CustomSelect 
                value={referenceType}
                onChange={(e) => setReferenceType(e.target.value)}
                options={[
                  { value: 'SPINDLE', label: 'Spindle Serial #' },
                  { value: 'WORK_ORDER', label: 'Work Order #' },
                  { value: 'INVOICE', label: 'Tax Invoice #' },
                  { value: 'PURCHASE_ORDER', label: 'Purchase Order #' },
                  { value: 'SERVICE_REQUEST', label: 'Service Request #' }
                ]}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Reference ID / Code
            </label>
            <input 
              type="text" 
              className="form-control"
              placeholder="e.g. GPS-2026-0840 or WO-2026-104"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              File Attachment *
            </label>
            <input 
              type="file" 
              className="form-control"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              required
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Supported: PDF, PNG, JPG, DXF, DWG, STEP. Files are stored in secure enterprise vault.
            </div>
          </div>
        </form>
      </Modal>
      </div>
    </div>
  );
}
