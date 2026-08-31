import React, { useState } from 'react';
import { Employee, CurrencyConfig } from '../types';
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
  ShieldCheck, 
  AlertCircle 
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

  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number>(18000);
  const [defaultEntry1, setDefaultEntry1] = useState('08:00');
  const [defaultExit1, setDefaultExit1] = useState('12:00');
  const [defaultEntry2, setDefaultEntry2] = useState('14:00');
  const [defaultExit2, setDefaultExit2] = useState('18:00');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  const openAddModal = () => {
    setEditingEmp(null);
    setName('');
    setRole('Operario');
    setHourlyRate(18000);
    setDefaultEntry1('08:00');
    setDefaultExit1('12:00');
    setDefaultEntry2('14:00');
    setDefaultExit2('18:00');
    setPhone('');
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)]);
    setShowModal(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setRole(emp.role);
    setHourlyRate(emp.hourlyRate || 0);
    setDefaultEntry1(emp.defaultEntry1 || '08:00');
    setDefaultExit1(emp.defaultExit1 || '12:00');
    setDefaultEntry2(emp.defaultEntry2 || '14:00');
    setDefaultExit2(emp.defaultExit2 || '18:00');
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

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Gestión de Empleados ({employees.length})</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure las tarifas por hora y el turno habitual de cada empleado para agilizar el registro diario.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo Empleado</span>
        </button>
      </div>

      {/* Employees grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {employees.map(emp => {
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

                {/* Rate and schedule box */}
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tarifa por hora:</span>
                    </span>
                    <span className="font-extrabold text-orange-700">
                      {formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / h
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Turno estándar:</span>
                    </span>
                    <span className="font-semibold text-slate-700">
                      {emp.defaultEntry1 || '08:00'}-{emp.defaultExit1 || '12:00'} · {emp.defaultEntry2 || '14:00'}-{emp.defaultExit2 || '18:00'}
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
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                    emp.active
                      ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {emp.active ? 'Desactivar' : 'Activar'}
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditModal(emp)}
                    title="Editar empleado"
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar a ${emp.name}?`)) {
                        onDeleteEmployee(emp.id);
                      }
                    }}
                    title="Eliminar empleado"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              <span>{editingEmp ? 'Editar Empleado' : 'Nuevo Empleado'}</span>
            </h3>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
                    Precio por hora ({currency.symbol})
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
                  placeholder="Ej. +34 611 222 333"
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
                      className={`w-7 h-7 rounded-full ${c} flex items-center justify-center transition-transform ${
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
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
