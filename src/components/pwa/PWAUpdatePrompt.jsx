import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X, Sparkles } from 'lucide-react';

/**
 * Controlled PWA update prompt.
 * Uses `virtual:pwa-register/react` to listen for new service worker in waiting state.
 * Never silently reloads active ERP sessions.
 * Only reloads when user explicitly clicks [ Update ].
 */
export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.info('[PWA] Service Worker successfully registered.');
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service Worker registration failed:', error);
    }
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        backgroundColor: '#FFFFFF',
        border: '1.5px solid #7A1F3D',
        borderRadius: '8px',
        boxShadow: '0 10px 25px -5px rgba(122, 31, 61, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        padding: '14px 16px',
        maxWidth: '360px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        animation: 'toastIn 0.2s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '6px', 
              backgroundColor: '#FAF0F3', 
              color: '#7A1F3D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Sparkles size={16} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1E293B' }}>
              New ERP Version Available
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
              A system update is ready. Click Update when you are ready to reload.
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Dismiss update notice"
          aria-label="Dismiss update notice"
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setNeedRefresh(false)}
          style={{ fontSize: '11px', padding: '4px 10px' }}
        >
          Later
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => updateServiceWorker(true)}
          style={{ 
            fontSize: '11px', 
            padding: '4px 12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <RefreshCw size={12} />
          <span>Update Now</span>
        </button>
      </div>
    </div>
  );
}
