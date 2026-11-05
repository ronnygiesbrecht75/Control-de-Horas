export const APP_VERSION = '1.9';
export const APP_BUILD_DATE = '2026-11-05';
export const GITHUB_REPO_URL = 'https://github.com/ronnygiesbrecht75/control-de-horas';
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const CLOUD_VERSION_URL = 'https://ais-pre-bzq2vla6xllilcoamfkh66-352215019352.us-east5.run.app/version.json';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  description?: string;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  details?: string;
  releaseUrl?: string;
  downloadUrl?: string;
  checkedAt: string;
  source?: 'cloud' | 'local' | 'github' | 'current';
  error?: string;
}

/**
 * Compare two semantic version strings (e.g. "1.9" vs "1.8", or "1.9.0" vs "1.9")
 */
export function isNewerVersion(remoteVer: string, currentVer: string): boolean {
  const clean = (v: string) => v.replace(/^v/i, '').trim();
  const v1Parts = clean(remoteVer).split('.').map(n => parseInt(n, 10) || 0);
  const v2Parts = clean(currentVer).split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(v1Parts.length, v2Parts.length);

  for (let i = 0; i < maxLen; i++) {
    const p1 = v1Parts[i] || 0;
    const p2 = v2Parts[i] || 0;
    if (p1 > p2) return true;
    if (p1 < p2) return false;
  }
  return false;
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
 * Fetch latest version from Cloud, local server or GitHub Releases
 * Fully works inside Electron PC app (where protocol is file://) and in web browsers
 */
export async function checkForAppUpdates(): Promise<CheckUpdateResult> {
  const isElectronOrFile = 
    typeof window !== 'undefined' && 
    (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null' || window.location.origin.startsWith('file:'));

  const nowFormatted = new Date().toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' });

  // List of update URLs to try in order
  const urlsToTry: { url: string; source: 'local' | 'cloud' }[] = [];

  // In web browsers, try local relative /version.json first
  if (!isElectronOrFile && typeof window !== 'undefined' && window.location.origin) {
    urlsToTry.push({ url: `${window.location.origin}/version.json?t=${Date.now()}`, source: 'local' });
  }

  // Always try the public Cloud URL as primary or fallback
  urlsToTry.push({ url: `${CLOUD_VERSION_URL}?t=${Date.now()}`, source: 'cloud' });

  // 1. Try version.json endpoints
  for (const { url, source } of urlsToTry) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });

      if (response.ok) {
        const data: VersionInfo = await response.json();
        if (data && data.version) {
          const remoteVersion = data.version.trim();
          const hasUpdate = isNewerVersion(remoteVersion, APP_VERSION);
          return {
            hasUpdate,
            currentVersion: APP_VERSION,
            latestVersion: remoteVersion,
            details: data.description || (hasUpdate ? `Nueva versión ${remoteVersion} disponible.` : 'Tu sistema está actualizado.'),
            releaseUrl: GITHUB_RELEASES_URL,
            downloadUrl: `${GITHUB_RELEASES_URL}/latest`,
            checkedAt: nowFormatted,
            source
          };
        }
      }
    } catch (e) {
      console.debug(`Could not check updates from ${url}:`, e);
    }
  }

  // 2. Try GitHub Releases API
  try {
    const ghRes = await fetch('https://api.github.com/repos/ronnygiesbrecht75/control-de-horas/releases/latest', {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (ghRes.ok) {
      const ghData = await ghRes.json();
      const tagName = (ghData.tag_name || '').replace(/^v/i, '').trim();
      if (tagName) {
        const hasUpdate = isNewerVersion(tagName, APP_VERSION);
        return {
          hasUpdate,
          currentVersion: APP_VERSION,
          latestVersion: tagName,
          details: ghData.name || (hasUpdate ? `Actualización v${tagName} disponible en GitHub.` : 'Tu sistema está actualizado.'),
          releaseUrl: ghData.html_url || GITHUB_RELEASES_URL,
          downloadUrl: ghData.html_url || `${GITHUB_RELEASES_URL}/latest`,
          checkedAt: nowFormatted,
          source: 'github'
        };
      }
    }
  } catch (e) {
    console.debug('Could not check GitHub releases:', e);
  }

  // Fallback: system is on current installed version
  return {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    details: `Tu sistema cuenta con la versión v${APP_VERSION}.`,
    releaseUrl: GITHUB_RELEASES_URL,
    downloadUrl: `${GITHUB_RELEASES_URL}/latest`,
    checkedAt: nowFormatted,
    source: 'current'
  };
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
