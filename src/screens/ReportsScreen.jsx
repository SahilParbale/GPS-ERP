import React, { useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { 
  BarChart3, TrendingUp, Download, Calendar, 
  CheckCircle2, ShieldCheck, Wrench, DollarSign 
} from 'lucide-react';

export default function ReportsScreen({ onNotify }) {
  const [timeRange, setTimeRange] = useState('q4');

  const monthlyProduction = [
    { month: 'Sep', units: 16, target: 15 },
    { month: 'Oct', units: 19, target: 18 },
    { month: 'Nov', units: 21, target: 20 },
    { month: 'Dec', units: 24, target: 22 },
    { month: 'Jan', units: 26, target: 24 },
    { month: 'Feb', units: 28, target: 25 },
  ];

  const spindleDistribution = [
    { model: 'GPS-HSK-A63 (Motorized 24k)', percent: 42, color: '#0284c7' },
    { model: 'GPS-BT40 (Milling 15k)', percent: 28, color: '#0ea5e9' },
    { model: 'GPS-HF (High Frequency 60k)', percent: 18, color: '#38bdf8' },
    { model: 'GPS-BT50 / Heavy Geared', percent: 12, color: '#94a3b8' },
  ];

  return (
    <div className="content-area">
      <PageHeader 
        title="Manufacturing Analytics & Executive BI Reports" 
        subtitle="Spindle throughput, metrology first-pass yields, and factory operational KPIs"
        badge="Plant 1 & 2 Aggregated"
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <select 
            className="form-control"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="monthly">Current Month (Feb 2026)</option>
            <option value="q4">Q4 FY 2025-26</option>
            <option value="annual">Full Fiscal Year 2025-26</option>
          </select>

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => onNotify('Executive BI Report exported (PDF)')}
          >
            <Download size={14} />
            <span>Export Analytics</span>
          </button>
        </div>
      </PageHeader>

      {/* Top BI KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Spindles Manufactured</span>
            <div className="metric-icon-wrap"><TrendingUp size={16} /></div>
          </div>
          <div className="metric-value">214 Units</div>
          <div className="metric-footer" style={{ color: '#059669' }}>+18% YoY Growth</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">First-Pass QC Yield</span>
            <div className="metric-icon-wrap" style={{ color: '#059669' }}><ShieldCheck size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#059669' }}>98.4%</div>
          <div className="metric-footer">&lt; 1.6% Shop Rework</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Average Service TAT</span>
            <div className="metric-icon-wrap"><Wrench size={16} /></div>
          </div>
          <div className="metric-value">4.2 Days</div>
          <div className="metric-footer" style={{ color: '#059669' }}>Target was &lt; 5.0 Days</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Annual Gross Revenue</span>
            <div className="metric-icon-wrap"><DollarSign size={16} /></div>
          </div>
          <div className="metric-value">₹16.8 Cr</div>
          <div className="metric-footer">Across OEM & Service</div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Chart 1: Monthly Production Output (SVG Bar Chart) */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Monthly Spindle Production Throughput (Units)</div>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target vs Actual</span>
          </div>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', borderBottom: '1px solid var(--border-color)' }}>
              {monthlyProduction.map((item, idx) => {
                const heightPercent = (item.units / 32) * 100;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: '#0284c7' }}>{item.units}</span>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: `${heightPercent}%`, 
                        background: 'linear-gradient(180deg, #0284c7, #0369a1)', 
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s'
                      }} 
                    />
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{item.month}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '10px', background: '#0284c7', borderRadius: '2px' }} />
                Units Built (Actual)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '10px', height: '2px', background: '#d97706' }} />
                Monthly Target Baseline
              </span>
            </div>
          </div>
        </div>

        {/* Chart 2: Model Distribution Breakdown */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Spindle Model Family Volume Share</div>
          </div>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {spindleDistribution.map((dist, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 500 }}>{dist.model}</span>
                  <span className="mono" style={{ fontWeight: 700 }}>{dist.percent}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${dist.percent}%`, height: '100%', background: dist.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Quality First-Pass Yield Metrics */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Metrology Quality Audit Pass Rates</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: "Nose Taper Runout (≤ 1.0 µm)", rate: "99.1%", passed: 212, inspected: 214 },
              { label: "Dynamic Balance (ISO 1940 G0.4)", rate: "98.6%", passed: 211, inspected: 214 },
              { label: "Tool Clamping Retention Force", rate: "100.0%", passed: 214, inspected: 214 },
              { label: "4-Hour Full Load Thermal Rise", rate: "97.6%", passed: 209, inspected: 214 },
            ].map((q, idx) => (
              <div key={idx} style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{q.label}</div>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{q.passed} of {q.inspected} units passed first inspection</div>
                </div>
                <span className="mono" style={{ fontWeight: 700, fontSize: '14px', color: '#059669' }}>
                  {q.rate}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Service Failure Modes */}
        <div className="section-card">
          <div className="card-header">
            <div className="card-title">Service Overhaul Root Cause Categories</div>
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { cause: "Coolant Ingress & Bearing Washout", pct: "44%", count: "16 Cases" },
              { cause: "Tool Collision & Nose Taper Deformation", pct: "28%", count: "10 Cases" },
              { cause: "Fatigued Disc Spring Clamping Force Loss", pct: "16%", count: "6 Cases" },
              { cause: "Stator Winding Heat Breakdown", pct: "12%", count: "4 Cases" },
            ].map((c, idx) => (
              <div key={idx} style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.cause}</div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: '#0284c7' }}>{c.pct}</span>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
