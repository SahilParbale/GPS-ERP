import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import { WORK_ORDERS } from '../data/mockData';
import { 
  ArrowLeft, FileText, CheckCircle, Clock, ShieldCheck, 
  User, Printer, Check, Download, AlertCircle, Wrench,
  Users, ArrowRight
} from 'lucide-react';

export default function WorkOrderDetailScreen({ workOrder, onNavigate, onNotify }) {
  // Fallback to default detailed WO if not provided
  const wo = workOrder || WORK_ORDERS[0];
  const [activeTab, setActiveTab] = useState('operations');
  const [operations, setOperations] = useState(wo.operations || []);

  const handleAdvanceOperation = () => {
    onNotify(`Operation 4 (Studer Grinding) completed and advanced to Cleanroom Assembly`);
  };

  return (
    <div className="content-area">
      {/* Top Header with Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            onClick={() => onNotify(`Printing Shop Floor Job Traveler Sheet for ${wo.id}`)}
          >
            <Printer size={14} />
            <span>Print Traveler</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handleAdvanceOperation}
          >
            <Check size={14} />
            <span>Sign Off Active Op</span>
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
              <div className="mono" style={{ fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>{wo.progress}%</div>
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
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{wo.shopBay.split(' - ')[0]}</div>
          </div>
        </div>

        <div style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span>Overall Manufacturing Completion</span>
            <span className="mono">{wo.completedOps || 3} of {wo.totalOps || 8} Stages Complete</span>
          </div>
          <ProgressBar progress={wo.progress} height={8} />
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'operations', label: 'Manufacturing Operations & Routing', count: operations.length },
          { id: 'specs', label: 'Technical Specifications & Limits' },
          { id: 'bom', label: 'Bill of Materials (BOM)', count: wo.bom ? wo.bom.length : 6 },
          { id: 'team', label: 'Assigned Shop Technicians', count: wo.team ? wo.team.length : 5 },
          { id: 'docs', label: 'Engineering Documents', count: wo.documents ? wo.documents.length : 3 },
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
                  <tr key={op.id} style={{ background: op.status === 'In Progress' ? '#f0f9ff' : 'transparent' }}>
                    <td className="mono" style={{ fontWeight: 600 }}>OP-{op.id * 10}</td>
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
                          onClick={() => onNotify(`Sign-off completed for ${op.name}`)}
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
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>24,000 RPM</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Continuous S1 rating at 15 kW</div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Spindle Nose Taper Runout</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#0284c7', marginTop: '4px' }}>≤ 0.0010 mm (1.0 µm)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Measured with calibrated Mahr Federal air probe</div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dynamic Balancing Grade</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>ISO 1940 Grade G0.4</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Dual-plane balancing on Schenck rig</div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tool Clamping Retention Force</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>18.0 kN ± 1.0 kN</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>OTT-Jakob HSK-A63 gripper mechanism</div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bearing Arrangement</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>Front Ceramic Hybrid Triplex / Rear Duplex</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Preloaded P4S precision grade</div>
            </div>

            <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Thermal Stabilization Threshold</div>
              <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>≤ 18.0 °C Rise</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Water-glycol chilled continuous jacket</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Bill of Materials */}
      {activeTab === 'bom' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Bill of Materials Allocated for {wo.id}</div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part Number</th>
                  <th>Component Description</th>
                  <th>Allocated Qty</th>
                  <th>Batch / Heat Lot</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(wo.bom || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{item.partNo}</td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="mono">{item.qty} {item.unit}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{item.batch}</td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Team */}
      {activeTab === 'team' && (
        <div className="section-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div className="card-title">Shop Floor Personnel Assigned</div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('workforce')}
              title="Open Staff & Workforce Management Module"
            >
              <Users size={13} />
              <span>Live Staff & Workforce Board</span>
            </button>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            {(wo.team || []).map((member, idx) => (
              <div 
                key={idx} 
                style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'var(--transition-base)' }}
                onClick={() => onNavigate('workforce')}
                title="Click to view personnel allocation in Staff & Workforce"
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                  <User size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--primary)' }}>{member.role}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{member.bay}</div>
                </div>
                <ArrowRight size={14} color="var(--text-muted)" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Documents */}
      {activeTab === 'docs' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Engineering Drawings & Metrology Attachments</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(wo.documents || []).map((doc, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FileText size={20} color="#0284c7" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{doc.name}</div>
                    <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.size} • Uploaded {doc.date}</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNotify(`Downloading ${doc.name}`)}
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
