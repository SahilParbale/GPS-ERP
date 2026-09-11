import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import EmailActivityTable from '../components/email/EmailActivityTable';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import { Mail, Plus, RefreshCw, Send, AlertCircle, Inbox, Clock, CheckCircle } from 'lucide-react';
import { fetchEmailActivityLive } from '../services/emailService';

export default function EmailActivityScreen({ onNotify }) {
  const [emailList, setEmailList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDraft, setComposerDraft] = useState(null);

  // Load email activity logs from live Supabase
  const loadEmailLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchEmailActivityLive();
      if (res.error) {
        setError(res.error.message || 'Failed to retrieve email transmission logs');
        setEmailList([]);
      } else {
        setEmailList(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Error connecting to email activity service');
      setEmailList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmailLogs();
  }, []);

  const handleOpenDraftInComposer = (draftRecord) => {
    setComposerDraft({
      id: draftRecord.documentId,
      customer: draftRecord.customer,
      estimateNo: draftRecord.documentId
    });
    setIsComposerOpen(true);
  };

  const handleEmailSent = () => {
    loadEmailLogs();
    if (onNotify) onNotify('Email dispatched and activity record logged');
  };

  const handleSaveDraft = () => {
    loadEmailLogs();
    if (onNotify) onNotify('Draft saved in transmission register');
  };

  const sentCount = emailList.filter(e => e.status === 'Sent' || e.status === 'Delivered').length;
  const draftCount = emailList.filter(e => e.status === 'Draft' || e.status === 'Queued').length;
  const failedCount = emailList.filter(e => e.status === 'Failed').length;

  return (
    <div className="content-area">
      <PageHeader 
        title="Email Activity & Transmission Register" 
        subtitle="Audit logs for commercial proposals, GST tax invoices, purchase orders, and overhaul reports"
        badge={`${emailList.length} Dispatch Logs`}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={loadEmailLogs}
            disabled={isLoading}
            title="Refresh transmission records"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => {
              setComposerDraft(null);
              setIsComposerOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Compose Email</span>
          </button>
        </div>
      </PageHeader>

      {/* Metrics Summary Strip */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Delivered / Sent</span>
            <div className="metric-icon-wrap" style={{ color: '#059669' }}><CheckCircle size={16} /></div>
          </div>
          <div className="metric-value">{sentCount} Mails</div>
          <div className="metric-footer" style={{ color: '#059669' }}>Audited transmission log</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Queued & Drafts</span>
            <div className="metric-icon-wrap"><Clock size={16} /></div>
          </div>
          <div className="metric-value">{draftCount} Pending</div>
          <div className="metric-footer">Awaiting dispatch</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Delivery Failures</span>
            <div className="metric-icon-wrap" style={{ color: failedCount > 0 ? '#b91c1c' : '#64748b' }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="metric-value" style={{ color: failedCount > 0 ? '#b91c1c' : 'inherit' }}>
            {failedCount} Errors
          </div>
          <div className="metric-footer">Requires attention</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Outbox Dispatches</span>
            <div className="metric-icon-wrap"><Mail size={16} /></div>
          </div>
          <div className="metric-value">{emailList.length} Total</div>
          <div className="metric-footer">Supabase email_activity</div>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={loadEmailLogs}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Loading transmission logs from Supabase email_activity...</div>
        </div>
      )}

      {/* Live Email Activity Table */}
      {!isLoading && !error && (
        <EmailActivityTable 
          emailList={emailList}
          onOpenComposerForDraft={handleOpenDraftInComposer}
          onNotify={onNotify}
        />
      )}

      {/* Outlook Email Composer Modal */}
      <OutlookEmailComposer 
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        documentData={composerDraft}
        documentType={composerDraft?.documentType || 'quotation'}
        onSent={handleEmailSent}
        onSaveDraft={handleSaveDraft}
        onNotify={onNotify}
      />
    </div>
  );
}
