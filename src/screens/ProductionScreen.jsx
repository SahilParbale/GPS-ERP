import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import { 
  PRODUCTION_PIPELINE_STAGES, 
  WORK_ORDERS, 
  SHOP_BAYS 
} from '../data/mockData';
import { 
  Plus, Search, Filter, Eye, ArrowRight, Cog, 
  Wrench, Layers, Factory, Check 
} from 'lucide-react';

export default function ProductionScreen({ onNavigate, onSelectWorkOrder, onNotify }) {
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('table');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isNewWoOpen, setIsNewWoOpen] = useState(false);

  // Form state
  const [newWo, setNewWo] = useState({
    spindleModel: 'GPS-HSK-A63-24K',
    customer: 'Tata Advanced Systems Ltd',
    serial: 'GPS-2026-0850',
    priority: 'High',
    dueDate: '2026-03-20',
    initialStage: 'material'
  });

  const filteredOrders = WORK_ORDERS.filter((wo) => {
    const matchesStage = selectedStage === 'all' || wo.currentStage === selectedStage;
    const matchesPriority = priorityFilter === 'all' || wo.priority.toLowerCase() === priorityFilter.toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      wo.id.toLowerCase().includes(query) ||
      wo.spindleSerial.toLowerCase().includes(query) ||
      wo.customer.toLowerCase().includes(query) ||
      wo.spindleModel.toLowerCase().includes(query);
    return matchesStage && matchesPriority && matchesSearch;
  });

  const handleCreateWo = (e) => {
    e.preventDefault();
    setIsNewWoOpen(false);
    onNotify(`Work Order ${newWo.serial} generated successfully & routed to Bay 1`);
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Production Management & Shop Floor Operations" 
        subtitle="Live routing of precision spindles across 8 manufacturing stages"
        badge={`${WORK_ORDERS.length} Active Orders`}
      >
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
            <Factory size={16} color="#0F766E" />
            <span>Manufacturing Flow: Raw Stock to Final Metrology</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button" 
              className={`btn btn-sm ${selectedStage === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedStage('all')}
            >
              All Stages ({WORK_ORDERS.length})
            </button>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <PipelineVisualizer 
            stages={PRODUCTION_PIPELINE_STAGES} 
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
          { id: 'bays', label: 'Shop Floor Bays & Machine Cells', count: SHOP_BAYS.length },
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

              <select 
                className="form-control"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ minWidth: '140px' }}
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
              </select>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredOrders.length}</strong> of {WORK_ORDERS.length} work orders
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
                    <tr key={wo.id}>
                      <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', fontSize: '13px' }}>
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
                            onNavigate('work-order-detail');
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bay View */}
      {activeTab === 'bays' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {SHOP_BAYS.map((bay) => (
            <div key={bay.id} className="section-card">
              <div className="card-header" style={{ padding: '14px 18px' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-main)' }}>{bay.name}</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{bay.machine}</div>
                </div>
                <StatusBadge status={bay.status} />
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Lead Technician:</span>
                  <strong style={{ color: 'var(--text-main)' }}>{bay.operator}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Active Job:</span>
                  <span className="mono" style={{ color: 'var(--primary)', fontWeight: 600 }}>{bay.currentWo}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Station Utilization:</span>
                  <strong className="mono">{bay.utilization}</strong>
                </div>
                <div style={{ marginTop: '2px' }}>
                  <ProgressBar progress={parseInt(bay.utilization)} showLabel={false} height={7} />
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  style={{ marginTop: '4px', width: '100%', justifyContent: 'center' }}
                  onClick={() => onNotify(`Bay details opened: ${bay.name}`)}
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
          {PRODUCTION_PIPELINE_STAGES.map((stage, idx) => {
            const stageWos = WORK_ORDERS.filter(w => w.currentStage === stage.key);
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
                      key={wo.id}
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
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{wo.customer.split(' ')[0]}</div>
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{wo.shopBay.split(' - ')[0]}</span>
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
            <button type="button" className="btn btn-primary" onClick={handleCreateWo}>Launch Production Order</button>
          </>
        }
      >
        <form onSubmit={handleCreateWo}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Spindle Model Family</label>
              <select 
                className="form-control"
                value={newWo.spindleModel}
                onChange={(e) => setNewWo({...newWo, spindleModel: e.target.value})}
              >
                <option value="GPS-HSK-A63-24K">GPS-HSK-A63-24K (Motorized 24k)</option>
                <option value="GPS-BT40-15K">GPS-BT40-15K (Belt Milling 15k)</option>
                <option value="GPS-HF-60K">GPS-HF-60K (High Frequency 60k)</option>
                <option value="GPS-BT50-10K">GPS-BT50-10K (Heavy Geared 10k)</option>
                <option value="GPS-HSK-E25-42K">GPS-HSK-E25-42K (Micro High Speed)</option>
              </select>
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
              <select 
                className="form-control"
                value={newWo.priority}
                onChange={(e) => setNewWo({...newWo, priority: e.target.value})}
              >
                <option value="Normal">Normal Turnaround</option>
                <option value="High">High Priority</option>
                <option value="Critical">Critical Line-Down</option>
              </select>
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
    </div>
  );
}
