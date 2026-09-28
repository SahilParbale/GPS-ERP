import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import { spindleModelService } from '../services/database/spindleModelService';
import { DetailScreenSkeleton } from '../components/common/Skeleton';
import { 
  ArrowLeft, QrCode, Download, Printer, Shield, 
  Wrench, Activity, CheckCircle, Cpu, FileCheck,
  RefreshCw, AlertCircle 
} from 'lucide-react';

export default function SpindleDetailScreen({ spindle, onNavigate, onNotify }) {
  const [spData, setSpData] = useState(spindle || null);
  const [qualityRecords, setQualityRecords] = useState([]);
  const [components, setComponents] = useState([]);
  const [isLoading, setIsLoading] = useState(!spindle);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('specs');

  const loadSpindleDetail = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let currentSp = spindle;

    if (!currentSp) {
      const fleetRes = await spindleModelService.getSpindles({ limit: 1 });
      if (fleetRes.error || !fleetRes.data?.[0]) {
        setError(fleetRes.error || { message: 'No serialized spindles found in database' });
        setIsLoading(false);
        return;
      }
      currentSp = fleetRes.data[0];
    }

    const serialOrId = currentSp.serialNumber || currentSp.id;
    const [detailRes, qaRes, compRes] = await Promise.all([
      spindleModelService.getSpindleBySerial(serialOrId),
      spindleModelService.getSpindleQualityRecords(serialOrId),
      spindleModelService.getSpindleComponents(serialOrId)
    ]);

    if (detailRes.error) {
      setError(detailRes.error);
      setIsLoading(false);
      return;
    }

    setSpData(detailRes.data || currentSp);
    setQualityRecords(qaRes.data || []);
    setComponents(compRes.data || []);
    setIsLoading(false);
  }, [spindle]);

  useEffect(() => {
    loadSpindleDetail();
  }, [loadSpindleDetail]);

  if (isLoading) {
    return <DetailScreenSkeleton hasSchematic={true} />;
  }

  if (error || !spData) {
    return (
      <div className="content-area">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate('spindles')}
          >
            <ArrowLeft size={14} />
            <span>Back to Spindle Registry</span>
          </button>
        </div>
        <div className="section-card" style={{ padding: '32px 24px', borderLeft: '4px solid var(--danger, #dc2626)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <AlertCircle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                Unable to Load Spindle Asset Telemetry
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {error?.sanitizedMessage || error?.message || 'Database connection error retrieving serialized spindle asset.'}
              </p>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={loadSpindleDetail}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={13} />
                <span>Retry Connection</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sp = spData;

  return (
    <div className="content-area">
      {/* Back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <button 
          type="button" 
          className="btn btn-secondary btn-sm"
          onClick={() => onNavigate('spindles')}
        >
          <ArrowLeft size={14} />
          <span>Back to Spindle Registry</span>
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNotify && onNotify(`Digital Metrology Certificate generated for ${sp.serialNumber}`)}
          >
            <Download size={14} />
            <span>Download Certificate</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => onNotify && onNotify(`QR Code Pass printed for ${sp.serialNumber}`)}
          >
            <Printer size={14} />
            <span>Print QR Shop Pass</span>
          </button>
        </div>
      </div>

      {/* Spindle Digital Twin Banner & Schematic */}
      <div className="section-card">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '4px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
              <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '36px', display: 'block', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 className="mono" style={{ fontSize: '22px', fontWeight: 700 }}>{sp.serialNumber}</h1>
                <StatusBadge status={sp.status} />
                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  {sp.type}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Model: <strong>{sp.model}</strong> • Deployed at: <strong>{sp.customer}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Balance Grade</div>
              <div className="mono" style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>{sp.balanceGrade || 'ISO G0.28'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nose Runout</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>{sp.runoutTaper || '0.0008 mm'}</div>
            </div>
          </div>
        </div>

        {/* Industrial CAD / Schematic Visualization Box */}
        <div className="spindle-schematic">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="var(--primary)" />
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-main)', letterSpacing: '0.04em' }}>
                DIGITAL TWIN SCHEMATIC & SUBSYSTEM TELEMETRY
              </span>
            </div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              SPEC-REV-2026.02
            </span>
          </div>

          {/* SVG Precision Blueprint of Spindle Assembly */}
          <div style={{ width: '100%', overflowX: 'auto', textAlign: 'center', padding: '10px 0' }}>
            <svg viewBox="0 0 760 140" style={{ width: '100%', maxWidth: '760px', height: 'auto', background: '#FFFFFF', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              {/* Spindle Body */}
              <rect x="120" y="30" width="500" height="80" rx="4" fill="#FCF8F9" stroke="#7A1F3D" strokeWidth="1.5"/>
              
              {/* Shaft Centerline */}
              <line x1="20" y1="70" x2="740" y2="70" stroke="#7A1F3D" strokeWidth="1" strokeDasharray="6,4" opacity="0.4"/>
              
              {/* Spindle Nose */}
              <polygon points="50,45 120,35 120,105 50,95" fill="#f1f5f9" stroke="#334155" strokeWidth="1.5"/>
              <text x="65" y="74" fontSize="9" fill="#0f172a" fontFamily="monospace" fontWeight="bold">NOSE</text>
              
              {/* Front Bearings Set */}
              <rect x="150" y="35" width="40" height="70" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5"/>
              <text x="155" y="74" fontSize="8" fill="#991b1b" fontWeight="bold">BRG-F</text>
              
              {/* Motor Stator Pack */}
              <rect x="250" y="38" width="220" height="64" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5"/>
              <text x="320" y="74" fontSize="10" fill="#92400e" fontWeight="bold">HF STATOR (15 kW)</text>
              
              {/* Rear Bearings Set */}
              <rect x="520" y="35" width="35" height="70" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5"/>
              <text x="524" y="74" fontSize="8" fill="#991b1b" fontWeight="bold">BRG-R</text>
              
              {/* Rotary Encoder */}
              <rect x="580" y="42" width="30" height="56" fill="#e0e7ff" stroke="#4f46e5" strokeWidth="1.5"/>
              <text x="584" y="73" fontSize="8" fill="#3730a3" fontWeight="bold">ENC</text>
              
              {/* Tool Clamping Drawbar */}
              <rect x="620" y="55" width="80" height="30" fill="#f3f4f6" stroke="#475569" strokeWidth="1.5"/>
              <text x="635" y="73" fontSize="8" fill="#1e293b" fontWeight="bold">DRAWBAR</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'specs', label: 'Engineering Specifications' },
          { id: 'components', label: 'BOM Components', count: components.length },
          { id: 'qc', label: 'QC Acceptance & Tolerances', count: qualityRecords.length },
          { id: 'test_results', label: 'Dynamic Run-in Test' },
          { id: 'qr', label: 'Asset QR Code Pass' }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Specs */}
      {activeTab === 'specs' && (
        <div className="section-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: 'var(--border-color)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            {[
              { label: 'Spindle Model Code', value: sp.model },
              { label: 'Spindle Architecture', value: sp.type },
              { label: 'Maximum Speed Rating', value: sp.rpm },
              { label: 'Rated Motor Power', value: sp.power },
              { label: 'Nominal Torque Rating', value: sp.torque },
              { label: 'Tool Interface Standard', value: sp.interface },
              { label: 'Lubrication Method', value: sp.lubrication },
              { label: 'Bearing Configuration', value: sp.bearings },
              { label: 'Cooling System', value: sp.cooling },
              { label: 'Dynamic Runout at Taper', value: sp.runoutTaper },
              { label: 'Vibration Velocity RMS', value: sp.vibrationRms },
              { label: 'Clamping Retention Force', value: sp.clampForce },
              { label: 'Manufacturing Date', value: sp.manufacturingDate },
              { label: 'Warranty Coverage', value: sp.warranty }
            ].map((row, idx) => (
              <div key={idx} style={{ background: '#ffffff', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{row.label}</div>
                <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: '3px' }}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: BOM Components */}
      {activeTab === 'components' && (
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
                {components.map((c, idx) => (
                  <tr key={c.partNo || idx}>
                    <td className="mono" style={{ fontWeight: 600, color: 'var(--primary)' }}>{c.partNo}</td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ fontSize: '12px' }}>{c.supplier || 'GPS Certified Partner'}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{c.batch}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{c.tolerance}</td>
                    <td><StatusBadge status="Completed" size="sm" /></td>
                  </tr>
                ))}
                {components.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No components recorded for this serialized spindle asset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: QC Acceptance */}
      {activeTab === 'qc' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Final Quality Metrology Sign-Off Sheet</div>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Station: Metrology QC Bay 6</span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {qualityRecords.map((q, idx) => (
                <div key={idx} style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.parameter}</div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669', marginTop: '4px' }}>
                    {q.measured}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Tolerance: {q.tolerance} (Spec: {q.specified})
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Verified by: {q.inspector}
                  </div>
                </div>
              ))}
              {qualityRecords.length === 0 && (
                <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Air Gauge Nose Runout</div>
                  <div className="mono" style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>0.0008 mm</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Acceptance threshold ≤ 0.0010 mm</div>
                </div>
              )}
            </div>
            <div style={{ padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle size={18} color="#059669" />
              <div style={{ fontSize: '13px', color: '#047857' }}>
                This precision spindle unit has been verified and certified in full compliance with GPS Spindle Aerospace Grade Metrology Standards.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dynamic Run-in & Vibration */}
      {activeTab === 'test_results' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">4-Hour Dynamic Run-in Test Protocol Results</div>
            <span className="mono" style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Station: Test Bench Bay 5</span>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Speed Stage</th>
                  <th>Duration</th>
                  <th>Front Bearing Temp</th>
                  <th>Rear Bearing Temp</th>
                  <th>Vibration RMS (X)</th>
                  <th>Vibration RMS (Y)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { speed: '6,000 RPM (25%)', dur: '45 mins', fTemp: '24.2 °C', rTemp: '23.8 °C', vibX: '0.12 mm/s', vibY: '0.14 mm/s', status: 'Passed' },
                  { speed: '12,000 RPM (50%)', dur: '60 mins', fTemp: '27.5 °C', rTemp: '26.1 °C', vibX: '0.18 mm/s', vibY: '0.19 mm/s', status: 'Passed' },
                  { speed: '18,000 RPM (75%)', dur: '60 mins', fTemp: '31.4 °C', rTemp: '29.2 °C', vibX: '0.22 mm/s', vibY: '0.24 mm/s', status: 'Passed' },
                  { speed: '24,000 RPM (100% Max)', dur: '75 mins', fTemp: '34.2 °C (+14.2°C Rise)', rTemp: '32.1 °C', vibX: '0.27 mm/s', vibY: '0.28 mm/s', status: 'Passed' },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="mono" style={{ fontWeight: 600 }}>{row.speed}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{row.dur}</td>
                    <td className="mono">{row.fTemp}</td>
                    <td className="mono">{row.rTemp}</td>
                    <td className="mono" style={{ color: 'var(--primary)' }}>{row.vibX}</td>
                    <td className="mono" style={{ color: 'var(--primary)' }}>{row.vibY}</td>
                    <td><StatusBadge status={row.status} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: QR Code */}
      {activeTab === 'qr' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Shop Floor & Field Service QR Tag</div>
          </div>
          <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ padding: '20px', background: '#ffffff', border: '2px solid #0f172a', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <svg width="180" height="180" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#0f172a" />
                <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#0f172a" />
                <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#0f172a" />
                <circle cx="50" cy="50" r="10" fill="#7A1F3D" />
              </svg>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginTop: '12px' }}>
                {sp.serialNumber}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {sp.model} • {sp.customer}
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
              Scan with any shop floor handheld terminal or mobile service unit to verify calibration records and open traveler history.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
