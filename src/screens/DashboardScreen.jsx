import React, { useState, useEffect, useCallback } from 'react';
import MetricCard from '../components/common/MetricCard';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import PageHeader from '../components/common/PageHeader';
import { dashboardService } from '../services/database';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { 
  ArrowUpRight, AlertTriangle, Clock, Eye, 
  CheckCircle2, Plus, Download, RefreshCw, Loader2,
  AlertCircle
} from 'lucide-react';

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
          onClick={() => onNotify && onNotify('Production Shift Report downloaded (PDF)')}
        >
          <Download size={14} />
          <span>Shift Report</span>
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
                          <button 
                            type="button" 
                            className="btn btn-primary btn-sm"
                            onClick={() => onNotify && onNotify(`Purchase Requisition raised for ${item.sku}`)}
                          >
                            Raise PO
                          </button>
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
    </div>
  );
}
