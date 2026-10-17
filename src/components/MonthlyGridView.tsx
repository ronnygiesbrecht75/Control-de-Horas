import React, { useState } from 'react';
import { Employee, DailyTimeRecord, CurrencyConfig, IntermediateExit } from '../types';
import { 
  getAllDaysInMonth, 
  formatMonthSpanish, 
  formatDateShortSpanish, 
  formatDateFriendlySpanish,
  isSunday, 
  calculateDailyTotalHours, 
  calculateShiftHours,
  calculateIntermediateExitsHours,
  getRecordHoursSummary,
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
  FileSpreadsheet,
  Edit3,
  X,
  Save,
  Sparkles,
  AlertCircle,
  Plus,
  ArrowRight,
  LogOut,
  LogIn
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

  // State for the editing popup / modal
  const [editingDateStr, setEditingDateStr] = useState<string | null>(null);
  const [editEntry1, setEditEntry1] = useState<string>('');
  const [editExit1, setEditExit1] = useState<string>('');
  const [editEntry2, setEditEntry2] = useState<string>('');
  const [editExit2, setEditExit2] = useState<string>('');
  const [editIntermediateExits, setEditIntermediateExits] = useState<IntermediateExit[]>([]);
  const [editForm, setEditForm] = useState<{
    isAbsent: boolean;
    notes: string;
  }>({
    isAbsent: false,
    notes: ''
  });

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
        intermediateExits: [],
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
      intermediateExits: [],
      isAbsent: false,
      notes: '',
      totalHours: 0
    };
  };

  const openEditModal = (dateStr: string) => {
    const rec = getRecordForDate(dateStr);
    setEditEntry1(rec.entry1 || '');
    setEditExit1(rec.exit1 || '');
    setEditEntry2(rec.entry2 || '');
    setEditExit2(rec.exit2 || '');
    setEditIntermediateExits(
      rec.intermediateExits ? rec.intermediateExits.map(x => ({ ...x })) : []
    );
    setEditForm({
      isAbsent: !!rec.isAbsent,
      notes: rec.notes || ''
    });
    setEditingDateStr(dateStr);
  };

  const handleAddIntermediateExit = () => {
    setEditIntermediateExits(prev => [
      ...prev,
      {
        id: `exit-${Date.now()}-${prev.length + 1}`,
        exitTime: '',
        returnTime: '',
        label: `Salida intermedia ${prev.length + 1}`,
        reason: ''
      }
    ]);
  };

  const handleIntermediateExitChange = (
    index: number,
    field: 'exitTime' | 'returnTime' | 'label' | 'reason',
    value: string
  ) => {
    setEditIntermediateExits(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveIntermediateExit = (index: number) => {
    setEditIntermediateExits(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations inside modal
  const shift1Hours = calculateShiftHours(editEntry1, editExit1);
  const shift2Hours = calculateShiftHours(editEntry2, editExit2);
  const grossHoursModal = Number((shift1Hours + shift2Hours).toFixed(2));
  const deductedHoursModal = calculateIntermediateExitsHours(editIntermediateExits);
  const netHoursModal = editForm.isAbsent 
    ? 0 
    : Number(Math.max(0, grossHoursModal - deductedHoursModal).toFixed(2));

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !editingDateStr) return;

    // Filter out completely blank intermediate exits
    const validExits = editIntermediateExits.filter(x => x.exitTime || x.returnTime);

    const updatedRecord: DailyTimeRecord = {
      id: `${employee.id}_${editingDateStr}`,
      employeeId: employee.id,
      dateStr: editingDateStr,
      entry1: editForm.isAbsent ? '' : editEntry1,
      exit1: editForm.isAbsent ? '' : editExit1,
      entry2: editForm.isAbsent ? '' : editEntry2,
      exit2: editForm.isAbsent ? '' : editExit2,
      intermediateExits: editForm.isAbsent ? [] : validExits,
      isAbsent: editForm.isAbsent,
      notes: editForm.notes,
      totalHours: editForm.isAbsent ? 0 : netHoursModal
    };

    onUpdateRecord(updatedRecord);
    setEditingDateStr(null);
  };

  const handleLoadDefaultSchedule = () => {
    if (!employee) return;
    setEditEntry1(employee.defaultEntry1 || '07:00');
    setEditExit1(employee.defaultExit1 || '11:30');
    setEditEntry2(employee.defaultEntry2 || '12:30');
    setEditExit2(employee.defaultExit2 || '17:30');
    setEditForm(prev => ({ ...prev, isAbsent: false }));
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
      intermediateExits: [],
      intervals: [],
      isAbsent: false,
      totalHours: 0
    });
    if (editingDateStr === dateStr) {
      setEditingDateStr(null);
    }
  };

  // Monthly summary stats for active employee
  let totalMonthHours = 0;
  let totalGrossHours = 0;
  let totalDeductedExitsHours = 0;
  let workedDaysCount = 0;
  let absentDaysCount = 0;

  allDays.forEach(dateStr => {
    const rec = getRecordForDate(dateStr);
    if (rec.isAbsent) {
      absentDaysCount++;
    } else {
      const summary = getRecordHoursSummary(rec);
      totalGrossHours += summary.grossHours;
      totalDeductedExitsHours += summary.deductedHours;
      if (rec.totalHours && rec.totalHours > 0) {
        totalMonthHours += rec.totalHours;
        workedDaysCount++;
      }
    }
  });

  const hourlyRate = employee?.hourlyRate || 0;
  const estimatedPay = totalMonthHours * hourlyRate;

  return (
    <div className="space-y-4">
      {/* Encabezado Fijo Completo de la Planilla Mensual (Controles + Resumen KPI) */}
      <div className="sticky top-16 z-30 bg-slate-100/95 backdrop-blur-md pt-0 pb-2 space-y-3">
        {/* Top Controls: Selector de Empleado y Navegador de Mes */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Employee selector */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Empleado:
              </span>
              <select
                value={employee?.id || ''}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {activeEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            {employee && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 border-l border-slate-200 pl-3">
                <span>Tarifa:</span>
                <strong className="text-slate-800 font-bold">
                  {formatCurrencyWithSymbol(employee.hourlyRate, currency.symbol, currency.code)}/h
                </strong>
              </div>
            )}
          </div>

          {/* Month Navigator */}
          <div className="flex items-center justify-between sm:justify-end gap-2">
            <button
              type="button"
              onClick={() => setMonthStr(getPrevMonthStr(monthStr))}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer border border-slate-200"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>{formatMonthSpanish(monthStr)}</span>
            </div>

            <button
              type="button"
              onClick={() => setMonthStr(getNextMonthStr(monthStr))}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors cursor-pointer border border-slate-200"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold">Total Horas Netas</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {totalMonthHours.toFixed(2)} h
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
              <span>{formatHoursReadable(totalMonthHours)}</span>
              {totalDeductedExitsHours > 0 && (
                <span className="text-amber-700 font-bold bg-amber-50 px-1 py-0.5 rounded text-[10px]">
                  -{totalDeductedExitsHours.toFixed(2)}h
                </span>
              )}
            </div>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold">Días Trabajados</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {workedDaysCount} días
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {absentDaysCount > 0 ? `${absentDaysCount} ausencias` : 'Sin ausencias registradas'}
            </p>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-xs font-semibold">Salidas Intermedias</span>
              <LogOut className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-700 tracking-tight">
              -{totalDeductedExitsHours.toFixed(2)} h
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Descontadas del total trabajado
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 sm:p-3.5 rounded-2xl shadow-xs text-white">
            <div className="flex items-center justify-between text-blue-200 mb-0.5">
              <span className="text-xs font-semibold">Total Estimado</span>
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl sm:text-2xl font-black tracking-tight">
              {formatCurrencyWithSymbol(estimatedPay, currency.symbol, currency.code)}
            </p>
            <button
              type="button"
              onClick={onGoToSettlement}
              className="text-[11px] text-blue-100 hover:text-white underline mt-0.5 block font-semibold cursor-pointer"
            >
              Ir a Liquidación →
            </button>
          </div>
        </div>
      </div>

      {/* Main Table: Planilla Mensual con botón Editar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Planilla Detallada - {employee?.name}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Presione el botón <strong>"Editar"</strong> en cualquier día para ajustar turnos y salidas intermedias.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToSettlement}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <span>Generar Liquidación</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[calc(100vh-230px)] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-300">
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 uppercase tracking-wider text-[10px]">
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 border-b border-slate-300">Fecha / Día</th>
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 border-b border-slate-300">Turno 1 (Mañana)</th>
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 border-b border-slate-300">Turno 2 (Tarde)</th>
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 border-b border-slate-300">Salida Intermedia</th>
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 text-center border-b border-slate-300">Total Horas</th>
                <th className="sticky top-0 z-20 bg-slate-100 py-2.5 px-2.5 sm:px-3 text-center border-b border-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allDays.map((dateStr) => {
                const rec = getRecordForDate(dateStr);
                const sunday = isSunday(dateStr);
                const hasHours = (rec.totalHours || 0) > 0;
                const hoursSummary = getRecordHoursSummary(rec);
                const exits = rec.intermediateExits || [];
                const hasExits = exits.length > 0 && exits.some(x => x.exitTime && x.returnTime);

                return (
                  <tr
                    key={dateStr}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      sunday ? 'bg-amber-50/30' : rec.isAbsent ? 'bg-red-50/30' : ''
                    }`}
                  >
                    {/* Fecha / Día */}
                    <td className="py-1 px-2.5 sm:px-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 leading-tight">
                        <span className={`font-bold text-xs ${sunday ? 'text-amber-800' : 'text-slate-800'}`}>
                          {formatDateShortSpanish(dateStr)}
                        </span>
                        {sunday && (
                          <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1 py-0 rounded leading-none">
                            Dom
                          </span>
                        )}
                        {rec.isAbsent && (
                          <span className="text-[9px] font-bold uppercase bg-red-100 text-red-700 px-1 py-0 rounded leading-none">
                            Falta
                          </span>
                        )}
                      </div>
                      {rec.notes && (
                        <p className="text-[9px] text-slate-500 truncate max-w-[180px] leading-tight" title={rec.notes}>
                          📝 {rec.notes}
                        </p>
                      )}
                    </td>

                    {/* Turno 1 (Mañana) */}
                    <td className="py-1 px-2.5 sm:px-3 whitespace-nowrap text-slate-700">
                      {rec.isAbsent ? (
                        <span className="text-slate-400 italic text-xs leading-none">Ausente</span>
                      ) : rec.entry1 || rec.exit1 ? (
                        <div className="flex items-center gap-1 font-medium text-xs leading-tight">
                          <span className="text-slate-800 font-semibold">{rec.entry1 || '--:--'}</span>
                          <span className="text-slate-400 text-[10px]">a</span>
                          <span className="text-slate-800 font-semibold">{rec.exit1 || '--:--'}</span>
                          {calculateShiftHours(rec.entry1, rec.exit1) > 0 && (
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0 rounded leading-none font-bold">
                              {calculateShiftHours(rec.entry1, rec.exit1).toFixed(2)}h
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs leading-none">-</span>
                      )}
                    </td>

                    {/* Turno 2 (Tarde) */}
                    <td className="py-1 px-2.5 sm:px-3 whitespace-nowrap text-slate-700">
                      {rec.isAbsent ? (
                        <span className="text-slate-400 italic text-xs leading-none">Ausente</span>
                      ) : rec.entry2 || rec.exit2 ? (
                        <div className="flex items-center gap-1 font-medium text-xs leading-tight">
                          <span className="text-slate-800 font-semibold">{rec.entry2 || '--:--'}</span>
                          <span className="text-slate-400 text-[10px]">a</span>
                          <span className="text-slate-800 font-semibold">{rec.exit2 || '--:--'}</span>
                          {calculateShiftHours(rec.entry2, rec.exit2) > 0 && (
                            <span className="text-[9px] text-slate-500 bg-slate-100 px-1 py-0 rounded leading-none font-bold">
                              {calculateShiftHours(rec.entry2, rec.exit2).toFixed(2)}h
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs leading-none">-</span>
                      )}
                    </td>

                    {/* Salida Intermedia (Descuentos) */}
                    <td className="py-1 px-2.5 sm:px-3">
                      {hasExits ? (
                        <div className="space-y-0.5">
                          {exits.map((item, idx) => {
                            const exitH = calculateShiftHours(item.exitTime, item.returnTime);
                            return (
                              <div
                                key={item.id || idx}
                                className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0 rounded leading-tight"
                              >
                                <span>{item.exitTime || '--:--'}</span>
                                <span className="text-amber-500 text-[9px]">➔</span>
                                <span>{item.returnTime || '--:--'}</span>
                                <span className="text-red-600 font-bold ml-0.5">
                                  (-{exitH.toFixed(2)}h)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-xs leading-none">-</span>
                      )}
                    </td>

                    {/* Total Horas Netas */}
                    <td className="py-1 px-2.5 sm:px-3 text-center whitespace-nowrap">
                      {rec.isAbsent ? (
                        <span className="text-red-500 font-bold text-xs leading-none">0.00 h</span>
                      ) : hasHours ? (
                        <div className="leading-tight">
                          <span className="font-extrabold text-blue-700 text-xs">
                            {(rec.totalHours || 0).toFixed(2)} h
                          </span>
                          {hoursSummary.deductedHours > 0 && (
                            <p className="text-[9px] text-amber-700 font-semibold leading-none mt-0.5">
                              ({hoursSummary.grossHours.toFixed(2)}h - {hoursSummary.deductedHours.toFixed(2)}h)
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium text-xs leading-none">0.00 h</span>
                      )}
                    </td>

                    {/* Acciones: Botón Editar */}
                    <td className="py-1 px-2.5 sm:px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(dateStr)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-[11px] font-bold border border-blue-200 transition-colors cursor-pointer"
                          title="Abrir tabla chica para editar horas de este día"
                        >
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span>Editar</span>
                        </button>

                        {hasHours && (
                          <button
                            type="button"
                            onClick={() => handleClearDay(dateStr)}
                            title="Limpiar horas de este día"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          💡 <strong>Salida Intermedia:</strong> Para cargar una salida dentro del horario normal, presione <strong>"Editar"</strong> en el día deseado y use <strong>"+ Agregar Salida Intermedia"</strong>. Ingrese la <strong>Hora de Salida</strong> y la <strong>Hora de Llegada</strong> para que el tiempo se descuente automáticamente del total.
        </div>
      </div>

      {/* POPUP / MODAL: Tabla chica para editar las horas y salidas intermedias de este día */}
      {editingDateStr && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="bg-slate-900 px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Editar Horas y Salidas del Día
                  </h3>
                  <p className="text-xs text-slate-300">
                    {formatDateFriendlySpanish(editingDateStr)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDateStr(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Employee info row */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${employee?.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-xs`}>
                    {employee?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800">{employee?.name}</span>
                    <span className="text-[11px] text-slate-500">{employee?.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLoadDefaultSchedule}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Horario Habitual</span>
                </button>
              </div>

              {/* Absent toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                <label htmlFor="isAbsentToggle" className="text-xs font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                  <span>¿Falta o Ausente este día?</span>
                </label>
                <input
                  id="isAbsentToggle"
                  type="checkbox"
                  checked={editForm.isAbsent}
                  onChange={(e) => setEditForm(prev => ({ ...prev, isAbsent: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>

              {!editForm.isAbsent && (
                <div className="space-y-4">
                  {/* SECCIÓN 1: HORARIOS NORMALES DE TURNOS */}
                  <div className="space-y-3">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Horario Normal de Trabajo</span>
                    </span>

                    {/* Turno 1 (Mañana) */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Turno 1 (Mañana)
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {shift1Hours.toFixed(2)} h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Entrada:
                          </label>
                          <input
                            type="time"
                            value={editEntry1}
                            onChange={(e) => setEditEntry1(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Salida:
                          </label>
                          <input
                            type="time"
                            value={editExit1}
                            onChange={(e) => setEditExit1(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Turno 2 (Tarde) */}
                    <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          Turno 2 (Tarde)
                        </span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {shift2Hours.toFixed(2)} h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Entrada:
                          </label>
                          <input
                            type="time"
                            value={editEntry2}
                            onChange={(e) => setEditEntry2(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Hora Salida:
                          </label>
                          <input
                            type="time"
                            value={editExit2}
                            onChange={(e) => setEditExit2(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: SALIDAS INTERMEDIAS (DESCUENTO DE HORAS) */}
                  <div className="space-y-3 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <LogOut className="w-4 h-4 text-amber-600" />
                        <span>Salida Intermedia (Descontar del Día)</span>
                      </span>
                      {editIntermediateExits.length > 0 && (
                        <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          -{deductedHoursModal.toFixed(2)} h descontadas
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed bg-amber-50/70 p-2.5 rounded-lg border border-amber-200">
                      💡 <strong>Salida Intermedia:</strong> Ingrese primero la <strong>Hora de Salida</strong> y luego la <strong>Hora de Llegada</strong>. El tiempo transcurrido entre ambas se restará automáticamente del total trabajado en este día.
                    </p>

                    {/* Lista de Salidas Intermedias */}
                    {editIntermediateExits.length === 0 ? (
                      <div className="text-center py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                        No hay salidas intermedias registradas para este día.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editIntermediateExits.map((item, idx) => {
                          const durationH = calculateShiftHours(item.exitTime, item.returnTime);
                          return (
                            <div 
                              key={item.id || idx}
                              className="bg-amber-50/40 p-3.5 rounded-xl border border-amber-200 space-y-2.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                                  <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[11px] flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <span>Salida Intermedia #{idx + 1}</span>
                                </span>

                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                    {durationH > 0 ? `-${durationH.toFixed(2)} h (-${formatHoursReadable(durationH)})` : '-0.00 h'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIntermediateExit(idx)}
                                    title="Eliminar salida intermedia"
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Orden al revés según pedido: 1° Hora de Salida, 2° Hora de Llegada */}
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[11px] font-bold text-amber-900 mb-1 flex items-center gap-1">
                                    <LogOut className="w-3.5 h-3.5 text-amber-600" />
                                    <span>1. Hora de Salida:</span>
                                  </label>
                                  <input
                                    type="time"
                                    value={item.exitTime || ''}
                                    onChange={(e) => handleIntermediateExitChange(idx, 'exitTime', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    placeholder="07:30"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-emerald-900 mb-1 flex items-center gap-1">
                                    <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>2. Hora de Llegada:</span>
                                  </label>
                                  <input
                                    type="time"
                                    value={item.returnTime || ''}
                                    onChange={(e) => handleIntermediateExitChange(idx, 'returnTime', e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    placeholder="09:30"
                                  />
                                </div>
                              </div>

                              {/* Motivo opcional */}
                              <div>
                                <input
                                  type="text"
                                  value={item.reason || ''}
                                  onChange={(e) => handleIntermediateExitChange(idx, 'reason', e.target.value)}
                                  placeholder="Motivo (ej: Permiso particular, Trámite médico, etc.)"
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-700 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Botón para agregar Salida Intermedia */}
                    <div>
                      <button
                        type="button"
                        onClick={handleAddIntermediateExit}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-dashed border-amber-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-4 h-4 text-amber-700" />
                        <span>+ Agregar Salida Intermedia</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* RESUMEN DETALLADO DEL CÁLCULO */}
              <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Horas de Turnos Normales:</span>
                  <span className="font-bold text-slate-800">{grossHoursModal.toFixed(2)} h</span>
                </div>
                {deductedHoursModal > 0 && (
                  <div className="flex items-center justify-between text-xs text-red-600 font-semibold">
                    <span>Descuento por Salidas Intermedias:</span>
                    <span className="font-bold">-{deductedHoursModal.toFixed(2)} h</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
                    Total Horas Netas del Día:
                  </span>
                  <span className="text-xl font-black text-blue-700">
                    {netHoursModal.toFixed(2)} h ({formatHoursReadable(netHoursModal)})
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nota / Observación:
                </label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ej: Salió a las 07:30 y volvió a las 09:30 por trámite"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Footer action buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleClearDay(editingDateStr)}
                  className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  Limpiar Día
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDateStr(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Horas</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
