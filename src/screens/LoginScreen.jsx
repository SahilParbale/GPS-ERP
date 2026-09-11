import React, { useState } from 'react';
import { 
  Lock, Mail, Eye, EyeOff, Shield, ArrowRight, 
  CheckCircle2, AlertCircle, RefreshCw, KeyRound,
  Settings, BarChart2, Users, Crown, TrendingUp,
  ShieldCheck, ShoppingCart, Package, Wrench, HardHat,
  Code, Building2
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
  const [mode, setMode] = useState(isPasswordRecovery ? 'set-new-password' : 'login');
  const [selectedRole, setSelectedRole] = useState(null);

  // Role mappings for the 9-role quick login grid
  const QUICK_ROLES = [
    { role: 'ADMIN', label: 'ADMIN', email: 'rahul.patil@gpspindles.com', icon: Crown },
    { role: 'MANAGEMENT', label: 'MANAGEMENT', email: 'kulkarni.vr@gpspindles.com', icon: Users },
    { role: 'PROD_MGR', label: 'PROD_MGR', email: 'suresh.sawant@gpspindles.com', icon: TrendingUp },
    { role: 'QA_MGR', label: 'QA_MGR', email: 'milind.joshi@gpspindles.com', icon: ShieldCheck },
    { role: 'SALES', label: 'SALES', email: 'shreyas.nair@gpspindles.com', icon: TrendingUp },
    { role: 'PURCHASE', label: 'PURCHASE', email: 'purchase.controller@gpspindles.com', icon: ShoppingCart },
    { role: 'STORES', label: 'STORES', email: 'dinesh.more@gpspindles.com', icon: Package },
    { role: 'SERVICE', label: 'SERVICE', email: 'service.lead@gpspindles.com', icon: Wrench },
    { role: 'OPERATOR', label: 'OPERATOR', email: 'vikram.shinde@gpspindles.com', icon: HardHat }
  ];

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
      setPassword('Password123!');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  // Quick fill role credentials
  const selectRole = (r) => {
    setSelectedRole(r.role);
    setEmail(r.email);
    setPassword('Password123!');
    setErrorMessage('');
    setSuccessMessage('');
  };

  return (
    <div 
      className="gps-login-root"
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        backgroundColor: '#F4F6FA'
      }}
    >
      <style>{`
        @media (max-width: 960px) {
          .gps-login-root {
            flex-direction: column !important;
            height: auto !important;
            min-height: 100vh !important;
          }
          .gps-login-left {
            min-height: 460px !important;
            flex: 0 0 auto !important;
            padding: 24px 20px !important;
          }
          .gps-login-right {
            flex: 1 1 auto !important;
            padding: 24px 16px !important;
          }
          .gps-cad-blueprint, .gps-vertical-brand {
            display: none !important;
          }
        }
        .gps-login-right::-webkit-scrollbar {
          width: 5px;
        }
        .gps-login-right::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.35);
          border-radius: 4px;
        }
        .gps-login-right::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.6);
        }
      `}</style>

      {/* -------------------------------------------------------------------- */}
      {/* LEFT HALF: INDUSTRIAL BRAND HERO SHOWCASE (52% width)                 */}
      {/* -------------------------------------------------------------------- */}
      <div 
        className="gps-login-left"
        style={{
          flex: '1 1 52%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 'clamp(14px, 2vh, 24px) clamp(20px, 2.5vw, 36px)',
          background: 'linear-gradient(135deg, rgba(62, 10, 26, 0.96) 0%, rgba(38, 6, 16, 0.90) 45%, rgba(18, 3, 8, 0.70) 100%), url(/spindle_bg.jpg) center center / cover no-repeat',
          color: '#FFFFFF',
          minHeight: '100vh',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Subtle Decorative Gradient Overlays */}
        <div 
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '550px',
            height: '550px',
            background: 'radial-gradient(circle, rgba(163, 29, 66, 0.28) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
            zIndex: 1
          }} 
        />
        <div 
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(122, 31, 61, 0.22) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
            zIndex: 1
          }} 
        />

        {/* Content Container (Layered above gradients) */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
          
          {/* Top Brand Logo */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              {/* White Circular GPS Emblem */}
              <div 
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1.8px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  boxShadow: '0 3px 10px rgba(0, 0, 0, 0.3)',
                  flexShrink: 0
                }}
              >
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none">
                  <path d="M 50 12 A 38 38 0 0 1 88 50 L 96 50 L 84 66 L 72 50 L 80 50 A 30 30 0 0 0 50 20 Z" fill="#FFFFFF" />
                  <path d="M 50 88 A 38 38 0 0 1 12 50 L 4 50 L 16 34 L 28 50 L 20 50 A 30 30 0 0 0 50 80 Z" fill="#FFFFFF" />
                  <text x="50" y="58" textAnchor="middle" fill="#FFFFFF" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="-0.5">GPS</text>
                </svg>
              </div>

              {/* Brand Wordmark */}
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.1' }}>
                <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px', color: '#FFFFFF' }}>General</span>
                <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px', color: '#FFFFFF' }}>Precision</span>
                <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.2px', color: '#FFFFFF' }}>Spindles</span>
              </div>
            </div>

            {/* Tagline */}
            <div 
              style={{
                fontSize: '9px',
                fontWeight: '600',
                letterSpacing: '2.2px',
                color: '#DEC5CC',
                textTransform: 'uppercase',
                paddingLeft: '2px',
                marginTop: '2px'
              }}
            >
              Precision &nbsp;|&nbsp; Performance &nbsp;|&nbsp; Partnership
            </div>
          </div>

          {/* Middle Value Proposition & Pillars */}
          <div style={{ margin: 'auto 0', padding: '8px 0' }}>
            {/* Big Bold Headline */}
            <h1 
              style={{
                fontSize: 'clamp(24px, 2.7vw, 32px)',
                fontWeight: '800',
                lineHeight: '1.12',
                margin: '0 0 8px 0',
                letterSpacing: '-0.5px',
                color: '#FFFFFF'
              }}
            >
              Powering<br />
              Industry with<br />
              <span style={{ color: '#E55375' }}>Precision</span>
            </h1>

            {/* Sub-paragraph */}
            <p 
              style={{
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#E8D5DA',
                maxWidth: '360px',
                margin: '0 0 14px 0',
                fontWeight: '400'
              }}
            >
              High-performance spindles. Reliable solutions. A more productive tomorrow.
            </p>

            {/* Feature Bullet Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Feature 1 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Settings size={14} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.1px' }}>
                    Precision Manufacturing
                  </div>
                  <div style={{ fontSize: '11px', color: '#D9BAC3' }}>
                    Built for higher performance
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <BarChart2 size={14} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.1px' }}>
                    Operational Excellence
                  </div>
                  <div style={{ fontSize: '11px', color: '#D9BAC3' }}>
                    Streamlined workflows
                  </div>
                </div>
              </div>

              {/* Feature 3 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div 
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 255, 255, 0.12)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Users size={14} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#FFFFFF', letterSpacing: '-0.1px' }}>
                    People Driven
                  </div>
                  <div style={{ fontSize: '11px', color: '#D9BAC3' }}>
                    Strong teams. Stronger results.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Industrial Banner (Trust Slogan) */}
          <div 
            style={{
              backgroundColor: 'rgba(40, 7, 18, 0.72)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '9px',
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              width: 'fit-content',
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
              boxSizing: 'border-box'
            }}
          >
            <div 
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Settings size={12} color="#FFFFFF" />
            </div>
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#FFFFFF', letterSpacing: '-0.1px' }}>
              Trusted by industry. Driven by precision.
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* RIGHT HALF: LOGIN CARD & TECHNICAL BLUEPRINT BACKGROUND (48% width) */}
      {/* -------------------------------------------------------------------- */}
      <div 
        className="gps-login-right"
        style={{
          flex: '1 1 48%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          position: 'relative',
          padding: 'clamp(12px, 1.5vh, 20px) 20px',
          boxSizing: 'border-box',
          backgroundColor: '#F4F6FA',
          overflowY: 'auto',
          minHeight: '100vh'
        }}
      >
        {/* Subtle Engineering CAD Blueprint Lines in Background */}
        <svg 
          className="gps-cad-blueprint"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            height: '100%',
            opacity: 0.12,
            pointerEvents: 'none',
            zIndex: 0
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <pattern id="cadGrid" width="36" height="36" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="36" y2="0" stroke="#64748B" strokeWidth="0.5" strokeDasharray="2,4" />
            <line x1="0" y1="0" x2="0" y2="36" stroke="#64748B" strokeWidth="0.5" strokeDasharray="2,4" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#cadGrid)" />
          {/* Faint technical measurement arcs and crosshairs */}
          <circle cx="88%" cy="32%" r="160" stroke="#64748B" strokeWidth="0.8" fill="none" />
          <circle cx="88%" cy="32%" r="100" stroke="#64748B" strokeWidth="0.7" strokeDasharray="5,5" fill="none" />
          <circle cx="88%" cy="32%" r="50" stroke="#64748B" strokeWidth="1" fill="none" />
          <line x1="70%" y1="32%" x2="100%" y2="32%" stroke="#64748B" strokeWidth="0.7" />
          <line x1="88%" y1="12%" x2="88%" y2="52%" stroke="#64748B" strokeWidth="0.7" />
        </svg>

        {/* Top-Right Corner System Version Indicator */}
        <div 
          style={{
            position: 'absolute',
            top: '12px',
            right: '20px',
            fontSize: '10.5px',
            color: '#94A3B8',
            fontWeight: '600',
            letterSpacing: '0.3px',
            zIndex: 1
          }}
        >
          Version 1.0.0
        </div>

        {/* Far-Right Vertical Technical Brand Text */}
        <div 
          className="gps-vertical-brand"
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '9px',
            fontWeight: '700',
            letterSpacing: '2.5px',
            color: '#94A3B8',
            opacity: 0.4,
            zIndex: 1,
            pointerEvents: 'none',
            lineHeight: '1.5'
          }}
        >
          <span>S P I N D L E S</span>
          <span>S O L U T I O N S</span>
          <span>S E R V I C E</span>
          <span>S U C C E S S</span>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* FLOATING WHITE LOGIN CARD                                          */}
        {/* ------------------------------------------------------------------ */}
        <div 
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: '420px',
            margin: 'auto',
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(112, 22, 47, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.85)',
            padding: '16px 22px 12px 22px',
            boxSizing: 'border-box'
          }}
        >
          {/* Card Top Header: GPS Logo + Secure Access Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <img 
              src="/logo.jpg" 
              alt="General Precision Spindles" 
              style={{
                height: '28px',
                width: 'auto',
                display: 'block'
              }} 
            />
            <div 
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: '600',
                color: '#64748B',
                letterSpacing: '0.2px'
              }}
            >
              <Shield size={12} color="#64748B" />
              <span>Secure Access</span>
            </div>
          </div>

          {/* Product Title & Subtitle */}
          <div style={{ marginBottom: '8px' }}>
            <h2 
              style={{
                fontSize: '18px',
                fontWeight: '800',
                color: '#3B0F1C',
                margin: '0 0 1px 0',
                letterSpacing: '-0.3px'
              }}
            >
              GPS Spindle Industrial ERP
            </h2>
            <p 
              style={{
                fontSize: '11px',
                color: '#64748B',
                margin: 0,
                fontWeight: '400'
              }}
            >
              Precision Manufacturing &amp; Overhaul Platform
            </p>
          </div>

          {/* Welcome Message */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', letterSpacing: '-0.1px' }}>
              Welcome Back!
            </div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
              Sign in to access your workspace
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: '6px',
                color: '#991B1B',
                fontSize: '11.5px',
                marginBottom: '8px'
              }}
            >
              <AlertCircle size={13} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: '6px',
                color: '#166534',
                fontSize: '11.5px',
                marginBottom: '8px'
              }}
            >
              <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. SIGN IN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* EMAIL ADDRESS INPUT */}
              <div>
                <label 
                  htmlFor="login-email"
                  style={{
                    display: 'block',
                    fontSize: '9.5px',
                    fontWeight: '700',
                    color: '#475569',
                    marginBottom: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  Email Address
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '9px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <Mail size={13} color="#64748B" />
                  </div>
                  <input 
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter the user ID"
                    required
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px 0 28px',
                      fontSize: '12px',
                      backgroundColor: '#EEF3FA',
                      border: '1px solid #D5E0F2',
                      borderRadius: '6px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7A1F3D';
                      e.target.style.boxShadow = '0 0 0 2px rgba(122, 31, 61, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D5E0F2';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* PASSWORD INPUT */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <label 
                    htmlFor="login-password"
                    style={{
                      fontSize: '9.5px',
                      fontWeight: '700',
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
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
                      fontSize: '10px',
                      fontWeight: '600',
                      color: '#334155',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#7A1F3D'}
                    onMouseLeave={(e) => e.target.style.color = '#334155'}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '9px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <Lock size={13} color="#64748B" />
                  </div>
                  <input 
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 28px 0 28px',
                      fontSize: '12px',
                      backgroundColor: '#EEF3FA',
                      border: '1px solid #D5E0F2',
                      borderRadius: '6px',
                      color: '#0F172A',
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#7A1F3D';
                      e.target.style.boxShadow = '0 0 0 2px rgba(122, 31, 61, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#D5E0F2';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '7px',
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#64748B'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* SIGN IN BUTTON */}
              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '35px',
                  width: '100%',
                  marginTop: '2px',
                  backgroundColor: isSubmitting ? '#5A1327' : '#70162F',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 8px rgba(112, 22, 47, 0.22)',
                  transition: 'background-color 0.15s, transform 0.1s'
                }}
                onMouseEnter={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#5B1125'; }}
                onMouseLeave={(e) => { if (!isSubmitting) e.target.style.backgroundColor = '#70162F'; }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Plant ERP</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. FORGOT PASSWORD MODE */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label 
                  htmlFor="forgot-email"
                  style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '3px', textTransform: 'uppercase' }}
                >
                  Registered Email Address
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', left: '9px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <Mail size={13} color="#64748B" />
                  </div>
                  <input 
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gpspindles.com"
                    required
                    style={{
                      width: '100%',
                      height: '34px',
                      padding: '0 10px 0 28px',
                      fontSize: '12px',
                      backgroundColor: '#EEF3FA',
                      border: '1px solid #D5E0F2',
                      borderRadius: '6px',
                      color: '#0F172A',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '34px',
                  backgroundColor: '#70162F',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Sending Recovery Link...' : 'Send Password Recovery Link'}
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
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#70162F',
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '1px'
                }}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* 3. SET NEW PASSWORD MODE */}
          {mode === 'set-new-password' && (
            <form onSubmit={handleSetNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  New Password
                </label>
                <input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '12px', backgroundColor: '#EEF3FA', border: '1px solid #D5E0F2', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '9.5px', fontWeight: '700', color: '#475569', marginBottom: '3px' }}>
                  Confirm New Password
                </label>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  style={{ width: '100%', height: '34px', padding: '0 10px', fontSize: '12px', backgroundColor: '#EEF3FA', border: '1px solid #D5E0F2', borderRadius: '6px', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                style={{
                  height: '34px',
                  backgroundColor: '#70162F',
                  color: '#FFFFFF',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                {isSubmitting ? 'Updating Password...' : 'Save Password & Enter ERP'}
              </button>
            </form>
          )}

          {/* OR DIVIDER */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '6px 0 6px 0'
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
            <span style={{ padding: '0 8px', fontSize: '9px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.5px' }}>
              OR
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#E2E8F0' }} />
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* QUICK ROLE LOGIN (DEV / TESTING) BOX                             */}
          {/* ---------------------------------------------------------------- */}
          <div 
            style={{
              backgroundColor: '#FFF7F8',
              border: '1px solid #FCE4EC',
              borderRadius: '8px',
              padding: '6px 8px'
            }}
          >
            {/* Box Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10.5px', fontWeight: '700', color: '#881337' }}>
                <span style={{ color: '#E11D48' }}>⚡</span>
                <span>Quick Role Login (Dev / Testing)</span>
              </div>
              <div style={{ fontSize: '9.5px', fontWeight: '700', color: '#881337', opacity: 0.8, fontFamily: 'monospace' }}>
                &lt;/&gt;
              </div>
            </div>

            {/* 3x3 Grid of Role Badges */}
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '3px'
              }}
            >
              {QUICK_ROLES.map((r) => {
                const IconComponent = r.icon;
                const isSelected = (selectedRole === r.role) || (email === r.email);

                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => selectRole(r)}
                    style={{
                      height: '25px',
                      padding: '0 3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '4px',
                      border: isSelected ? '1.5px solid #70162F' : '1px solid #E2E8F0',
                      boxShadow: isSelected ? '0 0 0 2px rgba(112, 22, 47, 0.15)' : '0 1px 2px rgba(0,0,0,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    title={`Sign in as ${r.role} (${r.email})`}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                      }
                    }}
                  >
                    <IconComponent size={10} color="#70162F" style={{ flexShrink: 0 }} />
                    <span 
                      style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: isSelected ? '#70162F' : '#334155',
                        letterSpacing: '0.1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {r.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hint Text */}
            <div 
              style={{
                fontSize: '9px',
                color: '#64748B',
                textAlign: 'center',
                marginTop: '3px',
                fontWeight: '400'
              }}
            >
              Click any role to auto-populate test credentials
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* BOTTOM CARD FOOTER                                               */}
          {/* ---------------------------------------------------------------- */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #F1F5F9',
              fontSize: '9px',
              color: '#64748B'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Building2 size={11} color="#64748B" />
              <span>Nanded City Unit 1 (HQ) &nbsp;|&nbsp; ISO 9001:2015 &amp; ISO 14001 Certified</span>
            </div>
            <div style={{ fontWeight: '700', color: '#70162F', flexShrink: 0, paddingLeft: '4px' }}>
              Excellence in Every Rotation
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
