import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AccessDenied({ onNavigate, attemptedScreen }) {
  const { role, roleLabel, employee } = useAuth();

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 16px',
        textAlign: 'center'
      }}
    >
      <div 
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: '#FDF2F4',
          border: '2px solid #E8D5DA',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          color: '#7A1F3D'
        }}
      >
        <ShieldAlert size={32} />
      </div>

      <h2 
        style={{
          fontSize: '22px',
          fontWeight: '700',
          color: '#4A1020',
          margin: '0 0 8px 0'
        }}
      >
        Restricted ERP Module
      </h2>

      <p 
        style={{
          fontSize: '14px',
          color: '#7A5260',
          maxWidth: '480px',
          lineHeight: '1.5',
          margin: '0 0 24px 0'
        }}
      >
        Your current role <strong>{roleLabel} ({role})</strong> does not have access permissions for the module <code>{attemptedScreen}</code>. 
        Please contact your plant administrator if you require authorization.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onNavigate('dashboard')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Home size={16} />
          <span>Return to Dashboard</span>
        </button>

        {role === 'OPERATOR' && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigate('workforce')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ArrowLeft size={16} />
            <span>Go to My Work</span>
          </button>
        )}
      </div>
    </div>
  );
}
