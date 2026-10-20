import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minus, Maximize2, Minimize2, Send, Paperclip, 
  Eye, FileText, Trash2, Plus, AlertCircle, Mail, ArrowLeft
} from 'lucide-react';
import { 
  DEFAULT_SENDER, 
  EMAIL_TEMPLATES, 
  generateEmailContent, 
  sendEmail 
} from '../../services/emailService';
import DocumentPreviewModal from './DocumentPreviewModal';
import CustomSelect from '../common/CustomSelect';

export default function OutlookEmailComposer({
  isOpen,
  onClose,
  documentData,
  documentType = 'quotation', // 'quotation' | 'invoice'
  onSent,
  onSaveDraft,
  onNotify
}) {
  // Track whether minimized
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  // Persistent inline error banner (cleared on next send attempt)
  const [sendError, setSendError] = useState(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [previewDocModalOpen, setPreviewDocModalOpen] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(null);

  // Email state
  const [fromAddress, setFromAddress] = useState(DEFAULT_SENDER);
  const [toRecipients, setToRecipients] = useState([]);
  const [toInput, setToInput] = useState('');
  const [ccRecipients, setCcRecipients] = useState([]);
  const [ccInput, setCcInput] = useState('');
  const [isCcVisible, setIsCcVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(documentType);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const fileInputRef = useRef(null);

  // Initialize or re-initialize content when opened with a new document
  useEffect(() => {
    if (isOpen && documentData) {
      const initial = generateEmailContent({ 
        type: documentType, 
        doc: documentData,
        templateId: selectedTemplate
      });

      setFromAddress(initial.from);
      setToRecipients(initial.to || []);
      setToInput('');
      setCcRecipients(initial.cc || []);
      setCcInput('');
      setIsCcVisible((initial.cc && initial.cc.length > 0) || false);
      setSubject(initial.subject);
      setBody(initial.body);
      setAttachments(initial.attachments || []);
      setSelectedTemplate(documentType);
      setIsMinimized(false);
      setIsPreviewMode(false);
      setIsSending(false);
      setSendError(null);  // clear any previous error when re-opening
      setHasUserEdited(false);
    }
  }, [isOpen, documentData, documentType]);

  // Handle template change
  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    const generated = generateEmailContent({
      type: documentType,
      doc: documentData,
      templateId
    });
    setSubject(generated.subject);
    setBody(generated.body);
    setHasUserEdited(true);
    if (onNotify) {
      onNotify(`Applied template: ${EMAIL_TEMPLATES.find(t => t.id === templateId)?.label || templateId}`);
    }
  };

  // Recipient Tag Handlers
  const handleAddToRecipient = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.type === 'blur') {
      if (e.key === 'Enter' || e.key === ',') e.preventDefault();
      const val = toInput.trim().replace(/,/g, '');
      if (val && !toRecipients.includes(val)) {
        setToRecipients(prev => [...prev, val]);
        setToInput('');
        setHasUserEdited(true);
      }
    } else if (e.key === 'Backspace' && !toInput && toRecipients.length > 0) {
      setToRecipients(prev => prev.slice(0, -1));
      setHasUserEdited(true);
    }
  };

  const handleRemoveToRecipient = (index) => {
    setToRecipients(prev => prev.filter((_, i) => i !== index));
    setHasUserEdited(true);
  };

  const handleAddCcRecipient = (e) => {
    if (e.key === 'Enter' || e.key === ',' || e.type === 'blur') {
      if (e.key === 'Enter' || e.key === ',') e.preventDefault();
      const val = ccInput.trim().replace(/,/g, '');
      if (val && !ccRecipients.includes(val)) {
        setCcRecipients(prev => [...prev, val]);
        setCcInput('');
        setHasUserEdited(true);
      }
    } else if (e.key === 'Backspace' && !ccInput && ccRecipients.length > 0) {
      setCcRecipients(prev => prev.slice(0, -1));
      setHasUserEdited(true);
    }
  };

  const handleRemoveCcRecipient = (index) => {
    setCcRecipients(prev => prev.filter((_, i) => i !== index));
    setHasUserEdited(true);
  };

  // Attachment Handlers
  const handleRemoveAttachment = (attId) => {
    setAttachments(prev => prev.filter(a => a.id !== attId));
    setHasUserEdited(true);
    if (onNotify) {
      onNotify('Attachment removed from draft message');
    }
  };

  const handleAddSimulatedAttachment = (presetName, presetType, presetSize) => {
    const newAtt = {
      id: `att-${Date.now()}`,
      name: presetName,
      type: presetType,
      size: presetSize,
      isPrimaryDoc: false,
      docData: documentData
    };
    setAttachments(prev => [...prev, newAtt]);
    setShowAttachMenu(false);
    setHasUserEdited(true);
    if (onNotify) {
      onNotify(`Attached: ${presetName}`);
    }
  };

  const handleCustomFileUpload = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const newAtt = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: 'Supporting Document',
        size: `${Math.round(file.size / 1024) || 120} KB`,
        isPrimaryDoc: false,
        docData: documentData
      };
      setAttachments(prev => [...prev, newAtt]);
      setShowAttachMenu(false);
      setHasUserEdited(true);
      if (onNotify) {
        onNotify(`Attached: ${file.name}`);
      }
    }
  };

  const handlePreviewAttachment = (att) => {
    setSelectedPreviewDoc(att.docData || documentData);
    setPreviewDocModalOpen(true);
  };

  // Close & Discard handlers
  const handleCloseAttempt = () => {
    if (hasUserEdited) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardDialog(false);
    onClose();
  };

  // Save Draft Handler
  const handleSaveDraft = () => {
    const draftRecord = {
      id: `em-draft-${Date.now()}`,
      date: new Date().toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      documentId: documentData?.id || documentData?.estimateNo || 'DRAFT',
      documentType: documentType === 'invoice' ? 'Tax Invoice' : 'Quotation',
      customer: documentData?.customer || 'Customer Organization',
      recipient: toRecipients[0] || 'Unspecified Recipient',
      allRecipients: toRecipients,
      cc: ccRecipients,
      subject: subject || 'Untitled Draft',
      status: 'Draft',
      sentBy: 'Rahul Patil',
      attachmentsCount: attachments.length,
      attachmentName: attachments[0]?.name || 'No attachment',
      bodySnippet: body ? body.slice(0, 80) + '...' : 'Empty draft body',
      fullBody: body,
      attachments
    };

    if (onSaveDraft) {
      onSaveDraft(draftRecord);
    }
    if (onNotify) {
      onNotify('Email saved as draft');
    }
    onClose();
  };

  // Send Email Handler
  const handleSend = async () => {
    // Collect any remaining text in toInput
    let finalRecipients = [...toRecipients];
    if (toInput.trim() && !finalRecipients.includes(toInput.trim())) {
      finalRecipients.push(toInput.trim());
    }

    if (finalRecipients.length === 0) {
      if (onNotify) {
        onNotify('Please specify at least one recipient in the "To" field', 'warning');
      }
      return;
    }

    setIsSending(true);
    setSendError(null);  // clear previous error on every new attempt

    try {
      const docId = documentData?.id || documentData?.estimateNo || 'DOC-2026';
      const docTypeLabel = documentType === 'invoice' ? 'Tax Invoice' : 'Quotation';
      const result = await sendEmail({
        from: fromAddress,
        to: finalRecipients,
        cc: ccRecipients,
        subject,
        body,
        attachments,
        documentId: docId,
        documentType: docTypeLabel,
        customer: documentData?.customer || 'Customer Organization',
        sentBy: 'Rahul Patil'
      });

      setIsSending(false);

      const successMsg = result.idempotent
        ? `Email already delivered (idempotent). Document: ${docId}`
        : `Email sent successfully — ${docId} → ${finalRecipients[0]}`;

      if (onNotify) {
        onNotify(successMsg);
      }

      if (onSent) {
        // Build a lightweight activity record from the Edge Function response.
        // Callers (SalesScreen, EmailActivityScreen) use this only to trigger
        // a list refresh — they don't rely on specific record fields.
        onSent({
          id:             result.emailActivityId,
          status:         result.status || 'Sent',
          messageId:      result.messageId,
          provider:       result.provider,
          documentId:     docId,
          documentType:   docTypeLabel,
          customer:       documentData?.customer || 'Customer Organization',
          recipient:      finalRecipients[0],
          allRecipients:  finalRecipients,
          cc:             ccRecipients,
          subject,
          attachmentsCount: attachments.length,
        });
      }

      onClose();
    } catch (err) {
      setIsSending(false);
      // Set persistent inline banner (toast may auto-dismiss)
      setSendError(err.message || 'Failed to send email. Please try again.');
      if (onNotify) {
        onNotify(err.message || 'Failed to send email', 'error');
      }
    }
  };

  if (!isOpen && !isMinimized) {
    return null;
  }

  // If Minimized, render floating dock button in bottom-right corner
  if (isMinimized) {
    return (
      <div 
        className="outlook-minimized-dock"
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '24px',
          background: '#ffffff',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000,
          cursor: 'pointer',
          maxWidth: '380px'
        }}
        onClick={() => setIsMinimized(false)}
      >
        <div style={{ 
          width: '28px', 
          height: '28px', 
          borderRadius: '50%', 
          background: 'var(--primary-light)', 
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Mail size={15} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {subject || 'New Message'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            To: {toRecipients[0] || 'Draft'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ padding: '4px', height: '24px', width: '24px' }}
            onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }}
            title="Restore Window"
          >
            <Maximize2 size={12} />
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            style={{ padding: '4px', height: '24px', width: '24px' }}
            onClick={(e) => { e.stopPropagation(); handleCloseAttempt(); }}
            title="Close"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCOPED STYLES: FULL OUTLOOK RESPONSIVE COMPOSE FOR MOBILE & DESKTOP */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SCOPED STYLES: FULL OUTLOOK RESPONSIVE COMPOSE FOR MOBILE & DESKTOP */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <style>{`
        .outlook-composer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(2px);
          z-index: 1050;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          box-sizing: border-box;
        }

        .outlook-composer-dialog {
          background: #ffffff;
          width: 100%;
          max-width: 820px;
          height: auto;
          max-height: 90vh;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          position: relative;
        }

        .outlook-composer-dialog.is-maximized {
          max-width: 100vw !important;
          width: 100vw !important;
          height: 100vh !important;
          max-height: 100vh !important;
          border-radius: 0 !important;
        }

        /* ── Header Bar ── */
        .outlook-composer-header {
          padding: 10px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          gap: 8px;
        }

        /* ── Fields Section (From, To, CC, Subject) ── */
        .outlook-composer-fields {
          background: #fafafa;
          border-bottom: 1px solid #e5e5e5;
          padding: 8px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-shrink: 0;
        }

        .outlook-field-row {
          display: flex;
          align-items: center;
          min-height: 32px;
          font-size: 12px;
        }

        .outlook-field-label {
          width: 65px;
          min-width: 65px;
          color: #64748b;
          font-weight: 600;
        }

        .outlook-field-input-box {
          flex: 1;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 3px 8px;
          min-height: 32px;
          min-width: 0;
        }

        .outlook-recipient-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--primary-light);
          color: var(--primary);
          border: 1px solid rgba(122, 31, 61, 0.20);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11.5px;
          font-weight: 500;
          max-width: 100%;
        }

        .outlook-recipient-badge.cc-badge {
          background: var(--status-neutral-bg);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
        }

        .outlook-recipient-badge-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 200px;
        }

        .outlook-recipient-badge-remove {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          color: inherit;
        }

        .outlook-composer-body-area {
          flex: 1;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          min-height: 180px;
        }

        .outlook-attachments-section {
          padding: 12px 20px;
          background: var(--bg-surface-subtle);
          border-top: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .outlook-attachments-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 8px;
        }

        /* ── Bottom Toolbar ── */
        .outlook-composer-bottom-bar {
          padding: 10px 18px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          flex-shrink: 0;
        }

        /* ── Mobile Layout (< 769px) ── */
        @media (max-width: 768px) {
          .outlook-composer-backdrop {
            padding: 0 !important;
            background: #ffffff !important;
            align-items: stretch !important;
            justify-content: stretch !important;
          }

          .outlook-composer-dialog {
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100% !important;
            height: 100dvh !important;
            max-height: 100% !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }

          .outlook-composer-header {
            background: #0078D4 !important;
            color: #ffffff !important;
            padding: max(8px, env(safe-area-inset-top)) 10px 8px !important;
            min-height: calc(48px + env(safe-area-inset-top)) !important;
            box-sizing: border-box !important;
            border-bottom: 1px solid #005a9e !important;
          }

          .outlook-header-title {
            color: #ffffff !important;
            font-size: 13.5px !important;
            font-weight: 700 !important;
            margin: 0 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }

          .desktop-window-controls {
            display: none !important;
          }

          .outlook-composer-fields {
            padding: 8px 12px !important;
            gap: 6px !important;
            background: #f8fafc !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          .outlook-field-label {
            width: 48px !important;
            min-width: 48px !important;
            font-size: 11.5px !important;
            color: #475569 !important;
            font-weight: 700 !important;
          }

          .outlook-field-input-box {
            padding: 3px 6px !important;
            min-height: 32px !important;
            border-radius: 6px !important;
          }

          .outlook-field-input-box input {
            min-width: 70px !important;
            font-size: 14px !important;
            height: 26px !important;
          }

          .outlook-recipient-badge-text {
            max-width: min(155px, 44vw) !important;
          }

          .outlook-recipient-badge-remove {
            padding: 3px !important;
          }

          .outlook-subject-input {
            font-size: 14px !important;
            height: 34px !important;
            border-radius: 6px !important;
            padding: 0 8px !important;
          }

          .outlook-composer-body-area {
            padding: 12px 14px !important;
          }

          .outlook-body-textarea {
            font-size: 14px !important; /* Prevents auto-zoom on iOS */
            min-height: 140px !important;
          }

          .outlook-attachments-section {
            padding: 10px 12px !important;
          }

          .outlook-attachments-grid {
            grid-template-columns: 1fr !important;
            gap: 6px !important;
          }

          .outlook-att-btn {
            height: 28px !important;
            width: 28px !important;
            padding: 5px !important;
          }

          .outlook-attach-menu-dropdown {
            max-width: calc(100vw - 24px) !important;
            width: 280px !important;
          }

          .outlook-preview-wrapper {
            padding: 10px 12px !important;
          }

          .outlook-preview-card {
            padding: 14px 12px !important;
          }

          .outlook-composer-bottom-bar {
            padding: 8px 12px !important;
            padding-bottom: max(12px, env(safe-area-inset-bottom)) !important;
            gap: 8px !important;
            background: #ffffff !important;
            border-top: 1px solid #e2e8f0 !important;
          }

          .bottom-left-group {
            width: 100% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            gap: 8px !important;
          }

          .bottom-left-group .template-wrapper {
            flex: 1 !important;
            min-width: 0 !important;
          }

          .bottom-right-group {
            display: flex !important;
            gap: 6px !important;
            width: 100% !important;
            justify-content: space-between !important;
          }

          .bottom-right-group button {
            flex: 1 !important;
            justify-content: center !important;
            padding: 8px 6px !important;
            font-size: 12px !important;
            height: 38px !important;
            min-height: 38px !important;
            border-radius: 6px !important;
          }

          .bottom-right-group .btn-send-main {
            flex: 1.4 !important;
          }

          .outlook-minimized-dock {
            left: 12px !important;
            right: 12px !important;
            max-width: none !important;
            bottom: 12px !important;
          }
        }
      `}</style>

      <div 
        className="outlook-composer-backdrop" 
        onClick={handleCloseAttempt}
      >
        <div 
          className={`outlook-composer-dialog ${isMaximized ? 'is-maximized' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Outlook-Style Window Header */}
          <div className="outlook-composer-header">
            {/* Mobile Back / Close Button */}
            <button
              type="button"
              className="mobile-only-flex"
              onClick={handleCloseAttempt}
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Cancel / Close"
            >
              <ArrowLeft size={18} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
              <div 
                className="desktop-only-flex"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '4px', 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary)', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Mail size={14} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h3 className="outlook-header-title">
                  {documentData?.id ? (
                    <>
                      <span className="desktop-only-inline">{`Email ${documentType === 'invoice' ? 'Tax Invoice' : 'Quotation'} — ${documentData.id}`}</span>
                      <span className="mobile-only-inline">{`${documentType === 'invoice' ? 'Invoice' : 'Quote'} ${documentData.id}`}</span>
                    </>
                  ) : 'New Message'}
                </h3>
                {documentData?.customer && (
                  <span className="desktop-only-inline" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({documentData.customer})
                  </span>
                )}
              </div>
            </div>

            {/* Mobile Header Quick Actions: Paperclip + Primary Send */}
            <div className="mobile-only-flex" style={{ alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                style={{
                  background: 'rgba(255,255,255,0.18)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ffffff',
                  width: '34px',
                  height: '34px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Attach Document"
              >
                <Paperclip size={16} />
              </button>

              <button
                type="button"
                onClick={handleSend}
                disabled={isSending}
                style={{
                  background: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#0078D4',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  height: '34px',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
                }}
                title="Send Email"
              >
                {isSending ? (
                  <div style={{ width: '12px', height: '12px', border: '2px solid #0078D4', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <>
                    <Send size={13} color="#0078D4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>

            {/* Desktop Window Controls */}
            <div className="desktop-window-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon" 
                style={{ padding: '4px 6px', height: '26px' }}
                onClick={() => setIsMinimized(true)}
                title="Minimize composer"
              >
                <Minus size={13} />
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon" 
                style={{ padding: '4px 6px', height: '26px' }}
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Restore window" : "Maximize window"}
              >
                {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon" 
                style={{ padding: '4px 6px', height: '26px' }}
                onClick={handleCloseAttempt}
                title="Close dialog"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Email Composer Body / Preview */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
            
            {/* View Mode: Normal Edit Mode */}
            {!isPreviewMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Header Fields (From, To, CC, Subject) */}
                <div className="outlook-composer-fields">
                  {/* From Row */}
                  <div className="outlook-field-row">
                    <span className="outlook-field-label">From:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {fromAddress}
                      </span>
                      <span className="desktop-only-inline" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        (General Precision Spindles Sales Desk)
                      </span>
                    </div>
                  </div>

                  {/* To Row */}
                  <div className="outlook-field-row" style={{ alignItems: 'flex-start' }}>
                    <span className="outlook-field-label" style={{ paddingTop: '6px' }}>To:</span>
                    <div className="outlook-field-input-box">
                      {toRecipients.map((email, idx) => (
                        <span key={idx} className="outlook-recipient-badge">
                          <span className="outlook-recipient-badge-text">{email}</span>
                          <button 
                            type="button" 
                            className="outlook-recipient-badge-remove"
                            onClick={() => handleRemoveToRecipient(idx)}
                            title="Remove recipient"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <input 
                        type="email" 
                        placeholder={toRecipients.length === 0 ? "Recipient email (Enter)..." : "Add email..."}
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                        onKeyDown={handleAddToRecipient}
                        onBlur={handleAddToRecipient}
                        style={{ 
                          border: 'none', 
                          outline: 'none', 
                          flex: 1, 
                          minWidth: '70px', 
                          height: '24px',
                          background: 'transparent' 
                        }}
                      />

                      {!isCcVisible && (
                        <button 
                          type="button" 
                          onClick={() => setIsCcVisible(true)}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            color: 'var(--primary)', 
                            fontSize: '11px', 
                            fontWeight: 600, 
                            cursor: 'pointer',
                            padding: '2px 4px',
                            marginLeft: 'auto'
                          }}
                        >
                          + CC
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CC Row (Expandable) */}
                  {isCcVisible && (
                    <div className="outlook-field-row" style={{ alignItems: 'flex-start' }}>
                      <span className="outlook-field-label" style={{ paddingTop: '6px' }}>CC:</span>
                      <div className="outlook-field-input-box">
                        {ccRecipients.map((email, idx) => (
                          <span key={idx} className="outlook-recipient-badge cc-badge">
                            <span className="outlook-recipient-badge-text">{email}</span>
                            <button 
                              type="button" 
                              className="outlook-recipient-badge-remove"
                              onClick={() => handleRemoveCcRecipient(idx)}
                              title="Remove CC"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <input 
                          type="email" 
                          placeholder={ccRecipients.length === 0 ? "Add CC recipients..." : "Add another CC..."}
                          value={ccInput}
                          onChange={(e) => setCcInput(e.target.value)}
                          onKeyDown={handleAddCcRecipient}
                          onBlur={handleAddCcRecipient}
                          style={{ 
                            border: 'none', 
                            outline: 'none', 
                            flex: 1, 
                            minWidth: '70px', 
                            height: '24px',
                            background: 'transparent' 
                          }}
                        />

                        {ccRecipients.length === 0 && (
                          <button 
                            type="button" 
                            onClick={() => setIsCcVisible(false)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: 'var(--text-muted)', 
                              fontSize: '11px', 
                              cursor: 'pointer',
                              padding: '2px 4px',
                              marginLeft: 'auto'
                            }}
                          >
                            Hide CC
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subject Row */}
                  <div className="outlook-field-row">
                    <span className="outlook-field-label">Subject:</span>
                    <input 
                      type="text" 
                      className="outlook-subject-input"
                      value={subject}
                      placeholder="Subject line..."
                      onChange={(e) => { setSubject(e.target.value); setHasUserEdited(true); }}
                      style={{ 
                        flex: 1, 
                        height: '32px', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '0 10px', 
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        background: '#ffffff',
                        outline: 'none',
                        minWidth: 0,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Email Body Editor */}
                <div className="outlook-composer-body-area">
                  <textarea 
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setHasUserEdited(true); }}
                    rows={12}
                    placeholder="Compose your professional message here..."
                    className="outlook-body-textarea"
                    style={{ 
                      width: '100%', 
                      flex: 1,
                      minHeight: '160px', 
                      border: 'none', 
                      outline: 'none', 
                      fontSize: '13px', 
                      lineHeight: 1.6, 
                      color: 'var(--text-main)', 
                      fontFamily: 'Inter, system-ui, sans-serif',
                      resize: 'none',
                      background: 'transparent'
                    }}
                  />
                </div>

                {/* Visual Attachment Area */}
                <div className="outlook-attachments-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <span className="desktop-only-inline">Attached Business Documents ({attachments.length})</span>
                      <span className="mobile-only-inline">Attachments ({attachments.length})</span>
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        style={{ height: '28px', fontSize: '11px', padding: '0 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                      >
                        <Plus size={12} />
                        <span className="desktop-only-inline">Add Attachment</span>
                        <span className="mobile-only-inline">Add</span>
                      </button>

                      {/* Dropdown Menu for Attachment presets */}
                      {showAttachMenu && (
                        <div 
                          className="outlook-attach-menu-dropdown"
                          style={{ 
                            position: 'absolute', 
                            right: 0, 
                            bottom: '100%', 
                            marginBottom: '6px', 
                            background: '#ffffff', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)', 
                            boxShadow: 'var(--shadow-lg)', 
                            width: '260px', 
                            zIndex: 30,
                            padding: '6px 0'
                          }}
                        >
                          <div style={{ padding: '6px 12px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Attach Document
                          </div>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip size={13} color="var(--primary)" />
                            <span>Upload file from computer...</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('GPS_HSK_Spindle_Datasheet.pdf', 'Technical Specification', '420 KB')}
                          >
                            <FileText size={13} color="var(--primary)" />
                            <span>GPS Spindle Technical Datasheet</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('Spindle_Runout_Vibration_QC.pdf', 'Calibration Certificate', '310 KB')}
                          >
                            <FileText size={13} color="var(--primary)" />
                            <span>Dynamic Runout & Vibration QC Report</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('GPS_Warranty_and_Installation_Guide.pdf', 'Terms & Guide', '180 KB')}
                          >
                            <FileText size={13} color="var(--primary)" />
                            <span>GPS Warranty & Commissioning Guide</span>
                          </button>
                        </div>
                      )}
                      
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        onChange={handleCustomFileUpload} 
                      />
                    </div>
                  </div>

                  {/* Attachment Cards Grid */}
                  <div className="outlook-attachments-grid">
                    {attachments.map((att) => (
                      <div 
                        key={att.id}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          background: '#ffffff', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-sm)', 
                          padding: '8px 12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                          minWidth: 0,
                          gap: '8px'
                        }}
                      >
                        <div 
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, cursor: 'pointer', flex: 1 }}
                          onClick={() => handlePreviewAttachment(att)}
                          title="Click to preview attached document"
                        >
                          <div style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '4px', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FileText size={16} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {att.name}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {att.type} • {att.size}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon outlook-att-btn" 
                            style={{ padding: '5px', height: '28px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handlePreviewAttachment(att)}
                            title="Preview Document"
                          >
                            <Eye size={12} color="var(--primary)" />
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon outlook-att-btn" 
                            style={{ padding: '5px', height: '28px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            onClick={() => handleRemoveAttachment(att.id)}
                            title="Remove attachment"
                          >
                            <X size={12} color="#dc2626" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode: Recipient Preview */
              <div className="outlook-preview-wrapper" style={{ flex: 1, padding: '16px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="outlook-preview-card" style={{ 
                  background: '#ffffff', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}>
                  {/* Recipient Message Meta Header */}
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', wordBreak: 'break-word' }}>
                      {subject || '(No Subject)'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', flexWrap: 'wrap', gap: '4px' }}>
                      <div style={{ wordBreak: 'break-word' }}>
                        <span style={{ color: 'var(--text-muted)' }}>From: </span>
                        <strong>General Precision Spindles</strong> &lt;{fromAddress}&gt;
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                      <span style={{ color: 'var(--text-muted)' }}>To: </span>
                      <strong>{toRecipients.join(', ') || 'No recipients'}</strong>
                    </div>
                    {ccRecipients.length > 0 && (
                      <div style={{ fontSize: '12px', wordBreak: 'break-word' }}>
                        <span style={{ color: 'var(--text-muted)' }}>CC: </span>
                        <span>{ccRecipients.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#1e293b', whiteSpace: 'pre-line', padding: '4px 0', wordBreak: 'break-word' }}>
                    {body}
                  </div>

                  {/* Preview Attachments */}
                  {attachments.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Attached Files ({attachments.length})
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {attachments.map(att => (
                          <div 
                            key={att.id}
                            onClick={() => handlePreviewAttachment(att)}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px', 
                              padding: '6px 12px', 
                              border: '1px solid var(--border-color)', 
                              borderRadius: 'var(--radius-sm)', 
                              background: '#F8FAF9',
                              cursor: 'pointer',
                              maxWidth: '100%',
                              overflow: 'hidden'
                            }}
                          >
                            <FileText size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>({att.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Persistent Send Error Banner — stays visible until next attempt */}
          {sendError && (
            <div style={{
              margin: '0 12px 8px',
              padding: '10px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              flexShrink: 0
            }}>
              <AlertCircle size={16} color="#DC2626" style={{ marginTop: '1px', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#991B1B', marginBottom: '2px' }}>
                  Email delivery failed
                </div>
                <div style={{ fontSize: '11.5px', color: '#7F1D1D', lineHeight: 1.5, wordBreak: 'break-word' }}>
                  {sendError}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSendError(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#991B1B', flexShrink: 0 }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="outlook-composer-bottom-bar">
            {/* Left Controls: Template & Attachment quick link */}
            <div className="bottom-left-group">
              <div className="template-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="desktop-only-inline" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Template:</span>
                <CustomSelect 
                  size="sm"
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  style={{ minWidth: '130px', width: '100%' }}
                  options={EMAIL_TEMPLATES.map(tmpl => ({ value: tmpl.id, label: tmpl.label }))}
                />
              </div>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm desktop-only-flex"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                title="Attach files"
              >
                <Paperclip size={13} />
                <span>Attach</span>
              </button>
            </div>

            {/* Right Controls: Preview, Draft, Discard, Send */}
            <div className="bottom-right-group">
              <button 
                type="button" 
                className={`btn btn-sm ${isPreviewMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? "Back to editor" : "Preview recipient view"}
              >
                <Eye size={13} />
                <span>{isPreviewMode ? "Edit" : "Preview"}</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm desktop-only-flex"
                onClick={handleSaveDraft}
                title="Save this email as draft"
              >
                <FileText size={13} />
                <span>Draft</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleCloseAttempt}
                title="Discard draft"
                style={{ color: '#dc2626' }}
              >
                <Trash2 size={13} />
                <span>Discard</span>
              </button>

              <button 
                type="button" 
                className="btn btn-primary btn-send-main"
                onClick={handleSend}
                disabled={isSending}
                style={{ background: '#0078D4', borderColor: '#0078D4', minWidth: '95px', fontWeight: 600, gap: '6px' }}
              >
                {isSending ? (
                  <>
                    <div style={{ width: '12px', height: '12px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discard Confirmation Dialog */}
      {showDiscardDialog && (
        <div className="modal-backdrop" style={{ zIndex: 1060, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-dialog" style={{ maxWidth: '420px', width: '100%', padding: '0', overflow: 'hidden', borderRadius: '12px' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FDECEC', color: '#C2413B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertCircle size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Discard this message?</h3>
            </div>
            <div style={{ padding: '16px 18px', fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your unsent message changes will be lost. Would you like to save this email as a draft instead?
            </div>
            <div style={{ padding: '12px 16px', background: 'var(--bg-surface-subtle)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ flex: '1 1 auto', minHeight: '34px', justifyContent: 'center' }}
                onClick={() => setShowDiscardDialog(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                style={{ flex: '1 1 auto', minHeight: '34px', justifyContent: 'center' }}
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                style={{ backgroundColor: '#C2413B', borderColor: '#C2413B', flex: '1 1 auto', minHeight: '34px', justifyContent: 'center' }}
                onClick={handleConfirmDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document PDF Preview Modal */}
      {previewDocModalOpen && (
        <DocumentPreviewModal 
          isOpen={previewDocModalOpen}
          onClose={() => setPreviewDocModalOpen(false)}
          doc={selectedPreviewDoc || documentData}
          onNotify={onNotify}
        />
      )}
    </>
  );
}
