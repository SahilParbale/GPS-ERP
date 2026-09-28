import React from 'react';

/**
 * Primitive Shimmer Block
 */
export function Skeleton({ 
  width = '100%', 
  height = '14px', 
  borderRadius, 
  variant = 'rect', 
  className = '', 
  style = {} 
}) {
  const getRadius = () => {
    if (borderRadius) return borderRadius;
    if (variant === 'circle') return '50%';
    if (variant === 'badge') return '9999px';
    if (variant === 'text') return 'var(--radius-sm, 4px)';
    return 'var(--radius-md, 6px)';
  };

  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius: getRadius(),
        ...style
      }}
    />
  );
}

/**
 * Multi-line Text Shimmer
 */
export function SkeletonText({ lines = 2, height = '12px', gap = '6px', style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton 
          key={idx} 
          height={height} 
          width={idx === lines - 1 && lines > 1 ? '65%' : '100%'} 
        />
      ))}
    </div>
  );
}

/**
 * Metric Cards Shimmer Grid
 */
export function SkeletonMetricCards({ count = 4 }) {
  return (
    <div className="metrics-grid" style={{ marginBottom: '20px' }}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="metric-card" style={{ padding: '16px 20px' }}>
          <div className="metric-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <Skeleton width="90px" height="12px" />
            <Skeleton width="28px" height="28px" variant="circle" />
          </div>
          <div style={{ margin: '8px 0' }}>
            <Skeleton width="110px" height="26px" />
          </div>
          <div style={{ marginTop: '8px' }}>
            <Skeleton width="130px" height="11px" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Filter & Search Bar Shimmer
 */
export function SkeletonFilterBar() {
  return (
    <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '420px' }}>
        <Skeleton width="100%" height="34px" borderRadius="var(--radius-md)" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Skeleton width="110px" height="34px" borderRadius="var(--radius-md)" />
        <Skeleton width="90px" height="34px" borderRadius="var(--radius-md)" />
      </div>
    </div>
  );
}

/**
 * Data Table Shimmer
 */
export function SkeletonTable({ rows = 6, columns = [ '100px', '140px', '200px', '120px', '90px', '80px' ] }) {
  return (
    <div className="section-card" style={{ overflow: 'hidden' }}>
      <SkeletonFilterBar />
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((w, idx) => (
                <th key={idx} style={{ width: w }}>
                  <Skeleton width="75%" height="11px" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx}>
                {columns.map((w, cIdx) => (
                  <td key={cIdx}>
                    {cIdx === 0 ? (
                      <Skeleton width="85px" height="14px" />
                    ) : cIdx === columns.length - 2 ? (
                      <Skeleton width="68px" height="20px" variant="badge" />
                    ) : cIdx === columns.length - 1 ? (
                      <Skeleton width="54px" height="24px" borderRadius="var(--radius-sm)" />
                    ) : (
                      <Skeleton width={cIdx % 2 === 0 ? '70%' : '90%'} height="13px" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Page Header Skeleton
 */
export function SkeletonPageHeader({ withActions = true }) {
  return (
    <div className="page-header" style={{ marginBottom: '20px' }}>
      <div className="page-title-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Skeleton width="260px" height="24px" />
          <Skeleton width="90px" height="18px" variant="badge" />
        </div>
        <Skeleton width="380px" height="13px" />
      </div>
      {withActions && (
        <div className="page-actions" style={{ display: 'flex', gap: '8px' }}>
          <Skeleton width="100px" height="32px" borderRadius="var(--radius-md)" />
          <Skeleton width="130px" height="32px" borderRadius="var(--radius-md)" />
        </div>
      )}
    </div>
  );
}

/**
 * Pipeline Visualizer Shimmer
 */
export function SkeletonPipeline({ stages = 6 }) {
  return (
    <div className="section-card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <Skeleton width="180px" height="14px" />
        <Skeleton width="120px" height="12px" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages}, 1fr)`, gap: '10px' }}>
        {Array.from({ length: stages }).map((_, idx) => (
          <div key={idx} style={{ padding: '10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Skeleton width="60px" height="11px" style={{ marginBottom: '6px' }} />
            <Skeleton width="85%" height="13px" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Standard Table-Driven Page Skeleton (Production, Inventory, Invoices, POs, etc.)
 */
export function TablePageSkeleton({ 
  title = 'Operations', 
  hasMetrics = false, 
  metricCount = 4,
  columns = [ '110px', '160px', '180px', '130px', '90px', '80px' ],
  rows = 7
}) {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      {hasMetrics && <SkeletonMetricCards count={metricCount} />}
      <SkeletonTable rows={rows} columns={columns} />
    </div>
  );
}

/**
 * Dashboard Screen Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      <SkeletonMetricCards count={4} />
      <SkeletonPipeline stages={6} />
      
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <SkeletonTable rows={5} columns={[ '100px', '110px', '140px', '130px', '90px', '70px' ]} />
          <SkeletonTable rows={4} columns={[ '160px', '100px', '90px', '80px', '70px' ]} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="section-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <Skeleton width="140px" height="15px" />
              <Skeleton width="60px" height="12px" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <Skeleton width="120px" height="13px" style={{ marginBottom: '6px' }} />
                  <Skeleton width="80%" height="11px" />
                </div>
              ))}
            </div>
          </div>

          <div className="section-card" style={{ padding: '20px' }}>
            <Skeleton width="150px" height="15px" style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Skeleton width="120px" height="12px" />
                  <Skeleton width="45px" height="12px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Detail Screen Skeleton (Work Order Detail, Spindle Detail)
 */
export function DetailScreenSkeleton({ hasSchematic = false }) {
  return (
    <div className="content-area skeleton-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
        <Skeleton width="160px" height="30px" borderRadius="var(--radius-md)" />
      </div>

      <div className="section-card" style={{ marginBottom: '20px', overflow: 'hidden' }}>
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Skeleton width="42px" height="42px" borderRadius="var(--radius-sm)" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <Skeleton width="160px" height="22px" />
                <Skeleton width="70px" height="18px" variant="badge" />
              </div>
              <Skeleton width="280px" height="12px" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <Skeleton width="80px" height="10px" style={{ marginBottom: '4px' }} />
              <Skeleton width="90px" height="16px" />
            </div>
            <div>
              <Skeleton width="80px" height="10px" style={{ marginBottom: '4px' }} />
              <Skeleton width="70px" height="16px" />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', padding: '12px 20px', gap: '12px', background: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-color)' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <Skeleton width="60px" height="10px" style={{ marginBottom: '4px' }} />
              <Skeleton width="100px" height="13px" />
            </div>
          ))}
        </div>

        {hasSchematic && (
          <div style={{ padding: '20px' }}>
            <Skeleton width="100%" height="130px" borderRadius="var(--radius-md)" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="130px" height="34px" borderRadius="var(--radius-md)" />
        ))}
      </div>

      <SkeletonTable rows={5} columns={[ '80px', '220px', '140px', '120px', '110px', '80px' ]} />
    </div>
  );
}

/**
 * Quality Screen Skeleton
 */
export function QualityScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px' }}>
        <div className="section-card" style={{ padding: '16px' }}>
          <Skeleton width="140px" height="15px" style={{ marginBottom: '14px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <Skeleton width="110px" height="13px" />
                  <Skeleton width="50px" height="16px" variant="badge" />
                </div>
                <Skeleton width="80%" height="11px" />
              </div>
            ))}
          </div>
        </div>

        <div className="section-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <Skeleton width="220px" height="20px" style={{ marginBottom: '6px' }} />
              <Skeleton width="300px" height="12px" />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Skeleton width="80px" height="32px" borderRadius="var(--radius-md)" />
              <Skeleton width="100px" height="32px" borderRadius="var(--radius-md)" />
            </div>
          </div>
          <SkeletonTable rows={6} columns={[ '60px', '200px', '120px', '100px', '80px', '80px' ]} />
        </div>
      </div>
    </div>
  );
}

/**
 * Customer Profile Screen Skeleton
 */
export function CustomerScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px' }}>
        <div className="section-card" style={{ padding: '16px' }}>
          <Skeleton width="100%" height="32px" borderRadius="var(--radius-md)" style={{ marginBottom: '14px' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <Skeleton width="140px" height="14px" />
                  <Skeleton width="45px" height="16px" variant="badge" />
                </div>
                <Skeleton width="90px" height="11px" style={{ marginBottom: '4px' }} />
                <Skeleton width="120px" height="10px" />
              </div>
            ))}
          </div>
        </div>

        <div className="section-card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div>
              <Skeleton width="240px" height="22px" style={{ marginBottom: '6px' }} />
              <Skeleton width="180px" height="12px" />
            </div>
            <div style={{ textAlign: 'right' }}>
              <Skeleton width="100px" height="11px" style={{ marginBottom: '4px' }} />
              <Skeleton width="120px" height="22px" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} width="120px" height="32px" borderRadius="var(--radius-md)" />
            ))}
          </div>
          <SkeletonTable rows={5} columns={[ '120px', '180px', '140px', '90px', '100px' ]} />
        </div>
      </div>
    </div>
  );
}

/**
 * Workforce & Staff Management Screen Skeleton
 */
export function WorkforceScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      
      {/* 8 Top KPI Metric Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', marginBottom: '16px' }}>
        {Array.from({ length: 8 }).map((_, idx) => (
          <div key={idx} className="metric-card" style={{ padding: '12px 14px' }}>
            <div className="metric-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <Skeleton width="75px" height="11px" />
              <Skeleton width="22px" height="22px" variant="circle" />
            </div>
            <Skeleton width="60px" height="22px" style={{ margin: '4px 0' }} />
            <Skeleton width="85px" height="10px" />
          </div>
        ))}
      </div>

      {/* Activity Feed Banner Shimmer */}
      <div className="section-card" style={{ marginBottom: '14px', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Skeleton width="220px" height="15px" />
          <Skeleton width="130px" height="11px" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 10px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
              <Skeleton width="60px" height="12px" />
              <Skeleton width="2px" height="20px" />
              <Skeleton width="140px" height="13px" />
              <Skeleton width="40%" height="11px" />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Shimmer */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['120px', '140px', '130px', '160px', '140px'].map((w, i) => (
          <Skeleton key={i} width={w} height="36px" borderRadius="var(--radius-md)" />
        ))}
      </div>

      {/* Staff Grid Shimmer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="section-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Skeleton width="36px" height="36px" borderRadius="var(--radius-sm)" />
                <div>
                  <Skeleton width="110px" height="14px" style={{ marginBottom: '4px' }} />
                  <Skeleton width="80px" height="11px" />
                </div>
              </div>
              <Skeleton width="55px" height="18px" variant="badge" />
            </div>
            <Skeleton width="100%" height="24px" style={{ marginBottom: '8px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <Skeleton width="70px" height="11px" />
              <Skeleton width="60px" height="11px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Reports & Executive BI Screen Skeleton
 */
export function ReportsScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      
      {/* 4 BI Top KPI Cards */}
      <SkeletonMetricCards count={4} />

      {/* 2x2 Analytics Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        {/* Chart 1 Skeleton: Bar Chart */}
        <div className="section-card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Skeleton width="220px" height="15px" />
            <Skeleton width="80px" height="11px" />
          </div>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', paddingTop: '20px', borderBottom: '1px solid var(--border-color)', gap: '12px' }}>
              {[60, 85, 45, 90, 75, 95].map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <Skeleton width="24px" height="11px" />
                  <Skeleton width="32px" height={`${h}%`} borderRadius="4px 4px 0 0" />
                  <Skeleton width="28px" height="11px" />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
              <Skeleton width="110px" height="12px" />
              <Skeleton width="120px" height="12px" />
            </div>
          </div>
        </div>

        {/* Chart 2 Skeleton: Progress Bar Breakdown */}
        <div className="section-card">
          <div className="card-header">
            <Skeleton width="200px" height="15px" />
          </div>
          <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skeleton width="160px" height="13px" />
                  <Skeleton width="40px" height="13px" />
                </div>
                <Skeleton width="100%" height="8px" borderRadius="4px" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3 Skeleton: Quality Metrics List */}
        <div className="section-card">
          <div className="card-header">
            <Skeleton width="210px" height="15px" />
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Skeleton width="140px" height="13px" style={{ marginBottom: '6px' }} />
                  <Skeleton width="200px" height="11px" />
                </div>
                <Skeleton width="50px" height="18px" />
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4 Skeleton: Root Causes Breakdown */}
        <div className="section-card">
          <div className="card-header">
            <Skeleton width="220px" height="15px" />
          </div>
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 14px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton width="160px" height="13px" />
                <div style={{ textAlign: 'right' }}>
                  <Skeleton width="45px" height="13px" style={{ marginBottom: '4px' }} />
                  <Skeleton width="60px" height="11px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Settings & Enterprise Configuration Screen Skeleton
 */
export function SettingsScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      
      {/* 4 Settings Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['180px', '160px', '210px', '170px'].map((w, i) => (
          <Skeleton key={i} width={w} height="36px" borderRadius="var(--radius-md)" />
        ))}
      </div>

      {/* Main Settings Form Card */}
      <div className="section-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton width="240px" height="16px" />
          <Skeleton width="180px" height="12px" />
        </div>

        <div style={{ padding: '24px' }}>
          {/* Company Profile Header Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', marginBottom: '24px', background: 'var(--bg-surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Skeleton width="64px" height="64px" borderRadius="var(--radius-md)" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <Skeleton width="220px" height="18px" />
              <Skeleton width="340px" height="12px" />
            </div>
            <Skeleton width="110px" height="28px" variant="badge" />
          </div>

          {/* 2-Column Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton width="120px" height="12px" />
                <Skeleton width="100%" height="38px" borderRadius="var(--radius-md)" />
              </div>
            ))}
          </div>

          {/* Full-width Textarea Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <Skeleton width="140px" height="12px" />
            <Skeleton width="100%" height="72px" borderRadius="var(--radius-md)" />
          </div>

          {/* Form Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <Skeleton width="100px" height="36px" borderRadius="var(--radius-md)" />
            <Skeleton width="140px" height="36px" borderRadius="var(--radius-md)" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Notifications & Plant Realtime Alerts Screen Skeleton
 */
export function NotificationsScreenSkeleton() {
  return (
    <div className="content-area skeleton-fade-in">
      <SkeletonPageHeader />
      
      {/* 3 Alert Metric KPI Cards */}
      <SkeletonMetricCards count={3} />

      {/* Notifications Filter & List Card */}
      <div className="section-card">
        <SkeletonFilterBar />
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ padding: '14px 18px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: i < 2 ? 'var(--bg-surface-subtle)' : '#ffffff', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
              <Skeleton width="34px" height="34px" borderRadius="var(--radius-sm)" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Skeleton width="180px" height="14px" />
                    <Skeleton width="60px" height="16px" variant="badge" />
                  </div>
                  <Skeleton width="70px" height="11px" />
                </div>
                <Skeleton width="85%" height="12px" />
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <Skeleton width="90px" height="11px" />
                  <Skeleton width="80px" height="11px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
