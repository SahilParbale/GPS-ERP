import React from 'react';

export default function StatusBadge({ status, size = 'normal' }) {
  if (!status) return null;

  const getStatusType = (str) => {
    const s = String(str).toLowerCase();
    // Sent / Transmitted -> Info Blue
    if (s.includes('sent')) {
      return 'badge-info';
    }
    // Working / In Progress / Production Operations -> Pale Maroon
    if (s.includes('work') || s.includes('progress') || s.includes('machin') || s.includes('assembl') || s.includes('grind') || s.includes('balanc') || s.includes('test') || s.includes('repair') || s.includes('service') || s.includes('meet')) {
      return 'badge-maroon';
    }
    // Completed / Pass / Available / Delivered -> Pale Green
    if (s.includes('pass') || s.includes('complete') || s.includes('approv') || s.includes('ready') || s.includes('dispatch') || s.includes('paid') || s.includes('operat') || s.includes('avail')) {
      return 'badge-success';
    }
    // Pending / On Break / QC / Warnings -> Pale Amber
    if (s.includes('break') || s.includes('pend') || s.includes('review') || s.includes('diagnos') || s.includes('inspect') || s.includes('low stock') || s.includes('partial') || s.includes('active')) {
      return 'badge-warning';
    }
    // Overloaded / Critical / Failed / Blocked -> Pale Red
    if (s.includes('overload') || s.includes('critic') || s.includes('reject') || s.includes('overdue') || s.includes('fail') || s.includes('expir') || s.includes('alarm') || s.includes('blocked')) {
      return 'badge-danger';
    }
    // Offline / Idle / Neutral -> Pale Gray
    if (s.includes('offline') || s.includes('idle') || s.includes('draft')) {
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
