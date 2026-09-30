import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import PipelineVisualizer from '../components/common/PipelineVisualizer';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { 
  serviceService, 
  assetService, 
  maintenanceService 
} from '../services/database';
import { TablePageSkeleton } from '../components/common/Skeleton';
import { exportServiceJobReportPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { SERVICE_PIPELINE_STAGES } from '../data/mockData';
import { 
  Plus, Search, Wrench, AlertTriangle, Clock, 
  CheckCircle, FileText, Eye, RefreshCw, AlertCircle, 
  ShieldAlert, Settings, Activity, CheckSquare, Download
} from 'lucide-react';

export default function ServiceScreen({ onNavigate, onNotify }) {
  const [activeTab, setActiveTab] = useState('list');
  const [serviceJobs, setServiceJobs] = useState([]);
  const [plantAssets, setPlantAssets] = useState([]);
  const [maintenanceOrders, setMaintenanceOrders] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // New Service Request Form State
  const [newRequest, setNewRequest] = useState({
    spindleSerial: 'GPS-2025-0740',
    customerCompany: 'Tata Advanced Systems Ltd',
    failureDescription: 'Excessive temperature rise (>70°C) and axis servo trip during titanium milling.',
    priority: 'Critical',
    technicianName: 'Vikram Shinde'
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [jobsRes, assetsRes, mntRes] = await Promise.all([
        serviceService.getServiceJobs(),
        assetService.getAssets(),
        maintenanceService.getMaintenanceOrders()
      ]);

      if (jobsRes.error) throw jobsRes.error;
      if (assetsRes.error) throw assetsRes.error;
      if (mntRes.error) throw mntRes.error;

      const jobs = jobsRes.data || [];
      setServiceJobs(jobs);
      if (jobs.length > 0) {
        setSelectedJob(prev => prev ? jobs.find(j => j.id === prev.id) || jobs[0] : jobs[0]);
      }
      setPlantAssets(assetsRes.data || []);
      setMaintenanceOrders(mntRes.data || []);
    } catch (err) {
      console.error('Failed to load service & maintenance data from live PostgreSQL:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateServiceRequest = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const res = await serviceService.createServiceRequest({
        serial_number: newRequest.spindleSerial,
        customer_name: newRequest.customerCompany,
        failure_description: newRequest.failureDescription,
        priority: newRequest.priority,
        status: 'Inward Assessment'
      });

      if (res.error) throw res.error;

      setIsLogOpen(false);
      if (onNotify) {
        onNotify(`Service ticket ${res.data?.sr_number || 'SR-2026'} logged into live database.`);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to log service ticket:', err);
      if (onNotify) {
        onNotify(err.message || 'Failed to create service ticket in database.', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdvanceStep = async () => {
    if (!selectedJob) return;
    try {
      const nextStageMap = {
        'Inward Inspection': 'Dismantle',
        'Dismantle': 'Decontamination',
        'Decontamination': 'Metrology Diagnostic',
        'Metrology Diagnostic': 'Bearing Replacement',
        'Bearing Replacement': 'Dynamic Balancing',
        'Dynamic Balancing': '4-Hour Thermal Run',
        '4-Hour Thermal Run': 'Final QC Sign-off',
        'Final QC Sign-off': 'Preservation Packing'
      };
      const nextStage = nextStageMap[selectedJob.currentStage] || 'Dynamic Balancing';
      const res = await serviceService.advanceServiceJobStage(selectedJob.dbId, nextStage, {
        findings: `Advanced rebuild stage to ${nextStage}`,
        actionsTaken: `Executed ${nextStage} procedure according to spindle overhaul SOP.`
      });

      if (res.error) throw res.error;

      if (onNotify) {
        onNotify(`Advanced ${selectedJob.id} to ${nextStage} stage.`);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to advance rebuild step:', err);
      if (onNotify) onNotify(err.message || 'Failed to advance stage', 'error');
    }
  };

  const handleCompleteRebuild = async () => {
    if (!selectedJob) return;
    try {
      const res = await serviceService.completeServiceJob(selectedJob.dbId, {
        taperRunoutFinal: 0.0008,
        balancingGrade: 'ISO G0.4',
        notes: 'Final QC sign-off complete. Nose taper runout ≤ 0.0008 mm, dynamically balanced.'
      });

      if (res.error) throw res.error;

      if (onNotify) {
        onNotify(`Completed rebuild and QC sign-off for ${selectedJob.id}.`);
      }
      await loadData();
    } catch (err) {
      console.error('Failed to complete rebuild:', err);
      if (onNotify) onNotify(err.message || 'Failed to complete rebuild', 'error');
    }
  };

  const handleCompleteMaintenance = async (orderId) => {
    try {
      const res = await maintenanceService.completeMaintenanceOrder(orderId, {
        actionsTaken: 'Routine preventive maintenance & sensor calibration completed.',
        maintenanceCost: 12000,
        downtimeHours: 1.5
      });
      if (res.error) throw res.error;
      if (onNotify) onNotify('Maintenance order completed and asset status restored to Active.');
      await loadData();
    } catch (err) {
      console.error('Failed to complete maintenance order:', err);
      if (onNotify) onNotify(err.message || 'Failed to complete maintenance order', 'error');
    }
  };

  const filteredJobs = serviceJobs.filter((job) => {
    const q = searchQuery.toLowerCase();
    return !q || 
      job.id.toLowerCase().includes(q) ||
      (job.spindleSerial && job.spindleSerial.toLowerCase().includes(q)) ||
      (job.customer && job.customer.toLowerCase().includes(q)) ||
      (job.complaint && job.complaint.toLowerCase().includes(q));
  });

  if (isLoading) {
    return <TablePageSkeleton columns={['100px', '140px', '160px', '220px', '120px', '90px', '80px', '70px']} rows={6} />;
  }

  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Spindle Overhaul, Rebuilding & Service" 
          subtitle="Factory restoration and recalibration across the 9-stage service lifecycle"
          badge="Database Notice"
        />
        <div className="content-body">
          <div className="section-card" style={{ padding: '40px', textAlign: 'center' }}>
            <AlertCircle size={32} color="#dc2626" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#dc2626', marginBottom: '8px' }}>
              {error.isRlsDenied ? 'Permission Denied (Row Level Security)' : 'Database Connection Notice'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px' }}>
              {error.message || 'Unable to load service and maintenance data from PostgreSQL.'}
            </p>
            <button type="button" className="btn btn-secondary" onClick={loadData}>
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
        title="Spindle Overhaul, Rebuilding & Service" 
        subtitle="Factory restoration and recalibration across the 9-stage service lifecycle"
        badge={`${serviceJobs.length} Under Repair`}
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

      <div className="content-body">

      {/* 9-Stage Service Restoration Pipeline Banner */}
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
            activeStage={selectedJob ? (selectedJob.currentStage === 'Preservation Packing' ? 'dispatch' : selectedJob.currentStage === 'Dynamic Balancing' ? 'balancing' : 'repair') : 'repair'}
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs 
        tabs={[
          { id: 'list', label: 'Active Service & Repair Jobs', count: serviceJobs.length },
          { id: 'detail', label: selectedJob ? `Case File: ${selectedJob.id}` : 'Case File' },
          { id: 'assets', label: 'Plant Assets Registry', count: plantAssets.length },
          { id: 'maintenance', label: 'Maintenance Orders', count: maintenanceOrders.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab 1: Service Jobs List */}
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
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan="10" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No active service or repair jobs match the search query.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Service Detail Case File */}
      {activeTab === 'detail' && selectedJob && (
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
                  Serial: <strong className="mono">{selectedJob.spindleSerial}</strong> • Customer: <strong>{selectedJob.customer}</strong> • Stage: <strong>{selectedJob.currentStage}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setPreviewDoc({
                      ...selectedJob,
                      type: 'Service Report',
                      id: selectedJob.id || 'SRV-2026-0041'
                    });
                    setIsPreviewOpen(true);
                  }}
                  title="Preview official overhaul & metrology diagnostics report (PDF)"
                >
                  <Download size={14} />
                  <span>Service Report (PDF)</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleAdvanceStep}
                >
                  <Wrench size={14} />
                  <span>Advance Pipeline Stage</span>
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  onClick={handleCompleteRebuild}
                >
                  <CheckCircle size={14} />
                  <span>Complete Rebuild Step</span>
                </button>
              </div>
            </div>

            {/* Diagnostic Findings Grid */}
            <div style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Disassembly & Metrology Diagnostic Overview</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                <div style={{ padding: '14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#b91c1c' }}>Spindle Taper & Runout Condition</div>
                  <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
                    Initial Runout: <span className="mono font-bold">{selectedJob.taperRunoutInitial ? `${selectedJob.taperRunoutInitial} mm` : '0.0058 mm'}</span> (Tolerance limit: 0.0010 mm).
                  </div>
                </div>

                <div style={{ padding: '14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#b45309' }}>Bearing Raceways & Balls Inspection</div>
                  <div style={{ fontSize: '12px', color: '#78350f', marginTop: '4px' }}>
                    {selectedJob.notes || "Front ceramic hybrid bearings suffered coolant wash-out; raceway spalling on #2 bearing."}
                  </div>
                </div>

                <div style={{ padding: '14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>Balancing & Dynamic Target</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Balancing Grade Target: <strong className="mono">{selectedJob.balancingGrade || 'ISO G0.4'}</strong>. Bearing Pack Lot: <strong className="mono">{selectedJob.bearingLot || 'LOT-FAG-2026-B88'}</strong>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Plant Assets Registry */}
      {activeTab === 'assets' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Settings size={16} color="#7A1F3D" />
              <span>Plant Machinery, Balancing Rigs & Metrology Assets</span>
            </div>
            <span className="badge badge-neutral mono">{plantAssets.length} Assets</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset Tag</th>
                  <th>Machine Name</th>
                  <th>Category</th>
                  <th>Bay Location</th>
                  <th>Purchase Date</th>
                  <th>Capital Cost</th>
                  <th>Calibration Cycle</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {plantAssets.map((ast) => (
                  <tr key={ast.id}>
                    <td className="mono font-bold text-primary">{ast.assetTag}</td>
                    <td style={{ fontWeight: 500 }}>{ast.name}</td>
                    <td><span className="badge badge-neutral">{ast.category}</span></td>
                    <td>{ast.bay}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{ast.purchaseDate}</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{ast.costFormatted}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{ast.calibrationCycleDays} Days</td>
                    <td><StatusBadge status={ast.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Maintenance Orders */}
      {activeTab === 'maintenance' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Activity size={16} color="#7A1F3D" />
              <span>Preventive, Breakdown & Calibration Maintenance Orders</span>
            </div>
            <span className="badge badge-neutral mono">{maintenanceOrders.length} Orders</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Machine Asset</th>
                  <th>Order Type</th>
                  <th>Scheduled Date</th>
                  <th>Assigned Tech</th>
                  <th>Downtime</th>
                  <th>Cost</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceOrders.map((mnt) => (
                  <tr key={mnt.id}>
                    <td className="mono font-bold text-primary">{mnt.orderNumber}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{mnt.assetName}</div>
                      <div className="mono text-muted" style={{ fontSize: '11px' }}>{mnt.assetTag}</div>
                    </td>
                    <td><span className="badge badge-neutral">{mnt.orderType}</span></td>
                    <td className="mono" style={{ fontSize: '12px' }}>{mnt.scheduledDate}</td>
                    <td style={{ fontSize: '12px' }}>{mnt.technician}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{mnt.downtimeHours} hrs</td>
                    <td className="mono" style={{ fontWeight: 600 }}>{mnt.costFormatted}</td>
                    <td><StatusBadge status={mnt.status} /></td>
                    <td>
                      {mnt.status !== 'Completed' ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCompleteMaintenance(mnt.dbId)}
                          title="Execute SOP and sign off maintenance order"
                        >
                          <CheckSquare size={13} />
                          <span>Complete</span>
                        </button>
                      ) : (
                        <span className="mono text-muted" style={{ fontSize: '11px' }}>Signed Off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <button type="button" className="btn btn-secondary" onClick={() => setIsLogOpen(false)} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleCreateServiceRequest} disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Service Order'}
            </button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Spindle Serial Number</label>
            <input 
              type="text" 
              className="form-control mono" 
              value={newRequest.spindleSerial}
              onChange={(e) => setNewRequest({ ...newRequest, spindleSerial: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Customer Company</label>
            <input 
              type="text" 
              className="form-control" 
              value={newRequest.customerCompany}
              onChange={(e) => setNewRequest({ ...newRequest, customerCompany: e.target.value })}
            />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Customer Reported Issue / Failure Mode</label>
            <textarea 
              className="form-control" 
              rows={3} 
              style={{ height: '70px', padding: '8px' }} 
              value={newRequest.failureDescription}
              onChange={(e) => setNewRequest({ ...newRequest, failureDescription: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Urgency Priority</label>
            <CustomSelect 
              value={newRequest.priority}
              onChange={(e) => setNewRequest({ ...newRequest, priority: e.target.value })}
              options={[
                { value: 'Critical', label: 'Critical (Machine Line Down)' },
                { value: 'High', label: 'High Priority' },
                { value: 'Medium', label: 'Scheduled Maintenance' },
                { value: 'Low', label: 'Low' }
              ]}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Rebuild Tech</label>
            <CustomSelect 
              value={newRequest.technicianName}
              onChange={(e) => setNewRequest({ ...newRequest, technicianName: e.target.value })}
              options={[
                { value: 'Vikram Shinde', label: 'Vikram Shinde (Sr. Spindle Specialist)' },
                { value: 'Suresh Sawant', label: 'Suresh Sawant (Master Grinder)' },
                { value: 'Ramesh Deshmukh', label: 'Ramesh Deshmukh' }
              ]}
            />
          </div>
        </div>
      </Modal>

      {/* Service Overhaul Report Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
      </div>
    </div>
  );
}
