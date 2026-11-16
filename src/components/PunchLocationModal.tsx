import React, { useState } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef
} from '@vis.gl/react-google-maps';
import { X, MapPin, Clock, ExternalLink, Navigation, ShieldCheck } from 'lucide-react';
import { PunchLocation } from '../types';
import { formatDateDisplay } from '../utils/timeUtils';
import { buildGoogleMapsExternalUrl } from '../utils/locationUtils';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';

interface PunchLocationModalProps {
  location: PunchLocation;
  employeeName: string;
  punchLabel: string;
  timeStr: string;
  dateStr: string;
  photoUrl?: string;
  onClose: () => void;
}

const SinglePunchMarker: React.FC<{
  location: PunchLocation;
  employeeName: string;
  punchLabel: string;
  timeStr: string;
}> = ({ location, employeeName, punchLabel, timeStr }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: location.lat, lng: location.lng }}
        onClick={() => setOpen(true)}
        title={`${employeeName} - ${punchLabel}`}
      >
        <Pin background="#2563eb" borderColor="#1d4ed8" glyphColor="#ffffff" scale={1.15} />
      </AdvancedMarker>
      {open && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)} maxWidth={260}>
          <div className="p-1 space-y-1 text-slate-900">
            <p className="text-xs font-extrabold">{employeeName}</p>
            <p className="text-[11px] font-semibold text-blue-700">
              {punchLabel} · {timeStr}
            </p>
            {location.address && (
              <p className="text-[11px] text-slate-600 leading-snug">{location.address}</p>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const PunchLocationModal: React.FC<PunchLocationModalProps> = ({
  location,
  employeeName,
  punchLabel,
  timeStr,
  dateStr,
  photoUrl,
  onClose
}) => {
  const externalMapsUrl = buildGoogleMapsExternalUrl(location.lat, location.lng);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden relative">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold leading-tight">Ubicación de Marcación GPS</h4>
              <p className="text-[11px] text-slate-400">
                {employeeName} · {punchLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {/* Interactive Google Map */}
          <div className="w-full h-[290px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <GoogleMapsWrapper fallbackLatLng={{ lat: location.lat, lng: location.lng }}>
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: location.lat, lng: location.lng }}
                defaultZoom={16}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <SinglePunchMarker
                  location={location}
                  employeeName={employeeName}
                  punchLabel={punchLabel}
                  timeStr={timeStr}
                />
              </GoogleMap>
            </GoogleMapsWrapper>
          </div>

          {/* Info Card */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                  <Navigation className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Dirección / Zona registrada:</span>
                </div>
                <p className="font-bold text-slate-900 leading-snug">
                  {location.address || `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`}
                </p>
              </div>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt={`Foto de ${employeeName}`}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-300 shrink-0 shadow-xs"
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {formatDateDisplay(dateStr)} · <strong className="text-blue-700 font-mono">{timeStr}</strong>
                </span>
              </div>
              <div className="text-right font-mono text-slate-500">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                {location.accuracy ? ` (±${location.accuracy}m)` : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Ubicación verificada por GPS del dispositivo</span>
            </span>

            <a
              href={externalMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <span>Abrir en Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
