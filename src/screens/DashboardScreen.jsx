import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import PageHeader from '../components/common/PageHeader';
import { dashboardService } from '../services/database';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { exportShiftReportPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { 
  purchaseOrderService, 
  saveRaisedMaterial, 
  isMaterialPoRaised 
} from '../services/database/purchaseOrderService';
import { 
  ArrowUpRight, AlertTriangle, Clock, Eye, 
  CheckCircle2, Plus, Download, RefreshCw, Loader2,
  AlertCircle, ShoppingCart, ExternalLink, ShieldCheck, Truck,
  Search, X, Factory, FileText, Receipt, Package, Building2, Wrench, ArrowRight
} from 'lucide-react';
import { universalSearchService, SEARCH_CATEGORIES } from '../services/universalSearchService';

const PRESET_SUPPLIERS = [
  {
    name: 'Schaeffler India',
    contact: 'Mr. Rajesh Nair (Sales Director - Spindle Bearings)',
    email: 'r.nair@schaeffler.com',
    phone: '+91 20 6608 4100',
    gstin: '27AAACS4821M1ZB',
    address: 'Pune Distribution Centre, Chakan MIDC Phase II, Pune - 410501, Maharashtra'
  },
  {
    name: 'Bharat Special Steel',
    contact: 'Mr. Manoj Gokhale (Head - Alloy Metallurgy)',
    email: 'sales@bharatspecialsteel.com',
    phone: '+91 20 2712 9182',
    gstin: '27AABCB9182L1ZX',
    address: 'Plot 42, Bhosari Industrial Area, Pune - 411026, Maharashtra'
  },
  {
    name: 'OTT Jakob',
    contact: 'Mr. K. S. Raman (Country Applications Manager)',
    email: 'raman@ottjakob-india.com',
    phone: '+91 80 4112 0900',
    gstin: '29AAACJ3918K1Z3',
    address: 'Bengaluru Technology Centre, 4th Phase, Peenya Industrial Area, Bengaluru - 560058'
  },
  {
    name: 'Heidenhain India',
    contact: 'Mr. Suresh Babu (Regional Head)',
    email: 'info@heidenhain.in',
    phone: '+91 22 2831 4910',
    gstin: '27AABCH4910D1Z7',
    address: 'Tech Park, Andheri East, Mumbai - 400069, Maharashtra'
  },
  {
    name: 'Sandvik Coromant India',
    contact: 'Ms. Priya Sharma (Key Accounts)',
    email: 'orders@sandvik.com',
    phone: '+91 20 6734 5000',
    gstin: '27AAACS1928F1ZG',
    address: 'Mumbai-Pune Road, Dapodi, Pune - 411012, Maharashtra'
  }
];

export default function DashboardScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  // Live Dashboard Data States
  const [metrics, setMetrics] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [totalWoCount, setTotalWoCount] = useState(0);
  const [criticalMaterials, setCriticalMaterials] = useState([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState([]);
  const [shopBays, setShopBays] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Lifecycle States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Universal Software Search Bar State on Dashboard
  const [dashSearchQuery, setDashSearchQuery] = useState('');
  const [dashActiveCategory, setDashActiveCategory] = useState('all');
  const [isDashSearchOpen, setIsDashSearchOpen] = useState(false);
  const dashSearchContainerRef = React.useRef(null);

  const { results: dashSearchResults, totalCount: dashTotalCount, isSuggestion: isDashSuggestion, categoryCounts: dashCategoryCounts } = useMemo(() => {
    return universalSearchService.search(dashSearchQuery, dashActiveCategory, 18);
  }, [dashSearchQuery, dashActiveCategory]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dashSearchContainerRef.current && !dashSearchContainerRef.current.contains(e.target)) {
        setIsDashSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelectDashSearchResult = (res) => {
    if (onNavigate) {
      onNavigate(res.targetScreen);
    }
    if (onNotify) {
      onNotify(`Opened ${res.docType || 'record'}: ${res.docNumber || res.title}`);
    }
    setIsDashSearchOpen(false);
    setDashSearchQuery('');
  };

  // Raise PO Modal State
  const [selectedMaterialForPo, setSelectedMaterialForPo] = useState(null);
  const [isRaisingPo, setIsRaisingPo] = useState(false);
  const [poForm, setPoForm] = useState({
    supplierName: 'Schaeffler India',
    supplierContact: '',
    supplierEmail: '',
    supplierPhone: '',
    supplierGstin: '',
    supplierAddress: '',
    quantity: 5,
    unitPrice: 38500,
    deliveryDays: 14,
    priority: 'High',
    notes: ''
  });

  const handleOpenRaisePo = (material) => {
    const itemSku = (material.sku || '').toUpperCase();
    const itemName = (material.name || '').toUpperCase();
    let defaultSupplier = PRESET_SUPPLIERS[0]; // Schaeffler
    let defaultRate = material.unitCost || 38500;

    if (itemSku.includes('STL') || itemName.includes('STEEL') || itemName.includes('SHAFT') || itemName.includes('42CR')) {
      defaultSupplier = PRESET_SUPPLIERS[1]; // Bharat Special Steel
      defaultRate = material.unitCost || 18500;
    } else if (itemSku.includes('OTT') || itemName.includes('COLLET') || itemName.includes('DRAWBAR') || itemName.includes('SPRING')) {
      defaultSupplier = PRESET_SUPPLIERS[2]; // OTT Jakob
      defaultRate = material.unitCost || 42000;
    } else if (itemSku.includes('ENC') || itemName.includes('SENSOR') || itemName.includes('SCALE')) {
      defaultSupplier = PRESET_SUPPLIERS[3]; // Heidenhain
      defaultRate = material.unitCost || 56000;
    }

    const deficit = Math.max(1, (material.minStock * 2) - material.availableQty);

    setSelectedMaterialForPo(material);
    setPoForm({
      supplierName: defaultSupplier.name,
      supplierContact: defaultSupplier.contact,
      supplierEmail: defaultSupplier.email,
      supplierPhone: defaultSupplier.phone,
      supplierGstin: defaultSupplier.gstin,
      supplierAddress: defaultSupplier.address,
      quantity: deficit,
      unitPrice: defaultRate,
      deliveryDays: 14,
      priority: material.status.includes('Critical') ? 'Critical Stockout' : 'High Replenishment',
      notes: `Replenishment order for critical inventory shortage: current on-hand ${material.availableQty} ${material.unit} vs safety minimum ${material.minStock}.`
    });
  };

  const handleSupplierSelect = (supplierName) => {
    const matched = PRESET_SUPPLIERS.find(s => s.name === supplierName);
    if (matched) {
      setPoForm(prev => ({
        ...prev,
        supplierName: matched.name,
        supplierContact: matched.contact,
        supplierEmail: matched.email,
        supplierPhone: matched.phone,
        supplierGstin: matched.gstin,
        supplierAddress: matched.address
      }));
    } else {
      setPoForm(prev => ({ ...prev, supplierName }));
    }
  };

  const handleConfirmRaisePo = async (navigateAfter = true) => {
    if (!selectedMaterialForPo) return;
    setIsRaisingPo(true);

    try {
      const poNum = `PO-2026-${Math.floor(100 + Math.random() * 900)}`;
      const qty = Number(poForm.quantity) || 1;
      const rate = Number(poForm.unitPrice) || 0;
      const subtotal = qty * rate;
      const total = Math.round(subtotal * 1.18);
      const deliveryDate = new Date(Date.now() + (Number(poForm.deliveryDays) || 14) * 86400000).toISOString().split('T')[0];

      const poPayload = {
        poNumber: poNum,
        supplierName: poForm.supplierName,
        supplierEmail: poForm.supplierEmail,
        supplierPhone: poForm.supplierPhone,
        supplierGstin: poForm.supplierGstin,
        supplierAddress: poForm.supplierAddress,
        expectedDeliveryDate: deliveryDate,
        paymentTerms: 'Net 30 Days from GRN Inspection',
        subtotal: subtotal,
        totalAmount: total,
        status: 'Sent',
        notes: poForm.notes,
        items: [
          {
            productId: selectedMaterialForPo.productId,
            name: selectedMaterialForPo.name,
            desc: `${selectedMaterialForPo.name} (${selectedMaterialForPo.sku}) - Precision Spindle Replenishment`,
            sku: selectedMaterialForPo.sku,
            qty: qty,
            unit: selectedMaterialForPo.unit || 'PCS',
            rate: rate,
            gst: 18,
            total: total
          }
        ]
      };

      await purchaseOrderService.createPurchaseOrder(poPayload);

      // Persist raised material record so it is excluded from dashboard shortage alerts
      saveRaisedMaterial(selectedMaterialForPo, poNum);

      if (onNotify) {
        onNotify(`Purchase Order ${poNum} successfully generated for ${selectedMaterialForPo.sku} (Total: ₹${total.toLocaleString('en-IN')})`);
      }

      // Remove respective material shortage order / alert from dashboard
      const targetMat = selectedMaterialForPo;
      setCriticalMaterials(prev => prev.filter(m => 
        m.id !== targetMat.id &&
        (!targetMat.sku || m.sku !== targetMat.sku) &&
        (!targetMat.productId || m.productId !== targetMat.productId)
      ));

      // Decrement low_stock KPI card count if present
      setMetrics(prev => prev.map(m => {
        if (m.id === 'low_stock') {
          const count = Math.max(0, (parseInt(m.value, 10) || 0) - 1);
          return {
            ...m,
            value: String(count),
            trend: count > 0 ? `${count} below threshold` : 'Inventory healthy',
            alert: count > 0,
            isUp: count === 0
          };
        }
        return m;
      }));

      setSelectedMaterialForPo(null);

      if (navigateAfter && onNavigate) {
        onNavigate('purchase-orders');
      }
    } catch (err) {
      console.error('[DashboardScreen] Failed to raise PO:', err);
      if (onNotify) onNotify(`Failed to create PO: ${err.message}`);
    } finally {
      setIsRaisingPo(false);
    }
  };

  // Fetch all live dashboard data in parallel from PostgreSQL
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [
        metricsRes,
        pipelineRes,
        woRes,
        materialsRes,
        deliveriesRes,
        baysRes,
        activityRes
      ] = await Promise.all([
        dashboardService.getDashboardMetrics(),
        dashboardService.getProductionPipelineStages(),
        dashboardService.getRecentWorkOrders(5),
        dashboardService.getCriticalMaterials(10),
        dashboardService.getUpcomingDeliveries(4),
        dashboardService.getShopBayUtilization(4),
        dashboardService.getRecentActivityFeed(5)
      ]);

      if (metricsRes.error) {
        throw new Error(metricsRes.error.message || 'Failed to load KPI metrics');
      }

      // Filter out materials that already have a PO raised so their alerts are not seen on the dashboard
      const rawMaterials = materialsRes.data || [];
      const unaddressedMaterials = rawMaterials.filter(m => !isMaterialPoRaised(m));
      const displayMaterials = unaddressedMaterials.slice(0, 5);

      // Adjust low_stock metric to reflect only materials without PO raised
      const raisedCount = rawMaterials.length - unaddressedMaterials.length;
      const adjustedMetrics = (metricsRes.data || []).map(metric => {
        if (metric.id === 'low_stock') {
          const currentVal = parseInt(metric.value, 10) || 0;
          const adjustedVal = Math.max(0, currentVal - raisedCount);
          return {
            ...metric,
            value: String(adjustedVal),
            trend: adjustedVal > 0 ? `${adjustedVal} below threshold` : 'Inventory healthy',
            alert: adjustedVal > 0,
            isUp: adjustedVal === 0
          };
        }
        return metric;
      });

      setMetrics(adjustedMetrics);
      setPipelineStages(pipelineRes.data || []);
      setWorkOrders(woRes.data || []);
      setTotalWoCount(woRes.totalCount || (woRes.data ? woRes.data.length : 0));
      setCriticalMaterials(displayMaterials);
      setUpcomingDeliveries(deliveriesRes.data || []);
      setShopBays(baysRes.data || []);
      setRecentActivity(activityRes.data || []);

      if (isRefresh && onNotify) {
        onNotify('Manufacturing Operations Dashboard updated with live PostgreSQL metrics');
      }
    } catch (err) {
      console.warn('[GPS-ERP Dashboard] Error loading live dashboard:', err.message);
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [onNotify]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Synchronize dashboard whenever entities change (e.g. PO raised, deleted, cancelled)
  useEffect(() => {
    const handleEntityUpdate = (e) => {
      if (e?.detail?.entity === 'purchase-orders') {
        fetchDashboardData(false);
      }
    };
    window.addEventListener('gps_entities_updated', handleEntityUpdate);
    return () => {
      window.removeEventListener('gps_entities_updated', handleEntityUpdate);
    };
  }, [fetchDashboardData]);

  // Loading Skeleton State
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Error State with Retry (Zero Mock Fallback)
  if (error) {
    return (
      <div className="content-area">
        <PageHeader
          title="Manufacturing Operations Dashboard"
          subtitle="GPS Spindle Nanded City Unit 1 • Live PostgreSQL Metrics"
        />
        <div className="section-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Database Connection Notice</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => fetchDashboardData(false)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* Top Page Header */}
      <PageHeader
        title="Manufacturing Operations Dashboard"
        subtitle="GPS Spindle Nanded City Unit 1 • Shift A Live Metrics"
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => fetchDashboardData(true)}
          disabled={isRefreshing}
          title="Refresh live metrics from database"
        >
          <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'SHOP FLOOR PRODUCTION & SHIFT OPERATIONS REPORT',
              id: `SHIFT-REP-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Active Spindle Orders', value: totalWoCount || workOrders.length },
                { label: 'Critical Deliveries', value: upcomingDeliveries.length },
                { label: 'Active Shop Cells', value: `${shopBays.filter(b => b.status === 'Active').length} Bays` }
              ],
              headers: ['#', 'WO Number', 'Spindle Model & Serial', 'Customer', 'Current Cell', 'Target Date', 'Status'],
              rows: workOrders.map((wo, idx) => [
                idx + 1,
                wo.id || wo.workOrderNumber,
                `${wo.spindleModel} (${wo.serial || '—'})`,
                wo.customer,
                wo.currentStage || wo.bay || 'Machining',
                wo.dueDate || '—',
                wo.priority || 'Normal'
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Shift Report (PDF)</span>
        </button>
      </PageHeader>

      <div className="content-body">
        {/* Universal Software Search Bar on Dashboard */}
        <div 
          ref={dashSearchContainerRef}
          className="section-card dashboard-search-omnibar"
          style={{
            padding: '14px 18px',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            borderRadius: 'var(--radius-lg)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '6px',
                background: '#F5E8ED',
                color: '#7A1F3D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Search size={14} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                Universal Software Search
              </span>
              <span style={{ fontSize: '10px', background: 'var(--bg-surface-subtle)', color: 'var(--text-muted)', padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                Full Software Index
              </span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Search across Work Orders, Quotations, Invoices, Spindles, Customers & POs
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }} />
            <input 
              type="text" 
              className="form-control"
              placeholder="Search anything across entire software (e.g. WO-2026-104, Linamar, HC7008, Schaeffler, GPS-0842, Invoices...)"
              value={dashSearchQuery}
              onChange={(e) => {
                setDashSearchQuery(e.target.value);
                setIsDashSearchOpen(true);
              }}
              onFocus={() => setIsDashSearchOpen(true)}
              style={{
                height: '40px',
                fontSize: '12.5px',
                paddingLeft: '38px',
                paddingRight: dashSearchQuery ? '36px' : '40px',
                background: '#ffffff',
                border: '1.5px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                boxShadow: isDashSearchOpen ? '0 0 0 3px rgba(122, 31, 61, 0.12)' : 'none',
                borderColor: isDashSearchOpen ? 'var(--primary)' : 'var(--border-color)'
              }}
            />
            {dashSearchQuery ? (
              <button 
                type="button" 
                onClick={() => { setDashSearchQuery(''); setIsDashSearchOpen(false); }}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '4px'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            ) : (
              <span className="search-shortcut" style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}>⌘K</span>
            )}
          </div>

          {/* Quick jump tags below search bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Quick Jump:</span>
            {[
              { label: 'WO-2026-104 (Tata TASL)', query: 'WO-2026-104' },
              { label: 'Linamar Quotation', query: 'Linamar' },
              { label: 'Schaeffler Bearings PO', query: 'Schaeffler' },
              { label: 'Ceramic Bearings (HC7008)', query: 'HC7008' },
              { label: 'Spindle Twin (0842)', query: 'GPS-2026-0842' },
              { label: 'Tax Invoices', query: 'INV-2026' }
            ].map((tag, tIdx) => (
              <button
                key={tIdx}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDashSearchQuery(tag.query);
                  setIsDashSearchOpen(true);
                }}
                style={{ height: '22px', fontSize: '10.5px', padding: '0 8px', borderRadius: '4px' }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          {/* Live Full-Software Search Results Panel on Dashboard */}
          {isDashSearchOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '0',
              right: '0',
              background: '#ffffff',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 16px 36px -4px rgba(0,0,0,0.18), 0 6px 16px -4px rgba(0,0,0,0.1)',
              zIndex: 1050,
              marginTop: '6px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Category Filter Pills Bar */}
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                scrollbarWidth: 'none'
              }}>
                <button
                  type="button"
                  onClick={() => setDashActiveCategory('all')}
                  style={{
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: '1px solid',
                    borderColor: dashActiveCategory === 'all' ? 'var(--primary)' : 'var(--border-color)',
                    background: dashActiveCategory === 'all' ? 'var(--primary)' : '#ffffff',
                    color: dashActiveCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  All ({dashTotalCount})
                </button>

                {SEARCH_CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                  const count = dashCategoryCounts[cat.id] || 0;
                  if (!isDashSuggestion && count === 0 && dashActiveCategory !== cat.id) return null;
                  const isActive = dashActiveCategory === cat.id;
                  const CatIcon = cat.icon;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setDashActiveCategory(cat.id)}
                      style={{
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid',
                        borderColor: isActive ? cat.color : 'var(--border-color)',
                        background: isActive ? cat.bg : '#ffffff',
                        color: isActive ? cat.color : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <CatIcon size={11} color={isActive ? cat.color : 'var(--text-muted)'} />
                      <span>{cat.label}</span>
                      {!isDashSuggestion && count > 0 && (
                        <span style={{
                          fontSize: '9.5px',
                          background: isActive ? cat.color : 'var(--border-subtle)',
                          color: isActive ? '#ffffff' : 'var(--text-muted)',
                          padding: '0 4px',
                          borderRadius: '8px',
                          marginLeft: '2px'
                        }}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Status Header */}
              <div style={{
                padding: '6px 14px',
                background: '#fafafa',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10.5px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.03em',
                textTransform: 'uppercase'
              }}>
                <span>
                  {isDashSuggestion 
                    ? '⚡ Priority Shortcuts & Active Records' 
                    : `Found ${dashSearchResults.length} matching records across ERP software`}
                </span>
                {dashSearchQuery && (
                  <button
                    type="button"
                    onClick={() => { setDashSearchQuery(''); setDashActiveCategory('all'); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '10.5px', fontWeight: 600 }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Scrollable Results List */}
              <div style={{
                overflowY: 'auto',
                maxHeight: '360px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                {dashSearchResults.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Search size={28} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                      No matches found for "{dashSearchQuery}"
                    </div>
                    <div style={{ fontSize: '11px', maxWidth: '420px', margin: '0 auto' }}>
                      Try searching by Work Order # (WO-2026-104), Spindle Serial (GPS-0842), Quote (QTN-294), Customer (Linamar, Tata), Vendor (Schaeffler), or Bearing (HC7008).
                    </div>
                  </div>
                ) : (
                  dashSearchResults.map((res, idx) => {
                    const IconComponent = res.icon || Factory;

                    return (
                      <div
                        key={`${res.category}-${res.id}-${idx}`}
                        onClick={() => handleSelectDashSearchResult(res)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                          transition: 'all 0.12s ease',
                          fontSize: '12px',
                          background: '#ffffff'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#FAF0F3'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: res.badgeBg || '#F5E8ED',
                            color: res.badgeColor || '#7A1F3D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <IconComponent size={16} />
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span className="mono" style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '12px' }}>
                                {res.docNumber || res.id}
                              </span>
                              <span style={{
                                fontSize: '9.5px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                background: res.badgeBg || 'var(--status-neutral-bg)',
                                color: res.badgeColor || 'var(--text-muted)'
                              }}>
                                {res.docType}
                              </span>
                              {res.status && (
                                <span style={{
                                  fontSize: '9.5px',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                  background: 'var(--border-subtle)',
                                  color: 'var(--text-secondary)'
                                }}>
                                  {res.status}
                                </span>
                              )}
                            </div>

                            <div style={{
                              fontSize: '11px',
                              color: 'var(--text-muted)',
                              marginTop: '2px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {res.subtitle || res.title}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div>
                            {res.metaPrimary && (
                              <div className="mono" style={{ fontWeight: 700, color: res.badgeColor || 'var(--text-main)', fontSize: '11.5px' }}>
                                {res.metaPrimary}
                              </div>
                            )}
                            {res.metaSecondary && (
                              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {res.metaSecondary}
                              </div>
                            )}
                          </div>
                          <div style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: 'var(--bg-surface-subtle)',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <ArrowRight size={12} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards Grid */}
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <MetricCard 
            key={metric.id}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
            isUp={metric.isUp}
            alert={metric.alert}
            icon={metric.icon}
            onClick={() => {
              if (!onNavigate) return;
              if (metric.id === 'pending_qc') onNavigate('quality');
              else if (metric.id === 'low_stock') onNavigate('inventory');
              else if (metric.id === 'active_service') onNavigate('service');
              else if (metric.id === 'receivables') onNavigate('invoices');
              else onNavigate('production');
            }}
          />
        ))}
      </div>

      {/* Visual Production Pipeline */}
      <div className="section-card">
        <div className="card-header">
          <div className="card-title">
            <span>Precision Spindle Manufacturing Pipeline (Active Work Orders)</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate && onNavigate('production')}
          >
            <span>View Full Board</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
        <div style={{ padding: '8px 16px' }}>
          <PipelineVisualizer 
            stages={pipelineStages} 
            activeStage="grinding"
            onSelectStage={() => onNavigate && onNavigate('production')}
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid-2col">
        {/* Left Column: Recent Work Orders & Low Stock */}
        <div className="grid-col">
          {/* Recent Work Orders */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <span>Active Work Orders in Floor Rotation</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate && onNavigate('production')}
              >
                <span>All Orders ({totalWoCount})</span>
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>WO Number</th>
                    <th>Spindle Serial</th>
                    <th>Model</th>
                    <th>Customer</th>
                    <th>Bay / Operation</th>
                    <th>Due Date</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No active work orders in floor rotation.
                      </td>
                    </tr>
                  ) : (
                    workOrders.map((wo) => (
                      <tr key={wo.id}>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {wo.id}
                        </td>
                        <td className="mono">{wo.spindleSerial}</td>
                        <td style={{ fontWeight: 500 }}>{wo.spindleModel}</td>
                        <td>{wo.customer}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {wo.shopBay ? wo.shopBay.split(' - ')[0] : 'Shop Floor'}
                        </td>
                        <td className="mono" style={{ fontSize: '12px' }}>{wo.dueDate}</td>
                        <td style={{ minWidth: '100px' }}>
                          <ProgressBar progress={wo.progress} />
                        </td>
                        <td>
                          <StatusBadge status={wo.status} />
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              if (onSelectWorkOrder) onSelectWorkOrder(wo.raw || wo);
                              if (onNavigate) onNavigate('work-order-detail');
                            }}
                            title="View Details"
                          >
                            <Eye size={13} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low-Stock Critical Materials */}
          <div className="section-card">
            <div className="card-header" style={{ borderLeft: '3px solid #f59e0b' }}>
              <div className="card-title" style={{ color: '#b45309' }}>
                <AlertTriangle size={16} />
                <span>Critical Materials & Bearings Alert</span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate && onNavigate('inventory')}
              >
                <span>Open Inventory</span>
              </button>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part Name & SKU</th>
                    <th>Category</th>
                    <th>In Stock</th>
                    <th>Reserved</th>
                    <th>Min Threshold</th>
                    <th>Status</th>
                    <th>Quick Action</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        All critical materials and bearings meet safety thresholds.
                      </td>
                    </tr>
                  ) : (
                    criticalMaterials.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.name}</div>
                          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.sku}</div>
                        </td>
                        <td style={{ fontSize: '12px' }}>{item.category}</td>
                        <td className="mono" style={{ fontWeight: 700, color: item.status.includes('Critical') ? '#dc2626' : '#b45309' }}>
                          {item.availableQty} {item.unit}
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>{item.reservedQty}</td>
                        <td className="mono">{item.minStock}</td>
                        <td>
                          <StatusBadge status={item.status} />
                        </td>
                        <td>
                          {item.status === 'PO Raised' ? (
                            <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                              <CheckCircle2 size={14} /> PO Raised
                            </span>
                          ) : (
                            <button 
                              type="button" 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenRaisePo(item)}
                              title={`Raise Purchase Requisition / PO for ${item.sku}`}
                            >
                              Raise PO
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Deliveries, Bays & Plant Activity */}
        <div className="grid-col">
          {/* Upcoming Deliveries */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <CheckCircle2 size={16} color="#059669" />
                <span>Upcoming Dispatch Schedule</span>
              </div>
            </div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {upcomingDeliveries.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No upcoming dispatches scheduled.
                </div>
              ) : (
                upcomingDeliveries.map((del) => (
                  <div 
                    key={del.id}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{del.customer}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {del.serial} • {del.model}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px' }}>
                        Target: {del.date}
                      </div>
                    </div>
                    <StatusBadge status={del.status} size="sm" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shop Bay Live Status */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <span>Shop Floor Bay Utilization</span>
              </div>
            </div>
            <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {shopBays.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No active production bays found.
                </div>
              ) : (
                shopBays.map((bay) => (
                  <div 
                    key={bay.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-subtle)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>
                        {bay.name ? bay.name.split(' - ')[0] : 'Bay'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bay.operator}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>
                        {bay.utilization}
                      </span>
                      <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>{bay.status}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="section-card">
            <div className="card-header">
              <div className="card-title">
                <Clock size={16} />
                <span>Plant Activity Feed</span>
              </div>
            </div>
            <div style={{ padding: '16px' }}>
              {recentActivity.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No recent audit log activity recorded.
                </div>
              ) : (
                <div className="timeline">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="timeline-item">
                      <div className="timeline-point active" />
                      <div className="timeline-content">
                        <div className="timeline-title" style={{ fontSize: '12px', fontWeight: 500 }}>
                          {act.text}
                        </div>
                        <div className="timeline-meta" style={{ marginTop: '2px' }}>
                          <span className="mono">{act.time}</span> • {act.user}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Production Shift Report Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />

      {/* Raise Purchase Order Modal */}
      {selectedMaterialForPo && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedMaterialForPo(null)}
          title={`Raise Purchase Order: ${selectedMaterialForPo.sku}`}
          maxWidth="680px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', alignItems: 'center', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setSelectedMaterialForPo(null)}
                disabled={isRaisingPo}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleConfirmRaisePo(true)}
                disabled={isRaisingPo}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <ShoppingCart size={14} />
                <span>{isRaisingPo ? 'Generating PO...' : 'Confirm & Raise PO'}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Shortage Alert Dossier */}
            <div style={{ 
              padding: '12px 16px', 
              background: '#fef2f2', 
              borderRadius: '8px', 
              border: '1px solid #fecaca',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#991b1b' }}>
                  {selectedMaterialForPo.name}
                </div>
                <div className="mono" style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                  SKU: {selectedMaterialForPo.sku} • Category: {selectedMaterialForPo.category}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '14px', textAlign: 'right' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d' }}>Current Available</div>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: '#dc2626' }}>
                    {selectedMaterialForPo.availableQty} {selectedMaterialForPo.unit}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#7f1d1d' }}>Safety Threshold</div>
                  <div className="mono" style={{ fontSize: '15px', fontWeight: 600, color: '#991b1b' }}>
                    {selectedMaterialForPo.minStock} {selectedMaterialForPo.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* PO Form Fields */}
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Approved OEM / Authorized Supplier</label>
                <CustomSelect 
                  value={poForm.supplierName}
                  onChange={(e) => handleSupplierSelect(e.target.value)}
                  options={PRESET_SUPPLIERS.map(s => ({ value: s.name, label: `${s.name} (${s.contact.split('(')[0].trim()})` }))}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  GSTIN: <strong>{poForm.supplierGstin}</strong> • Delivery Hub: {poForm.supplierAddress?.split(',')[0]}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Order Quantity ({selectedMaterialForPo.unit || 'PCS'})</label>
                <input 
                  type="number" 
                  className="form-control mono" 
                  min="1"
                  value={poForm.quantity}
                  onChange={(e) => setPoForm({ ...poForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Recommended deficit replenishment: {Math.max(1, (selectedMaterialForPo.minStock * 2) - selectedMaterialForPo.availableQty)} {selectedMaterialForPo.unit}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contracted Unit Rate (INR)</label>
                <input 
                  type="number" 
                  className="form-control mono" 
                  value={poForm.unitPrice}
                  onChange={(e) => setPoForm({ ...poForm, unitPrice: Math.max(0, parseFloat(e.target.value) || 0) })}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Exclusive of 18% GST
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lead Time / Delivery Window</label>
                <CustomSelect 
                  value={String(poForm.deliveryDays)}
                  onChange={(e) => setPoForm({ ...poForm, deliveryDays: parseInt(e.target.value) || 14 })}
                  options={[
                    { value: '7', label: '7 Days (Air Expedited Emergency)' },
                    { value: '14', label: '14 Days (Standard Priority)' },
                    { value: '21', label: '21 Days (Routine Batch Supply)' },
                    { value: '30', label: '30 Days (Scheduled Monthly Intake)' }
                  ]}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Requisition Urgency</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={poForm.priority}
                  readOnly 
                  style={{ background: 'var(--bg-surface-subtle)', fontWeight: 600 }}
                />
              </div>
            </div>

            {/* Commercial Calculation Summary */}
            <div style={{ 
              padding: '12px 16px', 
              background: 'var(--bg-surface-subtle)', 
              borderRadius: '6px', 
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Estimated Commercial Total</div>
                <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>
                  Subtotal: ₹{((Number(poForm.quantity) || 0) * (Number(poForm.unitPrice) || 0)).toLocaleString('en-IN')} + 18% GST
                </div>
              </div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)' }}>
                ₹{Math.round(((Number(poForm.quantity) || 0) * (Number(poForm.unitPrice) || 0)) * 1.18).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Procurement Specification & Notes</label>
              <textarea 
                className="form-control" 
                rows="2"
                value={poForm.notes}
                onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
              />
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
