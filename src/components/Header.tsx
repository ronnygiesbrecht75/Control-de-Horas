import React, { useState, useEffect } from 'react';
import { ActiveTab, CurrencyConfig, Employee } from '../types';
import { 
  Clock, 
  RotateCcw, 
  Download, 
  Upload, 
  Settings, 
  X,
  CheckCircle2,
  HelpCircle,
  MessageCircle,
  Send,
  Phone,
  LogOut,
  User,
  RefreshCw,
  Sparkles,
  ArrowUpCircle
} from 'lucide-react';
import { formatMonthSpanish, createWhatsAppShareUrl } from '../utils/timeUtils';
import { loadEmployeesFromStorage } from '../data/mockData';
import { APP_VERSION, checkForAppUpdates, applyAppUpdate } from '../utils/version';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currency: CurrencyConfig;
  setCurrency: (c: CurrencyConfig) => void;
  onResetDemo: () => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  currentUser?: string;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  onResetDemo,
  onExportData,
  onImportData,
  currentUser,
  onLogout,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [importError, setImportError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available'>('idle');
  const [newVersionFound, setNewVersionFound] = useState<string>('');

  // WhatsApp modal state
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [waEmpId, setWaEmpId] = useState<string>('');
  const [waMessage, setWaMessage] = useState<string>('');

  useEffect(() => {
    if (showWhatsAppModal) {
      const emps = loadEmployeesFromStorage();
      setEmployeesList(emps);
      const firstEmp = emps[0];
      if (firstEmp && !waEmpId) {
        setWaEmpId(firstEmp.id);
        setWaMessage(`¡Hola ${firstEmp.name}! Te escribo para enviarte y arreglar el registro de tus horas de entrada y salida del mes. ¡Cualquier consulta me avisas!`);
      }
    }
  }, [showWhatsAppModal]);

  const handleEmpChange = (empId: string) => {
    setWaEmpId(empId);
    const sel = employeesList.find(e => e.id === empId);
    if (sel) {
      setWaMessage(`¡Hola ${sel.name}! Te escribo para enviarte y arreglar el registro de tus horas de entrada y salida del mes. ¡Cualquier consulta me avisas!`);
    }
  };

  const handleSendWhatsApp = () => {
    const sel = employeesList.find(e => e.id === waEmpId);
    const url = createWhatsAppShareUrl(waMessage, sel?.phone);
    window.open(url, '_blank');
    setShowWhatsAppModal(false);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onImportData(content);
        setShowSettingsModal(false);
        setImportError('');
      } catch (err) {
        setImportError('Archivo JSON no válido');
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
        <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo, title, and left-side WhatsApp button */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100 tracking-tight leading-none">
                  Control de Horas
                </h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  2 Entradas y 2 Salidas · Cálculo Mensual Automático
                </p>
              </div>

              {/* WhatsApp button on the left side */}
              <button
                onClick={() => setShowWhatsAppModal(true)}
                title="Compartir Horas y Arreglos de Fin de Mes por WhatsApp"
                className="ml-2 sm:ml-4 flex items-center space-x-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-3 py-1.5 rounded-xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-white fill-current" />
                <span className="text-xs sm:text-sm">WhatsApp</span>
              </button>
            </div>

            {/* Actions: Help & Settings */}
            <div className="flex items-center space-x-2">
              {currentUser && (
                <div className="flex items-center bg-slate-800/80 border border-slate-700/80 rounded-xl px-2.5 py-1 text-xs text-slate-200">
                  <User className="w-3.5 h-3.5 text-orange-400 mr-1.5 shrink-0" />
                  <span className="font-bold mr-2 hidden sm:inline">{currentUser}</span>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      title="Cerrar sesión"
                      className="text-slate-400 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowHelpModal(true)}
                title="Cómo funciona la aplicación"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              <button
                onClick={() => setShowSettingsModal(true)}
                title="Ajustes y Respaldo de datos"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings / Data modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => {
                setShowSettingsModal(false);
                setResetSuccess(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>Ajustes y Respaldo de Datos</span>
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              Todos sus registros se guardan automáticamente en su navegador. También puede exportar una copia de seguridad o restablecer los datos.
            </p>

            <div className="mt-6 space-y-4">
              {/* Export backup */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Exportar Copia de Seguridad</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Descargue un archivo .json con todos sus empleados y horas anotadas.
                    </p>
                  </div>
                  <button
                    onClick={onExportData}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>

              {/* Import backup */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">Restaurar Copia (.json)</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cargue un archivo previamente guardado para recuperar sus datos.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir archivo</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </label>
                </div>
                {importError && (
                  <p className="text-xs text-red-600 mt-2 font-medium">{importError}</p>
                )}
              </div>

              {/* Reset demo */}
              <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-amber-900">Datos de Ejemplo Iniciales</h4>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Restaura 3 empleados de demostración con horas de este mes.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onResetDemo();
                      setResetSuccess(true);
                      setTimeout(() => setResetSuccess(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restablecer</span>
                  </button>
                </div>
                {resetSuccess && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold mt-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Datos restablecidos con éxito!</span>
                  </div>
                )}
              </div>

              {/* Auto Updater / Version Card */}
              <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 shadow-inner">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100">Actualizador del Sistema</h4>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        v{APP_VERSION}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Comprueba actualizaciones automáticas y sincroniza la última versión.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      setUpdateStatus('checking');
                      const res = await checkForAppUpdates();
                      if (res.hasUpdate) {
                        setUpdateStatus('available');
                        setNewVersionFound(res.latestVersion || '');
                      } else {
                        setUpdateStatus('latest');
                        setTimeout(() => setUpdateStatus('idle'), 3000);
                      }
                    }}
                    disabled={updateStatus === 'checking'}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${updateStatus === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{updateStatus === 'checking' ? 'Buscando...' : 'Buscar'}</span>
                  </button>
                </div>

                {updateStatus === 'latest' && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>La aplicación está al día con la última versión (v{APP_VERSION}).</span>
                  </div>
                )}

                {updateStatus === 'available' && (
                  <div className="mt-3 p-2.5 bg-orange-950/60 border border-orange-500/40 rounded-lg flex items-center justify-between">
                    <span className="text-xs text-orange-200 font-medium">
                      ¡Nueva versión disponible (v{newVersionFound})!
                    </span>
                    <button
                      onClick={() => applyAppUpdate()}
                      className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-md transition-colors"
                    >
                      Actualizar Ahora
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>¿Cómo funciona el Control de Horas?</span>
            </h3>

            <div className="mt-4 space-y-4 text-sm text-slate-600">
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Dos Entradas y Dos Salidas diarias</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Diseñado especialmente para jornadas con turno de mañana y turno de tarde (ej. 08:00 a 12:00 y de 14:00 a 18:00). Puede anotar las horas con un solo clic usando botones rápidos o escribiendo la hora.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Suma Automática sin errores</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    El sistema suma instantáneamente las horas y minutos de ambos bloques, restando el intervalo del almuerzo automáticamente y acumulando el total en el mes.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Arreglo y Pago a Fin de Mes</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    En la pestaña <strong className="text-slate-800">Arreglo de Fin de Mes</strong> verá el total de horas trabajadas en el mes multiplicado por el precio/hora del empleado, permitiendo registrar adelantos, ver el total a pagar y generar un <strong className="text-slate-800">Recibo imprimible</strong>.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs text-blue-800 font-medium">
              💡 <strong>Consejo rápido:</strong> En la pestaña <strong>Carga Diaria</strong> puede usar el botón <em>"Turno Estándar (8h)"</em> para rellenar automáticamente la jornada típica del empleado en 1 segundo.
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-orange-600 fill-orange-100" />
                <span>Enviar Arreglo por WhatsApp</span>
              </h3>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Seleccionar Empleado
                </label>
                <select
                  value={waEmpId}
                  onChange={(e) => handleEmpChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  {employeesList.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {e.role} {e.phone ? `(${e.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Mensaje de Arreglo o Resumen de Horas
                </label>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={4}
                  placeholder="Escribe aquí el mensaje para enviar por WhatsApp..."
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Puedes editar el texto antes de enviarlo. Al hacer clic abajo, se abrirá WhatsApp con el mensaje pre-cargado.
                </p>
              </div>

              <div className="bg-orange-50/80 p-3 rounded-xl border border-orange-200 flex items-center justify-between text-xs text-orange-800">
                <span className="font-semibold">Moneda configurada:</span>
                <span className="font-bold text-orange-900 bg-orange-100 px-2.5 py-1 rounded-lg">
                  {currency.symbol} ({currency.code})
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setShowWhatsAppModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Abrir en WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
