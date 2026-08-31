import React from 'react';
import { Employee, DailyTimeRecord } from '../types';
import { 
  calculateDailyTotalHours, 
  calculateShiftHours, 
  formatHoursReadable, 
  formatDateFriendlySpanish, 
  getTodayDateStr 
} from '../utils/timeUtils';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  UserCheck, 
  MessageSquare,
  AlertCircle
} from 'lucide-react';

interface DailyEntryViewProps {
  dateStr: string;
  setDateStr: (date: string) => void;
  employees: Employee[];
  records: DailyTimeRecord[];
  onUpdateRecord: (updatedRecord: DailyTimeRecord) => void;
}

export const DailyEntryView: React.FC<DailyEntryViewProps> = ({
  dateStr,
  setDateStr,
  employees,
  records,
  onUpdateRecord
}) => {
  const activeEmployees = employees.filter(e => e.active);

  // Get record for employee & current selected date
  const getRecordForEmployee = (emp: Employee): DailyTimeRecord => {
    const id = `${emp.id}_${dateStr}`;
    const found = records.find(r => r.id === id || (r.employeeId === emp.id && r.dateStr === dateStr));
    if (found) return found;
    return {
      id,
      employeeId: emp.id,
      dateStr,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      isAbsent: false,
      notes: '',
      totalHours: 0
    };
  };

  const handleTimeChange = (
    emp: Employee,
    field: 'entry1' | 'exit1' | 'entry2' | 'exit2',
    value: string
  ) => {
    const rec = getRecordForEmployee(emp);
    const updated = { ...rec, [field]: value };
    updated.totalHours = calculateDailyTotalHours(
      updated.entry1,
      updated.exit1,
      updated.entry2,
      updated.exit2
    );
    onUpdateRecord(updated);
  };

  const handleClearRecord = (emp: Employee) => {
    const rec = getRecordForEmployee(emp);
    onUpdateRecord({
      ...rec,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      isAbsent: false,
      totalHours: 0
    });
  };

  const handleToggleAbsent = (emp: Employee) => {
    const rec = getRecordForEmployee(emp);
    const isAbsent = !rec.isAbsent;
    onUpdateRecord({
      ...rec,
      isAbsent,
      entry1: isAbsent ? '' : rec.entry1,
      exit1: isAbsent ? '' : rec.exit1,
      entry2: isAbsent ? '' : rec.entry2,
      exit2: isAbsent ? '' : rec.exit2,
      totalHours: isAbsent ? 0 : calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2),
      notes: isAbsent ? 'Ausente / No asistió' : ''
    });
  };

  const handleNotesChange = (emp: Employee, notes: string) => {
    const rec = getRecordForEmployee(emp);
    onUpdateRecord({ ...rec, notes });
  };

  // Compute daily totals across all active employees
  const dailyTotalHoursAll = activeEmployees.reduce((acc, emp) => {
    const r = getRecordForEmployee(emp);
    return acc + (r.totalHours || 0);
  }, 0);

  const presentCount = activeEmployees.filter(emp => {
    const r = getRecordForEmployee(emp);
    return (r.totalHours && r.totalHours > 0) && !r.isAbsent;
  }).length;

  // Day navigation
  const shiftDate = (days: number) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const current = new Date(y, m - 1, d);
    current.setDate(current.getDate() + days);
    const ny = current.getFullYear();
    const nm = String(current.getMonth() + 1).padStart(2, '0');
    const nd = String(current.getDate()).padStart(2, '0');
    setDateStr(`${ny}-${nm}-${nd}`);
  };

  return (
    <div className="space-y-6">
      {/* Date Bar & Daily Summary Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Date Picker & Nav buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => shiftDate(-1)}
                title="Día anterior"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="relative flex items-center px-2">
                <CalendarIcon className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value || getTodayDateStr())}
                  className="bg-transparent text-sm font-bold text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => shiftDate(1)}
                title="Día siguiente"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick date shortcuts */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setDateStr(getTodayDateStr())}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  dateStr === getTodayDateStr()
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Hoy
              </button>
              <button
                onClick={() => shiftDate(-1)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors"
              >
                Ayer
              </button>
            </div>
          </div>

          {/* Daily Quick Stats & Bulk Fill Button */}
          <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-500 text-xs">Asistencia:</span>
                <span className="font-bold text-slate-800">
                  {presentCount} / {activeEmployees.length}
                </span>
              </div>
              
              <div className="h-4 w-px bg-slate-200"></div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-slate-500 text-xs">Horas del día:</span>
                <span className="font-extrabold text-blue-700 text-sm">
                  {dailyTotalHoursAll.toFixed(2)} h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Friendly Spanish Date Subtitle */}
        <p className="text-xs font-medium text-slate-500 mt-2.5">
          📅 {formatDateFriendlySpanish(dateStr)} · Registre abajo las 2 entradas y salidas del día
        </p>
      </div>

      {/* Employee Shift Cards */}
      <div className="space-y-4">
        {activeEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No hay empleados activos</h3>
            <p className="text-xs text-slate-500 mt-1">
              Vaya a la pestaña "Empleados" para agregar su personal.
            </p>
          </div>
        ) : (
          activeEmployees.map((emp) => {
            const rec = getRecordForEmployee(emp);
            const shift1Hours = calculateShiftHours(rec.entry1, rec.exit1);
            const shift2Hours = calculateShiftHours(rec.entry2, rec.exit2);
            const isFilled = (rec.totalHours && rec.totalHours > 0) || rec.isAbsent;

            return (
              <div
                key={emp.id}
                className={`bg-white rounded-2xl border transition-all ${
                  rec.isAbsent
                    ? 'border-amber-200 bg-amber-50/30'
                    : isFilled
                    ? 'border-slate-200 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300'
                } p-4 sm:p-5`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Employee Info Header */}
                  <div className="flex items-center justify-between lg:w-60 shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-11 h-11 rounded-xl ${emp.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-sm shadow-sm`}>
                        {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 leading-snug">
                          {emp.name}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {emp.role}
                        </p>
                      </div>
                    </div>

                    {/* Absent button toggle badge for small screens */}
                    <button
                      onClick={() => handleToggleAbsent(emp)}
                      className={`lg:hidden px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        rec.isAbsent
                          ? 'bg-amber-100 border-amber-300 text-amber-800'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {rec.isAbsent ? 'Ausente' : 'Marcar ausente'}
                    </button>
                  </div>

                  {/* Shift 1 & Shift 2 Inputs Container */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Bloque 1: Mañana */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>1er Turno (Mañana)</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {shift1Hours > 0 ? `${shift1Hours} h` : '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Entrada 1
                          </label>
                          <input
                            type="time"
                            disabled={rec.isAbsent}
                            value={rec.entry1 || ''}
                            onChange={(e) => handleTimeChange(emp, 'entry1', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Salida 1
                          </label>
                          <input
                            type="time"
                            disabled={rec.isAbsent}
                            value={rec.exit1 || ''}
                            onChange={(e) => handleTimeChange(emp, 'exit1', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bloque 2: Tarde */}
                    <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          <span>2do Turno (Tarde)</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {shift2Hours > 0 ? `${shift2Hours} h` : '—'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Entrada 2
                          </label>
                          <input
                            type="time"
                            disabled={rec.isAbsent}
                            value={rec.entry2 || ''}
                            onChange={(e) => handleTimeChange(emp, 'entry2', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-slate-500 mb-1">
                            Salida 2
                          </label>
                          <input
                            type="time"
                            disabled={rec.isAbsent}
                            value={rec.exit2 || ''}
                            onChange={(e) => handleTimeChange(emp, 'exit2', e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Daily Sum & Action Shortcuts */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 lg:w-44 shrink-0">
                    <div className="text-left lg:text-right">
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Total del día
                      </span>
                      <div className="flex items-baseline lg:justify-end gap-1.5 mt-0.5">
                        <span className="text-xl font-extrabold text-blue-700">
                          {rec.isAbsent ? '0.00' : (rec.totalHours || 0).toFixed(2)} h
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          ({formatHoursReadable(rec.totalHours || 0)})
                        </span>
                      </div>
                    </div>

                    {/* Shortcuts buttons */}
                    <div className="flex items-center gap-1.5 mt-0 lg:mt-3">
                      <button
                        onClick={() => handleToggleAbsent(emp)}
                        title={rec.isAbsent ? 'Marcar presente' : 'Marcar ausente / vacaciones'}
                        className={`hidden lg:block px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          rec.isAbsent
                            ? 'bg-amber-100 border-amber-300 text-amber-800'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {rec.isAbsent ? 'Ausente' : 'Ausente'}
                      </button>

                      <button
                        onClick={() => handleClearRecord(emp)}
                        title="Borrar entradas y salidas"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional Day Note field */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={rec.notes || ''}
                    onChange={(e) => handleNotesChange(emp, e.target.value)}
                    placeholder="Nota opcional del día (ej. horas extras, permiso médico...)"
                    className="flex-1 text-xs text-slate-600 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
