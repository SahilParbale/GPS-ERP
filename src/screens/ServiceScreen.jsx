import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import { 
  SERVICE_PIPELINE_STAGES, 
  SERVICE_JOBS 
} from '../data/mockData';
import { 
  Plus, Search, Wrench, AlertTriangle, Clock, 
  CheckCircle, FileText, ArrowRight, Eye, Printer, ShieldAlert 
} from 'lucide-react';

export default function ServiceScreen({ onNavigate, onNotify }) {
  const [activeTab, setActiveTab] = useState('list');
  const [selectedJob, setSelectedJob] = useState(SERVICE_JOBS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogOpen, setIsLogOpen] = useState(false);

  const filteredJobs = SERVICE_JOBS.filter((job) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      job.id.toLowerCase().includes(q) ||
      job.spindleSerial.toLowerCase().includes(q) ||
      job.customer.toLowerCase().includes(q) ||
      job.complaint.toLowerCase().includes(q);
  });

  return (
    <div className="content-area">
      <PageHeader 
        title="Spindle Overhaul, Rebuilding & Service" 
        subtitle="Factory restoration and recalibration across the 9-stage service lifecycle"
        badge={`${SERVICE_JOBS.length} Under Repair`}
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={() => setIsLogOpen(true)}
        >
          <Plus size={14} />
          <span>Log Service Request</span>
        </button>
      </PageHeader>

      {/* 9-Stage Service Restoration Pipeline */}
      <div className="section-card">
        <div className="card-header">
          <div className="card-title">
            <Wrench size={16} color="#7A1F3D" />
            <span>9-Stage Spindle Restoration & Recalibration Pipeline</span>
          </div>
          <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Target Turnaround: &lt; 5 Working Days
          </span>
        </div>
        <div style={{ padding: '8px 16px' }}>
          <PipelineVisualizer 
            stages={SERVICE_PIPELINE_STAGES} 
            activeStage={selectedJob ? selectedJob.currentStage : 'repair'}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'list', label: 'Active Service & Repair Jobs', count: SERVICE_JOBS.length },
          { id: 'detail', label: `Service Case File: ${selectedJob.id}` },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Service Jobs List */}
      {activeTab === 'list' && (
        <div className="section-card">
          <div className="filter-bar">
            <div className="search-input-wrap">
              <Search size={14} className="search-icon" />
              <input 
                type="text" 
                className="form-control"
                placeholder="Search ticket, serial, customer..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Job Ticket</th>
                  <th>Spindle Serial</th>
                  <th>Customer</th>
                  <th>Customer Complaint / Symptoms</th>
                  <th>Assigned Specialist</th>
                  <th>Received Date</th>
                  <th>Est. Cost</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{job.id}</td>
                    <td className="mono" style={{ fontWeight: 500 }}>{job.spindleSerial}</td>
                    <td style={{ fontWeight: 500 }}>{job.customer}</td>
                    <td style={{ maxWidth: '280px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {job.complaint}
                    </td>
                    <td style={{ fontSize: '12px' }}>{job.technician}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{job.receivedDate}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{job.estimatedCost}</td>
                    <td><StatusBadge status={job.priority} size="sm" /></td>
                    <td><StatusBadge status={job.status} /></td>
                    <td>
                      <button 
                        type="button" 
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setActiveTab('detail');
                        }}
                      >
                        <Eye size={13} />
                        <span>Case File</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Service Detail (9-Step Deep Dive) */}
      {activeTab === 'detail' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="section-card">
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>{selectedJob.id}</h2>
                  <StatusBadge status={selectedJob.status} />
                  <StatusBadge status={selectedJob.priority} size="sm" />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                  Serial: <strong className="mono">{selectedJob.spindleSerial}</strong> • Customer: <strong>{selectedJob.customer}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNotify(`Diagnostic Report downloaded for ${selectedJob.id}`)}
                >
                  <FileText size={14} />
                  <span>Download Report</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={() => onNotify(`Advanced ${selectedJob.id} to Dynamic Balancing & Testing stage`)}
                >
                  <CheckCircle size={14} />
                  <span>Complete Rebuild Step</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Findings Grid */}
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Disassembly & Metrology Failure Analysis</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#b91c1c' }}>Spindle Taper & Journal Condition</div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
                    {selectedJob.findings?.taperCondition || "Severe fretting corrosion; runout at 0.0058 mm (limit: 0.0010 mm)."}
                  </div>
                </div>

                <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#b45309' }}>Bearing Raceways & Balls Inspection</div>
                  <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                    {selectedJob.findings?.bearingState || "Front ceramic hybrid bearings suffered coolant wash-out; raceway spalling."}
                  </div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>Drawbar Mechanism & Spring Pack</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedJob.findings?.drawbarForce || "Degraded to 13.8 kN due to cracked Belleville disc springs."}
                  </div>
                </div>
              </div>
            </div>

            {/* Complete 9-Stage Progress Timeline */}
            <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Service Restoration Milestones</h3>
              <div className="timeline">
                {(selectedJob.lifecycle || [
                  { name: "Complaint Logged", date: "Feb 21", done: true, note: "Initial ticket registered" },
                  { name: "Incoming Inspection", date: "Feb 21", done: true, note: "Air gauge check completed" },
                  { name: "Teardown & Diagnosis", date: "Feb 22", done: true, note: "Bearing balls pitted, seals worn" },
                  { name: "Cost Estimation", date: "Feb 22", done: true, note: "Approved by client" },
                  { name: "Repair & Regrinding", date: "Feb 24 - Active", done: false, active: true, note: "Fitting new FAG hybrid bearings" },
                  { name: "Dynamic Balancing & Run-in", date: "Scheduled", done: false, note: "Dual-plane G0.4 target" },
                  { name: "Final QC Certification", date: "Scheduled", done: false, note: "Nose runout ≤ 0.0010 mm check" },
                  { name: "Express Dispatch", date: "Scheduled", done: false, note: "Packaged for delivery" },
                ]).map((step, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className={`timeline-point ${step.done ? 'done' : step.active ? 'active' : ''}`} />
                    <div className="timeline-content">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="timeline-title">{step.name}</div>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{step.date}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {step.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Service Ticket Modal */}
      <Modal
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        title="Register Inward Spindle for Factory Service / Overhaul"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsLogOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => {
              setIsLogOpen(false);
              onNotify('Service ticket SR-2026-049 logged into system');
            }}>Create Service Order</button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Spindle Serial Number</label>
            <input type="text" className="form-control mono" defaultValue="GPS-2025-0740" />
          </div>
          <div className="form-group">
            <label className="form-label">Customer Company</label>
            <input type="text" className="form-control" defaultValue="Tata Advanced Systems Ltd" />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Customer Reported Issue / Failure Mode</label>
            <textarea className="form-control" rows={3} style={{ height: '70px', padding: '8px' }} defaultValue="Excessive temperature rise (>70°C) and axis servo trip during titanium milling." />
          </div>
          <div className="form-group">
            <label className="form-label">Urgency Priority</label>
            <select className="form-control">
              <option>Critical (Machine Line Down)</option>
              <option>High Priority</option>
              <option>Scheduled Maintenance</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Rebuild Tech</label>
            <select className="form-control">
              <option>Vikram Shinde (Sr. Spindle Specialist)</option>
              <option>Suresh Sawant (Master Grinder)</option>
              <option>Ramesh Deshmukh</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
