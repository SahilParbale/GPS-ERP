import React, { useState, useEffect, useCallback } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Offline status banner.
 * Uses navigator.onLine as a hint and verifies actual connectivity
 * before displaying the connection notice to prevent false alarms.
 */
export default function PWAOfflineNotice() {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Probe actual connectivity
  const verifyConnectivity = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    // If browser says online, trust it
    if (navigator.onLine) {
      setIsOffline(false);
      return;
    }

    // If browser says offline, do a fast probe to verify
    setIsChecking(true);
    try {
      // Lightweight cache-busted fetch to test connectivity
      const res = await fetch('/favicon.svg?probe=' + Date.now(), { 
        method: 'HEAD',
        cache: 'no-store'
      });
      if (res.ok || res.status < 500) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      verifyConnectivity();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [verifyConnectivity]);

  if (!isOffline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        backgroundColor: '#7A1F3D',
        color: '#FFFFFF',
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '12px',
        fontWeight: 500,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <WifiOff size={15} />
        <span>
          Connection unavailable: GPS Spindle ERP requires an active connection to access live data.
        </span>
      </div>
      <button
        type="button"
        onClick={verifyConnectivity}
        disabled={isChecking}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          color: '#FFFFFF',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          cursor: isChecking ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <RefreshCw size={11} className={isChecking ? 'spin' : ''} />
        <span>{isChecking ? 'Checking...' : 'Retry Connection'}</span>
      </button>
    </div>
  );
}
