import { PunchLocation } from '../types';
import { reverseGeocodeCoords } from './syncService';

export interface GpsCaptureResult {
  location?: PunchLocation;
  status: 'captured' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';
  errorMessage?: string;
}

/**
 * Capture current browser/device GPS location and resolve human-readable address
 * via our server-side Google Maps Geocoding proxy.
 */
export async function captureCurrentGpsLocation(resolveAddress = true): Promise<GpsCaptureResult> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return {
      status: 'unsupported',
      errorMessage: 'Este navegador no soporta geolocalización GPS.'
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);
        const capturedAt = new Date().toISOString();

        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (resolveAddress) {
          address = await reverseGeocodeCoords(lat, lng);
        }

        resolve({
          status: 'captured',
          location: {
            lat,
            lng,
            accuracy,
            address,
            capturedAt
          }
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          resolve({
            status: 'denied',
            errorMessage: 'Permiso de ubicación denegado. Active el GPS para registrar desde dónde marca.'
          });
        } else if (err.code === err.TIMEOUT) {
          resolve({
            status: 'timeout',
            errorMessage: 'Tiempo agotado al obtener señal GPS.'
          });
        } else {
          resolve({
            status: 'unavailable',
            errorMessage: 'Señal GPS no disponible en este momento.'
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 15000
      }
    );
  });
}

export function buildGoogleMapsExternalUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
