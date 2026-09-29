import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, RefreshCw, FileText } from 'lucide-react';
import StatusBadge from './StatusBadge';

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  onSwitchType,
  type = 'cancel', // 'cancel' | 'delete'
  title,
  subtitle,
  poNumber,
  supplier,
  totalAmount,
  status,
  itemsCount,
  warningMessage,
  confirmButtonText,
  cancelButtonText = 'Keep Order',
  isLoading = false
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const isDelete = type === 'delete';
  const defaultTitle = isDelete ? 'Permanently Delete Purchase Order' : 'Cancel Purchase Order';
  const defaultSubtitle = isDelete 
    ? 'Are you sure you want to permanently delete this purchase order? This action cannot be reversed.'
    : 'Are you sure you want to cancel this purchase order? The requisition will be marked as cancelled in stores.';
  const defaultWarning = isDelete
    ? 'Purging this record will completely remove all item lines, tax calculations, and vendor dispatch links from the active register.'
    : 'Cancelling this order stops vendor fulfillment and voids pending Inward GRN quality checks, but retains the record in the procurement audit log.';
  const defaultConfirmText = isDelete ? 'Permanently Delete' : 'Confirm & Cancel PO';

  const activeTitle = title || defaultTitle;
  const activeSubtitle = subtitle || defaultSubtitle;
  const activeWarning = warningMessage || defaultWarning;
  const activeConfirmText = confirmButtonText || defaultConfirmText;

  return (
    <div 
      className="modal-backdrop" 
      onClick={() => { if (!isLoading) onClose(); }}
      style={{
        zIndex: 1100,
        alignItems: 'flex-start',
        paddingTop: '65px',
        paddingBottom: '24px',
        backgroundColor: 'rgba(43, 32, 36, 0.55)',
        backdropFilter: 'blur(3px)'
      }}
    >
      <div 
        className="modal-dialog" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)',
          borderTop: isDelete ? '3px solid #B42318' : '3px solid var(--primary)',
          backgroundColor: '#ffffff',
          fontFamily: 'var(--font-sans)',
          animation: 'modalSlideDown 0.16s ease-out'
        }}
      >
        {/* Modal Header */}
        <div 
          className="modal-header" 
          style={{ 
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: isDelete ? 'var(--status-danger-bg)' : 'var(--primary-light)',
              border: `1px solid ${isDelete ? 'var(--status-danger-border)' : 'var(--primary-subtle)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              {isDelete ? (
                <Trash2 size={14} color="var(--status-danger-text)" />
              ) : (
                <AlertTriangle size={14} color="var(--primary)" />
              )}
            </div>
            <div>
              <h3 
                className="modal-title" 
                style={{ 
                  margin: 0, 
                  fontSize: '14px', 
                  fontWeight: 600, 
                  color: 'var(--text-main)' 
                }}
              >
                {activeTitle}
              </h3>
            </div>
          </div>

          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close dialog"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body */}
        <div 
          className="modal-body" 
          style={{ 
            padding: '16px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            backgroundColor: '#ffffff'
          }}
        >
          <p style={{ 
            margin: 0, 
            fontSize: '12.5px', 
            color: 'var(--text-secondary)',
            lineHeight: 1.45 
          }}>
            {activeSubtitle}
          </p>

          {/* Target Order Dossier Card */}
          <div style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-color)',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="var(--primary)" />
                <span className="mono" style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--primary)' }}>
                  {poNumber || 'PO-RECORD'}
                </span>
              </div>
              {status && <StatusBadge status={status} />}
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1.2fr 1fr', 
              gap: '8px', 
              paddingTop: '8px', 
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '12px' 
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Supplier / OEM:</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{supplier || '—'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px' }}>Total Amount:</span>
                <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                  {totalAmount || '—'}
                </span>
              </div>
            </div>

            {itemsCount !== undefined && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-subtle)', paddingTop: '6px' }}>
                Order contains <strong style={{ color: 'var(--text-main)' }}>{itemsCount}</strong> ordered item line{itemsCount === 1 ? '' : 's'}.
              </div>
            )}
          </div>

          {/* Consequence Warning Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '10px 12px',
            backgroundColor: isDelete ? 'var(--status-danger-bg)' : '#FFF5DD',
            border: `1px solid ${isDelete ? 'var(--status-danger-border)' : '#FDE68A'}`,
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            color: isDelete ? 'var(--status-danger-text)' : '#9A6700',
            lineHeight: 1.4
          }}>
            <ShieldAlert size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>{isDelete ? 'Data Purge Notice:' : 'Procurement Notice:'} </strong>
              <span>{activeWarning}</span>
            </div>
          </div>

          {onSwitchType && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              padding: '0 2px' 
            }}>
              <span>{isDelete ? 'Want to keep order history for audit?' : 'Need to completely purge this PO from database?'}</span>
              <button
                type="button"
                onClick={() => onSwitchType(isDelete ? 'cancel' : 'delete')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isDelete ? 'var(--primary)' : 'var(--status-danger-text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '11px',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                {isDelete ? 'Switch to Cancel Order' : 'Switch to Permanent Delete'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div 
          className="modal-footer" 
          style={{ 
            padding: '10px 16px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelButtonText}
          </button>

          <button
            type="button"
            className="btn"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              backgroundColor: isDelete ? 'var(--status-danger-text)' : 'var(--primary)',
              borderColor: isDelete ? '#912018' : 'var(--primary-dark)',
              color: '#ffffff',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = isDelete ? '#912018' : 'var(--primary-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = isDelete ? 'var(--status-danger-text)' : 'var(--primary)';
              }
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw size={13} className="spin-icon" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                {isDelete ? <Trash2 size={13} /> : <X size={13} />}
                <span>{activeConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
