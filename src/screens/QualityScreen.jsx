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
  Activity, ArrowRight, Gauge, Layers, Plus, Download,
  Sparkles, X, FileText, Calendar, User, Search
} from 'lucide-react';

const CUSTOM_INSPECTIONS_KEY = 'gps_erp_custom_inspections';

function getStoredCustomInspections() {
  try {
    const raw = localStorage.getItem(CUSTOM_INSPECTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomInspections(list) {
  try {
    localStorage.setItem(CUSTOM_INSPECTIONS_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed saving custom inspections:', e);
  }
}

const STANDARD_SAMPLE_INSPECTION = {
  id: 'QC-2026-0842',
  inspection_number: 'QC-2026-0842',
  spindleCategory: 'manufacture',
  spindleSerial: 'GPS-2026-0842',
  spindleModel: 'GPS-HSK-A63-24K',
  workOrder: 'WO-2026-104',
  customer: 'Tata Motors Precision Division',
  inspection_type: 'Final Metrology QA',
  inspection_date: new Date().toISOString().split('T')[0],
  approval_status: 'Approved',
  approvalStatus: 'Approved',
  overall_result: 'Pass',
  overallResult: 'Pass',
  ambient_temp_celsius: 20.0,
  gauge_equipment_used: 'Mahr Federal Air Collet Probe & Schenck Dynamic Rig',
  inspector: 'Milind Joshi (Quality Assurance Lead)',
  remarks: 'Full dimensional metrology, air gauging, and dynamic balancing certified to ISO 9001:2015 and ISO 1940 Grade G0.4.',
  parameters: [
    { id: 'p1', name: 'Nose Taper Dynamic Runout', parameter_name: 'Nose Taper Dynamic Runout', nominal_value: 0.5, tolerance_min: 0, tolerance_max: 1.0, measured_value: 0.6, actual: '0.6 µm', unit_of_measure: 'µm', result_status: 'Pass', result: 'Pass', instrument: 'Mahr Federal Millimar Air Probe' },
    { id: 'p2', name: 'Dynamic Balancing ISO 1940', parameter_name: 'Dynamic Balancing ISO 1940', nominal_value: 0.40, tolerance_min: 0, tolerance_max: 0.50, measured_value: 0.28, actual: '0.28 mm/s', unit_of_measure: 'mm/s', result_status: 'Pass', result: 'Pass', instrument: 'Schenck SmartBalancer V4' },
    { id: 'p3', name: 'Bearing Thermal Rise (4h Stabilization)', parameter_name: 'Bearing Thermal Rise (4h Stabilization)', nominal_value: 18.0, tolerance_min: 0, tolerance_max: 25.0, measured_value: 14.2, actual: '14.2 °C', unit_of_measure: '°C', result_status: 'Pass', result: 'Pass', instrument: 'Fluke Pt100 RTD Thermal Sensor' },
    { id: 'p4', name: 'Drawbar Tool Clamping Force', parameter_name: 'Drawbar Tool Clamping Force', nominal_value: 18.0, tolerance_min: 17.0, tolerance_max: 19.5, measured_value: 18.4, actual: '18.4 kN', unit_of_measure: 'kN', result_status: 'Pass', result: 'Pass', instrument: 'OTT-Jakob Electronic Force Gauge' },
    { id: 'p5', name: 'Overall Vibration Velocity RMS', parameter_name: 'Overall Vibration Velocity RMS', nominal_value: 0.50, tolerance_min: 0, tolerance_max: 0.80, measured_value: 0.27, actual: '0.27 mm/s', unit_of_measure: 'mm/s', result_status: 'Pass', result: 'Pass', instrument: 'PCB Piezotronics Triaxial Accelerometer' },
    { id: 'p6', name: 'Air Purge Labyrinth Seal Differential', parameter_name: 'Air Purge Labyrinth Seal Differential', nominal_value: 1.20, tolerance_min: 1.0, tolerance_max: 1.50, measured_value: 1.25, actual: '1.25 bar', unit_of_measure: 'bar', result_status: 'Pass', result: 'Pass', instrument: 'Festo Digital Pressure Transducer' }
  ]
};

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

  // Create Inspection Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    spindleCategory: 'manufacture',
    spindleSerial: '',
    workOrder: '',
    customer: '',
    inspection_type: 'Final Metrology QA',
    ambient_temp_celsius: '20.0',
    gauge_equipment_used: 'Mahr Federal Air Collet Probe & Schenck Dynamic Rig',
    inspector: 'Milind Joshi (Quality Assurance Lead)',
    remarks: 'Full dimensional metrology, air gauging, and dynamic balancing certified.',
    runout: '0.6',
    balance: '0.28',
    thermalRise: '14.2',
    clampingForce: '18.4',
    vibration: '0.27',
    airPurge: '1.25'
  });

  // Edit Checkpoint Modal State
  const [editingParam, setEditingParam] = useState(null);
  const [editForm, setEditForm] = useState({
    measured_value: '',
    result_status: 'Pass',
    notes: ''
  });
  const [formError, setFormError] = useState('');

  // 1. Fetch live inspections list from Supabase and merge with custom & local records
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

        const existingIds = new Set(liveRecords.map(r => r.inspection_number || r.id));
        const supplemental = QUALITY_INSPECTIONS.filter(q => !existingIds.has(q.id) && !existingIds.has(q.inspectionNumber));
        records = [...liveRecords, ...supplemental];
      } else {
        records = QUALITY_INSPECTIONS;
      }

      // Merge locally created custom inspections
      const stored = getStoredCustomInspections();
      if (stored.length > 0) {
        const idMap = new Map();
        records.forEach(r => idMap.set(r.id || r.inspection_number, r));
        stored.forEach(r => idMap.set(r.id || r.inspection_number, r));
        records = Array.from(idMap.values());
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
      const stored = getStoredCustomInspections();
      const combined = stored.length > 0 ? stored : QUALITY_INSPECTIONS;
      setInspections(combined);
      if (combined.length > 0) {
        setSelectedInspectionId(combined[0].id);
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

    // Look for matching stored custom record first
    const stored = getStoredCustomInspections();
    const customMatch = stored.find(q => q.id === id || q.inspection_number === id || q.inspectionNumber === id);
    if (customMatch) {
      setSelectedInspection(customMatch);
      setIsDetailLoading(false);
      return;
    }

    // Look for matching mock record
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

      if (mockMatch) {
        setSelectedInspection(mockMatch);
        setIsDetailLoading(false);
        return;
      }

      if (onNotify) onNotify('Inspection checkpoints loaded.');
    } catch (err) {
      if (mockMatch) {
        setSelectedInspection(mockMatch);
      }
    } finally {
      setIsDetailLoading(false);
    }
  }, [onNotify]);

  // Open Log Inspection Modal
  const handleOpenCreateModal = () => {
    setCreateForm({
      spindleCategory: activeCategory === 'service' ? 'service' : 'manufacture',
      spindleSerial: '',
      workOrder: '',
      customer: '',
      inspection_type: 'Final Metrology QA',
      ambient_temp_celsius: '20.0',
      gauge_equipment_used: 'Mahr Federal Air Collet Probe & Schenck Dynamic Rig',
      inspector: 'Milind Joshi (Quality Assurance Lead)',
      remarks: 'Full dimensional metrology, air gauging, and dynamic balancing certified.',
      runout: '0.6',
      balance: '0.28',
      thermalRise: '14.2',
      clampingForce: '18.4',
      vibration: '0.27',
      airPurge: '1.25'
    });
    setIsCreateModalOpen(true);
  };

  // Submit New Quality Inspection
  const handleCreateInspectionSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.spindleSerial.trim()) {
      if (onNotify) onNotify('Please enter a Spindle Serial Number.');
      return;
    }

    setIsMutating(true);

    const inspNo = `QC-${new Date().getFullYear()}-${String(inspections.length + 101).padStart(4, '0')}`;
    const newRecord = {
      id: inspNo,
      inspection_number: inspNo,
      spindleCategory: createForm.spindleCategory,
      spindleSerial: createForm.spindleSerial.trim(),
      spindleModel: createForm.spindleCategory === 'service' ? 'OEM Overhaul Spindle' : 'GPS-HSK-A63-24K',
      workOrder: createForm.workOrder.trim() || `WO-${new Date().getFullYear()}-${inspections.length + 101}`,
      serviceJobNumber: createForm.workOrder.trim() || `SR-${new Date().getFullYear()}-${inspections.length + 41}`,
      customer: createForm.customer.trim() || 'Precision Engineering Client',
      inspection_type: createForm.inspection_type,
      inspection_date: new Date().toISOString().split('T')[0],
      inspectionDate: new Date().toISOString().split('T')[0],
      approval_status: 'Approved',
      approvalStatus: 'Approved',
      overall_result: 'Pass',
      overallResult: 'Pass',
      ambient_temp_celsius: parseFloat(createForm.ambient_temp_celsius) || 20.0,
      gauge_equipment_used: createForm.gauge_equipment_used,
      inspector: createForm.inspector,
      remarks: createForm.remarks,
      parameters: [
        { id: `chk-${Date.now()}-1`, name: 'Nose Taper Dynamic Runout', parameter_name: 'Nose Taper Dynamic Runout', nominal_value: 0.5, tolerance_min: 0, tolerance_max: 1.0, measured_value: parseFloat(createForm.runout) || 0.6, actual: `${parseFloat(createForm.runout) || 0.6} µm`, unit_of_measure: 'µm', result_status: 'Pass', result: 'Pass', instrument: 'Mahr Federal Millimar Air Probe' },
        { id: `chk-${Date.now()}-2`, name: 'Dynamic Balancing ISO 1940', parameter_name: 'Dynamic Balancing ISO 1940', nominal_value: 0.40, tolerance_min: 0, tolerance_max: 0.50, measured_value: parseFloat(createForm.balance) || 0.28, actual: `${parseFloat(createForm.balance) || 0.28} mm/s`, unit_of_measure: 'mm/s', result_status: 'Pass', result: 'Pass', instrument: 'Schenck SmartBalancer V4' },
        { id: `chk-${Date.now()}-3`, name: 'Bearing Thermal Rise (4h Stabilization)', parameter_name: 'Bearing Thermal Rise (4h Stabilization)', nominal_value: 18.0, tolerance_min: 0, tolerance_max: 25.0, measured_value: parseFloat(createForm.thermalRise) || 14.2, actual: `${parseFloat(createForm.thermalRise) || 14.2} °C`, unit_of_measure: '°C', result_status: 'Pass', result: 'Pass', instrument: 'Fluke Pt100 RTD Thermal Sensor' },
        { id: `chk-${Date.now()}-4`, name: 'Drawbar Tool Clamping Force', parameter_name: 'Drawbar Tool Clamping Force', nominal_value: 18.0, tolerance_min: 17.0, tolerance_max: 19.5, measured_value: parseFloat(createForm.clampingForce) || 18.4, actual: `${parseFloat(createForm.clampingForce) || 18.4} kN`, unit_of_measure: 'kN', result_status: 'Pass', result: 'Pass', instrument: 'OTT-Jakob Electronic Force Gauge' },
        { id: `chk-${Date.now()}-5`, name: 'Overall Vibration Velocity RMS', parameter_name: 'Overall Vibration Velocity RMS', nominal_value: 0.50, tolerance_min: 0, tolerance_max: 0.80, measured_value: parseFloat(createForm.vibration) || 0.27, actual: `${parseFloat(createForm.vibration) || 0.27} mm/s`, unit_of_measure: 'mm/s', result_status: 'Pass', result: 'Pass', instrument: 'PCB Piezotronics Triaxial Accelerometer' },
        { id: `chk-${Date.now()}-6`, name: 'Air Purge Labyrinth Seal Differential', parameter_name: 'Air Purge Labyrinth Seal Differential', nominal_value: 1.20, tolerance_min: 1.0, tolerance_max: 1.50, measured_value: parseFloat(createForm.airPurge) || 1.25, actual: `${parseFloat(createForm.airPurge) || 1.25} bar`, unit_of_measure: 'bar', result_status: 'Pass', result: 'Pass', instrument: 'Festo Digital Pressure Transducer' }
      ]
    };

    // Save to local custom store
    const existing = getStoredCustomInspections();
    saveCustomInspections([newRecord, ...existing]);

    setInspections(prev => [newRecord, ...prev]);
    setSelectedInspectionId(newRecord.id);
    setSelectedInspection(newRecord);
    setIsCreateModalOpen(false);
    setIsMutating(false);

    if (onNotify) {
      onNotify(`Quality Inspection [${newRecord.inspection_number}] certified and logged for spindle ${newRecord.spindleSerial}`);
    }
  };

  // One-click Sample Metrology Template Loader
  const handleLoadSampleTemplate = () => {
    const sample = { ...STANDARD_SAMPLE_INSPECTION };
    const existing = getStoredCustomInspections();
    saveCustomInspections([sample, ...existing]);
    setInspections(prev => [sample, ...prev]);
    setSelectedInspectionId(sample.id);
    setSelectedInspection(sample);
    if (onNotify) {
      onNotify(`Standard ISO 9001 Metrology Template loaded for spindle GPS-2026-0842.`);
    }
  };

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
        onNotify(`Spindle ${spindleSerial} flagged for rework at Grinding Workstation`);
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

  // 10. Master Quality Audit Log PDF Export
  const handleExportQcLog = () => {
    setPreviewDoc({
      type: 'Report',
      reportTitle: 'MASTER QUALITY CONTROL & METROLOGY AUDIT LOG',
      id: `QC-LOG-${new Date().toISOString().split('T')[0]}`,
      metrics: [
        { label: 'Total Audits', value: inspections.length },
        { label: 'First-Pass Rate', value: `${passRate}%` },
        { label: 'Pending Sign-Off', value: pendingCount },
        { label: 'Rework Required', value: reworkCount }
      ],
      headers: ['#', 'Inspection #', 'Spindle Serial', 'Category', 'Customer', 'Type', 'Inspector', 'Result', 'Status'],
      rows: (filteredInspections.length > 0 ? filteredInspections : inspections).map((insp, idx) => [
        idx + 1,
        insp.inspection_number || insp.id,
        insp.spindle?.serial_number || insp.spindleSerial || 'N/A',
        insp.spindleCategory === 'service' ? 'Service RMA' : 'Mfg Build',
        insp.work_order?.customer_name || insp.customer || 'Enterprise Client',
        insp.inspection_type || 'Final Metrology',
        typeof insp.inspector === 'string' ? insp.inspector : (insp.inspector?.first_name ? `${insp.inspector.first_name} ${insp.inspector.last_name}` : 'Milind Joshi'),
        insp.overall_result || insp.overallResult || 'Pass',
        insp.approval_status || insp.approvalStatus || 'Approved'
      ])
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

  // Operational KPI metrics
  const passCount = useMemo(() => inspections.filter(i => (i.overall_result || i.overallResult) === 'Pass').length, [inspections]);
  const pendingCount = useMemo(() => inspections.filter(i => (i.approval_status || i.approvalStatus) === 'Pending Sign-off' || (i.approval_status || i.approvalStatus) === 'Draft').length, [inspections]);
  const reworkCount = useMemo(() => inspections.filter(i => (i.overall_result || i.overallResult) === 'Rework Required' || (i.approval_status || i.approvalStatus) === 'Rejected').length, [inspections]);
  const passRate = useMemo(() => {
    if (inspections.length === 0) return '100.0';
    return ((passCount / inspections.length) * 100).toFixed(1);
  }, [inspections, passCount]);

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
  const currentInsp = selectedInspection || filteredInspections[0] || inspections[0] || null;
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

  return (
    <div className="content-area">
      <PageHeader 
        title="Quality Control & Metrology Acceptance" 
        subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
        badge="ISO 9001:2015 Standards"
      >
        {/* Inspection Selector Switcher (when inspections exist) */}
        {inspections.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px', flex: '1 1 auto', minWidth: '180px' }}>
            <label htmlFor="inspection-select" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Active Record:
            </label>
            <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
              <CustomSelect 
                id="inspection-select"
                value={selectedInspectionId || ''}
                onChange={(e) => handleSelectInspection(e.target.value)}
                disabled={isMutating || isDetailLoading}
                searchable={true}
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
          </div>
        )}

        {/* Master PDF Export */}
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={handleExportQcLog}
          title="Export Master Quality & Metrology Audit Sheet"
        >
          <Download size={14} />
          <span className="desktop-only-inline">Export QC Log (PDF)</span>
          <span className="mobile-only-inline">Export PDF</span>
        </button>

        {/* Print Certificate (when inspection selected) */}
        {currentInsp && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handlePrint}
            disabled={isMutating}
            title="Print official Calibration & Metrology Certificate"
          >
            <Printer size={14} />
            <span className="desktop-only-inline">Print Certificate</span>
            <span className="mobile-only-inline">Certificate</span>
          </button>
        )}

        {/* Approve Button (when inspection selected) */}
        {currentInsp && (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleApprove}
            disabled={isMutating || isApproved || !isAuthorizedToEdit}
            title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
            style={{ color: isApproved ? '#059669' : 'inherit' }}
          >
            {isMutating ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <CheckCircle2 size={14} color={isApproved ? '#059669' : undefined} />
            )}
            <span className="desktop-only-inline">{isApproved ? 'Approved' : 'Approve QC'}</span>
            <span className="mobile-only-inline">{isApproved ? 'Approved' : 'Approve'}</span>
          </button>
        )}

        {/* Primary CTA: Log New Quality Inspection */}
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleOpenCreateModal}
          title="Create a new metrology and dimensional inspection record"
        >
          <Plus size={14} />
          <span className="desktop-only-inline">Log Quality Inspection</span>
          <span className="mobile-only-inline">+ Log QC</span>
        </button>
      </PageHeader>

      <div className="content-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* KPI Summary Metrics Grid (Standard GPS ERP .metrics-grid) */}
        <div className="metrics-grid">
          {/* Card 1: Total Quality Audits */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Total Quality Audits</span>
              <div className="metric-icon-wrap" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                <ShieldCheck size={15} />
              </div>
            </div>
            <div className="metric-value">{inspections.length}</div>
            <div className="metric-footer" style={{ color: 'var(--primary)' }}>
              {inspections.length > 0 ? `${mfgCount} Mfg • ${srvCount} Service` : 'No inspections recorded'}
            </div>
          </div>

          {/* Card 2: First-Pass QC Rate */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">First-Pass QC Rate</span>
              <div className="metric-icon-wrap" style={{ color: '#059669', background: '#d1fae5' }}>
                <CheckCircle2 size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#059669' }}>
              {inspections.length > 0 ? `${passRate}%` : '100%'}
            </div>
            <div className="metric-footer" style={{ color: '#059669' }}>
              {inspections.length > 0 ? `${passCount} Passed / ${inspections.length} Total` : 'ISO 9001 Standard Spec'}
            </div>
          </div>

          {/* Card 3: Pending QA Sign-Off */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Pending QA Sign-Off</span>
              <div className="metric-icon-wrap" style={{ color: '#c2410c', background: '#ffedd5' }}>
                <Activity size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#c2410c' }}>
              {pendingCount}
            </div>
            <div className="metric-footer" style={{ color: pendingCount > 0 ? '#c2410c' : 'var(--text-muted)' }}>
              {pendingCount > 0 ? 'Awaiting QA Manager stamp' : 'All audits certified'}
            </div>
          </div>

          {/* Card 4: Rework & NCRs */}
          <div className="metric-card">
            <div className="metric-top">
              <span className="metric-label">Rework & NCRs</span>
              <div className="metric-icon-wrap" style={{ color: reworkCount > 0 ? '#dc2626' : '#64748b', background: reworkCount > 0 ? '#fee2e2' : '#f1f5f9' }}>
                <ShieldAlert size={15} />
              </div>
            </div>
            <div className="metric-value" style={{ color: reworkCount > 0 ? '#dc2626' : 'var(--text-main)' }}>
              {reworkCount}
            </div>
            <div className="metric-footer" style={{ color: reworkCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
              {reworkCount > 0 ? 'Out of micron tolerance' : 'Zero non-conformances'}
            </div>
          </div>
        </div>

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

        {/* When No Inspection is Selected / Clean Slate Empty State */}
        {!currentInsp ? (
          <div className="section-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fdf2f8',
              color: '#7A1F3D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <ShieldCheck size={28} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              No Quality Inspections Logged
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              There are currently no active manufactured or service spindle inspection records in the system. Log your first metrology audit or load a standard ISO 9001 template to generate an official calibration certificate.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={handleOpenCreateModal}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>Log First Quality Inspection</span>
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={handleLoadSampleTemplate}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Load sample ISO 9001 calibration certificate"
              >
                <Sparkles size={14} color="#7A1F3D" />
                <span>Load Standard Metrology Template</span>
              </button>
            </div>
          </div>
        ) : (
          /* Selected Inspection Certificate Card */
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

          <div style={{ display: 'flex', gap: '12px 20px', alignItems: 'center', flexWrap: 'wrap' }}>
            {currentInsp.ambient_temp_celsius && (
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Thermometer size={12} /> Ambient Temp
                </div>
                <div className="mono" style={{ fontWeight: 600 }}>{currentInsp.ambient_temp_celsius} °C</div>
              </div>
            )}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inspection Date</div>
              <div className="mono" style={{ fontWeight: 600 }}>{currentInsp.inspection_date || currentInsp.inspectionDate}</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certified Inspector</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{inspectorName}</div>
            </div>
          </div>
        </div>

        {/* Dedicated Context Banner for Service Spindles: Incoming vs Restored Comparison */}
        {isServiceSpindle && (
          <div style={{
            margin: '14px 16px',
            padding: '12px 14px',
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Taper Dynamic Runout</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preRunout || '14.2 µm'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postRunout || '0.8 µm'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={11} strokeWidth={2.5} /> Within OEM Spec (&lt;1.0 µm)
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Dynamic Balancing</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preBalance || 'G3.8'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postBalance || 'G0.28'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={11} strokeWidth={2.5} /> ISO 1940 G0.4 Achieved
                </div>
              </div>

              <div style={{ background: '#ffffff', padding: '10px 12px', borderRadius: '5px', border: '1px solid #fed7aa' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>RMS Vibration Velocity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'line-through' }}>{currentInsp.restorationSummary?.preVibration || '4.6 mm/s'}</span>
                  <ArrowRight size={12} color="#9a3412" />
                  <strong className="mono" style={{ fontSize: '13px', color: '#059669' }}>{currentInsp.restorationSummary?.postVibration || '0.26 mm/s'}</strong>
                </div>
                <div style={{ fontSize: '10.5px', color: '#059669', marginTop: '2px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={11} strokeWidth={2.5} /> Vibration Resolved (&lt;0.5 mm/s)
                </div>
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
            margin: '14px 16px',
            padding: '12px 14px',
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
            <div style={{ display: 'flex', gap: '8px 16px', fontSize: '11.5px', flexWrap: 'wrap' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Target Runout:</span> <strong className="mono">≤ 0.0010 mm</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>300mm Arbor:</span> <strong className="mono">≤ 0.0030 mm</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Balance Spec:</span> <strong className="mono">ISO G0.40</strong></div>
            </div>
          </div>
        )}

        {/* Professional QC Parameters Table (Desktop) */}
        <div className="table-responsive desktop-table-view">
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

        {/* Mobile Parameters Card Feed View (≤ 768px) */}
        <div className="mobile-card-view">
          {isDetailLoading ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Loader2 size={22} className="spin" style={{ color: 'var(--primary)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading measurement parameters...</p>
            </div>
          ) : parameters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
              No discrete parameters recorded for this inspection yet.
            </div>
          ) : (
            parameters.map((param, index) => {
              const isPass = param.result_status === 'Pass' || param.result === 'Pass';
              const isWarning = param.result_status === 'Warning' || param.result === 'Warning';
              const badgeBg = isPass ? '#ecfdf5' : isWarning ? '#fffbeb' : '#fef2f2';
              const badgeColor = isPass ? '#047857' : isWarning ? '#b45309' : '#b91c1c';
              const badgeBorder = isPass ? '#a7f3d0' : isWarning ? '#fde68a' : '#fecaca';

              return (
                <div 
                  key={param.id || index}
                  className="qc-mobile-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Card Header: Item No + Parameter Name + Verdict Badge */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <span className="mono" style={{
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        color: 'var(--text-muted)',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0
                      }}>
                        #{index < 9 ? `0${index + 1}` : index + 1}
                      </span>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.3 }}>
                        {param.parameter_name || param.name}
                      </div>
                    </div>
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
                      border: `1px solid ${badgeBorder}`,
                      flexShrink: 0
                    }}>
                      {isPass ? <CheckCircle2 size={12} /> : isWarning ? <AlertCircle size={12} /> : <XCircle size={12} />}
                      {param.result_status || param.result || 'Pass'}
                    </span>
                  </div>

                  {/* 2-Column Specs / Measurement Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '8px',
                    padding: '8px 10px',
                    background: 'var(--bg-surface-subtle, #f8fafc)',
                    borderRadius: '6px',
                    fontSize: '11.5px'
                  }}>
                    <div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Required Drawing Spec
                      </div>
                      <div className="mono" style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {formatSpecification(param)}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>
                        Actual Measured
                      </div>
                      <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '13px' }}>
                        {param.measured_value !== null && param.measured_value !== undefined 
                          ? `${param.measured_value} ${param.unit_of_measure || ''}`
                          : (param.actual || 'Pending')}
                      </div>
                    </div>
                  </div>

                  {/* Equipment Strip & Edit Action */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    fontSize: '11px',
                    paddingTop: '6px',
                    borderTop: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-muted)', overflow: 'hidden' }}>
                      <Wrench size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {param.notes || param.instrument || currentInsp.gauge_equipment_used || currentInsp.gaugeEquipment || 'Calibrated Rig'}
                      </span>
                    </div>

                    {isAuthorizedToEdit && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenEdit(param)}
                        title="Edit measurement value"
                        disabled={isMutating}
                        style={{ padding: '3px 8px', fontSize: '11px', flexShrink: 0 }}
                      >
                        <Edit3 size={11} />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
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
          <div style={{ flex: '1 1 300px', minWidth: '240px' }}>
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

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handlePrint}
              title="Download official ISO Calibration & Metrology Certificate (PDF)"
              style={{ flex: '1 1 auto', minWidth: '120px' }}
            >
              <Printer size={14} />
              <span className="desktop-only-inline">Certificate (PDF)</span>
              <span className="mobile-only-inline">Cert PDF</span>
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleReject}
              disabled={isMutating || isRejected || !isAuthorizedToEdit}
              style={{ color: '#dc2626', borderColor: '#fca5a5', flex: '1 1 auto', minWidth: '130px' }}
              title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
            >
              {isMutating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <XCircle size={14} />
              )}
              <span className="desktop-only-inline">{isRejected ? 'Rework Flagged' : 'Request Re-grind Rework'}</span>
              <span className="mobile-only-inline">{isRejected ? 'Flagged' : 'Rework'}</span>
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleApprove}
              disabled={isMutating || isApproved || !isAuthorizedToEdit}
              title={!isAuthorizedToEdit ? 'Requires QA Manager, Management or Admin role' : ''}
              style={{ flex: '1 1 auto', minWidth: '140px' }}
            >
              {isMutating ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <ShieldCheck size={14} />
              )}
              <span className="desktop-only-inline">{isApproved ? 'QA Certified & Released' : 'Digital QA Seal & Release'}</span>
              <span className="mobile-only-inline">{isApproved ? 'Certified' : 'QA Release'}</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Modal: Log New Quality Inspection */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => !isMutating && setIsCreateModalOpen(false)}
        title="Log New Quality & Metrology Inspection"
        maxWidth="680px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isMutating}
              style={{ flex: '1 1 auto', minWidth: '90px' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleCreateInspectionSubmit}
              disabled={isMutating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', minWidth: '160px' }}
            >
              {isMutating ? <Loader2 size={14} className="spin" /> : <ShieldCheck size={14} />}
              <span>Certify & Save Inspection</span>
            </button>
          </div>
        }
      >
        <form onSubmit={handleCreateInspectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Inspection Category *
              </label>
              <CustomSelect 
                value={createForm.spindleCategory}
                onChange={(e) => setCreateForm(prev => ({ ...prev, spindleCategory: e.target.value }))}
                options={[
                  { value: 'manufacture', label: 'Manufactured Spindle (New Build)', badge: 'MFG' },
                  { value: 'service', label: 'Service & Overhaul (RMA Repair)', badge: 'SERVICE' }
                ]}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Inspection Type *
              </label>
              <CustomSelect 
                value={createForm.inspection_type}
                onChange={(e) => setCreateForm(prev => ({ ...prev, inspection_type: e.target.value }))}
                options={[
                  { value: 'Final Metrology QA', label: 'Final Metrology QA (Sign-off)' },
                  { value: 'Dynamic Balancing', label: 'Dynamic Balancing ISO 1940' },
                  { value: 'In-Process Grinding', label: 'In-Process Grinding Inspection' },
                  { value: 'First Article', label: 'First Article Inspection (FAI)' },
                  { value: 'Incoming Inspection', label: 'Incoming RMA Inspection' }
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Spindle Serial / Asset ID *
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. GPS-2026-0842"
                value={createForm.spindleSerial}
                onChange={(e) => setCreateForm(prev => ({ ...prev, spindleSerial: e.target.value }))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Work Order / Ticket No
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. WO-2026-104 or SR-2026-041"
                value={createForm.workOrder}
                onChange={(e) => setCreateForm(prev => ({ ...prev, workOrder: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Customer / Plant
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="e.g. Bharat Forge Pune"
                value={createForm.customer}
                onChange={(e) => setCreateForm(prev => ({ ...prev, customer: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Certified Inspector
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={createForm.inspector}
                onChange={(e) => setCreateForm(prev => ({ ...prev, inspector: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Lab Temp (°C)
              </label>
              <input 
                type="number" 
                step="0.1"
                className="form-control" 
                value={createForm.ambient_temp_celsius}
                onChange={(e) => setCreateForm(prev => ({ ...prev, ambient_temp_celsius: e.target.value }))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Test Equipment Rig
              </label>
              <input 
                type="text" 
                className="form-control" 
                value={createForm.gauge_equipment_used}
                onChange={(e) => setCreateForm(prev => ({ ...prev, gauge_equipment_used: e.target.value }))}
              />
            </div>
          </div>

          {/* Critical Checkpoint Measurements Matrix */}
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gauge size={14} />
              <span>Calibrated Measured Checkpoint Values</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Nose Taper Runout (µm) [≤ 1.0]
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={createForm.runout}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, runout: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Dynamic Balance (mm/s) [≤ 0.50]
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={createForm.balance}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, balance: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Bearing Thermal Rise (°C) [≤ 25]
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-control" 
                  value={createForm.thermalRise}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, thermalRise: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Clamping Force (kN) [17 - 19.5]
                </label>
                <input 
                  type="number" 
                  step="0.1" 
                  className="form-control" 
                  value={createForm.clampingForce}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, clampingForce: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Vibration RMS (mm/s) [≤ 0.80]
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={createForm.vibration}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, vibration: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>
                  Air Purge Pressure (bar) [1.0 - 1.5]
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="form-control" 
                  value={createForm.airPurge}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, airPurge: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
              Quality Observations & QA Stamp Remarks
            </label>
            <textarea 
              rows={2} 
              className="form-control" 
              value={createForm.remarks}
              onChange={(e) => setCreateForm(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
        </form>
      </Modal>

      {/* Edit Measurement Checkpoint Modal */}
      <Modal
        isOpen={Boolean(editingParam)}
        onClose={() => setEditingParam(null)}
        title={`Edit Metrology Checkpoint — ${editingParam?.parameter_name || editingParam?.name || ''}`}
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%', flexWrap: 'wrap' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setEditingParam(null)}
              disabled={isMutating}
              style={{ flex: '1 1 auto', minWidth: '90px' }}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={handleSaveMeasurement}
              disabled={isMutating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flex: '1 1 auto', minWidth: '150px' }}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
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
