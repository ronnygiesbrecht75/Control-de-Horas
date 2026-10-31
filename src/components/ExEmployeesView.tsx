import React, { useState } from 'react';
import { Employee, DailyTimeRecord, CurrencyConfig, IntermediateExit, HourlyRateEntry } from '../types';
import { 
  Users, 
  UserX, 
  RotateCcw, 
  Calendar, 
  Clock, 
  DollarSign, 
  Download, 
  Printer, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  CalendarDays, 
  Edit3, 
  Trash2, 
  X, 
  Briefcase,
  Layers,
  ArrowRight,
  TrendingUp,
  History,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import { 
  formatMonthSpanish, 
  getAllDaysInMonth, 
  getRecordHoursSummary, 
  formatHoursReadable, 
  formatCurrencyWithSymbol, 
  formatDateDisplay, 
  formatDateShortSpanish,
  isSunday,
  calculateTenure,
  getTodayDateStr,
  getEmployeeRateForDate,
  calculateIntermediateExitsHours
} from '../utils/timeUtils';

interface ExEmployeesViewProps {
  employees: Employee[];
  records: DailyTimeRecord[];
  currency: CurrencyConfig;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onUpdateRecord: (updatedRecord: DailyTimeRecord) => void;
  onGoToActiveEmployees: () => void;
}

export const ExEmployeesView: React.FC<ExEmployeesViewProps> = ({
  employees,
  records,
  currency,
  onUpdateEmployee,
  onDeleteEmployee,
  onUpdateRecord,
  onGoToActiveEmployees
}) => {
  const exEmployees = employees.filter(e => !e.active);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExEmpId, setSelectedExEmpId] = useState<string>(() => {
    return exEmployees[0]?.id || '';
  });

  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'monthly'>('monthly');

  // Month state for the monthly spreadsheet
  const [monthStr, setMonthStr] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // Edit record modal state for historical corrections
  const [editingDateStr, setEditingDateStr] = useState<string | null>(null);
  const [editEntry1, setEditEntry1] = useState<string>('');
  const [editExit1, setEditExit1] = useState<string>('');
  const [editEntry2, setEditEntry2] = useState<string>('');
  const [editExit2, setEditExit2] = useState<string>('');
  const [editIntermediateExits, setEditIntermediateExits] = useState<IntermediateExit[]>([]);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editIsAbsent, setEditIsAbsent] = useState<boolean>(false);

  // Edit dates modal for an ex-employee
  const [editingDatesEmp, setEditingDatesEmp] = useState<Employee | null>(null);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editExitReason, setEditExitReason] = useState('');

  // PDF print modal state
  const [showPDFModal, setShowPDFModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Rate history modal state
  const [showRateHistoryModal, setShowRateHistoryModal] = useState<boolean>(false);
  const [rateModalEmployee, setRateModalEmployee] = useState<Employee | null>(null);
  const [modalNewRate, setModalNewRate] = useState<number>(18000);
  const [modalEffectiveDate, setModalEffectiveDate] = useState<string>(getTodayDateStr());
  const [modalRateNotes, setModalRateNotes] = useState<string>('Aumento salarial');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Selected ex-employee object
  const currentExEmp = exEmployees.find(e => e.id === selectedExEmpId) || exEmployees[0] || null;

  // Filtered ex-employees for directory view
  const filteredExEmployees = exEmployees.filter(emp => {
    const q = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.role.toLowerCase().includes(q) ||
      (emp.exitReason && emp.exitReason.toLowerCase().includes(q))
    );
  });

  // Calculate monthly stats for the selected ex-employee
  const allDays = getAllDaysInMonth(monthStr);

  const getRecordForDate = (dateStr: string): DailyTimeRecord => {
    if (!currentExEmp) {
      return {
        id: `empty_${dateStr}`,
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
    const id = `${currentExEmp.id}_${dateStr}`;
    const found = records.find(r => r.employeeId === currentExEmp.id && r.dateStr === dateStr);
    return found || {
      id,
      employeeId: currentExEmp.id,
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

  let totalMonthHours = 0;
  let totalDeductedExitsHours = 0;
  let workedDaysCount = 0;
  let absentDaysCount = 0;
  let totalIntermediateExitsCount = 0;
  let estimatedPay = 0;
  const ratesBreakdown: Record<number, { rate: number; hours: number; subtotal: number }> = {};

  allDays.forEach(dateStr => {
    const rec = getRecordForDate(dateStr);
    if (rec.isAbsent) {
      absentDaysCount++;
    } else {
      if (rec.totalHours && rec.totalHours > 0) {
        totalMonthHours += rec.totalHours;
        workedDaysCount++;
        const dayRate = getEmployeeRateForDate(currentExEmp, dateStr);
        const daySubtotal = rec.totalHours * dayRate;
        estimatedPay += daySubtotal;

        if (!ratesBreakdown[dayRate]) {
          ratesBreakdown[dayRate] = { rate: dayRate, hours: 0, subtotal: 0 };
        }
        ratesBreakdown[dayRate].hours += rec.totalHours;
        ratesBreakdown[dayRate].subtotal += daySubtotal;
      }
      if (rec.intermediateExits && rec.intermediateExits.length > 0) {
        totalIntermediateExitsCount += rec.intermediateExits.length;
        const deducted = calculateIntermediateExitsHours(rec.intermediateExits);
        totalDeductedExitsHours += deducted;
      }
    }
  });

  const rateBreakdownList = Object.values(ratesBreakdown).sort((a, b) => a.rate - b.rate);
  const hasMultipleRatesInMonth = rateBreakdownList.length > 1;

  const hourlyRate = currentExEmp?.hourlyRate || 0;

  // Rate history modal helpers
  const handleOpenRateHistory = (emp: Employee) => {
    setRateModalEmployee(emp);
    setModalNewRate(emp.hourlyRate || 18000);
    setModalEffectiveDate(getTodayDateStr());
    setModalRateNotes('Aumento salarial');
    setShowRateHistoryModal(true);
  };

  const handleAddRateToHistory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateModalEmployee) return;
    if (modalNewRate <= 0) {
      alert('Por favor ingrese un monto válido para la tarifa horaria.');
      return;
    }
    if (!modalEffectiveDate) {
      alert('Por favor seleccione la fecha desde la cual rige la nueva tarifa.');
      return;
    }

    const currentHistory: HourlyRateEntry[] = rateModalEmployee.rateHistory && rateModalEmployee.rateHistory.length > 0
      ? [...rateModalEmployee.rateHistory]
      : [
          {
            effectiveDate: rateModalEmployee.startDate || '2020-01-01',
            rate: rateModalEmployee.hourlyRate || 18000,
            notes: 'Tarifa inicial'
          }
        ];

    const updatedHistory = [
      ...currentHistory.filter(h => h.effectiveDate !== modalEffectiveDate),
      {
        effectiveDate: modalEffectiveDate,
        rate: modalNewRate,
        notes: modalRateNotes.trim() || 'Aumento salarial'
      }
    ].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

    const latestRate = updatedHistory[updatedHistory.length - 1].rate;

    const updatedEmp: Employee = {
      ...rateModalEmployee,
      hourlyRate: latestRate,
      rateHistory: updatedHistory
    };

    onUpdateEmployee(updatedEmp);
    setRateModalEmployee(updatedEmp);
    setModalRateNotes('');
    showToast(`Historial de tarifas actualizado para ${rateModalEmployee.name}.`);
  };

  const handleDeleteRateFromHistory = (indexToDelete: number) => {
    if (!rateModalEmployee || !rateModalEmployee.rateHistory) return;
    const history = [...rateModalEmployee.rateHistory];
    if (history.length <= 1) {
      alert('Debe quedar al menos una tarifa registrada en el historial.');
      return;
    }
    history.splice(indexToDelete, 1);
    const latestRate = history[history.length - 1].rate;
    const updatedEmp: Employee = {
      ...rateModalEmployee,
      hourlyRate: latestRate,
      rateHistory: history
    };
    onUpdateEmployee(updatedEmp);
    setRateModalEmployee(updatedEmp);
    showToast('Tarifa eliminada del historial.');
  };

  // Month navigation helpers
  const handlePrevMonth = () => {
    const [y, m] = monthStr.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, '0');
    setMonthStr(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = monthStr.split('-').map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, '0');
    setMonthStr(`${newY}-${newM}`);
  };

  // Reactivate employee
  const handleReactivate = (emp: Employee) => {
    if (confirm(`¿Desea reactivar a ${emp.name}? Volverá a la lista de Empleados Activos y Carga Diaria.`)) {
      onUpdateEmployee({
        ...emp,
        active: true
      });
      showToast(`${emp.name} ha sido reactivado exitosamente.`);
    }
  };

  // Edit employee dates modal
  const openEditDatesModal = (emp: Employee) => {
    setEditingDatesEmp(emp);
    setEditStartDate(emp.startDate || '');
    setEditEndDate(emp.endDate || getTodayDateStr());
    setEditExitReason(emp.exitReason || '');
  };

  const handleSaveDates = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDatesEmp) return;
    onUpdateEmployee({
      ...editingDatesEmp,
      startDate: editStartDate || undefined,
      endDate: editEndDate || undefined,
      exitReason: editExitReason.trim() || undefined
    });
    setEditingDatesEmp(null);
    showToast(`Fechas de ${editingDatesEmp.name} actualizadas.`);
  };

  // Export to Excel (.csv format with UTF-8 BOM)
  const handleExportExcel = () => {
    if (!currentExEmp) return;
    const lines: string[] = [];

    lines.push(`PLANILLA MENSUAL HISTÓRICA - EX EMPLEADO`);
    lines.push(`Empleado:;"${currentExEmp.name.replace(/"/g, '""')}"`);
    lines.push(`Cargo:;"${(currentExEmp.role || '').replace(/"/g, '""')}"`);
    lines.push(`Estado:;Ex Empleado (Inactivo)`);
    if (currentExEmp.startDate) {
      lines.push(`Fecha de Ingreso:;"${formatDateDisplay(currentExEmp.startDate)}"`);
    }
    if (currentExEmp.endDate) {
      lines.push(`Fecha de Salida:;"${formatDateDisplay(currentExEmp.endDate)}"`);
    }
    if (currentExEmp.exitReason) {
      lines.push(`Motivo de Salida:;"${currentExEmp.exitReason.replace(/"/g, '""')}"`);
    }
    lines.push(`Mes / Periodo:;"${formatMonthSpanish(monthStr)}"`);
    if (hasMultipleRatesInMonth) {
      lines.push(`Tarifas aplicadas en el mes:;"${rateBreakdownList.map(r => `${formatCurrencyWithSymbol(r.rate, currency.symbol, currency.code)}/h (${r.hours.toFixed(1)}h)`).join(' + ')}"`);
    } else {
      lines.push(`Tarifa por hora:;"${formatCurrencyWithSymbol(currentExEmp.hourlyRate, currency.symbol, currency.code)}/h"`);
    }
    lines.push(``);

    lines.push(`Fecha;Día;Turno 1 Entrada;Turno 1 Salida;Turno 2 Entrada;Turno 2 Salida;Salidas Intermedias;Total Horas;Tarifa Aplicada;Subtotal Día;Estado;Observaciones`);

    allDays.forEach(dateStr => {
      const rec = getRecordForDate(dateStr);
      const e1 = rec.entry1 || '';
      const s1 = rec.exit1 || '';
      const e2 = rec.entry2 || '';
      const s2 = rec.exit2 || '';
      const totalH = (rec.totalHours || 0).toFixed(2).replace('.', ',');
      const exitsStr = (rec.intermediateExits && rec.intermediateExits.length > 0)
        ? rec.intermediateExits.map(x => `${x.exitTime}-${x.returnTime}`).join(' | ')
        : '';
      const estado = rec.isAbsent ? 'Ausente' : ((rec.totalHours || 0) > 0 ? 'Trabajó' : 'Sin registro');
      const obs = (rec.notes || '').replace(/"/g, '""');
      const dayName = formatDateShortSpanish(dateStr);

      const dayRate = getEmployeeRateForDate(currentExEmp, dateStr);
      const daySubtotal = (rec.totalHours || 0) * dayRate;
      const rateStr = formatCurrencyWithSymbol(dayRate, currency.symbol, currency.code);
      const subtotalStr = (rec.totalHours || 0) > 0 ? formatCurrencyWithSymbol(daySubtotal, currency.symbol, currency.code) : '-';

      lines.push(`${rec.dateStr};${dayName};${e1};${s1};${e2};${s2};${exitsStr};${totalH};"${rateStr}";"${subtotalStr}";${estado};"${obs}"`);
    });

    lines.push(``);
    lines.push(`RESUMEN DEL MES`);
    lines.push(`Total Horas Trabajadas:;${totalMonthHours.toFixed(2).replace('.', ',')} horas`);
    lines.push(`Días con Asistencia:;${workedDaysCount} días`);
    if (hasMultipleRatesInMonth) {
      lines.push(`Desglose de Tarifas:;"${rateBreakdownList.map(r => `${r.hours.toFixed(2)}h a ${formatCurrencyWithSymbol(r.rate, currency.symbol, currency.code)} = ${formatCurrencyWithSymbol(r.subtotal, currency.symbol, currency.code)}`).join(' | ')}"`);
    }
    lines.push(`Total Estimado a Liquidar:;"${formatCurrencyWithSymbol(estimatedPay, currency.symbol, currency.code)}"`);

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Planilla_Historica_${currentExEmp.name.replace(/\s+/g, '_')}_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Planilla histórica descargada en formato Excel (.csv).');
  };

  // Open edit row modal
  const openEditModal = (dateStr: string) => {
    const rec = getRecordForDate(dateStr);
    setEditingDateStr(dateStr);
    setEditEntry1(rec.entry1 || '');
    setEditExit1(rec.exit1 || '');
    setEditEntry2(rec.entry2 || '');
    setEditExit2(rec.exit2 || '');
    setEditIntermediateExits(rec.intermediateExits ? [...rec.intermediateExits] : []);
    setEditNotes(rec.notes || '');
    setEditIsAbsent(rec.isAbsent || false);
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExEmp || !editingDateStr) return;

    const summary = getRecordHoursSummary({
      entry1: editEntry1,
      exit1: editExit1,
      entry2: editEntry2,
      exit2: editExit2,
      intermediateExits: editIntermediateExits,
      isAbsent: editIsAbsent
    });

    const updatedRecord: DailyTimeRecord = {
      id: `${currentExEmp.id}_${editingDateStr}`,
      employeeId: currentExEmp.id,
      dateStr: editingDateStr,
      entry1: editEntry1,
      exit1: editExit1,
      entry2: editEntry2,
      exit2: editExit2,
      intermediateExits: editIntermediateExits,
      isAbsent: editIsAbsent,
      notes: editNotes.trim(),
      totalHours: summary.netHours
    };

    onUpdateRecord(updatedRecord);
    setEditingDateStr(null);
    showToast(`Registro del día ${formatDateDisplay(editingDateStr)} guardado.`);
  };

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
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <UserX className="w-4 h-4 text-slate-700" />
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Ex Empleados y Archivo de Planillas ({exEmployees.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Registro histórico de empleados retirados, fechas de ingreso/salida y consulta de todas sus planillas mensuales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub-tabs toggle */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('monthly')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Planilla Mensual</span>
            </button>
            <button
              onClick={() => setActiveSubTab('directory')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'directory'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Directorio ({exEmployees.length})</span>
            </button>
          </div>

          <button
            onClick={onGoToActiveEmployees}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Empleados Activos</span>
          </button>
        </div>
      </div>

      {/* When no ex-employees are registered */}
      {exEmployees.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <UserX className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No hay ex empleados registrados
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Cuando desactive a un empleado desde la pestaña <strong>Empleados</strong>, se guardará automáticamente en este archivo de Ex Empleados junto con su fecha de ingreso, salida y todas sus planillas mensuales pasadas.
          </p>
          <button
            onClick={onGoToActiveEmployees}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Ir a Gestión de Empleados</span>
          </button>
        </div>
      ) : activeSubTab === 'directory' ? (
        /* DIRECTORY VIEW */
        <div className="space-y-4">
          {/* Search box */}
          <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, cargo o motivo de salida..."
              className="w-full text-xs sm:text-sm font-medium text-slate-800 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 p-1 text-xs cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExEmployees.map(emp => {
              const tenure = calculateTenure(emp.startDate, emp.endDate);

              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    {/* Header with avatar */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-xl ${emp.color || 'bg-slate-600'} text-white font-bold flex items-center justify-center text-sm shadow-sm opacity-90`}>
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

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Ex Empleado
                      </span>
                    </div>

                    {/* Dates box */}
                    <div className="mt-4 p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fecha de comienzo:</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {emp.startDate ? formatDateDisplay(emp.startDate) : 'No registrada'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-red-500" />
                          <span>Fecha de salida:</span>
                        </span>
                        <span className="font-bold text-slate-800">
                          {emp.endDate ? formatDateDisplay(emp.endDate) : 'Retirado'}
                        </span>
                      </div>

                      {tenure && (
                        <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>Tiempo laborado:</span>
                          </span>
                          <span className="font-semibold text-blue-700">
                            {tenure}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Reason / Details */}
                    {emp.exitReason && (
                      <div className="mt-2.5 text-[11px] text-slate-600 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                        <span className="font-bold text-amber-900">Motivo: </span>
                        <span>{emp.exitReason}</span>
                      </div>
                    )}

                    {/* Rate & Contact info */}
                    <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-orange-600" />
                          <span>Última tarifa:</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-orange-700">
                            {formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / h
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenRateHistory(emp)}
                            title="Ver historial de cambios de salario"
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {emp.phone && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Teléfono:</span>
                          </span>
                          <span className="font-medium text-slate-700">
                            {emp.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedExEmpId(emp.id);
                        setActiveSubTab('monthly');
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Ver Planilla</span>
                    </button>

                    <button
                      onClick={() => openEditDatesModal(emp)}
                      title="Editar fechas de ingreso o salida"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleReactivate(emp)}
                      title="Reactivar empleado (regresar a activos)"
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reactivar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* PLANILLA MENSUAL DE EX EMPLEADO */
        <div className="space-y-4">
          {/* Fixed Selector Card: Ex-employee pick, Month navigation, & Export options */}
          <div className="sticky top-16 z-30 bg-slate-100/95 backdrop-blur-md pt-0 pb-2 space-y-3">
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Employee selector */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl ${currentExEmp?.color || 'bg-slate-600'} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}>
                    {currentExEmp ? currentExEmp.name.split(' ').map(n => n[0]).slice(0, 2).join('') : 'EX'}
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Ex Empleado Seleccionado
                    </label>
                    <select
                      value={selectedExEmpId}
                      onChange={(e) => setSelectedExEmpId(e.target.value)}
                      className="font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-sm sm:text-base"
                    >
                      {exEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {currentExEmp && (
                  <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs">
                    <span className="text-slate-500">
                      Ingreso: <strong>{currentExEmp.startDate ? formatDateDisplay(currentExEmp.startDate) : 'N/D'}</strong>
                    </span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-500">
                      Salida: <strong>{currentExEmp.endDate ? formatDateDisplay(currentExEmp.endDate) : 'Retirado'}</strong>
                    </span>
                    <button
                      onClick={() => currentExEmp && handleOpenRateHistory(currentExEmp)}
                      className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg cursor-pointer transition-colors border border-blue-200 shadow-2xs"
                      title="Ver y registrar aumentos o historial de tarifas del empleado"
                    >
                      <TrendingUp className="w-3 h-3 text-blue-600" />
                      <span>Historial Salarial</span>
                    </button>
                    <button
                      onClick={() => currentExEmp && handleReactivate(currentExEmp)}
                      className="ml-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reactivar</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Month navigation & Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={handlePrevMonth}
                    title="Mes anterior"
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 text-xs sm:text-sm font-bold text-slate-800 capitalize min-w-[130px] text-center">
                    {formatMonthSpanish(monthStr)}
                  </span>

                  <button
                    onClick={handleNextMonth}
                    title="Mes siguiente"
                    className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="month"
                  value={monthStr}
                  onChange={(e) => setMonthStr(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-xl cursor-pointer"
                />

                {/* Historial de Salarios button in toolbar */}
                <button
                  onClick={() => currentExEmp && handleOpenRateHistory(currentExEmp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  title="Ver historial cronológico de cambios de salario"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Historial Salarios</span>
                  <span className="sm:hidden">Tarifas</span>
                </button>

                {/* Generar Excel */}
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Generar Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>

                {/* Generar PDF */}
                <button
                  onClick={() => setShowPDFModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Generar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Total Horas
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
                  {formatHoursReadable(totalMonthHours)}
                </span>
                <span className="text-[11px] text-slate-500">
                  {totalMonthHours.toFixed(2)} horas netas
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
                <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Días Trabajados
                </span>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
                  {workedDaysCount} días
                </span>
                <span className="text-[11px] text-slate-500">
                  {absentDaysCount} ausencias reg.
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Tarifa por Hora
                  </span>
                  {hasMultipleRatesInMonth ? (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                      Escalonada
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => currentExEmp && handleOpenRateHistory(currentExEmp)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <History className="w-3 h-3" />
                      <span>Historial</span>
                    </button>
                  )}
                </div>
                <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
                  {hasMultipleRatesInMonth
                    ? `${formatCurrencyWithSymbol(rateBreakdownList[0].rate, currency.symbol, currency.code)} → ${formatCurrencyWithSymbol(rateBreakdownList[rateBreakdownList.length - 1].rate, currency.symbol, currency.code)}`
                    : formatCurrencyWithSymbol(hourlyRate, currency.symbol, currency.code)}
                </span>
                <span className="text-[11px] text-slate-500 truncate block">
                  {hasMultipleRatesInMonth
                    ? `${rateBreakdownList.length} tarifas en el mes`
                    : 'por hora trabajada'}
                </span>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-3.5 rounded-2xl shadow-xs border border-blue-500">
                <span className="block text-[11px] font-bold text-blue-100 uppercase tracking-wider">
                  Total Estimado
                </span>
                <span className="text-xl sm:text-2xl font-black mt-0.5 block">
                  {formatCurrencyWithSymbol(estimatedPay, currency.symbol, currency.code)}
                </span>
                <span className="text-[11px] text-blue-100 truncate block">
                  {hasMultipleRatesInMonth
                    ? rateBreakdownList.map(r => `${r.hours.toFixed(1)}h a ${formatCurrencyWithSymbol(r.rate, currency.symbol, currency.code)}`).join(' + ')
                    : 'Planilla histórica'}
                </span>
              </div>
            </div>
          </div>

          {/* Table of the Month */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-orange-600" />
                <span>
                  Registro Diario de {currentExEmp?.name} · {formatMonthSpanish(monthStr)}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {hasMultipleRatesInMonth && (
                  <span className="text-[11px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-lg font-bold">
                    Tarifa escalonada aplicada
                  </span>
                )}
                <span className="text-xs text-slate-500">
                  {allDays.length} días de registro
                </span>
              </div>
            </div>

            <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs border-b border-slate-200">
                  <tr className="text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Fecha y Día</th>
                    <th className="py-2.5 px-3">1er Turno (Mañana)</th>
                    <th className="py-2.5 px-3">Salidas Intermedias</th>
                    <th className="py-2.5 px-3">2do Turno (Tarde)</th>
                    <th className="py-2.5 px-3 text-right">Total Horas</th>
                    <th className="py-2.5 px-3 text-right">Tarifa / Subtotal</th>
                    <th className="py-2.5 px-3">Estado / Observaciones</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allDays.map(dateStr => {
                    const rec = getRecordForDate(dateStr);
                    const isSun = isSunday(dateStr);
                    const dayNumber = dateStr.split('-')[2];
                    const dayName = formatDateShortSpanish(dateStr);
                    const dayRate = getEmployeeRateForDate(currentExEmp, dateStr);
                    const daySubtotal = (rec.totalHours || 0) * dayRate;
                    const hasHours = (rec.totalHours || 0) > 0;

                    return (
                      <tr
                        key={dateStr}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSun ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-bold text-slate-800">
                            {dayNumber} · {dayName}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {dateStr}
                          </span>
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          {rec.entry1 && rec.exit1 ? (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {rec.entry1} - {rec.exit1}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          {rec.intermediateExits && rec.intermediateExits.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {rec.intermediateExits.map((ex, idx) => (
                                <span key={idx} className="bg-red-50 text-red-700 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-red-200">
                                  {ex.exitTime}-{ex.returnTime}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-2 px-3 whitespace-nowrap">
                          {rec.entry2 && rec.exit2 ? (
                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {rec.entry2} - {rec.exit2}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <span className={`font-black ${
                            hasHours ? 'text-slate-900' : 'text-slate-300'
                          }`}>
                            {hasHours ? `${rec.totalHours?.toFixed(2)}h` : '-'}
                          </span>
                        </td>

                        {/* Tarifa / Subtotal */}
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          {hasHours ? (
                            <div className="leading-tight">
                              <span className="font-extrabold text-slate-900 text-xs">
                                {formatCurrencyWithSymbol(daySubtotal, currency.symbol, currency.code)}
                              </span>
                              <p className="text-[9px] text-slate-500 font-semibold leading-none mt-0.5">
                                {formatCurrencyWithSymbol(dayRate, currency.symbol, currency.code)}/h
                              </p>
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs leading-none">-</span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-xs text-slate-600 max-w-[200px] truncate">
                          {rec.isAbsent ? (
                            <span className="inline-block bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded">
                              Ausente
                            </span>
                          ) : rec.notes ? (
                            <span>{rec.notes}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(dateStr)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                            title="Editar registro del día"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal (for adjustments to historical records) */}
      {editingDateStr && currentExEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Editar Registro · {formatDateDisplay(editingDateStr)}
              </h3>
              <button
                onClick={() => setEditingDateStr(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="mt-4 space-y-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={editIsAbsent}
                  onChange={(e) => setEditIsAbsent(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span>Marcar día como Ausente</span>
              </label>

              {!editIsAbsent && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">1ra Entrada</label>
                      <input
                        type="time"
                        value={editEntry1}
                        onChange={(e) => setEditEntry1(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">1ra Salida</label>
                      <input
                        type="time"
                        value={editExit1}
                        onChange={(e) => setEditExit1(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">2da Entrada</label>
                      <input
                        type="time"
                        value={editEntry2}
                        onChange={(e) => setEditEntry2(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-0.5">2da Salida</label>
                      <input
                        type="time"
                        value={editExit2}
                        onChange={(e) => setEditExit2(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg font-semibold"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Observaciones</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ej. Permiso médico, compensación, etc."
                  className="w-full px-2 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDateStr(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Dates Modal */}
      {editingDatesEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">
                Fechas de Empleo · {editingDatesEmp.name}
              </h3>
              <button
                onClick={() => setEditingDatesEmp(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDates} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de Comienzo en el Trabajo
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Día en que el empleado comenzó a trabajar en la empresa.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Fecha de Salida de la Empresa
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Último día de trabajo o salida de la empresa.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Motivo de Salida (Opcional)
                </label>
                <input
                  type="text"
                  value={editExitReason}
                  onChange={(e) => setEditExitReason(e.target.value)}
                  placeholder="Ej. Renuncia voluntaria, fin de contrato, mutuo acuerdo"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDatesEmp(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                >
                  Guardar Fechas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF / Print Modal */}
      {showPDFModal && currentExEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
          {/* Dedicated print stylesheet for single-page A4 output */}
          <style>{`
            @page {
              size: A4 portrait;
              margin: 5mm 7mm;
            }
            @media print {
              html, body {
                width: 210mm !important;
                height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-a4-ex-monthly-grid, #printable-a4-ex-monthly-grid * {
                visibility: visible !important;
              }
              #printable-a4-ex-monthly-grid {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 4mm 6mm !important;
                background: white !important;
                font-size: 8.5pt !important;
                line-height: 1.15 !important;
                box-sizing: border-box !important;
              }
              .no-print, .print\\:hidden {
                display: none !important;
              }
              .page-break-avoid {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto max-h-[96vh] flex flex-col">
            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white print:hidden">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400">
                  <Printer className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                    <span>Planilla Histórica (PDF / Imprimir)</span>
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Formato A4 (1 Hoja)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {currentExEmp.name} · {formatMonthSpanish(monthStr)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Guardar como PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPDFModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Cerrar vista previa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div id="printable-a4-ex-monthly-grid" className="p-4 sm:p-6 overflow-y-auto space-y-3 bg-white text-slate-800 font-sans text-xs">
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-2.5 page-break-avoid">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-700 block">
                    ARCHIVO HISTÓRICO DE EX EMPLEADOS
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                    Planilla Mensual de Control de Horas
                  </h2>
                  <p className="text-[10px] text-slate-600 font-medium">
                    Registro de turnos, jornadas y liquidación de ex empleado
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-600 shrink-0">
                  <span className="text-sm font-extrabold text-slate-900 capitalize block">
                    {formatMonthSpanish(monthStr)}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Emitido: {formatDateDisplay(getTodayDateStr())}
                  </span>
                </div>
              </div>

              {/* Employee metadata & 5 metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-300 text-[10px] page-break-avoid">
                <div className="border-r border-slate-200 pr-2">
                  <span className="block text-[8.5px] uppercase font-bold text-slate-500">Ex Empleado</span>
                  <span className="font-extrabold text-slate-900 text-xs block truncate">{currentExEmp.name}</span>
                  <span className="text-[9px] text-slate-600 block truncate">{currentExEmp.role}</span>
                  <span className="text-[8.5px] text-slate-500 block">
                    {currentExEmp.startDate ? formatDateDisplay(currentExEmp.startDate) : 'N/D'} al {currentExEmp.endDate ? formatDateDisplay(currentExEmp.endDate) : 'Retirado'}
                  </span>
                </div>

                <div className="border-r border-slate-200 pr-2">
                  <span className="block text-[8.5px] uppercase font-bold text-slate-500">Días Trabajados</span>
                  <p className="font-black text-slate-900 text-base leading-tight mt-0.5">
                    {workedDaysCount} <span className="text-[10px] font-semibold text-slate-600">días</span>
                  </p>
                  <p className="text-[8.5px] text-slate-500">
                    {absentDaysCount > 0 ? `${absentDaysCount} ausencias` : 'Sin ausencias registradas'}
                  </p>
                </div>

                <div className="border-r border-slate-200 pr-2">
                  <span className="block text-[8.5px] uppercase font-bold text-slate-500">Salidas Intermedias</span>
                  <p className="font-black text-amber-700 text-base leading-tight mt-0.5">
                    -{totalDeductedExitsHours.toFixed(2)} <span className="text-[10px] font-semibold">h</span>
                  </p>
                  <p className="text-[8.5px] text-slate-500">
                    {totalIntermediateExitsCount} salidas ({formatHoursReadable(totalDeductedExitsHours)})
                  </p>
                </div>

                <div className="border-r border-slate-200 pr-2 bg-blue-50/60 p-1 rounded-lg">
                  <span className="block text-[8.5px] uppercase font-bold text-blue-700">Total Horas Netas</span>
                  <p className="font-black text-blue-800 text-base leading-tight mt-0.5">
                    {totalMonthHours.toFixed(2)} <span className="text-[10px] font-semibold">h</span>
                  </p>
                  <p className="text-[8.5px] text-blue-600 font-medium">
                    {formatHoursReadable(totalMonthHours)}
                  </p>
                </div>

                <div className="bg-emerald-50/70 p-1 rounded-lg">
                  <span className="block text-[8.5px] uppercase font-bold text-emerald-800">Total a Liquidar</span>
                  <p className="font-black text-emerald-900 text-base leading-tight mt-0.5">
                    {formatCurrencyWithSymbol(estimatedPay, currency.symbol, currency.code)}
                  </p>
                  <p className="text-[8.5px] text-emerald-700 font-semibold truncate">
                    {hasMultipleRatesInMonth ? 'Tarifa escalonada' : `${formatCurrencyWithSymbol(currentExEmp.hourlyRate, currency.symbol, currency.code)}/h`}
                  </p>
                </div>
              </div>

              {/* Rate breakdown notice if multiple rates */}
              {hasMultipleRatesInMonth && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-1.5 text-[9px] text-amber-900 flex items-center justify-between page-break-avoid">
                  <span className="font-bold">⚡ Desglose de Tarifas Aplicadas en el Mes: </span>
                  <span className="font-semibold">
                    {rateBreakdownList.map(r => `${r.hours.toFixed(2)}h a ${formatCurrencyWithSymbol(r.rate, currency.symbol, currency.code)}/h (${formatCurrencyWithSymbol(r.subtotal, currency.symbol, currency.code)})`).join(' · ')}
                  </span>
                </div>
              )}

              {/* Summary table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden page-break-avoid">
                <table className="w-full text-left border-collapse text-[9px] leading-tight">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 uppercase text-[8.5px]">
                      <th className="py-1 px-1.5 border-r border-slate-200">Fecha y Día</th>
                      <th className="py-1 px-1.5 border-r border-slate-200">1er Turno (Mañana)</th>
                      <th className="py-1 px-1.5 border-r border-slate-200">Salidas Intermedias</th>
                      <th className="py-1 px-1.5 border-r border-slate-200">2do Turno (Tarde)</th>
                      <th className="py-1 px-1.5 text-right border-r border-slate-200">Total Horas</th>
                      <th className="py-1 px-1.5 text-right border-r border-slate-200">Tarifa / Subtotal</th>
                      <th className="py-1 px-1.5">Estado / Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allDays.map(dateStr => {
                      const rec = getRecordForDate(dateStr);
                      const sunday = isSunday(dateStr);
                      const dayName = formatDateShortSpanish(dateStr);
                      const dayRate = getEmployeeRateForDate(currentExEmp, dateStr);
                      const daySubtotal = (rec.totalHours || 0) * dayRate;
                      const hasHours = (rec.totalHours || 0) > 0;

                      return (
                        <tr key={dateStr} className={sunday ? 'bg-amber-50/25' : rec.isAbsent ? 'bg-red-50/30' : 'hover:bg-slate-50'}>
                          <td className="py-1 px-1.5 font-bold whitespace-nowrap border-r border-slate-200">
                            {dayName} {sunday && <span className="text-amber-800 text-[8px] font-bold">(Dom)</span>}
                          </td>
                          <td className="py-1 px-1.5 whitespace-nowrap border-r border-slate-200 text-slate-700">
                            {rec.isAbsent ? (
                              <span className="text-red-600 font-semibold italic">Ausente</span>
                            ) : rec.entry1 && rec.exit1 ? (
                              `${rec.entry1} - ${rec.exit1}`
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-1 px-1.5 border-r border-slate-200 text-slate-700">
                            {rec.intermediateExits && rec.intermediateExits.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {rec.intermediateExits.map((x, idx) => (
                                  <span key={idx} className="text-red-700 font-semibold bg-red-50 px-1 rounded text-[8px] border border-red-200">
                                    {x.exitTime}-{x.returnTime}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-1 px-1.5 whitespace-nowrap border-r border-slate-200 text-slate-700">
                            {rec.isAbsent ? (
                              '--'
                            ) : rec.entry2 && rec.exit2 ? (
                              `${rec.entry2} - ${rec.exit2}`
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-1 px-1.5 text-right font-black border-r border-slate-200 whitespace-nowrap">
                            <span className={hasHours ? 'text-slate-900' : 'text-slate-400'}>
                              {hasHours ? `${rec.totalHours?.toFixed(2)} h` : '0.00 h'}
                            </span>
                          </td>
                          <td className="py-1 px-1.5 text-right whitespace-nowrap border-r border-slate-200">
                            {hasHours ? (
                              <div>
                                <span className="font-extrabold text-slate-900">
                                  {formatCurrencyWithSymbol(daySubtotal, currency.symbol, currency.code)}
                                </span>
                                <span className="block text-[8px] text-slate-500 leading-none">
                                  ({formatCurrencyWithSymbol(dayRate, currency.symbol, currency.code)}/h)
                                </span>
                              </div>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-1 px-1.5 text-slate-500 italic truncate max-w-[170px]">
                            {rec.isAbsent ? (
                              <span className="text-red-600 font-semibold not-italic">Falta</span>
                            ) : (
                              rec.notes || '--'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-400 text-[10px]">
                      <td colSpan={2} className="py-1 px-1.5 uppercase font-black text-slate-800 border-r border-slate-300">
                        TOTALES ({allDays.length} DÍAS):
                      </td>
                      <td className="py-1 px-1.5 text-amber-800 font-bold border-r border-slate-300">
                        {totalDeductedExitsHours > 0 ? `-${totalDeductedExitsHours.toFixed(2)} h salidas` : '--'}
                      </td>
                      <td className="py-1 px-1.5 border-r border-slate-300"></td>
                      <td className="py-1 px-1.5 text-right font-black text-blue-800 text-[11px] border-r border-slate-300">
                        {totalMonthHours.toFixed(2)} h
                      </td>
                      <td className="py-1 px-1.5 text-right font-black text-emerald-900 text-[11px] border-r border-slate-300">
                        {formatCurrencyWithSymbol(estimatedPay, currency.symbol, currency.code)}
                      </td>
                      <td className="py-1 px-1.5 text-[9px] text-slate-700 font-bold">
                        {workedDaysCount} días con asistencia
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Cambios de Salario Modal */}
      {showRateHistoryModal && rateModalEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${rateModalEmployee.color || 'bg-slate-700'} text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0`}>
                  {rateModalEmployee.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <span>Historial de Cambios de Salario</span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      Ex Empleado
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {rateModalEmployee.name} · {rateModalEmployee.role}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRateHistoryModal(false);
                  setRateModalEmployee(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Timeline of rate changes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Línea de Tiempo de Tarifas y Aumentos
                </label>

                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {(() => {
                    const history = rateModalEmployee.rateHistory && rateModalEmployee.rateHistory.length > 0
                      ? [...rateModalEmployee.rateHistory].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate))
                      : [
                          {
                            effectiveDate: rateModalEmployee.startDate || '2020-01-01',
                            rate: rateModalEmployee.hourlyRate || 18000,
                            notes: 'Tarifa inicial'
                          }
                        ];

                    return history.map((entry, idx) => {
                      const isLast = idx === history.length - 1;
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                            isLast
                              ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                              : 'bg-slate-50/70 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isLast
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 text-slate-600'
                            }`}>
                              #{idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-slate-900 text-sm">
                                  {formatCurrencyWithSymbol(entry.rate, currency.symbol, currency.code)} / h
                                </span>
                                {isLast && (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.2 rounded">
                                    Última tarifa
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span>Desde: <strong className="text-slate-700">{formatDateDisplay(entry.effectiveDate)}</strong></span>
                                {entry.notes && (
                                  <>
                                    <span>·</span>
                                    <span className="text-slate-600 italic">"{entry.notes}"</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {history.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`¿Eliminar la tarifa de ${formatCurrencyWithSymbol(entry.rate, currency.symbol, currency.code)} vigente desde ${formatDateDisplay(entry.effectiveDate)}?`)) {
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

              {/* Formulario para registrar nuevo aumento o corrección histórica */}
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
                      Fecha desde la cual rige *
                    </label>
                    <input
                      type="date"
                      required
                      value={modalEffectiveDate}
                      onChange={(e) => setModalEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Antes de esta fecha se mantendrá la tarifa anterior
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nueva Tarifa por Hora ({currency.symbol}) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">
                        {currency.symbol}
                      </span>
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
                      Cualquier monto sin restricciones
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
                    placeholder="Ej. Aumento de octubre, ajuste por desempeño, categoría..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Guardar y Aplicar desde Fecha</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end rounded-b-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowRateHistoryModal(false);
                  setRateModalEmployee(null);
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
