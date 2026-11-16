import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import QRCode from 'qrcode';
import {
  ScanFace,
  X,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { CLOUD_SERVER_URL } from '../utils/syncService';

interface KioskSetupModalProps {
  employees: Employee[];
  onClose: () => void;
  onOpenKioskNow: () => void;
}

export const KioskSetupModal: React.FC<KioskSetupModalProps> = ({
  employees,
  onClose,
  onOpenKioskNow
}) => {
  const isElectronOrFile =
    typeof window !== 'undefined' &&
    (window.location.protocol === 'file:' ||
      !window.location.origin ||
      window.location.origin === 'null' ||
      window.location.origin.startsWith('file:'));

  const [webBaseUrl, setWebBaseUrl] = useState<string>(() => {
    return (
      localStorage.getItem('control_horas_custom_web_url') ||
      (isElectronOrFile ? CLOUD_SERVER_URL : window.location.origin)
    );
  });

  const safeBase = (webBaseUrl.trim() || CLOUD_SERVER_URL).replace(/\/+$/, '');
  const kioskUrl = `${safeBase}/?portal=kiosco#kiosco`;

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [urlStatus, setUrlStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  const checkReachability = async (base: string) => {
    setUrlStatus('checking');
    try {
      const res = await fetch(`${base}/api/sync/state?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store'
      });
      setUrlStatus(res.ok ? 'ok' : 'error');
    } catch {
      setUrlStatus('error');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkReachability(safeBase);
    }, 400);
    return () => clearTimeout(timer);
  }, [safeBase]);

  useEffect(() => {
    QRCode.toDataURL(kioskUrl, {
      width: 240,
      margin: 1.5,
      color: { dark: '#0f172a', light: '#ffffff' }
    })
      .then((u) => setQrDataUrl(u))
      .catch(() => {});
  }, [kioskUrl]);

  const activeEmployees = employees.filter((e) => e.active);
  const enrolledCount = activeEmployees.filter(
    (e) => e.faceDescriptors && e.faceDescriptors.length > 0
  ).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(kioskUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Kiosco Facial Fijo de Empresa</h3>
              <p className="text-xs text-slate-400">
                App aparte para celular o tablet fija en la entrada
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block text-sm">
                Rostros registrados: <span className="tabular-nums">{enrolledCount}</span> de{' '}
                <span className="tabular-nums">{activeEmployees.length}</span> empleados
              </span>
              <span className="text-slate-500 text-[11px]">
                Puedes registrar los rostros desde Empleados o directamente en el celular fijo.
              </span>
            </div>
          </div>

          {urlStatus === 'error' && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 space-y-1">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>El servidor web público configurado aún no responde</span>
              </div>
              <p className="text-[11px] text-amber-900">
                Publica la app en Cloud Run y pega abajo la dirección pública para abrir el Kiosco desde el celular fijo.
              </p>
            </div>
          )}

          {urlStatus === 'ok' && (
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl font-bold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Dirección web verificada y lista para el celular fijo</span>
            </div>
          )}

          {/* QR + Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="text-center space-y-1.5">
              <span className="font-bold text-slate-700 block">
                Escanear en el Celular Fijo:
              </span>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Kiosco Facial"
                  className="w-40 h-40 mx-auto rounded-xl border border-slate-200 shadow-xs bg-white p-1.5"
                />
              ) : (
                <div className="w-40 h-40 mx-auto bg-slate-200 rounded-xl animate-pulse" />
              )}
              <p className="text-[10px] text-slate-500 leading-tight">
                Luego en Chrome/Safari toca «Agregar a pantalla de inicio» para dejarlo como app fija.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onOpenKioskNow}
                className="w-full min-h-[44px] px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Kiosco Aquí</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full min-h-[44px] px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copied ? 'Enlace Copiado' : 'Copiar Enlace del Kiosco'}</span>
              </button>

              <div className="pt-1 space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 block">
                  Dirección web pública:
                </label>
                <input
                  type="text"
                  value={webBaseUrl}
                  onChange={(e) => {
                    setWebBaseUrl(e.target.value);
                    localStorage.setItem('control_horas_custom_web_url', e.target.value);
                  }}
                  placeholder="https://tu-app.run.app"
                  className="w-full font-mono text-[11px] px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => checkReachability(safeBase)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${urlStatus === 'checking' ? 'animate-spin' : ''}`} />
                  <span>Probar conexión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
