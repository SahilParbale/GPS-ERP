import React, { useState, useEffect, useCallback } from 'react';
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
import { purchaseOrderService } from '../services/database/purchaseOrderService';
import { 
  ArrowUpRight, AlertTriangle, Clock, Eye, 
  CheckCircle2, Plus, Download, RefreshCw, Loader2,
  AlertCircle, ShoppingCart, ExternalLink, ShieldCheck, Truck
} from 'lucide-react';

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

      if (onNotify) {
        onNotify(`Purchase Order ${poNum} successfully generated for ${selectedMaterialForPo.sku} (Total: ₹${total.toLocaleString('en-IN')})`);
      }

      setCriticalMaterials(prev => prev.map(m => 
        m.id === selectedMaterialForPo.id ? { ...m, status: 'PO Raised', reservedQty: (m.reservedQty || 0) + qty } : m
      ));

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
        dashboardService.getCriticalMaterials(5),
        dashboardService.getUpcomingDeliveries(4),
        dashboardService.getShopBayUtilization(4),
        dashboardService.getRecentActivityFeed(5)
      ]);

      if (metricsRes.error) {
        throw new Error(metricsRes.error.message || 'Failed to load KPI metrics');
      }

      setMetrics(metricsRes.data || []);
      setPipelineStages(pipelineRes.data || []);
      setWorkOrders(woRes.data || []);
      setTotalWoCount(woRes.totalCount || (woRes.data ? woRes.data.length : 0));
      setCriticalMaterials(materialsRes.data || []);
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

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => onNavigate && onNavigate('production')}
        >
          <Plus size={14} />
          <span>New Work Order</span>
        </button>
      </PageHeader>

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
  );
}
