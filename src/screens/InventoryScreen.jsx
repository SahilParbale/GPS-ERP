import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { INVENTORY_ITEMS } from '../data/mockData';
import { 
  Search, Filter, Plus, AlertTriangle, Boxes, 
  ArrowDownLeft, ArrowUpRight, Download, PackageCheck 
} from 'lucide-react';

export default function InventoryScreen({ onNotify }) {
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedItemForPo, setSelectedItemForPo] = useState(null);

  const filteredItems = INVENTORY_ITEMS.filter((item) => {
    const matchesCat = categoryFilter === 'all' || item.category.toLowerCase().includes(categoryFilter.toLowerCase());
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || 
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.location.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const lowStockItems = INVENTORY_ITEMS.filter(item => 
    item.status.includes('Low') || item.status.includes('Critical')
  );

  const handleOpenPo = (item) => {
    setSelectedItemForPo(item);
    setIsPoModalOpen(true);
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Materials, Spares & Tooling Inventory" 
        subtitle="Precision alloy steels, ceramic bearings, stators, and encoder stock controls"
        badge={`${INVENTORY_ITEMS.length} Catalogued Items`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify('Inventory valuation report generated (PDF)')}
        >
          <Download size={14} />
          <span>Stock Valuation</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => handleOpenPo(INVENTORY_ITEMS[1])}
        >
          <Plus size={14} />
          <span>Raise Purchase PO</span>
        </button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Total Stock Value</span>
            <div className="metric-icon-wrap"><Boxes size={16} /></div>
          </div>
          <div className="metric-value">₹1.48 Cr</div>
          <div className="metric-footer" style={{ color: '#059669' }}>420 Active Line Items</div>
        </div>

        <div className="metric-card metric-alert">
          <div className="metric-top">
            <span className="metric-label">Low Stock Alerts</span>
            <div className="metric-icon-wrap" style={{ color: '#dc2626' }}><AlertTriangle size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>{lowStockItems.length}</div>
          <div className="metric-footer" style={{ color: '#b45309' }}>Immediate PO Required</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Material Inwarded</span>
            <div className="metric-icon-wrap"><ArrowDownLeft size={16} /></div>
          </div>
          <div className="metric-value">₹8.4L</div>
          <div className="metric-footer">Received This Week</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Reserved for Assembly</span>
            <div className="metric-icon-wrap"><PackageCheck size={16} /></div>
          </div>
          <div className="metric-value">18 Sets</div>
          <div className="metric-footer">Allocated to Active WOs</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'stock', label: 'All Inventory Items', count: INVENTORY_ITEMS.length },
          { id: 'low_stock', label: 'Critical Low-Stock Alerts', count: lowStockItems.length },
          { id: 'transactions', label: 'Material Movement Log (Inward/Outward)' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Stock List */}
      {(activeTab === 'stock' || activeTab === 'low_stock') && (
        <div className="section-card">
          <div className="filter-bar">
            <div className="filter-group">
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Search Part Name, SKU, Bin..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select 
                className="form-control"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Material Categories</option>
                <option value="alloy">Raw Alloy Steel</option>
                <option value="bearings">Precision Bearings</option>
                <option value="clamping">Tool Clamping</option>
                <option value="motor">Motor Components</option>
                <option value="electronics">Electronics & Sensors</option>
                <option value="seals">Seals & Gaskets</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing <strong>{(activeTab === 'low_stock' ? lowStockItems : filteredItems).length}</strong> records
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU Code</th>
                  <th>Material / Component Name</th>
                  <th>Category</th>
                  <th>Available Qty</th>
                  <th>Reserved Qty</th>
                  <th>Min Reorder Level</th>
                  <th>Warehouse Location</th>
                  <th>Primary Supplier</th>
                  <th>Stock Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(activeTab === 'low_stock' ? lowStockItems : filteredItems).map((item) => (
                  <tr key={item.id} style={{ background: item.status.includes('Critical') ? '#fef2f2' : 'transparent' }}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {item.sku}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.unitCost}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{item.category}</td>
                    <td className="mono" style={{ fontWeight: 700, fontSize: '13px', color: item.availableQty <= item.minStock ? '#dc2626' : 'var(--text-main)' }}>
                      {item.availableQty} {item.unit}
                    </td>
                    <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                      {item.reservedQty} {item.unit}
                    </td>
                    <td className="mono">{item.minStock} {item.unit}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.location}</td>
                    <td style={{ fontSize: '12px' }}>{item.supplier}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <button 
                        type="button" 
                        className={`btn btn-sm ${item.availableQty <= item.minStock ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleOpenPo(item)}
                      >
                        Raise PO
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Material Movement Transactions */}
      {activeTab === 'transactions' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Recent Inventory Transactions & Store Issues</div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Tx Type</th>
                  <th>SKU & Description</th>
                  <th>Quantity</th>
                  <th>Department / Bay</th>
                  <th>Authorized By</th>
                  <th>Ref Document</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { time: "Today, 08:30", type: "Store Issue", sku: "BRG-HC7008", name: "FAG Ceramic Hybrid Bearings", qty: "3 Pairs", bay: "Bay 3 (Cleanroom Assembly)", user: "Vikram Shinde", ref: "WO-2026-104" },
                  { time: "Yesterday, 16:15", type: "Inward GRN", sku: "MAT-18CR-80", name: "18CrNiMo7-6 Round Bar Ø80mm", qty: "12 Meters", bay: "Raw Stores Rack A-04", user: "Stores In-Charge", ref: "PO-2026-085" },
                  { time: "Yesterday, 11:00", type: "Store Issue", sku: "DRW-OTT-A63", name: "OTT-Jakob HSK Drawbar Collet", qty: "1 Set", bay: "Bay 3 (Assembly)", user: "Suresh Sawant", ref: "WO-2026-103" },
                  { time: "24-Feb, 14:20", type: "Store Issue", sku: "SEAL-VT-120", name: "Viton Rotary O-Ring Kit Ø120x3", qty: "4 Packs", bay: "Bay 2 (Grinding)", user: "D. Shinde", ref: "WO-2026-106" },
                ].map((tx, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontSize: '12px' }}>{tx.time}</td>
                    <td>
                      <span className={`status-badge ${tx.type.includes('Inward') ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '11px' }}>
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{tx.name}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.sku}</div>
                    </td>
                    <td className="mono" style={{ fontWeight: 600 }}>{tx.qty}</td>
                    <td style={{ fontSize: '12px' }}>{tx.bay}</td>
                    <td style={{ fontSize: '12px' }}>{tx.user}</td>
                    <td className="mono" style={{ color: 'var(--primary)', fontWeight: 500 }}>{tx.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Raise PO Modal */}
      <Modal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        title="Raise Precision Procurement Purchase Order (PO)"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsPoModalOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setIsPoModalOpen(false);
              onNotify(`Purchase Order issued to ${selectedItemForPo?.supplier || 'Supplier'}`);
            }}>Approve & Transmit PO</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Material / SKU</label>
            <input type="text" className="form-control" defaultValue={selectedItemForPo?.name || "FAG Ceramic Bearings"} readOnly />
          </div>
          <div className="form-group">
            <label className="form-label">Supplier Partner</label>
            <input type="text" className="form-control" defaultValue={selectedItemForPo?.supplier || "Schaeffler India Ltd"} />
          </div>
          <div className="form-group">
            <label className="form-label">Order Quantity ({selectedItemForPo?.unit || 'Units'})</label>
            <input type="number" className="form-control mono" defaultValue="20" />
          </div>
          <div className="form-group">
            <label className="form-label">Target Receiving Date</label>
            <input type="date" className="form-control mono" defaultValue="2026-03-15" />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Special Precision Inspection Instructions</label>
            <input type="text" className="form-control" defaultValue="Manufacturer 3.1 Inspection Certificate required with micron radial runout data." />
          </div>
        </div>
      </Modal>
    </div>
  );
}
