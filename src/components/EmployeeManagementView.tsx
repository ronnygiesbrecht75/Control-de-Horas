import React, { useState } from 'react';
import { Employee, CurrencyConfig, PaymentFrequency, HourlyRateEntry } from '../types';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  Clock, 
  DollarSign, 
  Phone, 
  Calendar,
  Layers,
  Filter,
  UserX,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  Plus,
  ArrowUpRight,
  Smartphone,
  KeyRound,
  QrCode
} from 'lucide-react';
import { 
  formatCurrencyWithSymbol, 
  formatDateDisplay, 
  calculateTenure, 
  getTodayDateStr,
  getEmployeeRateForDate
} from '../utils/timeUtils';
import { EmployeeLicenseModal } from './EmployeeLicenseModal';
import { generateLicenseKey } from '../data/mockData';

interface EmployeeManagementViewProps {
  employees: Employee[];
  currency: CurrencyConfig;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onGoToExEmployees?: () => void;
  onOpenMobilePortal?: (licenseKey: string) => void;
}

const COLORS = [
  'bg-blue-600',
  'bg-sky-500',
  'bg-cyan-600',
  'bg-teal-600',
  'bg-emerald-600',
  'bg-green-600',
  'bg-lime-600',
  'bg-yellow-500',
  'bg-amber-500',
  'bg-orange-500',
  'bg-orange-700',
  'bg-red-500',
  'bg-red-600',
  'bg-rose-500',
  'bg-rose-600',
  'bg-pink-500',
  'bg-pink-600',
  'bg-fuchsia-600',
  'bg-purple-600',
  'bg-violet-600',
  'bg-indigo-600',
  'bg-blue-700',
  'bg-teal-700',
  'bg-emerald-800',
  'bg-amber-700',
  'bg-slate-600',
  'bg-slate-700',
  'bg-slate-800',
  'bg-zinc-700',
  'bg-zinc-800',
  'bg-stone-600',
  'bg-stone-800'
];

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  employees,
  currency,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
  onGoToExEmployees,
  onOpenMobilePortal
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [filterFrequency, setFilterFrequency] = useState<'all' | 'quincenal' | 'mensual'>('all');
  const [toastMessage, setToastMessage] = useState<string>('');

  // License modal state
  const [selectedLicenseEmp, setSelectedLicenseEmp] = useState<Employee | null>(null);

  // Deactivation confirmation modal state
  const [deactivatingEmp, setDeactivatingEmp] = useState<Employee | null>(null);
  const [deactivateEndDate, setDeactivateEndDate] = useState<string>('');
  const [deactivateReason, setDeactivateReason] = useState<string>('');

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(18000);
  const [formRateHistory, setFormRateHistory] = useState<HourlyRateEntry[]>([]);
  const [rateEffectiveDate, setRateEffectiveDate] = useState<string>('');
  const [rateChangeReason, setRateChangeReason] = useState<string>('');
  const [monthlyBaseSalary, setMonthlyBaseSalary] = useState<number | undefined>(undefined);
  const [paymentFrequency, setPaymentFrequency] = useState<PaymentFrequency>('quincenal');
  const [defaultEntry1, setDefaultEntry1] = useState('07:00');
  const [defaultExit1, setDefaultExit1] = useState('11:30');
  const [defaultEntry2, setDefaultEntry2] = useState('12:30');
  const [defaultExit2, setDefaultExit2] = useState('17:30');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [isActiveStatus, setIsActiveStatus] = useState(true);
  const [formLicenseKey, setFormLicenseKey] = useState('');

  // Standalone Rate History Modal State
  const [selectedRateEmp, setSelectedRateEmp] = useState<Employee | null>(null);
  const [modalNewRate, setModalNewRate] = useState<number>(18000);
  const [modalEffectiveDate, setModalEffectiveDate] = useState<string>(getTodayDateStr());
  const [modalRateNotes, setModalRateNotes] = useState<string>('Aumento salarial');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const openAddModal = () => {
    setEditingEmp(null);
    setName('');
    setRole('Operario');
    const initRate = 18000;
    const initStart = getTodayDateStr();
    setHourlyRate(initRate);
    setRateEffectiveDate(initStart);
    setRateChangeReason('Tarifa inicial');
    setFormRateHistory([
      { effectiveDate: initStart, rate: initRate, notes: 'Tarifa inicial' }
    ]);
    setMonthlyBaseSalary(undefined);
    setPaymentFrequency('quincenal');
    setDefaultEntry1('07:00');
    setDefaultExit1('11:30');
    setDefaultEntry2('12:30');
    setDefaultExit2('17:30');
    setPhone('');
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setStartDate(initStart);
    setEndDate('');
    setExitReason('');
    setIsActiveStatus(true);
    setFormLicenseKey(generateLicenseKey(''));
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setRole(emp.role);
    setHourlyRate(emp.hourlyRate || 0);
    const history = emp.rateHistory && emp.rateHistory.length > 0 
      ? [...emp.rateHistory]
      : [
          {
            effectiveDate: emp.startDate || '2024-01-01',
            rate: emp.hourlyRate || 0,
            notes: 'Tarifa inicial'
          }
        ];
    setFormRateHistory(history);
    setRateEffectiveDate(getTodayDateStr());
    setRateChangeReason('');
    setMonthlyBaseSalary(emp.monthlyBaseSalary);
    setPaymentFrequency(emp.paymentFrequency || 'mensual');
    setDefaultEntry1(emp.defaultEntry1 || '07:00');
    setDefaultExit1(emp.defaultExit1 || '11:30');
    setDefaultEntry2(emp.defaultEntry2 || '12:30');
    setDefaultExit2(emp.defaultExit2 || '17:30');
    setPhone(emp.phone || '');
    setColor(emp.color || COLORS[0]);
    setStartDate(emp.startDate || '');
    setEndDate(emp.endDate || '');
    setExitReason(emp.exitReason || '');
    setIsActiveStatus(emp.active);
    setFormLicenseKey(emp.licenseKey || generateLicenseKey(emp.name));
    setShowModal(true);
  };

  const openRateHistoryModal = (emp: Employee) => {
    setSelectedRateEmp(emp);
    setModalNewRate(emp.hourlyRate ? emp.hourlyRate + 1000 : 18000);
    setModalEffectiveDate(getTodayDateStr());
    setModalRateNotes('Aumento salarial');
  };

  const handleAddRateToHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRateEmp || modalNewRate <= 0 || !modalEffectiveDate) return;

    const currentHistory = selectedRateEmp.rateHistory && selectedRateEmp.rateHistory.length > 0
      ? [...selectedRateEmp.rateHistory]
      : [
          {
            effectiveDate: selectedRateEmp.startDate || '2024-01-01',
            rate: selectedRateEmp.hourlyRate || modalNewRate,
            notes: 'Tarifa inicial'
          }
        ];

    // Check if entry on this exact date already exists
    const idx = currentHistory.findIndex(h => h.effectiveDate === modalEffectiveDate);
    if (idx >= 0) {
      currentHistory[idx] = {
        ...currentHistory[idx],
        rate: modalNewRate,
        notes: modalRateNotes.trim() || currentHistory[idx].notes || 'Tarifa actualizada'
      };
    } else {
      currentHistory.push({
        effectiveDate: modalEffectiveDate,
        rate: modalNewRate,
        notes: modalRateNotes.trim() || 'Aumento salarial'
      });
    }

    currentHistory.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    // Calculate current rate as of today
    const currentRateToday = getEmployeeRateForDate(
      { ...selectedRateEmp, rateHistory: currentHistory },
      getTodayDateStr()
    );

    const updatedEmployee: Employee = {
      ...selectedRateEmp,
      hourlyRate: currentRateToday,
      rateHistory: currentHistory
    };

    onUpdateEmployee(updatedEmployee);
    setSelectedRateEmp(updatedEmployee);
    showToast(`Aumento guardado: ₲ ${modalNewRate.toLocaleString('es-PY')}/h vigente desde el ${formatDateDisplay(modalEffectiveDate)}.`);
  };

  const handleDeleteRateFromHistory = (indexToDelete: number) => {
    if (!selectedRateEmp || !selectedRateEmp.rateHistory) return;
    if (selectedRateEmp.rateHistory.length <= 1) {
      alert('Debe existir al menos una tarifa registrada para el empleado.');
      return;
    }
    const updatedHistory = selectedRateEmp.rateHistory.filter((_, idx) => idx !== indexToDelete);
    updatedHistory.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    const currentRateToday = getEmployeeRateForDate(
      { ...selectedRateEmp, rateHistory: updatedHistory },
      getTodayDateStr()
    );

    const updatedEmployee: Employee = {
      ...selectedRateEmp,
      hourlyRate: currentRateToday,
      rateHistory: updatedHistory
    };

    onUpdateEmployee(updatedEmployee);
    setSelectedRateEmp(updatedEmployee);
    showToast('Tarifa eliminada del historial.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const parsedRate = Number(hourlyRate) || 0;
    const history = [...formRateHistory];

    // If editing or adding, ensure the entered hourlyRate is in history with its effective date
    if (rateEffectiveDate && parsedRate > 0) {
      const matchIdx = history.findIndex(h => h.effectiveDate === rateEffectiveDate);
      if (matchIdx >= 0) {
        history[matchIdx] = {
          ...history[matchIdx],
          rate: parsedRate,
          notes: rateChangeReason.trim() || history[matchIdx].notes || 'Tarifa actualizada'
        };
      } else {
        history.push({
          effectiveDate: rateEffectiveDate,
          rate: parsedRate,
          notes: rateChangeReason.trim() || 'Tarifa / Aumento'
        });
      }
    } else if (history.length === 0 && parsedRate > 0) {
      history.push({
        effectiveDate: startDate || getTodayDateStr(),
        rate: parsedRate,
        notes: 'Tarifa inicial'
      });
    }

    history.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    // Calculate current rate as of today
    const currentRateToday = getEmployeeRateForDate(
      { hourlyRate: parsedRate, rateHistory: history } as Employee,
      getTodayDateStr()
    );

    const finalLicense = formLicenseKey.trim().toUpperCase() || generateLicenseKey(name.trim());

    if (editingEmp) {
      onUpdateEmployee({
        ...editingEmp,
        name: name.trim(),
        role: role.trim() || 'Empleado',
        hourlyRate: currentRateToday,
        rateHistory: history,
        monthlyBaseSalary: monthlyBaseSalary && monthlyBaseSalary > 0 ? Number(monthlyBaseSalary) : undefined,
        paymentFrequency,
        defaultEntry1,
        defaultExit1,
        defaultEntry2,
        defaultExit2,
        phone: phone.trim(),
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        exitReason: exitReason.trim() || undefined,
        active: isActiveStatus,
        licenseKey: finalLicense,
        licenseActive: editingEmp.licenseActive !== false,
        deviceLinked: editingEmp.deviceLinked,
        deviceLinkedAt: editingEmp.deviceLinkedAt
      });
      showToast(`Empleado ${name.trim()} actualizado correctamente.`);
    } else {
      onAddEmployee({
        name: name.trim(),
        role: role.trim() || 'Empleado',
        hourlyRate: currentRateToday,
        rateHistory: history,
        monthlyBaseSalary: monthlyBaseSalary && monthlyBaseSalary > 0 ? Number(monthlyBaseSalary) : undefined,
        paymentFrequency,
        defaultEntry1,
        defaultExit1,
        defaultEntry2,
        defaultExit2,
        phone: phone.trim(),
        active: isActiveStatus,
        color,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        exitReason: exitReason.trim() || undefined,
        licenseKey: finalLicense,
        licenseActive: true,
        deviceLinked: false
      });
      showToast(`Empleado ${name.trim()} agregado con éxito.`);
    }
    setShowModal(false);
  };

  // Open modal to deactivate employee and move to Ex Empleados
  const openDeactivateModal = (emp: Employee) => {
    setDeactivatingEmp(emp);
    setDeactivateEndDate(emp.endDate || getTodayDateStr());
    setDeactivateReason(emp.exitReason || '');
  };

  const handleConfirmDeactivate = () => {
    if (!deactivatingEmp) return;
    onUpdateEmployee({
      ...deactivatingEmp,
      active: false,
      endDate: deactivateEndDate || getTodayDateStr(),
      exitReason: deactivateReason.trim() || undefined
    });
    showToast(`${deactivatingEmp.name} fue trasladado a la pestaña Ex Empleados.`);
    setDeactivatingEmp(null);
  };

  const toggleActive = (emp: Employee) => {
    if (emp.active) {
      openDeactivateModal(emp);
    } else {
      onUpdateEmployee({ ...emp, active: true });
      showToast(`${emp.name} fue reactivado en el equipo.`);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName === 'INPUT') {
      const formEl = e.currentTarget;
      const allElements = Array.from(formEl.querySelectorAll('input, button[type="submit"]'));
      const inputs = allElements.filter((el): el is HTMLElement => 
        el instanceof HTMLElement && !el.hasAttribute('disabled')
      );
      const index = inputs.indexOf(e.target);
      if (index >= 0 && index < inputs.length - 1) {
        e.preventDefault();
        const next = inputs[index + 1];
        next.focus();
        if (next instanceof HTMLInputElement && next.type !== 'time') {
          next.select();
        }
      }
    }
  };

  const activeEmployees = employees.filter(e => e.active);
  const exEmployeesCount = employees.filter(e => !e.active).length;

  const filteredEmployees = employees.filter(emp => {
    // Show active employees by default in this view
    if (!emp.active) return false;
    if (filterFrequency === 'all') return true;
    const freq = emp.paymentFrequency || 'mensual';
    return freq === filterFrequency;
  });

  const quincenalesCount = activeEmployees.filter(e => e.paymentFrequency === 'quincenal').length;
  const mensualesCount = activeEmployees.filter(e => (e.paymentFrequency || 'mensual') === 'mensual').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action bar - Fixed sticky header */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Gestión de Empleados ({activeEmployees.length} activos)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarifas por hora, fechas de inicio y salida, horarios y modalidad de liquidación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Frequency filter tabs */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setFilterFrequency('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterFrequency === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({activeEmployees.length})
            </button>
            <button
              onClick={() => setFilterFrequency('quincenal')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterFrequency === 'quincenal'
                  ? 'bg-purple-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-purple-700'
              }`}
            >
              Quincenal 15d ({quincenalesCount})
            </button>
            <button
              onClick={() => setFilterFrequency('mensual')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filterFrequency === 'mensual'
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Mensual 30d ({mensualesCount})
            </button>
          </div>

          {/* Jump to Ex Empleados */}
          {onGoToExEmployees && (
            <button
              onClick={onGoToExEmployees}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer border border-slate-200"
              title="Ver archivo de empleados anteriores y sus planillas"
            >
              <UserX className="w-3.5 h-3.5 text-slate-600" />
              <span>Ex Empleados ({exEmployeesCount})</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Empleado</span>
          </button>
        </div>
      </div>

      {/* Employees grid */}
      {filteredEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {activeEmployees.length === 0 ? 'No hay empleados activos' : 'No hay empleados con este filtro'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {activeEmployees.length === 0
              ? 'Agregue un nuevo empleado con su fecha de comienzo, cargo y tarifa por hora.'
              : 'Cambie el filtro para ver todos los empleados registrados.'}
          </p>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Primer Empleado</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const isQuincenal = emp.paymentFrequency === 'quincenal';
            const tenure = calculateTenure(emp.startDate, emp.endDate);

            return (
              <div
                key={emp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 p-5 flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-xl ${emp.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                        {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-snug">
                          {emp.name}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500">
                          {emp.role}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Activo
                    </span>
                  </div>

                  {/* Payment frequency badge */}
                  <div className="mt-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                      isQuincenal 
                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{isQuincenal ? 'Pago Quincenal (15 días)' : 'Pago Mensual (30 días)'}</span>
                    </span>
                  </div>

                  {/* Employment dates box */}
                  {emp.startDate && (
                    <div className="mt-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Inicio:</span>
                        </span>
                        <span className="font-semibold text-slate-800">
                          {formatDateDisplay(emp.startDate)}
                        </span>
                      </div>
                      {tenure && (
                        <div className="flex items-center justify-between text-slate-600 pt-0.5 border-t border-slate-200/50">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Antigüedad:</span>
                          </span>
                          <span className="font-semibold text-blue-700 text-[11px]">
                            {tenure}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rate and schedule box */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                        <span>Tarifa actual:</span>
                      </span>
                      <span className="font-extrabold text-orange-700">
                        {formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / h
                      </span>
                    </div>

                    {/* Botón de Historial de Tarifas / Aumento */}
                    <button
                      type="button"
                      onClick={() => openRateHistoryModal(emp)}
                      className="w-full py-1.5 px-2.5 bg-amber-50 hover:bg-amber-100/90 text-amber-900 border border-amber-200/80 rounded-xl flex items-center justify-between text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                      title="Ver historial de salarios o registrar un nuevo aumento con fecha de vigencia"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Historial / Aumentos</span>
                        {emp.rateHistory && emp.rateHistory.length > 1 && (
                          <span className="bg-amber-200/90 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                            {emp.rateHistory.length} tarifas
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-amber-700 font-semibold underline shrink-0 ml-1">
                        Ver / Aumentar ➔
                      </span>
                    </button>

                    {emp.monthlyBaseSalary && emp.monthlyBaseSalary > 0 && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          <span>Sueldo base ref.:</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {formatCurrencyWithSymbol(emp.monthlyBaseSalary, currency.symbol, currency.code)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Turno habitual:</span>
                      </span>
                      <span className="font-semibold text-slate-700 text-[11px]">
                        {emp.defaultEntry1 || '07:00'}-{emp.defaultExit1 || '11:30'} · {emp.defaultEntry2 || '12:30'}-{emp.defaultExit2 || '17:30'}
                      </span>
                    </div>

                    {emp.phone && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Teléfono:</span>
                        </span>
                        <span className="font-semibold text-slate-700">
                          {emp.phone}
                        </span>
                      </div>
                    )}

                    {/* Clave de Licencia & Acceso Celular */}
                    <div className="p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <Smartphone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 block leading-none font-semibold">Licencia App Celular:</span>
                          <span className="font-mono font-black text-blue-900 text-xs">
                            {emp.licenseKey || 'Sin clave'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedLicenseEmp(emp)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Ver Clave de Licencia, QR y enlace para el celular del empleado"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Clave / QR</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenMobilePortal(emp.licenseKey || '')}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-900 text-slate-200 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                          title="Probar directamente el marcador móvil de este empleado en esta PC"
                        >
                          <Smartphone className="w-3 h-3 text-emerald-400" />
                          <span>Probar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => toggleActive(emp)}
                    className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-800 transition-colors cursor-pointer"
                    title="Desactivar y mover a la pestaña de Ex Empleados"
                  >
                    Desactivar
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(emp)}
                      title="Editar empleado"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`¿Está seguro de eliminar permanentemente a ${emp.name}?`)) {
                          onDeleteEmployee(emp.id);
                          showToast(`Empleado ${emp.name} eliminado.`);
                        }
                      }}
                      title="Eliminar empleado"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Agregar / Editar Empleado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>{editingEmp ? 'Editar Empleado' : 'Nuevo Empleado'}</span>
            </h3>

            <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Carlos Gómez"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Puesto / Cargo
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Ej. Operario de Taller"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Precio por hora ({currency.symbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={hourlyRate || ''}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fecha de Vigencia de la Tarifa */}
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>¿A partir de qué fecha rige este precio por hora?</span>
                  </span>
                  <span className="text-[10px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full">
                    Historial de tarifas
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fecha de vigencia (desde qué día):
                    </label>
                    <input
                      type="date"
                      value={rateEffectiveDate}
                      onChange={(e) => setRateEffectiveDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Motivo o nota (opcional):
                    </label>
                    <input
                      type="text"
                      value={rateChangeReason}
                      onChange={(e) => setRateChangeReason(e.target.value)}
                      placeholder="Ej. Aumento de octubre, ajuste..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-amber-900 leading-snug">
                  📌 Los días y meses anteriores a esta fecha conservarán su tarifa anterior intacta (por ejemplo, ₲ 15.000 en septiembre y ₲ 18.000 desde octubre).
                </p>
                {formRateHistory.length > 1 && (
                  <div className="pt-2 border-t border-amber-200/60 text-[11px] text-slate-600">
                    <span className="font-bold text-slate-700 block mb-1">Tarifas ya registradas anteriormente:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {formRateHistory.map((h, i) => (
                        <span key={i} className="bg-white border border-amber-300 px-2 py-0.5 rounded-md font-medium text-slate-800">
                          {formatDateDisplay(h.effectiveDate)}: <strong>{formatCurrencyWithSymbol(h.rate, currency.symbol, currency.code)}</strong> {h.notes ? `(${h.notes})` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Frecuencia de Pago Selector (Quincenal vs Mensual) */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  🗓️ Modalidad de Pago habitual:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentFrequency('quincenal')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentFrequency === 'quincenal'
                        ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Quincenal (15 días)</span>
                    <span className={`text-[10px] font-normal ${paymentFrequency === 'quincenal' ? 'text-purple-100' : 'text-slate-500'}`}>
                      Se cobra cada 15 días
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentFrequency('mensual')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      paymentFrequency === 'mensual'
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>Mensual (30 días)</span>
                    <span className={`text-[10px] font-normal ${paymentFrequency === 'mensual' ? 'text-blue-100' : 'text-slate-500'}`}>
                      Se cobra a fin de mes
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  En la pestaña de liquidación podrás cambiar y liquidar tanto quincenas de 15 días como meses completos de 30 días para cualquier empleado.
                </p>
              </div>

              {/* Optional Fixed Monthly Base Salary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sueldo Mensual Base Fijo (Opcional)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={monthlyBaseSalary ?? ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setMonthlyBaseSalary(isNaN(v) ? undefined : v);
                  }}
                  placeholder="Opcional. Si se define, la quincena se calculará proporcional a las horas trabajadas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Si se deja vacío, el pago se calcula directamente con la tarifa por hora ingresada.
                </span>
              </div>

              {/* Default shift times */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="block text-xs font-bold text-slate-800 mb-2">
                  ⏰ Turno Estándar Habitual (2 Entradas y 2 Salidas)
                </span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">1ra Entrada (Mañana)</label>
                    <input
                      type="time"
                      value={defaultEntry1}
                      onChange={(e) => setDefaultEntry1(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">1ra Salida (Mañana)</label>
                    <input
                      type="time"
                      value={defaultExit1}
                      onChange={(e) => setDefaultExit1(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">2da Entrada (Tarde)</label>
                    <input
                      type="time"
                      value={defaultEntry2}
                      onChange={(e) => setDefaultEntry2(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">2da Salida (Tarde)</label>
                    <input
                      type="time"
                      value={defaultExit2}
                      onChange={(e) => setDefaultExit2(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Teléfono (Opcional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +595 981 123 456"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Fechas de Comienzo y Salida */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  <span>Fechas de Empleo en la Empresa:</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fecha de Comienzo / Ingreso *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Día en que inició a trabajar
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Fecha de Salida (Opcional)
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Si se retiró de la empresa
                    </span>
                  </div>
                </div>

                {endDate && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Motivo de Salida (Opcional)
                    </label>
                    <input
                      type="text"
                      value={exitReason}
                      onChange={(e) => setExitReason(e.target.value)}
                      placeholder="Ej. Renuncia, fin de contrato, mutuo acuerdo"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Color selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Color de etiqueta ({COLORS.length} colores disponibles)
                </label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      title={`Seleccionar color ${c}`}
                      className={`w-7 h-7 rounded-full ${c} flex items-center justify-center transition-all cursor-pointer ${
                        color === c
                          ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      {color === c && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clave de Licencia Móvil */}
              <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Clave de Licencia (App Celular):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormLicenseKey(generateLicenseKey(name))}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white border border-blue-300 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                  >
                    🎲 Generar
                  </button>
                </div>
                <input
                  type="text"
                  value={formLicenseKey}
                  onChange={(e) => setFormLicenseKey(e.target.value.toUpperCase())}
                  placeholder="Ej. LIC-8492-JUAN"
                  className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-mono font-bold text-sm text-blue-900 uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 leading-tight">
                  El empleado usará esta clave para abrir la App en su celular por primera vez.
                </p>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {editingEmp ? 'Guardar Cambios' : 'Agregar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Desactivar Empleado y Mover a Ex Empleados */}
      {deactivatingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <UserX className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Mover a Ex Empleados
                </h3>
              </div>
              <button
                onClick={() => setDeactivatingEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <p className="text-slate-600">
                Al desactivar a <strong>{deactivatingEmp.name}</strong>, dejará de aparecer en la carga diaria y pasará a la pestaña de <strong>Ex Empleados</strong>.
              </p>
              <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-xl text-blue-900 text-[11px]">
                ℹ️ <strong>Importante:</strong> Todas sus planillas mensuales, horas registradas y liquidaciones anteriores se guardan intactas y podrán consultarse en la pestaña <strong>Ex Empleados</strong> en cualquier momento.
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de Salida de la Empresa *
                </label>
                <input
                  type="date"
                  value={deactivateEndDate}
                  onChange={(e) => setDeactivateEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo de Salida (Opcional)
                </label>
                <input
                  type="text"
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Ej. Renuncia voluntaria, fin de contrato, jubilación..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeactivatingEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeactivate}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirmar y Mover a Ex Empleados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Historial de Tarifas y Aumentos Salariales */}
      {selectedRateEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-sm"
                  style={{ backgroundColor: selectedRateEmp.color }}
                >
                  {selectedRateEmp.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      {selectedRateEmp.name}
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      {selectedRateEmp.role}
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-0.5">
                    <History className="w-3.5 h-3.5" />
                    Historial de Tarifas con Fechas de Vigencia
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRateEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Explicación amigable */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 text-xs text-emerald-950 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Cálculo Histórico Retroactivo Protegido</span>
                </div>
                <p className="text-[11px] leading-relaxed text-emerald-800">
                  Los aumentos o cambios de tarifa se aplican <strong>únicamente a partir del día fijado</strong>. Todos los días o meses anteriores (como septiembre en tu ejemplo) conservan su tarifa original y no se modifican ni se recalculan con el nuevo precio.
                </p>
              </div>

              {/* Lista de Tarifas Históricas */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Cronología de Tarifas Registradas
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Tarifa actual: <strong className="text-blue-700">{formatCurrencyWithSymbol(getEmployeeRateForDate(selectedRateEmp, getTodayDateStr()))}/h</strong>
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/40">
                  {(() => {
                    const history = selectedRateEmp.rateHistory && selectedRateEmp.rateHistory.length > 0
                      ? [...selectedRateEmp.rateHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
                      : [{ effectiveDate: selectedRateEmp.startDate || '2024-01-01', rate: selectedRateEmp.hourlyRate || 0, notes: 'Tarifa inicial' }];
                    
                    const todayStr = getTodayDateStr();
                    // Find active entry index for today (last entry with effectiveDate <= today)
                    let activeIndex = -1;
                    for (let i = history.length - 1; i >= 0; i--) {
                      if (history[i].effectiveDate <= todayStr) {
                        activeIndex = i;
                        break;
                      }
                    }
                    if (activeIndex === -1 && history.length > 0) activeIndex = 0;

                    return history.map((entry, idx) => {
                      const isActiveToday = idx === activeIndex;
                      const isFuture = entry.effectiveDate > todayStr;

                      return (
                        <div
                          key={`${entry.effectiveDate}-${idx}`}
                          className={`p-3 flex items-center justify-between text-xs transition-colors ${
                            isActiveToday ? 'bg-blue-50/70 font-medium' : 'hover:bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                              isActiveToday 
                                ? 'bg-blue-600 text-white' 
                                : isFuture 
                                  ? 'bg-amber-100 text-amber-700' 
                                  : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {formatCurrencyWithSymbol(entry.rate)} / hora
                                </span>
                                {isActiveToday && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                                    Vigente Hoy
                                  </span>
                                )}
                                {isFuture && (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                                    Programado a futuro
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span className="flex items-center gap-1 font-semibold text-slate-700">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  Vigente desde: {formatDateDisplay(entry.effectiveDate)}
                                </span>
                                {entry.notes && (
                                  <span className="text-slate-500">
                                    • {entry.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {history.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la tarifa de ${formatCurrencyWithSymbol(entry.rate)} vigente desde ${formatDateDisplay(entry.effectiveDate)}?`)) {
                                    handleDeleteRateFromHistory(idx);
                                  }
                                }}
                                title="Eliminar registro de tarifa"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Formulario para registrar nuevo aumento */}
              <form onSubmit={handleAddRateToHistory} className="border border-blue-200 rounded-xl p-4 bg-gradient-to-br from-blue-50/40 to-slate-50/60 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                    <ArrowUpRight className="w-4 h-4 text-blue-600" />
                    <span>Registrar Nuevo Aumento o Modificación de Tarifa</span>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-md">
                    Nuevo precio
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Fecha desde la cual sube *
                    </label>
                    <input
                      type="date"
                      required
                      value={modalEffectiveDate}
                      onChange={(e) => setModalEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Antes de esta fecha se mantendrá el salario anterior
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nueva Tarifa por Hora (₲) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">₲</span>
                      <input
                        type="number"
                        required
                        min="0"
                        step="any"
                        value={modalNewRate || ''}
                        onChange={(e) => setModalNewRate(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Ej. 25000"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Tarifa horaria aplicable
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Motivo o Detalle (Opcional)
                  </label>
                  <input
                    type="text"
                    value={modalRateNotes}
                    onChange={(e) => setModalRateNotes(e.target.value)}
                    placeholder="Ej. Aumento de octubre, ajuste por desempeño, cambio de categoría..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Guardar y Aplicar desde Fecha
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => setSelectedRateEmp(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CLAVE DE LICENCIA Y ACCESO CELULAR */}
      {selectedLicenseEmp && (
        <EmployeeLicenseModal
          employee={selectedLicenseEmp}
          onUpdateEmployee={(updated) => {
            onUpdateEmployee(updated);
            setSelectedLicenseEmp(updated);
          }}
          onClose={() => setSelectedLicenseEmp(null)}
          onOpenMobilePortal={(key) => {
            setSelectedLicenseEmp(null);
            if (onOpenMobilePortal) {
              onOpenMobilePortal(key);
            }
          }}
        />
      )}
    </div>
  );
};
