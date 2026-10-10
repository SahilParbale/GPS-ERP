import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { inventoryService } from '../services/database/inventoryService';
import { supplierService } from '../services/database/supplierService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportInventoryValuationPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, AlertTriangle, Boxes, 
  Download, PackageCheck, RefreshCw, AlertCircle,
  Tag, Edit3, Trash2, ArrowUpRight, ArrowDownRight,
  Scale, CheckCircle2, ShieldCheck, MapPin, Building2
} from 'lucide-react';

const COMMON_MAKES = [
  'NSK',
  'FAG / Schaeffler',
  'SKF',
  'OTT-Jakob',
  'Heidenhain',
  'Sandvik Coromant',
  'Klüber Lubrication',
  'Kollmorgen / Siemens',
  'Bharat Special Steel',
  'Freudenberg / Merkel',
  'Schnorr / Mubea'
];

export default function InventoryScreen({ onNavigate, onNotify }) {
  const { role, profile } = useAuth();
  const userRole = (profile?.role?.code || profile?.role || role?.code || role || '').toUpperCase();

  const [items, setItems] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [suppliersList, setSuppliersList] = useState([]);
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
  const [makeFilter, setMakeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Add / Edit Material & Spare Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    sku: '',
    name: '',
    make: 'NSK',
    model: '',
    category: 'Precision Bearings',
    availableQty: 10,
    reservedQty: 0,
    minStock: 5,
    unit: 'Nos',
    location: 'Cleanroom Cabinet C-01',
    supplier: 'PREMIER INDUSTRIAL SOLUTIONS',
    unitCostNum: 58262,
    unitCost: '₹58,262/ea'
  });

  // Quick Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState(null);
  const [adjustFormData, setAdjustFormData] = useState({
    adjustmentType: 'inward', // 'inward' | 'issue' | 'set'
    quantity: 1,
    reason: 'Received inward shipment with Inspection 3.1 cert',
    user: 'Stores Officer'
  });

  // Delete Confirm Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    item: null
  });

  // Load Inventory data, stock movements, valuation, and suppliers
  const loadInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, movRes, valRes, suppRes] = await Promise.all([
        inventoryService.getInventoryItems().catch(err => ({ error: err })),
        inventoryService.getStockMovements().catch(err => ({ error: err })),
        inventoryService.getInventoryValuation().catch(err => ({ error: err })),
        supplierService.getSuppliers().catch(() => ({ data: [] }))
      ]);

      if (invRes?.error) {
        setError(invRes.error);
        setIsLoading(false);
        return;
      }

      const loadedItems = invRes?.data || [];
      setItems(loadedItems);

      if (movRes?.data) {
        setStockMovements(movRes.data);
      }

      if (suppRes?.data) {
        setSuppliersList(suppRes.data);
      }

      if (valRes?.data) {
        setValuationData(valRes.data);
      } else {
        // Fallback valuation computed directly from items
        const totalVal = loadedItems.reduce((sum, it) => sum + ((Number(it.availableQty) || 0) * (Number(it.unitCostNum) || 0)), 0);
        const totalUnits = loadedItems.reduce((sum, it) => sum + (Number(it.availableQty) || 0), 0);
        setValuationData({
          items: loadedItems.map(it => ({
            id: it.id,
            sku: it.sku,
            name: it.name,
            make: it.make,
            category: it.category,
            quantityOnHand: it.availableQty,
            unitOfMeasure: it.unit,
            warehouseName: it.location || 'Central Stores',
            binLocation: it.location || 'Stores',
            unitCost: it.unitCostNum,
            unitCostFormatted: it.unitCost,
            lineValuation: (Number(it.availableQty) || 0) * (Number(it.unitCostNum) || 0),
            lineValuationFormatted: `₹${((Number(it.availableQty) || 0) * (Number(it.unitCostNum) || 0)).toLocaleString('en-IN')}`,
            lastCountedDate: '2026-09-04'
          })),
          warehouses: [],
          summary: {
            totalInventoryValue: totalVal,
            totalInventoryValueFormatted: `₹${totalVal.toLocaleString('en-IN')}`,
            totalUnits: totalUnits,
            totalReservedUnits: loadedItems.reduce((sum, it) => sum + (Number(it.reservedQty) || 0), 0),
            totalAvailableUnits: totalUnits,
            totalStockLines: loadedItems.length,
            totalValuedProducts: loadedItems.length,
            totalWarehouses: 2
          }
        });
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

    const handleSync = (e) => {
      if (e?.detail?.entity === 'inventory' || e?.detail?.entity === 'suppliers') {
        loadInventory();
      }
    };
    window.addEventListener('gps_entities_updated', handleSync);
    return () => window.removeEventListener('gps_entities_updated', handleSync);
  }, []);

  // Compute item counts per Make
  const makeCounts = useMemo(() => {
    const counts = {};
    items.forEach(it => {
      const m = (it.make && it.make.trim()) || 'Generic Precision';
      counts[m] = (counts[m] || 0) + 1;
    });
    return counts;
  }, [items]);

  // Compute unique Makes dynamically from all catalogued items (present makes first)
  const uniqueMakes = useMemo(() => {
    const presentMakes = Object.keys(makeCounts).sort((a, b) => (makeCounts[b] || 0) - (makeCounts[a] || 0));
    const allSet = new Set(presentMakes);
    COMMON_MAKES.forEach(m => allSet.add(m));
    return Array.from(allSet);
  }, [makeCounts]);

  // Key KPI Metrics computed across items
  const metrics = useMemo(() => {
    const totalValuation = items.reduce((sum, it) => {
      const q = Number(it.availableQty) || 0;
      const c = Number(it.unitCostNum || (typeof it.unitCost === 'string' ? it.unitCost.replace(/[^0-9.]/g, '') : it.unitCost) || 0);
      return sum + (q * c);
    }, 0);

    const totalUnits = items.reduce((sum, it) => sum + (Number(it.availableQty) || 0), 0);
    const lowStockCount = items.filter(it => (Number(it.availableQty) || 0) <= (Number(it.minStock) || 0)).length;
    const activeMakes = new Set(items.map(it => it.make || 'Generic')).size;

    const formattedVal = totalValuation >= 100000 
      ? `₹${(totalValuation / 100000).toFixed(2)}L` 
      : `₹${totalValuation.toLocaleString('en-IN')}`;

    return {
      totalValuation: formattedVal,
      totalValuationRaw: totalValuation,
      totalUnits,
      lowStockCount,
      activeMakes
    };
  }, [items]);

  // Export Valuation PDF report
  const handleExportValuationCsv = () => {
    const stockList = (valuationData.items && valuationData.items.length > 0) ? valuationData.items : items;
    setPreviewDoc({
      type: 'Report',
      reportTitle: 'INVENTORY VALUATION & STOCK STATEMENT (BY MAKE)',
      id: `INV-VAL-${new Date().toISOString().split('T')[0]}`,
      metrics: [
        { label: 'Total Valuation', value: metrics.totalValuation },
        { label: 'Total SKUs', value: stockList.length },
        { label: 'Total Physical Units', value: `${metrics.totalUnits} Units` },
        { label: 'Low Stock Alerts', value: metrics.lowStockCount }
      ],
      headers: ['#', 'SKU / Part Code', 'Description', 'Make / Manufacturer', 'Bin Location', 'Available Qty', 'Unit Cost', 'Valuation'],
      rows: stockList.map((it, idx) => [
        idx + 1,
        it.sku || it.item_code || `SKU-${idx + 1}`,
        it.name || it.description,
        it.make || 'Generic Precision',
        it.location || it.warehouseName || it.warehouse || 'Central Stores',
        `${it.availableQty || it.quantityOnHand || 0} ${it.unit || it.unitOfMeasure || 'Nos'}`,
        `₹${Number(it.unitCostNum || it.unitCost || 0).toLocaleString('en-IN')}`,
        `₹${Number(it.lineValuation || ((it.availableQty || it.quantityOnHand || 0) * (it.unitCostNum || it.unitCost || 0))).toLocaleString('en-IN')}`
      ])
    });
    setIsPreviewOpen(true);
  };

  // Filter items by Search, Make, Category, and Status
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.sku && item.sku.toLowerCase().includes(q)) ||
        (item.make && item.make.toLowerCase().includes(q)) ||
        (item.model && item.model.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.location && item.location.toLowerCase().includes(q)) ||
        (item.supplier && item.supplier.toLowerCase().includes(q));

      const matchesMake = makeFilter === 'all' || 
        (item.make && item.make.toLowerCase() === makeFilter.toLowerCase());

      const matchesCat = categoryFilter === 'all' || 
        (item.category && item.category.toLowerCase().includes(categoryFilter.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'low_stock') {
        matchesStatus = (Number(item.availableQty) || 0) <= (Number(item.minStock) || 0);
      } else if (statusFilter === 'critical') {
        matchesStatus = (item.status || '').toLowerCase().includes('critical') || (Number(item.availableQty) || 0) <= 0;
      } else if (statusFilter === 'in_stock') {
        matchesStatus = (item.status || '').toLowerCase().includes('in stock');
      }

      return matchesSearch && matchesMake && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, makeFilter, categoryFilter, statusFilter]);

  const lowStockItems = useMemo(() => {
    return items.filter(item => (Number(item.availableQty) || 0) <= (Number(item.minStock) || 0));
  }, [items]);

  // Open Add Material Item Modal
  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setItemFormData({
      sku: '',
      name: '',
      make: 'NSK',
      model: '',
      category: 'Precision Bearings',
      availableQty: 10,
      reservedQty: 0,
      minStock: 5,
      unit: 'Nos',
      location: 'Cleanroom Cabinet C-01',
      supplier: suppliersList[0]?.name || 'PREMIER INDUSTRIAL SOLUTIONS',
      unitCostNum: 58262,
      unitCost: '₹58,262/ea'
    });
    setIsItemModalOpen(true);
  };

  // Open Edit Material Item Modal
  const handleOpenEditItem = (item) => {
    setEditingItemId(item.id);
    const costNum = Number(item.unitCostNum || (typeof item.unitCost === 'string' ? item.unitCost.replace(/[^0-9.]/g, '') : item.unitCost) || 0);
    setItemFormData({
      sku: item.sku || '',
      name: item.name || '',
      make: item.make || 'NSK',
      model: item.model || '',
      category: item.category || 'Precision Bearings',
      availableQty: Number(item.availableQty) || 0,
      reservedQty: Number(item.reservedQty) || 0,
      minStock: Number(item.minStock) || 5,
      unit: item.unit || 'Nos',
      location: item.location || 'Central Stores',
      supplier: item.supplier || 'PREMIER INDUSTRIAL SOLUTIONS',
      unitCostNum: costNum,
      unitCost: item.unitCost || `₹${costNum.toLocaleString('en-IN')}`
    });
    setIsItemModalOpen(true);
  };

  // Save Item (Add or Edit)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemFormData.name.trim()) {
      if (onNotify) onNotify('Item Name is required', 'warning');
      return;
    }
    if (!itemFormData.sku.trim()) {
      if (onNotify) onNotify('SKU / Part Code is required', 'warning');
      return;
    }

    try {
      const payload = {
        ...itemFormData,
        unitCost: `₹${Number(itemFormData.unitCostNum || 0).toLocaleString('en-IN')}`
      };

      if (editingItemId) {
        await inventoryService.updateInventoryItem(editingItemId, payload);
        if (onNotify) onNotify(`Material item "${payload.name}" updated successfully.`);
      } else {
        await inventoryService.createInventoryItem(payload);
        if (onNotify) onNotify(`Material item "${payload.name}" added to inventory.`);
      }

      setIsItemModalOpen(false);
      await loadInventory();
    } catch (err) {
      console.error('Error saving inventory item:', err);
      if (onNotify) onNotify('Failed to save material item', 'danger');
    }
  };

  // Open Quick Stock Adjustment Modal
  const handleOpenStockAdjust = (item) => {
    setSelectedItemForAdjust(item);
    setAdjustFormData({
      adjustmentType: 'inward',
      quantity: 1,
      reason: 'Standard stock inward receipt against inspection certificate',
      user: profile?.name || 'Stores Officer'
    });
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjustment
  const handleApplyStockAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedItemForAdjust) return;

    try {
      const res = await inventoryService.adjustInventoryStock(selectedItemForAdjust.id, {
        adjustmentType: adjustFormData.adjustmentType,
        quantity: Number(adjustFormData.quantity) || 0,
        reason: adjustFormData.reason,
        user: adjustFormData.user
      });

      if (res.error) {
        if (onNotify) onNotify(res.error.message, 'warning');
        return;
      }

      setIsAdjustModalOpen(false);
      const actionLabel = adjustFormData.adjustmentType === 'inward' 
        ? `Added ${adjustFormData.quantity} units to` 
        : (adjustFormData.adjustmentType === 'issue' ? `Issued ${adjustFormData.quantity} units of` : 'Audited stock of');
      
      if (onNotify) onNotify(`${actionLabel} ${selectedItemForAdjust.name}. Available: ${res.data.availableQty} ${selectedItemForAdjust.unit}`);
      await loadInventory();
    } catch (err) {
      console.error('Failed to adjust stock:', err);
      if (onNotify) onNotify('Failed to update stock quantity', 'danger');
    }
  };

  // Execute Delete Item
  const handleExecuteDeleteItem = async () => {
    if (!deleteConfirmModal.item) return;
    try {
      await inventoryService.deleteInventoryItem(deleteConfirmModal.item.id);
      if (onNotify) onNotify(`Item "${deleteConfirmModal.item.name}" deleted from registry.`, 'info');
      setDeleteConfirmModal({ isOpen: false, item: null });
      await loadInventory();
    } catch (err) {
      console.error('Failed deleting item:', err);
      if (onNotify) onNotify('Failed to delete item', 'danger');
    }
  };

  if (isLoading) {
    return <TablePageSkeleton columns={['140px', '200px', '120px', '130px', '90px', '90px', '120px', '100px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Materials, Spares & Tooling Inventory" 
          subtitle="Precision alloy steels, ceramic bearings, stators, and encoder stock controls"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              Database Operation Notice
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to retrieve live inventory records.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadInventory}>
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
        title="Materials, Spares & Tooling Inventory" 
        subtitle="Catalogued precision raw alloy steels, ceramic hybrid bearings, drawbars, and sensors classified by Make"
        badge={`${items.length} Catalogued Items`}
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
          <span>{activeTab === 'valuation' ? 'Export Valuation (PDF)' : 'Stock Valuation'}</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenAddItem}
          title="Add a new Material, Spare, or Tooling item with Make specification"
        >
          <Plus size={14} />
          <span>+ Add Material / Spare / Tooling</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* KPI Cards */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Stock Valuation</span>
              <div className="metric-icon-wrap"><Boxes size={16} /></div>
            </div>
            <div className="metric-value" style={{ color: 'var(--primary)' }}>{metrics.totalValuation}</div>
            <div className="metric-footer" style={{ color: '#176B3A' }}>
              {items.length} Products &bull; Across Stores
            </div>
          </div>

          <div className="metric-card metric-alert">
            <div className="metric-top">
              <span className="metric-label">Low Stock Alerts</span>
              <div className="metric-icon-wrap" style={{ color: '#dc2626' }}><AlertTriangle size={16} /></div>
            </div>
            <div className="metric-value" style={{ color: '#dc2626' }}>{metrics.lowStockCount}</div>
            <div className="metric-footer" style={{ color: '#b45309' }}>
              {onNavigate ? (
                <span 
                  onClick={() => onNavigate('purchase-orders')} 
                  style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                >
                  Order via Purchase Order Screen ↗
                </span>
              ) : 'Reorder Needed'}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Physical Stock on Hand</span>
              <div className="metric-icon-wrap"><PackageCheck size={16} /></div>
            </div>
            <div className="metric-value">{metrics.totalUnits.toLocaleString('en-IN')} Units</div>
            <div className="metric-footer">Available for Active Assemblies</div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Component Makes & Brands</span>
              <div className="metric-icon-wrap"><Tag size={16} /></div>
            </div>
            <div className="metric-value">{metrics.activeMakes} Qualified Makes</div>
            <div className="metric-footer" style={{ color: '#7A1F3D' }}>NSK, Schaeffler, SKF, OTT, Heidenhain...</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs 
          tabs={[
            { id: 'stock', label: 'All Inventory (By Make)', count: items.length },
            { id: 'low_stock', label: 'Critical Low-Stock Alerts', count: lowStockItems.length },
            { id: 'valuation', label: 'Inventory Valuation', count: valuationData.items?.length || items.length },
            { id: 'transactions', label: 'Material Movement Log (Inward/Outward)', count: stockMovements.length },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {/* Tab: Stock List */}
        {(activeTab === 'stock' || activeTab === 'low_stock') && (
          <div className="section-card">
            <div className="filter-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'nowrap' }}>
              <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'nowrap' }}>
                <div className="search-input-wrap" style={{ minWidth: '180px', maxWidth: '280px', flex: '1 1 220px' }}>
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="Search Make, Part Name, SKU..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', height: '32px', minWidth: 'unset' }}
                  />
                </div>

                {/* Make / Manufacturer Filter */}
                <CustomSelect 
                  size="sm"
                  triggerStyle={{ height: '32px' }}
                  value={makeFilter}
                  onChange={(e) => setMakeFilter(e.target.value)}
                  style={{ width: '170px', minWidth: '145px', flexShrink: 0 }}
                  options={[
                    { value: 'all', label: `All Makes (${uniqueMakes.length})` },
                    ...uniqueMakes.map(m => ({ value: m, label: `Make: ${m}` }))
                  ]}
                />

                {/* Category Filter */}
                <CustomSelect 
                  size="sm"
                  triggerStyle={{ height: '32px' }}
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: '170px', minWidth: '145px', flexShrink: 0 }}
                  options={[
                    { value: 'all', label: 'All Categories' },
                    { value: 'bearing', label: 'Precision Bearings' },
                    { value: 'steel', label: 'Raw Alloy Steel' },
                    { value: 'clamping', label: 'Tool Clamping' },
                    { value: 'motor', label: 'Motor Components' },
                    { value: 'electronics', label: 'Electronics & Sensors' },
                    { value: 'seal', label: 'Seals & Lubricants' },
                    { value: 'tool', label: 'Tooling & Consumables' }
                  ]}
                />

                {/* Status Filter */}
                <CustomSelect 
                  size="sm"
                  triggerStyle={{ height: '32px' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ width: '155px', minWidth: '135px', flexShrink: 0 }}
                  options={[
                    { value: 'all', label: 'All Stock Levels' },
                    { value: 'in_stock', label: 'In Stock' },
                    { value: 'low_stock', label: 'Low Stock' },
                    { value: 'critical', label: 'Critical / Out of Stock' }
                  ]}
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0, paddingLeft: '8px' }}>
                Showing <strong>{(activeTab === 'low_stock' ? lowStockItems : filteredItems).length}</strong> records
              </div>
            </div>

            {/* Dedicated Make / Brand Quick Selection Pills */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              padding: '8px 12px',
              borderBottom: '1px solid var(--border-color)',
              marginBottom: '6px',
              scrollbarWidth: 'thin'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', marginRight: '2px' }}>
                <Tag size={12} color="#7A1F3D" /> By Make:
              </span>
              <button
                type="button"
                onClick={() => setMakeFilter('all')}
                style={{
                  padding: '3px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: makeFilter === 'all' ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: makeFilter === 'all' ? '#7A1F3D' : 'var(--bg-secondary, #f3f4f6)',
                  color: makeFilter === 'all' ? '#ffffff' : 'var(--text-main)',
                  border: makeFilter === 'all' ? '1px solid #7A1F3D' : '1px solid var(--border-color)',
                  transition: 'all 0.15s ease'
                }}
              >
                All Makes ({items.length})
              </button>
              {Object.keys(makeCounts).map(m => {
                const count = makeCounts[m];
                const isSelected = makeFilter.toLowerCase() === m.toLowerCase();
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMakeFilter(isSelected ? 'all' : m)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '16px',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      background: isSelected ? '#7A1F3D' : '#F5E8ED',
                      color: isSelected ? '#ffffff' : '#7A1F3D',
                      border: isSelected ? '1px solid #7A1F3D' : '1px solid #e2ccd5',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                    title={`Filter inventory by Make: ${m}`}
                  >
                    <span>{m}</span>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 5px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(255,255,255,0.25)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#7A1F3D',
                      fontWeight: 700
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU / Part Code</th>
                    <th>Material / Component Name</th>
                    <th>Make / Brand</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'center' }}>Available Qty</th>
                    <th style={{ textAlign: 'center' }}>Min Stock</th>
                    <th>Warehouse / Bin</th>
                    <th style={{ textAlign: 'right' }}>Unit Cost</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'low_stock' ? lowStockItems : filteredItems).length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No inventory records match the current filters.
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'low_stock' ? lowStockItems : filteredItems).map((item) => {
                      const isLow = (Number(item.availableQty) || 0) <= (Number(item.minStock) || 0);

                      return (
                        <tr key={item.id} style={{ background: isLow ? '#fef2f2' : 'transparent' }}>
                          <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '12px' }}>
                            {item.sku}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
                              {item.name}
                            </div>
                            {item.model && item.model !== item.sku && (
                              <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Model: {item.model}
                              </div>
                            )}
                          </td>
                          <td>
                            {/* Make / Manufacturer Badge */}
                            <span 
                              onClick={() => setMakeFilter(makeFilter.toLowerCase() === (item.make || '').toLowerCase() ? 'all' : (item.make || 'Generic'))}
                              style={{ 
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '2px 8px', 
                                borderRadius: '4px', 
                                fontSize: '11.5px', 
                                fontWeight: 700,
                                background: '#F5E8ED',
                                color: '#7A1F3D',
                                border: '1px solid #e2ccd5',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={`Click to filter table by Make: ${item.make || 'Generic'}`}
                            >
                              {item.make || 'Generic'}
                            </span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {item.category}
                          </td>
                          <td className="mono" style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px', color: isLow ? '#dc2626' : 'var(--text-main)' }}>
                            {item.availableQty} {item.unit}
                          </td>
                          <td className="mono" style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {item.minStock} {item.unit}
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={11} color="var(--text-muted)" />
                              <span>{item.location}</span>
                            </div>
                          </td>
                          <td className="mono" style={{ textAlign: 'right', fontWeight: 600, fontSize: '12.5px' }}>
                            {item.unitCost}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <StatusBadge status={item.status} />
                          </td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                              {/* Update Stock Button */}
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#7A1F3D', color: '#7A1F3D', fontWeight: 600 }}
                                onClick={() => handleOpenStockAdjust(item)}
                                title="Update Stock / Adjust Quantity (Inward or Issue)"
                              >
                                <RefreshCw size={11} />
                                <span>Update Stock</span>
                              </button>

                              {/* Edit Item */}
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px' }}
                                onClick={() => handleOpenEditItem(item)}
                                title="Edit Material Specifications"
                              >
                                <Edit3 size={12} />
                              </button>

                              {/* Delete Item */}
                              <button 
                                type="button" 
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px 6px', color: 'var(--status-danger-text)' }}
                                onClick={() => setDeleteConfirmModal({ isOpen: true, item })}
                                title="Delete from Inventory"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: Material Movement Transactions */}
        {activeTab === 'transactions' && (
          <div className="section-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="card-title">Material Movement Log (Inward GRN / Store Issue / Audit)</div>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {stockMovements.length} Logged Movement(s)
              </span>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Transaction Type</th>
                    <th>SKU & Description</th>
                    <th>Quantity</th>
                    <th>Department / Bin Location</th>
                    <th>Authorized By</th>
                    <th>Reference / Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockMovements.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No inventory movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    stockMovements.map((tx, idx) => (
                      <tr key={tx.id || idx}>
                        <td className="mono" style={{ fontSize: '12px' }}>{tx.time}</td>
                        <td>
                          <span 
                            className={`status-badge ${tx.type.includes('Inward') ? 'badge-success' : (tx.type.includes('Issue') ? 'badge-warning' : 'badge-neutral')}`} 
                            style={{ fontSize: '11px', fontWeight: 600 }}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: '12.5px' }}>{tx.name}</div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.sku}</div>
                        </td>
                        <td className="mono" style={{ fontWeight: 700 }}>{tx.qty}</td>
                        <td style={{ fontSize: '12px' }}>{tx.bay}</td>
                        <td style={{ fontSize: '12px' }}>{tx.user}</td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                          <div><strong className="mono" style={{ color: 'var(--primary)' }}>{tx.ref}</strong></div>
                          {tx.notes && <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{tx.notes}</div>}
                        </td>
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
          const filteredValuationItems = items.filter((item) => {
            const itemCat = (item.category || '').toLowerCase();
            const filterCat = (categoryFilter || 'all').toLowerCase();
            const matchesCat = filterCat === 'all' || itemCat.includes(filterCat);
            const matchesMake = makeFilter === 'all' || (item.make && item.make.toLowerCase() === makeFilter.toLowerCase());
            const q = (searchQuery || '').toLowerCase().trim();
            const matchesSearch = !q || 
              (item.name || '').toLowerCase().includes(q) ||
              (item.sku || '').toLowerCase().includes(q) ||
              (item.make || '').toLowerCase().includes(q);
            return matchesCat && matchesMake && matchesSearch;
          });

          const totalVal = filteredValuationItems.reduce((acc, i) => acc + ((Number(i.availableQty) || 0) * (Number(i.unitCostNum) || 0)), 0);
          const totalUnits = filteredValuationItems.reduce((acc, i) => acc + (Number(i.availableQty) || 0), 0);

          return (
            <div className="section-card">
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="card-title">Inventory Valuation & Stock Financials (By Make)</div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportValuationCsv}
                >
                  <Download size={12} />
                  <span>Download Valuation PDF</span>
                </button>
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU Code</th>
                      <th>Material / Component Name</th>
                      <th>Make</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ textAlign: 'center' }}>Stock on Hand</th>
                      <th>Location</th>
                      <th style={{ textAlign: 'right' }}>Total Line Valuation</th>
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
                      filteredValuationItems.map((item) => {
                        const lineVal = (Number(item.availableQty) || 0) * (Number(item.unitCostNum) || 0);

                        return (
                          <tr key={item.id}>
                            <td className="mono" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                              {item.sku}
                            </td>
                            <td>
                              <div style={{ fontWeight: 600 }}>{item.name}</div>
                              {item.model && <div className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{item.model}</div>}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#7A1F3D', fontSize: '11.5px' }}>
                                {item.make || 'Generic'}
                              </span>
                            </td>
                            <td style={{ fontSize: '12px' }}>{item.category}</td>
                            <td className="mono" style={{ textAlign: 'right', fontSize: '12.5px', fontWeight: 500 }}>
                              {item.unitCost}
                            </td>
                            <td className="mono" style={{ textAlign: 'center', fontWeight: 700, fontSize: '13px' }}>
                              {item.availableQty} {item.unit}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {item.location}
                            </td>
                            <td className="mono" style={{ textAlign: 'right', fontWeight: 700, fontSize: '13.5px', color: 'var(--primary)' }}>
                              ₹{lineVal.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredValuationItems.length > 0 && (
                    <tfoot>
                      <tr style={{ backgroundColor: 'var(--bg-secondary)', fontWeight: 700 }}>
                        <td colSpan="5" style={{ textAlign: 'right', padding: '12px 16px' }}>
                          Total Valuation:
                        </td>
                        <td className="mono" style={{ textAlign: 'center', fontSize: '13px' }}>
                          {totalUnits.toLocaleString('en-IN')} Units
                        </td>
                        <td></td>
                        <td className="mono" style={{ textAlign: 'right', fontSize: '15px', color: 'var(--primary)' }}>
                          ₹{totalVal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* 1. ADD / EDIT MATERIAL & SPARE MODAL                                       */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItemId ? `Edit Material Spec: ${itemFormData.name}` : '+ Add Material, Spare or Tooling Item'}
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsItemModalOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSaveItem}
            >
              <CheckCircle2 size={13} />
              <span>{editingItemId ? 'Update Material Spec' : 'Add to Inventory'}</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Part Code / SKU *</label>
              <input 
                type="text" 
                className="form-control mono"
                value={itemFormData.sku}
                onChange={e => setItemFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                placeholder="e.g. 120TAC20FME2DBCP5P01-NSK"
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Make / Manufacturer *</label>
              <input 
                list="common-makes-list"
                className="form-control"
                style={{ fontWeight: 600, color: '#7A1F3D' }}
                value={itemFormData.make}
                onChange={e => setItemFormData(prev => ({ ...prev, make: e.target.value }))}
                placeholder="e.g. NSK, FAG, Heidenhain..."
                required
              />
              <datalist id="common-makes-list">
                {uniqueMakes.map(m => <option key={m} value={m} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '11px' }}>Material / Component Name *</label>
            <input 
              type="text" 
              className="form-control"
              value={itemFormData.name}
              onChange={e => setItemFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. NSK Super Precision Ball Screw Support Bearings"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Model / Spec Number</label>
              <input 
                type="text" 
                className="form-control mono"
                value={itemFormData.model}
                onChange={e => setItemFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="e.g. 120TAC20FME2DBCP5P01"
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Material Category</label>
              <select 
                className="form-control"
                value={itemFormData.category}
                onChange={e => setItemFormData(prev => ({ ...prev, category: e.target.value }))}
              >
                <option value="Precision Bearings">Precision Bearings</option>
                <option value="Raw Alloy Steel">Raw Alloy Steel</option>
                <option value="Tool Clamping">Tool Clamping & Drawbars</option>
                <option value="Motor Components">Motor Stators & Rotors</option>
                <option value="Electronics & Sensors">Electronics & Encoders</option>
                <option value="Seals & Lubricants">Seals & Lubricants</option>
                <option value="Tooling & Consumables">Tooling & Consumables</option>
                <option value="General Inventory">General Inventory</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Available Qty *</label>
              <input 
                type="number" 
                min="0"
                className="form-control mono"
                value={itemFormData.availableQty}
                onChange={e => setItemFormData(prev => ({ ...prev, availableQty: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Min Reorder Level *</label>
              <input 
                type="number" 
                min="1"
                className="form-control mono"
                value={itemFormData.minStock}
                onChange={e => setItemFormData(prev => ({ ...prev, minStock: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Unit of Measure</label>
              <select 
                className="form-control"
                value={itemFormData.unit}
                onChange={e => setItemFormData(prev => ({ ...prev, unit: e.target.value }))}
              >
                <option value="Nos">Nos</option>
                <option value="Pairs">Pairs</option>
                <option value="Sets">Sets</option>
                <option value="Pcs">Pcs</option>
                <option value="Meters">Meters</option>
                <option value="Tins">Tins</option>
                <option value="Packs">Packs</option>
                <option value="Kg">Kg</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Unit Cost (₹) *</label>
              <input 
                type="number" 
                min="0"
                step="any"
                className="form-control mono"
                value={itemFormData.unitCostNum}
                onChange={e => setItemFormData(prev => ({ ...prev, unitCostNum: Number(e.target.value) }))}
                required
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Warehouse Bin / Location</label>
              <input 
                type="text" 
                className="form-control"
                value={itemFormData.location}
                onChange={e => setItemFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g. Cleanroom Cabinet C-03"
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '11px' }}>Primary Supplier / Vendor Partner</label>
            <select
              className="form-control"
              value={itemFormData.supplier}
              onChange={e => setItemFormData(prev => ({ ...prev, supplier: e.target.value }))}
            >
              {suppliersList.map((s, idx) => (
                <option key={s.id || idx} value={s.name}>
                  {s.name} ({s.supplier_code || 'VENDOR'})
                </option>
              ))}
              <option value="PREMIER INDUSTRIAL SOLUTIONS">PREMIER INDUSTRIAL SOLUTIONS</option>
              <option value="Schaeffler India Ltd">Schaeffler India Ltd</option>
              <option value="SKF India Technical Center">SKF India Technical Center</option>
              <option value="Bharat Special Steels Ltd">Bharat Special Steels Ltd</option>
              <option value="Heidenhain India Pvt Ltd">Heidenhain India Pvt Ltd</option>
              <option value="Sandvik Coromant India">Sandvik Coromant India</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. QUICK STOCK ADJUSTMENT / UPDATE MODAL                                   */}
      {/* ========================================================================= */}
      {selectedItemForAdjust && (
        <Modal
          isOpen={isAdjustModalOpen}
          onClose={() => setIsAdjustModalOpen(false)}
          title={`Update Stock — ${selectedItemForAdjust.name}`}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setIsAdjustModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleApplyStockAdjustment}
              >
                <CheckCircle2 size={13} />
                <span>Apply Stock Update</span>
              </button>
            </div>
          }
        >
          <form onSubmit={handleApplyStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Item Summary Banner */}
            <div style={{ 
              padding: '10px 14px', 
              background: '#F5E8ED', 
              border: '1px solid #e2ccd5', 
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontWeight: 800, color: '#7A1F3D', fontSize: '13px' }}>
                  {selectedItemForAdjust.name}
                </div>
                <div style={{ fontSize: '11px', color: '#5A1730', marginTop: '2px' }}>
                  Make: <strong>{selectedItemForAdjust.make || 'NSK'}</strong> &bull; SKU: <strong className="mono">{selectedItemForAdjust.sku}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: '#5A1730', textTransform: 'uppercase' }}>Current Available</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: '#7A1F3D' }}>
                  {selectedItemForAdjust.availableQty} {selectedItemForAdjust.unit}
                </div>
              </div>
            </div>

            {/* Adjustment Type Selector */}
            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Adjustment Operation</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px',
                    borderRadius: '5px',
                    border: adjustFormData.adjustmentType === 'inward' ? '2px solid #059669' : '1px solid var(--border-color)',
                    background: adjustFormData.adjustmentType === 'inward' ? '#ecfdf5' : '#ffffff',
                    color: adjustFormData.adjustmentType === 'inward' ? '#047857' : 'var(--text-main)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setAdjustFormData(prev => ({ ...prev, adjustmentType: 'inward' }))}
                >
                  <ArrowDownRight size={16} />
                  <span>+ Inward Receipt</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px',
                    borderRadius: '5px',
                    border: adjustFormData.adjustmentType === 'issue' ? '2px solid #b45309' : '1px solid var(--border-color)',
                    background: adjustFormData.adjustmentType === 'issue' ? '#fffbeb' : '#ffffff',
                    color: adjustFormData.adjustmentType === 'issue' ? '#b45309' : 'var(--text-main)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setAdjustFormData(prev => ({ ...prev, adjustmentType: 'issue' }))}
                >
                  <ArrowUpRight size={16} />
                  <span>- Store Issue</span>
                </button>

                <button
                  type="button"
                  style={{
                    padding: '8px',
                    borderRadius: '5px',
                    border: adjustFormData.adjustmentType === 'set' ? '2px solid #7A1F3D' : '1px solid var(--border-color)',
                    background: adjustFormData.adjustmentType === 'set' ? '#F5E8ED' : '#ffffff',
                    color: adjustFormData.adjustmentType === 'set' ? '#7A1F3D' : 'var(--text-main)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  onClick={() => setAdjustFormData(prev => ({ ...prev, adjustmentType: 'set' }))}
                >
                  <Scale size={16} />
                  <span>= Audit / Set Count</span>
                </button>
              </div>
            </div>

            {/* Quantity Input with Live Preview */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ fontSize: '11px' }}>
                  {adjustFormData.adjustmentType === 'set' ? 'New Exact Stock Level' : 'Quantity to Add / Deduct'} *
                </label>
                <input 
                  type="number"
                  min={adjustFormData.adjustmentType === 'set' ? '0' : '1'}
                  className="form-control mono"
                  style={{ fontSize: '14px', fontWeight: 700 }}
                  value={adjustFormData.quantity}
                  onChange={e => setAdjustFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  required
                />
              </div>

              {/* Calculated Result */}
              <div style={{ 
                padding: '10px', 
                background: '#F8FAF9', 
                borderRadius: '6px', 
                border: '1px solid var(--border-color)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>Updated Stock on Hand:</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                  {(() => {
                    const current = Number(selectedItemForAdjust.availableQty) || 0;
                    const delta = Number(adjustFormData.quantity) || 0;
                    if (adjustFormData.adjustmentType === 'inward') return `${current + delta} ${selectedItemForAdjust.unit}`;
                    if (adjustFormData.adjustmentType === 'issue') return `${Math.max(0, current - delta)} ${selectedItemForAdjust.unit}`;
                    return `${delta} ${selectedItemForAdjust.unit}`;
                  })()}
                </div>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ fontSize: '11px' }}>Reason / Movement Notes *</label>
              <input 
                type="text" 
                className="form-control"
                value={adjustFormData.reason}
                onChange={e => setAdjustFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g. Received shipment against GRN-2026-092 / Issued to Bay 3"
                required
              />
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 3. DELETE ITEM CONFIRMATION MODAL                                         */}
      {/* ========================================================================= */}
      {deleteConfirmModal.isOpen && (
        <Modal
          isOpen={deleteConfirmModal.isOpen}
          onClose={() => setDeleteConfirmModal({ isOpen: false, item: null })}
          title="Delete Material Item from Inventory Registry"
          maxWidth="440px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmModal({ isOpen: false, item: null })}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                onClick={handleExecuteDeleteItem}
              >
                Delete Item
              </button>
            </div>
          }
        >
          <div style={{ padding: '4px 0' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)' }}>
              Are you sure you want to remove <strong>{deleteConfirmModal.item?.name}</strong> ({deleteConfirmModal.item?.sku}) from the inventory database?
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Historical movements and records will remain archived.
            </p>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 4. DOCUMENT PREVIEW MODAL (INVENTORY VALUATION REPORT)                    */}
      {/* ========================================================================= */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
