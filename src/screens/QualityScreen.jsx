import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import CustomSelect from '../components/common/CustomSelect';
import { qualityService } from '../services/database';
import { QualityScreenSkeleton } from '../components/common/Skeleton';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, CheckCircle2, XCircle, Printer, 
  UserCheck, AlertCircle, RefreshCw, Loader2, Edit3, 
  Check, Thermometer, Wrench, ShieldAlert
} from 'lucide-react';

export default function QualityScreen({ onNotify }) {
  const { role } = useAuth();
  const isAuthorizedToEdit = ['ADMIN', 'MANAGEMENT', 'QA_MGR'].includes(role);

  // Core Data States
  const [inspections, setInspections] = useState([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);

  // Async Lifecycle States
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState(null);

  // Edit Checkpoint Modal State
  const [editingParam, setEditingParam] = useState(null);
  const [editForm, setEditForm] = useState({
    measured_value: '',
    result_status: 'Pass',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // 1. Fetch live inspections list from Supabase
  const fetchInspections = useCallback(async (preserveSelectionId = null) => {
    setIsLoading(true);
    setError(null);

    const res = await qualityService.listInspections();
    if (res.error) {
      setError('Unable to load quality inspections. Please try again.');
      setIsLoading(false);
      return;
    }

    const records = res.data || [];
    setInspections(records);

    if (records.length > 0) {
      const targetId = preserveSelectionId && records.some(r => r.id === preserveSelectionId)
        ? preserveSelectionId
        : records[0].id;
      setSelectedInspectionId(targetId);
    } else {
      setSelectedInspectionId(null);
      setSelectedInspection(null);
    }

    setIsLoading(false);
  }, []);

  // Initial mount
  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // 2. Fetch selected inspection details with discrete parameter checkpoints
  const fetchInspectionDetail = useCallback(async (id) => {
    if (!id) return;
    setIsDetailLoading(true);

    const res = await qualityService.getInspectionWithResults(id);
    if (res.error) {
      if (onNotify) onNotify('Failed to load inspection checkpoints.');
      setIsDetailLoading(false);
      return;
    }

    setSelectedInspection(res.data);
    setIsDetailLoading(false);
  }, [onNotify]);

  useEffect(() => {
    if (selectedInspectionId) {
      fetchInspectionDetail(selectedInspectionId);
    }
  }, [selectedInspectionId, fetchInspectionDetail]);

  // 3. Switch selected inspection
  const handleSelectInspection = (id) => {
    setSelectedInspectionId(id);
  };

  // 4. Format required specification from nominal and tolerances
  const formatSpecification = (param) => {
    if (!param) return '—';
    const unit = param.unit_of_measure || '';
    if (param.tolerance_max !== null && param.tolerance_max !== undefined) {
      if (param.tolerance_min === 0 || param.tolerance_min === null) {
        return `≤ ${param.tolerance_max} ${unit}`;
      }
      return `${param.nominal_value} [${param.tolerance_min} to ${param.tolerance_max}] ${unit}`;
    }
    if (param.nominal_value !== null && param.nominal_value !== undefined) {
      return `${param.nominal_value} ${unit}`;
    }
    return 'Engineering Std';
  };

  // 5. Open Edit Checkpoint Modal
  const handleOpenEdit = (param) => {
    setEditingParam(param);
    setEditForm({
      measured_value: param.measured_value !== null && param.measured_value !== undefined ? String(param.measured_value) : '',
      result_status: param.result_status || 'Pass',
      notes: param.notes || ''
    });
    setFormError('');
  };

  // 6. Save Checkpoint Measurement
  const handleSaveMeasurement = async (e) => {
    e.preventDefault();
    if (!editingParam) return;

    const numVal = parseFloat(editForm.measured_value);
    if (isNaN(numVal)) {
      setFormError('Please enter a valid numeric measurement.');
      return;
    }

    setIsMutating(true);
    setFormError('');

    const res = await qualityService.updateInspectionResult(editingParam.id, {
      measured_value: numVal,
      result_status: editForm.result_status,
      notes: editForm.notes
    });

    if (res.error) {
      setFormError(res.error.message || 'Failed to update measurement.');
      setIsMutating(false);
      return;
    }

    // Refresh details to maintain 100% database sync
    await fetchInspectionDetail(selectedInspection.id);
    setIsMutating(false);
    setEditingParam(null);

    if (onNotify) {
      onNotify(`Measurement updated for "${editingParam.parameter_name}": ${numVal} ${editingParam.unit_of_measure || ''}`);
    }
  };

  // 7. Approve Inspection Workflow
  const handleApprove = async () => {
    if (!selectedInspection || isMutating) return;

    setIsMutating(true);
    const res = await qualityService.approveInspection(selectedInspection.id);

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Approval failed. Please check permissions.');
      setIsMutating(false);
      return;
    }

    // Refresh list and detail from database
    await fetchInspections(selectedInspection.id);
    await fetchInspectionDetail(selectedInspection.id);
    setIsMutating(false);

    const spindleSerial = selectedInspection.spindle?.serial_number || selectedInspection.inspection_number;
    if (onNotify) {
      onNotify(`QC Certificate approved and digitally signed by QA Lead for ${spindleSerial}`);
    }
  };

  // 8. Request Re-grind Rework Workflow
  const handleReject = async () => {
    if (!selectedInspection || isMutating) return;

    setIsMutating(true);
    const res = await qualityService.requestRework(selectedInspection.id);

    if (res.error) {
      if (onNotify) onNotify(res.error.message || 'Rework request failed. Please check permissions.');
      setIsMutating(false);
      return;
    }

    // Refresh list and detail from database
    await fetchInspections(selectedInspection.id);
    await fetchInspectionDetail(selectedInspection.id);
    setIsMutating(false);

    const spindleSerial = selectedInspection.spindle?.serial_number || selectedInspection.inspection_number;
    if (onNotify) {
      onNotify(`Spindle ${spindleSerial} flagged for rework at Bay 2 (Grinding)`);
    }
  };

  // 9. Print Calibration Certificate
  const handlePrint = () => {
    if (!selectedInspection) return;
    const spindleSerial = selectedInspection.spindle?.serial_number || selectedInspection.inspection_number;
    if (onNotify) {
      onNotify(`Full Calibration Certificate printed for ${spindleSerial}`);
    }
    window.print();
  };

  // Render Loading State
  if (isLoading) {
    return <QualityScreenSkeleton />;
  }

  // Render Error State with Retry
  if (error) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Quality Control & Metrology Acceptance" 
          subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
          badge="ISO 9001:2015 Standards"
        />
        <div className="section-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Database Connection Error</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px' }}>
            {error}
          </p>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => fetchInspections()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // Render Empty State
  if (!inspections || inspections.length === 0) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Quality Control & Metrology Acceptance" 
          subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
          badge="ISO 9001:2015 Standards"
        />
        <div className="section-card">
          <EmptyState 
            title="No quality inspections found"
            description="No metrology inspection records exist in the database yet. Generate inspections from completed assembly work orders."
            action={
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => fetchInspections()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  // Active Selected Inspection Record
  const currentInsp = selectedInspection || inspections[0];
  const parameters = currentInsp?.parameters || currentInsp?.results || [];
  const currentVerdict = currentInsp?.approval_status || 'Draft';
  const isApproved = currentVerdict === 'Approved';
  const isRejected = currentVerdict === 'Rejected';

  const spindleSerial = currentInsp.spindle?.serial_number || 'N/A';
  const spindleModel = currentInsp.spindle?.model?.model_name || currentInsp.spindle?.model?.model_code || 'Precision Spindle';
  const workOrderNo = currentInsp.work_order?.work_order_no || 'N/A';
  const inspectorName = currentInsp.inspector 
    ? `${currentInsp.inspector.first_name} ${currentInsp.inspector.last_name}`
    : 'Milind Joshi (Quality Assurance Lead)';

  return (
    <div className="content-area">
      <PageHeader 
        title="Quality Control & Metrology Acceptance" 
        subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
        badge="ISO 9001:2015 Standards"
      >
        {/* Inspection Selector Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          <label htmlFor="inspection-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            Inspection:
          </label>
          <CustomSelect 
            id="inspection-select"
            value={selectedInspectionId || ''}
            onChange={(e) => handleSelectInspection(e.target.value)}
            disabled={isMutating || isDetailLoading}
            searchable={true}
            style={{ minWidth: '280px' }}
            options={inspections.map((insp) => ({
              value: insp.id,
              label: `${insp.inspection_number} — ${insp.spindle?.serial_number || 'Spindle'} (${insp.approval_status})`,
              badge: insp.approval_status
            }))}
          />
        </div>

        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={handlePrint}
          disabled={isMutating}
        >
          <Printer size={14} />
          <span>Print Certificate</span>
        </button>

        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleApprove}
          disabled={isMutating || isApproved || !isAuthorizedToEdit}
          title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
        >
          {isMutating ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          <span>{isApproved ? 'Approved' : 'Approve Inspection'}</span>
        </button>
      </PageHeader>

      {/* Selected Inspection Certificate Card */}
      <div className="section-card">
        {/* Certificate Header Banner */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: '#ffffff', 
              padding: '4px 8px', 
              borderRadius: '5px', 
              border: '1px solid var(--border-color)', 
              flexShrink: 0 
            }}>
              <img 
                src="/logo.jpg" 
                alt="General Precision Spindles" 
                style={{ height: '36px', display: 'block', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {currentInsp.inspection_number || currentInsp.id}
                </span>
                <StatusBadge status={currentVerdict} />
                {currentInsp.overall_result && (
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: currentInsp.overall_result === 'Pass' ? '#ecfdf5' : '#fef2f2',
                    color: currentInsp.overall_result === 'Pass' ? '#047857' : '#b91c1c',
                    border: `1px solid ${currentInsp.overall_result === 'Pass' ? '#a7f3d0' : '#fecaca'}`
                  }}>
                    Result: {currentInsp.overall_result}
                  </span>
                )}
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Work Order: <strong className="mono">{workOrderNo}</strong>
                {currentInsp.work_order?.customer_name && (
                  <span> ({currentInsp.work_order.customer_name})</span>
                )}
                {' '}• Spindle Serial: <strong className="mono">{spindleSerial}</strong> • Model: <strong>{spindleModel}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {currentInsp.ambient_temp_celsius && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                  <Thermometer size={12} /> Ambient Temp
                </div>
                <div className="mono" style={{ fontWeight: 600 }}>{currentInsp.ambient_temp_celsius} °C</div>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inspection Date</div>
              <div className="mono" style={{ fontWeight: 600 }}>{currentInsp.inspection_date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certified Inspector</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{inspectorName}</div>
            </div>
          </div>
        </div>

        {/* Professional QC Parameters Table */}
        <div className="table-responsive">
          {isDetailLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Loader2 size={24} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading measurement parameters...</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Item</th>
                  <th>Metrology Parameter & Inspection Point</th>
                  <th>Required Drawing Specification</th>
                  <th>Actual Measured Value</th>
                  <th>Calibrated Test Equipment</th>
                  <th>Verdict</th>
                  {isAuthorizedToEdit && <th style={{ width: '80px', textAlign: 'center' }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {parameters.length === 0 ? (
                  <tr>
                    <td colSpan={isAuthorizedToEdit ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No discrete parameters recorded for this inspection yet.
                    </td>
                  </tr>
                ) : (
                  parameters.map((param, index) => {
                    const isPass = param.result_status === 'Pass';
                    const isWarning = param.result_status === 'Warning';
                    const badgeBg = isPass ? '#ecfdf5' : isWarning ? '#fffbeb' : '#fef2f2';
                    const badgeColor = isPass ? '#047857' : isWarning ? '#b45309' : '#b91c1c';
                    const badgeBorder = isPass ? '#a7f3d0' : isWarning ? '#fde68a' : '#fecaca';

                    return (
                      <tr key={param.id || index}>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {index < 9 ? `0${index + 1}` : index + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{param.parameter_name}</div>
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatSpecification(param)}
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {param.measured_value !== null && param.measured_value !== undefined 
                            ? `${param.measured_value} ${param.unit_of_measure || ''}`
                            : 'Pending'}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {param.notes || currentInsp.gauge_equipment_used || 'Calibrated Rig'}
                        </td>
                        <td>
                          <span style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '3px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px', 
                            fontWeight: 600,
                            background: badgeBg,
                            color: badgeColor,
                            border: `1px solid ${badgeBorder}`
                          }}>
                            {isPass ? <CheckCircle2 size={12} /> : isWarning ? <AlertCircle size={12} /> : <XCircle size={12} />}
                            {param.result_status || 'Pass'}
                          </span>
                        </td>
                        {isAuthorizedToEdit && (
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-icon"
                              onClick={() => handleOpenEdit(param)}
                              title="Edit measurement value"
                              disabled={isMutating}
                              style={{ padding: '4px 8px' }}
                            >
                              <Edit3 size={13} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Quality Approval Stamp Box */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid var(--border-color)', 
          background: 'var(--bg-surface-subtle)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '16px' 
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
              <UserCheck size={16} color="#059669" />
              <span>Inspector Notes & Sign-off Stamp</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '640px', lineHeight: 1.5 }}>
              {currentInsp.remarks || 'Dynamic balancing achieved ISO 1940 standard. Full-speed thermal run-in test verified within tolerance.'}
            </p>
            {currentInsp.gauge_equipment_used && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <Wrench size={12} />
                <span>Calibrated Rig: {currentInsp.gauge_equipment_used}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleReject}
              disabled={isMutating || isRejected || !isAuthorizedToEdit}
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
            >
              {isMutating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <XCircle size={14} />
              )}
              <span>{isRejected ? 'Rework Flagged' : 'Request Re-grind Rework'}</span>
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={isMutating || isApproved || !isAuthorizedToEdit}
              title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
            >
              {isMutating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              <span>{isApproved ? 'QA Certified & Released' : 'Digital QA Seal & Release'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Edit Measurement Checkpoint Modal */}
      <Modal
        isOpen={Boolean(editingParam)}
        onClose={() => setEditingParam(null)}
        title={`Edit Metrology Checkpoint — ${editingParam?.parameter_name || ''}`}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setEditingParam(null)}
              disabled={isMutating}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSaveMeasurement}
              disabled={isMutating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {isMutating ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
              <span>Save Measurement</span>
            </button>
          </div>
        }
      >
        {editingParam && (
          <form onSubmit={handleSaveMeasurement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {formError && (
              <div style={{ 
                padding: '10px 14px', 
                borderRadius: '6px', 
                background: '#fef2f2', 
                border: '1px solid #fecaca', 
                color: '#b91c1c', 
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <ShieldAlert size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Nominal Specification
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={`${editingParam.nominal_value ?? '—'} ${editingParam.unit_of_measure || ''}`} 
                  disabled 
                  style={{ background: 'var(--bg-surface-subtle)', fontWeight: 600 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                  Tolerance Band
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formatSpecification(editingParam)} 
                  disabled 
                  style={{ background: 'var(--bg-surface-subtle)', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label htmlFor="measured-value" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Actual Measured Value ({editingParam.unit_of_measure || ''}) *
                </label>
                <input 
                  id="measured-value"
                  type="number" 
                  step="any"
                  className="form-control mono" 
                  style={{ fontWeight: 700 }}
                  value={editForm.measured_value}
                  onChange={(e) => setEditForm(prev => ({ ...prev, measured_value: e.target.value }))}
                  required 
                  autoFocus
                />
              </div>

              <div>
                <label htmlFor="result-status" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                  Result Status *
                </label>
                <CustomSelect 
                  id="result-status"
                  value={editForm.result_status}
                  onChange={(e) => setEditForm(prev => ({ ...prev, result_status: e.target.value }))}
                  options={[
                    { value: 'Pass', label: 'Pass', badge: 'ACCEPT' },
                    { value: 'Warning', label: 'Warning', badge: 'WARN' },
                    { value: 'Fail', label: 'Fail', badge: 'REJECT' }
                  ]}
                />
              </div>
            </div>

            <div>
              <label htmlFor="instrument-notes" style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Calibrated Test Equipment / Inspector Notes
              </label>
              <input 
                id="instrument-notes"
                type="text" 
                className="form-control" 
                placeholder="e.g. Mahr Federal Air Gauge Probe"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
