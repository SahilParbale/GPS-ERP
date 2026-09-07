import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import { QUOTATIONS } from '../data/mockData';
import { 
  Search, Plus, Eye, Printer, CheckCircle, FileText, 
  Send, DollarSign, ArrowRight, Download 
} from 'lucide-react';

export default function SalesScreen({ onNavigate, onNotify }) {
  const [quotations, setQuotations] = useState(QUOTATIONS);
  const [selectedQuote, setSelectedQuote] = useState(QUOTATIONS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isNewQuoteOpen, setIsNewQuoteOpen] = useState(false);

  const filteredQuotes = quotations.filter((q) => {
    const matchesStatus = statusFilter === 'all' || q.status.toLowerCase() === statusFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      q.id.toLowerCase().includes(query) ||
      q.customer.toLowerCase().includes(query) ||
      q.contactPerson.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  const handleApproveQuote = (quoteId) => {
    setQuotations(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'Approved' } : q));
    if (selectedQuote.id === quoteId) {
      setSelectedQuote(prev => ({ ...prev, status: 'Approved' }));
    }
    onNotify(`Quotation ${quoteId} marked as Approved. Ready for Work Order creation.`);
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Sales Enquiries, Quotations & Commercial Orders" 
        subtitle="Customer precision spindle proposals, GST calculations, and line items"
        badge={`${quotations.length} Active Proposals`}
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setIsNewQuoteOpen(true)}
        >
          <Plus size={14} />
          <span>New Quotation</span>
        </button>
      </PageHeader>

      <div className="grid-2col-sales">
        {/* Left Column: Quotations Directory Table */}
        <div className="section-card">
          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search Quote #, Customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select 
              className="form-control"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="approved">Approved</option>
              <option value="under review">Under Review</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quote #</th>
                  <th>Customer</th>
                  <th>Total (Incl GST)</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQuotes.map((q) => (
                  <tr 
                    key={q.id}
                    style={{ background: selectedQuote?.id === q.id ? '#f0f9ff' : 'transparent', cursor: 'pointer' }}
                    onClick={() => setSelectedQuote(q)}
                  >
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{q.id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.customer}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.contactPerson.split(' (')[0]}</div>
                    </td>
                    <td className="mono" style={{ fontWeight: 700 }}>₹{q.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{q.validUntil}</td>
                    <td><StatusBadge status={q.status} size="sm" /></td>
                    <td>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedQuote(q);
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Quotation Detail View */}
        {selectedQuote && (
          <div className="section-card">
            <div className="card-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '16px' }}>{selectedQuote.id}</span>
                  <StatusBadge status={selectedQuote.status} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Issued: {selectedQuote.date} • Valid until: {selectedQuote.validUntil}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNotify(`Printing Quotation ${selectedQuote.id}`)}
                >
                  <Printer size={13} />
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => handleApproveQuote(selectedQuote.id)}
                >
                  <CheckCircle size={13} />
                  <span>Approve</span>
                </button>
              </div>
            </div>

            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Customer Box */}
              <div style={{ padding: '12px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Client Account</div>
                <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedQuote.customer}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Attention: {selectedQuote.contactPerson}</div>
              </div>

              {/* Line Items Table */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>Commercial Line Items</div>
                <table className="data-table" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedQuote.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontSize: '12px' }}>{item.desc}</td>
                        <td className="mono" style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td className="mono" style={{ fontSize: '12px' }}>₹{item.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="mono" style={{ fontWeight: 600 }}>₹{item.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & GST */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>Subtotal Amount:</span>
                  <span className="mono">₹{selectedQuote.subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>GST (18% IGST / CGST+SGST):</span>
                  <span className="mono">₹{selectedQuote.gstAmount.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '6px', color: 'var(--primary)' }}>
                  <span>Grand Total Payable:</span>
                  <span className="mono">₹{selectedQuote.totalAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Commercial Terms */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Commercial Terms & Delivery</div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                  {selectedQuote.terms}
                </p>
              </div>

              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onNotify(`Quotation ${selectedQuote.id} converted into Production Work Order`)}
              >
                <span>Convert to Shop Floor Work Order</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Quotation Modal */}
      <Modal
        isOpen={isNewQuoteOpen}
        onClose={() => setIsNewQuoteOpen(false)}
        title="Create New Precision Spindle Quotation"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsNewQuoteOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setIsNewQuoteOpen(false);
              onNotify('Quotation Q-2026-092 drafted successfully');
            }}>Generate Quotation</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Customer Name</label>
            <input type="text" className="form-control" defaultValue="Godrej & Boyce Aerospace" />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Person</label>
            <input type="text" className="form-control" defaultValue="Anita Saxena" />
          </div>
          <div className="form-group">
            <label className="form-label">Spindle Configuration</label>
            <select className="form-control">
              <option>GPS-HF-60K High Frequency Spindle</option>
              <option>GPS-HSK-A63-24K Motorized Spindle</option>
              <option>GPS-BT40-15K Milling Spindle</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit Quantity</label>
            <input type="number" className="form-control mono" defaultValue="2" />
          </div>
          <div className="form-group">
            <label className="form-label">Base Unit Price (₹)</label>
            <input type="text" className="form-control mono" defaultValue="7,50,000" />
          </div>
          <div className="form-group">
            <label className="form-label">Validity (Days)</label>
            <input type="number" className="form-control mono" defaultValue="30" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
