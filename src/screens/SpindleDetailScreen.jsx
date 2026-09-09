import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import Tabs from '../components/common/Tabs';
import { SPINDLES } from '../data/mockData';
import { 
  ArrowLeft, QrCode, Download, Printer, Shield, 
  Wrench, Activity, CheckCircle, Cpu, FileCheck 
} from 'lucide-react';

export default function SpindleDetailScreen({ spindle, onNavigate, onNotify }) {
  const sp = spindle || SPINDLES[0];
  const [activeTab, setActiveTab] = useState('specs');

  return (
    <div className="content-area">
      {/* Back navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            onClick={() => onNotify(`Digital Metrology Certificate generated for ${sp.serialNumber}`)}
          >
            <Download size={14} />
            <span>Download Certificate</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => onNotify(`QR Code Pass printed for ${sp.serialNumber}`)}
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
              <div className="mono" style={{ fontWeight: 700, color: '#059669', fontSize: '14px' }}>{sp.balanceGrade}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Nose Runout</div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '14px' }}>{sp.runoutTaper}</div>
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
              <rect x="120" y="30" width="500" height="80" rx="4" fill="#F8FAF9" stroke="#0F766E" strokeWidth="1.5"/>
              
              {/* Nose Taper */}
              <polygon points="40,45 120,30 120,110 40,95" fill="#E6F4F1" stroke="#0F766E" strokeWidth="1.5"/>
              <text x="50" y="75" fill="#0F766E" fontSize="10" fontWeight="bold" fontFamily="monospace">HSK-A63</text>
              
              {/* Front Bearing Pack */}
              <rect x="140" y="35" width="55" height="70" fill="#FFF6DD" stroke="#B7791F" strokeWidth="1.5" strokeDasharray="3 2"/>
              <text x="142" y="75" fill="#B7791F" fontSize="9" fontWeight="bold" fontFamily="monospace">CERAMIC</text>
              
              {/* Built-in Stator & Rotor */}
              <rect x="230" y="35" width="220" height="70" fill="#EAF4FA" stroke="#3B82A6" strokeWidth="1.5"/>
              <text x="270" y="72" fill="#1F2933" fontSize="11" fontWeight="bold" fontFamily="monospace">15kW MOTOR CORE</text>
              <text x="290" y="88" fill="#667085" fontSize="9" fontFamily="monospace">Water Chilled</text>

              {/* Rear Bearing Pack */}
              <rect x="490" y="35" width="45" height="70" fill="#FFF6DD" stroke="#B7791F" strokeWidth="1.5" strokeDasharray="3 2"/>
              <text x="495" y="75" fill="#B7791F" fontSize="9" fontWeight="bold" fontFamily="monospace">REAR P4S</text>

              {/* Rotary Encoder */}
              <rect x="560" y="40" width="50" height="60" fill="#E6F4F1" stroke="#0F766E" strokeWidth="1.5"/>
              <text x="568" y="75" fill="#0F766E" fontSize="9" fontWeight="bold" fontFamily="monospace">ENCODER</text>

              {/* Tool Drawbar Centerline */}
              <line x1="20" y1="70" x2="650" y2="70" stroke="#C2413B" strokeWidth="1" strokeDasharray="6 3"/>

              {/* Coolant Inlets */}
              <circle cx="280" cy="30" r="5" fill="#0F766E" stroke="#E6F4F1"/>
              <circle cx="380" cy="30" r="5" fill="#0F766E" stroke="#E6F4F1"/>
            </svg>
          </div>

          {/* Subsystem Telemetry Badges */}
          <div className="schematic-grid">
            <div className="schematic-callout">
              <div className="callout-label">Max Speed Rating</div>
              <div className="callout-val">{sp.rpm}</div>
            </div>
            <div className="schematic-callout">
              <div className="callout-label">Nose Dynamic Runout</div>
              <div className="callout-val" style={{ color: 'var(--primary)' }}>{sp.runoutTaper}</div>
            </div>
            <div className="schematic-callout">
              <div className="callout-label">Dynamic Balance</div>
              <div className="callout-val" style={{ color: 'var(--status-success-text)' }}>{sp.balanceGrade}</div>
            </div>
            <div className="schematic-callout">
              <div className="callout-label">Clamping Retention Force</div>
              <div className="callout-val">{sp.clampForce}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs 
        tabs={[
          { id: 'specs', label: 'Technical Specifications' },
          { id: 'test_results', label: 'Dynamic Run-in & Vibration Data' },
          { id: 'qc', label: 'Metrology QC Acceptance' },
          { id: 'history', label: 'Production & Service History' },
          { id: 'qr', label: 'Asset QR Code Pass' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Specs */}
      {activeTab === 'specs' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Digital Twin Specification Matrix</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: 'var(--border-color)' }}>
            {[
              { label: 'Spindle Architecture', value: sp.type },
              { label: 'Tool Interface Standard', value: sp.interface },
              { label: 'Maximum Operating Speed', value: sp.rpm },
              { label: 'Continuous Power (S1)', value: sp.power },
              { label: 'Rated Torque', value: sp.torque },
              { label: 'Bearing Type & Grade', value: sp.bearings },
              { label: 'Lubrication Method', value: sp.lubrication },
              { label: 'Cooling System', value: sp.cooling },
              { label: 'Dynamic Runout at Taper', value: sp.runoutTaper },
              { label: 'Vibration Velocity RMS', value: sp.vibrationRms },
              { label: 'Clamping Retention Force', value: sp.clampForce },
              { label: 'Manufacturing Date', value: sp.manufacturingDate },
            ].map((row, idx) => (
              <div key={idx} style={{ background: '#ffffff', padding: '14px 18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{row.label}</div>
                <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main)', marginTop: '3px' }}>{row.value}</div>
              </div>
            ))}
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

      {/* Tab: QC Acceptance */}
      {activeTab === 'qc' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Final Quality Metrology Sign-Off Sheet</div>
            <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>Inspector: Milind Joshi (QA Lead)</span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Air Gauge Nose Runout</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>0.0008 mm</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Acceptance threshold ≤ 0.0010 mm</div>
              </div>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arbor Runout @ 300mm</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>0.0022 mm</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Acceptance threshold ≤ 0.0030 mm</div>
              </div>
              <div style={{ padding: '14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Balancing Unbalance</div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>0.14 g·mm (G0.28)</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Acceptance ISO 1940 Grade G0.4</div>
              </div>
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

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Asset Lifecycle & Service Log</div>
          </div>
          <div style={{ padding: '20px' }}>
            <div className="timeline">
              <div className="timeline-item">
                <div className="timeline-point done" />
                <div className="timeline-content">
                  <div className="timeline-title">Commissioned at {sp.customer}</div>
                  <div className="timeline-meta">{sp.manufacturingDate} • Nanded City Unit 1 Dispatch</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-point done" />
                <div className="timeline-content">
                  <div className="timeline-title">Passed Pre-Delivery Inspection (PDI)</div>
                  <div className="timeline-meta">Taper runout 0.0008 mm, Vibration 0.27 mm/s RMS</div>
                </div>
              </div>
              <div className="timeline-item">
                <div className="timeline-point done" />
                <div className="timeline-content">
                  <div className="timeline-title">Cleanroom Assembly & Dynamic Balancing</div>
                  <div className="timeline-meta">Schenck dual-plane balance achieved ISO G0.28</div>
                </div>
              </div>
            </div>
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
              {/* Visual Simulated High Precision QR Code */}
              <svg width="180" height="180" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#ffffff" />
                {/* QR Finder patterns */}
                <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#0f172a" />

                <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#0f172a" />

                <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#0f172a" />

                {/* Data blocks */}
                <rect x="36" y="10" width="6" height="6" fill="#0f172a" />
                <rect x="46" y="14" width="6" height="6" fill="#0f172a" />
                <rect x="56" y="10" width="6" height="6" fill="#0f172a" />
                <rect x="36" y="24" width="6" height="6" fill="#0f172a" />
                <rect x="50" y="34" width="10" height="10" fill="#0F766E" />
                <rect x="20" y="44" width="8" height="8" fill="#0f172a" />
                <rect x="36" y="54" width="14" height="6" fill="#0f172a" />
                <rect x="64" y="44" width="8" height="12" fill="#0f172a" />
                <rect x="78" y="60" width="12" height="12" fill="#0f172a" />
                <rect x="44" y="74" width="10" height="14" fill="#0f172a" />
              </svg>
              <div className="mono" style={{ fontWeight: 700, fontSize: '13px', marginTop: '10px' }}>
                {sp.serialNumber}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GPS Spindle Asset Twin</div>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '380px', textAlign: 'center' }}>
              Technicians can scan this QR code using the shop floor mobile app to instantly inspect calibration logs, test arbors, and request bearing service.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
