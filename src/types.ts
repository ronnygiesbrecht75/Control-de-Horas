export interface IntermediateExit {
  id?: string;
  exitTime: string;   // Hora de salida (a qué hora salió el empleado)
  returnTime: string; // Hora de llegada (a qué hora regresó / llegó)
  label?: string;     // ej. "Salida intermedia", "Permiso"
  reason?: string;
}

export interface TimeInterval {
  id?: string;
  entry: string; // "HH:MM" e.g. "07:00"
  exit: string;  // "HH:MM" e.g. "07:30"
  label?: string; // e.g. "Mañana 1", "Salida intermedia", "Turno tarde"
}

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
  // Salidas intermedias que se descuentan del total del día
  intermediateExits?: IntermediateExit[];
  // Flexible multiple intervals
  intervals?: TimeInterval[];
  // State
  isAbsent?: boolean;
  notes?: string;
  // Computed or cached total hours for that day (decimal e.g. 8.0)
  totalHours?: number;
}

export type PaymentFrequency = 'quincenal' | 'mensual';

export interface Employee {
  id: string;
  name: string;
  role: string;
  hourlyRate: number; // default price per hour (e.g., 18000)
  monthlyBaseSalary?: number; // optional fixed base salary
  paymentFrequency?: PaymentFrequency; // 'quincenal' (cada 15 días) | 'mensual' (cada 30 días)
  defaultEntry1?: string; // e.g., "08:00"
  defaultExit1?: string;  // e.g., "12:00"
  defaultEntry2?: string; // e.g., "14:00"
  defaultExit2?: string;  // e.g., "18:00"
  phone?: string;
  active: boolean;
  color?: string; // avatar color badge
}

export type SettlementPeriodType = 'quincenal_1' | 'quincenal_2' | 'mensual' | 'custom';

export interface SettlementPeriodConfig {
  type: SettlementPeriodType;
  label: string;
  shortLabel: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  periodKey: string; // unique identifier for adjustments (e.g., "2026-10-Q1")
  daysCount: number;
}

export interface MonthlySettlementAdjustment {
  id: string;
  employeeId: string;
  monthStr: string; // YYYY-MM or period key e.g. "2026-07-Q1"
  periodKey?: string; // e.g. "2026-07-Q1", "2026-07-Q2", "2026-07-M"
  startDate?: string;
  endDate?: string;
  advanceAmount: number; // Adelantos del periodo
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

