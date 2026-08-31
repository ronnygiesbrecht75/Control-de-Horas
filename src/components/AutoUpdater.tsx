import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, ArrowUpCircle, X } from 'lucide-react';
import { APP_VERSION, checkForAppUpdates, applyAppUpdate, registerServiceWorker } from '../utils/version';

interface AutoUpdaterProps {
  onManualCheckRequested?: boolean;
  onManualCheckFinished?: () => void;
}

export const AutoUpdater: React.FC<AutoUpdaterProps> = ({
  onManualCheckRequested,
  onManualCheckFinished
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Initial check and periodic background check (every 10 minutes)
  useEffect(() => {
    registerServiceWorker(() => {
      setUpdateAvailable(true);
      setShowToast(true);
    });

    const runCheck = async () => {
      const res = await checkForAppUpdates();
      if (res.hasUpdate) {
        setUpdateAvailable(true);
        setNewVersion(res.latestVersion || '');
        setShowToast(true);
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle manual check trigger
  useEffect(() => {
    if (onManualCheckRequested) {
      setIsChecking(true);
      checkForAppUpdates().then((res) => {
        setIsChecking(false);
        if (res.hasUpdate) {
          setUpdateAvailable(true);
          setNewVersion(res.latestVersion || '');
          setShowToast(true);
          setDismissed(false);
        }
        if (onManualCheckFinished) {
          onManualCheckFinished();
        }
      });
    }
  }, [onManualCheckRequested, onManualCheckFinished]);

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    await applyAppUpdate();
  };

  if (!showToast || dismissed || !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 text-white rounded-2xl shadow-2xl border border-orange-500/40 p-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
            <ArrowUpCircle className="w-5 h-5 text-white animate-bounce" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <span>Nueva actualización</span>
              {newVersion && (
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  v{newVersion}
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              Hay una nueva versión disponible para tu aplicación.
            </p>
          </div>
        </div>

        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg transition-colors cursor-pointer"
          title="Cerrar notificación"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleUpdateNow}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? 'Actualizando...' : 'Actualizar Ahora'}</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
        >
          Más tarde
        </button>
      </div>
    </div>
  );
};
