import React, { useState } from 'react';
import { Employee, CurrencyConfig, PaymentFrequency } from '../types';
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
  AlertCircle
} from 'lucide-react';
import { 
  formatCurrencyWithSymbol, 
  formatDateDisplay, 
  calculateTenure, 
  getTodayDateStr 
} from '../utils/timeUtils';

interface EmployeeManagementViewProps {
  employees: Employee[];
  currency: CurrencyConfig;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onGoToExEmployees?: () => void;
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
  onGoToExEmployees
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [filterFrequency, setFilterFrequency] = useState<'all' | 'quincenal' | 'mensual'>('all');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Deactivation confirmation modal state
  const [deactivatingEmp, setDeactivatingEmp] = useState<Employee | null>(null);
  const [deactivateEndDate, setDeactivateEndDate] = useState<string>('');
  const [deactivateReason, setDeactivateReason] = useState<string>('');

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(18000);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const openAddModal = () => {
    setEditingEmp(null);
    setName('');
    setRole('Operario');
    setHourlyRate(18000);
    setMonthlyBaseSalary(undefined);
    setPaymentFrequency('quincenal');
    setDefaultEntry1('07:00');
    setDefaultExit1('11:30');
    setDefaultEntry2('12:30');
    setDefaultExit2('17:30');
    setPhone('');
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setStartDate(getTodayDateStr());
    setEndDate('');
    setExitReason('');
    setIsActiveStatus(true);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setRole(emp.role);
    setHourlyRate(emp.hourlyRate || 0);
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
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingEmp) {
      onUpdateEmployee({
        ...editingEmp,
        name: name.trim(),
        role: role.trim() || 'Empleado',
        hourlyRate: Number(hourlyRate) || 0,
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
        active: isActiveStatus
      });
      showToast(`Empleado ${name.trim()} actualizado correctamente.`);
    } else {
      onAddEmployee({
        name: name.trim(),
        role: role.trim() || 'Empleado',
        hourlyRate: Number(hourlyRate) || 0,
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
        exitReason: exitReason.trim() || undefined
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
                        <span>Tarifa por hora:</span>
                      </span>
                      <span className="font-extrabold text-orange-700">
                        {formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / h
                      </span>
                    </div>

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
                    step={currency.code === 'PYG' ? '500' : '0.5'}
                    min="0"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
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
                  step="50000"
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
    </div>
  );
};
