import React, { useState } from 'react';
import { 
  Employee, 
  DailyTimeRecord, 
  MonthlySettlementAdjustment, 
  CurrencyConfig 
} from '../types';
import { 
  getAllDaysInMonth, 
  formatMonthSpanish, 
  formatHoursReadable, 
  getPrevMonthStr, 
  getNextMonthStr, 
  formatDateFriendlySpanish,
  formatCurrencyAmount,
  formatCurrencyWithSymbol
} from '../utils/timeUtils';
import { 
  DollarSign, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Download, 
  CheckCircle2, 
  Circle, 
  Clock, 
  FileText, 
  X, 
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface MonthlySettlementViewProps {
  monthStr: string;
  setMonthStr: (month: string) => void;
  employees: Employee[];
  records: DailyTimeRecord[];
  adjustments: MonthlySettlementAdjustment[];
  currency: CurrencyConfig;
  onUpdateEmployeeRate: (employeeId: string, newRate: number) => void;
  onUpdateAdjustment: (adj: MonthlySettlementAdjustment) => void;
}

export const MonthlySettlementView: React.FC<MonthlySettlementViewProps> = ({
  monthStr,
  setMonthStr,
  employees,
  records,
  adjustments,
  currency,
  onUpdateEmployeeRate,
  onUpdateAdjustment
}) => {
  const activeEmployees = employees.filter(e => e.active);
  const [selectedReceiptEmp, setSelectedReceiptEmp] = useState<Employee | null>(null);

  const allDays = getAllDaysInMonth(monthStr);

  // Helper to compute hours for one employee in the month
  const getEmployeeMonthStats = (employeeId: string) => {
    let totalHours = 0;
    let daysWorked = 0;
    allDays.forEach(dateStr => {
      const id = `${employeeId}_${dateStr}`;
      const rec = records.find(r => r.id === id || (r.employeeId === employeeId && r.dateStr === dateStr));
      if (rec && rec.totalHours && rec.totalHours > 0) {
        totalHours += rec.totalHours;
        if (!rec.isAbsent) {
          daysWorked += 1;
        }
      }
    });
    return {
      totalHours: Number(totalHours.toFixed(2)),
      daysWorked
    };
  };

  // Helper to get adjustment for employee in this month
  const getEmployeeAdjustment = (employeeId: string): MonthlySettlementAdjustment => {
    const found = adjustments.find(a => a.employeeId === employeeId && a.monthStr === monthStr);
    if (found) return found;
    return {
      id: `${employeeId}_${monthStr}`,
      employeeId,
      monthStr,
      advanceAmount: 0,
      bonusAmount: 0,
      notes: '',
      isPaid: false
    };
  };

  // Calculate global totals for the entire team
  let teamTotalHours = 0;
  let teamTotalPayroll = 0;
  let teamPaidCount = 0;

  activeEmployees.forEach(emp => {
    const stats = getEmployeeMonthStats(emp.id);
    const adj = getEmployeeAdjustment(emp.id);
    const gross = stats.totalHours * (emp.hourlyRate || 0);
    const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
    teamTotalHours += stats.totalHours;
    teamTotalPayroll += Math.max(0, net);
    if (adj.isPaid) teamPaidCount += 1;
  });

  // Handle CSV export
  const handleExportCSV = () => {
    const headers = [
      'Empleado',
      'Cargo',
      'Mes',
      'Días Trabajados',
      'Horas Totales',
      'Precio Hora',
      'Subtotal Bruto',
      'Bonos',
      'Adelantos',
      'Arreglo a Pagar (Neto)',
      'Estado'
    ];
    const rows = activeEmployees.map(emp => {
      const stats = getEmployeeMonthStats(emp.id);
      const adj = getEmployeeAdjustment(emp.id);
      const gross = stats.totalHours * emp.hourlyRate;
      const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
      return [
        `"${emp.name}"`,
        `"${emp.role}"`,
        monthStr,
        stats.daysWorked,
        stats.totalHours.toFixed(2),
        emp.hourlyRate.toFixed(2),
        gross.toFixed(2),
        (adj.bonusAmount || 0).toFixed(2),
        (adj.advanceAmount || 0).toFixed(2),
        Math.max(0, net).toFixed(2),
        adj.isPaid ? 'Pagado' : 'Pendiente'
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `arreglo_pago_${monthStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Arreglo de Fin de Mes ({formatMonthSpanish(monthStr)})
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Suma automática del mes, descuento de adelantos y cálculo final del pago para cada empleado.
            </p>
          </div>

          {/* Month Picker and CSV Export */}
          <div className="flex flex-wrap items-center gap-3">
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

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Horas del Equipo</span>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-black text-slate-900">
                {teamTotalHours.toFixed(2)} h
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                ({formatHoursReadable(teamTotalHours)})
              </span>
            </div>
          </div>

          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total a Pagar ({formatMonthSpanish(monthStr)})</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-blue-900">
                {formatCurrencyWithSymbol(teamTotalPayroll, currency.symbol, currency.code)}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Estado de Liquidación</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-2xl font-black text-emerald-900">
                {teamPaidCount} / {activeEmployees.length}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                empleados liquidados
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Settlement Cards */}
      <div className="space-y-4">
        {activeEmployees.map(emp => {
          const stats = getEmployeeMonthStats(emp.id);
          const adj = getEmployeeAdjustment(emp.id);
          const gross = stats.totalHours * (emp.hourlyRate || 0);
          const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);

          return (
            <div
              key={emp.id}
              className={`bg-white rounded-2xl border transition-all ${
                adj.isPaid
                  ? 'border-emerald-300 bg-emerald-50/15 shadow-sm'
                  : 'border-slate-200 shadow-sm hover:border-slate-300'
              } p-4 sm:p-6`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                {/* Employee header and status */}
                <div className="flex items-start justify-between lg:w-56 xl:w-64 shrink-0">
                  <div className="flex items-start space-x-3.5">
                    <div className={`w-12 h-12 rounded-2xl ${emp.color || 'bg-blue-600'} text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0 mt-0.5`}>
                      {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                          {emp.name}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {emp.role}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                          {stats.daysWorked} días
                        </span>
                        
                        {/* Status Toggle Button */}
                        <button
                          onClick={() => {
                            onUpdateAdjustment({
                              ...adj,
                              isPaid: !adj.isPaid,
                              paidAt: !adj.isPaid ? new Date().toISOString() : undefined
                            });
                          }}
                          title={adj.isPaid ? 'Marcar como pendiente' : 'Marcar arreglo como pagado'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                            adj.isPaid
                              ? 'bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {adj.isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                              <span>Pagado</span>
                            </>
                          ) : (
                            <>
                              <Circle className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Pendiente</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Calculation Fields: Hours, Rate, Advance, Bonus */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                  {/* 1. Total Hours */}
                  <div className="flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      1. Horas Mes
                    </span>
                    <div className="my-1">
                      <span className="text-base font-extrabold text-blue-700">
                        {stats.totalHours.toFixed(2)} h
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium truncate">
                      {formatHoursReadable(stats.totalHours)}
                    </span>
                  </div>

                  {/* 2. Hourly Rate */}
                  <div className="flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      2. Precio / Hora
                    </span>
                    <div className="relative my-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-500 font-bold pointer-events-none">
                        {currency.symbol}
                      </span>
                      <input
                        type="number"
                        step="500"
                        min="0"
                        value={emp.hourlyRate || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateEmployeeRate(emp.id, isNaN(val) ? 0 : val);
                        }}
                        className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-500 font-semibold truncate">
                      Bruto: {formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}
                    </span>
                  </div>

                  {/* 3. Advances (Adelantos) */}
                  <div className="flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">
                      3. Adelantos (-)
                    </span>
                    <div className="relative my-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-red-500 font-bold pointer-events-none">
                        {currency.symbol}
                      </span>
                      <input
                        type="number"
                        step="10000"
                        min="0"
                        value={adj.advanceAmount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateAdjustment({
                            ...adj,
                            advanceAmount: isNaN(val) ? 0 : val
                          });
                        }}
                        placeholder="0"
                        className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium truncate">
                      Se resta al pago
                    </span>
                  </div>

                  {/* 4. Bonuses / Extras */}
                  <div className="flex flex-col justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                      4. Bonos (+)
                    </span>
                    <div className="relative my-1">
                      <span className="absolute left-2.5 top-1.5 text-xs text-emerald-600 font-bold pointer-events-none">
                        {currency.symbol}
                      </span>
                      <input
                        type="number"
                        step="10000"
                        min="0"
                        value={adj.bonusAmount || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          onUpdateAdjustment({
                            ...adj,
                            bonusAmount: isNaN(val) ? 0 : val
                          });
                        }}
                        placeholder="0"
                        className="w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium truncate">
                      Se suma al pago
                    </span>
                  </div>
                </div>

                {/* NET PAY & Printable Receipt Button */}
                <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3.5 lg:pt-0 border-slate-100 lg:w-48 xl:w-56 shrink-0">
                  <div className="text-left lg:text-right">
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Arreglo a Pagar
                    </span>
                    <div className="text-2xl font-black text-blue-900 tracking-tight mt-0.5">
                      {formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedReceiptEmp(emp)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm mt-0 lg:mt-3 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Recibo / Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Optional Settlement Note */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                <span className="text-xs text-slate-400 font-semibold shrink-0">Nota de liquidación:</span>
                <input
                  type="text"
                  value={adj.notes || ''}
                  onChange={(e) => {
                    onUpdateAdjustment({
                      ...adj,
                      notes: e.target.value
                    });
                  }}
                  placeholder="Ej. Se pagó en efectivo el día 30, incluye horas extras del taller..."
                  className="flex-1 text-xs text-slate-600 placeholder:text-slate-400 bg-transparent focus:outline-none font-medium"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceiptEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none">
            {/* Modal Top actions (hidden on print) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6 print:hidden">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Recibo Oficial de Arreglo de Horas</span>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Recibo</span>
                </button>
                <button
                  onClick={() => setSelectedReceiptEmp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* RECEIPT CONTENT (This prints cleanly) */}
            <div className="space-y-6">
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">
                    LIQUIDACIÓN Y ARREGLO DE HORAS
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Período: <span className="text-slate-900 font-bold capitalize">{formatMonthSpanish(monthStr)}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-300 uppercase">
                    COMPROBANTE DE PAGO
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fecha de emisión: {new Date().toLocaleDateString('es')}
                  </p>
                </div>
              </div>

              {/* Employee & Employer Details box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-400">
                    Datos del Empleado
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceiptEmp.name}</p>
                  <p className="text-slate-600">{selectedReceiptEmp.role}</p>
                  {selectedReceiptEmp.phone && (
                    <p className="text-slate-500 mt-0.5">{selectedReceiptEmp.phone}</p>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-400">
                    Acuerdo de Trabajo
                  </span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    Jornada: 2 Turnos de Entrada / Salida
                  </p>
                  <p className="text-slate-600">
                    Tarifa pactada: <strong>{formatCurrencyWithSymbol(selectedReceiptEmp.hourlyRate, currency.symbol, currency.code)} por hora</strong>
                  </p>
                </div>
              </div>

              {/* Breakdown Table */}
              {(() => {
                const stats = getEmployeeMonthStats(selectedReceiptEmp.id);
                const adj = getEmployeeAdjustment(selectedReceiptEmp.id);
                const gross = stats.totalHours * selectedReceiptEmp.hourlyRate;
                const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);

                return (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                          <th className="py-2.5 px-3">Concepto</th>
                          <th className="py-2.5 px-3 text-center">Cantidad</th>
                          <th className="py-2.5 px-3 text-right">Valor Unitario</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            Horas Trabajadas en el Mes ({stats.daysWorked} días)
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                            {stats.totalHours.toFixed(2)} h ({formatHoursReadable(stats.totalHours)})
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatCurrencyWithSymbol(selectedReceiptEmp.hourlyRate, currency.symbol, currency.code)} / h
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}
                          </td>
                        </tr>
                        {(adj.bonusAmount || 0) > 0 && (
                          <tr className="bg-emerald-50/50">
                            <td className="py-2.5 px-3 font-semibold text-emerald-900" colSpan={3}>
                              (+) Bonificaciones / Premios adicionales
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              + {formatCurrencyWithSymbol(adj.bonusAmount || 0, currency.symbol, currency.code)}
                            </td>
                          </tr>
                        )}
                        {(adj.advanceAmount || 0) > 0 && (
                          <tr className="bg-red-50/50">
                            <td className="py-2.5 px-3 font-semibold text-red-900" colSpan={3}>
                              (-) Adelantos o retiros a cuenta durante el mes
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-red-700">
                              - {formatCurrencyWithSymbol(adj.advanceAmount || 0, currency.symbol, currency.code)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white font-extrabold text-sm">
                          <td className="py-3 px-3 uppercase" colSpan={3}>
                            TOTAL NETO A PAGAR (ARREGLO FINAL)
                          </td>
                          <td className="py-3 px-3 text-right text-base text-blue-300 font-black">
                            {formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {adj.notes && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                        <strong className="text-slate-800">Observaciones:</strong> {adj.notes}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Signature Blocks */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-center text-xs">
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Firma del Empleador</p>
                  <p className="text-slate-500 text-[11px]">Entrega de arreglo mensual</p>
                </div>
                <div className="border-t border-slate-400 pt-2">
                  <p className="font-bold text-slate-900">Firma del Empleado ({selectedReceiptEmp.name})</p>
                  <p className="text-slate-500 text-[11px]">Recibí conforme el arreglo y pago del mes</p>
                </div>
              </div>
            </div>

            {/* Close button at bottom (hidden on print) */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end gap-2 print:hidden">
              <button
                onClick={() => setSelectedReceiptEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={triggerPrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
