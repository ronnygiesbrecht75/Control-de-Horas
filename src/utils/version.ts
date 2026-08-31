export const APP_VERSION = '1.0.3';
export const APP_BUILD_DATE = '2026-08-31';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  description?: string;
}

/**
 * Register Service Worker for offline capability & updates
 */
export function registerServiceWorker(onUpdateFound?: () => void) {
  if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available
                  if (onUpdateFound) onUpdateFound();
                }
              }
            };
          };
        })
        .catch((error) => {
          console.debug('Service Worker registration skipped:', error);
        });
    });
  }
}

/**
 * Fetch /version.json to check if a new version is available on the server
 */
export async function checkForAppUpdates(): Promise<{ hasUpdate: boolean; latestVersion?: string; details?: string }> {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    });

    if (!response.ok) {
      return { hasUpdate: false };
    }

    const data: VersionInfo = await response.json();
    if (data && data.version && data.version !== APP_VERSION) {
      return {
        hasUpdate: true,
        latestVersion: data.version,
        details: data.description || 'Nueva versión disponible'
      };
    }
    return { hasUpdate: false, latestVersion: data?.version || APP_VERSION };
  } catch (error) {
    console.debug('Update check error:', error);
    return { hasUpdate: false };
  }
}

/**
 * Perform application update and reload
 */
export async function applyAppUpdate() {
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map(key => caches.delete(key)));
    }
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
      }
    }
  } catch (e) {
    console.error('Error clearing cache on update:', e);
  } finally {
    window.location.reload();
  }
}
