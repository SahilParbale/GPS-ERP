import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Minus, Maximize2, Minimize2, Send, Paperclip, 
  Eye, FileText, Trash2, Plus, Check, AlertCircle, 
  RotateCcw, Download, Sparkles, User, Mail
} from 'lucide-react';
import { 
  DEFAULT_SENDER, 
  EMAIL_TEMPLATES, 
  generateEmailContent, 
  sendEmail 
} from '../../services/emailService';
import DocumentPreviewModal from './DocumentPreviewModal';

export default function OutlookEmailComposer({
  isOpen,
  onClose,
  documentData,
  documentType = 'quotation', // 'quotation' | 'invoice'
  onSent,
  onSaveDraft,
  onNotify
}) {
  if (!isOpen && !isMinimizedState) return null;

  // Track whether minimized
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
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

    try {
      const docId = documentData?.id || documentData?.estimateNo || 'DOC-2026';
      const result = await sendEmail({
        from: fromAddress,
        to: finalRecipients,
        cc: ccRecipients,
        subject,
        body,
        attachments,
        documentId: docId,
        documentType: documentType === 'invoice' ? 'Tax Invoice' : 'Quotation',
        customer: documentData?.customer || 'Customer Organization',
        sentBy: 'Rahul Patil'
      });

      setIsSending(false);
      
      if (onNotify) {
        onNotify(`Email sent successfully: ${docId} was sent to ${finalRecipients[0]}`);
      }

      if (onSent) {
        onSent(result.record);
      }

      onClose();
    } catch (err) {
      setIsSending(false);
      if (onNotify) {
        onNotify(err.message || 'Failed to send email', 'error');
      }
    }
  };

  // If Minimized, render floating dock button in bottom-right corner
  if (isMinimized) {
    return (
      <div 
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
      <div 
        className="modal-backdrop" 
        style={{ zIndex: 999, padding: isMaximized ? '0' : '16px' }}
        onClick={handleCloseAttempt}
      >
        <div 
          className="modal-dialog" 
          style={{ 
            maxWidth: isMaximized ? '100vw' : '820px', 
            width: isMaximized ? '100vw' : '100%', 
            height: isMaximized ? '100vh' : 'auto',
            maxHeight: isMaximized ? '100vh' : '90vh',
            borderRadius: isMaximized ? '0' : 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }} 
          onClick={(e) => e.stopPropagation()}
        >
          {/* Outlook-Style Window Header */}
          <div style={{ 
            padding: '10px 16px', 
            background: 'var(--bg-surface)', 
            borderBottom: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ 
                width: '24px', 
                height: '24px', 
                borderRadius: '4px', 
                background: 'var(--primary-light)', 
                color: 'var(--primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <Mail size={14} />
              </div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                {documentData?.id ? `Email ${documentType === 'invoice' ? 'Tax Invoice' : 'Quotation'} — ${documentData.id}` : 'New Message'}
              </h3>
              {documentData?.customer && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({documentData.customer})
                </span>
              )}
            </div>

            {/* Window Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            
            {/* View Mode: Normal Edit Mode */}
            {!isPreviewMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                {/* Header Fields (From, To, CC, Subject) */}
                <div style={{ 
                  background: 'var(--bg-surface-subtle)', 
                  borderBottom: '1px solid var(--border-color)', 
                  padding: '8px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* From Row */}
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '30px', fontSize: '12px' }}>
                    <span style={{ width: '65px', color: 'var(--text-muted)', fontWeight: 600 }}>From:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                        {fromAddress}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        (General Precision Spindles Sales Desk)
                      </span>
                    </div>
                  </div>

                  {/* To Row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '32px', fontSize: '12px' }}>
                    <span style={{ width: '65px', color: 'var(--text-muted)', fontWeight: 600, paddingTop: '6px' }}>To:</span>
                    <div style={{ 
                      flex: 1, 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      alignItems: 'center', 
                      gap: '6px', 
                      background: '#ffffff', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-sm)', 
                      padding: '3px 8px',
                      minHeight: '32px'
                    }}>
                      {toRecipients.map((email, idx) => (
                        <span 
                          key={idx} 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '5px', 
                            background: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            border: '1px solid rgba(15, 118, 110, 0.25)', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '11.5px',
                            fontWeight: 500
                          }}
                        >
                          <span>{email}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveToRecipient(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--primary)' }}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}

                      <input 
                        type="email" 
                        placeholder={toRecipients.length === 0 ? "Enter recipient email and press Enter..." : "Add another email..."}
                        value={toInput}
                        onChange={(e) => setToInput(e.target.value)}
                        onKeyDown={handleAddToRecipient}
                        onBlur={handleAddToRecipient}
                        style={{ 
                          border: 'none', 
                          outline: 'none', 
                          fontSize: '12px', 
                          flex: 1, 
                          minWidth: '160px', 
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
                            padding: '2px 4px'
                          }}
                        >
                          + Add CC
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CC Row (Expandable) */}
                  {isCcVisible && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', minHeight: '32px', fontSize: '12px' }}>
                      <span style={{ width: '65px', color: 'var(--text-muted)', fontWeight: 600, paddingTop: '6px' }}>CC:</span>
                      <div style={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        alignItems: 'center', 
                        gap: '6px', 
                        background: '#ffffff', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '3px 8px',
                        minHeight: '32px'
                      }}>
                        {ccRecipients.map((email, idx) => (
                          <span 
                            key={idx} 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '5px', 
                              background: '#F1F5F9', 
                              color: '#334155', 
                              border: '1px solid #cbd5e1', 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11.5px',
                              fontWeight: 500
                            }}
                          >
                            <span>{email}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCcRecipient(idx)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#64748b' }}
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}

                        <input 
                          type="email" 
                          placeholder={ccRecipients.length === 0 ? "Add CC recipients (press Enter)..." : "Add another CC..."}
                          value={ccInput}
                          onChange={(e) => setCcInput(e.target.value)}
                          onKeyDown={handleAddCcRecipient}
                          onBlur={handleAddCcRecipient}
                          style={{ 
                            border: 'none', 
                            outline: 'none', 
                            fontSize: '12px', 
                            flex: 1, 
                            minWidth: '160px', 
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
                              padding: '2px 4px'
                            }}
                          >
                            Hide CC
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Subject Row */}
                  <div style={{ display: 'flex', alignItems: 'center', minHeight: '32px', fontSize: '12px' }}>
                    <span style={{ width: '65px', color: 'var(--text-muted)', fontWeight: 600 }}>Subject:</span>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => { setSubject(e.target.value); setHasUserEdited(true); }}
                      style={{ 
                        flex: 1, 
                        height: '32px', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: 'var(--radius-sm)', 
                        padding: '0 10px', 
                        fontSize: '12.5px',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Email Body Editor */}
                <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
                  <textarea 
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setHasUserEdited(true); }}
                    rows={12}
                    placeholder="Compose your professional message here..."
                    style={{ 
                      width: '100%', 
                      flex: 1,
                      minHeight: '220px', 
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
                <div style={{ 
                  padding: '12px 20px', 
                  background: 'var(--bg-surface-subtle)', 
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Attached Business Documents ({attachments.length})
                    </span>
                    <div style={{ position: 'relative' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        style={{ height: '26px', fontSize: '11px', padding: '0 8px' }}
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                      >
                        <Plus size={12} />
                        <span>Add Attachment</span>
                      </button>

                      {/* Dropdown Menu for Attachment presets */}
                      {showAttachMenu && (
                        <div style={{ 
                          position: 'absolute', 
                          right: 0, 
                          bottom: '100%', 
                          marginBottom: '6px', 
                          background: '#ffffff', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 'var(--radius-sm)', 
                          boxShadow: 'var(--shadow-md)', 
                          width: '260px', 
                          zIndex: 10,
                          padding: '6px 0'
                        }}>
                          <div style={{ padding: '6px 12px', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            Attach Document
                          </div>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip size={13} color="var(--primary)" />
                            <span>Upload file from computer...</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('GPS_HSK_Spindle_Datasheet.pdf', 'Technical Specification', '420 KB')}
                          >
                            <FileText size={13} color="#0F766E" />
                            <span>GPS Spindle Technical Datasheet</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('Spindle_Runout_Vibration_QC.pdf', 'Calibration Certificate', '310 KB')}
                          >
                            <FileText size={13} color="#0F766E" />
                            <span>Dynamic Runout & Vibration QC Report</span>
                          </button>
                          <button 
                            type="button" 
                            style={{ width: '100%', padding: '6px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => handleAddSimulatedAttachment('GPS_Warranty_and_Installation_Guide.pdf', 'Terms & Guide', '180 KB')}
                          >
                            <FileText size={13} color="#0F766E" />
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '8px' }}>
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
                          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
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
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {att.name}
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                              {att.type} • {att.size}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', height: '24px', width: '24px' }}
                            onClick={() => handlePreviewAttachment(att)}
                            title="Preview Document"
                          >
                            <Eye size={12} color="var(--primary)" />
                          </button>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-icon" 
                            style={{ padding: '4px', height: '24px', width: '24px' }}
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
              <div style={{ flex: 1, padding: '24px 28px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                  background: '#ffffff', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '20px 24px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Recipient Message Meta Header */}
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {subject || '(No Subject)'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>From: </span>
                        <strong>General Precision Spindles</strong> &lt;{fromAddress}&gt;
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-muted)' }}>To: </span>
                      <strong>{toRecipients.join(', ') || 'No recipients'}</strong>
                    </div>
                    {ccRecipients.length > 0 && (
                      <div style={{ fontSize: '12px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>CC: </span>
                        <span>{ccRecipients.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div style={{ fontSize: '13px', lineHeight: 1.6, color: '#1e293b', whiteSpace: 'pre-line', padding: '8px 0' }}>
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
                              cursor: 'pointer'
                            }}
                          >
                            <FileText size={14} color="var(--primary)" />
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{att.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({att.size})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Bottom Toolbar */}
          <div style={{ 
            padding: '10px 18px', 
            background: 'var(--bg-surface)', 
            borderTop: '1px solid var(--border-color)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
            flexShrink: 0
          }}>
            {/* Left Controls: Template & Attachment quick link */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Template:</span>
                <select 
                  className="form-control" 
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  style={{ height: '28px', fontSize: '11.5px', padding: '0 8px' }}
                >
                  {EMAIL_TEMPLATES.map(tmpl => (
                    <option key={tmpl.id} value={tmpl.id}>{tmpl.label}</option>
                  ))}
                </select>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                title="Attach files"
              >
                <Paperclip size={13} />
                <span>Attach</span>
              </button>
            </div>

            {/* Right Controls: Preview, Draft, Discard, Send */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                type="button" 
                className={`btn btn-sm ${isPreviewMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                title={isPreviewMode ? "Back to editor" : "Preview recipient view"}
              >
                <Eye size={13} />
                <span>{isPreviewMode ? "Back to Edit" : "Preview Email"}</span>
              </button>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={handleSaveDraft}
                title="Save this email as draft"
              >
                <FileText size={13} />
                <span>Save Draft</span>
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
                className="btn btn-primary"
                onClick={handleSend}
                disabled={isSending}
                style={{ minWidth: '100px', fontWeight: 600, gap: '6px' }}
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
        <div className="modal-backdrop" style={{ zIndex: 1002 }}>
          <div className="modal-dialog" style={{ maxWidth: '420px', padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FDECEC', color: '#C2413B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={18} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Discard this message?</h3>
            </div>
            <div style={{ padding: '16px 20px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Your unsent message changes will be lost. Would you like to save this email as a draft instead?
            </div>
            <div style={{ padding: '12px 20px', background: 'var(--bg-surface-subtle)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => setShowDiscardDialog(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={handleSaveDraft}
              >
                Save as Draft
              </button>
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                style={{ backgroundColor: '#C2413B', borderColor: '#C2413B' }}
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
