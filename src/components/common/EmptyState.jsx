import React from 'react';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ title = "No records found", description = "Try adjusting your search query or filters.", action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <PackageOpen size={24} />
      </div>
      <div className="empty-state-title">{title}</div>
      <p className="empty-state-desc">{description}</p>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
}
