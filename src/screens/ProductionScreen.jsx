import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { PRODUCTION_PIPELINE_STAGES } from '../data/mockData';
import { workOrderService } from '../services/database/workOrderService';
import { manufacturingService } from '../services/database/manufacturingService';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportShiftReportPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { 
  Plus, Search, Filter, Eye, ArrowRight, Cog, 
  Wrench, Layers, Factory, Check, RefreshCw, AlertCircle, Download,
  Activity, Thermometer, Gauge, Zap, CheckCircle2, ShieldCheck, Clock
} from 'lucide-react';

export default function ProductionScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  const [workOrders, setWorkOrders] = useState([]);
  const [bays, setBays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('table');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isNewWoOpen, setIsNewWoOpen] = useState(false);
  const [isSubmittingWo, setIsSubmittingWo] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [inspectingBay, setInspectingBay] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);

  // Form state
  const [newWo, setNewWo] = useState({
    spindleModel: 'GPS-HSK-A63-24K',
    customer: 'Tata Advanced Systems Ltd',
    serial: 'GPS-2026-0850',
    priority: 'High',
    dueDate: '2026-03-20',
    initialStage: 'material'
  });

  const loadProductionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [wosRes, baysRes] = await Promise.all([
      workOrderService.getWorkOrders(),
      manufacturingService.getBayAssignments()
    ]);

    if (wosRes.error) {
      setError(wosRes.error);
      setIsLoading(false);
      return;
    }

    setWorkOrders(wosRes.data || []);
    setBays(baysRes.data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadProductionData();
  }, [loadProductionData]);

  // Dynamic pipeline stage counts based on live work orders
  const dynamicStages = PRODUCTION_PIPELINE_STAGES.map(stage => ({
    ...stage,
    count: workOrders.filter(w => (w.currentStage || '').toLowerCase() === stage.key.toLowerCase()).length
  }));

  const filteredOrders = workOrders.filter((wo) => {
    const matchesStage = selectedStage === 'all' || (wo.currentStage || '').toLowerCase() === selectedStage.toLowerCase();
    const matchesPriority = priorityFilter === 'all' || (wo.priority || '').toLowerCase() === priorityFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      (wo.id || '').toLowerCase().includes(query) ||
      (wo.spindleSerial || '').toLowerCase().includes(query) ||
      (wo.customer || '').toLowerCase().includes(query) ||
      (wo.spindleModel || '').toLowerCase().includes(query);
    return matchesStage && matchesPriority && matchesSearch;
  });

  const handleCreateWo = async (e) => {
    e.preventDefault();
    setIsSubmittingWo(true);
    const res = await workOrderService.createWorkOrder(newWo);
    setIsSubmittingWo(false);

    if (res.error) {
      if (onNotify) onNotify(`Failed to launch work order: ${res.error.message || 'Database error'}`);
      return;
    }

    setIsNewWoOpen(false);
    if (onNotify) {
      onNotify(`Work Order ${res.data?.id || newWo.serial} generated successfully & routed to Bay 1`);
    }
    await loadProductionData();
  };

  // Loading State
  if (isLoading) {
    return <TablePageSkeleton columns={['100px', '110px', '160px', '140px', '120px', '90px', '90px', '70px']} rows={7} />;
  }

  // Error State
  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Production Management & Shop Floor Operations" 
          subtitle="Live routing of precision spindles across 8 manufacturing stages"
        />
        <div className="section-card" style={{ padding: '32px 24px', borderLeft: '4px solid var(--danger, #dc2626)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Unable to Load Production Operations
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {error.sanitizedMessage || error.message || 'Database connection error. Please verify authorization.'}
              </p>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={loadProductionData}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Production Management & Shop Floor Operations" 
        subtitle="Live routing of precision spindles across 8 manufacturing stages"
        badge={`${workOrders.length} Active Orders`}
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => {
            setPreviewDoc({
              type: 'Report',
              reportTitle: 'SHOP FLOOR PRODUCTION SCHEDULE & ROUTING',
              id: `PROD-SCH-${new Date().toISOString().split('T')[0]}`,
              metrics: [
                { label: 'Active Work Orders', value: workOrders.length },
                { label: 'Critical Priority', value: workOrders.filter(w => w.priority === 'Critical').length },
                { label: 'In Assembly / Test', value: workOrders.filter(w => ['assembly', 'balancing', 'testing'].includes(w.stage)).length }
              ],
              headers: ['#', 'WO Number', 'Spindle Model & Serial', 'Customer', 'Current Stage / Cell', 'Target Due Date', 'Priority'],
              rows: workOrders.map((wo, idx) => [
                idx + 1,
                wo.id || wo.workOrderNumber,
                `${wo.spindleModel} (${wo.serial || '—'})`,
                wo.customer,
                wo.currentStage || wo.stage || 'In Progress',
                wo.dueDate || '—',
                wo.priority
              ])
            });
            setIsPreviewOpen(true);
          }}
        >
          <Download size={14} />
          <span>Production Schedule (PDF)</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setIsNewWoOpen(true)}
        >
          <Plus size={14} />
          <span>New Work Order</span>
        </button>
      </PageHeader>

      {/* Visual 8-Stage Interactive Pipeline */}
      <div className="section-card">
        <div className="card-header">
          <div className="card-title">
            <Factory size={16} color="#7A1F3D" />
            <span>Manufacturing Flow: Raw Stock to Final Metrology</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={`btn btn-sm ${selectedStage === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedStage('all')}
            >
              All Stages ({workOrders.length})
            </button>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <PipelineVisualizer 
            stages={dynamicStages} 
            activeStage={selectedStage === 'all' ? null : selectedStage}
            onSelectStage={(stageKey) => {
              setSelectedStage(stageKey === selectedStage ? 'all' : stageKey);
            }}
          />
        </div>
      </div>

      {/* Tabs: Table View vs Bay Stations vs Kanban */}
      <Tabs 
        tabs={[
          { id: 'table', label: 'Work Orders Directory', count: filteredOrders.length },
          { id: 'bays', label: 'Shop Floor Bays & Machine Cells', count: bays.length },
          { id: 'kanban', label: 'Stage Board Overview' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'table' && (
        <div className="section-card">
          {/* Filters Bar */}
          <div className="filter-bar" style={{ padding: '12px 20px' }}>
            <div className="filter-group" style={{ gap: '12px' }}>
              <div className="search-input-wrap">
                <Search size={14} className="search-icon" />
                <input 
                  type="text" 
                  className="form-control"
                  placeholder="Filter by WO, Serial, Customer..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ minWidth: '260px' }}
                />
              </div>

              <CustomSelect 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ minWidth: '150px' }}
                options={[
                  { value: 'all', label: 'All Priorities' },
                  { value: 'critical', label: 'Critical' },
                  { value: 'high', label: 'High' },
                  { value: 'medium', label: 'Medium / Normal' },
                  { value: 'low', label: 'Low' }
                ]}
              />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredOrders.length}</strong> of {workOrders.length} work orders
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: '1360px' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px', minWidth: '130px' }}>WO Number</th>
                  <th style={{ width: '135px', minWidth: '135px' }}>Spindle Serial</th>
                  <th style={{ width: '150px', minWidth: '150px' }}>Model Family</th>
                  <th style={{ width: '200px', minWidth: '200px' }}>Customer</th>
                  <th style={{ width: '220px', minWidth: '220px' }}>Current Bay & Machine</th>
                  <th style={{ width: '180px', minWidth: '180px' }}>Lead Operator</th>
                  <th style={{ width: '100px', minWidth: '100px' }}>Priority</th>
                  <th style={{ width: '120px', minWidth: '120px' }}>Target Due Date</th>
                  <th style={{ width: '140px', minWidth: '140px' }}>Progress</th>
                  <th style={{ width: '115px', minWidth: '115px' }}>Status</th>
                  <th style={{ width: '90px', minWidth: '90px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((wo) => {
                  const bayParts = wo.shopBay ? wo.shopBay.split(' - ') : [wo.shopBay, ''];
                  const opName = wo.assignedOperator ? wo.assignedOperator.replace(/\s*\(.*\)/, '').trim() : '';
                  const opRole = wo.assignedOperator && wo.assignedOperator.includes('(') 
                    ? wo.assignedOperator.match(/\((.*?)\)/)?.[1] 
                    : null;

                  return (
                    <tr key={wo.id || wo.dbId}>
                      <td 
                        className="mono" 
                        style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '13px', cursor: 'pointer' }}
                        onClick={() => {
                          if (onSelectWorkOrder) onSelectWorkOrder(wo);
                          if (onNavigate) onNavigate('work-order-detail');
                        }}
                        title={`Open Traveler for ${wo.id || wo.workOrderNo}`}
                      >
                        {wo.id}
                      </td>
                      <td className="mono" style={{ fontWeight: 500, whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {wo.spindleSerial}
                      </td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 500, fontSize: '12px' }}>
                        {wo.spindleModel}
                      </td>
                      <td>
                        <div style={{ fontWeight: 500, fontSize: '12.5px', color: 'var(--text-main)', lineHeight: 1.35 }}>
                          {wo.customer}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            width: 'fit-content',
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            backgroundColor: 'var(--primary-light)', 
                            color: 'var(--primary)', 
                            fontSize: '11px', 
                            fontWeight: 700 
                          }}>
                            {bayParts[0]}
                          </span>
                          {bayParts[1] && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                              {bayParts[1]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>
                            {opName}
                          </div>
                          {opRole && (
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {opRole}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <StatusBadge status={wo.priority} size="sm" />
                      </td>
                      <td className="mono" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {wo.dueDate}
                      </td>
                      <td>
                        <div style={{ minWidth: '120px' }}>
                          <ProgressBar progress={wo.progress} />
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <StatusBadge status={wo.status} />
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 12px', gap: '5px' }}
                          onClick={() => {
                            if (onSelectWorkOrder) onSelectWorkOrder(wo);
                            if (onNavigate) onNavigate('work-order-detail');
                          }}
                          title={`View Job Traveler for ${wo.id || wo.workOrderNo}`}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                      No active work orders matching the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shop Floor Bays Tab */}
      {activeTab === 'bays' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {bays.map((bay) => (
            <div key={bay.id || bay.bayId} className="section-card" style={{ marginBottom: 0 }}>
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{bay.bayName}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{bay.machine}</div>
                </div>
                <StatusBadge status={bay.status} size="sm" />
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Operator:</span>
                  <strong>{bay.assignedStaff}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Job:</span>
                  <span className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{bay.workOrder}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Spindle Serial:</span>
                  <span className="mono" style={{ fontWeight: 600 }}>{bay.spindleSerial}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Current Operation:</span>
                  <span style={{ fontWeight: 500 }}>{bay.operation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Cell Utilization:</span>
                  <strong className="mono">{bay.utilization}%</strong>
                </div>
                <div style={{ marginTop: '2px' }}>
                  <ProgressBar progress={bay.utilization} showLabel={false} height={7} />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                  onClick={() => setInspectingBay(bay)}
                  title={`Inspect live sensor telemetry for ${bay.bayName}`}
                >
                  <Wrench size={13} />
                  <span>Inspect Bay Telemetry</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Kanban Board View */}
      {activeTab === 'kanban' && (
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px', minWidth: 0 }}>
          {dynamicStages.map((stage, idx) => {
            const stageWos = workOrders.filter(w => (w.currentStage || '').toLowerCase() === stage.key.toLowerCase());
            return (
              <div 
                key={stage.key} 
                style={{ 
                  minWidth: '240px', 
                  width: '240px', 
                  flexShrink: 0, 
                  background: 'var(--bg-surface)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '14px',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '10.5px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-muted)' }}>0{idx + 1}</span>
                    <strong style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-main)', letterSpacing: '0.03em' }}>{stage.name}</strong>
                  </div>
                  <span className="nav-badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>{stageWos.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {stageWos.map((wo) => (
                    <div 
                      key={wo.id || wo.dbId}
                      style={{
                        background: '#ffffff',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                      onClick={() => {
                        if (onSelectWorkOrder) onSelectWorkOrder(wo);
                        onNavigate('work-order-detail');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono" style={{ fontWeight: 600, color: 'var(--primary)', fontSize: '12px' }}>{wo.id}</span>
                        <StatusBadge status={wo.priority} size="sm" />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, marginTop: '6px', color: 'var(--text-main)' }}>{wo.spindleModel}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{(wo.customer || '').split(' ')[0]}</div>
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{(wo.shopBay || '').split(' - ')[0]}</span>
                        <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>{wo.progress}%</span>
                      </div>
                    </div>
                  ))}
                  {stageWos.length === 0 && (
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                      No Active Work Orders
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Work Order Modal */}
      <Modal
        isOpen={isNewWoOpen}
        onClose={() => setIsNewWoOpen(false)}
        title="Initialize New Spindle Work Order"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsNewWoOpen(false)}>Cancel</button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleCreateWo}
              disabled={isSubmittingWo}
            >
              {isSubmittingWo ? 'Launching...' : 'Launch Production Order'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateWo}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Spindle Model Family</label>
              <CustomSelect 
                value={newWo.spindleModel}
                onChange={(e) => setNewWo({...newWo, spindleModel: e.target.value})}
                options={[
                  { value: 'GPS-HSK-A63-24K', label: 'GPS-HSK-A63-24K (Motorized 24k)' },
                  { value: 'GPS-BT40-15K', label: 'GPS-BT40-15K (Belt Milling 15k)' },
                  { value: 'GPS-HF-60K', label: 'GPS-HF-60K (High Frequency 60k)' },
                  { value: 'GPS-BT50-10K', label: 'GPS-BT50-10K (Heavy Geared 10k)' },
                  { value: 'GPS-HSK-E25-42K', label: 'GPS-HSK-E25-42K (Micro High Speed)' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Spindle Serial Number</label>
              <input 
                type="text" 
                className="form-control mono"
                value={newWo.serial}
                onChange={(e) => setNewWo({...newWo, serial: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Customer Organization</label>
              <input 
                type="text" 
                className="form-control"
                value={newWo.customer}
                onChange={(e) => setNewWo({...newWo, customer: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Manufacturing Priority</label>
              <CustomSelect 
                value={newWo.priority}
                onChange={(e) => setNewWo({...newWo, priority: e.target.value})}
                options={[
                  { value: 'Medium', label: 'Medium / Normal' },
                  { value: 'High', label: 'High Priority' },
                  { value: 'Critical', label: 'Critical Line-Down' },
                  { value: 'Low', label: 'Low Priority' }
                ]}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Dispatch Date</label>
              <input 
                type="date" 
                className="form-control mono"
                value={newWo.dueDate}
                onChange={(e) => setNewWo({...newWo, dueDate: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Shop Cell</label>
              <input 
                type="text" 
                className="form-control" 
                value="Bay 1 - Bar Stock & Okuma CNC" 
                disabled 
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Inspect Bay Telemetry Modal */}
      {inspectingBay && (
        <Modal
          isOpen={true}
          onClose={() => setInspectingBay(null)}
          title={`Shop Floor Cell Telemetry: ${inspectingBay.bayName}`}
          maxWidth="780px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setInspectingBay(null)}
              >
                Close Telemetry
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setIsCalibrating(true);
                    setTimeout(() => {
                      setIsCalibrating(false);
                      if (onNotify) onNotify(`Sensors recalibrated for ${inspectingBay.bayName}. Drift: <0.02 µm.`);
                    }, 800);
                  }}
                  disabled={isCalibrating}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <RefreshCw size={13} className={isCalibrating ? 'spin' : ''} />
                  <span>{isCalibrating ? 'Calibrating...' : 'Zero Sensor Gauges'}</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={() => {
                    const matchingWo = workOrders.find(w => w.id === inspectingBay.workOrder || w.workOrderNo === inspectingBay.workOrder);
                    const targetWo = matchingWo || {
                      id: inspectingBay.workOrder,
                      spindleSerial: inspectingBay.spindleSerial,
                      spindleModel: 'GPS-HSK-A63-24K',
                      customer: 'Tata Advanced Systems Ltd',
                      shopBay: inspectingBay.bayName,
                      assignedOperator: inspectingBay.assignedStaff,
                      status: 'In Progress',
                      priority: 'High',
                      dueDate: '2026-03-25',
                      progress: inspectingBay.progress || 75
                    };
                    if (onSelectWorkOrder) onSelectWorkOrder(targetWo);
                    setInspectingBay(null);
                    if (onNavigate) onNavigate('work-order-detail');
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Eye size={14} />
                  <span>View Traveler ({inspectingBay.workOrder})</span>
                </button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header Telemetry Status Card */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              flexWrap: 'wrap', 
              gap: '12px',
              padding: '12px 16px',
              background: 'var(--bg-surface-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{inspectingBay.machine}</span>
                  <StatusBadge status={inspectingBay.status} size="sm" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Operator: <strong>{inspectingBay.assignedStaff}</strong> • Station: <strong>{inspectingBay.bayId?.toUpperCase()}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cell Utilization</div>
                <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: inspectingBay.utilization > 100 ? '#dc2626' : 'var(--primary)' }}>
                  {inspectingBay.utilization}%
                </div>
              </div>
            </div>

            {/* Active Job Card */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: '10px',
              padding: '12px 14px',
              background: 'var(--bg-surface)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Production Job</div>
                <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                  {inspectingBay.workOrder}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Spindle Serial</div>
                <div className="mono" style={{ fontWeight: 600, fontSize: '13px' }}>
                  {inspectingBay.spindleSerial}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Manufacturing Operation</div>
                <div style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--text-main)' }}>
                  {inspectingBay.operation}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shift Elapsed</div>
                <div className="mono" style={{ fontWeight: 500, fontSize: '12.5px' }}>
                  {inspectingBay.duration || '2h 15m'} (Started {inspectingBay.started || '08:30 AM'})
                </div>
              </div>
            </div>

            {/* Live Sensor Gauges Matrix */}
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={14} color="var(--primary)" />
                <span>Live Real-Time Sensor Telemetry Channels</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                {/* 1. Spindle Temperature */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Thermometer size={13} color="#f59e0b" /> Bearing Front Temp
                    </span>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Nominal</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                    23.8 °C
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Ambient: 22.0 °C • Rise: +1.8 °C
                  </div>
                </div>

                {/* 2. Vibration Severity */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={13} color="#3b82f6" /> Vibration (FFT RMS)
                    </span>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>ISO Class A</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                    0.26 mm/s
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Warning limit: 0.45 mm/s
                  </div>
                </div>

                {/* 3. Coolant Pressure */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Gauge size={13} color="#06b6d4" /> Coolant Circuit
                    </span>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Stable</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                    4.6 bar
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Flow: 14.2 L/min @ 18.5 °C
                  </div>
                </div>

                {/* 4. Air Purge Pressure */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={13} color="#10b981" /> Seal Air Purge
                    </span>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>Protected</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                    2.4 bar
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Triple labyrinth positive pressure
                  </div>
                </div>

                {/* 5. Motor Load */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={13} color="#8b5cf6" /> Spindle Drive Load
                    </span>
                    <span style={{ fontSize: '10px', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>52% Load</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: 'var(--text-main)' }}>
                    7.8 kW
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Rated: 15.0 kW (S1 continuous)
                  </div>
                </div>

                {/* 6. Dynamic Runout (TIR) */}
                <div style={{ padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} color="#059669" /> Dynamic Runout (TIR)
                    </span>
                    <span style={{ fontSize: '10px', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>In Spec</span>
                  </div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: '#059669' }}>
                    0.65 µm
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Max allowable: ≤ 1.0 µm
                  </div>
                </div>
              </div>
            </div>

            {/* Metrology & Calibration Log */}
            <div style={{ 
              padding: '12px 14px', 
              background: 'var(--bg-surface-subtle)', 
              borderRadius: '6px', 
              fontSize: '12px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div>
                <strong>Sensor Calibration Certificate:</strong> ISO/IEC 17025 Compliant • Valid until <strong>30-Apr-2026</strong>
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                Sample Rate: <strong>1,000 Hz Live Stream</strong>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Production Schedule Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
