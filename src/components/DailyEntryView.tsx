import React, { useState, useRef, useEffect } from 'react';
import { Employee, DailyTimeRecord, IntermediateExit } from '../types';
import { 
  calculateDailyTotalHours, 
  calculateShiftHours, 
  calculateIntermediateExitsHours,
  getRecordHoursSummary,
  formatHoursReadable, 
  formatDateFriendlySpanish, 
  formatDateShortSpanish,
  getTodayDateStr 
} from '../utils/timeUtils';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  UserCheck, 
  MessageSquare,
  AlertCircle,
  Save,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Plus,
  LogOut,
  LogIn,
  Users,
  User
} from 'lucide-react';

interface DailyEntryViewProps {
  dateStr: string;
  setDateStr: (date: string) => void;
  employees: Employee[];
  records: DailyTimeRecord[];
  onUpdateRecord: (updatedRecord: DailyTimeRecord) => void;
  onFillAllDefault?: () => void;
}

export const DailyEntryView: React.FC<DailyEntryViewProps> = ({
  dateStr,
  setDateStr,
  employees,
  records,
  onUpdateRecord,
  onFillAllDefault
}) => {
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>('');
  const [employeeDays, setEmployeeDays] = useState<Record<string, number | string>>({});
  const [recentlySaved, setRecentlySaved] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const activeEmployees = employees.filter(e => e.active);

  // Single-employee view selection state
  const [selectedEmpId, setSelectedEmpId] = useState<string>(() => {
    return activeEmployees[0]?.id || employees[0]?.id || '';
  });

  // Sync selectedEmpId if employees list changes
  useEffect(() => {
    if (!selectedEmpId && activeEmployees.length > 0) {
      setSelectedEmpId(activeEmployees[0].id);
    } else if (selectedEmpId && !activeEmployees.some(e => e.id === selectedEmpId) && activeEmployees.length > 0) {
      setSelectedEmpId(activeEmployees[0].id);
    }
  }, [activeEmployees, selectedEmpId]);

  const selectedEmployee = activeEmployees.find(e => e.id === selectedEmpId) || activeEmployees[0] || employees[0];
  const currentEmpIndex = activeEmployees.findIndex(e => e.id === (selectedEmployee?.id || ''));

  const handlePrevEmployee = () => {
    if (activeEmployees.length <= 1) return;
    const prevIdx = (currentEmpIndex - 1 + activeEmployees.length) % activeEmployees.length;
    setSelectedEmpId(activeEmployees[prevIdx].id);
    setEmployeeDays({});
  };

  const handleNextEmployee = () => {
    if (activeEmployees.length <= 1) return;
    const nextIdx = (currentEmpIndex + 1) % activeEmployees.length;
    setSelectedEmpId(activeEmployees[nextIdx].id);
    setEmployeeDays({});
  };

  // Derive current year and month from the top selection
  const [currentYear, currentMonth, currentDay] = dateStr.split('-').map(Number);
  const maxDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const getEmpDay = (empId: string): number => {
    const raw = employeeDays[empId];
    if (raw !== undefined && raw !== '') {
      const num = parseInt(String(raw), 10);
      if (!isNaN(num) && num >= 1 && num <= maxDaysInMonth) return num;
    }
    return currentDay || 1;
  };

  const getEmpDate = (empId: string): string => {
    const raw = employeeDays[empId];
    let d = currentDay || 1;
    if (raw !== undefined && raw !== '') {
      const num = parseInt(String(raw), 10);
      if (!isNaN(num)) d = num;
    }
    const validDay = Math.min(Math.max(1, d), maxDaysInMonth);
    const dayStr = String(validDay).padStart(2, '0');
    const monthStr = String(currentMonth).padStart(2, '0');
    return `${currentYear}-${monthStr}-${dayStr}`;
  };

  const handleEmpDayInput = (empId: string, rawVal: string) => {
    setEmployeeDays(prev => ({
      ...prev,
      [empId]: rawVal
    }));
  };

  // Get record for employee & target date
  const getRecordForEmployee = (emp: Employee, customDate?: string): DailyTimeRecord => {
    const targetDate = customDate || getEmpDate(emp.id);
    const id = `${emp.id}_${targetDate}`;
    const found = records.find(r => r.id === id || (r.employeeId === emp.id && r.dateStr === targetDate));
    if (found) return found;
    return {
      id,
      employeeId: emp.id,
      dateStr: targetDate,
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

  const focusElement = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement && el.type !== 'time') {
          el.select();
        }
      }
    }, 40);
  };

  // Keyboard navigation handler with Enter key per employee
  const handleEmployeeKeyDown = (
    e: React.KeyboardEvent<HTMLElement>,
    emp: Employee,
    field: 'day' | 'entry1' | 'exit1' | 'entry2' | 'exit2' | 'notes' | 'exit_exitTime' | 'exit_returnTime',
    exitIdx?: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const rec = getRecordForEmployee(emp);
      const exits = rec.intermediateExits || [];

      if (field === 'day') {
        focusElement(`input-entry1-${emp.id}`);
      } else if (field === 'entry1') {
        focusElement(`input-exit1-${emp.id}`);
      } else if (field === 'exit1') {
        focusElement(`input-entry2-${emp.id}`);
      } else if (field === 'entry2') {
        focusElement(`input-exit2-${emp.id}`);
      } else if (field === 'exit2') {
        if (exits.length > 0) {
          // If intermediate exits exist, go to first exit time
          focusElement(`input-exit-exitTime-${emp.id}-0`);
        } else {
          // Otherwise jump directly to Guardar Horas button
          focusElement(`save-btn-${emp.id}`);
        }
      } else if (field === 'exit_exitTime' && exitIdx !== undefined) {
        focusElement(`input-exit-returnTime-${emp.id}-${exitIdx}`);
      } else if (field === 'exit_returnTime' && exitIdx !== undefined) {
        if (exitIdx < exits.length - 1) {
          // Go to next intermediate exit
          focusElement(`input-exit-exitTime-${emp.id}-${exitIdx + 1}`);
        } else {
          // Last intermediate exit -> Jump to Guardar Horas button
          focusElement(`save-btn-${emp.id}`);
        }
      } else if (field === 'notes') {
        focusElement(`save-btn-${emp.id}`);
      }
    }
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
      updated.exit2,
      updated.intermediateExits
    );
    onUpdateRecord(updated);
  };

  const handleAddIntermediateExit = (emp: Employee) => {
    const rec = getRecordForEmployee(emp);
    const currentExits = rec.intermediateExits ? [...rec.intermediateExits] : [];
    const newIdx = currentExits.length;
    const newExits: IntermediateExit[] = [
      ...currentExits,
      {
        id: `exit-${Date.now()}-${newIdx + 1}`,
        exitTime: '',
        returnTime: '',
        label: `Salida intermedia ${newIdx + 1}`,
        reason: ''
      }
    ];
    const total = calculateDailyTotalHours(
      rec.entry1,
      rec.exit1,
      rec.entry2,
      rec.exit2,
      newExits
    );
    onUpdateRecord({
      ...rec,
      intermediateExits: newExits,
      totalHours: total
    });
    triggerSaveToast(`Salida intermedia agregada para ${emp.name}`);
    focusElement(`input-exit-exitTime-${emp.id}-${newIdx}`);
  };

  const handleRemoveIntermediateExit = (emp: Employee, index: number) => {
    const rec = getRecordForEmployee(emp);
    const currentExits = rec.intermediateExits ? [...rec.intermediateExits] : [];
    const newExits = currentExits.filter((_, i) => i !== index);
    const total = calculateDailyTotalHours(
      rec.entry1,
      rec.exit1,
      rec.entry2,
      rec.exit2,
      newExits
    );
    onUpdateRecord({
      ...rec,
      intermediateExits: newExits,
      totalHours: total
    });
  };

  const handleIntermediateExitFieldChange = (
    emp: Employee,
    index: number,
    field: 'exitTime' | 'returnTime' | 'reason',
    val: string
  ) => {
    const rec = getRecordForEmployee(emp);
    const currentExits = rec.intermediateExits ? [...rec.intermediateExits] : [];
    const copy = [...currentExits];
    copy[index] = { ...copy[index], [field]: val };
    const total = calculateDailyTotalHours(
      rec.entry1,
      rec.exit1,
      rec.entry2,
      rec.exit2,
      copy
    );
    onUpdateRecord({
      ...rec,
      intermediateExits: copy,
      totalHours: total
    });
  };

  const handleClearRecord = (emp: Employee) => {
    const rec = getRecordForEmployee(emp);
    onUpdateRecord({
      ...rec,
      entry1: '',
      exit1: '',
      entry2: '',
      exit2: '',
      intermediateExits: [],
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
      intermediateExits: isAbsent ? [] : rec.intermediateExits,
      totalHours: isAbsent ? 0 : calculateDailyTotalHours(rec.entry1, rec.exit1, rec.entry2, rec.exit2, rec.intermediateExits)
    });
  };

  const handleNotesChange = (emp: Employee, notes: string) => {
    const rec = getRecordForEmployee(emp);
    onUpdateRecord({
      ...rec,
      notes
    });
  };

  const handleFillEmpDefault = (emp: Employee) => {
    const empTargetDate = getEmpDate(emp.id);
    const rec = getRecordForEmployee(emp, empTargetDate);
    const entry1 = emp.defaultEntry1 || '07:00';
    const exit1 = emp.defaultExit1 || '11:30';
    const entry2 = emp.defaultEntry2 || '12:30';
    const exit2 = emp.defaultExit2 || '17:30';
    const totalHours = calculateDailyTotalHours(entry1, exit1, entry2, exit2, rec.intermediateExits);

    onUpdateRecord({
      ...rec,
      entry1,
      exit1,
      entry2,
      exit2,
      isAbsent: false,
      totalHours
    });

    // Provide visual feedback
    setRecentlySaved(prev => ({ ...prev, [emp.id]: true }));
    setTimeout(() => {
      setRecentlySaved(prev => ({ ...prev, [emp.id]: false }));
    }, 1800);

    // Compute next day (e.g. 1 de octubre -> 2 de octubre)
    const curDate = new Date(empTargetDate + 'T00:00:00');
    curDate.setDate(curDate.getDate() + 1);
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const d = String(curDate.getDate()).padStart(2, '0');
    const nextDateStr = `${y}-${m}-${d}`;

    // Advance to next day and clear employee day overrides
    setDateStr(nextDateStr);
    setEmployeeDays({});

    triggerSaveToast(
      `⚡ Horas habituales guardadas del ${formatDateShortSpanish(empTargetDate)} para ${emp.name}! Avanzado al ${formatDateShortSpanish(nextDateStr)}`
    );

    // Automatically focus the first input box (Entrada 1) for the next day
    focusElement(`input-entry1-${emp.id}`);
  };

  const handleSaveEmployeeAndAdvanceDay = (emp: Employee) => {
    const empTargetDate = getEmpDate(emp.id);
    const rec = getRecordForEmployee(emp, empTargetDate);
    const total = rec.isAbsent
      ? 0
      : calculateDailyTotalHours(
          rec.entry1,
          rec.exit1,
          rec.entry2,
          rec.exit2,
          rec.intermediateExits
        );

    onUpdateRecord({
      ...rec,
      totalHours: total
    });

    // Provide visual feedback on this employee's card
    setRecentlySaved(prev => ({ ...prev, [emp.id]: true }));
    setTimeout(() => {
      setRecentlySaved(prev => ({ ...prev, [emp.id]: false }));
    }, 2000);

    // Compute next day (e.g. 1 de octubre -> 2 de octubre)
    const curDate = new Date(empTargetDate + 'T00:00:00');
    curDate.setDate(curDate.getDate() + 1);
    const y = curDate.getFullYear();
    const m = String(curDate.getMonth() + 1).padStart(2, '0');
    const d = String(curDate.getDate()).padStart(2, '0');
    const nextDateStr = `${y}-${m}-${d}`;

    // Advance to next day and clear employee day overrides
    setDateStr(nextDateStr);
    setEmployeeDays({});

    triggerSaveToast(
      `✅ ¡Horas guardadas del ${formatDateShortSpanish(empTargetDate)} para ${emp.name}! Avanzado al ${formatDateShortSpanish(nextDateStr)}`
    );

    // Automatically focus the first input box (Entrada 1) for the next day
    focusElement(`input-entry1-${emp.id}`);
  };

  const triggerSaveToast = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => {
      setSaveSuccessMessage('');
    }, 3200);
  };

  const handlePrevDay = () => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setDateStr(`${y}-${m}-${d}`);
    setEmployeeDays({});
  };

  const handleNextDay = () => {
    const date = new Date(dateStr + 'T00:00:00');
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setDateStr(`${y}-${m}-${d}`);
    setEmployeeDays({});
  };

  const handleSetToday = () => {
    setDateStr(getTodayDateStr());
    setEmployeeDays({});
  };

  // Calculate day total across all active employees
  const totalEmployeesWithHours = activeEmployees.filter(emp => {
    const rec = getRecordForEmployee(emp);
    return rec.totalHours && rec.totalHours > 0;
  }).length;

  const totalTeamHoursToday = activeEmployees.reduce((sum, emp) => {
    const rec = getRecordForEmployee(emp);
    return sum + (rec.totalHours || 0);
  }, 0);

  return (
    <div className="space-y-6" ref={containerRef}>
      {/* Date Header Controls & Bulk actions - Fixed sticky header */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Selector Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-white hover:shadow-2xs rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1 font-bold text-slate-800 text-sm">
              <CalendarIcon className="w-4 h-4 text-blue-600" />
              <span>{formatDateFriendlySpanish(dateStr)}</span>
            </div>

            <button
              type="button"
              onClick={handleNextDay}
              className="p-1.5 hover:bg-white hover:shadow-2xs rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleSetToday}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Hoy
          </button>

          {/* Quick Date Picker */}
          <input
            type="date"
            value={dateStr}
            onChange={(e) => {
              if (e.target.value) {
                setDateStr(e.target.value);
                setEmployeeDays({});
              }
            }}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl px-2.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
          />
        </div>

        {/* Global Action: Fill All Default Shifts */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-end md:self-auto">
          {onFillAllDefault && (
            <button
              type="button"
              onClick={onFillAllDefault}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer"
              title="Cargar horario habitual para todos los empleados de este día"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Cargar Habitual a Todos</span>
              <span className="sm:hidden">Habitual Todos</span>
            </button>
          )}

          <div className="text-right pl-3 border-l border-slate-200">
            <span className="text-[11px] font-medium text-slate-400 block">Total del Día:</span>
            <span className="text-sm font-black text-blue-700">
              {totalTeamHoursToday.toFixed(2)} h ({totalEmployeesWithHours}/{activeEmployees.length} activos)
            </span>
          </div>
        </div>
      </div>

      {/* Floating Save / Notification toast */}
      {saveSuccessMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMessage}</span>
        </div>
      )}

      {/* Selector de Empleado (Para ver y cargar 1 persona a la vez) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Empleado:</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevEmployee}
                disabled={activeEmployees.length <= 1}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-slate-200"
                title="Empleado anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={selectedEmployee?.id || ''}
                onChange={(e) => {
                  setSelectedEmpId(e.target.value);
                  setEmployeeDays({});
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {activeEmployees.map((emp, idx) => {
                  const r = getRecordForEmployee(emp, dateStr);
                  const hasHours = (r.totalHours || 0) > 0;
                  return (
                    <option key={emp.id} value={emp.id}>
                      {idx + 1}. {emp.name} ({emp.role}) {hasHours ? `✓ (${r.totalHours}h)` : ''}
                    </option>
                  );
                })}
              </select>

              <button
                type="button"
                onClick={handleNextEmployee}
                disabled={activeEmployees.length <= 1}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer border border-slate-200"
                title="Siguiente empleado"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick pill tabs to switch employee with 1 click */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full">
            {activeEmployees.map((emp) => {
              const isSelected = emp.id === selectedEmployee?.id;
              const r = getRecordForEmployee(emp, dateStr);
              const hasHours = (r.totalHours || 0) > 0;

              return (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => {
                    setSelectedEmpId(emp.id);
                    setEmployeeDays({});
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${emp.color || 'bg-blue-600'} ${isSelected ? 'ring-1 ring-white' : ''}`} />
                  <span>{emp.name.split(' ')[0]}</span>
                  {hasHours && (
                    <span className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-emerald-600 font-extrabold'}`}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cuadro individual de Carga de Horas del Empleado seleccionado */}
      <div className="space-y-4">
        {selectedEmployee ? (
          (() => {
            const emp = selectedEmployee;
            const empTargetDate = getEmpDate(emp.id);
            const empDayValue = getEmpDay(emp.id);
            const rec = getRecordForEmployee(emp, empTargetDate);
            const hoursSummary = getRecordHoursSummary(rec);
            const isCurrentDate = empTargetDate === dateStr;
            const exits = rec.intermediateExits || [];

            return (
              <div
                key={emp.id}
              className={`bg-white rounded-2xl shadow-xs border transition-all p-4 sm:p-5 ${
                rec.isAbsent
                  ? 'border-red-200 bg-red-50/20'
                  : (rec.totalHours || 0) > 0
                  ? 'border-blue-200'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Employee Header & Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl ${
                      emp.color || 'bg-blue-600'
                    } text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0`}
                  >
                    {emp.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        {emp.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {emp.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                      <span>Habitual: {emp.defaultEntry1 || '07:00'}-{emp.defaultExit1 || '11:30'} / {emp.defaultEntry2 || '12:30'}-{emp.defaultExit2 || '17:30'}</span>
                      {rec.isAbsent && (
                        <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wide">
                          Ausente
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Day selector for this employee */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl self-start lg:self-auto">
                  <span className="text-xs font-bold text-slate-500">Día:</span>
                  <input
                    type="number"
                    min={1}
                    max={maxDaysInMonth}
                    value={empDayValue}
                    onChange={(e) => handleEmpDayInput(emp.id, e.target.value)}
                    onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'day')}
                    className="w-12 bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-black text-center text-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-xs font-semibold text-slate-500">
                    /{String(currentMonth).padStart(2, '0')}
                  </span>
                  {!isCurrentDate && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      {formatDateShortSpanish(empTargetDate)}
                    </span>
                  )}
                </div>

                {/* Top Card Action Buttons */}
                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <button
                    type="button"
                    onClick={() => handleFillEmpDefault(emp)}
                    className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer text-xs font-bold flex items-center gap-1 border border-slate-200"
                    title="Cargar horario habitual"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Habitual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleAbsent(emp)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border ${
                      rec.isAbsent
                        ? 'bg-red-600 text-white border-red-700'
                        : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-red-700 border-slate-200'
                    }`}
                    title="Marcar falta o ausencia"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{rec.isAbsent ? 'Falta' : 'Ausente'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleClearRecord(emp)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-slate-200"
                    title="Limpiar horas"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Time Inputs & Shifts */}
              {rec.isAbsent ? (
                <div className="mt-4 pt-4 border-t border-red-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-red-50/70 p-3.5 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-red-700 font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Empleado marcado como ausente para este día (0 horas registradas).</span>
                  </div>
                  <button
                    id={`save-btn-${emp.id}`}
                    type="button"
                    onClick={() => handleSaveEmployeeAndAdvanceDay(emp)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEmployeeAndAdvanceDay(emp);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer focus:ring-4 focus:ring-red-300 focus:outline-none"
                    title="Guardar ausencia y pasar al siguiente día"
                  >
                    <Save className="w-4 h-4" />
                    <span>Guardar Ausencia</span>
                    <ArrowRight className="w-3.5 h-3.5 text-red-200" />
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  {/* Normal Shifts Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {/* Turno 1 (Mañana) */}
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            1
                          </span>
                          <span>Turno 1 (Mañana)</span>
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {calculateShiftHours(rec.entry1, rec.exit1).toFixed(2)} h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Entrada:
                          </label>
                          <input
                            id={`input-entry1-${emp.id}`}
                            type="time"
                            value={rec.entry1 || ''}
                            onChange={(e) => handleTimeChange(emp, 'entry1', e.target.value)}
                            onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'entry1')}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Salida:
                          </label>
                          <input
                            id={`input-exit1-${emp.id}`}
                            type="time"
                            value={rec.exit1 || ''}
                            onChange={(e) => handleTimeChange(emp, 'exit1', e.target.value)}
                            onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'exit1')}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Turno 2 (Tarde) */}
                    <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                            2
                          </span>
                          <span>Turno 2 (Tarde)</span>
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {calculateShiftHours(rec.entry2, rec.exit2).toFixed(2)} h
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Entrada:
                          </label>
                          <input
                            id={`input-entry2-${emp.id}`}
                            type="time"
                            value={rec.entry2 || ''}
                            onChange={(e) => handleTimeChange(emp, 'entry2', e.target.value)}
                            onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'entry2')}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                            Salida:
                          </label>
                          <input
                            id={`input-exit2-${emp.id}`}
                            type="time"
                            value={rec.exit2 || ''}
                            onChange={(e) => handleTimeChange(emp, 'exit2', e.target.value)}
                            onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'exit2')}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN SALIDAS INTERMEDIAS (DESCUENTOS) */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <LogOut className="w-3.5 h-3.5 text-amber-600" />
                        <span>Salidas Intermedias (Descontar del Día)</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => handleAddIntermediateExit(emp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Agregar una salida dentro del horario"
                      >
                        <Plus className="w-3.5 h-3.5 text-amber-700" />
                        <span>+ Salida Intermedia</span>
                      </button>
                    </div>

                    {/* Exits list */}
                    {exits.length > 0 && (
                      <div className="space-y-2">
                        {exits.map((item, idx) => {
                          const exitH = calculateShiftHours(item.exitTime, item.returnTime);
                          return (
                            <div
                              key={item.id || idx}
                              className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                   {idx + 1}
                                </span>
                                <span className="text-xs font-bold text-amber-900 whitespace-nowrap">
                                  Salida #{idx + 1}:
                                </span>
                              </div>

                              {/* Orden al revés según pedido: 1° Hora de Salida, 2° Hora de Llegada */}
                              <div className="grid grid-cols-2 gap-2 flex-1 max-w-sm">
                                <div>
                                  <label className="block text-[10px] font-bold text-amber-900 mb-0.5 flex items-center gap-1">
                                    <LogOut className="w-3 h-3 text-amber-600" />
                                    <span>1. Salida:</span>
                                  </label>
                                  <input
                                    id={`input-exit-exitTime-${emp.id}-${idx}`}
                                    type="time"
                                    value={item.exitTime || ''}
                                    onChange={(e) => handleIntermediateExitFieldChange(emp, idx, 'exitTime', e.target.value)}
                                    onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'exit_exitTime', idx)}
                                    className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                    placeholder="07:30"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] font-bold text-emerald-900 mb-0.5 flex items-center gap-1">
                                    <LogIn className="w-3 h-3 text-emerald-600" />
                                    <span>2. Llegada:</span>
                                  </label>
                                  <input
                                    id={`input-exit-returnTime-${emp.id}-${idx}`}
                                    type="time"
                                    value={item.returnTime || ''}
                                    onChange={(e) => handleIntermediateExitFieldChange(emp, idx, 'returnTime', e.target.value)}
                                    onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'exit_returnTime', idx)}
                                    className="w-full px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    placeholder="09:30"
                                  />
                                </div>
                              </div>

                              {/* Deduction Badge & Delete */}
                              <div className="flex items-center justify-end gap-2 shrink-0">
                                <span className="text-xs font-black text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-md">
                                  {exitH > 0 ? `-${exitH.toFixed(2)} h (-${formatHoursReadable(exitH)})` : '-0.00 h'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIntermediateExit(emp, idx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar salida intermedia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Summary & Notes Row with prominent Guardar Horas Button */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="flex-1 max-w-md">
                      <input
                        id={`input-notes-${emp.id}`}
                        type="text"
                        value={rec.notes || ''}
                        onChange={(e) => handleNotesChange(emp, e.target.value)}
                        onKeyDown={(e) => handleEmployeeKeyDown(e, emp, 'notes')}
                        placeholder="Nota u observación del día (opcional)..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Calculated Total for this employee & Guardar Horas Button */}
                    <div className="flex flex-wrap items-center justify-end gap-3 text-right">
                      {hoursSummary.deductedHours > 0 && (
                        <div className="text-[11px] text-amber-700 font-semibold">
                          <span>{hoursSummary.grossHours.toFixed(2)}h normal</span>
                          <span className="text-red-600 font-bold ml-1">-{hoursSummary.deductedHours.toFixed(2)}h salida</span>
                        </div>
                      )}

                      <div className="bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-500 block leading-tight font-bold uppercase">
                          Total Neto:
                        </span>
                        <span className="text-base font-black text-blue-700">
                          {(rec.totalHours || 0).toFixed(2)} h ({formatHoursReadable(rec.totalHours || 0)})
                        </span>
                      </div>

                      {/* Botón Guardar Horas del Empleado (avanza al siguiente día con Enter o Click) */}
                      <button
                        id={`save-btn-${emp.id}`}
                        type="button"
                        onClick={() => handleSaveEmployeeAndAdvanceDay(emp)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveEmployeeAndAdvanceDay(emp);
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer focus:ring-4 focus:ring-emerald-400 focus:outline-none ${
                          recentlySaved[emp.id]
                            ? 'bg-emerald-700 text-white ring-2 ring-emerald-400'
                            : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white'
                        }`}
                        title="Guardar horas de este día y avanzar automáticamente al día siguiente"
                      >
                        {recentlySaved[emp.id] ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                            <span>¡Horas Guardadas! ✓</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Guardar Horas</span>
                            <ArrowRight className="w-3.5 h-3.5 text-emerald-200" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            );
          })()
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">No hay empleados activos</p>
            <p className="text-xs text-slate-400 mt-1">
              Agregue o active empleados en la sección "Empleados" para registrar sus horas.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
