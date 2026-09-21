import React, { useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import CustomSelect from '../common/CustomSelect';
import { Search, Mail, Eye, RefreshCw, Paperclip, FileText, Send, X, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function EmailActivityTable({
  emailList = [],
  onOpenComposerForDraft,
  onNotify
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedEmail, setSelectedEmail] = useState(null);

  const filteredEmails = emailList.filter(em => {
    const matchesStatus = statusFilter === 'all' || em.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      em.documentId?.toLowerCase().includes(q) ||
      em.recipient?.toLowerCase().includes(q) ||
      em.subject?.toLowerCase().includes(q) ||
      em.customer?.toLowerCase().includes(q) ||
      em.sentBy?.toLowerCase().includes(q);

    return matchesStatus && matchesSearch;
  });

  const getStatusBadgeType = (status) => {
    switch (status?.toLowerCase()) {
      case 'sent':
        return 'success';
      case 'draft':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="section-card">
      {/* Filter and Search Bar */}
      <div className="filter-bar" style={{ padding: '12px 20px' }}>
        <div className="filter-group" style={{ gap: '12px' }}>
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search by Document #, Recipient, Subject..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: '280px' }}
            />
          </div>

          <CustomSelect 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '160px' }}
            options={[
              { value: 'all', label: `All Statuses (${emailList.length})` },
              { value: 'sent', label: `Sent (${emailList.filter(e => e.status === 'Sent').length})` },
              { value: 'draft', label: `Drafts (${emailList.filter(e => e.status === 'Draft').length})` },
              { value: 'failed', label: `Failed Delivery (${emailList.filter(e => e.status === 'Failed').length})` }
            ]}
          />
        </div>

        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredEmails.length}</strong> of {emailList.length} dispatch logs
        </div>
      </div>

      {/* Activity Table */}
      <div className="table-responsive">
        <table className="data-table" style={{ minWidth: '1180px' }}>
          <thead>
            <tr>
              <th style={{ width: '135px' }}>Date & Time</th>
              <th style={{ width: '125px' }}>Document</th>
              <th style={{ width: '180px' }}>Primary Recipient (To)</th>
              <th style={{ width: '180px' }}>CC Recipients</th>
              <th style={{ minWidth: '220px' }}>Subject</th>
              <th style={{ width: '95px' }}>Status</th>
              <th style={{ width: '120px' }}>Sent By</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmails.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <Mail size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <div>No email dispatch activity matching criteria.</div>
                </td>
              </tr>
            ) : (
              filteredEmails.map((em) => {
                const ccList = Array.isArray(em.cc) ? em.cc : (em.cc ? [em.cc] : []);
                return (
                  <tr key={em.id}>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {em.date}
                    </td>
                    <td>
                      <span 
                        className="mono" 
                        style={{ 
                          fontWeight: 700, 
                          color: 'var(--primary)', 
                          fontSize: '12.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <FileText size={13} />
                        <span>{em.documentId}</span>
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>
                        {em.recipient}
                      </div>
                      {em.customer && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          {em.customer}
                        </div>
                      )}
                    </td>
                    <td>
                      {ccList.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {ccList.map((c, i) => (
                            <span 
                              key={i} 
                              style={{ 
                                fontSize: '10.5px', 
                                background: '#F1F5F9', 
                                color: '#475569', 
                                padding: '1px 6px', 
                                borderRadius: '4px',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>None</span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-main)' }}>
                        {em.subject}
                      </div>
                      {em.attachmentName && (
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Paperclip size={11} />
                          <span>{em.attachmentName}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={em.status} />
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {em.sentBy || 'Rahul Patil'}
                    </td>
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', gap: '4px' }}
                          onClick={() => setSelectedEmail(em)}
                          title="View complete email dispatch record"
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                        {em.status === 'Draft' && onOpenComposerForDraft && (
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', gap: '4px' }}
                            onClick={() => onOpenComposerForDraft(em)}
                            title="Continue editing draft in composer"
                          >
                            <Send size={12} />
                            <span>Resume</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Email Record Detail Modal */}
      {selectedEmail && (
        <div className="modal-backdrop" style={{ zIndex: 1005 }}>
          <div className="modal-dialog" style={{ maxWidth: '680px', padding: '0', overflow: 'hidden' }}>
            <div style={{ 
              padding: '14px 18px', 
              background: 'var(--bg-surface)', 
              borderBottom: '1px solid var(--border-color)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>
                  Email Dispatch Log — {selectedEmail.documentId}
                </h3>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-icon" 
                style={{ padding: '4px' }}
                onClick={() => setSelectedEmail(null)}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '75vh', overflowY: 'auto' }}>
              {/* Meta Grid */}
              <div style={{ 
                background: 'var(--bg-surface-subtle)', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--radius-sm)', 
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                fontSize: '12px'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Dispatched On: </span>
                  <strong>{selectedEmail.date}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Status: </span>
                  <StatusBadge status={selectedEmail.status} size="sm" />
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>From: </span>
                  <span className="mono">sales@gpsspindle.com</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Sent By: </span>
                  <strong>{selectedEmail.sentBy || 'Rahul Patil'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>To: </span>
                  <strong className="mono">{selectedEmail.recipient}</strong>
                </div>
                {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: 'var(--text-muted)' }}>CC: </span>
                    <span className="mono">{Array.isArray(selectedEmail.cc) ? selectedEmail.cc.join(', ') : selectedEmail.cc}</span>
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Subject: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{selectedEmail.subject}</strong>
                </div>
              </div>

              {/* Message Body */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Message Content
                </div>
                <div style={{ 
                  background: '#ffffff', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-sm)', 
                  padding: '16px', 
                  fontSize: '12.5px', 
                  lineHeight: 1.6, 
                  whiteSpace: 'pre-line',
                  color: '#1e293b'
                }}>
                  {selectedEmail.fullBody || selectedEmail.bodySnippet || 'No body recorded.'}
                </div>
              </div>

              {/* Attached Document info */}
              {selectedEmail.attachmentName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'var(--bg-surface-subtle)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                  <Paperclip size={15} color="var(--primary)" />
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Attached Document:</span>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{selectedEmail.attachmentName}</span>
                </div>
              )}
            </div>

            <div style={{ padding: '12px 18px', background: 'var(--bg-surface-subtle)', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelectedEmail(null)}>
                Close
              </button>
              {onNotify && (
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm" 
                  onClick={() => {
                    onNotify(`Transmission audit log exported for ${selectedEmail.documentId}`);
                  }}
                >
                  Export Audit Log
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
