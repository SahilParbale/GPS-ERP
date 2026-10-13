import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import ProgressBar from '../components/common/ProgressBar';
import Tabs from '../components/common/Tabs';
import { workOrderService } from '../services/database/workOrderService';
import { spindleModelService } from '../services/database/spindleModelService';
import { DetailScreenSkeleton } from '../components/common/Skeleton';
import { exportJobTravelerPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import Modal from '../components/common/Modal';
import { 
  ArrowLeft, FileText, CheckCircle, Clock, ShieldCheck, 
  User, Printer, Check, Download, AlertCircle, Wrench,
  Users, ArrowRight, RefreshCw, MessageSquare, Plus
} from 'lucide-react';

// Standard fallback operations catalog for shop floor traveler steps
const DEFAULT_OPERATIONS = [
  { id: 1, name: 'Raw Material Inward & Ultrasonic Sub-Surface Crack Testing', machine: 'Metrology Inward Lab', operator: 'V. Shinde', status: 'Completed', date: 'Feb 10', qcSignOff: true },
  { id: 2, name: 'CNC Rough Turning & Precision Boring (42CrMo4 Alloy)', machine: 'Okuma LB3000 CNC Lathe', operator: 'S. Sawant', status: 'Completed', date: 'Feb 12', qcSignOff: true },
  { id: 3, name: 'Vacuum Induction Hardening & Cryo Treatment (HRC 60-62)', machine: 'Heat Treat Sub-Station 3', operator: 'D. More', status: 'Completed', date: 'Feb 14', qcSignOff: true },
  { id: 4, name: 'Sub-Micron CNC Cylindrical Grinding (Shaft & Bearing Journal)', machine: 'Studer S33 CNC Grinder', operator: 'P. Joshi', status: 'In Progress', date: 'Active Cell', qcSignOff: false },
  { id: 5, name: 'Cleanroom Preload Ceramic Hybrid Bearings Fitting (ISO Class 6)', machine: 'Class 1000 Cleanroom Cell', operator: 'R. Pawar', status: 'Upcoming', date: 'Next Stage', qcSignOff: false },
  { id: 6, name: 'Dynamic Dual-Plane Balancing to ISO 1940 G0.4 (24,000 RPM)', machine: 'Schenck Balancing Rig', operator: 'A. Kulkarni', status: 'Upcoming', date: 'Scheduled', qcSignOff: false },
  { id: 7, name: '4-Hour Thermal Equilibrium Run-in & Vibration FFT Testing', machine: 'Run-in Test Bench A', operator: 'M. Deshmukh', status: 'Upcoming', date: 'Scheduled', qcSignOff: false },
  { id: 8, name: 'Final Laser Metrology, Taper Micron Dial QC & Traveler Sign-Off', machine: 'Zeiss CMM Metrology Lab', operator: 'M. Joshi', status: 'Upcoming', date: 'Target Final', qcSignOff: false }
];

const DEFAULT_BOM = [
  { partNo: 'BRG-7014-CER-HQ', name: 'Front Ceramic Hybrid Angular Contact Bearings (Set of 3)', supplier: 'SKF Aerospace', batch: 'LOT-2026-991', tolerance: '0.5 µm', status: 'Fitted' },
  { partNo: 'SHF-42CR-63', name: 'Alloy Steel 42CrMo4 Nitrided Spindle Core Shaft', supplier: 'Kalyani Steels', batch: 'HT-4482', tolerance: '0.8 µm', status: 'Fitted' },
  { partNo: 'STAT-HF-15KW', name: 'Liquid-Cooled High-Frequency Synchronous Stator 15kW', supplier: 'Siemens Precision', batch: 'MOT-7821', tolerance: 'Class H', status: 'Staged' },
  { partNo: 'CLP-OTT-HSK63', name: 'OTT-Jakob HSK-A63 Drawbar Collet & Belleville Springs', supplier: 'OTT-Jakob GmbH', batch: 'OTT-2026-08', tolerance: '18.0 kN', status: 'Staged' },
  { partNo: 'SEAL-LAB-L63', name: 'Non-Contact Triple Labyrinth Air Purge Seal Assembly', supplier: 'GPS In-House Machining', batch: 'SL-0914', tolerance: '1.0 µm', status: 'Pending' }
];

export default function WorkOrderDetailScreen({ workOrder, onNavigate, onNotify }) {
  const [woData, setWoData] = useState(workOrder || null);
  const [operations, setOperations] = useState(DEFAULT_OPERATIONS);
  const [bom, setBom] = useState(DEFAULT_BOM);
  const [isLoading, setIsLoading] = useState(!workOrder);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('operations');
  const [isSigningOff, setIsSigningOff] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Operation Sign-off & Technician Note Modal State
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState(false);
  const [selectedOpForSignOff, setSelectedOpForSignOff] = useState(null);
  const [signOffNoteText, setSignOffNoteText] = useState('');
  const [signOffOperator, setSignOffOperator] = useState('');

  // General Shop Floor Handover Note Modal State
  const [isGeneralNoteModalOpen, setIsGeneralNoteModalOpen] = useState(false);
  const [generalNoteText, setGeneralNoteText] = useState('');
  const [generalNoteAuthor, setGeneralNoteAuthor] = useState('');

  // Sync state whenever workOrder prop changes
  useEffect(() => {
    if (workOrder) {
      setWoData(workOrder);
      setError(null);
    }
  }, [workOrder]);

  const loadWorkOrderDetail = useCallback(async () => {
    let currentWo = workOrder;

    // If no workOrder provided via prop, fetch the first active one from live DB
    if (!currentWo) {
      setIsLoading(true);
      try {
        const allRes = await workOrderService.getWorkOrders({ limit: 1 });
        if (allRes.data?.[0]) {
          currentWo = allRes.data[0];
          setWoData(currentWo);
        }
      } catch (err) {
        console.warn('[WorkOrderDetailScreen] Failed to fetch initial work order:', err);
      }
    }

    if (!currentWo) {
      setError({ message: 'No work orders found in database' });
      setIsLoading(false);
      return;
    }

    setError(null);

    // Fetch full details gracefully
    const woId = currentWo.dbId || currentWo.id;
    try {
      const [detailRes, itemsRes, bomRes] = await Promise.allSettled([
        workOrderService.getWorkOrderById(woId),
        workOrderService.getWorkOrderItems(woId),
        spindleModelService.getSpindleComponents(currentWo.spindleSerial || 'GPS-2026-0842')
      ]);

      const detailData = detailRes.status === 'fulfilled' ? detailRes.value?.data : null;
      const itemsData = itemsRes.status === 'fulfilled' ? itemsRes.value?.data : null;
      const bomData = bomRes.status === 'fulfilled' ? bomRes.value?.data : null;

      const merged = detailData ? { ...currentWo, ...detailData } : currentWo;
      setWoData(merged);

      if (itemsData && itemsData.length > 0) {
        setOperations(itemsData);
      } else {
        setOperations(DEFAULT_OPERATIONS);
      }

      if (bomData && bomData.length > 0) {
        setBom(bomData);
      } else {
        setBom(DEFAULT_BOM);
      }
    } catch (err) {
      console.warn('[WorkOrderDetailScreen] Error loading details:', err);
      setWoData(currentWo);
      setOperations(DEFAULT_OPERATIONS);
      setBom(DEFAULT_BOM);
    } finally {
      setIsLoading(false);
    }
  }, [workOrder]);

  useEffect(() => {
    loadWorkOrderDetail();
  }, [loadWorkOrderDetail]);

  // Open Sign-off Modal with Notes for a specific operation or current active op
  const handleOpenSignOff = (targetOp = null) => {
    const opToSign = targetOp || operations.find(o => o.status === 'In Progress') || operations.find(o => o.status !== 'Completed');
    if (!opToSign) {
      if (onNotify) onNotify('All operations for this work order are already signed off.');
      return;
    }
    setSelectedOpForSignOff(opToSign);
    setSignOffOperator(opToSign.operator || woData?.assignedOperator?.replace(/\s*\(.*\)/, '').trim() || 'V. Shinde');
    setSignOffNoteText(opToSign.notes || '');
    setIsSignOffModalOpen(true);
  };

  // Confirm signoff with technician remarks & inspection notes
  const handleConfirmSignOff = async () => {
    if (!selectedOpForSignOff) return;
    const opToSign = selectedOpForSignOff;
    const noteText = signOffNoteText.trim();
    const operatorName = signOffOperator.trim() || 'Technician Lead';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + 
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsSigningOff(true);

    const targetIndex = operations.findIndex(
      o => (o.dbId && o.dbId === opToSign.dbId) || (o.id && o.id === opToSign.id) || o.name === opToSign.name
    );

    if (targetIndex === -1) {
      setIsSigningOff(false);
      setIsSignOffModalOpen(false);
      return;
    }

    let nextActiveOpName = null;
    const updatedOperations = operations.map((op, idx) => {
      if (idx === targetIndex) {
        return {
          ...op,
          status: 'Completed',
          qcSignOff: true,
          date: 'Signed off today',
          operator: operatorName,
          notes: noteText || op.notes
        };
      }
      if (idx === targetIndex + 1 && op.status !== 'Completed') {
        nextActiveOpName = op.name;
        return {
          ...op,
          status: 'In Progress',
          date: 'Active Cell'
        };
      }
      return op;
    });

    setOperations(updatedOperations);

    const newCompletedCount = updatedOperations.filter(o => o.status === 'Completed').length;
    const newProgress = Math.round((newCompletedCount / updatedOperations.length) * 100);
    const newStage = nextActiveOpName || (newProgress === 100 ? 'Final QC Passed' : woData?.currentStage || 'Assembly');
    const newStatus = newProgress === 100 ? 'Completed' : 'In Progress';

    const newNoteEntry = noteText ? {
      id: `note-${Date.now()}`,
      stageKey: `OP-${(targetIndex + 1) * 10}`,
      stageName: opToSign.name,
      author: operatorName,
      text: noteText,
      timestamp: timestampStr
    } : null;

    const existingHistory = Array.isArray(woData?.notesHistory) ? woData.notesHistory : [];
    const updatedHistory = newNoteEntry ? [newNoteEntry, ...existingHistory] : existingHistory;

    const updatedWo = {
      ...woData,
      progress: newProgress,
      progress_percentage: newProgress,
      currentStage: newStage,
      status: newStatus,
      assignedOperator: operatorName,
      ...(noteText ? {
        notes: noteText,
        technicianNotes: noteText,
        lastNoteBy: operatorName,
        lastNoteAt: timestampStr,
        notesHistory: updatedHistory
      } : {
        notesHistory: updatedHistory
      })
    };

    setWoData(updatedWo);

    // Save to local storage
    try {
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) {
        const wos = JSON.parse(stored);
        const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
        localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
      }
    } catch (e) {
      console.warn('Could not persist to local storage:', e);
    }

    // Live DB update
    try {
      if (opToSign.dbId) {
        await workOrderService.advanceWorkOrderItem(opToSign.dbId, 'Completed');
      }
      const nextOp = updatedOperations[targetIndex + 1];
      if (nextOp && nextOp.dbId) {
        await workOrderService.advanceWorkOrderItem(nextOp.dbId, 'In Progress');
      }
      const woDbId = woData?.dbId || workOrder?.dbId;
      if (woDbId) {
        await workOrderService.updateWorkOrderStatus(woDbId, newStatus, newProgress);
      }
    } catch (err) {
      console.warn('[WorkOrderDetailScreen] Background sync error:', err);
    } finally {
      setIsSigningOff(false);
      setIsSignOffModalOpen(false);
    }

    // Trigger cross-tab event
    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));

    if (onNotify) {
      onNotify(
        newProgress === 100
          ? `Work Order ${woData?.id || ''} fully completed & signed off with technician note!`
          : `Stage OP-${(targetIndex + 1) * 10} signed off by ${operatorName}. Technician note saved.`
      );
    }
  };

  // Open general note modal
  const handleOpenGeneralNoteModal = () => {
    setGeneralNoteAuthor(woData?.assignedOperator?.replace(/\s*\(.*\)/, '').trim() || 'V. Shinde');
    setGeneralNoteText('');
    setIsGeneralNoteModalOpen(true);
  };

  // Save standalone shop floor handover / observation note
  const handleSaveGeneralNote = () => {
    const text = generalNoteText.trim();
    if (!text) return;
    const author = generalNoteAuthor.trim() || 'Shop Floor Specialist';
    const timestampStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ' ' + 
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newNoteEntry = {
      id: `note-${Date.now()}`,
      stageKey: woData?.currentStage || 'Manufacturing',
      stageName: woData?.currentStage || 'Shop Floor',
      author,
      text,
      timestamp: timestampStr
    };

    const existingHistory = Array.isArray(woData?.notesHistory) ? woData.notesHistory : [];
    const updatedHistory = [newNoteEntry, ...existingHistory];

    const updatedWo = {
      ...woData,
      notes: text,
      technicianNotes: text,
      lastNoteBy: author,
      lastNoteAt: timestampStr,
      notesHistory: updatedHistory
    };

    setWoData(updatedWo);

    try {
      const stored = localStorage.getItem('gps_local_work_orders');
      if (stored) {
        const wos = JSON.parse(stored);
        const nextWos = wos.map(w => (w.id === updatedWo.id || w.dbId === updatedWo.id) ? updatedWo : w);
        localStorage.setItem('gps_local_work_orders', JSON.stringify(nextWos));
      }
    } catch (e) {
      console.warn('Could not persist note:', e);
    }

    window.dispatchEvent(new CustomEvent('gps_entities_updated', { detail: { entity: 'production' } }));
    setIsGeneralNoteModalOpen(false);
    setGeneralNoteText('');
    if (onNotify) onNotify(`Technician note logged on ${woData?.id || 'work order'}.`);
  };

  // Backward-compatible shortcut to advance operation
  const handleAdvanceOperation = async (targetOp = null) => {
    handleOpenSignOff(targetOp);
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
      <div className="page-header">
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('production')}
        >
          <ArrowLeft size={14} />
          <span>Back to Production Board</span>
        </button>

        <div className="page-actions">
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setPreviewDoc({
                ...wo,
                operations,
                type: 'Job Traveler',
                id: wo.id || wo.workOrderNumber || 'WO-2026-0182'
              });
              setIsPreviewOpen(true);
            }}
          >
            <Printer size={14} />
            <span>Print Traveler (PDF)</span>
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleOpenGeneralNoteModal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            title="Log technician handover remarks or metrology notes"
          >
            <MessageSquare size={14} color="#7A1F3D" />
            <span>Technician Note</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => handleOpenSignOff()}
            disabled={isSigningOff}
          >
            <Check size={14} />
            <span>{isSigningOff ? 'Signing Off...' : 'Sign Off Active Op'}</span>
          </button>
        </div>
      </div>

      <div className="content-body">

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
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Current Operation</div>
            <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{wo.currentOperation || 'Material Preparation'}</div>
          </div>
        </div>

        <div style={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
            <span>Overall Manufacturing Completion</span>
            <span className="mono">{completedCount} of {totalCount} Stages Complete</span>
          </div>
          <ProgressBar progress={computedProgress} height={8} />
        </div>

        {wo.notes && (
          <div style={{ margin: '0 20px 14px 20px', padding: '10px 14px', background: '#fdf2f4', border: '1px solid #f9d8e1', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <MessageSquare size={14} color="#7A1F3D" style={{ flexShrink: 0 }} />
              <div>
                <span style={{ color: '#7A1F3D', fontWeight: 600, marginRight: '6px' }}>Technician Note:</span>
                <span style={{ color: 'var(--text-main)' }}>{wo.notes}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {wo.lastNoteAt && (
                <span className="mono" style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                  {wo.lastNoteBy ? `${wo.lastNoteBy} · ` : ''}{wo.lastNoteAt}
                </span>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleOpenGeneralNoteModal}
                style={{ fontSize: '11px', padding: '2px 6px', height: '22px', color: '#7A1F3D' }}
              >
                + Add Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'operations', label: 'Manufacturing Operations & Routing', count: operations.length },
          { id: 'notes', label: 'Technician Notes & Log', count: (woData?.notesHistory?.length || (woData?.notes ? 1 : 0)) },
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
                  <th>Machine / Workstation</th>
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
                      {op.notes && (
                        <div style={{ marginTop: '4px', fontSize: '11px', color: '#7A1F3D', background: '#fdf2f4', border: '1px solid #f9d8e1', borderRadius: '4px', padding: '2px 8px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <MessageSquare size={10} />
                          <span>{op.notes}</span>
                        </div>
                      )}
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
                          onClick={() => handleOpenSignOff(op)}
                          disabled={isSigningOff}
                          style={{ minWidth: '82px', justifyContent: 'center', gap: '4px' }}
                          title="Sign off operation and add inspection note"
                        >
                          <Check size={13} />
                          <span>{isSigningOff ? 'Signing...' : 'Sign Off & Note'}</span>
                        </button>
                      ) : op.status === 'Completed' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                            <CheckCircle size={14} /> Passed
                          </span>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleOpenSignOff(op)}
                            title="Edit or add technician note for this stage"
                            style={{ padding: '2px 5px', height: '22px' }}
                          >
                            <MessageSquare size={12} color="#7A1F3D" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenSignOff(op)}
                          disabled={isSigningOff}
                          style={{ minWidth: '78px', justifyContent: 'center', fontSize: '11px', padding: '3px 8px' }}
                          title="Complete this operation stage with note"
                        >
                          Sign Off
                        </button>
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

      {/* Tab: Technician Notes & Handover Log */}
      {activeTab === 'notes' && (
        <div className="section-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={16} color="#7A1F3D" />
                <span>Shop Floor Notes & Stage Handover Log</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Chronological inspection remarks, runout measurements, and operator handover notes for {wo.id}.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenGeneralNoteModal}
              style={{ background: '#7A1F3D', borderColor: '#7A1F3D', gap: '5px' }}
            >
              <Plus size={13} />
              <span>+ Add Note</span>
            </button>
          </div>

          <div style={{ padding: '20px' }}>
            {(!woData.notesHistory || woData.notesHistory.length === 0) && !woData.notes ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <MessageSquare size={36} style={{ opacity: 0.3, margin: '0 auto 10px', color: '#7A1F3D' }} />
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)', marginBottom: '4px' }}>No Notes Recorded Yet</div>
                <div style={{ fontSize: '12px', maxWidth: '340px', margin: '0 auto 14px' }}>
                  Technicians can add notes when signing off manufacturing stages or log observations at any time.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleOpenGeneralNoteModal}
                >
                  <Plus size={13} />
                  <span>Log First Note</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {woData.notes && (!woData.notesHistory || woData.notesHistory.length === 0) && (
                  <div style={{ padding: '14px 16px', background: '#fdf2f4', border: '1px solid #f9d8e1', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span className="badge badge-primary mono" style={{ fontSize: '11px', background: '#7A1F3D', color: '#fff' }}>
                        {woData.currentStage || 'Manufacturing'}
                      </span>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {woData.lastNoteAt || 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5 }}>
                      {woData.notes}
                    </div>
                    {woData.lastNoteBy && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Logged by: <strong>{woData.lastNoteBy}</strong>
                      </div>
                    )}
                  </div>
                )}

                {woData.notesHistory && woData.notesHistory.map((nh, nIdx) => (
                  <div key={nh.id || nIdx} style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge badge-neutral mono" style={{ fontSize: '11px', color: '#7A1F3D', borderColor: '#e2ccd5', background: '#fff' }}>
                          {nh.stageKey ? `${nh.stageKey}: ` : ''}{nh.stageName || 'Operation'}
                        </span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                          {nh.author || 'Technician'}
                        </span>
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {nh.timestamp}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                      {nh.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
              { role: 'Production Lead', name: 'V. R. Kulkarni', station: 'Management Cell' },
              { role: 'Machining Tech', name: 'Rajesh Patil', station: 'CNC Turning Center' },
              { role: 'Master Grinder', name: 'Suresh Sawant', station: 'Studer S33 Grinding' },
              { role: 'Assembly Specialist', name: 'Vikram Shinde', station: 'Clean Room Assembly' },
              { role: 'QC Engineer', name: 'Milind Joshi', station: 'Metrology Lab' }
            ].map((member, idx) => (
              <div key={idx} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                  {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{member.role}</div>
                  <div style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '2px', fontWeight: 500 }}>{member.station}</div>
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

      {/* Shop Floor Job Traveler Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />

      {/* Operation Sign-off & Technician Note Modal */}
      {isSignOffModalOpen && selectedOpForSignOff && (
        <Modal
          isOpen={isSignOffModalOpen}
          onClose={() => setIsSignOffModalOpen(false)}
          title={`Operation Sign-off & Technician Note — ${selectedOpForSignOff.name}`}
          maxWidth="600px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSignOffModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSignOff}
                disabled={isSigningOff}
                style={{ background: '#7A1F3D', borderColor: '#7A1F3D' }}
              >
                <Check size={14} />
                <span>{isSigningOff ? 'Signing...' : 'Complete & Sign Off Stage'}</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '12px' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '3px' }}>
                <span className="mono">{wo.id}</span> · {wo.spindleModel} ({wo.spindleSerial})
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                Machine: <strong>{selectedOpForSignOff.machine}</strong> • Workstation Status: <span className="badge badge-neutral mono" style={{ fontSize: '10.5px' }}>{selectedOpForSignOff.status}</span>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={13} color="#7A1F3D" />
                <span>Operating Technician / QC Sign-off Lead</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={signOffOperator}
                onChange={e => setSignOffOperator(e.target.value)}
                placeholder="Operator name (e.g., V. Shinde, Studer S33 Cell Lead)"
                style={{ fontSize: '12.5px' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MessageSquare size={13} color="#7A1F3D" />
                <span>Technician & Metrology Inspection Notes</span>
              </label>

              <textarea
                className="form-control"
                rows={3}
                style={{ fontSize: '12px', lineHeight: '1.5' }}
                value={signOffNoteText}
                onChange={e => setSignOffNoteText(e.target.value)}
                placeholder="Record measured journal diameters, nose runout limit, grinding tolerances, hardness readings, bearing preload, or handover remarks..."
                autoFocus
              />

              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Quick Preset Chips:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    '✓ Dimensions verified within ±0.002 mm tolerance',
                    '✓ Hardness tested & verified (HRC 60-62)',
                    '✓ Shaft journal runout < 0.0008 mm certified',
                    '✓ Bearings hot-induction fitted in ISO Class 6 cell',
                    '✓ Balanced to ISO 1940 Grade G0.4 @ 24,000 RPM',
                    '✓ 4-Hour dynamic thermal run-in test passed',
                    '✓ Drawbar clamping force verified (18 kN)',
                    '✓ Metrology laser inspection accepted'
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        borderColor: '#e2e8f0'
                      }}
                      onClick={() => {
                        setSignOffNoteText(prev => prev ? `${prev} • ${preset}` : preset);
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* General Shop Floor Handover Note Modal */}
      {isGeneralNoteModalOpen && (
        <Modal
          isOpen={isGeneralNoteModalOpen}
          onClose={() => setIsGeneralNoteModalOpen(false)}
          title={`Log Technician Handover Note — ${wo.id}`}
          maxWidth="560px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsGeneralNoteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveGeneralNote}
                style={{ background: '#7A1F3D', borderColor: '#7A1F3D' }}
              >
                <Check size={14} />
                <span>Save Note</span>
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={13} color="#7A1F3D" />
                <span>Technician Name / Station</span>
              </label>
              <input
                type="text"
                className="form-control"
                value={generalNoteAuthor}
                onChange={e => setGeneralNoteAuthor(e.target.value)}
                placeholder="Technician name..."
                style={{ fontSize: '12.5px' }}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MessageSquare size={13} color="#7A1F3D" />
                <span>Technician Note / Observation</span>
                <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <textarea
                className="form-control"
                rows={4}
                style={{ fontSize: '12px', lineHeight: '1.5' }}
                value={generalNoteText}
                onChange={e => setGeneralNoteText(e.target.value)}
                placeholder="Log shop floor notes, machine calibration status, tooling wear observations, or shift handover remarks..."
                autoFocus
              />

              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Quick Preset Chips:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[
                    '✓ Shift handover: rough turning complete, staged for heat treat',
                    '✓ Bearing journals pre-ground; ready for finish pass',
                    '✓ Cleanroom assembly staged; waiting for dynamic rig',
                    '✓ Vibration spectrum FFT baseline verified within limits',
                    '⚠ Tool wear detected on Okuma LB3000 insert; replaced'
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        borderColor: '#e2e8f0'
                      }}
                      onClick={() => {
                        setGeneralNoteText(prev => prev ? `${prev} • ${preset}` : preset);
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
      </div>
    </div>
  );
}
