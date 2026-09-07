import React from 'react';

export default function ProgressBar({ progress = 0, showLabel = true, height = 6 }) {
  const clamped = Math.min(100, Math.max(0, progress));
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
      <div className="progress-bar-wrap" style={{ height: `${height}px`, flex: 1 }}>
        <div 
          className="progress-bar-fill" 
          style={{ width: `${clamped}%` }} 
        />
      </div>
      {showLabel && (
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
          {clamped}%
        </span>
      )}
    </div>
  );
}
