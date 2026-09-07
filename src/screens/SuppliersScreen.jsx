import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { SUPPLIERS } from '../data/mockData';
import { Search, Truck, Star, Phone, FileText, Plus, Download } from 'lucide-react';

export default function SuppliersScreen({ onNotify }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSuppliers = SUPPLIERS.filter((s) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      s.name.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q);
  });

  return (
    <div className="content-area">
      <PageHeader 
        title="Precision Vendors & Component Suppliers" 
        subtitle="Tier-1 procurement sources for ceramic hybrid bearings, alloy steels, and optical encoders"
        badge={`${SUPPLIERS.length} Approved Vendors`}
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => onNotify('Vendor Onboarding Modal opened')}
        >
          <Plus size={14} />
          <span>Add Approved Vendor</span>
        </button>
      </PageHeader>

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
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
