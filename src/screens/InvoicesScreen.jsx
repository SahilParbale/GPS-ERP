import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { invoiceService } from '../services/database/invoiceService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportTaxInvoicePdf, exportGstr1ReportPdf } from '../utils/pdfGenerator';
import { 
  Search, FileText, DollarSign, Download, Printer, 
  CheckCircle, Plus, AlertCircle, Mail, Eye, RefreshCw 
} from 'lucide-react';
import OutlookEmailComposer from '../components/email/OutlookEmailComposer';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';

export default function InvoicesScreen({ onNotify }) {
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailComposerOpen, setEmailComposerOpen] = useState(false);
  const [invoiceForEmail, setInvoiceForEmail] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleOpenPreview = (inv) => {
    setPreviewDoc(inv);
    setIsPreviewOpen(true);
  };

  const loadInvoices = async () => {
    setIsLoading(true);
    setError(null);
    const res = await invoiceService.getInvoices();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }
    const data = res.data || [];
    setInvoices(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const handleOpenEmailForInvoice = (inv) => {
    setInvoiceForEmail(inv);
    setEmailComposerOpen(true);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'all' || inv.status.toLowerCase() === statusFilter.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      inv.id.toLowerCase().includes(q) ||
      inv.customer.toLowerCase().includes(q) ||
      inv.refOrder.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleRecordPayment = async (invId) => {
    const res = await invoiceService.recordInvoicePayment(invId);
    if (res.error) {
      onNotify(res.error.message || 'Failed to record payment in database.', 'error');
      return;
    }
    onNotify(`Payment receipt recorded for ${invId}. Outstanding cleared.`);
    await loadInvoices();
  };

  if (isLoading) {
    return <TablePageSkeleton hasMetrics={true} metricCount={3} columns={['100px', '160px', '120px', '90px', '90px', '90px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Commercial Invoices & Payment Tracking" 
          subtitle="Tax invoices, GST billing (HSN 8466), and accounts receivables"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve tax invoices from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadInvoices}>
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Commercial Invoices & Payment Tracking" 
        subtitle="Tax invoices, GST billing (HSN 8466), and accounts receivables"
        badge={`${invoices.length} Registered Invoices`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'GSTR-1 OUTWARD SUPPLIES & GST RETURN STATEMENT',
              id: `GSTR1-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Registered Invoices', value: invoices.length },
                { label: 'B2B Supplies', value: invoices.filter(i => i.status !== 'Draft').length },
                { label: 'GST Jurisdiction', value: '27-Maharashtra' }
              ],
              headers: ['#', 'Invoice Number', 'Recipient Customer', 'Customer GSTIN', 'Invoice Date', 'Total Value', 'Status'],
              rows: invoices.map((inv, idx) => [
                idx + 1,
                inv.id,
                inv.customer,
                inv.gstin || '27AABCG1492K1Z8',
                inv.date,
                inv.amount,
                inv.status
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>GSTR-1 Export (PDF)</span>
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Invoiced (Feb)</span>
            <div className="metric-icon-wrap"><DollarSign size={16} /></div>
          </div>
          <div className="metric-value">₹41.9L</div>
          <div className="metric-footer" style={{ color: '#059669' }}>Billed Across 12 Orders</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Payment Received</span>
            <div className="metric-icon-wrap"><CheckCircle size={16} /></div>
          </div>
          <div className="metric-value">₹23.5L</div>
          <div className="metric-footer">Direct Bank Wire (RTGS)</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Outstanding Receivables</span>
            <div className="metric-icon-wrap"><FileText size={16} /></div>
          </div>
          <div className="metric-value">₹18.4L</div>
          <div className="metric-footer">Across 3 Active Accounts</div>
        </div>

        <div className="metric-card metric-alert">
          <div className="metric-top">
            <span className="metric-label">Overdue &gt; 30 Days</span>
            <div className="metric-icon-wrap" style={{ color: '#dc2626' }}><AlertCircle size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>₹10.7L</div>
          <div className="metric-footer" style={{ color: '#b45309' }}>Follow-up Triggered</div>
        </div>
      </div>

      {/* Table */}
      <div className="section-card">
        <div className="filter-bar">
          <div className="filter-group">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search Invoice #, Customer, Order..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <CustomSelect 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: '190px' }}
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="pending">Payment Pending</option>
              <option value="overdue">Overdue</option>
            </CustomSelect>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer Name</th>
                <th>Order Ref</th>
                <th>Invoice Date</th>
                <th>Payment Due Date</th>
                <th>Total Invoiced</th>
                <th>Paid Amount</th>
                <th>Outstanding Balance</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td 
                    className="mono" 
                    style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                    onClick={() => handleOpenPreview(inv)}
                    title="Click to view Tax Invoice pop-up"
                  >
                    {inv.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{inv.customer}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{inv.refOrder}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{inv.date}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{inv.dueDate}</td>
                  <td className="mono" style={{ fontWeight: 600 }}>{inv.amount}</td>
                  <td className="mono" style={{ color: '#059669' }}>{inv.paidAmount}</td>
                  <td className="mono" style={{ fontWeight: 700, color: inv.balance !== '₹0' ? '#dc2626' : 'var(--text-muted)' }}>
                    {inv.balance}
                  </td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', gap: '4px' }}
                        onClick={() => handleOpenPreview(inv)}
                        title="View & Download Official Tax Invoice PDF"
                      >
                        <FileText size={12} />
                        <span>PDF</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', gap: '4px' }}
                        onClick={() => setSelectedInvoice(inv)}
                        title="View Tax Invoice"
                      >
                        <Eye size={12} />
                        <span>Details</span>
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary btn-sm"
                        style={{ padding: '4px 8px', gap: '4px' }}
                        onClick={() => handleOpenEmailForInvoice(inv)}
                        title="Send invoice via Outlook-style email"
                      >
                        <Mail size={12} />
                        <span>Email</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedInvoice(null)}
          title={`Tax Invoice: ${selectedInvoice.id}`}
          maxWidth="700px"
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedInvoice(null)}>Close</button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  handleOpenPreview(selectedInvoice);
                }}
              >
                <FileText size={13} />
                <span>PDF Preview</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  const currentInv = selectedInvoice;
                  setSelectedInvoice(null);
                  handleOpenEmailForInvoice(currentInv);
                }}
              >
                <Mail size={13} />
                <span>Email Invoice</span>
              </button>
              {selectedInvoice.balance !== '₹0' && (
                <button type="button" className="btn btn-primary" onClick={() => handleRecordPayment(selectedInvoice.id)}>
                  <CheckCircle size={13} />
                  <span>Record Payment Receipt</span>
                </button>
              )}
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Invoice Top Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '36px', borderRadius: '4px', background: '#ffffff', padding: '2px', border: '1px solid var(--border-color)' }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>General Precision Spindles Pvt. Ltd.</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Plot B-12, Nanded City Industrial Complex, Pune • GSTIN: 27AABCG1492K1Z8</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontWeight: 700, fontSize: '15px' }}>{selectedInvoice.id}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Date: {selectedInvoice.date}</div>
              </div>
            </div>

            {/* Bill To */}
            <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Billed To Client</div>
              <div style={{ fontWeight: 700, fontSize: '14px', marginTop: '2px' }}>{selectedInvoice.customer}</div>
              <div className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>GSTIN: {selectedInvoice.gstin}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Reference Order: {selectedInvoice.refOrder}</div>
            </div>

            {/* Amount Breakdown */}
            <div style={{ padding: '14px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Invoice Gross Value:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{selectedInvoice.amount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span>Amount Paid to Date:</span>
                <span className="mono" style={{ color: '#059669', fontWeight: 600 }}>{selectedInvoice.paidAmount}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderTop: '1px solid var(--border-color)', paddingTop: '8px', color: selectedInvoice.balance !== '₹0' ? '#dc2626' : '#059669' }}>
                <span>Remaining Balance Due:</span>
                <span className="mono">{selectedInvoice.balance}</span>
              </div>
            </div>

            {/* Banking Coordinates */}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '10px', background: '#ffffff', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
              Bank Wire: HDFC Bank Ltd • Chakan Industrial Branch • A/c: 50200049182391 • IFSC: HDFC0001824
            </div>
          </div>
        </Modal>
      )}

      {/* Outlook-Style Email Composer for Invoice */}
      {emailComposerOpen && (
        <OutlookEmailComposer 
          isOpen={emailComposerOpen}
          onClose={() => setEmailComposerOpen(false)}
          documentData={invoiceForEmail}
          documentType="invoice"
          onNotify={onNotify}
        />
      )}

      {/* Document Preview Pop-Up Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
