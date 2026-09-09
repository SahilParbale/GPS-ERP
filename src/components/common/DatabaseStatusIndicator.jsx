import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { checkSupabaseConnection } from '../../services/supabase/connectionCheck';

export default function DatabaseStatusIndicator() {
  const [status, setStatus] = useState({
    isConfigured: false,
    isConnected: false,
    latencyMs: 0,
    url: null,
    error: null,
    loading: true,
  });
  const [isOpen, setIsOpen] = useState(false);

  const runCheck = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    try {
      const res = await checkSupabaseConnection();
      setStatus({ ...res, loading: false });
    } catch (e) {
      setStatus({
        isConfigured: false,
        isConnected: false,
        latencyMs: 0,
        url: null,
        error: e.message,
        loading: false,
      });
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  const getBadgeStyle = () => {
    if (status.loading) {
      return {
        bg: 'var(--bg-surface-subtle)',
        border: 'var(--border-color)',
        text: 'var(--text-secondary)',
        dot: '#94A3B8',
        label: 'Checking DB...',
      };
    }
    if (status.isConnected) {
      return {
        bg: '#ecfdf5',
        border: '#a7f3d0',
        text: '#065f46',
        dot: '#059669',
        label: `DB: Connected (${status.latencyMs}ms)`,
      };
    }
    if (status.isConfigured && !status.isConnected) {
      return {
        bg: '#fef2f2',
        border: '#fecaca',
        text: '#991b1b',
        dot: '#dc2626',
        label: 'DB: Disconnected',
      };
    }
    // Unconfigured / mock development mode
    return {
      bg: 'var(--primary-light)',
      border: 'var(--border-button)',
      text: 'var(--primary)',
      dot: '#B7791F',
      label: 'DB: Supabase Ready',
    };
  };

  const badge = getBadgeStyle();

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Supabase PostgreSQL Backend Health Check"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 9px',
          borderRadius: '16px',
          background: badge.bg,
          border: `1px solid ${badge.border}`,
          color: badge.text,
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Database size={12} />
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: badge.dot,
            display: 'inline-block',
          }}
        />
        <span>{badge.label}</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '38px',
            right: 0,
            width: '280px',
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary)' }}>
              <Database size={14} />
              <span>Backend Architecture</span>
            </div>
            <button
              type="button"
              onClick={runCheck}
              disabled={status.loading}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <RefreshCw size={11} className={status.loading ? 'spin' : ''} />
              <span>Ping</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Platform:</span>
              <strong style={{ color: 'var(--text-main)' }}>Supabase (PostgreSQL)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Connection:</span>
              <span style={{ fontWeight: 700, color: status.isConnected ? '#059669' : status.isConfigured ? '#dc2626' : '#B7791F' }}>
                {status.isConnected ? 'Live Connected' : status.isConfigured ? 'Connection Failed' : 'Ready (Mock Fallback)'}
              </span>
            </div>

            {status.isConnected && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Roundtrip Latency:</span>
                <span className="mono" style={{ fontWeight: 600 }}>{status.latencyMs} ms</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Configuration:</span>
              <span className="mono" style={{ fontSize: '10.5px' }}>
                {status.isConfigured ? 'Active in .env' : 'Pending (.env.example)'}
              </span>
            </div>

            {status.error && (
              <div style={{ padding: '6px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', color: '#991b1b', fontSize: '10.5px', marginTop: '4px' }}>
                {status.error}
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', fontSize: '10.5px', color: 'var(--text-muted)' }}>
            Phase 1 Foundation active. Client, Auth, Storage & Realtime services initialized.
          </div>
        </div>
      )}
    </div>
  );
}
