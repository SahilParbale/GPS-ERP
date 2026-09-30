import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { supplierService } from '../services/database/supplierService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportVendorDirectoryPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { Search, Truck, Star, Phone, FileText, Plus, Download, RefreshCw, AlertCircle } from 'lucide-react';

export default function SuppliersScreen({ onNotify }) {
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await supplierService.getSuppliers();
    if (res.error) {
      setError(res.error);
      setIsLoading(false);
      return;
    }

    const data = res.data || [];
    const normalized = data.map(s => {
      const cats = Array.isArray(s.categories_supplied)
        ? s.categories_supplied.join(', ')
        : (s.categories_supplied || 'Precision Bearings & Components');

      const loc = `${s.city || ''}, ${s.country || 'India'}`.replace(/^,\s*|,\s*$/g, '') || s.address || 'Pune, India';
      const ratingStr = typeof s.rating === 'number' ? `★ ${s.rating.toFixed(2)} Quality` : (s.rating || 'Grade A (99% Quality)');

      return {
        id: s.supplier_code || s.id,
        dbId: s.id,
        name: s.name,
        category: cats,
        location: loc,
        leadTime: s.lead_time_days ? `${s.lead_time_days} days` : '14 Days',
        rating: ratingStr,
        activePo: 'PO-2026-084',
        contact: s.contact_person ? `${s.contact_person} (${s.phone || '+91 20 6608 4000'})` : (s.email || 'orders@vendor.com')
      };
    });

    setSuppliers(normalized);
    setIsLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q);
  });

  if (isLoading) {
    return <TablePageSkeleton columns={['110px', '180px', '160px', '130px', '90px', '100px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Precision Vendors & Component Suppliers" 
          subtitle="Tier-1 procurement sources for ceramic hybrid bearings, alloy steels, and optical encoders"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve live vendor records from PostgreSQL database.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadSuppliers}>
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Precision Vendors & Component Suppliers" 
        subtitle="Tier-1 procurement sources for ceramic hybrid bearings, alloy steels, and optical encoders"
        badge={`${suppliers.length} Approved Vendors`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'APPROVED VENDOR & SUPPLIER DIRECTORY',
              id: `VEND-DIR-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Approved Vendors', value: suppliers.length },
                { label: 'Avg Lead Time', value: '14 Days' },
                { label: 'Quality Rating', value: '99.4% Pass' }
              ],
              headers: ['#', 'Vendor Code', 'Supplier Name', 'Supplied Categories', 'Location', 'Lead Time', 'Rating'],
              rows: suppliers.map((s, idx) => [
                idx + 1,
                s.id || `VEND-${idx + 1}`,
                s.name,
                s.category,
                s.location,
                s.leadTime,
                s.rating
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Export Vendors (PDF)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => onNotify('Vendor Onboarding Modal opened')}
        >
          <Plus size={14} />
          <span>Add Approved Vendor</span>
        </button>
      </PageHeader>

      <div className="content-body">

      <div className="section-card">
        <div className="filter-bar">
          <div className="search-input-wrap">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search Vendor, Category, Region..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Component Category</th>
                <th>Location / Facility</th>
                <th>Avg Lead Time</th>
                <th>Vendor Quality Rating</th>
                <th>Active Purchase Order</th>
                <th>Key Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map((supp) => (
                <tr key={supp.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{supp.name}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{supp.id}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{supp.category}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{supp.location}</td>
                  <td className="mono" style={{ fontSize: '12px' }}>{supp.leadTime}</td>
                  <td>
                    <span style={{ 
                      padding: '3px 8px', 
                      borderRadius: '4px', 
                      fontSize: '11px', 
                      fontWeight: 600,
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0'
                    }}>
                      {supp.rating}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                    {supp.activePo}
                  </td>
                  <td style={{ fontSize: '12px' }}>{supp.contact}</td>
                  <td>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm"
                      onClick={() => onNotify(`Purchase orders opened for ${supp.name}`)}
                    >
                      View POs
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No vendor records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendor Directory Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
      </div>
    </div>
  );
}
