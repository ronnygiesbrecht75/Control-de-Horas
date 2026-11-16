import React, { useState, useMemo, useEffect } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Navigation,
  ExternalLink,
  Camera,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Employee, DailyTimeRecord, PunchLocation } from '../types';
import {
  formatDateFriendlySpanish,
  formatDateDisplay,
  formatMonthSpanish,
  getPrevMonthStr,
  getNextMonthStr
} from '../utils/timeUtils';
import { buildGoogleMapsExternalUrl } from '../utils/locationUtils';
import { GoogleMapsWrapper } from './GoogleMapsWrapper';
import { PunchPhotoModal } from './PunchPhotoModal';

interface LocationMapViewProps {
  dateStr: string;
  setDateStr: (date: string) => void;
  monthStr: string;
  setMonthStr: (month: string) => void;
  employees: Employee[];
  records: DailyTimeRecord[];
}

export interface GeoPunchItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string;
  employeeColor: string;
  dateStr: string;
  timeStr: string;
  punchType: string;
  punchLabel: string;
  location: PunchLocation;
  photoUrl?: string;
}

const PIN_STYLE_MAP: Record<string, { bg: string; border: string; label: string; badgeClass: string }> = {
  entry1: { bg: '#059669', border: '#065f46', label: 'Entrada', badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  exit1: { bg: '#d97706', border: '#92400e', label: 'Salida Mediodía', badgeClass: 'text-amber-700 bg-amber-50 border-amber-200' },
  entry2: { bg: '#2563eb', border: '#1e40af', label: 'Entrada Mediodía', badgeClass: 'text-blue-700 bg-blue-50 border-blue-200' },
  exit2: { bg: '#e11d48', border: '#9f1239', label: 'Salida', badgeClass: 'text-rose-700 bg-rose-50 border-rose-200' },
  intermediate_exit: { bg: '#7c3aed', border: '#5b21b6', label: 'Salida Intermedia', badgeClass: 'text-purple-700 bg-purple-50 border-purple-200' },
  intermediate_return: { bg: '#0d9488', border: '#115e59', label: 'Regreso Intermedio', badgeClass: 'text-teal-700 bg-teal-50 border-teal-200' }
};

const MapCameraController: React.FC<{
  selectedItem: GeoPunchItem | null;
  items: GeoPunchItem[];
}> = ({ selectedItem, items }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (selectedItem) {
      map.panTo({ lat: selectedItem.location.lat, lng: selectedItem.location.lng });
      if ((map.getZoom() || 10) < 14) {
        map.setZoom(15);
      }
    } else if (items.length > 0 && typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      if (items.length === 1) {
        map.panTo({ lat: items[0].location.lat, lng: items[0].location.lng });
        map.setZoom(15);
      } else {
        const bounds = new google.maps.LatLngBounds();
        items.forEach(item => {
          bounds.extend({ lat: item.location.lat, lng: item.location.lng });
        });
        map.fitBounds(bounds, 56);
      }
    }
  }, [map, selectedItem, items]);

  return null;
};

const GeoPunchMarker: React.FC<{
  item: GeoPunchItem;
  isSelected: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
  onOpenPhoto: (item: GeoPunchItem) => void;
}> = ({ item, isSelected, onSelect, onCloseInfo, onOpenPhoto }) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const pinStyle = PIN_STYLE_MAP[item.punchType] || PIN_STYLE_MAP.entry1;

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: item.location.lat, lng: item.location.lng }}
        onClick={onSelect}
        title={`${item.employeeName} · ${item.punchLabel} (${item.timeStr})`}
      >
        <Pin
          background={pinStyle.bg}
          borderColor={pinStyle.border}
          glyphColor="#ffffff"
          scale={isSelected ? 1.3 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onCloseInfo} maxWidth={290}>
          <div className="p-1 space-y-2 text-slate-900 min-w-[210px]">
            <div className="flex items-start gap-2.5">
              {item.photoUrl && (
                <button
                  type="button"
                  onClick={() => onOpenPhoto(item)}
                  className="shrink-0 cursor-pointer"
                  title="Ampliar foto"
                >
                  <img
                    src={item.photoUrl}
                    alt={item.employeeName}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                  />
                </button>
              )}
              <div className="min-w-0">
                <p className="text-xs font-extrabold text-slate-900 truncate">{item.employeeName}</p>
                <p className="text-[11px] font-bold text-blue-700">
                  {item.punchLabel} · <span className="font-mono">{item.timeStr}</span>
                </p>
                <p className="text-[10px] text-slate-500">{formatDateDisplay(item.dateStr)}</p>
              </div>
            </div>

            {item.location.address && (
              <p className="text-[11px] text-slate-700 leading-snug bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                {item.location.address}
              </p>
            )}

            <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
              <span className="font-mono">
                {item.location.lat.toFixed(5)}, {item.location.lng.toFixed(5)}
                {item.location.accuracy ? ` (±${item.location.accuracy}m)` : ''}
              </span>
              <a
                href={buildGoogleMapsExternalUrl(item.location.lat, item.location.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-bold inline-flex items-center gap-0.5 ml-2"
              >
                <span>Maps</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const LocationMapView: React.FC<LocationMapViewProps> = ({
  dateStr,
  setDateStr,
  monthStr,
  setMonthStr,
  employees,
  records
}) => {
  const [scope, setScope] = useState<'day' | 'month' | 'all'>('day');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [selectedPunchId, setSelectedPunchId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<GeoPunchItem | null>(null);

  // Lookup employees by ID using plain dictionary (avoiding global Map shadowing)
  const employeeLookup = useMemo(() => {
    const dict: Record<string, Employee> = {};
    employees.forEach(e => {
      dict[e.id] = e;
    });
    return dict;
  }, [employees]);

  // Extract all GPS-tagged punches matching current filters
  const geoPunches = useMemo<GeoPunchItem[]>(() => {
    const items: GeoPunchItem[] = [];

    records.forEach(rec => {
      if (scope === 'day' && rec.dateStr !== dateStr) return;
      if (scope === 'month' && !rec.dateStr.startsWith(monthStr)) return;
      if (employeeFilter !== 'all' && rec.employeeId !== employeeFilter) return;

      const emp = employeeLookup[rec.employeeId];
      const empName = emp?.name || 'Empleado';
      const empRole = emp?.role || 'Operario';
      const empColor = emp?.color || 'bg-blue-600';

      // Prefer audit punches when available
      const seenKeys: Record<string, boolean> = {};
      if (Array.isArray(rec.punches)) {
        rec.punches.forEach(p => {
          if (p.location && Number.isFinite(p.location.lat) && Number.isFinite(p.location.lng)) {
            const key = `${rec.id}_${p.type}_${p.time}`;
            seenKeys[key] = true;
            items.push({
              id: p.id || key,
              employeeId: rec.employeeId,
              employeeName: empName,
              employeeRole: empRole,
              employeeColor: empColor,
              dateStr: rec.dateStr,
              timeStr: p.time,
              punchType: p.type,
              punchLabel: p.label || PIN_STYLE_MAP[p.type]?.label || 'Marcación',
              location: p.location,
              photoUrl: p.photo
            });
          }
        });
      }

      // Also check top-level record fields for backward compatibility / manual links
      const slots: {
        type: string;
        label: string;
        time?: string;
        loc?: PunchLocation;
        photo?: string;
      }[] = [
        { type: 'entry1', label: 'Entrada', time: rec.entry1, loc: rec.entry1Location, photo: rec.entry1Photo },
        { type: 'exit1', label: 'Salida Mediodía', time: rec.exit1, loc: rec.exit1Location, photo: rec.exit1Photo },
        { type: 'entry2', label: 'Entrada Mediodía', time: rec.entry2, loc: rec.entry2Location, photo: rec.entry2Photo },
        { type: 'exit2', label: 'Salida', time: rec.exit2, loc: rec.exit2Location, photo: rec.exit2Photo }
      ];

      slots.forEach(s => {
        if (s.loc && Number.isFinite(s.loc.lat) && Number.isFinite(s.loc.lng)) {
          const key = `${rec.id}_${s.type}_${s.time || ''}`;
          if (!seenKeys[key]) {
            items.push({
              id: key,
              employeeId: rec.employeeId,
              employeeName: empName,
              employeeRole: empRole,
              employeeColor: empColor,
              dateStr: rec.dateStr,
              timeStr: s.time || '--:--',
              punchType: s.type,
              punchLabel: s.label,
              location: s.loc,
              photoUrl: s.photo
            });
          }
        }
      });

      if (Array.isArray(rec.intermediateExits)) {
        rec.intermediateExits.forEach((ex, i) => {
          if (ex.exitLocation) {
            const key = `${rec.id}_int_exit_${i}`;
            if (!seenKeys[`${rec.id}_intermediate_exit_${ex.exitTime}`]) {
              items.push({
                id: key,
                employeeId: rec.employeeId,
                employeeName: empName,
                employeeRole: empRole,
                employeeColor: empColor,
                dateStr: rec.dateStr,
                timeStr: ex.exitTime || '--:--',
                punchType: 'intermediate_exit',
                punchLabel: 'Salida Intermedia',
                location: ex.exitLocation,
                photoUrl: ex.exitPhoto
              });
            }
          }
          if (ex.returnLocation) {
            const key = `${rec.id}_int_ret_${i}`;
            if (!seenKeys[`${rec.id}_intermediate_return_${ex.returnTime}`]) {
              items.push({
                id: key,
                employeeId: rec.employeeId,
                employeeName: empName,
                employeeRole: empRole,
                employeeColor: empColor,
                dateStr: rec.dateStr,
                timeStr: ex.returnTime || '--:--',
                punchType: 'intermediate_return',
                punchLabel: 'Regreso Intermedio',
                location: ex.returnLocation,
                photoUrl: ex.returnPhoto
              });
            }
          }
        });
      }
    });

    // Sort newest first
    return items.sort((a, b) => {
      const dateCmp = b.dateStr.localeCompare(a.dateStr);
      if (dateCmp !== 0) return dateCmp;
      return b.timeStr.localeCompare(a.timeStr);
    });
  }, [records, scope, dateStr, monthStr, employeeFilter, employeeLookup]);

  const selectedItem = useMemo(
    () => geoPunches.find(p => p.id === selectedPunchId) || null,
    [geoPunches, selectedPunchId]
  );

  // Default map center: first item if any, or Paraguay (Asunción) center
  const defaultCenter = useMemo(() => {
    if (geoPunches.length > 0) {
      return { lat: geoPunches[0].location.lat, lng: geoPunches[0].location.lng };
    }
    return { lat: -25.2865, lng: -57.647 };
  }, [geoPunches]);

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Mapa de Ubicaciones GPS
              </h2>
              <p className="text-xs text-slate-500">
                Visualiza el lugar exacto desde donde choferes y empleados marcaron su entrada o salida.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setScope('day')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'day' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Día
              </button>
              <button
                type="button"
                onClick={() => setScope('month')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todo el Mes
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  scope === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Historial Completo
              </button>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            {scope === 'day' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  {formatDateFriendlySpanish(dateStr)}
                </span>
              </div>
            )}

            {scope === 'month' && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
                <button
                  type="button"
                  onClick={() => setMonthStr(getPrevMonthStr(monthStr))}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 px-2 capitalize">
                  {formatMonthSpanish(monthStr)}
                </span>
                <button
                  type="button"
                  onClick={() => setMonthStr(getNextMonthStr(monthStr))}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <Users className="w-4 h-4 text-slate-500" />
              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value);
                  setSelectedPunchId(null);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="all">Todos los empleados ({employees.filter(e => e.active).length})</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>{geoPunches.length} marcaciones con ubicación GPS</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Split Map + Punch Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Map Column */}
        <div className="lg:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-3 flex flex-col">
          <div className="w-full h-[460px] lg:h-[540px] rounded-xl overflow-hidden border border-slate-200 relative">
            <GoogleMapsWrapper fallbackLatLng={defaultCenter}>
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={defaultCenter}
                defaultZoom={geoPunches.length > 0 ? 14 : 6}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                <MapCameraController selectedItem={selectedItem} items={geoPunches} />

                {geoPunches.map(item => (
                  <GeoPunchMarker
                    key={item.id}
                    item={item}
                    isSelected={selectedPunchId === item.id}
                    onSelect={() => setSelectedPunchId(item.id)}
                    onCloseInfo={() => setSelectedPunchId(null)}
                    onOpenPhoto={(punch) => setPhotoPreview(punch)}
                  />
                ))}
              </GoogleMap>
            </GoogleMapsWrapper>
          </div>

          {/* Map Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-2 pt-3 text-[11px] font-semibold text-slate-600">
            <span className="text-slate-400">Referencias:</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Entrada</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-600" /> Salida Mediodía</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Entrada Mediodía</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Salida Final</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600" /> Salida Intermedia</span>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col max-h-[595px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-blue-600" />
              <span>Marcaciones Registradas</span>
            </h3>
            <span className="text-xs font-bold text-slate-500 tabular-nums">{geoPunches.length}</span>
          </div>

          {geoPunches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                <MapPin className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Sin ubicaciones en este filtro</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cuando un empleado o chofer marque su horario desde la App Móvil con el GPS activado, su ubicación aparecerá aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pr-1 mt-2">
              {geoPunches.map(item => {
                const styleInfo = PIN_STYLE_MAP[item.punchType] || PIN_STYLE_MAP.entry1;
                const isActive = selectedPunchId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPunchId(item.id)}
                    className={`py-3 px-2.5 rounded-xl transition-colors cursor-pointer space-y-1.5 ${
                      isActive ? 'bg-blue-50/90 border border-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${item.employeeColor} text-white font-black text-[11px] flex items-center justify-center shrink-0`}>
                          {item.employeeName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-slate-900 truncate">{item.employeeName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{item.employeeRole}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-black text-slate-900 block tabular-nums">
                          {item.timeStr}
                        </span>
                        <span className="text-[10px] text-slate-500">{formatDateDisplay(item.dateStr)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className={`font-bold px-2 py-0.5 rounded-md border ${styleInfo.badgeClass}`}>
                        {item.punchLabel}
                      </span>

                      <div className="flex items-center gap-2">
                        {item.photoUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPhotoPreview(item);
                            }}
                            className="text-slate-600 hover:text-blue-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Foto</span>
                          </button>
                        )}
                        <a
                          href={buildGoogleMapsExternalUrl(item.location.lat, item.location.lng)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-0.5"
                        >
                          <Clock className="w-3 h-3" />
                          <span>Google Maps</span>
                        </a>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {item.location.address || `${item.location.lat.toFixed(5)}, ${item.location.lng.toFixed(5)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Photo Modal */}
      {photoPreview && photoPreview.photoUrl && (
        <PunchPhotoModal
          photoUrl={photoPreview.photoUrl}
          employeeName={photoPreview.employeeName}
          punchLabel={photoPreview.punchLabel}
          timeStr={photoPreview.timeStr}
          dateStr={photoPreview.dateStr}
          onClose={() => setPhotoPreview(null)}
        />
      )}
    </div>
  );
};
