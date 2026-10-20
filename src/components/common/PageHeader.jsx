import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PageHeader({ title, subtitle, badge, children, defaultOpenMobile = false }) {
  const [isMobileOpen, setIsMobileOpen] = useState(defaultOpenMobile);

  return (
    <div className={`page-header ${isMobileOpen ? 'mobile-actions-expanded' : 'mobile-actions-collapsed'}`}>
      <div className="page-header-top-row">
        <div className="page-title-group" style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1>{title}</h1>
            {badge && (
              <span className="nav-badge" style={{ backgroundColor: '#e2e8f0', color: '#334155', marginLeft: '0' }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>

        {children && (
          <button
            type="button"
            className="page-actions-toggle-mobile"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-expanded={isMobileOpen}
            aria-label={isMobileOpen ? 'Hide action buttons' : 'Show action buttons'}
            title={isMobileOpen ? 'Hide page action buttons' : 'Show page action buttons'}
          >
            <span>Actions</span>
            {isMobileOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        )}
      </div>

      {children && (
        <div className={`page-actions ${isMobileOpen ? 'is-open' : 'is-collapsed'}`}>
          {children}
        </div>
      )}
    </div>
  );
}
