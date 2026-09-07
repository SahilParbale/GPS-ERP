import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import Tabs from '../components/common/Tabs';
import { PLANT_INFO } from '../data/mockData';
import { 
  Building, Users, Bell, Shield, Sliders, 
  Save, CheckCircle, Wrench 
} from 'lucide-react';

export default function SettingsScreen({ onNotify }) {
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = (e) => {
    e.preventDefault();
    onNotify('System preferences and plant configuration updated successfully');
  };

  return (
    <div className="content-area">
      <PageHeader 
        title="Industrial ERP Configuration & Settings" 
        subtitle="Manage company plant details, user role-based permissions, and machine calibrations"
      >
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSave}
        >
          <Save size={14} />
          <span>Save Changes</span>
        </button>
      </PageHeader>

      <Tabs 
        tabs={[
          { id: 'profile', label: 'Company Profile & Facility' },
          { id: 'users', label: 'Authorized Users & Roles' },
          { id: 'calibration', label: 'Machine Bay Calibration Cycles' },
          { id: 'notifications', label: 'Alert & Shift Preferences' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Tab: Company Profile */}
      {activeTab === 'profile' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Building size={16} color="#0284c7" />
              <span>Enterprise Identity & Legal Registration</span>
            </div>
          </div>
          <form onSubmit={handleSave} style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', marginBottom: '20px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                <img src="/logo.jpg" alt="General Precision Spindles" style={{ height: '44px', display: 'block', objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>General Precision Spindles Emblem & Logo</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Official brand emblem active across navigation shell, invoices, metrology reports, and shop floor documentation.</div>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Corporate Entity Name</label>
                <input type="text" className="form-control" defaultValue={PLANT_INFO.name} />
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturing Facility</label>
                <input type="text" className="form-control" defaultValue={PLANT_INFO.facility} />
              </div>

              <div className="form-group full-width">
                <label className="form-label">Factory Physical Address</label>
                <input type="text" className="form-control" defaultValue={PLANT_INFO.address} />
              </div>

              <div className="form-group">
                <label className="form-label">GSTIN Identification Number</label>
                <input type="text" className="form-control mono" defaultValue={PLANT_INFO.gstin} />
              </div>

              <div className="form-group">
                <label className="form-label">Quality Standards Certification</label>
                <input type="text" className="form-control" defaultValue={PLANT_INFO.iso} />
              </div>

              <div className="form-group">
                <label className="form-label">Current Operating Shift Mode</label>
                <select className="form-control">
                  <option>Shift A (07:00 - 15:30) & Shift B (15:30 - 00:00)</option>
                  <option>Continuous 3-Shift 24x7 Operation</option>
                  <option>Single General Shift</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Default Currency & Precision</label>
                <input type="text" className="form-control" defaultValue="INR (₹) • Metrology in Microns (µm)" disabled />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Users & Roles */}
      {activeTab === 'users' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Users size={16} color="#0284c7" />
              <span>Plant Operators & Role Access Control</span>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNotify('New user invite generated')}>
              + Add User
            </button>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Department / Bay</th>
                  <th>Assigned Role</th>
                  <th>Permission Level</th>
                  <th>System Access</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "GPS Spindles", dept: "Plant Operations", role: "Production Head / Admin", access: "Full System Admin", status: "Active" },
                  { name: "Milind Joshi", dept: "Metrology & QA", role: "Quality Assurance Lead", access: "QC Sign-Off & Certs", status: "Active" },
                  { name: "Suresh Sawant", dept: "Bay 2 Studer CNC", role: "Sr. Precision Grinder", access: "Shop Floor Routing", status: "Active" },
                  { name: "Vikram Shinde", dept: "Bay 3 Cleanroom", role: "Spindle Rebuild Lead", access: "Assembly & Service Log", status: "Active" },
                  { name: "Dinesh More", dept: "Dispatch & Stores", role: "Inventory Controller", access: "BOM & PO Procurement", status: "Active" },
                ].map((user, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{user.name}</td>
                    <td style={{ fontSize: '12px' }}>{user.dept}</td>
                    <td style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>{user.role}</td>
                    <td style={{ fontSize: '12px' }}>{user.access}</td>
                    <td className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ERP-AUTH-OK</td>
                    <td>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: '#ecfdf5',
                        color: '#047857'
                      }}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Calibration */}
      {activeTab === 'calibration' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Wrench size={16} color="#0284c7" />
              <span>Machine Tool & Air Gauge Master Calibration Log</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Equipment Asset</th>
                  <th>Station Cell</th>
                  <th>Master Calibrated Standard</th>
                  <th>Last Calibrated</th>
                  <th>Next Due</th>
                  <th>Calibration Agency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { asset: "Studer S33 CNC Grinder Headstock", station: "Bay 2", standard: "VDI / DGQ 3441", last: "2026-01-10", next: "2026-07-10", agency: "Studer Switzerland Certified", status: "Valid" },
                  { asset: "Schenck SmartBalancing Rig", station: "Bay 4", standard: "ISO 21940-21 Grade 0.4", last: "2026-02-01", next: "2026-08-01", agency: "Schenck India", status: "Valid" },
                  { asset: "Mahr Federal Air Collet Probe Set", station: "Bay 6", standard: "DIN 2271 Taper Ring Gauge", last: "2026-02-15", next: "2026-05-15", agency: "Mahr India Metrology", status: "Valid" },
                  { asset: "ForceCheck HSK-A63 Force Meter", station: "Bay 6", standard: "NABL Traceable 0-30 kN", last: "2026-01-20", next: "2027-01-20", agency: "NABL Accredited Lab", status: "Valid" },
                ].map((cal, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{cal.asset}</td>
                    <td style={{ fontSize: '12px' }}>{cal.station}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{cal.standard}</td>
                    <td className="mono" style={{ fontSize: '12px' }}>{cal.last}</td>
                    <td className="mono" style={{ fontSize: '12px', color: '#0284c7' }}>{cal.next}</td>
                    <td style={{ fontSize: '12px' }}>{cal.agency}</td>
                    <td>
                      <span style={{ 
                        padding: '3px 8px', 
                        borderRadius: '4px', 
                        fontSize: '11px', 
                        fontWeight: 600,
                        background: '#ecfdf5',
                        color: '#047857'
                      }}>
                        {cal.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Notifications */}
      {activeTab === 'notifications' && (
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">
              <Bell size={16} color="#0284c7" />
              <span>Plant Floor Alert Triggers</span>
            </div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { title: "Ceramic Bearings Low Stock Reorder Threshold", desc: "Trigger automated procurement alert when stock drops below 10 pairs.", enabled: true },
              { title: "Nose Taper Runout Tolerance Exceeded (> 1.0 µm)", desc: "Halt machine traveler and notify QA lead immediately upon dial test indicator alert.", enabled: true },
              { title: "Service Turnaround Exceeding 5 Days", desc: "Flag delayed service rebuilding jobs to Plant Production Manager.", enabled: true },
              { title: "Customer PO Approval Notification", desc: "Notify sales desk and auto-reserve allocated Bill of Materials in stores.", enabled: true },
            ].map((pref, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{pref.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{pref.desc}</div>
                </div>
                <input type="checkbox" defaultChecked={pref.enabled} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
