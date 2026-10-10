/**
 * GPS Spindle Industrial ERP — Data Mode Controller
 *
 * Allows non-destructive toggling between:
 *  1. Clean Slate Mode (Zero seed data / fresh empty ERP view)
 *  2. Demo Mode (Full industrial seed datasets loaded)
 *
 * Default is Clean Slate Mode (true) as requested by the user,
 * without permanently deleting any database records or seed files.
 */

const CLEAN_SLATE_STORAGE_KEY = 'gps_erp_clean_slate_mode';

/**
 * Returns true if Clean Slate (Empty Data) mode is currently active.
 * Defaults to true so the user immediately experiences the fresh empty system.
 */
export function isCleanSlateMode() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return true;
  }
  try {
    const stored = localStorage.getItem(CLEAN_SLATE_STORAGE_KEY);
    // Default to true if not explicitly set to 'false'
    if (stored === null) return true;
    return stored === 'true';
  } catch (e) {
    return true;
  }
}

/**
 * Update Clean Slate mode and notify all listening components.
 * @param {boolean} enable
 */
export function setCleanSlateMode(enable) {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CLEAN_SLATE_STORAGE_KEY, enable ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('gps_data_mode_changed', {
        detail: { cleanSlate: Boolean(enable) }
      })
    );
  } catch (e) {
    console.error('[dataMode] Failed to save clean slate state:', e);
  }
}

/**
 * Toggle between Clean Slate and Demo Seed mode.
 * Automatically reloads window if requested to guarantee 100% clean memory and service caches.
 */
export function toggleCleanSlateMode(reload = true) {
  const current = isCleanSlateMode();
  const next = !current;
  setCleanSlateMode(next);
  if (reload && typeof window !== 'undefined') {
    window.location.reload();
  }
  return next;
}
