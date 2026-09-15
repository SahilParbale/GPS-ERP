import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { inventoryService } from '../services/database/inventoryService';
import { INVENTORY_ITEMS } from '../data/mockData';
import { 
  Search, Filter, Plus, AlertTriangle, Boxes, 
  ArrowDownLeft, ArrowUpRight, Download, PackageCheck, RefreshCw, AlertCircle 
} from 'lucide-react';

export default function InventoryScreen({ onNotify }) {
  const [items, setItems] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedItemForPo, setSelectedItemForPo] = useState(null);

  const loadInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, movRes] = await Promise.all([
        inventoryService.getInventoryItems().catch(err => ({ error: err })),
        inventoryService.getStockMovements().catch(err => ({ error: err }))
      ]);

      if (invRes?.error && (!invRes.data || invRes.data.length === 0)) {
        console.warn('[InventoryScreen] Notice fetching products:', invRes.error);
      }

      const activeList = invRes?.data && invRes.data.length > 0 ? invRes.data : INVENTORY_ITEMS;
      setItems(activeList);

      if (movRes?.data && movRes.data.length > 0) {
        setStockMovements(movRes.data);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setItems(INVENTORY_ITEMS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const filteredItems = items.filter((item) => {
    const itemCat = (item.category || '').toLowerCase();
    const filterCat = (categoryFilter || 'all').toLowerCase();
    const matchesCat = filterCat === 'all' || itemCat.includes(filterCat);
    const q = (searchQuery || '').toLowerCase().trim();
    const matchesSearch = !q || 
      (item.name || '').toLowerCase().includes(q) ||
      (item.sku || '').toLowerCase().includes(q) ||
      itemCat.includes(q) ||
      (item.location || '').toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const lowStockItems = items.filter(item => {
    const s = item.status || '';
    return s.includes('Low') || s.includes('Critical') || s.includes('Out');
  });

  const handleOpenPo = (item) => {
    setSelectedItemForPo(item || items[0] || INVENTORY_ITEMS[0] || null);
    setIsPoModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Materials, Spares & Tooling Inventory" 
          subtitle="Loading stock inventory from live database..."
          badge="Live Supabase"
        />
        <div className="section-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '12px', color: 'var(--primary)' }} />
          <div>Fetching live inventory products and warehouse stock balances...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Materials, Spares & Tooling Inventory" 
          subtitle="Precision alloy steels, ceramic bearings, stators, and encoder stock controls"
          badge="Database Notice"
        />
        <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
            {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Operation Notice'}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
            {error.message || 'Unable to retrieve live inventory records from PostgreSQL database.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={loadInventory}>
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
        title="Materials, Spares & Tooling Inventory" 
        subtitle="Precision alloy steels, ceramic bearings, stators, and encoder stock controls"
        badge={`${items.length} Catalogued Items`}
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
          onClick={() => handleOpenPo(items[0] || null)}
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
          { id: 'stock', label: 'All Inventory Items', count: items.length },
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
                  <tr key={item.id} style={{ background: (item.status || '').includes('Critical') ? '#fef2f2' : 'transparent' }}>
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
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No inventory movements recorded in PostgreSQL database.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((tx, idx) => (
                    <tr key={tx.id || idx}>
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
                  ))
                )}
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
