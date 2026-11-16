import React, { useEffect, useState } from 'react';
import { APIProvider, useApiLoadingStatus, APILoadingStatus } from '@vis.gl/react-google-maps';
import { fetchGoogleMapsApiKey } from '../utils/syncService';
import { MapPin, Loader2, AlertTriangle } from 'lucide-react';

interface GoogleMapsWrapperProps {
  children: React.ReactNode;
  fallbackLatLng?: { lat: number; lng: number };
}

const MapsStatusGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const status = useApiLoadingStatus();

  if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="w-full h-full min-h-[260px] bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-2">
        <AlertTriangle className="w-8 h-8 text-amber-500" />
        <p className="text-sm font-bold text-slate-800">No se pudo cargar Google Maps</p>
        <p className="text-xs text-slate-500 max-w-sm">
          Verifica la conexión a internet o el estado de tu clave de Google Maps Platform.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export const GoogleMapsWrapper: React.FC<GoogleMapsWrapperProps> = ({
  children,
  fallbackLatLng
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    fetchGoogleMapsApiKey()
      .then((key) => {
        if (mounted) {
          setApiKey(key || '');
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setApiKey('');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[260px] bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-2">
        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Cargando mapa...</p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="w-full h-full min-h-[260px] bg-slate-100 rounded-2xl border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-800">Mapa interactivo pendiente de clave</p>
          <p className="text-xs text-slate-500 max-w-md">
            Configura la variable <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">VITE_GOOGLE_MAPS_API_KEY</code> para visualizar el mapa interactivo directamente aquí.
          </p>
        </div>
        {fallbackLatLng && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${fallbackLatLng.lat},${fallbackLatLng.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Abrir punto en Google Maps
          </a>
        )}
      </div>
    );
  }

  return (
    <APIProvider
      apiKey={apiKey}
      libraries={['marker']}
      language="es"
      region="PY"
    >
      <MapsStatusGuard>{children}</MapsStatusGuard>
    </APIProvider>
  );
};
