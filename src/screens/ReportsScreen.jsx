import React, { useState, useEffect } from 'react';
import PageHeader from '../components/common/PageHeader';
import CustomSelect from '../components/common/CustomSelect';
import { 
  BarChart3, TrendingUp, Download, Calendar, 
  CheckCircle2, ShieldCheck, Wrench, DollarSign,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { reportService } from '../services/database/reportService';
import { exportExecutiveBiReportPdf } from '../utils/pdfGenerator';
import DocumentPreviewModal from '../components/email/DocumentPreviewModal';
import { ReportsScreenSkeleton } from '../components/common/Skeleton';

export default function ReportsScreen({ onNotify }) {
  const [timeRange, setTimeRange] = useState('q4');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Live report states
  const [kpis, setKpis] = useState({
    spindlesManufactured: 214,
    firstPassYield: 98.4,
    avgServiceTatDays: 4.2,
    annualRevenueCr: 16.8
  });

  const [monthlyProduction, setMonthlyProduction] = useState([]);
  const [spindleDistribution, setSpindleDistribution] = useState([]);
  const [qualityPassRates, setQualityPassRates] = useState([]);
  const [serviceCauses, setServiceCauses] = useState([]);

  // Load analytics from live Supabase
  const loadAnalytics = async (selectedRange = timeRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const [kpiRes, prodRes, modelRes, qualityRes, serviceRes] = await Promise.all([
        reportService.getExecutiveKpis(selectedRange),
        reportService.getMonthlyProductionThroughput(),
        reportService.getSpindleModelDistribution(),
        reportService.getQualityPassRates(),
        reportService.getServiceRootCauses()
      ]);

      if (kpiRes.error && prodRes.error) {
        setError('Failed to calculate analytics from database.');
      } else {
        if (kpiRes.data) setKpis(kpiRes.data);
        if (prodRes.data) setMonthlyProduction(prodRes.data);
        if (modelRes.data) setSpindleDistribution(modelRes.data);
        if (qualityRes.data) setQualityPassRates(qualityRes.data);
        if (serviceRes.data) setServiceCauses(serviceRes.data);
      }
    } catch (err) {
      setError(err.message || 'Error aggregating plant analytics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics(timeRange);
  }, [timeRange]);

  const handleExport = () => {
    setPreviewDoc({
      type: 'Report',
      reportTitle: `EXECUTIVE BI & OPERATIONS ANALYTICS (${timeRange.toUpperCase()})`,
      id: `BI-EXEC-${new Date().toISOString().split('T')[0]}`,
      metrics: [
        { label: 'Manufactured', value: `${kpis.spindlesManufactured} Units` },
        { label: 'First-Pass Yield', value: `${kpis.firstPassYield}%` },
        { label: 'Service Turnaround', value: `${kpis.avgServiceTatDays} Days` },
        { label: 'Annual Revenue', value: `₹${kpis.annualRevenueCr} Cr` }
      ],
      headers: ['#', 'Metric Category / Product Line', 'Measured Performance', 'Target Benchmark', 'Evaluation Status'],
      rows: [
        [1, 'Motorized High-Speed Spindles (24K - 60K RPM)', '142 Units', '120 Units', 'Exceeded Target (+18%)'],
        [2, 'Belt-Driven Machine Tool Spindles', '72 Units', '80 Units', '90% of Plan'],
        [3, 'Metrology First-Pass Acceptance Rate', `${kpis.firstPassYield}%`, '98.0%', 'ISO 9001 Compliant'],
        [4, 'Service & Repair Turnaround Time', `${kpis.avgServiceTatDays} Days`, '< 5.0 Days', 'Within SLA'],
        [5, 'Annual Revenue Generated', `₹${kpis.annualRevenueCr} Cr`, '₹15.0 Cr', 'Healthy (+12%)']
      ]
    });
    setIsPreviewOpen(true);
  };

  if (isLoading) {
    return <ReportsScreenSkeleton />;
  }

  return (
    <div className="content-area">
      <PageHeader 
        title="Manufacturing Analytics & Executive BI Reports" 
        subtitle="Spindle throughput, metrology first-pass yields, and factory operational KPIs"
        badge="Plant 1 & 2 Aggregated"
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <CustomSelect 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            style={{ minWidth: '220px' }}
            options={[
              { value: 'monthly', label: 'Current Month (Feb 2026)' },
              { value: 'q4', label: 'Q4 FY 2025-26' },
              { value: 'annual', label: 'Full Fiscal Year 2025-26' }
            ]}
          />

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => loadAnalytics(timeRange)}
            disabled={isLoading}
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={handleExport}
          >
            <Download size={14} />
            <span>Export Analytics</span>
          </button>
        </div>
      </PageHeader>

      {/* Error Banner with Retry */}
      {error && (
        <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => loadAnalytics(timeRange)}
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        </div>
      )}



      {/* Top BI KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Spindles Manufactured</span>
            <div className="metric-icon-wrap"><TrendingUp size={16} /></div>
          </div>
          <div className="metric-value">{kpis.spindlesManufactured} Units</div>
          <div className="metric-footer" style={{ color: '#059669' }}>+18% YoY Growth</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">First-Pass QC Yield</span>
            <div className="metric-icon-wrap" style={{ color: '#059669' }}><ShieldCheck size={16} /></div>
          </div>
          <div className="metric-value" style={{ color: '#059669' }}>{kpis.firstPassYield}%</div>
          <div className="metric-footer">&lt; 1.6% Shop Rework</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Average Service TAT</span>
            <div className="metric-icon-wrap"><Wrench size={16} /></div>
          </div>
          <div className="metric-value">{kpis.avgServiceTatDays} Days</div>
          <div className="metric-footer" style={{ color: '#059669' }}>Target was &lt; 5.0 Days</div>
        </div>

        <div className="metric-card">
          <div className="metric-top">
            <span className="metric-label">Annual Gross Revenue</span>
            <div className="metric-icon-wrap"><DollarSign size={16} /></div>
          </div>
          <div className="metric-value">₹{kpis.annualRevenueCr} Cr</div>
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
                const heightPercent = Math.min(100, Math.max(10, (item.units / 32) * 100));
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary)' }}>{item.units}</span>
                    <div 
                      style={{ 
                        width: '32px', 
                        height: `${heightPercent}%`, 
                        background: 'var(--primary)', 
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
                <span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
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
            {qualityPassRates.map((q, idx) => (
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
            {serviceCauses.map((c, idx) => (
              <div key={idx} style={{ padding: '10px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.cause}</div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--primary)' }}>{c.pct}</span>
                  <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.count}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Executive BI Report Pop-up Preview Modal */}
      <DocumentPreviewModal 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        doc={previewDoc}
        onNotify={onNotify}
      />
    </div>
  );
}
