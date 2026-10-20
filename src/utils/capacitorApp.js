import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

/**
 * Initialize native device capabilities when running inside Capacitor (iOS / Android)
 */
export async function initCapacitorApp() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Set status bar to dark content with transparent background or brand maroon
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setStyle({ style: Style.Light });
    }

    // Hide splash screen after initialization
    await SplashScreen.hide();
  } catch (err) {
    console.warn('[Capacitor] Native plugin init notice:', err?.message || err);
  }
}
