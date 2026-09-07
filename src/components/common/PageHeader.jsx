import React from 'react';

export default function PageHeader({ title, subtitle, badge, children }) {
  return (
    <div className="page-header">
      <div className="page-title-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1>{title}</h1>
          {badge && <span className="nav-badge" style={{ backgroundColor: '#e2e8f0', color: '#334155' }}>{badge}</span>}
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && (
        <div className="page-actions">
          {children}
        </div>
      )}
    </div>
  );
}
