import { supabase, isConfigured, supabaseConfig } from './supabaseClient';

/**
 * Health check utility to test connectivity and latency to Supabase.
 * @returns {Promise<{isConfigured: boolean, isConnected: boolean, latencyMs: number, url: string|null, error: string|null, timestamp: string}>}
 */
export async function checkSupabaseConnection() {
  const start = performance.now();
  const timestamp = new Date().toISOString();

  if (!isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      latencyMs: 0,
      url: supabaseConfig.url,
      error: 'Credentials not configured (check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env)',
      timestamp,
    };
  }

  try {
    // Quick probe: probe auth session to verify endpoint reachability
    const { error } = await supabase.auth.getSession();
    const duration = Math.round(performance.now() - start);

    if (error) {
      return {
        isConfigured: true,
        isConnected: false,
        latencyMs: duration,
        url: supabaseConfig.url,
        error: error.message || 'Connection error from Supabase API',
        timestamp,
      };
    }

    return {
      isConfigured: true,
      isConnected: true,
      latencyMs: duration,
      url: supabaseConfig.url,
      error: null,
      timestamp,
    };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    return {
      isConfigured: true,
      isConnected: false,
      latencyMs: duration,
      url: supabaseConfig.url,
      error: err?.message || 'Network error reaching Supabase',
      timestamp,
    };
  }
}
