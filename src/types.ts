export interface DailyTimeRecord {
  id: string; // unique record ID or composite `${employeeId}-${dateStr}`
  employeeId: string;
  dateStr: string; // YYYY-MM-DD
  // Turno 1 (Mañana)
  entry1: string; // "HH:MM" e.g. "08:00" or ""
  exit1: string;  // "HH:MM" e.g. "12:00" or ""
  // Turno 2 (Tarde)
  entry2: string; // "HH:MM" e.g. "14:00" or ""
  exit2: string;  // "HH:MM" e.g. "18:00" or ""
  // State
  isAbsent?: boolean;
  notes?: string;
  // Computed or cached total hours for that day (decimal e.g. 8.0)
  totalHours?: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyRate: number; // default price per hour (e.g., 15)
  defaultEntry1?: string; // e.g., "08:00"
  defaultExit1?: string;  // e.g., "12:00"
  defaultEntry2?: string; // e.g., "14:00"
  defaultExit2?: string;  // e.g., "18:00"
  phone?: string;
  active: boolean;
  color?: string; // avatar color badge
}

export interface MonthlySettlementAdjustment {
  id: string;
  employeeId: string;
  monthStr: string; // YYYY-MM e.g. "2026-07"
  advanceAmount: number; // Adelantos del mes
  bonusAmount: number;   // Bonos o premios
  notes: string;
  isPaid: boolean;
  paidAt?: string; // ISO timestamp
}

export type ActiveTab = 'daily' | 'monthly' | 'settlement' | 'employees';

export interface CurrencyConfig {
  symbol: string;
  code: string;
}
