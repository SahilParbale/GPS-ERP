import { createClient } from '@supabase/supabase-js';

// Retrieve environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const appEnv = import.meta.env.VITE_APP_ENV || 'development';

/**
 * Validates whether the Supabase configuration is present and not a placeholder.
 */
export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder-project') &&
  !supabaseAnonKey.includes('placeholder-anon-key') &&
  supabaseUrl.startsWith('https://')
);

// Diagnostic configuration metadata
export const supabaseConfig = {
  url: supabaseUrl || null,
  isConfigured,
  environment: appEnv,
  authPersistSession: true,
  autoRefreshToken: true,
};

let clientInstance = null;

if (isConfigured) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'gps_erp_supabase_auth_token',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-application-name': 'gps-spindle-erp',
        },
      },
    });
    console.info('[GPS-ERP] Supabase client initialized successfully:', supabaseUrl);
  } catch (error) {
    console.error('[GPS-ERP] Failed to initialize Supabase client:', error);
  }
} else {
  console.warn(
    '[GPS-ERP] Supabase credentials not configured or placeholder detected.\n' +
    'Application is operating in development mock-readiness mode.\n' +
    'To connect a live database, update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );

  // Safe fallback mock client interface to prevent crashing when unconfigured
  clientInstance = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({
        data: null,
        error: new Error('Supabase not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'),
      }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: (tableName) => ({
      select: () => ({
        eq: () => ({ data: [], error: null }),
        order: () => ({ data: [], error: null }),
        limit: () => ({ data: [], error: null }),
        range: () => ({ data: [], error: null }),
        single: () => ({ data: null, error: null }),
        then: (resolve) => resolve({ data: [], error: null }),
      }),
      insert: () => ({
        select: () => ({ data: null, error: null }),
        then: (resolve) => resolve({ data: null, error: null }),
      }),
      update: () => ({
        eq: () => ({ data: null, error: null }),
        then: (resolve) => resolve({ data: null, error: null }),
      }),
      delete: () => ({
        eq: () => ({ data: null, error: null }),
        then: (resolve) => resolve({ data: null, error: null }),
      }),
    }),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: new Error('Supabase Storage not configured') }),
        download: async () => ({ data: null, error: new Error('Supabase Storage not configured') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
    channel: () => ({
      on: function () { return this; },
      subscribe: () => ({ unsubscribe: () => {} }),
    }),
  };
}

export const supabase = clientInstance;
export default supabase;
