import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, DEMO_USERS } from '../services/auth/authService';

// Role-to-screen permissions matrix for the 9 database roles
export const ROLE_PERMISSIONS = {
  ADMIN: [
    'dashboard', 'production', 'workforce', 'work-order-detail',
    'spindles', 'spindle-detail', 'service', 'inventory', 'quality',
    'sales', 'customers', 'contacts', 'suppliers', 'invoices',
    'purchase-orders', 'proforma-invoices', 'e-way-bills', 'sales-activity',
    'documents', 'notifications', 'email-activity',
    'reports', 'settings'
  ],
  MANAGEMENT: [
    'dashboard', 'production', 'spindles', 'spindle-detail', 'work-order-detail',
    'sales', 'proforma-invoices', 'invoices', 'e-way-bills', 'customers', 'contacts',
    'purchase-orders', 'suppliers', 'inventory', 'quality', 'service', 'workforce',
    'documents', 'notifications', 'email-activity',
    'reports', 'settings'
  ],
  PROD_MGR: [
    'dashboard', 'production', 'workforce', 'work-order-detail',
    'spindles', 'spindle-detail', 'quality', 'inventory',
    'documents', 'notifications',
    'reports'
  ],
  QA_MGR: [
    'dashboard', 'quality', 'spindles', 'spindle-detail',
    'production', 'work-order-detail',
    'documents', 'notifications',
    'reports'
  ],
  SALES: [
    'dashboard', 'sales', 'proforma-invoices', 'invoices', 'e-way-bills',
    'customers', 'contacts', 'sales-activity',
    'documents', 'notifications', 'email-activity',
    'reports'
  ],
  PURCHASE: [
    'dashboard', 'purchase-orders', 'suppliers', 'inventory',
    'documents', 'notifications', 'email-activity',
    'reports'
  ],
  STORES: [
    'dashboard', 'inventory', 'purchase-orders', 'suppliers',
    'documents', 'notifications',
    'reports'
  ],
  SERVICE: [
    'dashboard', 'service', 'spindles', 'spindle-detail', 'quality',
    'documents', 'notifications',
    'reports'
  ],
  OPERATOR: [
    'dashboard', 'workforce', 'documents', 'notifications'
  ],
  EMPLOYEE: [
    'dashboard', 'workforce', 'documents', 'notifications'
  ]
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [role, setRole] = useState('ADMIN');
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  // Initialize session and restore state on startup
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // Check hash for recovery tokens (#type=recovery or access_token)
        if (window.location.hash.includes('type=recovery')) {
          setIsPasswordRecovery(true);
        }

        // 1. Check existing Supabase session
        const { data: { session: currentSession } } = await authService.getSession();

        if (currentSession?.user && mounted) {
          setSession(currentSession);
          setUser(currentSession.user);
          const resolvedProfile = await authService.resolveProfile(currentSession.user);
          if (mounted && resolvedProfile) {
            setProfile(resolvedProfile);
            setEmployee(resolvedProfile.employee || resolvedProfile);
            setRole(resolvedProfile.role || 'ADMIN');
          }
          localStorage.removeItem('gps_erp_dev_user');
        } else {
          // Check if local dev session is stored in localStorage
          const localDevUser = localStorage.getItem('gps_erp_dev_user');
          if (localDevUser && mounted) {
            try {
              const parsed = JSON.parse(localDevUser);
              if (parsed?.email) {
                // Attempt to establish real Supabase session using dev credentials
                const { data } = await authService.signIn({
                  email: parsed.email,
                  password: parsed.password || 'Password123!'
                });
                if (data?.session && mounted) {
                  setSession(data.session);
                  setUser(data.user);
                  setProfile(data.profile);
                  setEmployee(data.employee);
                  setRole(data.role || 'ADMIN');
                  localStorage.removeItem('gps_erp_dev_user');
                  return;
                }
              }
              // If sign-in failed, clean up stale dev user so user can log in cleanly
              localStorage.removeItem('gps_erp_dev_user');
            } catch {
              localStorage.removeItem('gps_erp_dev_user');
            }
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session initialization error:', err.message);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initAuth();

    // 2. Subscribe to auth state changes
    const subscription = authService.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' && newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        const resolved = await authService.resolveProfile(newSession.user);
        if (mounted && resolved) {
          setProfile(resolved);
          setEmployee(resolved.employee || resolved);
          setRole(resolved.role || 'ADMIN');
        }
        localStorage.removeItem('gps_erp_dev_user');
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setEmployee(null);
        setRole('ADMIN');
        localStorage.removeItem('gps_erp_dev_user');
        setIsLoading(false);
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
    });

    return () => {
      mounted = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, []);

  // Sign In action
  const signIn = useCallback(async ({ email, password }) => {
    setAuthError(null);
    setIsLoading(true);

    const { data, error } = await authService.signIn({ email, password });

    if (error) {
      setAuthError(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }

    if (data) {
      setUser(data.user);
      setSession(data.session);
      setProfile(data.profile);
      setEmployee(data.employee);
      setRole(data.role || 'ADMIN');

      // Save dev user in localStorage for refresh persistence only if offline/demo
      if (data.session?.access_token === 'dev-token') {
        localStorage.setItem('gps_erp_dev_user', JSON.stringify(data.profile));
      } else {
        localStorage.removeItem('gps_erp_dev_user');
      }
      setIsLoading(false);
      return { success: true };
    }

    setIsLoading(false);
    return { success: false, error: 'Unknown authentication error' };
  }, []);

  // Sign Out action
  const signOut = useCallback(async () => {
    setIsLoading(true);
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setEmployee(null);
    setRole('ADMIN');
    localStorage.removeItem('gps_erp_dev_user');
    setIsLoading(false);
  }, []);

  // Quick switch between demo roles (for testing & development verification)
  const switchDemoRole = useCallback(async (roleCode) => {
    const target = DEMO_USERS.find((u) => u.role === roleCode) || DEMO_USERS[0];
    return await signIn({
      email: target.email,
      password: target.password || 'Password123!'
    });
  }, [signIn]);

  // Check if current user role can access a screen
  const canAccessScreen = useCallback((screenId) => {
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.ADMIN;
    return permissions.includes(screenId);
  }, [role]);

  // Check generic permission
  const hasPermission = useCallback((module, action = 'read') => {
    if (role === 'ADMIN') return true;
    const permissions = ROLE_PERMISSIONS[role] || [];
    return permissions.includes(module);
  }, [role]);

  const value = {
    user,
    session,
    profile,
    employee,
    role,
    roleLabel: profile?.roleLabel || role,
    isAuthenticated: Boolean(user || profile),
    isLoading,
    authError,
    setAuthError,
    isPasswordRecovery,
    setIsPasswordRecovery,
    signIn,
    signOut,
    resetPassword: authService.resetPassword,
    updatePassword: authService.updatePassword,
    switchDemoRole,
    canAccessScreen,
    hasPermission,
    demoUsers: DEMO_USERS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
