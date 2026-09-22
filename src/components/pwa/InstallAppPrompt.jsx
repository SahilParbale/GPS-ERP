import React, { useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, Monitor, CheckCircle2 } from 'lucide-react';

/**
 * Reusable PWA Install CTA.
 * Adapts to LoginScreen, Header, and Profile Menu.
 * Automatically hides when the app is already installed or in standalone mode.
 */
export default function InstallAppPrompt({ variant = 'header', onInstalled }) {
  const { canInstall, isInstalled, install } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!canInstall || isInstalled) {
    return null;
  }

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const res = await install();
      if (res?.outcome === 'accepted') {
        setInstallSuccess(true);
        if (onInstalled) onInstalled();
      }
    } finally {
      setIsInstalling(false);
    }
  };

  if (installSuccess) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#059669', fontWeight: 600 }}>
        <CheckCircle2 size={13} />
        <span>GPS Spindle ERP installed</span>
      </div>
    );
  }

  // Variant 1: Subtle card on LoginScreen
  if (variant === 'login') {
    return (
      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          backgroundColor: '#FFFFFF',
          borderRadius: '6px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              backgroundColor: '#FAF0F3',
              color: '#7A1F3D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Monitor size={14} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
              Desktop App Available
            </div>
            <div style={{ fontSize: '10px', color: '#64748B', marginTop: '1px' }}>
              Install GPS Spindle ERP for faster access from your desktop.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstall}
          disabled={isInstalling}
          style={{
            backgroundColor: '#7A1F3D',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: 600,
            cursor: isInstalling ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            flexShrink: 0,
            transition: 'background-color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5E182F'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7A1F3D'}
        >
          <Download size={12} />
          <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
        </button>
      </div>
    );
  }

  // Variant 2: Header action button
  if (variant === 'header') {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm pwa-install-header-btn"
        onClick={handleInstall}
        disabled={isInstalling}
        title="Install GPS Spindle ERP as a desktop application"
        style={{
          borderColor: '#7A1F3D',
          color: '#7A1F3D',
          backgroundColor: '#FAF0F3',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px'
        }}
      >
        <Download size={13} color="#7A1F3D" />
        <span className="pwa-install-text">Install App</span>
      </button>
    );
  }

  // Variant 3: Profile menu item
  if (variant === 'menu') {
    return (
      <button
        type="button"
        className="dropdown-item"
        onClick={handleInstall}
        disabled={isInstalling}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#7A1F3D',
          background: 'none',
          border: 'none',
          borderRadius: '4px',
          cursor: isInstalling ? 'wait' : 'pointer',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FAF0F3'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Download size={14} color="#7A1F3D" />
        <span>{isInstalling ? 'Installing App...' : 'Install GPS Spindle ERP'}</span>
      </button>
    );
  }

  return null;
}
