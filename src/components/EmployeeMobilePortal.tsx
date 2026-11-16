import React, { useState, useEffect, useMemo } from 'react';
import {
  Employee,
  DailyTimeRecord,
  PunchAuditLog,
  PunchLocation,
  MonthlySettlementAdjustment,
  VacationEntry,
  CurrencyConfig
} from '../types';
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
  Loader2,
  Home,
  Clock,
  Calendar,
  DollarSign,
  Umbrella,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  FileSpreadsheet,
  History,
  Navigation
} from 'lucide-react';
import {
  getTodayDateStr,
  getCurrentMonthStr,
  getAllDaysInMonth,
  getPrevMonthStr,
  getNextMonthStr,
  calculateDailyTotalHours,
  calculateDailyProductDeductionsTotal,
  calculateEmployeePeriodEarnings,
  formatDateFriendlySpanish,
  formatDateDisplay,
  formatDateShortSpanish,
  formatMonthSpanish,
  formatCurrencyWithSymbol,
  isSunday
} from '../utils/timeUtils';
import { FaceCameraModal } from './FaceCameraModal';
import { PunchLocationModal } from './PunchLocationModal';
import { PunchPhotoModal } from './PunchPhotoModal';
import {
  verifyLicenseWithCloud,
  syncPunchToCloud,
  syncVacationRequestToCloud
} from '../utils/syncService';
import { captureCurrentGpsLocation } from '../utils/locationUtils';

interface EmployeeMobilePortalProps {
  employees: Employee[];
  records: DailyTimeRecord[];
  adjustments?: MonthlySettlementAdjustment[];
  vacations?: VacationEntry[];
  currency?: CurrencyConfig;
  onUpdateEmployee: (emp: Employee) => void;
  onUpdateRecord: (updatedRecord: DailyTimeRecord) => void;
  onAddVacationRequest?: (vac: VacationEntry) => void;
  onExitToAdmin?: () => void;
  onSwitchToAdmin?: () => void;
  initialLicenseParam?: string;
}

type MobileTab = 'home' | 'clock' | 'timesheet' | 'payments';

export const EmployeeMobilePortal: React.FC<EmployeeMobilePortalProps> = ({
  employees,
  records,
  adjustments = [],
  vacations = [],
  currency = { symbol: '₲', code: 'PYG' },
  onUpdateEmployee,
  onUpdateRecord,
  onAddVacationRequest,
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

  // Navigation tab: starts on 'home' (Pantalla de Inicio)
  const [mobileTab, setMobileTab] = useState<MobileTab>('home');
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr());

  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Active camera modal state
  const [activePunchType, setActivePunchType] = useState<
    'entry1' | 'exit1' | 'entry2' | 'exit2' | 'intermediate_exit' | 'intermediate_return' | null
  >(null);
  const [activePunchLabel, setActivePunchLabel] = useState<string>('');

  // Live GPS preview on clock screen
  const [liveGps, setLiveGps] = useState<PunchLocation | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Map & Photo modals
  const [mapModalData, setMapModalData] = useState<{
    location: PunchLocation;
    employeeName: string;
    punchLabel: string;
    timeStr: string;
    dateStr: string;
    photoUrl?: string;
  } | null>(null);

  const [photoModalData, setPhotoModalData] = useState<{
    photoUrl: string;
    employeeName: string;
    punchLabel: string;
    timeStr: string;
    dateStr: string;
  } | null>(null);

  // Vacation Request Modal
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [vacStartDate, setVacStartDate] = useState(getTodayDateStr());
  const [vacEndDate, setVacEndDate] = useState(getTodayDateStr());
  const [vacNotes, setVacNotes] = useState('');
  const [vacSaving, setVacSaving] = useState(false);

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

  // Auto-restore employee from cloud if phone already had a license stored
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

  // Capture live GPS when opening 'clock' tab
  const refreshLiveGps = async () => {
    setGpsLoading(true);
    setGpsError(null);
    const res = await captureCurrentGpsLocation(true);
    if (res.status === 'captured' && res.location) {
      setLiveGps(res.location);
    } else {
      setGpsError(res.errorMessage || 'GPS no disponible');
    }
    setGpsLoading(false);
  };

  useEffect(() => {
    if (activeEmployee && mobileTab === 'clock' && !liveGps && !gpsLoading) {
      refreshLiveGps();
    }
  }, [activeEmployee, mobileTab]);

  const todayStr = getTodayDateStr();

  // Get or initialize today's record
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

  // Employee records lookup by dateStr
  const empRecordsByDate = useMemo(() => {
    const dict: Record<string, DailyTimeRecord> = {};
    if (!activeEmployee) return dict;
    records.forEach(r => {
      if (r.employeeId === activeEmployee.id) {
        dict[r.dateStr] = r;
      }
    });
    return dict;
  }, [records, activeEmployee]);

  // Current month stats & earnings estimate
  const currentMonthStr = getCurrentMonthStr();
  const currentMonthSummary = useMemo(() => {
    if (!activeEmployee) return { hours: 0, daysWorked: 0, gross: 0, deductions: 0, estimatedNet: 0 };
    const monthDays = getAllDaysInMonth(currentMonthStr);
    let hours = 0;
    let daysWorked = 0;
    let deductions = 0;
    const dailyItems: { dateStr: string; hours: number }[] = [];

    monthDays.forEach(d => {
      const rec = empRecordsByDate[d];
      if (rec) {
        const h = rec.totalHours ?? calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2, rec.intermediateExits, rec.intervals);
        if (h > 0) {
          hours += h;
          daysWorked++;
          dailyItems.push({ dateStr: d, hours: h });
        }
        deductions += calculateDailyProductDeductionsTotal(rec.productDeductions);
      }
    });

    const earnings = calculateEmployeePeriodEarnings(activeEmployee, hours, dailyItems);
    return {
      hours,
      daysWorked,
      gross: earnings.gross,
      deductions,
      estimatedNet: Math.max(0, earnings.gross - deductions)
    };
  }, [activeEmployee, empRecordsByDate, currentMonthStr]);

  // Selected month sheet data (for 'timesheet' view)
  const selectedMonthDays = useMemo(() => getAllDaysInMonth(selectedMonth), [selectedMonth]);

  const selectedMonthStats = useMemo(() => {
    if (!activeEmployee) return { hours: 0, daysWorked: 0, gross: 0, deductions: 0, net: 0 };
    let hours = 0;
    let daysWorked = 0;
    let deductions = 0;
    const dailyItems: { dateStr: string; hours: number }[] = [];

    selectedMonthDays.forEach(d => {
      const rec = empRecordsByDate[d];
      if (rec) {
        const h = rec.totalHours ?? calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2, rec.intermediateExits, rec.intervals);
        if (h > 0) {
          hours += h;
          daysWorked++;
          dailyItems.push({ dateStr: d, hours: h });
        }
        deductions += calculateDailyProductDeductionsTotal(rec.productDeductions);
      }
    });

    const earnings = calculateEmployeePeriodEarnings(activeEmployee, hours, dailyItems);
    return {
      hours,
      daysWorked,
      gross: earnings.gross,
      deductions,
      net: Math.max(0, earnings.gross - deductions)
    };
  }, [activeEmployee, selectedMonthDays, empRecordsByDate]);

  // Payment history (from adjustments synced from PC)
  const paymentHistory = useMemo(() => {
    if (!activeEmployee) return [];
    const empAdjs = adjustments.filter(a => a.employeeId === activeEmployee.id);

    const items = empAdjs.map(adj => {
      const pKey = adj.periodKey || adj.monthStr;
      let startDate = adj.startDate || '';
      let endDate = adj.endDate || '';
      let label = pKey;

      if (!startDate || !endDate) {
        if (pKey.endsWith('-Q1')) {
          const m = pKey.replace('-Q1', '');
          startDate = `${m}-01`;
          endDate = `${m}-15`;
          label = `1ª Quincena · ${formatMonthSpanish(m)}`;
        } else if (pKey.endsWith('-Q2')) {
          const m = pKey.replace('-Q2', '');
          const [y, mo] = m.split('-').map(Number);
          const last = new Date(y, mo, 0).getDate();
          startDate = `${m}-16`;
          endDate = `${m}-${String(last).padStart(2, '0')}`;
          label = `2ª Quincena · ${formatMonthSpanish(m)}`;
        } else if (/^\d{4}-\d{2}$/.test(pKey)) {
          const [y, mo] = pKey.split('-').map(Number);
          const last = new Date(y, mo, 0).getDate();
          startDate = `${pKey}-01`;
          endDate = `${pKey}-${String(last).padStart(2, '0')}`;
          label = `Mes Completo · ${formatMonthSpanish(pKey)}`;
        }
      } else {
        label = `${formatDateDisplay(startDate)} al ${formatDateDisplay(endDate)}`;
      }

      // Compute hours & product deductions inside [startDate, endDate]
      let periodHours = 0;
      let daysWorked = 0;
      let productDeductions = 0;
      const dailyItems: { dateStr: string; hours: number }[] = [];

      (Object.values(empRecordsByDate) as DailyTimeRecord[]).forEach(rec => {
        if ((!startDate || rec.dateStr >= startDate) && (!endDate || rec.dateStr <= endDate)) {
          const h = rec.totalHours ?? calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2, rec.intermediateExits, rec.intervals);
          if (h > 0) {
            periodHours += h;
            daysWorked++;
            dailyItems.push({ dateStr: rec.dateStr, hours: h });
          }
          productDeductions += calculateDailyProductDeductionsTotal(rec.productDeductions);
        }
      });

      const earnings = calculateEmployeePeriodEarnings(activeEmployee, periodHours, dailyItems);
      const net = Math.max(0, earnings.gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0) - productDeductions);

      return {
        id: adj.id || pKey,
        label,
        startDate,
        endDate,
        daysWorked,
        periodHours,
        gross: earnings.gross,
        bonus: adj.bonusAmount || 0,
        advance: adj.advanceAmount || 0,
        productDeductions,
        net,
        isPaid: adj.isPaid,
        paidAt: adj.paidAt,
        notes: adj.notes
      };
    });

    return items.sort((a, b) => (b.endDate || b.id).localeCompare(a.endDate || a.id));
  }, [activeEmployee, adjustments, empRecordsByDate]);

  const paidPayments = useMemo(() => paymentHistory.filter(p => p.isPaid), [paymentHistory]);
  const totalAlreadyCollected = useMemo(
    () => paidPayments.reduce((sum, p) => sum + p.net, 0),
    [paidPayments]
  );

  // Vacations summary
  const employeeVacations = useMemo(() => {
    if (!activeEmployee) return [];
    return vacations
      .filter(v => v.employeeId === activeEmployee.id)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [vacations, activeEmployee]);

  const annualVacationDays = activeEmployee?.annualVacationDays ?? 12;
  const usedVacationDays = useMemo(
    () =>
      employeeVacations
        .filter(v => v.status === 'aprobada')
        .reduce((sum, v) => sum + (v.daysCount || 0), 0),
    [employeeVacations]
  );
  const availableVacationDays = Math.max(0, annualVacationDays - usedVacationDays);

  // Regular schedule summary
  const habitualHoursPerDay = useMemo(() => {
    if (!activeEmployee) return 0;
    return calculateDailyTotalHours(
      activeEmployee.defaultEntry1 || '07:00',
      activeEmployee.defaultExit1 || '11:30',
      activeEmployee.defaultEntry2 || '12:30',
      activeEmployee.defaultExit2 || '17:30'
    );
  }, [activeEmployee]);

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

    let matchedEmp = employees.find(emp => {
      if (!emp.licenseKey) return false;
      const empKey = emp.licenseKey.trim().toUpperCase();
      if (empKey === cleanKey) return true;
      if (empKey.replace(/^LIC-/, '') === cleanKey.replace(/^LIC-/, '')) return true;
      if (cleanKey.length >= 4 && (empKey.includes(cleanKey) || cleanKey.includes(empKey))) return true;
      return false;
    });

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

    const finalKey = matchedEmp.licenseKey!.trim().toUpperCase();
    localStorage.setItem('control_horas_device_license', finalKey);
    setStoredLicense(finalKey);

    onUpdateEmployee({
      ...matchedEmp,
      deviceLinked: true,
      deviceLinkedAt: new Date().toISOString()
    });

    setActivationSuccess(`¡Bienvenido/a, ${matchedEmp.name}!`);
    setMobileTab('home');
  };

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

  // Capture photo + GPS location & record time
  const handlePhotoCaptured = (photoBase64: string, capturedLocation?: PunchLocation) => {
    if (!activeEmployee || !activePunchType) return;

    const finalLocation = capturedLocation || liveGps || undefined;
    if (capturedLocation) {
      setLiveGps(capturedLocation);
    }

    const now = new Date();
    const timeHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newPunchLog: PunchAuditLog = {
      id: `punch_${Date.now()}`,
      type: activePunchType,
      time: timeHHMM,
      timestamp: now.toISOString(),
      photo: photoBase64,
      label: activePunchLabel,
      location: finalLocation
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
      if (finalLocation) updatedRecord.entry1Location = finalLocation;
    } else if (activePunchType === 'exit1') {
      updatedRecord.exit1 = timeHHMM;
      updatedRecord.exit1Photo = photoBase64;
      if (finalLocation) updatedRecord.exit1Location = finalLocation;
    } else if (activePunchType === 'entry2') {
      updatedRecord.entry2 = timeHHMM;
      updatedRecord.entry2Photo = photoBase64;
      if (finalLocation) updatedRecord.entry2Location = finalLocation;
    } else if (activePunchType === 'exit2') {
      updatedRecord.exit2 = timeHHMM;
      updatedRecord.exit2Photo = photoBase64;
      if (finalLocation) updatedRecord.exit2Location = finalLocation;
    } else if (activePunchType === 'intermediate_exit') {
      const exits = updatedRecord.intermediateExits ? [...updatedRecord.intermediateExits] : [];
      exits.push({
        id: `exit_${Date.now()}`,
        exitTime: timeHHMM,
        returnTime: '',
        label: 'Salida intermedia',
        exitPhoto: photoBase64,
        exitLocation: finalLocation
      });
      updatedRecord.intermediateExits = exits;
    } else if (activePunchType === 'intermediate_return') {
      const exits = updatedRecord.intermediateExits ? [...updatedRecord.intermediateExits] : [];
      const lastOpenIndex = [...exits].reverse().findIndex(e => e.exitTime && !e.returnTime);
      if (lastOpenIndex >= 0) {
        const actualIndex = exits.length - 1 - lastOpenIndex;
        exits[actualIndex] = {
          ...exits[actualIndex],
          returnTime: timeHHMM,
          returnPhoto: photoBase64,
          returnLocation: finalLocation
        };
      } else {
        exits.push({
          id: `exit_${Date.now()}`,
          exitTime: timeHHMM,
          returnTime: timeHHMM,
          label: 'Regreso intermedio',
          returnPhoto: photoBase64,
          returnLocation: finalLocation
        });
      }
      updatedRecord.intermediateExits = exits;
    }

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

    syncPunchToCloud(updatedRecord).catch(err => {
      console.debug('Background cloud punch sync issue:', err);
    });

    const gpsText = finalLocation ? ' y ubicación GPS' : '';
    setToastPhoto(photoBase64);
    setToastMessage(`¡${activePunchLabel} registrada a las ${timeHHMM} con foto${gpsText}!`);
    setTimeout(() => {
      setToastMessage(null);
      setToastPhoto(null);
    }, 5000);

    setActivePunchType(null);
    setActivePunchLabel('');
  };

  // Submit vacation request from phone
  const handleCreateVacationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployee || !vacStartDate || !vacEndDate) return;

    const start = new Date(`${vacStartDate}T12:00:00`);
    const end = new Date(`${vacEndDate}T12:00:00`);
    const diffDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    setVacSaving(true);
    const newVac: VacationEntry = {
      id: `vac_${Date.now()}`,
      employeeId: activeEmployee.id,
      startDate: vacStartDate,
      endDate: vacEndDate < vacStartDate ? vacStartDate : vacEndDate,
      daysCount: diffDays,
      status: 'pendiente',
      notes: vacNotes.trim() || 'Solicitud desde App Móvil',
      createdAt: new Date().toISOString()
    };

    if (onAddVacationRequest) {
      onAddVacationRequest(newVac);
    }
    await syncVacationRequestToCloud(newVac).catch(err => console.debug('Sync vac error:', err));

    setVacSaving(false);
    setShowVacationModal(false);
    setVacNotes('');
    setToastMessage(`Solicitud de ${diffDays} día(s) de vacaciones enviada correctamente.`);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Check if an intermediate exit is currently open
  const currentOpenExit = (todayRecord.intermediateExits || []).find(e => e.exitTime && !e.returnTime);

  // VIEW 1: ACTIVATION FORM (ENTER LICENSE KEY ONCE)
  if (!activeEmployee) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Gestion de Empleados</span>
              <h1 className="text-sm font-extrabold text-white">Portal del Empleado</h1>
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
                    <span>Abrir Aplicación</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {employees.filter(e => e.active).length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <p className="text-[11px] text-slate-400 font-bold text-center">
                  Empleados registrados en este dispositivo:
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
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700 hover:border-blue-500 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5"
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

        <div className="text-center text-xs text-slate-600 py-2">
          Gestion de Empleados · Foto Facial y Ubicación GPS
        </div>
      </div>
    );
  }

  // Helper to get best GPS location for a record slot
  const getSlotLocation = (rec: DailyTimeRecord, slotType: 'entry1' | 'exit1' | 'entry2' | 'exit2'): PunchLocation | undefined => {
    const direct =
      slotType === 'entry1'
        ? rec.entry1Location
        : slotType === 'exit1'
          ? rec.exit1Location
          : slotType === 'entry2'
            ? rec.entry2Location
            : rec.exit2Location;
    if (direct) return direct;
    const match = (rec.punches || []).find(p => p.type === slotType && p.location);
    return match?.location;
  };

  const getSlotPhoto = (rec: DailyTimeRecord, slotType: 'entry1' | 'exit1' | 'entry2' | 'exit2'): string | undefined => {
    const direct =
      slotType === 'entry1'
        ? rec.entry1Photo
        : slotType === 'exit1'
          ? rec.exit1Photo
          : slotType === 'entry2'
            ? rec.entry2Photo
            : rec.exit2Photo;
    if (direct) return direct;
    const match = (rec.punches || []).find(p => p.type === slotType && p.photo);
    return match?.photo;
  };

  // VIEW 2: AUTHENTICATED MOBILE EMPLOYEE PORTAL
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24">
      {/* TOP BAR: ICONO, USUARIO Y FECHA */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl ${activeEmployee.color || 'bg-blue-600'} text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0`}>
              {activeEmployee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-extrabold text-white leading-tight truncate">
                {activeEmployee.name}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium truncate">
                {activeEmployee.role} · {formatDateFriendlySpanish(todayStr)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleUnlinkDevice}
              title="Cambiar clave de licencia"
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
            >
              Clave
            </button>
            {isAdminLoggedIn && onExitToAdmin && (
              <button
                type="button"
                onClick={onExitToAdmin}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-xl transition-colors cursor-pointer"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN SCROLLABLE CONTENT */}
      <main className="max-w-lg w-full mx-auto px-4 pt-4 space-y-4 flex-1">
        {/* Global Toast */}
        {toastMessage && (
          <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-3">
            {toastPhoto ? (
              <img
                src={toastPhoto}
                alt="Foto"
                className="w-10 h-10 rounded-xl object-cover border-2 border-white/50 shrink-0"
              />
            ) : (
              <CheckCircle className="w-6 h-6 text-emerald-200 shrink-0" />
            )}
            <div className="text-xs font-bold leading-snug">{toastMessage}</div>
          </div>
        )}

        {/* ============================================================
            TAB 1: PANTALLA DE INICIO
           ============================================================ */}
        {mobileTab === 'home' && (
          <div className="space-y-4">
            {/* Tarjeta de Bienvenida + Fecha + Estado de Hoy */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-blue-400">Resumen de Hoy</p>
                  <p className="text-base font-extrabold text-white mt-0.5 capitalize">
                    {formatDateFriendlySpanish(todayStr)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-black text-emerald-400 tabular-nums">
                    {(todayRecord.totalHours || 0).toFixed(2)}h
                  </span>
                  <span className="block text-[10px] text-slate-400">registradas hoy</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {todayRecord.entry1 ? `Entrada: ${todayRecord.entry1}` : 'Sin marcación de entrada hoy'}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileTab('clock')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Marcar ahora</span>
                </button>
              </div>
            </div>

            {/* VENTANA 1: HORARIO HABITUAL */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Horario Habitual</h3>
                    <p className="text-[11px] text-slate-400">Jornada configurada por turno</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                  {habitualHoursPerDay.toFixed(1)} h/día
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Turno Mañana</span>
                  </span>
                  <p className="font-mono font-extrabold text-sm text-white tabular-nums">
                    {activeEmployee.defaultEntry1 || '07:00'} → {activeEmployee.defaultExit1 || '11:30'}
                  </p>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Turno Tarde</span>
                  </span>
                  <p className="font-mono font-extrabold text-sm text-white tabular-nums">
                    {activeEmployee.defaultEntry2 || '12:30'} → {activeEmployee.defaultExit2 || '17:30'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>
                  Tarifa vigente:{' '}
                  <strong className="text-slate-200 font-mono">
                    {formatCurrencyWithSymbol(activeEmployee.hourlyRate, currency.symbol, currency.code)}/h
                  </strong>
                </span>
                <span>
                  Cobro: <strong className="text-slate-200 capitalize">{activeEmployee.paymentFrequency || 'quincenal'}</strong>
                </span>
              </div>
            </section>

            {/* VENTANA 2: PAGOS E HISTORIAL + PLANILLA HORARIA MENSUAL */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Pagos y Planilla Mensual</h3>
                    <p className="text-[11px] text-slate-400">Horas acumuladas y cobros realizados</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Mes Actual ({formatMonthSpanish(currentMonthStr).split(' ')[0]})</span>
                  <span className="text-base font-mono font-black text-white tabular-nums block mt-0.5">
                    {currentMonthSummary.hours.toFixed(1)} hs
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-400 tabular-nums">
                    Est. {formatCurrencyWithSymbol(currentMonthSummary.estimatedNet || 0, currency.symbol, currency.code)}
                  </span>
                </div>

                <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Ya Cobrado</span>
                  <span className="text-base font-mono font-black text-emerald-400 tabular-nums block mt-0.5">
                    {formatCurrencyWithSymbol(totalAlreadyCollected, currency.symbol, currency.code)}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {paidPayments.length} {paidPayments.length === 1 ? 'pago registrado' : 'pagos registrados'}
                  </span>
                </div>
              </div>

              {paidPayments[0] && (
                <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-emerald-300 font-semibold block">Último pago cobrado:</span>
                    <span className="text-slate-200 font-bold truncate block">{paidPayments[0].label}</span>
                  </div>
                  <span className="font-mono font-black text-emerald-400 shrink-0 tabular-nums">
                    {formatCurrencyWithSymbol(paidPayments[0].net, currency.symbol, currency.code)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setMobileTab('timesheet')}
                  className="min-h-[44px] px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Planilla Mensual</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMobileTab('payments')}
                  className="min-h-[44px] px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <History className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Historial Cobros</span>
                </button>
              </div>
            </section>

            {/* VENTANA 3: VACACIONES */}
            <section className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                    <Umbrella className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Vacaciones</h3>
                    <p className="text-[11px] text-slate-400">Días anuales disponibles y solicitudes</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowVacationModal(true)}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Solicitar</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-mono font-black text-sky-400 tabular-nums">{availableVacationDays}</span>
                  <span className="block text-[10px] text-slate-400 font-semibold">Disponibles</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-mono font-black text-slate-200 tabular-nums">{usedVacationDays}</span>
                  <span className="block text-[10px] text-slate-400 font-semibold">Tomados</span>
                </div>
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-lg font-mono font-black text-slate-400 tabular-nums">{annualVacationDays}</span>
                  <span className="block text-[10px] text-slate-400 font-semibold">Total Anual</span>
                </div>
              </div>

              {employeeVacations.length > 0 ? (
                <div className="space-y-1.5 pt-1">
                  {employeeVacations.slice(0, 3).map(vac => (
                    <div
                      key={vac.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200">
                          {formatDateDisplay(vac.startDate)} → {formatDateDisplay(vac.endDate)}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {vac.daysCount} día(s){vac.notes ? ` · ${vac.notes}` : ''}
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                          vac.status === 'aprobada'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : vac.status === 'rechazada'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {vac.status === 'aprobada' ? 'Aprobada' : vac.status === 'rechazada' ? 'Rechazada' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-1">
                  No tienes solicitudes ni períodos de vacaciones registrados aún.
                </p>
              )}
            </section>
          </div>
        )}

        {/* ============================================================
            TAB 2: MARCAR LAS HORAS (CON FOTO FACIAL + GPS)
           ============================================================ */}
        {mobileTab === 'clock' && (
          <div className="space-y-4">
            {/* Digital Clock Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-5 text-center shadow-xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {formatDateFriendlySpanish(todayStr)}
              </p>

              <div className="text-4xl sm:text-5xl font-mono font-black text-white tracking-tight flex items-center justify-center gap-1 my-1 tabular-nums">
                <span>{String(currentTime.getHours()).padStart(2, '0')}</span>
                <span className="text-blue-500">:</span>
                <span>{String(currentTime.getMinutes()).padStart(2, '0')}</span>
                <span className="text-xs font-mono font-bold text-slate-400 self-end mb-1 sm:mb-2 ml-1">
                  :{String(currentTime.getSeconds()).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 mt-2 text-[11px] font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verificación con Foto Facial + Ubicación GPS</span>
              </div>
            </div>

            {/* Live GPS Location Indicator for Drivers / Field Staff */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between gap-2.5 text-xs">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  {gpsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Ubicación actual para tu marcación:
                  </span>
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {gpsLoading
                      ? 'Localizando GPS...'
                      : liveGps
                        ? liveGps.address || `${liveGps.lat.toFixed(5)}, ${liveGps.lng.toFixed(5)}`
                        : gpsError || 'Activa el GPS para registrar desde dónde marcas'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {liveGps && (
                  <button
                    type="button"
                    onClick={() =>
                      setMapModalData({
                        location: liveGps,
                        employeeName: activeEmployee.name,
                        punchLabel: 'Ubicación Actual',
                        timeStr: `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`,
                        dateStr: todayStr
                      })
                    }
                    className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-[11px] cursor-pointer"
                  >
                    Ver mapa
                  </button>
                )}
                <button
                  type="button"
                  onClick={refreshLiveGps}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-[11px] cursor-pointer"
                >
                  GPS
                </button>
              </div>
            </div>

            {/* Today's Shift Status Summary */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold border-b border-slate-800 pb-2">
                <span>Registros de Hoy:</span>
                <span className="text-blue-400 font-black tabular-nums">
                  {(todayRecord.totalHours || 0).toFixed(2)} h registradas
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Turno Mañana</span>
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 tabular-nums">
                    <span className={todayRecord.entry1 ? 'text-emerald-400' : 'text-slate-600'}>
                      {todayRecord.entry1 || '--:--'}
                    </span>
                    <span className="text-slate-600">→</span>
                    <span className={todayRecord.exit1 ? 'text-rose-400' : 'text-slate-600'}>
                      {todayRecord.exit1 || '--:--'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                    <Moon className="w-3 h-3 text-indigo-400" />
                    <span>Turno Tarde</span>
                  </span>
                  <div className="flex items-center justify-between font-mono font-bold text-slate-200 tabular-nums">
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

              {/* Quick Map Chips for today's recorded GPS punches */}
              {(getSlotLocation(todayRecord, 'entry1') ||
                getSlotLocation(todayRecord, 'exit1') ||
                getSlotLocation(todayRecord, 'entry2') ||
                getSlotLocation(todayRecord, 'exit2')) && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {(['entry1', 'exit1', 'entry2', 'exit2'] as const).map(slot => {
                    const loc = getSlotLocation(todayRecord, slot);
                    if (!loc) return null;
                    const labels = {
                      entry1: 'Entrada',
                      exit1: 'Sal. Mediodía',
                      entry2: 'Ent. Mediodía',
                      exit2: 'Salida'
                    };
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() =>
                          setMapModalData({
                            location: loc,
                            employeeName: activeEmployee.name,
                            punchLabel: labels[slot],
                            timeStr: todayRecord[slot] || '--:--',
                            dateStr: todayStr,
                            photoUrl: getSlotPhoto(todayRecord, slot)
                          })
                        }
                        className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-300 border border-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Mapa {labels[slot]}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Intermediate exits */}
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
                            ? 'bg-amber-950/80 border-amber-600 text-amber-300 font-bold'
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

            {/* PUNCH BUTTONS */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-extrabold text-slate-400 block text-center">
                Marcar Entrada y Salida:
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleStartPunch('entry1')}
                  className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer min-h-[84px] ${
                    todayRecord.entry1
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" />
                      <span>Entrada</span>
                    </span>
                    <Camera className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono tabular-nums">
                      {todayRecord.entry1 || 'Marcar'}
                    </span>
                    {todayRecord.entry1 && (
                      <span className="text-[10px] font-bold text-emerald-300">Registrado</span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartPunch('exit1')}
                  className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer min-h-[84px] ${
                    todayRecord.exit1
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                      : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" />
                      <span>Salida Mediodía</span>
                    </span>
                    <Camera className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono tabular-nums">
                      {todayRecord.exit1 || 'Marcar'}
                    </span>
                    {todayRecord.exit1 && (
                      <span className="text-[10px] font-bold text-rose-300">Registrado</span>
                    )}
                  </div>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleStartPunch('entry2')}
                  className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer min-h-[84px] ${
                    todayRecord.entry2
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" />
                      <span>Entrada Mediodía</span>
                    </span>
                    <Camera className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono tabular-nums">
                      {todayRecord.entry2 || 'Marcar'}
                    </span>
                    {todayRecord.entry2 && (
                      <span className="text-[10px] font-bold text-emerald-300">Registrado</span>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleStartPunch('exit2')}
                  className={`p-3.5 rounded-2xl border text-left transition-all shadow-md flex flex-col justify-between cursor-pointer min-h-[84px] ${
                    todayRecord.exit2
                      ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                      : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" />
                      <span>Salida</span>
                    </span>
                    <Camera className="w-4 h-4 opacity-80" />
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-lg font-black font-mono tabular-nums">
                      {todayRecord.exit2 || 'Marcar'}
                    </span>
                    {todayRecord.exit2 && (
                      <span className="text-[10px] font-bold text-rose-300">Registrado</span>
                    )}
                  </div>
                </button>
              </div>

              {/* Intermediate Exits */}
              <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Coffee className="w-4 h-4 text-amber-400" />
                    <span>Salida Intermedia</span>
                  </span>
                  {currentOpenExit && (
                    <span className="text-[10px] font-bold text-amber-300">
                      En curso desde {currentOpenExit.exitTime}
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
                    className="min-h-[44px] py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
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
                    className={`min-h-[44px] py-2.5 px-3 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
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
          </div>
        )}

        {/* ============================================================
            TAB 3: PLANILLA HORARIA MENSUAL DEL EMPLEADO
           ============================================================ */}
        {mobileTab === 'timesheet' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileTab('home')}
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Inicio</span>
              </button>
              <span className="text-xs font-extrabold text-blue-400">Planilla Mensual</span>
            </div>

            {/* Month Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedMonth(getPrevMonthStr(selectedMonth))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <h3 className="text-sm font-extrabold text-white capitalize">
                  {formatMonthSpanish(selectedMonth)}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {selectedMonthStats.daysWorked} días trabajados · {selectedMonthStats.hours.toFixed(2)} hs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonth(getNextMonthStr(selectedMonth))}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Totals Summary Strip */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block">Total Horas</span>
                <span className="text-base font-mono font-black text-white tabular-nums">
                  {selectedMonthStats.hours.toFixed(1)}h
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block">Días</span>
                <span className="text-base font-mono font-black text-blue-400 tabular-nums">
                  {selectedMonthStats.daysWorked}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block">Estimado</span>
                <span className="text-sm font-mono font-black text-emerald-400 tabular-nums">
                  {formatCurrencyWithSymbol(selectedMonthStats.net, currency.symbol, currency.code)}
                </span>
              </div>
            </div>

            {/* Day-by-day rows */}
            <div className="space-y-2">
              {selectedMonthDays.map(d => {
                const rec = empRecordsByDate[d];
                const sun = isSunday(d);
                const hrs = rec
                  ? (rec.totalHours ?? calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2, rec.intermediateExits, rec.intervals))
                  : 0;

                // Show all days up to today (or any future day with a record)
                if (d > todayStr && !rec) return null;

                const loc1 = rec ? getSlotLocation(rec, 'entry1') : undefined;
                const loc2 = rec ? getSlotLocation(rec, 'exit1') : undefined;
                const loc3 = rec ? getSlotLocation(rec, 'entry2') : undefined;
                const loc4 = rec ? getSlotLocation(rec, 'exit2') : undefined;
                const firstLoc = loc1 || loc2 || loc3 || loc4;

                return (
                  <div
                    key={d}
                    className={`rounded-2xl border p-3 text-xs space-y-2 ${
                      sun
                        ? 'bg-slate-900/40 border-slate-800/70'
                        : hrs > 0
                          ? 'bg-slate-900 border-slate-800'
                          : 'bg-slate-900/60 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`font-extrabold capitalize ${sun ? 'text-amber-400' : 'text-white'}`}>
                          {formatDateShortSpanish(d)}
                        </span>
                        {rec?.isAbsent && (
                          <span className="text-[10px] font-bold text-rose-400">Ausente</span>
                        )}
                      </div>
                      <span className={`font-mono font-black tabular-nums ${hrs > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {hrs.toFixed(2)} hs
                      </span>
                    </div>

                    {rec && (rec.entry1 || rec.exit1 || rec.entry2 || rec.exit2) && (
                      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300 tabular-nums">
                        <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500 font-sans">Mañana:</span>
                          <span>{rec.entry1 || '--:--'} → {rec.exit1 || '--:--'}</span>
                        </div>
                        <div className="bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between">
                          <span className="text-slate-500 font-sans">Tarde:</span>
                          <span>{rec.entry2 || '--:--'} → {rec.exit2 || '--:--'}</span>
                        </div>
                      </div>
                    )}

                    {(firstLoc || getSlotPhoto(rec || ({} as DailyTimeRecord), 'entry1')) && rec && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(['entry1', 'exit1', 'entry2', 'exit2'] as const).map(slot => {
                          const loc = getSlotLocation(rec, slot);
                          if (!loc) return null;
                          const labels = {
                            entry1: 'Entrada',
                            exit1: 'Sal. Med.',
                            entry2: 'Ent. Med.',
                            exit2: 'Salida'
                          };
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() =>
                                setMapModalData({
                                  location: loc,
                                  employeeName: activeEmployee.name,
                                  punchLabel: labels[slot],
                                  timeStr: rec[slot] || '--:--',
                                  dateStr: d,
                                  photoUrl: getSlotPhoto(rec, slot)
                                })
                              }
                              className="px-2 py-1 bg-slate-800 hover:bg-blue-600/30 text-blue-300 border border-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin className="w-3 h-3" />
                              <span>{labels[slot]}</span>
                            </button>
                          );
                        })}

                        {(['entry1', 'exit1', 'entry2', 'exit2'] as const).map(slot => {
                          const photo = getSlotPhoto(rec, slot);
                          if (!photo) return null;
                          const labels = {
                            entry1: 'Foto Ent.',
                            exit1: 'Foto Sal.1',
                            entry2: 'Foto Ent.2',
                            exit2: 'Foto Sal.'
                          };
                          return (
                            <button
                              key={`ph_${slot}`}
                              type="button"
                              onClick={() =>
                                setPhotoModalData({
                                  photoUrl: photo,
                                  employeeName: activeEmployee.name,
                                  punchLabel: labels[slot],
                                  timeStr: rec[slot] || '--:--',
                                  dateStr: d
                                })
                              }
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{labels[slot]}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: HISTORIAL DE PAGOS Y LO QUE YA COBRÓ
           ============================================================ */}
        {mobileTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setMobileTab('home')}
                className="min-h-[40px] px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver a Inicio</span>
              </button>
              <span className="text-xs font-extrabold text-emerald-400">Historial de Cobros</span>
            </div>

            {/* Overall Collected Banner */}
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-800/60 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] text-emerald-300 font-semibold">Total acumulado ya cobrado</span>
              <div className="text-2xl font-mono font-black text-emerald-400 tabular-nums">
                {formatCurrencyWithSymbol(totalAlreadyCollected, currency.symbol, currency.code)}
              </div>
              <p className="text-[11px] text-slate-400">
                {paidPayments.length} liquidación(es) pagada(s) · Mes actual acumulado:{' '}
                <strong className="text-white">
                  {formatCurrencyWithSymbol(currentMonthSummary.estimatedNet || 0, currency.symbol, currency.code)}
                </strong>
              </p>
            </div>

            {/* Payments List */}
            {paymentHistory.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-2">
                <DollarSign className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-bold text-slate-200">Sin liquidaciones cerradas aún</p>
                <p className="text-xs text-slate-400">
                  Cuando tu empleador marque como pagada una quincena o mes en Liquidación, aparecerá aquí con todo su detalle.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentHistory.map(item => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 space-y-2.5 text-xs ${
                      item.isPaid
                        ? 'bg-slate-900 border-emerald-800/60'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-white text-sm">{item.label}</h4>
                        <p className="text-[11px] text-slate-400">
                          {item.daysWorked} días · {item.periodHours.toFixed(2)} horas trabajadas
                        </p>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                          item.isPaid
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.isPaid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>

                    <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 space-y-1 text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Subtotal horas:</span>
                        <span className="font-mono font-bold tabular-nums">
                          {formatCurrencyWithSymbol(item.gross, currency.symbol, currency.code)}
                        </span>
                      </div>
                      {item.bonus > 0 && (
                        <div className="flex justify-between text-emerald-400">
                          <span>Bonificaciones:</span>
                          <span className="font-mono font-bold tabular-nums">
                            +{formatCurrencyWithSymbol(item.bonus, currency.symbol, currency.code)}
                          </span>
                        </div>
                      )}
                      {item.advance > 0 && (
                        <div className="flex justify-between text-rose-400">
                          <span>Adelantos:</span>
                          <span className="font-mono font-bold tabular-nums">
                            -{formatCurrencyWithSymbol(item.advance, currency.symbol, currency.code)}
                          </span>
                        </div>
                      )}
                      {item.productDeductions > 0 && (
                        <div className="flex justify-between text-amber-400">
                          <span>Retiro de productos:</span>
                          <span className="font-mono font-bold tabular-nums">
                            -{formatCurrencyWithSymbol(item.productDeductions, currency.symbol, currency.code)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-white font-extrabold pt-1.5 border-t border-slate-800 text-xs">
                        <span>{item.isPaid ? 'Total Cobrado:' : 'Total a Cobrar:'}</span>
                        <span className="font-mono text-emerald-400 tabular-nums">
                          {formatCurrencyWithSymbol(item.net, currency.symbol, currency.code)}
                        </span>
                      </div>
                    </div>

                    {(item.paidAt || item.notes) && (
                      <div className="text-[11px] text-slate-400 flex flex-wrap justify-between gap-2">
                        {item.paidAt && (
                          <span>Cobrado el {new Date(item.paidAt).toLocaleDateString('es-PY')}</span>
                        )}
                        {item.notes && <span className="italic">{item.notes}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================
          FIXED BOTTOM NAVIGATION BAR: INICIO & MARCAR LAS HORAS
         ============================================================ */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
        <div className="max-w-lg mx-auto grid grid-cols-2 h-16">
          <button
            type="button"
            onClick={() => setMobileTab('home')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer min-h-[48px] ${
              mobileTab === 'home' || mobileTab === 'timesheet' || mobileTab === 'payments'
                ? 'text-blue-400 bg-blue-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-bold whitespace-nowrap">Inicio</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileTab('clock')}
            className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer min-h-[48px] border-l border-slate-800 ${
              mobileTab === 'clock'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-5 h-5" />
            <span className="text-xs font-bold whitespace-nowrap">Marcar las horas</span>
          </button>
        </div>
      </nav>

      {/* VACATION REQUEST MODAL */}
      {showVacationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h4 className="text-sm font-extrabold text-white">Solicitar Vacaciones</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowVacationModal(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVacationRequest} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Fecha desde:</label>
                <input
                  type="date"
                  value={vacStartDate}
                  onChange={(e) => setVacStartDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Fecha hasta:</label>
                <input
                  type="date"
                  value={vacEndDate}
                  min={vacStartDate}
                  onChange={(e) => setVacEndDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Motivo / Observación (opcional):</label>
                <input
                  type="text"
                  value={vacNotes}
                  onChange={(e) => setVacNotes(e.target.value)}
                  placeholder="Ej. Vacaciones anuales"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-white"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowVacationModal(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vacSaving}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl cursor-pointer"
                >
                  {vacSaving ? 'Enviando...' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FACE CAMERA MODAL (CON GPS) */}
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

      {/* GPS MAP MODAL */}
      {mapModalData && (
        <PunchLocationModal
          location={mapModalData.location}
          employeeName={mapModalData.employeeName}
          punchLabel={mapModalData.punchLabel}
          timeStr={mapModalData.timeStr}
          dateStr={mapModalData.dateStr}
          photoUrl={mapModalData.photoUrl}
          onClose={() => setMapModalData(null)}
        />
      )}

      {/* PHOTO MODAL */}
      {photoModalData && (
        <PunchPhotoModal
          photoUrl={photoModalData.photoUrl}
          employeeName={photoModalData.employeeName}
          punchLabel={photoModalData.punchLabel}
          timeStr={photoModalData.timeStr}
          dateStr={photoModalData.dateStr}
          onClose={() => setPhotoModalData(null)}
        />
      )}
    </div>
  );
};
