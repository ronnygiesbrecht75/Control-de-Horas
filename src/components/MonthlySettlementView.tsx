import React, { useState, useMemo } from 'react';
import { 
  Employee, 
  DailyTimeRecord, 
  MonthlySettlementAdjustment, 
  CurrencyConfig,
  SettlementPeriodType,
  SettlementPeriodConfig
} from '../types';
import { 
  getAllDaysInMonth, 
  formatMonthSpanish, 
  formatHoursReadable, 
  getPrevMonthStr, 
  getNextMonthStr, 
  formatDateFriendlySpanish,
  formatDateRangeSpanish,
  formatCurrencyAmount,
  formatCurrencyWithSymbol,
  getDaysInRange,
  getSettlementPeriods,
  calculateEndDateFor15Days,
  calculateEmployeePeriodEarnings
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
  Calendar,
  Layers,
  Filter,
  Check,
  ChevronDown,
  MessageCircle,
  Phone,
  Send,
  Copy,
  ExternalLink,
  Globe
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
  onUpdateEmployee?: (emp: Employee) => void;
}

// Format phone number for WhatsApp wa.me links
export function formatPhoneNumberForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // If starts with 09 (e.g. 0981 123456 in Paraguay)
  if (digits.startsWith('09') && digits.length >= 9) {
    return '595' + digits.slice(1);
  }
  // If 9 digits starting with 9 (e.g. 981 123456)
  if (digits.startsWith('9') && digits.length === 9) {
    return '595' + digits;
  }
  return digits;
}

// Helper to format hours in German
export function formatHoursReadableGerman(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0 Std. 00 Min.';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours} Std. ${minutes.toString().padStart(2, '0')} Min.`;
}

// Helper to get German period description
export function getGermanPeriodLabel(periodConfig: SettlementPeriodConfig, monthStr: string): string {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const germanMonths = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  const monthName = germanMonths[month - 1] || '';

  if (periodConfig.type === 'quincenal_1') {
    return `1. Monatshälfte (1. bis 15. ${monthName} ${year})`;
  }
  if (periodConfig.type === 'quincenal_2') {
    return `2. Monatshälfte (16. bis ${lastDay}. ${monthName} ${year})`;
  }
  if (periodConfig.type === 'mensual') {
    return `Gesamter Monat (1. bis ${lastDay}. ${monthName} ${year})`;
  }
  return `Zeitraum (${periodConfig.startDate} bis ${periodConfig.endDate})`;
}

// Build professional Spanish or German WhatsApp summary for employee payout
export function buildWhatsAppMessage(
  emp: Employee,
  periodLabel: string,
  stats: { totalHours: number; daysWorked: number },
  adj: MonthlySettlementAdjustment,
  gross: number,
  net: number,
  currency: CurrencyConfig,
  language: 'es' | 'de' = 'es',
  germanPeriodLabel?: string
): string {
  const lines: string[] = [];

  if (language === 'de') {
    lines.push(`📋 *LOHNABRECHNUNG & STUNDENNACHWEIS*`);
    lines.push(`👤 *Mitarbeiter:* ${emp.name}`);
    lines.push(`🗓️ *Abrechnungszeitraum:* ${germanPeriodLabel || periodLabel}`);
    lines.push(`⏱️ *Gearbeitete Tage:* ${stats.daysWorked} Tage`);
    lines.push(`⌛ *Gesamtstunden:* ${stats.totalHours.toFixed(2)} Std. (${formatHoursReadableGerman(stats.totalHours)})`);
    lines.push(`💵 *Stundensatz:* ${formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / Std.`);
    lines.push(`💰 *Zwischensumme Stunden:* ${formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}`);

    if ((adj.bonusAmount || 0) > 0) {
      lines.push(`🎁 *Prämien / Boni:* +${formatCurrencyWithSymbol(adj.bonusAmount, currency.symbol, currency.code)}`);
    }
    if ((adj.advanceAmount || 0) > 0) {
      lines.push(`🔻 *Vorschüsse / Abzüge:* -${formatCurrencyWithSymbol(adj.advanceAmount, currency.symbol, currency.code)}`);
    }

    lines.push(`────────────────────`);
    lines.push(`⭐ *AUSZAHLUNGSBETRAG:* ${formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}`);
    lines.push(`────────────────────`);

    lines.push(`📌 *Status:* ${adj.isPaid ? '✅ Ausbezahlt' : '⏳ Ausstehend'}`);
    if (adj.notes && adj.notes.trim()) {
      lines.push(`📝 *Bemerkung:* ${adj.notes.trim()}`);
    }

    const todayStrDe = new Date().toLocaleDateString('de-DE');
    lines.push(`\n_Abrechnungsbeleg ausgestellt am ${todayStrDe}_`);
  } else {
    lines.push(`📋 *LIQUIDACIÓN Y PAGO DE HORAS*`);
    lines.push(`👤 *Empleado:* ${emp.name}`);
    lines.push(`🗓️ *Período:* ${periodLabel}`);
    lines.push(`⏱️ *Días trabajados:* ${stats.daysWorked} días`);
    lines.push(`⌛ *Total horas:* ${stats.totalHours.toFixed(2)} hs (${formatHoursReadable(stats.totalHours)})`);
    lines.push(`💵 *Tarifa:* ${formatCurrencyWithSymbol(emp.hourlyRate, currency.symbol, currency.code)} / hora`);
    lines.push(`💰 *Subtotal horas:* ${formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}`);

    if ((adj.bonusAmount || 0) > 0) {
      lines.push(`🎁 *Bonificaciones:* +${formatCurrencyWithSymbol(adj.bonusAmount, currency.symbol, currency.code)}`);
    }
    if ((adj.advanceAmount || 0) > 0) {
      lines.push(`🔻 *Adelantos:* -${formatCurrencyWithSymbol(adj.advanceAmount, currency.symbol, currency.code)}`);
    }

    lines.push(`────────────────────`);
    lines.push(`⭐ *TOTAL A COBRAR:* ${formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}`);
    lines.push(`────────────────────`);

    lines.push(`📌 *Estado:* ${adj.isPaid ? '✅ Pagado' : '⏳ Pendiente'}`);
    if (adj.notes && adj.notes.trim()) {
      lines.push(`📝 *Observación:* ${adj.notes.trim()}`);
    }

    const todayStr = new Date().toLocaleDateString('es-PY');
    lines.push(`\n_Comprobante de liquidación emitido el ${todayStr}_`);
  }

  return lines.join('\n');
}

export const MonthlySettlementView: React.FC<MonthlySettlementViewProps> = ({
  monthStr,
  setMonthStr,
  employees,
  records,
  adjustments,
  currency,
  onUpdateEmployeeRate,
  onUpdateAdjustment,
  onUpdateEmployee
}) => {
  const activeEmployees = employees.filter(e => e.active);
  const [selectedReceiptEmp, setSelectedReceiptEmp] = useState<Employee | null>(null);

  // Preferred receipt language: Spanish ('es') or German ('de')
  const [receiptLanguage, setReceiptLanguage] = useState<'es' | 'de'>(() => {
    try {
      return (localStorage.getItem('receipt_language_pref') as 'es' | 'de') || 'es';
    } catch {
      return 'es';
    }
  });

  const handleSetReceiptLanguage = (lang: 'es' | 'de') => {
    setReceiptLanguage(lang);
    try {
      localStorage.setItem('receipt_language_pref', lang);
    } catch {
      // safe fallback
    }
  };

  // WhatsApp dialog state
  const [whatsappModalEmp, setWhatsappModalEmp] = useState<Employee | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState<string>('');
  const [savePhoneToProfile, setSavePhoneToProfile] = useState<boolean>(true);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Period mode selection: 'quincenal_1' | 'quincenal_2' | 'mensual' | 'custom'
  const [selectedPeriodType, setSelectedPeriodType] = useState<SettlementPeriodType>('quincenal_1');
  const [frequencyFilter, setFrequencyFilter] = useState<'all' | 'quincenal' | 'mensual'>('all');

  // Custom date range state (when user selects 'custom' or wants custom 15-day window)
  const defaultPresets = useMemo(() => getSettlementPeriods(monthStr), [monthStr]);
  const [customStart, setCustomStart] = useState<string>(() => defaultPresets[0].startDate);
  const [customEnd, setCustomEnd] = useState<string>(() => defaultPresets[0].endDate);

  // Current active period configuration
  const currentPeriodConfig: SettlementPeriodConfig = useMemo(() => {
    if (selectedPeriodType === 'quincenal_1') {
      return defaultPresets[0]; // 1 al 15
    }
    if (selectedPeriodType === 'quincenal_2') {
      return defaultPresets[1]; // 16 al fin de mes
    }
    if (selectedPeriodType === 'mensual') {
      return defaultPresets[2]; // Mes completo
    }
    // Custom range
    const days = getDaysInRange(customStart, customEnd);
    return {
      type: 'custom',
      label: `Rango Personalizado (${formatDateRangeSpanish(customStart, customEnd)})`,
      shortLabel: `${days.length} días (${customStart.slice(8)} al ${customEnd.slice(8)})`,
      startDate: customStart,
      endDate: customEnd,
      periodKey: `custom_${customStart}_${customEnd}`,
      daysCount: days.length
    };
  }, [selectedPeriodType, defaultPresets, customStart, customEnd]);

  // All dates within the active period
  const periodDays = useMemo(() => {
    return getDaysInRange(currentPeriodConfig.startDate, currentPeriodConfig.endDate);
  }, [currentPeriodConfig]);

  // Quick 15-day calculation for custom range
  const handleSetCustom15Days = (newStartDate: string) => {
    setCustomStart(newStartDate);
    const newEnd = calculateEndDateFor15Days(newStartDate);
    setCustomEnd(newEnd);
  };

  // Helper to compute hours for one employee in the active period
  const getEmployeePeriodStats = (employeeId: string) => {
    let totalHours = 0;
    let daysWorked = 0;
    periodDays.forEach(dateStr => {
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

  // Helper to get adjustment for employee in this specific period
  const getEmployeeAdjustment = (employeeId: string): MonthlySettlementAdjustment => {
    const periodKey = currentPeriodConfig.periodKey;
    
    // Look up by periodKey first
    const foundByPeriod = adjustments.find(
      a => a.employeeId === employeeId && (a.periodKey === periodKey || (currentPeriodConfig.type === 'mensual' && a.monthStr === monthStr && !a.periodKey))
    );
    if (foundByPeriod) return foundByPeriod;

    // Fallback if legacy record exists for monthStr and we are in monthly mode
    if (currentPeriodConfig.type === 'mensual') {
      const foundLegacy = adjustments.find(a => a.employeeId === employeeId && a.monthStr === monthStr);
      if (foundLegacy) return foundLegacy;
    }

    return {
      id: `${employeeId}_${periodKey}`,
      employeeId,
      monthStr,
      periodKey,
      startDate: currentPeriodConfig.startDate,
      endDate: currentPeriodConfig.endDate,
      advanceAmount: 0,
      bonusAmount: 0,
      notes: '',
      isPaid: false
    };
  };

  // Filter employees based on frequency filter
  const displayedEmployees = activeEmployees.filter(emp => {
    if (frequencyFilter === 'all') return true;
    const freq = emp.paymentFrequency || 'mensual';
    return freq === frequencyFilter;
  });

  // Calculate team totals for the selected period
  let teamTotalHours = 0;
  let teamTotalPayroll = 0;
  let teamPaidCount = 0;

  displayedEmployees.forEach(emp => {
    const stats = getEmployeePeriodStats(emp.id);
    const adj = getEmployeeAdjustment(emp.id);
    const earnings = calculateEmployeePeriodEarnings(emp, stats.totalHours);
    const net = earnings.gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
    teamTotalHours += stats.totalHours;
    teamTotalPayroll += Math.max(0, net);
    if (adj.isPaid) teamPaidCount += 1;
  });

  // Handle CSV export
  const handleExportCSV = () => {
    const headers = [
      'Empleado',
      'Cargo',
      'Modalidad',
      'Período',
      'Desde',
      'Hasta',
      'Días Trabajados',
      'Horas Totales',
      'Precio Hora',
      'Subtotal Bruto',
      'Bonos',
      'Adelantos',
      'Total a Pagar (Neto)',
      'Estado'
    ];
    const rows = displayedEmployees.map(emp => {
      const stats = getEmployeePeriodStats(emp.id);
      const adj = getEmployeeAdjustment(emp.id);
      const earnings = calculateEmployeePeriodEarnings(emp, stats.totalHours);
      const net = earnings.gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
      return [
        `"${emp.name}"`,
        `"${emp.role}"`,
        emp.paymentFrequency === 'quincenal' ? 'Quincenal' : 'Mensual',
        `"${currentPeriodConfig.label}"`,
        currentPeriodConfig.startDate,
        currentPeriodConfig.endDate,
        stats.daysWorked,
        stats.totalHours.toFixed(2),
        emp.hourlyRate.toFixed(2),
        earnings.gross.toFixed(2),
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
    link.setAttribute('download', `liquidacion_${currentPeriodConfig.periodKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const triggerPrint = () => {
    window.print();
  };

  const handleEnterNavigation = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.tagName === 'INPUT') {
      const allInputs = Array.from(document.querySelectorAll<HTMLElement>('.settlement-input')).filter(
        el => !el.hasAttribute('disabled')
      );
      const idx = allInputs.indexOf(e.target);
      if (idx >= 0 && idx < allInputs.length - 1) {
        e.preventDefault();
        const next = allInputs[idx + 1];
        next.focus();
        if (next instanceof HTMLInputElement) {
          next.select();
        }
      }
    }
  };

  const handleOpenWhatsAppModal = (emp: Employee) => {
    setWhatsappModalEmp(emp);
    setWhatsappPhone(emp.phone || '');
    setSavePhoneToProfile(true);
    setCopiedSuccess(false);
  };

  const handleSendWhatsApp = () => {
    if (!whatsappModalEmp) return;
    const stats = getEmployeePeriodStats(whatsappModalEmp.id);
    const adj = getEmployeeAdjustment(whatsappModalEmp.id);
    const earnings = calculateEmployeePeriodEarnings(whatsappModalEmp, stats.totalHours);
    const gross = earnings.gross;
    const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);

    const trimmedPhone = whatsappPhone.trim();
    if (savePhoneToProfile && onUpdateEmployee && trimmedPhone && trimmedPhone !== (whatsappModalEmp.phone || '')) {
      onUpdateEmployee({
        ...whatsappModalEmp,
        phone: trimmedPhone
      });
    }

    const germanPeriod = getGermanPeriodLabel(currentPeriodConfig, monthStr);
    const msg = buildWhatsAppMessage(
      whatsappModalEmp,
      currentPeriodConfig.label,
      stats,
      adj,
      gross,
      net,
      currency,
      receiptLanguage,
      germanPeriod
    );

    const formattedPhone = formatPhoneNumberForWhatsApp(trimmedPhone);
    const encodedMsg = encodeURIComponent(msg);
    const url = formattedPhone
      ? `https://wa.me/${formattedPhone}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCopyWhatsAppMessage = () => {
    if (!whatsappModalEmp) return;
    const stats = getEmployeePeriodStats(whatsappModalEmp.id);
    const adj = getEmployeeAdjustment(whatsappModalEmp.id);
    const earnings = calculateEmployeePeriodEarnings(whatsappModalEmp, stats.totalHours);
    const gross = earnings.gross;
    const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);

    const germanPeriod = getGermanPeriodLabel(currentPeriodConfig, monthStr);
    const msg = buildWhatsAppMessage(
      whatsappModalEmp,
      currentPeriodConfig.label,
      stats,
      adj,
      gross,
      net,
      currency,
      receiptLanguage,
      germanPeriod
    );

    navigator.clipboard.writeText(msg);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Period Selector Card - Fixed sticky header */}
      <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Liquidación y Pago de Empleados
                </h2>
                <p className="text-xs text-slate-500">
                  Elija si desea liquidar cada 15 días (quincenal) o cada 30 días (mensual), o defina un rango de fechas personalizado.
                </p>
              </div>
            </div>
          </div>

          {/* Month Picker and CSV Export */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button
                onClick={() => setMonthStr(getPrevMonthStr(monthStr))}
                title="Mes anterior"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="px-3 py-1 font-bold text-sm text-slate-800 capitalize">
                {formatMonthSpanish(monthStr)}
              </div>
              <button
                onClick={() => setMonthStr(getNextMonthStr(monthStr))}
                title="Mes siguiente"
                className="p-1.5 hover:bg-white text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Language Selector for Receipts & WhatsApp */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1 px-2">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Idioma Recibo:</span>
              </span>
              <button
                type="button"
                onClick={() => handleSetReceiptLanguage('es')}
                title="Generar recibos y WhatsApp en Español"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  receiptLanguage === 'es'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇪🇸</span>
                <span>Español</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetReceiptLanguage('de')}
                title="Abrechnungsbelege und WhatsApp auf Deutsch"
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  receiptLanguage === 'de'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>🇩🇪</span>
                <span>Alemán</span>
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* PERIOD CONTROLS BAR: 15 Días vs 30 Días */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Período a Liquidar:
              </span>
            </div>

            {/* Filter by employee frequency */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-slate-400 font-semibold px-2 text-[11px]">Ver:</span>
              <button
                onClick={() => setFrequencyFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  frequencyFilter === 'all'
                    ? 'bg-white text-slate-900 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos ({activeEmployees.length})
              </button>
              <button
                onClick={() => setFrequencyFilter('quincenal')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  frequencyFilter === 'quincenal'
                    ? 'bg-purple-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                Quincenales
              </button>
              <button
                onClick={() => setFrequencyFilter('mensual')}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  frequencyFilter === 'mensual'
                    ? 'bg-blue-600 text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                Mensuales
              </button>
            </div>
          </div>

          {/* Quick Period Buttons: Quincena 1 (1-15), Quincena 2 (16-fin), Mes completo (30 días), Rango libre */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {/* Option 1: 1a Quincena */}
            <button
              type="button"
              onClick={() => setSelectedPeriodType('quincenal_1')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPeriodType === 'quincenal_1'
                  ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase ${
                  selectedPeriodType === 'quincenal_1' ? 'text-purple-800' : 'text-slate-700'
                }`}>
                  1ª Quincena (15 días)
                </span>
                {selectedPeriodType === 'quincenal_1' && (
                  <Check className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Día 1 al 15 de {formatMonthSpanish(monthStr).split(' ')[0]}
              </p>
            </button>

            {/* Option 2: 2a Quincena */}
            <button
              type="button"
              onClick={() => setSelectedPeriodType('quincenal_2')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPeriodType === 'quincenal_2'
                  ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase ${
                  selectedPeriodType === 'quincenal_2' ? 'text-purple-800' : 'text-slate-700'
                }`}>
                  2ª Quincena ({defaultPresets[1].daysCount} días)
                </span>
                {selectedPeriodType === 'quincenal_2' && (
                  <Check className="w-4 h-4 text-purple-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Día 16 al {defaultPresets[1].endDate.slice(8)} de {formatMonthSpanish(monthStr).split(' ')[0]}
              </p>
            </button>

            {/* Option 3: Mes completo (30 días) */}
            <button
              type="button"
              onClick={() => setSelectedPeriodType('mensual')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPeriodType === 'mensual'
                  ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase ${
                  selectedPeriodType === 'mensual' ? 'text-blue-800' : 'text-slate-700'
                }`}>
                  Mes Completo (30 días)
                </span>
                {selectedPeriodType === 'mensual' && (
                  <Check className="w-4 h-4 text-blue-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Todo el mes ({defaultPresets[2].daysCount} días calendario)
              </p>
            </button>

            {/* Option 4: Custom 15-day range */}
            <button
              type="button"
              onClick={() => setSelectedPeriodType('custom')}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPeriodType === 'custom'
                  ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-black uppercase ${
                  selectedPeriodType === 'custom' ? 'text-amber-800' : 'text-slate-700'
                }`}>
                  Rango Personalizado
                </span>
                {selectedPeriodType === 'custom' && (
                  <Check className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Elegir 15 días en calendario
              </p>
            </button>
          </div>

          {/* If Custom Date Range is selected, show calendar date pickers */}
          {selectedPeriodType === 'custom' && (
            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200 flex flex-wrap items-center gap-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-900">Desde:</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => handleSetCustom15Days(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900">Hasta:</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSetCustom15Days(customStart)}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Fijar exactamente a 15 días
              </button>

              <span className="text-xs text-amber-700 font-semibold">
                (Total: {periodDays.length} días seleccionados)
              </span>
            </div>
          )}

          {/* Active Period Alert Banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-700">
                Liquidando actualmente:
              </span>
              <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-md border border-slate-200">
                {currentPeriodConfig.label}
              </span>
              <span className="text-slate-500">
                ({periodDays.length} días en cómputo)
              </span>
            </div>
          </div>
        </div>

        {/* Global Stats Grid for Current Period */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200/70">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Horas Período ({currentPeriodConfig.shortLabel})
            </span>
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
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
              Monto a Pagar en este Período
            </span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-blue-900">
                {formatCurrencyWithSymbol(teamTotalPayroll, currency.symbol, currency.code)}
              </span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Estado de Pagos
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-2xl font-black text-emerald-900">
                {teamPaidCount} / {displayedEmployees.length}
              </span>
              <span className="text-xs font-semibold text-emerald-700">
                empleados liquidados en este período
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Settlement Cards */}
      <div className="space-y-4">
        {displayedEmployees.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <DollarSign className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No hay empleados para este filtro</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Cambie el filtro de frecuencia o registre nuevos empleados en la pestaña "Empleados".
            </p>
          </div>
        ) : (
          displayedEmployees.map(emp => {
            const stats = getEmployeePeriodStats(emp.id);
            const adj = getEmployeeAdjustment(emp.id);
            const earnings = calculateEmployeePeriodEarnings(emp, stats.totalHours);
            const gross = earnings.gross;
            const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
            const isQuincenal = emp.paymentFrequency === 'quincenal';

            return (
              <div
                key={`${emp.id}_${currentPeriodConfig.periodKey}`}
                className={`bg-white rounded-2xl border transition-all ${
                  adj.isPaid
                    ? 'border-emerald-300 bg-emerald-50/15 shadow-sm'
                    : 'border-slate-200 shadow-sm hover:border-slate-300'
                } p-4 sm:p-6`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Employee header and status */}
                  <div className="flex items-start justify-between lg:w-60 xl:w-68 shrink-0">
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

                        {/* Phone indicator */}
                        <div className="mt-1">
                          {emp.phone ? (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppModal(emp)}
                              title="Enviar liquidación a este número por WhatsApp"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/80 transition-colors cursor-pointer"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{emp.phone}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsAppModal(emp)}
                              title="Asignar celular para enviar por WhatsApp"
                              className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 italic transition-colors cursor-pointer"
                            >
                              <Phone className="w-2.5 h-2.5" />
                              <span>Sin celular (clic para asignar)</span>
                            </button>
                          )}
                        </div>

                        {/* Frequency tag */}
                        <div className="mt-1">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            isQuincenal 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {isQuincenal ? 'Pago Quincenal (15 días)' : 'Pago Mensual (30 días)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                            {stats.daysWorked} días trab.
                          </span>
                          
                          {/* Status Toggle Button for this period */}
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateAdjustment({
                                ...adj,
                                periodKey: currentPeriodConfig.periodKey,
                                startDate: currentPeriodConfig.startDate,
                                endDate: currentPeriodConfig.endDate,
                                isPaid: !adj.isPaid,
                                paidAt: !adj.isPaid ? new Date().toISOString() : undefined
                              });
                            }}
                            title={adj.isPaid ? 'Marcar como pendiente este período' : 'Marcar período como pagado'}
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

                  {/* Calculation Fields: Hours in Period, Rate/Proportional Base, Advances, Bonuses */}
                  <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/90 p-4 rounded-xl border border-slate-200/80">
                    {/* 1. Hours in Period */}
                    <div className="flex flex-col justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        1. Horas Período
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

                    {/* 2. Rate / Proportional Calculation */}
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
                          step={currency.code === 'PYG' ? '500' : '0.5'}
                          min="0"
                          value={emp.hourlyRate || ''}
                          onKeyDown={handleEnterNavigation}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateEmployeeRate(emp.id, isNaN(val) ? 0 : val);
                          }}
                          className="settlement-input w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold truncate" title={earnings.detail}>
                        Bruto: {formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}
                      </span>
                    </div>

                    {/* 3. Advances for this period */}
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
                          onKeyDown={handleEnterNavigation}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateAdjustment({
                              ...adj,
                              periodKey: currentPeriodConfig.periodKey,
                              startDate: currentPeriodConfig.startDate,
                              endDate: currentPeriodConfig.endDate,
                              advanceAmount: isNaN(val) ? 0 : val
                            });
                          }}
                          placeholder="0"
                          className="settlement-input w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium truncate">
                        Resta a este período
                      </span>
                    </div>

                    {/* 4. Bonuses for this period */}
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
                          onKeyDown={handleEnterNavigation}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateAdjustment({
                              ...adj,
                              periodKey: currentPeriodConfig.periodKey,
                              startDate: currentPeriodConfig.startDate,
                              endDate: currentPeriodConfig.endDate,
                              bonusAmount: isNaN(val) ? 0 : val
                            });
                          }}
                          placeholder="0"
                          className="settlement-input w-full pl-7 pr-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium truncate">
                        Suma a este período
                      </span>
                    </div>
                  </div>

                  {/* NET PAY & Actions (Receipt + WhatsApp) */}
                  <div className="flex lg:flex-col items-center lg:items-end justify-between border-t lg:border-t-0 pt-3.5 lg:pt-0 border-slate-100 lg:w-52 xl:w-60 shrink-0 gap-2">
                    <div className="text-left lg:text-right">
                      <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Arreglo a Pagar
                      </span>
                      <div className="text-2xl font-black text-blue-900 tracking-tight mt-0.5">
                        {formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 w-full lg:w-full mt-0 lg:mt-2">
                      {/* Quick language toggle for this receipt / WhatsApp */}
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 w-full px-0.5">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Globe className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Idioma:</span>
                        </span>
                        <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => handleSetReceiptLanguage('es')}
                            title="Recibo y WhatsApp en Español"
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                              receiptLanguage === 'es'
                                ? 'bg-blue-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🇪🇸 Español
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetReceiptLanguage('de')}
                            title="Beleg und WhatsApp auf Deutsch"
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition-all cursor-pointer ${
                              receiptLanguage === 'de'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            🇩🇪 Alemán
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedReceiptEmp(emp)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer w-full"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{receiptLanguage === 'de' ? 'Beleg anzeigen / Drucken' : 'Ver Recibo / Imprimir'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenWhatsAppModal(emp)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer w-full"
                        title={emp.phone ? `Enviar liquidación a ${emp.phone}` : 'Enviar liquidación por WhatsApp'}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>
                          {receiptLanguage === 'de' 
                            ? 'WhatsApp senden (🇩🇪 Alemán)' 
                            : 'Enviar por WhatsApp (🇪🇸 Español)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Optional Settlement Note */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold shrink-0">Nota de este período:</span>
                  <input
                    type="text"
                    value={adj.notes || ''}
                    onKeyDown={handleEnterNavigation}
                    onChange={(e) => {
                      onUpdateAdjustment({
                        ...adj,
                        periodKey: currentPeriodConfig.periodKey,
                        startDate: currentPeriodConfig.startDate,
                        endDate: currentPeriodConfig.endDate,
                        notes: e.target.value
                      });
                    }}
                    placeholder={`Observación opcional para ${currentPeriodConfig.shortLabel}...`}
                    className="settlement-input flex-1 text-xs text-slate-600 placeholder:text-slate-400 bg-transparent focus:outline-none"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceiptEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 print:shadow-none print:border-none print:max-w-none print:w-full print:rounded-none">
            {/* Modal Top actions (hidden on print) */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>
                    {receiptLanguage === 'de'
                      ? 'Lohn- & Stundenabrechnung'
                      : 'Recibo Oficial de Liquidación de Horas'}
                  </span>
                </h3>

                {/* Quick language toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSetReceiptLanguage('es')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      receiptLanguage === 'es'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🇪🇸</span>
                    <span>Español</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetReceiptLanguage('de')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      receiptLanguage === 'de'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>🇩🇪</span>
                    <span>Deutsch</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenWhatsAppModal(selectedReceiptEmp)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                  title="Enviar este recibo por WhatsApp al empleado"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>{receiptLanguage === 'de' ? 'Drucken / PDF' : 'Imprimir Recibo'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptEmp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
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
                    {receiptLanguage === 'de'
                      ? 'LOHN- UND STUNDENABRECHNUNG'
                      : 'LIQUIDACIÓN Y ARREGLO DE HORAS'}
                  </h1>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    {receiptLanguage === 'de' ? 'Abrechnungszeitraum: ' : 'Período: '}
                    <span className="text-slate-900 font-bold">
                      {receiptLanguage === 'de'
                        ? getGermanPeriodLabel(currentPeriodConfig, monthStr)
                        : currentPeriodConfig.label}
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-300 uppercase">
                    {receiptLanguage === 'de' ? 'ZAHLUNGSBELEG' : 'COMPROBANTE DE PAGO'}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {receiptLanguage === 'de'
                      ? `Ausstellungsdatum: ${new Date().toLocaleDateString('de-DE')}`
                      : `Fecha de emisión: ${new Date().toLocaleDateString('es')}`}
                  </p>
                </div>
              </div>

              {/* Employee & Compensation Details box */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-400">
                    {receiptLanguage === 'de' ? 'Mitarbeiterdaten' : 'Datos del Empleado'}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedReceiptEmp.name}</p>
                  <p className="text-indigo-700 font-semibold mt-0.5">
                    {receiptLanguage === 'de'
                      ? `Zahlungsmodus: ${selectedReceiptEmp.paymentFrequency === 'quincenal' ? '14-tägig (Quincenal)' : 'Monatlich (Mensual)'}`
                      : `Modalidad: ${selectedReceiptEmp.paymentFrequency === 'quincenal' ? 'Quincenal (Cada 15 días)' : 'Mensual (Cada 30 días)'}`}
                  </p>
                  {selectedReceiptEmp.phone && (
                    <p className="text-slate-500 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedReceiptEmp.phone}
                    </p>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-bold uppercase text-slate-400">
                    {receiptLanguage === 'de' ? 'Gehaltskonditionen' : 'Condiciones Salariales'}
                  </span>
                  <p className="text-slate-700 font-medium mt-0.5">
                    {receiptLanguage === 'de' ? 'Vereinbarter Stundensatz: ' : 'Tarifa pactada: '}
                    <strong className="text-slate-900">
                      {formatCurrencyWithSymbol(selectedReceiptEmp.hourlyRate, currency.symbol, currency.code)}{' '}
                      {receiptLanguage === 'de' ? 'pro Std.' : 'por hora'}
                    </strong>
                  </p>
                  {selectedReceiptEmp.monthlyBaseSalary && (
                    <p className="text-slate-500 mt-0.5">
                      {receiptLanguage === 'de' ? 'Monatliches Grundgehalt: ' : 'Sueldo mensual base: '}
                      {formatCurrencyWithSymbol(selectedReceiptEmp.monthlyBaseSalary, currency.symbol, currency.code)}
                    </p>
                  )}
                </div>
              </div>

              {/* Breakdown Table */}
              {(() => {
                const stats = getEmployeePeriodStats(selectedReceiptEmp.id);
                const adj = getEmployeeAdjustment(selectedReceiptEmp.id);
                const earnings = calculateEmployeePeriodEarnings(selectedReceiptEmp, stats.totalHours);
                const gross = earnings.gross;
                const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);

                return (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase">
                          <th className="py-2.5 px-3">
                            {receiptLanguage === 'de' ? 'Bezeichnung' : 'Concepto'}
                          </th>
                          <th className="py-2.5 px-3 text-center">
                            {receiptLanguage === 'de' ? 'Menge' : 'Cantidad'}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {receiptLanguage === 'de' ? 'Einheitspreis' : 'Valor Unitario'}
                          </th>
                          <th className="py-2.5 px-3 text-right">
                            {receiptLanguage === 'de' ? 'Zwischensumme' : 'Subtotal'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {receiptLanguage === 'de'
                              ? `Geleistete Arbeitsstunden im Zeitraum (${stats.daysWorked} Tage)`
                              : `Horas Trabajadas en el Período (${stats.daysWorked} días)`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700">
                            {stats.totalHours.toFixed(2)} h (
                            {receiptLanguage === 'de'
                              ? formatHoursReadableGerman(stats.totalHours)
                              : formatHoursReadable(stats.totalHours)}
                            )
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {formatCurrencyWithSymbol(selectedReceiptEmp.hourlyRate, currency.symbol, currency.code)} /{' '}
                            {receiptLanguage === 'de' ? 'Std.' : 'h'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {formatCurrencyWithSymbol(gross, currency.symbol, currency.code)}
                          </td>
                        </tr>
                        {(adj.bonusAmount || 0) > 0 && (
                          <tr className="bg-emerald-50/50">
                            <td className="py-2.5 px-3 font-semibold text-emerald-900" colSpan={3}>
                              {receiptLanguage === 'de'
                                ? '(+) Prämien / Boni in diesem Zeitraum'
                                : '(+) Bonificaciones / Premios de este período'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                              + {formatCurrencyWithSymbol(adj.bonusAmount || 0, currency.symbol, currency.code)}
                            </td>
                          </tr>
                        )}
                        {(adj.advanceAmount || 0) > 0 && (
                          <tr className="bg-red-50/50">
                            <td className="py-2.5 px-3 font-semibold text-red-900" colSpan={3}>
                              {receiptLanguage === 'de'
                                ? '(-) Vorschüsse / Abschlagszahlungen in diesem Zeitraum'
                                : '(-) Adelantos o retiros a cuenta en este período'}
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
                            {receiptLanguage === 'de'
                              ? 'NETTO-AUSZAHLUNGSBETRAG'
                              : `TOTAL NETO A PAGAR (${currentPeriodConfig.shortLabel})`}
                          </td>
                          <td className="py-3 px-3 text-right text-base text-blue-300 font-black">
                            {formatCurrencyWithSymbol(Math.max(0, net), currency.symbol, currency.code)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    {adj.notes && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                        <strong className="text-slate-800">
                          {receiptLanguage === 'de' ? 'Bemerkungen:' : 'Observaciones:'}
                        </strong>{' '}
                        {adj.notes}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Close button at bottom (hidden on print) */}
            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setSelectedReceiptEmp(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {receiptLanguage === 'de' ? 'Schließen' : 'Cerrar'}
              </button>
              <button
                type="button"
                onClick={() => handleOpenWhatsAppModal(selectedReceiptEmp)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
              <button
                type="button"
                onClick={triggerPrint}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{receiptLanguage === 'de' ? 'Drucken / PDF' : 'Imprimir / Guardar PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Send Modal */}
      {whatsappModalEmp && (() => {
        const stats = getEmployeePeriodStats(whatsappModalEmp.id);
        const adj = getEmployeeAdjustment(whatsappModalEmp.id);
        const earnings = calculateEmployeePeriodEarnings(whatsappModalEmp, stats.totalHours);
        const gross = earnings.gross;
        const net = gross + (adj.bonusAmount || 0) - (adj.advanceAmount || 0);
        const germanPeriod = getGermanPeriodLabel(currentPeriodConfig, monthStr);
        const previewMsg = buildWhatsAppMessage(
          whatsappModalEmp,
          currentPeriodConfig.label,
          stats,
          adj,
          gross,
          net,
          currency,
          receiptLanguage,
          germanPeriod
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Top */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Enviar Liquidación por WhatsApp
                    </h3>
                    <p className="text-xs text-slate-500">
                      {whatsappModalEmp.name} • {currentPeriodConfig.shortLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappModalEmp(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* 1. Language Selector: Español vs Alemán (Prominent first step) */}
                <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-emerald-50/80 p-3.5 rounded-xl border-2 border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-emerald-600" />
                      <span>1. Elige el Idioma del Recibo / Belegsprache</span>
                    </label>
                    <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs">
                      {receiptLanguage === 'es' ? '🇪🇸 Español activo' : '🇩🇪 Deutsch aktiv'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => handleSetReceiptLanguage('es')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        receiptLanguage === 'es'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm ring-2 ring-blue-300'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl leading-none">🇪🇸</span>
                      <div className="text-left">
                        <div className="leading-tight">Español</div>
                        <div className="text-[10px] font-normal opacity-90">Recibo en español</div>
                      </div>
                      {receiptLanguage === 'es' && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetReceiptLanguage('de')}
                      className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 text-xs font-black transition-all cursor-pointer ${
                        receiptLanguage === 'de'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-300'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl leading-none">🇩🇪</span>
                      <div className="text-left">
                        <div className="leading-tight">Alemán</div>
                        <div className="text-[10px] font-normal opacity-90">Deutsch</div>
                      </div>
                      {receiptLanguage === 'de' && <Check className="w-4 h-4 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* 2. Employee Phone Input */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    2. Número de Celular (WhatsApp)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      placeholder="Ej: 0981 123 456 o +595981123456"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="savePhoneCheck"
                      type="checkbox"
                      checked={savePhoneToProfile}
                      onChange={(e) => setSavePhoneToProfile(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="savePhoneCheck" className="text-xs text-slate-600 select-none cursor-pointer">
                      Guardar este número en la ficha del empleado
                    </label>
                  </div>
                </div>

                {/* Message preview styled like WhatsApp */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Vista Previa del Mensaje
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppMessage}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer"
                    >
                      {copiedSuccess ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar texto</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="bg-[#EFEAE2] p-3.5 rounded-xl border border-emerald-900/10 max-h-56 overflow-y-auto">
                    <div className="bg-white rounded-lg p-3 shadow-xs border border-slate-200/60 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                      {previewMsg}
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setWhatsappModalEmp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Abrir WhatsApp y Enviar 📲</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
