import { Employee, DailyTimeRecord, MonthlySettlementAdjustment, VacationEntry, CurrencyConfig } from '../types';

export const CLOUD_SERVER_URL = 'https://ais-pre-bzq2vla6xllilcoamfkh66-352215019352.us-east5.run.app';

/**
 * Determine the primary and fallback API base URLs.
 * In web browsers (PWA, Chrome, Safari, etc.), relative URLs /api/... hit the hosting server directly.
 * In Electron or file:// environments, we directly hit the public cloud server URL.
 */
export function getApiBaseUrls(): string[] {
  const customUrlRaw =
    typeof window !== 'undefined' ? localStorage.getItem('control_horas_custom_web_url') : '';
  const customUrl = (customUrlRaw || '').trim().replace(/\/+$/, '');
  const validCustomUrl = customUrl && /^https?:\/\//i.test(customUrl) ? customUrl : '';

  const isElectronOrFile =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null' || window.location.origin.startsWith('file:'));

  const urls: string[] = [];

  if (isElectronOrFile) {
    if (validCustomUrl) urls.push(validCustomUrl);
    urls.push(CLOUD_SERVER_URL);
    return Array.from(new Set(urls));
  }

  const currentOrigin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
  if (currentOrigin && !currentOrigin.includes('localhost') && !currentOrigin.includes('127.0.0.1')) {
    urls.push(currentOrigin);
    if (validCustomUrl) urls.push(validCustomUrl);
    urls.push(CLOUD_SERVER_URL);
    return Array.from(new Set(urls));
  }

  // Local development: relative first, then custom URL (if set), then cloud server
  urls.push('');
  if (validCustomUrl) urls.push(validCustomUrl);
  urls.push(CLOUD_SERVER_URL);
  return Array.from(new Set(urls));
}

/**
 * Fetch the Google Maps Platform API key from Vite build env or backend /api/maps-config.
 */
let cachedMapsApiKey: string | null = null;
export async function fetchGoogleMapsApiKey(): Promise<string> {
  if (cachedMapsApiKey) return cachedMapsApiKey;

  const buildEnvKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (buildEnvKey && typeof buildEnvKey === 'string' && !buildEnvKey.startsWith('MY_')) {
    cachedMapsApiKey = buildEnvKey;
    return buildEnvKey;
  }

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    try {
      const response = await fetch(`${base}/api/maps-config?t=${Date.now()}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.apiKey && typeof data.apiKey === 'string') {
          cachedMapsApiKey = data.apiKey;
          return data.apiKey;
        }
      }
    } catch (e) {
      console.debug(`Failed to fetch maps-config from ${base}:`, e);
    }
  }
  return '';
}

/**
 * Reverse geocode lat/lng via server-side proxy (/api/reverse-geocode).
 * Avoids client-side CORS failures and respects quota responses.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const baseUrls = getApiBaseUrls();

  for (const base of baseUrls) {
    const url = `${base}/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      if (response.status === 429) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        return fallback;
      }
      if (response.ok) {
        const data = await response.json().catch(() => null);
        if (data?.error === 'RESOURCE_EXHAUSTED' && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (data?.address) {
          return data.address;
        }
      }
    } catch (e) {
      console.debug(`Reverse geocode fallback on ${url}:`, e);
    }
  }
  return fallback;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees })
      });
      if (response.ok) return true;
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncRecordsToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Send latest settlement adjustments (payments & bonuses) to cloud server
 */
export async function syncAdjustmentsToCloud(adjustments: MonthlySettlementAdjustment[]): Promise<boolean> {
  if (!Array.isArray(adjustments)) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/adjustments`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustments })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncAdjustmentsToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Send latest vacations list to cloud server
 */
export async function syncVacationsToCloud(vacations: VacationEntry[]): Promise<boolean> {
  if (!Array.isArray(vacations)) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/vacations`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacations })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncVacationsToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Post a single vacation request from mobile employee portal
 */
export async function syncVacationRequestToCloud(vacation: VacationEntry): Promise<boolean> {
  if (!vacation) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/vacation-request`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacation })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncVacationRequestToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Sync currency configuration to cloud server
 */
export async function syncCurrencyToCloud(currency: CurrencyConfig): Promise<boolean> {
  if (!currency) return false;

  const baseUrls = getApiBaseUrls();
  for (const base of baseUrls) {
    const url = `${base}/api/sync/currency`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncCurrencyToCloud on ${url}:`, e);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record })
      });
      if (response.ok) return true;
    } catch (e) {
      console.debug(`Failed syncPunchToCloud on ${url}:`, e);
    }
  }
  return false;
}

/**
 * Fetch synchronized state (employees, records, adjustments, vacations, currency) from cloud
 */
export async function fetchCloudState(): Promise<{
  employees: Employee[];
  records: DailyTimeRecord[];
  adjustments: MonthlySettlementAdjustment[];
  vacations: VacationEntry[];
  currency?: CurrencyConfig;
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
            records: Array.isArray(data.records) ? data.records : [],
            adjustments: Array.isArray(data.adjustments) ? data.adjustments : [],
            vacations: Array.isArray(data.vacations) ? data.vacations : [],
            currency: data.currency
          };
        }
      }
    } catch (e) {
      console.debug(`Failed fetchCloudState on ${url}:`, e);
    }
  }
  return null;
}
