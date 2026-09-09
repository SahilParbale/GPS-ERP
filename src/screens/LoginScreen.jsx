import React, { useState } from 'react';
import { 
  Lock, Mail, Eye, EyeOff, Shield, ArrowRight, 
  CheckCircle2, AlertCircle, RefreshCw, KeyRound 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { signIn, resetPassword, updatePassword, isPasswordRecovery, setIsPasswordRecovery, demoUsers } = useAuth();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mode, setMode] = useState(isPasswordRecovery ? 'set-new-password' : 'login'); // 'login' | 'forgot-password' | 'set-new-password'

  // Handle Login Submission
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn({ email, password });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Invalid email or password.');
    }
  };

  // Handle Forgot Password Submission
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your registered email address.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(email);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Unable to send recovery email. Please check the address.');
    } else {
      setSuccessMessage('A password recovery email has been dispatched. Please check your inbox.');
    }
  };

  // Handle Setting New Password (Recovery)
  const handleSetNewPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message || 'Failed to update password. Please try again.');
    } else {
      setSuccessMessage('Your password has been successfully updated! You can now sign in.');
      setIsPasswordRecovery(false);
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Quick fill demo user credentials
  const selectDemoUser = (demoUser) => {
    setEmail(demoUser.email);
    setPassword(demoUser.password);
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF5F6',
        backgroundImage: 'radial-gradient(circle at 50% 0%, #F5EAEF 0%, #FAF5F6 70%)',
        padding: '24px 16px',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        color: '#2A0E17'
      }}
    >
      {/* Container Card */}
      <div 
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 10px 30px rgba(122, 31, 61, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04)',
          border: '1px solid #E8D5DA',
          overflow: 'hidden',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Card Header & Branding */}
        <div 
          style={{
            padding: '32px 32px 24px 32px',
            textAlign: 'center',
            borderBottom: '1px solid #F5EAEF',
            backgroundColor: '#FCF9FA'
          }}
        >
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 14px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              boxShadow: '0 2px 6px rgba(122, 31, 61, 0.1)',
              border: '1px solid #E8D5DA',
              marginBottom: '16px'
            }}
          >
            <img 
              src="/logo.jpg" 
              alt="General Precision Spindles" 
              style={{
                height: '32px',
                width: 'auto',
                display: 'block'
              }} 
            />
          </div>

          <h1 
            style={{
              fontSize: '20px',
              fontWeight: '700',
              color: '#4A1020',
              margin: '0 0 4px 0',
              letterSpacing: '-0.3px'
            }}
          >
            GPS Spindle Industrial ERP
          </h1>
          <p 
            style={{
              fontSize: '13px',
              color: '#7A5260',
              margin: 0
            }}
          >
            Precision Manufacturing & Overhaul Platform
          </p>
        </div>

        {/* Form Body */}
        <div style={{ padding: '28px 32px' }}>
          {/* Error Banner */}
          {errorMessage && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                marginBottom: '18px'
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '8px',
                color: '#166534',
                fontSize: '13px',
                marginBottom: '18px'
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label 
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#4A1020',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail 
                    size={16} 
                    color="#8E6A77" 
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                  <input 
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gpspindles.com"
                    autoComplete="email"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '14px',
                      border: '1px solid #D4B2BC',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#2A0E17',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7A1F3D'}
                    onBlur={(e) => e.target.style.borderColor = '#D4B2BC'}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label 
                    htmlFor="login-password"
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#4A1020',
                      textTransform: 'uppercase',
                      letterSpacing: '0.4px'
                    }}
                  >
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode('forgot-password');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '12px',
                      color: '#7A1F3D',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'none'
                    }}
                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock 
                    size={16} 
                    color="#8E6A77" 
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                  <input 
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 38px',
                      fontSize: '14px',
                      border: '1px solid #D4B2BC',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#2A0E17',
                      outline: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.15s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#7A1F3D'}
                    onBlur={(e) => e.target.style.borderColor = '#D4B2BC'}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#8E6A77'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '11px 16px',
                  backgroundColor: '#7A1F3D',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 5px rgba(122, 31, 61, 0.25)',
                  transition: 'background-color 0.15s',
                  marginTop: '4px'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) e.target.style.backgroundColor = '#601830';
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) e.target.style.backgroundColor = '#7A1F3D';
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Plant ERP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. FORGOT PASSWORD FORM */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <p style={{ fontSize: '13px', color: '#5C3845', margin: '0 0 16px 0', lineHeight: '1.4' }}>
                  Enter your registered GPS Spindle employee email. We will send you an authorized link to reset your credentials.
                </p>
                <label 
                  htmlFor="reset-email"
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#4A1020',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px'
                  }}
                >
                  Work Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail 
                    size={16} 
                    color="#8E6A77" 
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                  <input 
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gpspindles.com"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 38px',
                      fontSize: '14px',
                      border: '1px solid #D4B2BC',
                      borderRadius: '8px',
                      backgroundColor: '#FFFFFF',
                      color: '#2A0E17',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '11px 16px',
                  backgroundColor: '#7A1F3D',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 5px rgba(122, 31, 61, 0.25)'
                }}
              >
                {isSubmitting ? 'Sending Link...' : 'Send Recovery Email'}
              </button>

              <button 
                type="button" 
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px',
                  fontSize: '13px',
                  color: '#7A5260',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                ← Return to Sign In
              </button>
            </form>
          )}

          {/* 3. SET NEW PASSWORD (RECOVERY SESSION) */}
          {mode === 'set-new-password' && (
            <form onSubmit={handleSetNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7A1F3D', marginBottom: '8px' }}>
                <KeyRound size={20} />
                <strong style={{ fontSize: '15px' }}>Set New Password</strong>
              </div>

              <div>
                <label 
                  htmlFor="new-password"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4A1020', marginBottom: '4px' }}
                >
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 12px',
                      fontSize: '14px',
                      border: '1px solid #D4B2BC',
                      borderRadius: '8px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label 
                  htmlFor="confirm-password"
                  style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#4A1020', marginBottom: '4px' }}
                >
                  Confirm New Password
                </label>
                <input 
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    fontSize: '14px',
                    border: '1px solid #D4B2BC',
                    borderRadius: '8px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '11px 16px',
                  backgroundColor: '#7A1F3D',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Updating Password...' : 'Save Password & Enter ERP'}
              </button>
            </form>
          )}

          {/* Quick Role Tester Selector for Verification (Development Feature) */}
          <div 
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px dashed #E8D5DA'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#7A5260', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                ⚡ Quick Role Login (Dev / Testing)
              </span>
              <Shield size={13} color="#7A1F3D" />
            </div>

            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '6px'
              }}
            >
              {demoUsers.slice(0, 9).map((u) => (
                <button
                  key={u.role}
                  type="button"
                  onClick={() => selectDemoUser(u)}
                  style={{
                    padding: '6px 4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: email === u.email ? '1px solid #7A1F3D' : '1px solid #E8D5DA',
                    backgroundColor: email === u.email ? '#FAF0F3' : '#FFFFFF',
                    color: email === u.email ? '#7A1F3D' : '#5C3845',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'all 0.15s'
                  }}
                  title={`${u.name} — ${u.roleLabel} (${u.email})`}
                >
                  {u.role}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '10px', color: '#8E6A77', margin: '6px 0 0 0', textAlign: 'center' }}>
              Click any role to auto-populate test credentials
            </p>
          </div>
        </div>

        {/* Card Footer */}
        <div 
          style={{
            padding: '12px 24px',
            backgroundColor: '#FCF9FA',
            borderTop: '1px solid #F5EAEF',
            textAlign: 'center',
            fontSize: '11px',
            color: '#8E6A77'
          }}
        >
          Nanded City Unit 1 (HQ) • ISO 9001:2015 & ISO 14001 Certified
        </div>
      </div>
    </div>
  );
}
