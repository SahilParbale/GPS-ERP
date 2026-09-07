import React from 'react';

export default function StatusBadge({ status, size = 'normal' }) {
  if (!status) return null;

  const getStatusType = (str) => {
    const s = String(str).toLowerCase();
    if (s.includes('pass') || s.includes('complete') || s.includes('approv') || s.includes('ready') || s.includes('dispatch') || s.includes('paid') || s.includes('operat') || s === 'working') {
      return 'badge-success';
    }
    if (s.includes('break') || s.includes('pend') || s.includes('review') || s.includes('diagnos') || s.includes('inspect') || s.includes('low stock') || s.includes('partial') || s.includes('active')) {
      return 'badge-warning';
    }
    if (s.includes('overload') || s.includes('critic') || s.includes('reject') || s.includes('overdue') || s.includes('fail') || s.includes('expir') || s.includes('alarm')) {
      return 'badge-danger';
    }
    if (s.includes('meet') || s.includes('progress') || s.includes('machin') || s.includes('assembl') || s.includes('grind') || s.includes('balanc') || s.includes('test') || s.includes('repair') || s.includes('service')) {
      return 'badge-info';
    }
    if (s.includes('avail') || s.includes('idle') || s.includes('offline')) {
      return 'badge-neutral';
    }
    return 'badge-neutral';
  };

  const badgeClass = getStatusType(status);

  return (
    <span className={`status-badge ${badgeClass} ${size === 'sm' ? 'btn-sm' : ''}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
}
