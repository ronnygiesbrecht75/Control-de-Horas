import React, { useState, useEffect } from 'react';
import { Employee, DailyTimeRecord, IntermediateExit, PunchAuditLog } from '../types';
import { 
  Smartphone, 
  KeyRound, 
  CheckCircle, 
  Camera, 
  ArrowRight, 
  AlertCircle, 
  ShieldCheck, 
  Coffee, 
  Sun, 
  Moon,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { 
  getTodayDateStr, 
  calculateDailyTotalHours, 
  formatDateFriendlySpanish 
} from '../utils/timeUtils';
import { FaceCameraModal } from './FaceCameraModal';
import { 
  verifyLicenseWithCloud, 
  syncPunchToCloud, 
  fetchCloudState 
} from '../utils/syncService';

interface EmployeeMobilePortalProps {
  employees: Employee[];
  records: DailyTimeRecord[];
  onUpdateEmployee: (emp: Employee) => void;
  onUpdateRecord: (updatedRecord: DailyTimeRecord) => void;
  onExitToAdmin?: () => void;
  onSwitchToAdmin?: () => void;
  initialLicenseParam?: string;
}

export const EmployeeMobilePortal: React.FC<EmployeeMobilePortalProps> = ({
  employees,
  records,
  onUpdateEmployee,
  onUpdateRecord,
  onExitToAdmin,
  onSwitchToAdmin,
  initialLicenseParam
}) => {
  // Check if device already has an active linked license
  const [storedLicense, setStoredLicense] = useState<string>(() => {
    if (initialLicenseParam) return initialLicenseParam.trim().toUpperCase();
    return localStorage.getItem('control_horas_device_license') || '';
  });

  const [inputLicense, setInputLicense] = useState(initialLicenseParam || '');
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);
  const [isValidatingCloud, setIsValidatingCloud] = useState<boolean>(false);

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Active camera modal state
  const [activePunchType, setActivePunchType] = useState<
    'entry1' | 'exit1' | 'entry2' | 'exit2' | 'intermediate_exit' | 'intermediate_return' | null
  >(null);
  const [activePunchLabel, setActivePunchLabel] = useState<string>('');

  // Success toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastPhoto, setToastPhoto] = useState<string | null>(null);

  // Check if admin is currently logged in on this browser (for safe exit button)
  const isAdminLoggedIn = typeof window !== 'undefined' && Boolean(localStorage.getItem('current_user'));

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Find linked employee
  const activeEmployee = employees.find(
    emp => emp.active && emp.licenseKey && emp.licenseKey.trim().toUpperCase() === storedLicense.trim().toUpperCase()
  );

  // Auto-restore employee from cloud if phone already had a license stored but local database is clean
  useEffect(() => {
    if (storedLicense && !activeEmployee && !isValidatingCloud) {
      setIsValidatingCloud(true);
      verifyLicenseWithCloud(storedLicense)
        .then(result => {
          if (result.valid && result.employee) {
            onUpdateEmployee(result.employee);
          }
        })
        .catch(err => console.debug('Auto-restore employee error:', err))
        .finally(() => setIsValidatingCloud(false));
    }
  }, [storedLicense, activeEmployee]);

  const todayStr = getTodayDateStr();

  // Get or initialize today's record for this employee
  const todayRecord: DailyTimeRecord = activeEmployee ? (
    records.find(r => r.employeeId === activeEmployee.id && r.dateStr === todayStr) || {
      id: `${activeEmployee.id}_${todayStr}`,
      employeeId: activeEmployee.id,
      dateStr: todayStr,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      intermediateExits: [],
      isAbsent: false,
      totalHours: 0,
      punches: []
    }
  ) : {
    id: `temp_${todayStr}`,
    employeeId: '',
    dateStr: todayStr,
    entry1: '',
    exit1: '',
    entry2: '',
    exit2: '',
    intermediateExits: [],
    isAbsent: false,
    totalHours: 0
  };

  // Handle License Activation (checks local + Cloud verification)
  const handleActivateLicense = async (e?: React.FormEvent, directKey?: string) => {
    if (e) e.preventDefault();
    setActivationError(null);
    setActivationSuccess(null);

    const rawKey = (directKey || inputLicense).trim();
    if (!rawKey) {
      setActivationError('Por favor ingrese su Clave de Licencia.');
      return;
    }

    const cleanKey = rawKey.toUpperCase();

    // 1. First attempt flexible local match
    let matchedEmp = employees.find(emp => {
      if (!emp.licenseKey) return false;
      const empKey = emp.licenseKey.trim().toUpperCase();
      if (empKey === cleanKey) return true;
      if (empKey.replace(/^LIC-/, '') === cleanKey.replace(/^LIC-/, '')) return true;
      if (cleanKey.length >= 4 && (empKey.includes(cleanKey) || cleanKey.includes(empKey))) return true;
      return false;
    });

    // 2. If not found locally (e.g. employee was registered on PC and this is the mobile PWA),
    // query the cloud database!
    if (!matchedEmp) {
      setIsValidatingCloud(true);
      try {
        const cloudRes = await verifyLicenseWithCloud(cleanKey);
        if (cloudRes.valid && cloudRes.employee) {
          matchedEmp = cloudRes.employee;
        } else {
          setActivationError(
            cloudRes.error || 'Clave de Licencia no válida. Verifique que el empleado esté registrado.'
          );
          setIsValidatingCloud(false);
          return;
        }
      } catch (err) {
        console.error('Error verifying license with cloud:', err);
        setActivationError('No se pudo verificar la clave en el servidor. Revise su conexión a internet.');
        setIsValidatingCloud(false);
        return;
      }
      setIsValidatingCloud(false);
    }

    if (!matchedEmp.active) {
      setActivationError('Este empleado se encuentra inactivo.');
      return;
    }

    if (matchedEmp.licenseActive === false) {
      setActivationError('Esta licencia está suspendida. Consulte con su empleador.');
      return;
    }

    // Save device activation locally on this device permanently
    const finalKey = matchedEmp.licenseKey.trim().toUpperCase();
    localStorage.setItem('control_horas_device_license', finalKey);
    setStoredLicense(finalKey);

    // Update employee status as device linked
    onUpdateEmployee({
      ...matchedEmp,
      deviceLinked: true,
      deviceLinkedAt: new Date().toISOString()
    });

    setActivationSuccess(`¡Bienvenido/a, ${matchedEmp.name}!`);
  };

  // Handle changing or unlinking license if needed
  const handleUnlinkDevice = () => {
    if (window.confirm('¿Desea desvincular este celular para ingresar otra clave de licencia?')) {
      localStorage.removeItem('control_horas_device_license');
      setStoredLicense('');
      setInputLicense('');
    }
  };

  // Start punch flow
  const handleStartPunch = (type: 'entry1' | 'exit1' | 'entry2' | 'exit2') => {
    const labels: Record<string, string> = {
      entry1: 'Entrada',
      exit1: 'Salida Mediodía',
      entry2: 'Entrada Mediodía',
      exit2: 'Salida'
    };
    setActivePunchType(type);
    setActivePunchLabel(labels[type] || 'Marcación de Horario');
  };

  // Capture photo & record time
  const handlePhotoCaptured = (photoBase64: string) => {
    if (!activeEmployee || !activePunchType) return;

    const now = new Date();
    const timeHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newPunchLog: PunchAuditLog = {
      id: `punch_${Date.now()}`,
      type: activePunchType,
      time: timeHHMM,
      timestamp: now.toISOString(),
      photo: photoBase64,
      label: activePunchLabel
    };

    const currentPunches = todayRecord.punches ? [...todayRecord.punches] : [];
    currentPunches.push(newPunchLog);

    let updatedRecord: DailyTimeRecord = {
      ...todayRecord,
      punches: currentPunches
    };

    if (activePunchType === 'entry1') {
      updatedRecord.entry1 = timeHHMM;
      updatedRecord.entry1Photo = photoBase64;
    } else if (activePunchType === 'exit1') {
      updatedRecord.exit1 = timeHHMM;
      updatedRecord.exit1Photo = photoBase64;
    } else if (activePunchType === 'entry2') {
      updatedRecord.entry2 = timeHHMM;
      updatedRecord.entry2Photo = photoBase64;
    } else if (activePunchType === 'exit2') {
      updatedRecord.exit2 = timeHHMM;
      updatedRecord.exit2Photo = photoBase64;
    } else if (activePunchType === 'intermediate_exit') {
      const exits = updatedRecord.intermediateExits ? [...updatedRecord.intermediateExits] : [];
      exits.push({
        id: `exit_${Date.now()}`,
        exitTime: timeHHMM,
        returnTime: '',
        label: 'Salida intermedia',
        exitPhoto: photoBase64
      });
      updatedRecord.intermediateExits = exits;
    } else if (activePunchType === 'intermediate_return') {
      const exits = updatedRecord.intermediateExits ? [...updatedRecord.intermediateExits] : [];
      // Close the latest open exit
      const lastOpenIndex = [...exits].reverse().findIndex(e => e.exitTime && !e.returnTime);
      if (lastOpenIndex >= 0) {
        const actualIndex = exits.length - 1 - lastOpenIndex;
        exits[actualIndex] = {
          ...exits[actualIndex],
          returnTime: timeHHMM,
          returnPhoto: photoBase64
        };
      } else {
        exits.push({
          id: `exit_${Date.now()}`,
          exitTime: timeHHMM,
          returnTime: timeHHMM,
          label: 'Regreso intermedio',
          returnPhoto: photoBase64
        });
      }
      updatedRecord.intermediateExits = exits;
    }

    // Recalculate net hours
    const netHours = calculateDailyTotalHours(
      updatedRecord.entry1,
      updatedRecord.exit1,
      updatedRecord.entry2,
      updatedRecord.exit2,
      updatedRecord.intermediateExits,
      updatedRecord.intervals
    );
    updatedRecord.totalHours = netHours;
    onUpdateRecord(updatedRecord);

    // Sync punch with photo to cloud so PC sees the punch immediately
    syncPunchToCloud(updatedRecord).catch(err => {
      console.debug('Background cloud punch sync issue:', err);
    });

    // Show toast
    setToastPhoto(photoBase64);
    setToastMessage(`¡${activePunchLabel} registrada con éxito a las ${timeHHMM}!`);
    setTimeout(() => {
      setToastMessage(null);
      setToastPhoto(null);
    }, 5000);

    // Close camera
    setActivePunchType(null);
    setActivePunchLabel('');
  };

  // Check if an intermediate exit is currently open (exit recorded, but return pending)
  const currentOpenExit = (todayRecord.intermediateExits || []).find(e => e.exitTime && !e.returnTime);

  // VIEW 1: ACTIVATION FORM (ONLY FOR ENTERING LICENSE KEY ONCE)
  if (!activeEmployee) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        {/* Top bar (only show exit button if admin is testing) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Control de Horas</span>
              <h1 className="text-sm font-extrabold text-white">Registro de Entradas y Salidas</h1>
            </div>
          </div>
          {isAdminLoggedIn && onExitToAdmin && (
            <button
              type="button"
              onClick={onExitToAdmin}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Cerrar</span>
            </button>
          )}
        </div>

        {/* Activation Box */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-500/20">
                <KeyRound className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Acceso de Empleado
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Ingrese su <strong>Clave de Licencia</strong> para activar la aplicación en su celular.
              </p>
            </div>

            {activationError && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{activationError}</span>
              </div>
            )}

            {activationSuccess && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-semibold flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{activationSuccess}</span>
              </div>
            )}

            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                  Clave de Licencia:
                </label>
                <input
                  type="text"
                  value={inputLicense}
                  onChange={(e) => setInputLicense(e.target.value.toUpperCase())}
                  placeholder="Ej. LIC-8492-CARL"
                  className="w-full bg-slate-950 border-2 border-slate-700 rounded-2xl px-4 py-3.5 text-base font-mono font-bold tracking-wider text-center text-white placeholder-slate-600 uppercase focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 focus:outline-none transition-all"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                  Solo se solicita una vez.
                </p>
              </div>

              <button
                type="submit"
                disabled={isValidatingCloud}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isValidatingCloud ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Verificando en la Nube...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Abrir Marcador</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Testing Helpers for registered employees */}
            {employees.filter(e => e.active).length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-400 font-bold text-center">
                  💡 Empleados registrados (haz clic para probar su clave):
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center max-h-36 overflow-y-auto">
                  {employees.filter(e => e.active).map(emp => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setInputLicense(emp.licenseKey || '');
                        handleActivateLicense(undefined, emp.licenseKey);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-500 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{emp.name}:</span>
                      <span className="text-blue-400 font-extrabold">{emp.licenseKey}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {onSwitchToAdmin && (
              <div className="pt-2 text-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={onSwitchToAdmin}
                  className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors cursor-pointer"
                >
                  ¿Eres administrador? Ingresar con usuario y contraseña
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 py-2">
          Control de Horas · Registro con Foto Facial
        </div>
      </div>
    );
  }

  // VIEW 2: ACTIVATED CLOCK-IN SCREEN (ONLY ENTRY & EXIT OPTIONS, NOTHING ELSE)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-10">
      {/* Top Header - Focused purely on employee identity */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl ${activeEmployee.color || 'bg-blue-600'} text-white font-black flex items-center justify-center text-xs shadow-xs`}>
              {activeEmployee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <h2 className="text-xs font-black text-white leading-tight">{activeEmployee.name}</h2>
              <span className="text-[10px] text-slate-400 font-medium">{activeEmployee.role}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUnlinkDevice}
              title="Cambiar o desvincular Clave de Licencia"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cambiar clave
            </button>
            {isAdminLoggedIn && onExitToAdmin && (
              <button
                type="button"
                onClick={onExitToAdmin}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Marcador
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto px-4 pt-4 space-y-4">
        {/* Toast notification */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-200">
            {toastPhoto ? (
              <img
                src={toastPhoto}
                alt="Foto"
                className="w-10 h-10 rounded-xl object-cover border-2 border-white/50 shrink-0"
              />
            ) : (
              <CheckCircle className="w-6 h-6 text-emerald-200 shrink-0" />
            )}
            <div className="text-xs font-bold leading-snug">
              {toastMessage}
            </div>
          </div>
        )}

        {/* Digital Clock Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-5 text-center shadow-xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
          
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            {formatDateFriendlySpanish(todayStr)}
          </p>

          <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight flex items-center justify-center gap-1 my-1">
            <span>{String(currentTime.getHours()).padStart(2, '0')}</span>
            <span className="text-blue-500 animate-pulse">:</span>
            <span>{String(currentTime.getMinutes()).padStart(2, '0')}</span>
            <span className="text-xs font-mono font-bold text-slate-400 self-end mb-1 sm:mb-2 ml-1">
              :{String(currentTime.getSeconds()).padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>Verificación con Foto Facial</span>
            </span>
          </div>
        </div>

        {/* Today's Shift Status Summary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
            <span>Registros de Hoy:</span>
            <span className="text-blue-400 font-black">
              {(todayRecord.totalHours || 0).toFixed(2)} h registradas
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Mañana */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Turno Mañana</span>
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-slate-200">
                <span className={todayRecord.entry1 ? 'text-emerald-400' : 'text-slate-600'}>
                  {todayRecord.entry1 || '--:--'}
                </span>
                <span className="text-slate-600">→</span>
                <span className={todayRecord.exit1 ? 'text-rose-400' : 'text-slate-600'}>
                  {todayRecord.exit1 || '--:--'}
                </span>
              </div>
            </div>

            {/* Tarde */}
            <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                <Moon className="w-3 h-3 text-indigo-400" />
                <span>Turno Tarde</span>
              </span>
              <div className="flex items-center justify-between font-mono font-bold text-slate-200">
                <span className={todayRecord.entry2 ? 'text-emerald-400' : 'text-slate-600'}>
                  {todayRecord.entry2 || '--:--'}
                </span>
                <span className="text-slate-600">→</span>
                <span className={todayRecord.exit2 ? 'text-rose-400' : 'text-slate-600'}>
                  {todayRecord.exit2 || '--:--'}
                </span>
              </div>
            </div>
          </div>

          {/* Salidas intermedias registradas */}
          {todayRecord.intermediateExits && todayRecord.intermediateExits.length > 0 && (
            <div className="pt-1.5 space-y-1">
              <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                <Coffee className="w-3 h-3" />
                <span>Salidas Intermedias ({todayRecord.intermediateExits.length}):</span>
              </span>
              <div className="flex flex-wrap gap-1">
                {todayRecord.intermediateExits.map((item, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                      !item.returnTime
                        ? 'bg-amber-950/80 border-amber-600 text-amber-300 animate-pulse font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    {item.exitTime} - {item.returnTime || 'En curso...'}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION: BOTONES DE REGISTRO DE ENTRADAS Y SALIDAS */}
        <div className="space-y-3 pt-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400 block text-center">
            Marcar Entrada y Salida:
          </span>

          {/* Turno 1: Entrada y Salida Mediodía */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Entrada */}
            <button
              type="button"
              onClick={() => handleStartPunch('entry1')}
              className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer ${
                todayRecord.entry1
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Entrada</span>
                </span>
                <Camera className="w-4 h-4 opacity-80" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono">
                  {todayRecord.entry1 || 'Marcar'}
                </span>
                {todayRecord.entry1 && (
                  <span className="text-[10px] font-bold bg-emerald-900/80 px-1.5 py-0.5 rounded text-emerald-200">
                    Registrado
                  </span>
                )}
              </div>
            </button>

            {/* Salida Mediodía */}
            <button
              type="button"
              onClick={() => handleStartPunch('exit1')}
              className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer ${
                todayRecord.exit1
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5" />
                  <span>Salida Mediodía</span>
                </span>
                <Camera className="w-4 h-4 opacity-80" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono">
                  {todayRecord.exit1 || 'Marcar'}
                </span>
                {todayRecord.exit1 && (
                  <span className="text-[10px] font-bold bg-rose-900/80 px-1.5 py-0.5 rounded text-rose-200">
                    Registrado
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Turno 2: Entrada Mediodía y Salida */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Entrada Mediodía */}
            <button
              type="button"
              onClick={() => handleStartPunch('entry2')}
              className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer ${
                todayRecord.entry2
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Entrada Mediodía</span>
                </span>
                <Camera className="w-4 h-4 opacity-80" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono">
                  {todayRecord.entry2 || 'Marcar'}
                </span>
                {todayRecord.entry2 && (
                  <span className="text-[10px] font-bold bg-emerald-900/80 px-1.5 py-0.5 rounded text-emerald-200">
                    Registrado
                  </span>
                )}
              </div>
            </button>

            {/* Salida */}
            <button
              type="button"
              onClick={() => handleStartPunch('exit2')}
              className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer ${
                todayRecord.exit2
                  ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                  : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5" />
                  <span>Salida</span>
                </span>
                <Camera className="w-4 h-4 opacity-80" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-black font-mono">
                  {todayRecord.exit2 || 'Marcar'}
                </span>
                {todayRecord.exit2 && (
                  <span className="text-[10px] font-bold bg-rose-900/80 px-1.5 py-0.5 rounded text-rose-200">
                    Registrado
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Salidas Intermedias (Salida y Regreso) */}
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Coffee className="w-4 h-4 text-amber-400" />
                <span>Intermedia</span>
              </span>
              {currentOpenExit && (
                <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full animate-pulse">
                  Salida en curso ({currentOpenExit.exitTime})
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePunchType('intermediate_exit');
                  setActivePunchLabel('Salida Intermedia');
                }}
                className="py-3 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Marcar Salida</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActivePunchType('intermediate_return');
                  setActivePunchLabel('Regreso Intermedio');
                }}
                className={`py-3 px-3 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                  currentOpenExit
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white ring-2 ring-emerald-400/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Marcar Regreso</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-600 pt-6 pb-2 space-y-1">
        <div>Control de Horas · Registro con Foto Facial</div>
        {onSwitchToAdmin && (
          <div>
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="text-[11px] text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
            >
              ¿Eres administrador? Ingresar con usuario y contraseña
            </button>
          </div>
        )}
      </footer>

      {/* FACE CAMERA MODAL */}
      {activePunchType && (
        <FaceCameraModal
          employeeName={activeEmployee.name}
          punchLabel={activePunchLabel}
          onCapture={handlePhotoCaptured}
          onClose={() => {
            setActivePunchType(null);
            setActivePunchLabel('');
          }}
        />
      )}
    </div>
  );
};
