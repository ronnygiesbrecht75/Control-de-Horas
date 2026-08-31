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
 * Calculate total daily hours from 2 shifts (Mañana + Tarde)
 */
export function calculateDailyTotalHours(
  entry1?: string,
  exit1?: string,
  entry2?: string,
  exit2?: string
): number {
  const shift1 = calculateShiftHours(entry1, exit1);
  const shift2 = calculateShiftHours(entry2, exit2);
  return Number((shift1 + shift2).toFixed(2));
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
export function formatCurrencyWithSymbol(amount: number, symbol = '₲', currencyCode = 'PYG'): string {
  return `${symbol} ${formatCurrencyAmount(amount, currencyCode)}`;
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

