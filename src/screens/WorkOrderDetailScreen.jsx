import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import { workOrderService } from '../services/database/workOrderService';
import { spindleModelService } from '../services/database/spindleModelService';
import { DetailScreenSkeleton } from '../components/common/Skeleton';
import { 
  ArrowLeft, FileText, CheckCircle, Clock, ShieldCheck, 
  User, Printer, Check, Download, AlertCircle, Wrench,
  Users, ArrowRight, RefreshCw
} from 'lucide-react';

export default function WorkOrderDetailScreen({ workOrder, onNavigate, onNotify }) {
  const [woData, setWoData] = useState(workOrder || null);
  const [operations, setOperations] = useState([]);
  const [bom, setBom] = useState([]);
  const [isLoading, setIsLoading] = useState(!workOrder);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [isSigningOff, setIsSigningOff] = useState(false);

  const loadWorkOrderDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let currentWo = workOrder;

    // If no workOrder provided via prop, fetch the first active one from live DB
    if (!currentWo) {
      const allRes = await workOrderService.getWorkOrders({ limit: 1 });
      if (allRes.error || !allRes.data?.[0]) {
        setError(allRes.error || { message: 'No work orders found in database' });
        setIsLoading(false);
        return;
      }
      currentWo = allRes.data[0];
    }

    // Fetch full details
    const woId = currentWo.dbId || currentWo.id;
    const [detailRes, itemsRes, bomRes] = await Promise.all([
      workOrderService.getWorkOrderById(woId),
      workOrderService.getWorkOrderItems(woId),
      spindleModelService.getSpindleComponents(currentWo.spindleSerial || 'GPS-2026-0842')
    ]);

    if (detailRes.error) {
      setError(detailRes.error);
      setIsLoading(false);
      return;
    }

    setWoData(detailRes.data || currentWo);
    setOperations(itemsRes.data || []);
    setBom(bomRes.data || []);
    setIsLoading(false);
  }, [workOrder]);

  useEffect(() => {
    loadWorkOrderDetail();
  }, [loadWorkOrderDetail]);

  const handleAdvanceOperation = async (targetOp = null) => {
    const activeOp = targetOp || operations.find(o => o.status === 'In Progress') || operations.find(o => o.status === 'Upcoming');
    if (!activeOp) {
      if (onNotify) onNotify('All operations for this work order are already signed off.');
      return;
    }

    setIsSigningOff(true);
    if (activeOp.dbId) {
      const res = await workOrderService.advanceWorkOrderItem(activeOp.dbId, 'Completed');
      if (res.error) {
        if (onNotify) onNotify(`Failed to advance operation: ${res.error.message}`);
        setIsSigningOff(false);
        return;
      }
    }

    if (onNotify) {
      onNotify(`Operation "${activeOp.name}" completed and signed off.`);
    }

    setIsSigningOff(false);
    await loadWorkOrderDetail();
  };

  // Loading State
  if (isLoading) {
    return <DetailScreenSkeleton />;
  }

  // Error State
  if (error || !woData) {
    return (
      <div className="content-area">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('production')}
          >
            <ArrowLeft size={14} />
            <span>Back to Production Board</span>
          </button>
        </div>
        <div className="section-card" style={{ padding: '32px 24px', borderLeft: '4px solid var(--danger, #dc2626)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Unable to Load Work Order Traveler
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {error?.sanitizedMessage || error?.message || 'The requested work order could not be retrieved from the live database.'}
              </p>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={loadWorkOrderDetail}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Retry Traveler</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wo = woData;
  const completedCount = operations.filter(o => o.status === 'Completed').length;
  const totalCount = operations.length || 8;
  const computedProgress = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="content-area">
      {/* Top Header with Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('production')}
        >
          <ArrowLeft size={14} />
          <span>Back to Production Board</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNotify && onNotify(`Printing Shop Floor Job Traveler Sheet for ${wo.id}`)}
          >
            <Printer size={14} />
            <span>Print Traveler</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => handleAdvanceOperation()}
            disabled={isSigningOff}
          >
            <Check size={14} />
            <span>{isSigningOff ? 'Signing Off...' : 'Sign Off Active Op'}</span>
          </button>
        </div>
      </div>

      {/* Main WO Info Card */}
      <div className="section-card">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '4px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
              <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '36px', display: 'block', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700 }} className="mono">{wo.id}</h1>
                <StatusBadge status={wo.status} />
                <StatusBadge status={wo.priority} size="sm" />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Precision Spindle Manufacturing Traveler • Customer: <strong>{wo.customer}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target Dispatch</div>
              <div className="mono" style={{ fontWeight: 600, fontSize: '14px' }}>{wo.dueDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Production Progress</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>{computedProgress}%</div>
            </div>
          </div>
        </div>

        {/* Quick Specs Highlight Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', background: 'var(--bg-surface-subtle)', padding: '12px 20px', gap: '12px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Spindle Serial</div>
            <div className="mono" style={{ fontWeight: 600, color: 'var(--text-main)' }}>{wo.spindleSerial}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Model Family</div>
            <div style={{ fontWeight: 600 }}>{wo.spindleModel}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tool Interface</div>
            <div style={{ fontWeight: 600 }}>{wo.specifications?.toolTaper || 'HSK-A63'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Rated RPM / Power</div>
            <div className="mono" style={{ fontWeight: 600 }}>{wo.specifications?.maxSpeed || '24,000 RPM'} • {wo.specifications?.ratedPower || '15 kW'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Active Machine Bay</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{wo.shopBay ? wo.shopBay.split(' - ')[0] : 'Bay 1'}</div>
          </div>
        </div>

        <div style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span>Overall Manufacturing Completion</span>
            <span className="mono">{completedCount} of {totalCount} Stages Complete</span>
          </div>
          <ProgressBar progress={computedProgress} height={8} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'operations', label: 'Manufacturing Operations & Routing', count: operations.length },
          { id: 'specs', label: 'Technical Specifications & Limits' },
          { id: 'bom', label: 'Bill of Materials (BOM)', count: bom.length },
          { id: 'team', label: 'Assigned Shop Technicians', count: 5 },
          { id: 'docs', label: 'Engineering Documents', count: 3 },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Operations Timeline & Routing */}
      {activeTab === 'operations' && (
        <div className="section-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Seq #</th>
                  <th>Manufacturing Operation Description</th>
                  <th>Machine Cell / Bay</th>
                  <th>Assigned Lead</th>
                  <th>Timestamp / Schedule</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {operations.map((op, idx) => (
                  <tr key={op.id || idx} style={{ background: op.status === 'In Progress' ? '#f0f9ff' : 'transparent' }}>
                    <td className="mono" style={{ fontWeight: 600 }}>OP-{(idx + 1) * 10}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{op.name}</div>
                    </td>
                    <td style={{ fontSize: '12px' }}>{op.machine}</td>
                    <td style={{ fontSize: '12px' }}>{op.operator}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{op.date}</td>
                    <td>
                      <StatusBadge status={op.status} />
                    </td>
                    <td>
                      {op.status === 'In Progress' ? (
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAdvanceOperation(op)}
                          disabled={isSigningOff}
                        >
                          Sign Off
                        </button>
                      ) : op.status === 'Completed' ? (
                        <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle size={14} /> Passed
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Queued</span>
                      )}
                    </td>
                  </tr>
                ))}
                {operations.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No routing operations found for this work order traveler.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Specifications Matrix */}
      {activeTab === 'specs' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Precision Manufacturing & Quality Acceptance Tolerances</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', padding: '20px' }}>
            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maximum Operational Speed</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {wo.specifications?.maxSpeed || '24,000 RPM'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Continuous S1 rating at {wo.specifications?.ratedPower || '15 kW'}
              </div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nose Taper Runout Tolerance</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                {wo.specifications?.taperRunoutLimit || '≤ 0.0010 mm'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Sub-micron dynamic air gauge verification
              </div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Drawbar Clamping Force</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {wo.specifications?.drawbarForce || '18.0 kN ± 1.0'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Hydraulic pressure sensor calibrated
              </div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dynamic Balancing Grade</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginTop: '4px' }}>
                ISO 1940 Grade G0.4
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Dual-plane Schenck balance specification
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Bill of Materials (BOM) */}
      {activeTab === 'bom' && (
        <div className="section-card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Component Description</th>
                  <th>Sub-Supplier / Source</th>
                  <th>Lot / Serial Number</th>
                  <th>Fitted Tolerance</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((item, idx) => (
                  <tr key={item.partNo || idx}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.partNo}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td style={{ fontSize: '12px' }}>{item.supplier || 'GPS Certified Supplier'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{item.batch}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{item.tolerance || '0.8 µm'}</td>
                    <td>
                      <StatusBadge status="Completed" size="sm" />
                    </td>
                  </tr>
                ))}
                {bom.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No BOM components fitted to this spindle yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Assigned Technicians Team */}
      {activeTab === 'team' && (
        <div className="section-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', padding: '20px' }}>
            {[
              { role: 'Production Lead', name: 'V. R. Kulkarni', bay: 'Management Cell' },
              { role: 'Machining Tech', name: 'Rajesh Patil', bay: 'Bay 1 CNC Turning' },
              { role: 'Master Grinder', name: 'Suresh Sawant', bay: 'Bay 2 Studer S33' },
              { role: 'Assembly Specialist', name: 'Vikram Shinde', bay: 'Bay 3 Clean Room' },
              { role: 'QC Engineer', name: 'Milind Joshi', bay: 'Bay 6 Metrology Lab' }
            ].map((member, idx) => (
              <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.role}</div>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>{member.bay}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'docs' && (
        <div className="section-card">
          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { name: `Approved CAD Manufacturing Drawing DWG-${wo.spindleModel}-REV4.pdf`, size: '4.8 MB', date: '15-Feb-2026' },
              { name: 'Heat Treatment Hardness & Microstructure Report.pdf', size: '1.2 MB', date: '24-Feb-2026' },
              { name: 'Studer In-Process Air Gauge Dial Inspection Sheet.pdf', size: '840 KB', date: '26-Feb-2026' }
            ].map((doc, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{doc.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.size} • Uploaded {doc.date}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNotify && onNotify(`Downloading engineering document: ${doc.name}`)}
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
