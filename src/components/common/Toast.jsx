import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toasts = [] }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle;
        if (toast.type === 'error') Icon = AlertCircle;
        if (toast.type === 'info') Icon = Info;

        return (
          <div key={toast.id} className="toast">
            <Icon size={16} color={toast.type === 'error' ? '#f87171' : '#38bdf8'} />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
