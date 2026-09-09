import { supabase, isConfigured } from '../supabase/supabaseClient';

/**
 * Pre-configured Development / Demo Users for the 9 ERP Roles
 * Aligned with seed data employees in 014_seed_data.sql
 */
export const DEMO_USERS = [
  {
    id: 'e0000000-0000-0000-0000-000000000101',
    email: 'rahul.patil@gpspindles.com',
    password: 'Password123!',
    name: 'Rahul Patil',
    employeeCode: 'GPS-EMP-101',
    role: 'ADMIN',
    roleLabel: 'Plant Admin & Operations',
    department: 'Production Machining',
    designation: 'Plant Head & Operations',
    phone: '+91 98220 14921',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['CNC Machining', 'Production Scheduling', 'Six Sigma', 'Plant Admin']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000100',
    email: 'kulkarni.vr@gpspindles.com',
    password: 'Password123!',
    name: 'V. R. Kulkarni',
    employeeCode: 'GPS-EMP-100',
    role: 'MANAGEMENT',
    roleLabel: 'Executive Director',
    department: 'Executive Management',
    designation: 'Production Head & Director',
    phone: '+91 98220 14920',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'General Shift',
    avatarColor: '#5a1329',
    skills: ['Executive Leadership', 'P&L Management', 'Plant Expansion']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000103',
    email: 'suresh.sawant@gpspindles.com',
    password: 'Password123!',
    name: 'Suresh Sawant',
    employeeCode: 'GPS-EMP-103',
    role: 'PROD_MGR',
    roleLabel: 'Production Manager',
    department: 'Production Machining',
    designation: 'Sr. Precision Machining Lead',
    phone: '+91 98220 14923',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['Studer S33 Grinding', 'Taper Journal Lapping', 'Shop Floor Traveler']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000102',
    email: 'milind.joshi@gpspindles.com',
    password: 'Password123!',
    name: 'Milind Joshi',
    employeeCode: 'GPS-EMP-102',
    role: 'QA_MGR',
    roleLabel: 'Quality Assurance Manager',
    department: 'Metrology & QA',
    designation: 'Quality Assurance Lead',
    phone: '+91 98220 14922',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['Air Gauging', 'ISO 1940 Balancing', 'CMM Metrology', 'NCR Sign-off']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000106',
    email: 'shreyas.nair@gpspindles.com',
    password: 'Password123!',
    name: 'Shreyas Nair',
    employeeCode: 'GPS-EMP-106',
    role: 'SALES',
    roleLabel: 'Commercial & Sales Lead',
    department: 'Sales & Commercial',
    designation: 'Commercial Desk Lead',
    phone: '+91 98220 14926',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'General Shift',
    avatarColor: '#7A1F3D',
    skills: ['Quotation Costing', 'GST E-Way Bills', 'Client SLA Management', 'Proforma Invoicing']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000107',
    email: 'purchase.controller@gpspindles.com',
    password: 'Password123!',
    name: 'Anand Deshmukh',
    employeeCode: 'GPS-EMP-107',
    role: 'PURCHASE',
    roleLabel: 'Procurement Controller',
    department: 'Procurement & Stores',
    designation: 'Procurement Lead',
    phone: '+91 98220 14927',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'General Shift',
    avatarColor: '#7A1F3D',
    skills: ['Vendor Sourcing', 'PO Management', 'FAG & OTT-Jakob Procurement']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000105',
    email: 'dinesh.more@gpspindles.com',
    password: 'Password123!',
    name: 'Dinesh More',
    employeeCode: 'GPS-EMP-105',
    role: 'STORES',
    roleLabel: 'Warehouse & Stores Lead',
    department: 'Procurement & Stores',
    designation: 'Inventory & Stores Lead',
    phone: '+91 98220 14925',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['Warehouse ERP', 'Bin Kitting', 'FIFO Control', 'GRN Inwarding']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000108',
    email: 'service.lead@gpspindles.com',
    password: 'Password123!',
    name: 'Pramod Jadhav',
    employeeCode: 'GPS-EMP-108',
    role: 'SERVICE',
    roleLabel: 'Service & Overhaul Lead',
    department: 'Service & Rebuild',
    designation: 'Sr. Spindle Service Engineer',
    phone: '+91 98220 14928',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['Spindle Overhaul', '9-Stage Restoration', 'Dynamic In-situ Balancing']
  },
  {
    id: 'e0000000-0000-0000-0000-000000000104',
    email: 'vikram.shinde@gpspindles.com',
    password: 'Password123!',
    name: 'Vikram Shinde',
    employeeCode: 'GPS-EMP-104',
    role: 'OPERATOR',
    roleLabel: 'Shop Floor Precision Technician',
    department: 'Cleanroom Assembly',
    designation: 'Cleanroom Assembly Technician',
    phone: '+91 98220 14924',
    branch: 'Nanded City Plant 1 (HQ)',
    shift: 'Shift A (07:00 - 15:30)',
    avatarColor: '#7A1F3D',
    skills: ['Ceramic Bearings Fitting', 'Preload Clamping', 'Daily Work Logging']
  }
];

/**
 * Supabase Authentication Service
 * Standardized interface for login, logout, password recovery, session restore,
 * and database profile/employee resolution.
 */
export const authService = {
  /**
   * Sign in with email and password
   * @param {{ email: string, password: string }} credentials
   */
  async signIn({ email, password }) {
    const trimmedEmail = (email || '').trim().toLowerCase();

    // 1. Check if matching a pre-configured development demo user
    const demoMatch = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === trimmedEmail && (password === u.password || password === 'demo' || password === 'Password123!')
    );

    // 2. If Supabase is configured, attempt real authentication
    if (isConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password
        });

        if (!error && data?.user) {
          // Resolve linked profile & employee from PostgreSQL database
          const profile = await this.resolveProfile(data.user);
          return {
            data: {
              user: data.user,
              session: data.session,
              profile,
              employee: profile?.employee || null,
              role: profile?.role || 'ADMIN'
            },
            error: null
          };
        }

        // If Supabase returns an error (e.g. user not yet confirmed or not in Auth), but matches demo user:
        if (demoMatch) {
          console.info(`[Auth] Using development demo credentials for role: ${demoMatch.role}`);
          return {
            data: {
              user: { id: demoMatch.id, email: demoMatch.email },
              session: { access_token: 'dev-token', expires_at: Date.now() + 3600000 },
              profile: demoMatch,
              employee: demoMatch,
              role: demoMatch.role
            },
            error: null
          };
        }

        // Return user-friendly error
        return {
          data: null,
          error: new Error(error?.message === 'Invalid login credentials' ? 'Invalid email or password.' : (error?.message || 'Authentication failed.'))
        };
      } catch (err) {
        if (demoMatch) {
          return {
            data: {
              user: { id: demoMatch.id, email: demoMatch.email },
              session: { access_token: 'dev-token', expires_at: Date.now() + 3600000 },
              profile: demoMatch,
              employee: demoMatch,
              role: demoMatch.role
            },
            error: null
          };
        }
        return { data: null, error: new Error('Network error connecting to authentication server.') };
      }
    }

    // 3. Fallback when offline or not configured: verify demo users
    if (demoMatch) {
      return {
        data: {
          user: { id: demoMatch.id, email: demoMatch.email },
          session: { access_token: 'dev-token', expires_at: Date.now() + 3600000 },
          profile: demoMatch,
          employee: demoMatch,
          role: demoMatch.role
        },
        error: null
      };
    }

    return {
      data: null,
      error: new Error('Invalid email or password.')
    };
  },

  /**
   * Sign out current user and clear local session
   */
  async signOut() {
    if (isConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('[Auth] Sign-out remote notification error:', err.message);
      }
    }
    return { error: null };
  },

  /**
   * Retrieve active session from Supabase client
   */
  async getSession() {
    if (!isConfigured) return { data: { session: null }, error: null };
    return await supabase.auth.getSession();
  },

  /**
   * Retrieve currently authenticated user
   */
  async getCurrentUser() {
    if (!isConfigured) return { user: null, error: null };
    const { data: { user }, error } = await supabase.auth.getUser();
    return { user, error };
  },

  /**
   * Resolve user profile and employee mapping from PostgreSQL
   * @param {object} authUser
   */
  async resolveProfile(authUser) {
    if (!authUser || !isConfigured) return null;

    try {
      // 1. Try querying `profiles` table joined to `employees`
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, role:roles(code, name)')
        .eq('id', authUser.id)
        .maybeSingle();

      // 2. Find matching employee record by profile_id or email
      const { data: employee } = await supabase
        .from('employees')
        .select('*, department:departments(name, code), role:roles(code, name)')
        .or(`profile_id.eq.${authUser.id},email.eq.${authUser.email}`)
        .maybeSingle();

      if (employee) {
        return {
          id: authUser.id,
          email: authUser.email,
          name: `${employee.first_name} ${employee.last_name}`,
          employeeCode: employee.employee_code,
          role: employee.role?.code || profile?.role?.code || 'ADMIN',
          roleLabel: employee.role?.name || profile?.role?.name || 'Plant Admin & Operations',
          department: employee.department?.name || 'Operations',
          designation: employee.designation || 'Staff',
          phone: employee.phone || '',
          branch: 'Nanded City Plant 1 (HQ)',
          avatarColor: employee.avatar_color || '#7A1F3D',
          employee
        };
      }

      // 3. If no matching database record found, check demo users as fallback
      const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === authUser.email?.toLowerCase());
      if (demo) return demo;

      // Default fallback profile for new authenticated user
      return {
        id: authUser.id,
        email: authUser.email,
        name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        employeeCode: 'GPS-EMP-GUEST',
        role: authUser.user_metadata?.role || 'ADMIN',
        roleLabel: 'Plant Admin & Operations',
        department: 'Operations',
        designation: 'Engineer',
        branch: 'Nanded City Plant 1 (HQ)',
        avatarColor: '#7A1F3D'
      };
    } catch (err) {
      console.warn('[Auth] Error resolving user profile from database:', err.message);
      const demo = DEMO_USERS.find((u) => u.email.toLowerCase() === authUser.email?.toLowerCase());
      return demo || null;
    }
  },

  /**
   * Listen to session and authentication state changes
   * @param {function} callback
   * @returns {{ unsubscribe: function }}
   */
  onAuthStateChange(callback) {
    if (!isConfigured) {
      return { unsubscribe: () => {} };
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  },

  /**
   * Request password reset email
   * @param {string} email
   */
  async resetPassword(email) {
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed) {
      return { error: new Error('Please enter your email address.') };
    }

    if (!isConfigured) {
      return { data: {}, error: null };
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/#reset-password`
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { error: new Error(err.message || 'Unable to send recovery email. Please verify your address.') };
    }
  },

  /**
   * Update password for an authenticated or recovered session
   * @param {string} newPassword
   */
  async updatePassword(newPassword) {
    if (!newPassword || newPassword.length < 6) {
      return { error: new Error('Password must be at least 6 characters long.') };
    }

    if (!isConfigured) {
      return { data: {}, error: null };
    }

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      return { data, error: null };
    } catch (err) {
      return { error: new Error(err.message || 'Failed to update password.') };
    }
  }
};

export default authService;
