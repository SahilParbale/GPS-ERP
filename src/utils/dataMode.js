/**
 * GPS Spindle Industrial ERP — Data Mode & Seed Purge Controller
 *
 * Ensures all seed demo records are permanently removed and cleans out
 * any legacy mock objects cached in browser localStorage.
 */

const CLEAN_SLATE_STORAGE_KEY = 'gps_erp_clean_slate_mode';
const SEED_PURGED_FLAG_KEY = 'gps_erp_seed_data_purged_v2';

/**
 * Automatically purge any legacy demo seed data cached in browser localStorage
 */
export function purgeSeedStorage() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

  try {
    const isPurged = localStorage.getItem(SEED_PURGED_FLAG_KEY);
    if (isPurged === 'true') return;

    // Keys that may contain seed/mock data from previous sessions
    const keysToCheck = [
      'gps_dispatched_history',
      'gps_outlook_emails',
      'gps_dispatched_orders',
      'gps_quotation_work_orders',
      'gps_local_work_orders',
      'gps_local_service_jobs',
      'gps_local_quotations',
      'gps_erp_custom_purchase_orders',
      'gps_erp_custom_suppliers',
      'gps_erp_custom_inventory',
      'gps_erp_custom_spindles'
    ];

    keysToCheck.forEach(key => {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          // If it contains known mock serials or IDs, clear it
          if (
            val.includes('DSP-2026') ||
            val.includes('msg-in-101') ||
            val.includes('Tata Advanced Systems') ||
            val.includes('GPS-2026-0842') ||
            val.includes('WO-2026-104') ||
            val.includes('SR-2026-041') ||
            val.includes('PREMIER INDUSTRIAL')
          ) {
            localStorage.removeItem(key);
          }
        }
      } catch (_e) {}
    });

    localStorage.setItem(CLEAN_SLATE_STORAGE_KEY, 'true');
    localStorage.setItem(SEED_PURGED_FLAG_KEY, 'true');
    console.info('[GPS ERP] Seed data storage purge successfully executed.');
  } catch (e) {
    console.warn('[GPS ERP] Failed to run seed purge routine:', e);
  }
}

// Immediately execute purge on bundle execution
if (typeof window !== 'undefined') {
  purgeSeedStorage();
}

/**
 * Returns true if Clean Slate (Empty Data) mode is active.
 * Always true since all seed data has been removed from the software.
 */
export function isCleanSlateMode() {
  return true;
}

/**
 * Kept for interface compatibility.
 */
export function setCleanSlateMode(_enable) {
  // Always clean slate
}

/**
 * Kept for interface compatibility.
 */
export function toggleCleanSlateMode(reload = false) {
  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
  return true;
}

export const clearCachedMockData = purgeSeedStorage;
