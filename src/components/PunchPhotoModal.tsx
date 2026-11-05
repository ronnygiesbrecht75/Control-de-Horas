import React from 'react';
import { X, Camera, Calendar, Clock, User, ShieldCheck } from 'lucide-react';
import { formatDateDisplay } from '../utils/timeUtils';

interface PunchPhotoModalProps {
  photoUrl: string;
  employeeName: string;
  punchLabel: string;
  timeStr: string;
  dateStr: string;
  onClose: () => void;
}

export const PunchPhotoModal: React.FC<PunchPhotoModalProps> = ({
  photoUrl,
  employeeName,
  punchLabel,
  timeStr,
  dateStr,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden relative">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold leading-tight">Foto de Verificación Facial</h4>
              <p className="text-[10px] text-slate-400">{punchLabel}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Photo view */}
        <div className="p-4 space-y-3">
          <div className="aspect-square w-full rounded-2xl overflow-hidden bg-black shadow-inner border border-slate-200">
            <img
              src={photoUrl}
              alt="Verificación facial"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Empleado:</span>
              <strong className="text-slate-800">{employeeName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Fecha:</span>
              <span className="font-semibold text-slate-700">{formatDateDisplay(dateStr)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Hora de Marcación:</span>
              <span className="font-mono font-black text-blue-700">{timeStr}</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
              <span className="text-slate-500 font-medium">Estado:</span>
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Rostro Verificado</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
