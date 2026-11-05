import { Employee, DailyTimeRecord } from '../types';

export const CLOUD_SERVER_URL = 'https://ais-pre-bzq2vla6xllilcoamfkh66-352215019352.us-east5.run.app';

/**
 * Determine the primary and fallback API base URLs.
 * In web browsers (PWA, Chrome, Safari, etc.), relative URLs /api/... hit the hosting server directly.
 * In Electron or file:// environments, we directly hit the public cloud server URL.
 */
export function getApiBaseUrls(): string[] {
  const isElectronOrFile =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null' || window.location.origin.startsWith('file:'));

  if (isElectronOrFile) {
    return [CLOUD_SERVER_URL];
  }

  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  if (currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
    return [currentOrigin, CLOUD_SERVER_URL];
  }

  // Local development: relative first, then cloud server
  return ['', CLOUD_SERVER_URL];
}

/**
 * Verify employee license key with cloud backend.
 * Checks against the centralized database so mobile PWA devices can validate
 * any employee created on the desktop PC.
 */
export async function verifyLicenseWithCloud(
  rawKey: string
): Promise<{ valid: boolean; employee?: Employee; error?: string }> {
  const cleanKey = (rawKey || '').trim().toUpperCase();
  if (!cleanKey) {
    return { valid: false, error: 'Por favor ingrese una clave de licencia válida.' };
  }

  const baseUrls = getApiBaseUrls();

  for (const base of baseUrls) {
    const url = `${base}/api/verify-license/${encodeURIComponent(cleanKey)}?t=${Date.now()}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.valid && data.employee) {
          return { valid: true, employee: data.employee };
        }
      } else if (response.status === 403) {
        const errData = await response.json().catch(() => ({}));
        return { valid: false, error: errData.error || 'Este empleado se encuentra inactivo.' };
      } else if (response.status === 404) {
        // Not found on this server
        continue;
      }
    } catch (e) {
      console.debug(`Failed to verify license on ${url}:`, e);
    }
  }

  return { 
    valid: false, 
    error: 'Clave de Licencia no encontrada en la base de datos central. Asegúrese de que el empleado esté guardado en el sistema.' 
  };
}

/**
 * Send latest employees list to cloud server
 */
export async function syncEmployeesToCloud(employees: Employee[]): Promise<boolean> {
  if (!Array.isArray(employees)) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/employees`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employees })
      });
      if (response.ok) {
        return true;
      }
    } catch (e) {
      console.debug(`Failed syncEmployeesToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Send latest records list to cloud server
 */
export async function syncRecordsToCloud(records: DailyTimeRecord[]): Promise<boolean> {
  if (!Array.isArray(records)) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/records`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ records })
      });
      if (response.ok) {
        return true;
      }
    } catch (e) {
      console.debug(`Failed syncRecordsToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Send an individual punch record from employee's mobile device to cloud
 */
export async function syncPunchToCloud(record: DailyTimeRecord): Promise<boolean> {
  if (!record) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/punch`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ record })
      });
      if (response.ok) {
        return true;
      }
    } catch (e) {
      console.debug(`Failed syncPunchToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Fetch synchronized state (employees and records) from cloud
 */
export async function fetchCloudState(): Promise<{
  employees: Employee[];
  records: DailyTimeRecord[];
} | null> {
  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/state?t=${Date.now()}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data && (Array.isArray(data.employees) || Array.isArray(data.records))) {
          return {
            employees: Array.isArray(data.employees) ? data.employees : [],
            records: Array.isArray(data.records) ? data.records : []
          };
        }
      }
    } catch (e) {
      console.debug(`Failed fetchCloudState on ${url}:`, e);
    }
  }
  return null;
}
