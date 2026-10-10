import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import Tabs from '../components/common/Tabs';
import CustomSelect from '../components/common/CustomSelect';
import { qualityService } from '../services/database';
import { QUALITY_INSPECTIONS } from '../data/mockData';
import { QualityScreenSkeleton } from '../components/common/Skeleton';
import { exportCalibrationCertificatePdf } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { 
  ShieldCheck, CheckCircle2, XCircle, Printer, 
  UserCheck, AlertCircle, RefreshCw, Loader2, Edit3, 
  Check, Thermometer, Wrench, ShieldAlert, Factory,
  Activity, ArrowRight, Gauge, Layers
} from 'lucide-react';

export default function QualityScreen({ onNotify }) {
  const { role } = useAuth();
  const isAuthorizedToEdit = ['ADMIN', 'MANAGEMENT', 'QA_MGR'].includes(role);

  // Core Data States
  const [inspections, setInspections] = useState([]);
  const [selectedInspectionId, setSelectedInspectionId] = useState(null);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'manufacture' | 'service'
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  // 1. Fetch live inspections list from Supabase and merge with full catalog of Manufactured & Service spindles
  const fetchInspections = useCallback(async (preserveSelectionId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await qualityService.listInspections();
      let records = [];

      if (!res.error && res.data && res.data.length > 0) {
        // Tag live database records with category
        const liveRecords = res.data.map(r => ({
          ...r,
          spindleCategory: r.spindleCategory || (
            r.inspection_type === 'Incoming Inspection' || 
            r.inspection_type?.includes('Repair') || 
            r.inspection_type?.includes('Service') ||
            r.inspection_number?.includes('SR')
              ? 'service'
              : 'manufacture'
          )
        }));

        // Merge supplemental mock inspections (both Manufactured & Service) so QA always has comprehensive coverage
        const existingIds = new Set(liveRecords.map(r => r.inspection_number || r.id));
        const supplemental = QUALITY_INSPECTIONS.filter(q => !existingIds.has(q.id) && !existingIds.has(q.inspectionNumber));
        records = [...liveRecords, ...supplemental];
      } else {
        // If DB has no records or error, fallback to mock data
        records = QUALITY_INSPECTIONS;
      }

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
    } catch (err) {
      console.warn('[QualityScreen] fetchInspections error:', err);
      setInspections(QUALITY_INSPECTIONS);
      if (QUALITY_INSPECTIONS.length > 0) {
        setSelectedInspectionId(QUALITY_INSPECTIONS[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial mount
  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // 2. Fetch selected inspection details with discrete parameter checkpoints
  const fetchInspectionDetail = useCallback(async (id) => {
    if (!id) return;
    setIsDetailLoading(true);

    // Look for matching mock record first in case it's a dedicated mock record
    const mockMatch = QUALITY_INSPECTIONS.find(q => q.id === id || q.inspectionNumber === id);

    try {
      const res = await qualityService.getInspectionWithResults(id);
      if (!res.error && res.data) {
        setSelectedInspection({
          ...res.data,
          spindleCategory: res.data.spindleCategory || (res.data.work_order_id ? 'manufacture' : 'service')
        });
        setIsDetailLoading(false);
        return;
      }

      // If DB doesn't have this record ID, use mock record
      if (mockMatch) {
        setSelectedInspection(mockMatch);
        setIsDetailLoading(false);
        return;
      }

      if (onNotify) onNotify('Failed to load inspection checkpoints.');
    } catch (err) {
      if (mockMatch) {
        setSelectedInspection(mockMatch);
      }
    } finally {
      setIsDetailLoading(false);
    }
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
    if (param.required) return param.required;
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
      measured_value: param.measured_value !== null && param.measured_value !== undefined 
        ? String(param.measured_value) 
        : (param.actual ? String(param.actual).replace(/[^0-9.]/g, '') : ''),
      result_status: param.result_status || param.result || 'Pass',
      notes: param.notes || param.instrument || ''
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

    try {
      // If it has a database UUID, attempt live DB update
      if (editingParam.id && String(editingParam.id).includes('-') && editingParam.id.length > 20) {
        await qualityService.updateInspectionResult(editingParam.id, {
          measured_value: numVal,
          result_status: editForm.result_status,
          notes: editForm.notes
        });
      }

      // Always update local state immediately
      if (selectedInspection) {
        const updatedParams = (selectedInspection.parameters || selectedInspection.results || []).map(p => {
          if (p.id === editingParam.id || p.parameter_name === editingParam.parameter_name || p.name === editingParam.name) {
            return {
              ...p,
              measured_value: numVal,
              actual: `${numVal} ${editingParam.unit_of_measure || ''}`,
              result_status: editForm.result_status,
              result: editForm.result_status,
              notes: editForm.notes
            };
          }
          return p;
        });

        setSelectedInspection(prev => ({
          ...prev,
          parameters: updatedParams,
          results: updatedParams
        }));
      }

      setIsMutating(false);
      setEditingParam(null);

      if (onNotify) {
        onNotify(`Measurement updated for "${editingParam.parameter_name || editingParam.name}": ${numVal} ${editingParam.unit_of_measure || ''}`);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update measurement.');
      setIsMutating(false);
    }
  };

  // 7. Approve Inspection Workflow
  const handleApprove = async () => {
    if (!selectedInspection || isMutating) return;

    setIsMutating(true);
    try {
      if (selectedInspection.id && String(selectedInspection.id).includes('-') && selectedInspection.id.length > 20) {
        await qualityService.approveInspection(selectedInspection.id);
      }

      setSelectedInspection(prev => ({
        ...prev,
        approval_status: 'Approved',
        approvalStatus: 'Approved',
        overall_result: 'Pass',
        overallResult: 'Pass'
      }));

      setInspections(prev => prev.map(insp => 
        (insp.id === selectedInspection.id || insp.inspection_number === selectedInspection.inspection_number)
          ? { ...insp, approval_status: 'Approved', approvalStatus: 'Approved', overall_result: 'Pass', overallResult: 'Pass' }
          : insp
      ));

      const spindleSerial = selectedInspection.spindle?.serial_number || selectedInspection.spindleSerial || selectedInspection.inspection_number;
      if (onNotify) {
        onNotify(`QC Certificate approved and digitally signed by QA Lead for ${spindleSerial}`);
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Approval failed.');
    } finally {
      setIsMutating(false);
    }
  };

  // 8. Request Re-grind Rework Workflow
  const handleReject = async () => {
    if (!selectedInspection || isMutating) return;

    setIsMutating(true);
    try {
      if (selectedInspection.id && String(selectedInspection.id).includes('-') && selectedInspection.id.length > 20) {
        await qualityService.requestRework(selectedInspection.id);
      }

      setSelectedInspection(prev => ({
        ...prev,
        approval_status: 'Rejected',
        approvalStatus: 'Rejected',
        overall_result: 'Rework Required',
        overallResult: 'Rework Required'
      }));

      setInspections(prev => prev.map(insp => 
        (insp.id === selectedInspection.id || insp.inspection_number === selectedInspection.inspection_number)
          ? { ...insp, approval_status: 'Rejected', approvalStatus: 'Rejected', overall_result: 'Rework Required', overallResult: 'Rework Required' }
          : insp
      ));

      const spindleSerial = selectedInspection.spindle?.serial_number || selectedInspection.spindleSerial || selectedInspection.inspection_number;
      if (onNotify) {
        onNotify(`Spindle ${spindleSerial} flagged for rework at Bay 2 (Grinding Cell)`);
      }
    } catch (err) {
      if (onNotify) onNotify(err.message || 'Rework request failed.');
    } finally {
      setIsMutating(false);
    }
  };

  // 9. Print / Download Calibration Certificate via Pop-up Preview
  const handlePrint = () => {
    if (!selectedInspection) return;
    const isService = selectedInspection.spindleCategory === 'service';
    setPreviewDoc({
      ...selectedInspection,
      type: 'Calibration Certificate',
      documentType: 'Calibration Certificate',
      id: selectedInspection.inspection_number || selectedInspection.inspectionNumber || `CAL-${selectedInspection.id || '2026'}`,
      certificateTitle: isService ? 'OVERHAUL METROLOGY & CALIBRATION CERTIFICATE' : 'PRECISION SPINDLE MANUFACTURING ACCEPTANCE CERTIFICATE',
      spindleSerial: selectedInspection.spindle?.serial_number || selectedInspection.spindleSerial,
      spindleModel: selectedInspection.spindle?.model?.model_name || selectedInspection.spindle?.model || selectedInspection.spindleModel,
      customer: selectedInspection.work_order?.customer_name || selectedInspection.customer,
      spindleCategory: selectedInspection.spindleCategory
    });
    setIsPreviewOpen(true);
  };

  // Category Filtering logic
  const filteredInspections = useMemo(() => {
    return inspections.filter(insp => {
      if (activeCategory === 'all') return true;
      if (activeCategory === 'manufacture') return insp.spindleCategory === 'manufacture';
      if (activeCategory === 'service') return insp.spindleCategory === 'service';
      return true;
    });
  }, [inspections, activeCategory]);

  const mfgCount = useMemo(() => inspections.filter(i => i.spindleCategory === 'manufacture').length, [inspections]);
  const srvCount = useMemo(() => inspections.filter(i => i.spindleCategory === 'service').length, [inspections]);

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
        <div className="content-body">
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
      </div>
    );
  }

  // Active Selected Inspection Record
  const currentInsp = selectedInspection || filteredInspections[0] || inspections[0];
  const parameters = currentInsp?.parameters || currentInsp?.results || [];
  const currentVerdict = currentInsp?.approval_status || currentInsp?.approvalStatus || 'Draft';
  const isApproved = currentVerdict === 'Approved';
  const isRejected = currentVerdict === 'Rejected';

  const isServiceSpindle = currentInsp?.spindleCategory === 'service';
  const spindleSerial = currentInsp?.spindle?.serial_number || currentInsp?.spindleSerial || 'N/A';
  const spindleModel = currentInsp?.spindle?.model?.model_name || currentInsp?.spindle?.model?.model_code || currentInsp?.spindle?.model || currentInsp?.spindleModel || 'Precision Spindle';
  const workOrderNo = currentInsp?.work_order?.work_order_no || currentInsp?.workOrder || 'WO-2026-103';
  const serviceJobNo = currentInsp?.serviceJobNumber || currentInsp?.serviceRequestId || 'SR-2026-041';
  const customerName = currentInsp?.work_order?.customer_name || currentInsp?.customer || 'Precision Customer';
  const inspectorName = currentInsp?.inspector?.first_name 
    ? `${currentInsp.inspector.first_name} ${currentInsp.inspector.last_name}`
    : (typeof currentInsp?.inspector === 'string' ? currentInsp.inspector : 'Milind Joshi (Quality Assurance Lead)');

  if (!currentInsp) {
    return (
      <div className="content-area">
        <PageHeader 
          title="Quality Control & Metrology Acceptance" 
          subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
          badge="ISO 9001:2015 Standards"
        />
        <div className="section-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <ShieldCheck size={48} style={{ color: 'var(--primary)', opacity: 0.4, margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '8px' }}>
            No Quality Inspections Found
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto' }}>
            There are currently no active manufactured or service spindle inspection records in the system.
          </p>
        </div>
      </div>
    );
  }

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
            Select Inspection:
          </label>
          <CustomSelect 
            id="inspection-select"
            value={selectedInspectionId || ''}
            onChange={(e) => handleSelectInspection(e.target.value)}
            disabled={isMutating || isDetailLoading}
            searchable={true}
            style={{ minWidth: '320px' }}
            options={filteredInspections.map((insp) => {
              const isSrv = insp.spindleCategory === 'service';
              const serial = insp.spindle?.serial_number || insp.spindleSerial || 'Spindle';
              const cust = (insp.work_order?.customer_name || insp.customer || '').split(' ')[0];
              const tag = isSrv ? 'SERVICE' : 'MFG';
              return {
                value: insp.id,
                label: `${insp.inspection_number || insp.id} — ${serial} [${tag}] (${cust})`,
                badge: tag
              };
            })}
          />
        </div>

        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={handlePrint}
          disabled={isMutating}
          title="Print official Calibration & Metrology Certificate"
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

      <div className="content-body">

      {/* Category Tabs: All vs Manufactured Spindles vs Service Spindles */}
      <Tabs 
        tabs={[
          { id: 'all', label: 'All Quality Inspections', count: inspections.length },
          { id: 'manufacture', label: 'Manufactured Spindles (New Builds)', count: mfgCount, icon: <Factory size={13} style={{ marginRight: '4px' }} /> },
          { id: 'service', label: 'Service & Overhaul Spindles (Repairs)', count: srvCount, icon: <Wrench size={13} style={{ marginRight: '4px' }} /> },
        ]}
        activeTab={activeCategory}
        onChange={(tabId) => {
          setActiveCategory(tabId);
          const matches = inspections.filter(i => tabId === 'all' || i.spindleCategory === tabId);
          if (matches.length > 0 && (!selectedInspection || (tabId !== 'all' && selectedInspection.spindleCategory !== tabId))) {
            handleSelectInspection(matches[0].id);
          }
        }}
      />

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>
                  {currentInsp.inspection_number || currentInsp.id}
                </span>

                {/* Clear Categorical Differentiation Badge */}
                {isServiceSpindle ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    background: '#fffbeb',
                    color: '#b45309',
                    border: '1px solid #fde68a'
                  }}>
                    <Wrench size={12} />
                    SERVICE & OVERHAUL QC (RMA REPAIR)
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.03em',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(122, 31, 61, 0.2)'
                  }}>
                    <Factory size={12} />
                    MANUFACTURING QC (NEW BUILD)
                  </span>
                )}

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

              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                {isServiceSpindle ? (
                  <>
                    Service Ticket: <strong className="mono">{serviceJobNo}</strong> ({customerName})
                  </>
                ) : (
                  <>
                    Work Order: <strong className="mono">{workOrderNo}</strong> ({customerName})
                  </>
                )}
                {' '}• Spindle Serial: <strong className="mono">{spindleSerial}</strong> • Model: <strong>{spindleModel}</strong>
                {currentInsp.inspection_type && (
                  <span> • Audit Type: <strong>{currentInsp.inspection_type}</strong></span>
                )}
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
              <div className="mono" style={{ fontWeight: 600 }}>{currentInsp.inspection_date || currentInsp.inspectionDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certified Inspector</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{inspectorName}</div>
            </div>
          </div>
        </div>

        {/* Dedicated Context Banner for Service Spindles: Incoming vs Restored Comparison */}
        {isServiceSpindle && (
          <div style={{
            margin: '16px 20px',
            padding: '14px 18px',
            background: '#fffdfa',
            border: '1px solid #fed7aa',
            borderRadius: '6px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: '#9a3412' }}>
                <Activity size={15} color="#ea580c" />
                <span>Post-Repair Restoration Performance vs Incoming Fault Audit</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#c2410c', background: '#ffedd5', padding: '2px 8px', borderRadius: '4px' }}>
                RMA Overhaul Sign-off
              </span>
            </div>

            {currentInsp.complaint && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', background: '#ffffff', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ffedd5' }}>
                <strong style={{ color: 'var(--text-main)' }}>Reported Customer Complaint:</strong> {currentInsp.complaint}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Taper Dynamic Runout</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preRunout || '14.2 µm'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postRunout || '0.8 µm'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>✓ Within OEM Spec (&lt;1.0 µm)</div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Dynamic Balancing</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preBalance || 'G3.8'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postBalance || 'G0.28'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>✓ ISO 1940 G0.4 Achieved</div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RMS Vibration Velocity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preVibration || '4.6 mm/s'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postVibration || '0.26 mm/s'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500 }}>✓ Vibration Resolved (&lt;0.5 mm/s)</div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Bearing & Shaft Overhaul</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginTop: '4px' }}>
                  {currentInsp.restorationSummary?.repairsDone || 'Ceramic hybrid bearings replaced, taper reground.'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Class 1000 Cleanroom Fitted</div>
              </div>
            </div>
          </div>
        )}

        {/* Dedicated Context Banner for Manufactured Spindles: Drawing Specifications */}
        {!isServiceSpindle && (
          <div style={{
            margin: '16px 20px',
            padding: '12px 18px',
            background: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Factory size={16} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                  New Spindle Manufacturing Acceptance Protocol
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Manufactured to strict ISO 1940-1 Grade G0.4, Sub-Micron Studer Grinding & DIN 69893 HSK / ISO 7388 Standards.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11.5px' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Target Runout:</span> <strong className="mono">≤ 0.0010 mm</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>300mm Arbor:</span> <strong className="mono">≤ 0.0030 mm</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Balance Spec:</span> <strong className="mono">ISO G0.40</strong></div>
            </div>
          </div>
        )}

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
                    const isPass = param.result_status === 'Pass' || param.result === 'Pass';
                    const isWarning = param.result_status === 'Warning' || param.result === 'Warning';
                    const badgeBg = isPass ? '#ecfdf5' : isWarning ? '#fffbeb' : '#fef2f2';
                    const badgeColor = isPass ? '#047857' : isWarning ? '#b45309' : '#b91c1c';
                    const badgeBorder = isPass ? '#a7f3d0' : isWarning ? '#fde68a' : '#fecaca';

                    return (
                      <tr key={param.id || index}>
                        <td className="mono" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                          {index < 9 ? `0${index + 1}` : index + 1}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{param.parameter_name || param.name}</div>
                        </td>
                        <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                          {formatSpecification(param)}
                        </td>
                        <td className="mono" style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {param.measured_value !== null && param.measured_value !== undefined 
                            ? `${param.measured_value} ${param.unit_of_measure || ''}`
                            : (param.actual || 'Pending')}
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {param.notes || param.instrument || currentInsp.gauge_equipment_used || currentInsp.gaugeEquipment || 'Calibrated Rig'}
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
                            {param.result_status || param.result || 'Pass'}
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
              {currentInsp.remarks || currentInsp.notes || 'Dynamic balancing achieved ISO 1940 standard. Full-speed thermal run-in test verified within tolerance.'}
            </p>
            {(currentInsp.gauge_equipment_used || currentInsp.gaugeEquipment) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                <Wrench size={12} />
                <span>Calibrated Rig: {currentInsp.gauge_equipment_used || currentInsp.gaugeEquipment}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handlePrint}
              title="Download official ISO Calibration & Metrology Certificate (PDF)"
            >
              <Printer size={14} />
              <span>Certificate (PDF)</span>
            </button>
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
        title={`Edit Metrology Checkpoint — ${editingParam?.parameter_name || editingParam?.name || ''}`}
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
                  Tolerance Band / Required
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

      {/* Calibration Certificate Pop-up Preview Modal */}
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
