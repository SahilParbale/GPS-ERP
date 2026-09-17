import { supabase, isConfigured } from '../supabase/supabaseClient.js';

/**
 * Normalizes database errors and sanitizes PostgreSQL / Row Level Security errors.
 * Never leaks raw SQL, policy names, or database internals to frontend callers.
 */
export function normalizeDatabaseError(error) {
  if (!error) return null;

  const msg = (error.message || '').toLowerCase();
  const code = error.code || '';

  // Detect Row Level Security (RLS) denial or privilege escalation rejection
  if (
    code === '42501' ||
    code === 'PGRST301' ||
    msg.includes('permission denied') ||
    msg.includes('row-level security') ||
    msg.includes('violates row-level security policy') ||
    msg.includes('privilege escalation rejected')
  ) {
    return {
      code: 'PERMISSION_DENIED',
      message: 'You do not have permission to perform this action.',
      status: 403,
      isRlsDenied: true
    };
  }

  // Resource not found
  if (code === 'PGRST116' || code === '42P01') {
    return {
      code: 'RESOURCE_NOT_FOUND',
      message: 'The requested resource could not be found.',
      status: 404
    };
  }

  // Generic sanitized application database error
  return {
    code: 'DATABASE_ERROR',
    message: 'A database operation failed. Please contact your administrator if this persists.',
    status: 500
  };
}

/**
 * Base Database Service
 * Provides robust query execution, RLS error wrapping, latency tracking, and standard responses.
 */
export const baseService = {
  /**
   * Standard SELECT query wrapper
   * @param {string} table
   * @param {object} [options]
   */
  async select(table, options = {}) {
    const start = performance.now();
    if (!isConfigured) {
      return { data: [], error: null, count: 0, isMock: true, latencyMs: 0 };
    }

    try {
      let query = supabase.from(table).select(options.select || '*', {
        count: options.count ? 'exact' : undefined,
      });

      // Apply equality filters
      if (options.eq) {
        Object.entries(options.eq).forEach(([col, val]) => {
          if (val !== undefined && val !== null) {
            query = query.eq(col, val);
          }
        });
      }

      // Apply search filter (ILIKE)
      if (options.ilike) {
        Object.entries(options.ilike).forEach(([col, pattern]) => {
          if (pattern) {
            query = query.ilike(col, `%${pattern}%`);
          }
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false });
      }

      // Apply pagination range
      if (options.from !== undefined && options.to !== undefined) {
        query = query.range(options.from, options.to);
      } else if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error, count } = await query;
      const latencyMs = Math.round(performance.now() - start);

      if (error) {
        const normalized = normalizeDatabaseError(error);
        console.warn(`[GPS-ERP Auth/DB Notice] select on "${table}":`, normalized.message);
        return { data: [], error: normalized, count: 0, isMock: false, latencyMs };
      }

      return { data: data || [], error: null, count: count ?? (data?.length || 0), isMock: false, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const normalized = normalizeDatabaseError(err);
      console.warn(`[GPS-ERP Auth/DB Notice] select on "${table}":`, normalized.message);
      return { data: [], error: normalized, count: 0, isMock: false, latencyMs };
    }
  },

  /**
   * Standard INSERT query wrapper
   * @param {string} table
   * @param {object|object[]} data
   */
  async insert(table, data) {
    if (!isConfigured) {
      return { data, error: null, isMock: true };
    }

    try {
      const { data: inserted, error } = await supabase
        .from(table)
        .insert(data)
        .select();

      if (error) {
        const normalized = normalizeDatabaseError(error);
        console.warn(`[GPS-ERP Auth/DB Notice] insert on "${table}":`, normalized.message);
        return { data: null, error: normalized, isMock: false };
      }

      return { data: inserted, error: null, isMock: false };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      console.warn(`[GPS-ERP Auth/DB Notice] insert on "${table}":`, normalized.message);
      return { data: null, error: normalized, isMock: false };
    }
  },

  /**
   * Standard UPDATE query wrapper
   * @param {string} table
   * @param {string|number} id
   * @param {object} data
   * @param {string} [idColumn='id']
   */
  async update(table, id, data, idColumn = 'id') {
    if (!isConfigured) {
      return { data: { ...data, [idColumn]: id }, error: null, isMock: true };
    }

    try {
      const { data: updated, error } = await supabase
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq(idColumn, id)
        .select();

      if (error) {
        const normalized = normalizeDatabaseError(error);
        console.warn(`[GPS-ERP Auth/DB Notice] update on "${table}" (${id}):`, normalized.message);
        return { data: null, error: normalized, isMock: false };
      }

      return { data: updated, error: null, isMock: false };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      console.warn(`[GPS-ERP Auth/DB Notice] update on "${table}":`, normalized.message);
      return { data: null, error: normalized, isMock: false };
    }
  },

  /**
   * Standard DELETE (or soft delete) query wrapper
   * @param {string} table
   * @param {string|number} id
   * @param {boolean} [soft=false]
   * @param {string} [idColumn='id']
   */
  async delete(table, id, soft = false, idColumn = 'id') {
    if (!isConfigured) {
      return { error: null, isMock: true };
    }

    try {
      if (soft) {
        return await this.update(table, id, { is_deleted: true, deleted_at: new Date().toISOString() }, idColumn);
      }

      const { error } = await supabase.from(table).delete().eq(idColumn, id);
      if (error) {
        const normalized = normalizeDatabaseError(error);
        console.warn(`[GPS-ERP Auth/DB Notice] delete on "${table}" (${id}):`, normalized.message);
        return { error: normalized, isMock: false };
      }

      return { error: null, isMock: false };
    } catch (err) {
      const normalized = normalizeDatabaseError(err);
      console.warn(`[GPS-ERP Auth/DB Notice] delete on "${table}":`, normalized.message);
      return { error: normalized, isMock: false };
    }
  },
};

export default baseService;
