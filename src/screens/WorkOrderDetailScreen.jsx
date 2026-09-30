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
import { 
  ArrowLeft, FileText, CheckCircle, Clock, ShieldCheck, 
  User, Printer, Check, Download, AlertCircle, Wrench,
  Users, ArrowRight, RefreshCw
} from 'lucide-react';

// Standard fallback operations catalog for shop floor traveler steps
const DEFAULT_OPERATIONS = [
  { id: 1, name: 'Raw Material Inward & Ultrasonic Sub-Surface Crack Testing', machine: 'Bay 1 - Metrology Inward', operator: 'V. Shinde', status: 'Completed', date: 'Feb 10', qcSignOff: true },
  { id: 2, name: 'CNC Rough Turning & Precision Boring (42CrMo4 Alloy)', machine: 'Bay 1 - Okuma CNC Lathe', operator: 'S. Sawant', status: 'Completed', date: 'Feb 12', qcSignOff: true },
  { id: 3, name: 'Vacuum Induction Hardening & Cryo Treatment (HRC 60-62)', machine: 'Heat Treat Sub-Station 3', operator: 'D. More', status: 'Completed', date: 'Feb 14', qcSignOff: true },
  { id: 4, name: 'Sub-Micron CNC Cylindrical Grinding (Shaft & Bearing Journal)', machine: 'Bay 2 - Studer S33 Grinder', operator: 'P. Joshi', status: 'In Progress', date: 'Active Cell', qcSignOff: false },
  { id: 5, name: 'Cleanroom Preload Ceramic Hybrid Bearings Fitting (ISO Class 6)', machine: 'Bay 4 - Cleanroom Cell', operator: 'R. Pawar', status: 'Upcoming', date: 'Next Stage', qcSignOff: false },
  { id: 6, name: 'Dynamic Dual-Plane Balancing to ISO 1940 G0.4 (24,000 RPM)', machine: 'Bay 5 - Schenck Rig', operator: 'A. Kulkarni', status: 'Upcoming', date: 'Scheduled', qcSignOff: false },
  { id: 7, name: '4-Hour Thermal Equilibrium Run-in & Vibration FFT Testing', machine: 'Bay 6 - Test Cell A', operator: 'M. Deshmukh', status: 'Upcoming', date: 'Scheduled', qcSignOff: false },
  { id: 8, name: 'Final Laser Metrology, Taper Micron Dial QC & Traveler Sign-Off', machine: 'Bay 7 - Zeiss CMM Lab', operator: 'M. Joshi', status: 'Upcoming', date: 'Target Final', qcSignOff: false }
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

  const handleAdvanceOperation = async (targetOp = null) => {
    // 1. Identify which operation to sign off
    const opToSign = targetOp || operations.find(o => o.status === 'In Progress') || operations.find(o => o.status !== 'Completed');
    if (!opToSign) {
      if (onNotify) onNotify('All operations for this work order are already signed off.');
      return;
    }

    setIsSigningOff(true);

    const targetIndex = operations.findIndex(
      o => (o.dbId && o.dbId === opToSign.dbId) || (o.id && o.id === opToSign.id) || o.name === opToSign.name
    );

    if (targetIndex === -1) {
      setIsSigningOff(false);
      return;
    }

    // 2. Compute updated operations list
    let nextActiveOpName = null;
    const updatedOperations = operations.map((op, idx) => {
      if (idx === targetIndex) {
        return {
          ...op,
          status: 'Completed',
          qcSignOff: true,
          date: 'Signed off today'
        };
      }
      // If immediate next operation was not completed, activate it
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

    // 3. Update operations state immediately
    setOperations(updatedOperations);

    // 4. Update overall work order progress and status
    const newCompletedCount = updatedOperations.filter(o => o.status === 'Completed').length;
    const newProgress = Math.round((newCompletedCount / updatedOperations.length) * 100);
    const newStage = nextActiveOpName || (newProgress === 100 ? 'Final QC Passed' : woData?.currentStage || 'Assembly');
    const newStatus = newProgress === 100 ? 'Completed' : 'In Progress';

    setWoData(prev => ({
      ...prev,
      progress: newProgress,
      progress_percentage: newProgress,
      currentStage: newStage,
      status: newStatus
    }));

    // 5. Background sync with database if identifiers exist
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
    }

    if (onNotify) {
      onNotify(
        newProgress === 100
          ? `Work Order ${woData?.id || ''} fully completed & signed off for dispatch!`
          : `Stage OP-${(targetIndex + 1) * 10} signed off. Next stage activated.`
      );
    }
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
            className="btn btn-primary btn-sm"
            onClick={() => handleAdvanceOperation()}
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
                          style={{ minWidth: '78px', justifyContent: 'center' }}
                        >
                          {isSigningOff ? 'Signing...' : 'Sign Off'}
                        </button>
                      ) : op.status === 'Completed' ? (
                        <span style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                          <CheckCircle size={14} /> Passed
                        </span>
                      ) : (
                        <button 
                          type="button" 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAdvanceOperation(op)}
                          disabled={isSigningOff}
                          style={{ minWidth: '78px', justifyContent: 'center', fontSize: '11px', padding: '3px 8px' }}
                          title="Complete this operation stage"
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

      {/* Shop Floor Job Traveler Pop-up Preview Modal */}
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
