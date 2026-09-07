import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import StatusBadge from '../components/common/StatusBadge';
import { QUALITY_INSPECTIONS } from '../data/mockData';
import { 
  ShieldCheck, CheckCircle2, XCircle, Printer, Download, 
  FileCheck, UserCheck, AlertCircle 
} from 'lucide-react';

export default function QualityScreen({ onNotify }) {
  const [selectedInspection, setSelectedInspection] = useState(QUALITY_INSPECTIONS[0]);
  const [verdict, setVerdict] = useState(selectedInspection.approvalStatus);

  const handleApprove = () => {
    setVerdict('Approved');
    onNotify(`QC Certificate approved and digitally signed by QA Lead for ${selectedInspection.spindleSerial}`);
  };

  const handleReject = () => {
    setVerdict('Rework Requested');
    onNotify(`Spindle ${selectedInspection.spindleSerial} flagged for rework at Bay 2 (Grinding)`);
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Quality Control & Metrology Acceptance" 
        subtitle="Micron-level dimensional tolerance inspection, air gauging, and dynamic balancing sign-off"
        badge="ISO 9001:2015 Standards"
      >
        <button 
          type="button" 
          className="btn btn-secondary"
          onClick={() => onNotify(`Full Calibration Certificate printed for ${selectedInspection.spindleSerial}`)}
        >
          <Printer size={14} />
          <span>Print Certificate</span>
        </button>
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleApprove}
        >
          <CheckCircle2 size={14} />
          <span>Approve Inspection</span>
        </button>
      </PageHeader>

      {/* Selected Inspection Certificate Card */}
      <div className="section-card">
        {/* Certificate Header Banner */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#ffffff', padding: '4px 8px', borderRadius: '5px', border: '1px solid var(--border-color)', flexShrink: 0 }}>
              <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '36px', display: 'block', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="mono" style={{ fontSize: '20px', fontWeight: 700 }}>{selectedInspection.id}</span>
                <StatusBadge status={verdict} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Work Order: <strong className="mono">{selectedInspection.workOrder}</strong> • Spindle Serial: <strong className="mono">{selectedInspection.spindleSerial}</strong> • Model: <strong>{selectedInspection.spindleModel}</strong>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Inspection Date</div>
              <div className="mono" style={{ fontWeight: 600 }}>{selectedInspection.inspectionDate}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Certified Inspector</div>
              <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedInspection.inspector}</div>
            </div>
          </div>
        </div>

        {/* Professional QC Parameters Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Metrology Parameter & Inspection Point</th>
                <th>Required Drawing Specification</th>
                <th>Actual Measured Value</th>
                <th>Calibrated Test Equipment</th>
                <th>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {selectedInspection.parameters.map((param) => (
                <tr key={param.id}>
                  <td className="mono" style={{ fontWeight: 600, color: 'var(--text-muted)' }}>0{param.id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{param.name}</div>
                  </td>
                  <td className="mono" style={{ color: 'var(--text-secondary)' }}>
                    {param.required}
                  </td>
                  <td className="mono" style={{ fontWeight: 700, color: '#0284c7' }}>
                    {param.actual}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {param.instrument}
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
                      background: '#ecfdf5',
                      color: '#047857',
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle2 size={12} /> {param.result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Quality Approval Stamp Box */}
        <div style={{ padding: '20px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--text-main)' }}>
              <UserCheck size={16} color="#059669" />
              <span>Inspector Notes & Sign-off Stamp</span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '600px' }}>
              {selectedInspection.notes}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleReject}
              style={{ color: '#dc2626' }}
            >
              <XCircle size={14} />
              <span>Request Re-grind Rework</span>
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleApprove}
            >
              <ShieldCheck size={14} />
              <span>Digital QA Seal & Release</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
