import React from 'react';
import { Employee, DailyTimeRecord, CurrencyConfig } from '../types';
import { 
  getAllDaysInMonth, 
  formatMonthSpanish, 
  formatDateShortSpanish, 
  isSunday, 
  calculateDailyTotalHours, 
  getPrevMonthStr, 
  getNextMonthStr, 
  formatHoursReadable,
  formatCurrencyWithSymbol
} from '../utils/timeUtils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  FileSpreadsheet 
} from 'lucide-react';

interface MonthlyGridViewProps {
  monthStr: string;
  setMonthStr: (month: string) => void;
  selectedEmployeeId: string;
  setSelectedEmployeeId: (id: string) => void;
  employees: Employee[];
  records: DailyTimeRecord[];
  currency: CurrencyConfig;
  onUpdateRecord: (record: DailyTimeRecord) => void;
  onGoToSettlement: () => void;
}

export const MonthlyGridView: React.FC<MonthlyGridViewProps> = ({
  monthStr,
  setMonthStr,
  selectedEmployeeId,
  setSelectedEmployeeId,
  employees,
  records,
  currency,
  onUpdateRecord,
  onGoToSettlement
}) => {
  const activeEmployees = employees.filter(e => e.active);
  const employee = employees.find(e => e.id === selectedEmployeeId) || activeEmployees[0] || employees[0];

  const allDays = getAllDaysInMonth(monthStr);

  const getRecordForDate = (dateStr: string): DailyTimeRecord => {
    if (!employee) {
      return {
        id: `unknown_${dateStr}`,
        employeeId: '',
        dateStr,
        entry1: '',
        exit1: '',
        entry2: '',
        exit2: '',
        isAbsent: false,
        notes: '',
        totalHours: 0
      };
    }
    const id = `${employee.id}_${dateStr}`;
    const found = records.find(r => r.id === id || (r.employeeId === employee.id && r.dateStr === dateStr));
    if (found) return found;
    return {
      id,
      employeeId: employee.id,
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
    dateStr: string,
    field: 'entry1' | 'exit1' | 'entry2' | 'exit2',
    value: string
  ) => {
    if (!employee) return;
    const rec = getRecordForDate(dateStr);
    const updated = { ...rec, [field]: value };
    updated.totalHours = calculateDailyTotalHours(
      updated.entry1,
      updated.exit1,
      updated.entry2,
      updated.exit2
    );
    onUpdateRecord(updated);
  };

  const handleClearDay = (dateStr: string) => {
    if (!employee) return;
    const rec = getRecordForDate(dateStr);
    onUpdateRecord({
      ...rec,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      isAbsent: false,
      totalHours: 0,
      notes: ''
    });
  };

  // Compute monthly total for this employee
  let monthTotalHours = 0;
  let daysWorkedCount = 0;
  allDays.forEach(dateStr => {
    const rec = getRecordForDate(dateStr);
    const h = rec.totalHours || 0;
    monthTotalHours += h;
    if (h > 0 && !rec.isAbsent) {
      daysWorkedCount += 1;
    }
  });

  return (
    <div className="space-y-6">
      {/* Employee Selector & Month Navigator Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Employee selector */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase text-slate-400">Empleado:</span>
            <select
              value={selectedEmployeeId || employee?.id || ''}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {activeEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} — {emp.role}
                </option>
              ))}
            </select>
          </div>

          {/* Center/Right: Month picker */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setMonthStr(getPrevMonthStr(monthStr))}
                title="Mes anterior"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 font-bold text-sm text-slate-800 capitalize">
                {formatMonthSpanish(monthStr)}
              </div>
              <button
                onClick={() => setMonthStr(getNextMonthStr(monthStr))}
                title="Mes siguiente"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Employee Summary for the Month */}
        {employee && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-9 h-9 rounded-lg ${employee.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-xs shadow-sm`}>
                  {employee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{employee.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{employee.role} · {formatCurrencyWithSymbol(employee.hourlyRate, currency.symbol, currency.code)}/h</p>
                </div>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-slate-500">Horas acumuladas:</span>
                <span className="text-base font-extrabold text-blue-700">
                  {monthTotalHours.toFixed(2)} h
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  ({formatHoursReadable(monthTotalHours)})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-slate-500">Días trabajados:</span>
                <span className="text-sm font-bold text-slate-800">{daysWorkedCount} días</span>
              </div>
            </div>

            <button
              onClick={onGoToSettlement}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <DollarSign className="w-4 h-4" />
              <span>Ver Arreglo de Fin de Mes</span>
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet / Monthly Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Planilla de Asistencia — {employee?.name} ({formatMonthSpanish(monthStr)})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Puede editar las entradas y salidas directamente en la tabla
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 sm:px-4 w-32">Fecha</th>
                <th className="py-2.5 px-2 text-center bg-blue-50/60 text-blue-800 border-x border-blue-100">
                  Entrada 1
                </th>
                <th className="py-2.5 px-2 text-center bg-blue-50/60 text-blue-800 border-r border-blue-100">
                  Salida 1
                </th>
                <th className="py-2.5 px-2 text-center bg-indigo-50/60 text-indigo-800 border-r border-indigo-100">
                  Entrada 2
                </th>
                <th className="py-2.5 px-2 text-center bg-indigo-50/60 text-indigo-800 border-r border-indigo-100">
                  Salida 2
                </th>
                <th className="py-2.5 px-3 text-right">Horas Día</th>
                <th className="py-2.5 px-3">Nota</th>
                <th className="py-2.5 px-3 text-center w-20">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {allDays.map((dateStr) => {
                const rec = getRecordForDate(dateStr);
                const isSun = isSunday(dateStr);
                const today = new Date().toISOString().split('T')[0];
                const isToday = dateStr === today;
                const h = rec.totalHours || 0;

                return (
                  <tr
                    key={dateStr}
                    className={`transition-colors ${
                      isSun
                        ? 'bg-slate-50/90 text-slate-400'
                        : isToday
                        ? 'bg-blue-50/40 font-semibold'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-2 px-3 sm:px-4 font-semibold text-slate-800 whitespace-nowrap">
                      <span className={isSun ? 'text-slate-400' : 'text-slate-800'}>
                        {formatDateShortSpanish(dateStr)}
                      </span>
                      {isToday && (
                        <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-blue-600 text-white rounded">
                          HOY
                        </span>
                      )}
                    </td>

                    {/* Entry 1 */}
                    <td className="py-1.5 px-2 text-center border-x border-slate-100">
                      <input
                        type="time"
                        value={rec.entry1 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'entry1', e.target.value)}
                        className="w-24 px-1.5 py-1 bg-transparent border border-slate-200 rounded text-center font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Exit 1 */}
                    <td className="py-1.5 px-2 text-center border-r border-slate-100">
                      <input
                        type="time"
                        value={rec.exit1 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'exit1', e.target.value)}
                        className="w-24 px-1.5 py-1 bg-transparent border border-slate-200 rounded text-center font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Entry 2 */}
                    <td className="py-1.5 px-2 text-center border-r border-slate-100">
                      <input
                        type="time"
                        value={rec.entry2 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'entry2', e.target.value)}
                        className="w-24 px-1.5 py-1 bg-transparent border border-slate-200 rounded text-center font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Exit 2 */}
                    <td className="py-1.5 px-2 text-center border-r border-slate-100">
                      <input
                        type="time"
                        value={rec.exit2 || ''}
                        onChange={(e) => handleTimeChange(dateStr, 'exit2', e.target.value)}
                        className="w-24 px-1.5 py-1 bg-transparent border border-slate-200 rounded text-center font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </td>

                    {/* Total hours */}
                    <td className="py-2 px-3 text-right font-extrabold text-blue-700 whitespace-nowrap">
                      {h > 0 ? `${h.toFixed(2)} h` : isSun ? 'Descanso' : '—'}
                    </td>

                    {/* Notes */}
                    <td className="py-1.5 px-3">
                      <input
                        type="text"
                        value={rec.notes || ''}
                        onChange={(e) => {
                          const updated = { ...rec, notes: e.target.value };
                          onUpdateRecord(updated);
                        }}
                        placeholder={isSun ? 'Descanso dominical' : '—'}
                        className="w-full px-2 py-1 bg-transparent text-xs text-slate-600 focus:bg-white focus:border-slate-300 rounded focus:outline-none"
                      />
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleClearDay(dateStr)}
                          title="Borrar horas del día"
                          className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer */}
            <tfoot>
              <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <td className="py-3 px-4 uppercase text-xs" colSpan={5}>
                  Total Acumulado en {formatMonthSpanish(monthStr)}
                </td>
                <td className="py-3 px-3 text-right text-sm text-blue-700">
                  {monthTotalHours.toFixed(2)} h
                </td>
                <td className="py-3 px-3 text-xs text-slate-600 font-semibold" colSpan={2}>
                  {daysWorkedCount} días trabajados
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
