import { SettlementPeriodConfig, Employee, TimeInterval, DailyTimeRecord, IntermediateExit } from '../types';

/**
 * Convert time string "HH:MM" to total minutes from midnight.
 * Returns 0 if invalid or empty.
 */
export function timeToMinutes(timeStr?: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Calculate duration in hours between entry and exit time strings.
 * Handles cases where exit might be after midnight (e.g., entry 22:00, exit 02:00 -> 4 hours)
 */
export function calculateShiftHours(entry?: string, exit?: string): number {
  if (!entry || !exit) return 0;
  const startMins = timeToMinutes(entry);
  const endMins = timeToMinutes(exit);
  if (startMins === 0 && endMins === 0) return 0;
  
  let diffMins = endMins - startMins;
  if (diffMins < 0) {
    // Crossed midnight
    diffMins += 24 * 60;
  }
  return Number((diffMins / 60).toFixed(2));
}

/**
 * Calculate total hours deducted by intermediate exits (salidas intermedias).
 * Calculates elapsed time between exitTime (hora de salida) and returnTime (hora de llegada/regreso).
 */
export function calculateIntermediateExitsHours(exits?: IntermediateExit[]): number {
  if (!exits || exits.length === 0) return 0;
  let total = 0;
  for (const item of exits) {
    if (item.exitTime && item.returnTime) {
      total += calculateShiftHours(item.exitTime, item.returnTime);
    }
  }
  return Number(total.toFixed(2));
}

/**
 * Calculate total hours from an array of time intervals (tramos de trabajo)
 */
export function calculateIntervalsTotalHours(intervals?: TimeInterval[]): number {
  if (!intervals || intervals.length === 0) return 0;
  let total = 0;
  for (const intv of intervals) {
    total += calculateShiftHours(intv.entry, intv.exit);
  }
  return Number(total.toFixed(2));
}

/**
 * Convert a record into a list of intervals (for backwards compatibility if needed)
 */
export function recordToIntervals(rec?: Partial<DailyTimeRecord>): TimeInterval[] {
  if (rec?.intervals && rec.intervals.length > 0) {
    return rec.intervals.map((intv, idx) => ({
      id: intv.id || `intv-${idx + 1}-${Date.now()}`,
      entry: intv.entry || '',
      exit: intv.exit || '',
      label: intv.label || (idx === 0 ? 'Turno 1 (Mañana)' : idx === 1 ? 'Turno 2 (Tarde)' : `Salida/Tramo ${idx + 1}`)
    }));
  }
  return [
    { id: 'intv-1', entry: rec?.entry1 || '', exit: rec?.exit1 || '', label: 'Turno 1 (Mañana)' },
    { id: 'intv-2', entry: rec?.entry2 || '', exit: rec?.exit2 || '', label: 'Turno 2 (Tarde)' }
  ];
}

/**
 * Calculate total daily net hours from normal shifts minus intermediate exits.
 * If intervals exist without intermediateExits, uses interval calculations.
 */
export function calculateDailyTotalHours(
  entry1?: string,
  exit1?: string,
  entry2?: string,
  exit2?: string,
  intermediateExits?: IntermediateExit[],
  intervals?: TimeInterval[]
): number {
  let grossHours = 0;
  if (intervals && intervals.length > 2 && (!intermediateExits || intermediateExits.length === 0)) {
    grossHours = calculateIntervalsTotalHours(intervals);
  } else {
    const shift1 = calculateShiftHours(entry1, exit1);
    const shift2 = calculateShiftHours(entry2, exit2);
    grossHours = shift1 + shift2;
  }
  const deductedHours = calculateIntermediateExitsHours(intermediateExits);
  const netHours = Math.max(0, grossHours - deductedHours);
  return Number(netHours.toFixed(2));
}

/**
 * Summary breakdown of a day's hours: gross shift hours, deducted exit hours, and net total.
 */
export function getRecordHoursSummary(rec?: Partial<DailyTimeRecord>): {
  grossHours: number;
  deductedHours: number;
  netHours: number;
} {
  if (!rec || rec.isAbsent) {
    return { grossHours: 0, deductedHours: 0, netHours: 0 };
  }
  const shift1 = calculateShiftHours(rec.entry1, rec.exit1);
  const shift2 = calculateShiftHours(rec.entry2, rec.exit2);
  const grossHours = Number((shift1 + shift2).toFixed(2));
  const deductedHours = calculateIntermediateExitsHours(rec.intermediateExits);
  const netHours = Number(Math.max(0, grossHours - deductedHours).toFixed(2));
  return { grossHours, deductedHours, netHours };
}

/**
 * Format decimal hours into readable "Xh Ym" (e.g. 8.5 -> "8h 30m")
 */
export function formatHoursReadable(decimalHours: number): string {
  if (!decimalHours || decimalHours <= 0) return '0h 00m';
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Get current date in YYYY-MM-DD format
 */
export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonthStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Format YYYY-MM-DD into a friendly Spanish date string
 * e.g., "Viernes, 31 de Julio de 2026"
 */
export function formatDateFriendlySpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return `${days[date.getDay()]}, ${day} de ${months[date.getMonth()]} ${year}`;
}

/**
 * Format YYYY-MM-DD into a short Spanish date e.g. "31 Jul (Vie)"
 */
export function formatDateShortSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${String(day).padStart(2, '0')} ${monthsShort[date.getMonth()]} (${daysShort[date.getDay()]})`;
}

/**
 * Get name of day of week in Spanish for a YYYY-MM-DD string
 */
export function getDayOfWeekSpanish(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[date.getDay()];
}

/**
 * Is a given YYYY-MM-DD a Sunday?
 */
export function isSunday(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay() === 0;
}

/**
 * Get all dates (YYYY-MM-DD) for a given monthStr "YYYY-MM"
 */
export function getAllDaysInMonth(monthStr: string): string[] {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10); // 1-indexed
  
  const daysCount = new Date(year, month, 0).getDate();
  const result: string[] = [];
  for (let d = 1; d <= daysCount; d++) {
    const dayStr = String(d).padStart(2, '0');
    result.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
  }
  return result;
}

/**
 * Format monthStr "2026-07" to "Julio 2026"
 */
export function formatMonthSpanish(monthStr: string): string {
  if (!monthStr) return '';
  const [year, month] = monthStr.split('-');
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex] || ''} ${year}`;
}

/**
 * Get previous month string "YYYY-MM"
 */
export function getPrevMonthStr(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth < 1) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

/**
 * Get next month string "YYYY-MM"
 */
export function getNextMonthStr(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear = year + 1;
  }
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

/**
 * Format currency amount cleanly.
 * In Guaraníes Paraguayos (PYG), decimals are not used (e.g., 20.000 Gs or 1.500.000 Gs).
 */
export function formatCurrencyAmount(amount: number, currencyCode = 'PYG'): string {
  if (isNaN(amount)) return '0';
  if (currencyCode === 'PYG' || currencyCode === 'GS') {
    return Math.round(amount).toLocaleString('es-PY');
  }
  return amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format currency with symbol (e.g. "₲ 1.800.000" or "$ 1,500.00")
 */
export function formatCurrencyWithSymbol(
  amount: number,
  symbolOrConfig: string | { symbol?: string; code?: string } = '₲',
  currencyCode = 'PYG'
): string {
  let sym = '₲';
  let code = currencyCode;

  if (typeof symbolOrConfig === 'object' && symbolOrConfig !== null) {
    sym = (symbolOrConfig as any).symbol || '₲';
    code = (symbolOrConfig as any).code || currencyCode;
  } else if (typeof symbolOrConfig === 'string') {
    sym = symbolOrConfig;
  }

  // Guard against string "[object Object]"
  if (!sym || sym === '[object Object]') {
    sym = '₲';
  }

  return `${sym} ${formatCurrencyAmount(amount, code)}`;
}
/**
 * Generate all dates YYYY-MM-DD between startDate and endDate (inclusive)
 */
export function getDaysInRange(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate) return [];
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [startDate];

  const days: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    days.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Calculate the end date that results in an exact 15-day period starting from startDate.
 * E.g., start 2026-10-01 + 14 days = 2026-10-15 (15 days total).
 */
export function calculateEndDateFor15Days(startDate: string): string {
  if (!startDate) return '';
  const d = new Date(`${startDate}T12:00:00`);
  if (isNaN(d.getTime())) return startDate;
  d.setDate(d.getDate() + 14);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Get preset settlement periods for a given month "YYYY-MM"
 * 1. 1ª Quincena (1 al 15)
 * 2. 2ª Quincena (16 al fin de mes)
 * 3. Mes completo (1 al fin de mes)
 */
export function getSettlementPeriods(monthStr: string): SettlementPeriodConfig[] {
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthNumStr, 10);
  const lastDay = new Date(year, month, 0).getDate();
  const monthName = formatMonthSpanish(monthStr);

  const mStr = String(month).padStart(2, '0');
  const q1Start = `${year}-${mStr}-01`;
  const q1End = `${year}-${mStr}-15`;

  const q2Start = `${year}-${mStr}-16`;
  const q2End = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;

  const monthStart = `${year}-${mStr}-01`;
  const monthEnd = `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`;

  return [
    {
      type: 'quincenal_1',
      label: `1ª Quincena (1 al 15 de ${monthName})`,
      shortLabel: '1ª Quincena (1 - 15)',
      startDate: q1Start,
      endDate: q1End,
      periodKey: `${monthStr}-Q1`,
      daysCount: 15
    },
    {
      type: 'quincenal_2',
      label: `2ª Quincena (16 al ${lastDay} de ${monthName})`,
      shortLabel: `2ª Quincena (16 - ${lastDay})`,
      startDate: q2Start,
      endDate: q2End,
      periodKey: `${monthStr}-Q2`,
      daysCount: lastDay - 15
    },
    {
      type: 'mensual',
      label: `Mes Completo (1 al ${lastDay} de ${monthName})`,
      shortLabel: `Mes Completo (1 - ${lastDay})`,
      startDate: monthStart,
      endDate: monthEnd,
      periodKey: monthStr,
      daysCount: lastDay
    }
  ];
}

/**
 * Format a date range into friendly Spanish
 * e.g. "01/10/2026 al 15/10/2026"
 */
export function formatDateRangeSpanish(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  if (sy === ey && sm === em) {
    return `${sd} al ${ed} de ${monthsShort[sm - 1]} ${sy}`;
  }
  return `${sd} ${monthsShort[sm - 1]} ${sy} al ${ed} ${monthsShort[em - 1]} ${ey}`;
}

/**
 * Calculate employee gross earnings for a given period:
 * - If employee has hourlyRate: gross = hoursWorked * hourlyRate
 * - If employee has monthlyBaseSalary: proportional to hours worked in standard month (approx 180h or hourly rate equivalent)
 */
export function calculateEmployeePeriodEarnings(
  emp: Employee,
  periodHours: number
): { gross: number; detail: string } {
  const hourlyRate = emp.hourlyRate || 0;
  
  if (emp.monthlyBaseSalary && emp.monthlyBaseSalary > 0) {
    // Proportional to standard full month hours (180h standard in Paraguay/Latin America 45h/week or 30 days)
    const standardMonthHours = 180;
    const proportional = (periodHours / standardMonthHours) * emp.monthlyBaseSalary;
    return {
      gross: Number(proportional.toFixed(2)),
      detail: `${periodHours.toFixed(1)}h de 180h base s/ ${emp.monthlyBaseSalary.toLocaleString('es-PY')}`
    };
  }

  const gross = periodHours * hourlyRate;
  return {
    gross: Number(gross.toFixed(2)),
    detail: `${periodHours.toFixed(2)}h × ${hourlyRate.toLocaleString('es-PY')}/h`
  };
}

/**
 * Generate a WhatsApp click-to-chat URL with pre-filled text
 */
export function createWhatsAppShareUrl(messageText: string, phone?: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  const encodedText = encodeURIComponent(messageText);
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Format YYYY-MM-DD into DD/MM/YYYY
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr || !dateStr.includes('-')) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Calculate tenure / length of service between startDate and endDate (or today)
 * Returns friendly Spanish string e.g. "1 año y 4 meses", "8 meses", "23 días"
 */
export function calculateTenure(startDate?: string, endDate?: string): string {
  if (!startDate) return '';
  const start = new Date(startDate + 'T00:00:00');
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return '';
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Days in previous month
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'año' : 'años'}`);
  }
  if (months > 0) {
    parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`);
  }
  if (years === 0 && days > 0) {
    parts.push(`${days} ${days === 1 ? 'día' : 'días'}`);
  }

  if (parts.length === 0) return 'Menos de 1 día';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} y ${parts[1]}`;
}


