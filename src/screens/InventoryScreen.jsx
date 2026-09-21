import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { inventoryService } from '../services/database/inventoryService';
import { purchaseOrderService } from '../services/database/purchaseOrderService';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, AlertTriangle, Boxes, 
  Download, PackageCheck, RefreshCw, AlertCircle,
  ShieldAlert, ShoppingCart
} from 'lucide-react';

export default function InventoryScreen({ onNotify }) {
  const { role, profile } = useAuth();
  const userRole = (profile?.role?.code || profile?.role || role?.code || role || '').toUpperCase();
  const canRaisePO = ['ADMIN', 'MANAGEMENT', 'PURCHASE'].includes(userRole);

  const [items, setItems] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [valuationData, setValuationData] = useState({
    items: [],
    warehouses: [],
    summary: {
      totalInventoryValue: 0,
      totalInventoryValueFormatted: '₹0',
      totalUnits: 0,
      totalReservedUnits: 0,
      totalAvailableUnits: 0,
      totalStockLines: 0,
      totalValuedProducts: 0,
      totalWarehouses: 0
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Raise PO Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedItemForPo, setSelectedItemForPo] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [openPOsForSelected, setOpenPOsForSelected] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [poFormData, setPoFormData] = useState({
    productId: '',
    supplierId: '',
    quantity: 10,
    expectedDeliveryDate: '',
    status: 'Approved',
    notes: 'Manufacturer 3.1 Inspection Certificate required with micron radial runout data.'
  });

  const loadInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, movRes, valRes] = await Promise.all([
        inventoryService.getInventoryItems().catch(err => ({ error: err })),
        inventoryService.getStockMovements().catch(err => ({ error: err })),
        inventoryService.getInventoryValuation().catch(err => ({ error: err }))
      ]);

      if (invRes?.error) {
        setError(invRes.error);
        setIsLoading(false);
        return;
      }

      setItems(invRes?.data || []);

      if (movRes?.data) {
        setStockMovements(movRes.data);
      }

      if (valRes?.data) {
        setValuationData(valRes.data);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleExportValuationCsv = () => {
    const rows = valuationData.items || [];
    if (rows.length === 0) {
      if (onNotify) onNotify('No valuation records available to export.');
      return;
    }

    const headers = [
      'SKU / Part Number',
      'Material / Component Name',
      'Category',
      'Unit of Measure',
      'Unit Cost (INR)',
      'Quantity on Hand',
      'Quantity Reserved',
      'Quantity Available',
      'Warehouse Facility',
      'Bin Location',
      'Total Inventory Value (INR)',
      'Last Counted Date'
    ];

    const csvRows = [
      headers.join(','),
      ...rows.map(r => [
        `"${r.sku || r.partNumber}"`,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${r.category}"`,
        `"${r.unitOfMeasure}"`,
        r.unitCost,
        r.quantityOnHand,
        r.quantityReserved,
        r.quantityAvailable,
        `"${r.warehouseName} (${r.warehouseCode})"`,
        `"${r.binLocation}"`,
        r.lineValuation,
        `"${r.lastCountedDate}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `GPS_Spindle_Inventory_Valuation_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onNotify) {
      onNotify(`Exported valuation report for ${rows.length} stock items (${valuationData.summary?.totalInventoryValueFormatted}).`);
    }
  };

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

  const handleOpenPo = async (item) => {
    if (!item) return;
    setSelectedItemForPo(item);
    setSubmitError(null);

    const minStock = Number(item.minStock) || 10;
    const avail = Number(item.availableQty) || 0;
    const suggestedQty = Math.max(minStock * 2 - avail, minStock, 10);
    const defaultDelivery = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    // Pre-fill form
    setPoFormData({
      productId: item.id,
      supplierId: item.preferredSupplierId || item.supplierId || '',
      quantity: suggestedQty,
      expectedDeliveryDate: defaultDelivery,
      status: 'Approved',
      notes: 'Manufacturer 3.1 Inspection Certificate required with micron radial runout data.'
    });

    setIsPoModalOpen(true);

    // Fetch live suppliers and open POs in background
    try {
      const [suppRes, openPoRes] = await Promise.all([
        suppliers.length > 0 ? Promise.resolve({ data: suppliers }) : purchaseOrderService.getActiveSuppliers(),
        purchaseOrderService.getOpenPOForProduct(item.id)
      ]);

      const activeSupps = suppRes.data || [];
      if (suppliers.length === 0 && activeSupps.length > 0) {
        setSuppliers(activeSupps);
      }

      const preferredId = item.preferredSupplierId || item.supplierId;
      const matched = activeSupps.find(s => s.id === preferredId);
      const chosenSupplierId = matched ? matched.id : (activeSupps[0]?.id || '');

      setPoFormData(prev => ({
        ...prev,
        supplierId: prev.supplierId || chosenSupplierId
      }));

      setOpenPOsForSelected(openPoRes.data || []);
    } catch (err) {
      console.warn('[InventoryScreen] Failed loading PO modal metadata:', err);
    }
  };

  const handleSubmitPo = async (e) => {
    if (e) e.preventDefault();
    if (!canRaisePO) {
      setSubmitError(`Permission Denied: Your role (${userRole || 'VIEW_ONLY'}) cannot raise Purchase Orders. Restricted to Purchase, Management, or Administrator.`);
      return;
    }
    const qty = Number(poFormData.quantity);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Order quantity must be greater than zero.');
      return;
    }
    if (!poFormData.supplierId) {
      setSubmitError('Please select an active supplier partner.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const res = await purchaseOrderService.raisePurchaseOrderFromInventory({
      productId: poFormData.productId,
      supplierId: poFormData.supplierId,
      quantity: qty,
      expectedDeliveryDate: poFormData.expectedDeliveryDate,
      status: poFormData.status,
      notes: poFormData.notes
    });

    if (res.error) {
      setSubmitError(res.error.message || 'Failed to raise Purchase Order.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    setIsPoModalOpen(false);
    const poNum = res.data?.po_number || 'PO-2026';
    if (onNotify) {
      onNotify(`Purchase Order ${poNum} successfully created and transmitted for ${selectedItemForPo?.name}.`);
    }
    await loadInventory();
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
        badge={`${valuationData.summary?.totalValuedProducts || items.length} Catalogued Products`}
      >
        <button 
          type="button" 
          className={`btn ${activeTab === 'valuation' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            if (activeTab === 'valuation') {
              handleExportValuationCsv();
            } else {
              setActiveTab('valuation');
            }
          }}
          title="Switch to Inventory Valuation view or export statement"
        >
          <Download size={14} />
          <span>{activeTab === 'valuation' ? 'Export Valuation CSV' : 'Stock Valuation'}</span>
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
          <div className="metric-value">{valuationData.summary?.totalInventoryValueFormatted || '₹0'}</div>
          <div className="metric-footer" style={{ color: '#059669' }}>
            {valuationData.summary?.totalValuedProducts || 0} Valued Products &bull; {valuationData.summary?.totalStockLines || 0} Stock Lines
          </div>
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
            <span className="metric-label">Physical Stock on Hand</span>
            <div className="metric-icon-wrap"><Boxes size={16} /></div>
          </div>
          <div className="metric-value">{(valuationData.summary?.totalUnits || 0).toLocaleString('en-IN')} Units</div>
          <div className="metric-footer">Across {valuationData.summary?.totalWarehouses || 0} Storage Facilities</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Reserved for Assembly</span>
            <div className="metric-icon-wrap"><PackageCheck size={16} /></div>
          </div>
          <div className="metric-value">{(valuationData.summary?.totalReservedUnits || 0).toLocaleString('en-IN')} Units</div>
          <div className="metric-footer">Allocated to Active WOs</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'stock', label: 'All Inventory Items', count: items.length },
          { id: 'low_stock', label: 'Critical Low-Stock Alerts', count: lowStockItems.length },
          { id: 'valuation', label: 'Inventory Valuation', count: valuationData.items?.length || 0 },
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

              <CustomSelect 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="all">All Material Categories</option>
                <option value="alloy">Raw Alloy Steel</option>
                <option value="bearings">Precision Bearings</option>
                <option value="clamping">Tool Clamping</option>
                <option value="motor">Motor Components</option>
                <option value="electronics">Electronics & Sensors</option>
                <option value="seals">Seals & Gaskets</option>
              </CustomSelect>
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
                        title={!canRaisePO ? `Role ${userRole}: Procurement authorization required` : 'Raise Purchase Order'}
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

      {/* Tab: Inventory Valuation */}
      {activeTab === 'valuation' && (() => {
        const filteredValuationItems = (valuationData.items || []).filter((item) => {
          const itemCat = (item.category || '').toLowerCase();
          const filterCat = (categoryFilter || 'all').toLowerCase();
          const matchesCat = filterCat === 'all' || itemCat.includes(filterCat);
          const q = (searchQuery || '').toLowerCase().trim();
          const matchesSearch = !q || 
            (item.name || '').toLowerCase().includes(q) ||
            (item.sku || '').toLowerCase().includes(q) ||
            (item.partNumber || '').toLowerCase().includes(q) ||
            (item.warehouseName || '').toLowerCase().includes(q) ||
            (item.warehouseCode || '').toLowerCase().includes(q) ||
            (item.binLocation || '').toLowerCase().includes(q);
          return matchesCat && matchesSearch;
        });

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Facility-Wise Valuation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              {valuationData.warehouses?.map(wh => (
                <div key={wh.warehouseId} className="section-card" style={{ padding: '16px', margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px' }}>{wh.name}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{wh.code} &bull; {wh.warehouseType}</div>
                    </div>
                    <span className="status-badge badge-neutral" style={{ fontSize: '11px' }}>{wh.lineCount} Lines</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '14px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Units on Hand</div>
                      <div className="mono" style={{ fontWeight: 600, fontSize: '13px' }}>{wh.totalUnits.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Facility Valuation</div>
                      <div className="mono" style={{ fontWeight: 700, fontSize: '15px', color: 'var(--primary)' }}>{wh.totalValueFormatted}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Product Valuation Table */}
            <div className="section-card">
              <div className="filter-bar">
                <div className="filter-group">
                  <div className="search-input-wrap">
                    <Search size={14} className="search-icon" />
                    <input 
                      type="text" 
                      className="form-control"
                      placeholder="Search Part Name, SKU, Bin, Warehouse..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <CustomSelect 
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    style={{ width: '200px' }}
                  >
                    <option value="all">All Material Categories</option>
                    <option value="alloy">Raw Alloy Steel</option>
                    <option value="bearings">Precision Bearings</option>
                    <option value="clamping">Tool Clamping</option>
                    <option value="motor">Motor Components</option>
                    <option value="electronics">Electronics & Sensors</option>
                    <option value="seals">Seals & Gaskets</option>
                  </CustomSelect>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Showing <strong>{filteredValuationItems.length}</strong> of <strong>{valuationData.items?.length || 0}</strong> stock lines
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={handleExportValuationCsv}
                  >
                    <Download size={13} />
                    <span>Download Statement</span>
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU / Part Number</th>
                      <th>Material / Component Name</th>
                      <th>Category</th>
                      <th>Unit Cost</th>
                      <th>On-Hand Qty</th>
                      <th>Warehouse & Bin</th>
                      <th>Line Valuation</th>
                      <th>Last Counted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredValuationItems.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                          No valuation records match the active search / category filters.
                        </td>
                      </tr>
                    ) : (
                      filteredValuationItems.map((item) => (
                        <tr key={item.id}>
                          <td className="mono" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                            {item.sku || item.partNumber}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.partNumber}</div>
                          </td>
                          <td style={{ fontSize: '12px' }}>{item.category}</td>
                          <td className="mono" style={{ fontSize: '13px', fontWeight: 500 }}>
                            {item.unitCostFormatted}
                          </td>
                          <td className="mono" style={{ fontWeight: 700, fontSize: '13px' }}>
                            {item.quantityOnHand} {item.unitOfMeasure}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 500 }}>{item.warehouseName}</div>
                            <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.binLocation}</div>
                          </td>
                          <td className="mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                            {item.lineValuationFormatted}
                          </td>
                          <td className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.lastCountedDate}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredValuationItems.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan="4" style={{ textAlign: 'right', padding: '12px 16px' }}>
                          Total Inventory Valuation:
                        </td>
                        <td className="mono" style={{ fontSize: '13px' }}>
                          {filteredValuationItems.reduce((acc, i) => acc + i.quantityOnHand, 0).toLocaleString('en-IN')} Units
                        </td>
                        <td></td>
                        <td className="mono" style={{ fontSize: '15px', color: 'var(--primary)' }}>
                          ₹{filteredValuationItems.reduce((acc, i) => acc + i.lineValuation, 0).toLocaleString('en-IN')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Raise PO Modal */}
      {(() => {
        const currentUnitCost = selectedItemForPo?.unitCostNum || 0;
        const currentGstRate = typeof selectedItemForPo?.gstRate === 'number' ? selectedItemForPo.gstRate : 18;
        const currentQty = Number(poFormData.quantity) || 0;
        const currentSubtotal = Math.round(currentQty * currentUnitCost);
        const currentGstAmount = Math.round(currentSubtotal * (currentGstRate / 100));
        const currentTotalAmount = currentSubtotal + currentGstAmount;

        return (
          <Modal
            isOpen={isPoModalOpen}
            onClose={() => setIsPoModalOpen(false)}
            title="Raise Precision Procurement Purchase Order (PO)"
            footer={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {canRaisePO ? (
                    <span>Total: <strong className="mono" style={{ color: 'var(--primary)', fontSize: '15px' }}>₹{currentTotalAmount.toLocaleString('en-IN')}</strong></span>
                  ) : (
                    <span style={{ color: '#dc2626', fontSize: '12px' }}>Role {userRole || 'VIEW_ONLY'}: Authorization required</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setIsPoModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSubmitPo}
                    disabled={isSubmitting || !canRaisePO || !poFormData.supplierId || currentQty <= 0}
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw size={14} className="spin-icon" />
                        <span>Transmitting PO...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={14} />
                        <span>Approve & Transmit PO</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            }
          >
            {/* Role Authorization Notice if not permitted */}
            {!canRaisePO && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 14px', 
                backgroundColor: 'rgba(220, 38, 38, 0.08)', 
                border: '1px solid rgba(220, 38, 38, 0.25)', 
                borderRadius: '6px', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#dc2626'
              }}>
                <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>View-Only Mode:</strong> Your role ({userRole || 'VIEW_ONLY'}) cannot issue Purchase Orders. Restricted to Purchase, Management, or Administrator.
                </div>
              </div>
            )}

            {/* Submit error banner */}
            {submitError && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 14px', 
                backgroundColor: 'rgba(220, 38, 38, 0.08)', 
                border: '1px solid rgba(220, 38, 38, 0.25)', 
                borderRadius: '6px', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#dc2626'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <div>{submitError}</div>
              </div>
            )}

            {/* Existing Open PO Warning if any */}
            {openPOsForSelected.length > 0 && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px 14px', 
                backgroundColor: 'rgba(234, 179, 8, 0.1)', 
                border: '1px solid rgba(234, 179, 8, 0.3)', 
                borderRadius: '6px', 
                marginBottom: '16px',
                fontSize: '12px',
                color: '#b45309'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Open PO Notice:</strong> {openPOsForSelected.length} open PO already exists for this material ({openPOsForSelected[0].po_number} &bull; {openPOsForSelected[0].status}).
                </div>
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Material / SKU</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={`${selectedItemForPo?.name || ''} (${selectedItemForPo?.sku || ''})`} 
                  readOnly 
                  style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Supplier Partner <span style={{ color: '#dc2626' }}>*</span></label>
                <CustomSelect 
                  value={poFormData.supplierId} 
                  onChange={e => setPoFormData(prev => ({ ...prev, supplierId: e.target.value }))}
                  disabled={isSubmitting || !canRaisePO}
                  placeholder={suppliers.length === 0 ? "Loading active suppliers..." : "-- Select Supplier Partner --"}
                  searchable={true}
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: `${s.name} (${s.supplier_code || 'VENDOR'})`
                  }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Order Quantity ({selectedItemForPo?.unit || 'PCS'}) <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input 
                  type="number" 
                  className="form-control mono" 
                  min="1" 
                  step="1"
                  value={poFormData.quantity} 
                  onChange={e => setPoFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  disabled={isSubmitting || !canRaisePO}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Available: {selectedItemForPo?.availableQty ?? 0} &bull; Min Reorder: {selectedItemForPo?.minStock ?? 10}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Target Receiving Date <span style={{ color: '#dc2626' }}>*</span></label>
                <input 
                  type="date" 
                  className="form-control mono" 
                  value={poFormData.expectedDeliveryDate} 
                  onChange={e => setPoFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                  disabled={isSubmitting || !canRaisePO}
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Special Precision Inspection Instructions</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={poFormData.notes} 
                  onChange={e => setPoFormData(prev => ({ ...prev, notes: e.target.value }))}
                  disabled={isSubmitting || !canRaisePO}
                />
              </div>
            </div>

            {/* Live Financial Breakdown Card */}
            <div style={{ 
              marginTop: '16px', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px', 
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Unit Rate & Subtotal</div>
                <div className="mono" style={{ fontWeight: 600, fontSize: '13px' }}>
                  ₹{currentUnitCost.toLocaleString('en-IN')} &times; {currentQty} = ₹{currentSubtotal.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tax (GST {currentGstRate}%)</div>
                <div className="mono" style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ₹{currentGstAmount.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated PO Total</div>
                <div className="mono" style={{ fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
                  ₹{currentTotalAmount.toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
