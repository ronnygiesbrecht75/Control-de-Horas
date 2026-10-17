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
  Filter
} from 'lucide-react';
import { formatCurrencyWithSymbol } from '../utils/timeUtils';

interface EmployeeManagementViewProps {
  employees: Employee[];
  currency: CurrencyConfig;
  onAddEmployee: (emp: Omit<Employee, 'id'>) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

const COLORS = [
  'bg-orange-600',
  'bg-amber-600',
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-cyan-600'
];

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({
  employees,
  currency,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee
}) => {
  const [showModal, setShowModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [filterFrequency, setFilterFrequency] = useState<'all' | 'quincenal' | 'mensual'>('all');

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
        color
      });
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
        active: true,
        color
      });
    }
    setShowModal(false);
  };

  const toggleActive = (emp: Employee) => {
    onUpdateEmployee({ ...emp, active: !emp.active });
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

  const filteredEmployees = employees.filter(emp => {
    if (filterFrequency === 'all') return true;
    const freq = emp.paymentFrequency || 'mensual';
    return freq === filterFrequency;
  });

  const quincenalesCount = employees.filter(e => e.paymentFrequency === 'quincenal').length;
  const mensualesCount = employees.filter(e => (e.paymentFrequency || 'mensual') === 'mensual').length;

  return (
    <div className="space-y-6">
      {/* Top action bar - Fixed sticky header */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Gestión de Empleados ({employees.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure tarifas por hora, horario estándar y modalidad de liquidación (quincenal cada 15 días o mensual cada 30 días).
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
              Todos ({employees.length})
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
            {employees.length === 0 ? 'No hay empleados registrados' : 'No hay empleados con este filtro'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            {employees.length === 0
              ? 'Comience agregando su primer empleado con su cargo, tarifa por hora y frecuencia de cobro.'
              : 'Cambie el filtro para ver todos los empleados registrados.'}
          </p>
          {employees.length === 0 && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Agregar Primer Empleado</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredEmployees.map(emp => {
            const isQuincenal = emp.paymentFrequency === 'quincenal';

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl border transition-all ${
                  emp.active
                    ? 'border-slate-200 shadow-sm hover:border-slate-300'
                    : 'border-slate-200 bg-slate-50/70 opacity-60'
                } p-5 flex flex-col justify-between`}
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

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      emp.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {emp.active ? 'Activo' : 'Inactivo'}
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
                      <span className="font-semibold text-slate-700">
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
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      emp.active
                        ? 'text-slate-600 hover:bg-slate-100'
                        : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    }`}
                  >
                    {emp.active ? 'Desactivar' : 'Reactivar'}
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
                        if (confirm(`¿Está seguro de eliminar a ${emp.name}?`)) {
                          onDeleteEmployee(emp.id);
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

              {/* Color selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Color de etiqueta
                </label>
                <div className="flex items-center space-x-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full ${c} flex items-center justify-center transition-transform cursor-pointer ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-80'
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
    </div>
  );
};
