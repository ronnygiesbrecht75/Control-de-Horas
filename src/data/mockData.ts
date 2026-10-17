import { Employee, DailyTimeRecord, MonthlySettlementAdjustment } from '../types';
import { getTodayDateStr, getCurrentMonthStr, calculateDailyTotalHours, getAllDaysInMonth } from '../utils/timeUtils';

export const DEFAULT_EMPLOYEES: Employee[] = [];

export function generateInitialRecords(): DailyTimeRecord[] {
  return [];
}

export const INITIAL_ADJUSTMENTS: MonthlySettlementAdjustment[] = [];

const STORAGE_KEYS = {
  EMPLOYEES: 'control_horas_employees_clean_v1',
  RECORDS: 'control_horas_records_clean_v1',
  ADJUSTMENTS: 'control_horas_adjustments_clean_v1',
  CURRENCY: 'control_horas_currency_clean_v1',
  INITIALIZED: 'control_horas_clean_initialized_v1'
};

export function loadCurrencyFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENCY);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error loading currency:', err);
  }
  return { symbol: '₲', code: 'PYG' };
}

export function saveCurrencyToStorage(currency: any) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify(currency));
  } catch (err) {
    console.error('Error saving currency:', err);
  }
}

export function loadEmployeesFromStorage(): Employee[] {
  try {
    // Clear legacy demo keys on first load if present
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      localStorage.removeItem('control_horas_employees_v1');
      localStorage.removeItem('control_horas_records_v1');
      localStorage.removeItem('control_horas_adjustments_v1');
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify([]));
      return [];
    }
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error loading employees:', err);
  }
  return [];
}

export function saveEmployeesToStorage(employees: Employee[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
  } catch (err) {
    console.error('Error saving employees:', err);
  }
}

export function loadRecordsFromStorage(): DailyTimeRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error loading records:', err);
  }
  return [];
}

export function saveRecordsToStorage(records: DailyTimeRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  } catch (err) {
    console.error('Error saving records:', err);
  }
}

export function loadAdjustmentsFromStorage(): MonthlySettlementAdjustment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ADJUSTMENTS);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error loading adjustments:', err);
  }
  return [];
}

export function saveAdjustmentsToStorage(adjustments: MonthlySettlementAdjustment[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
  } catch (err) {
    console.error('Error saving adjustments:', err);
  }
}

export function resetAllStorageToDefaults() {
  localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

export function loadSampleDemoData(): { employees: Employee[], records: DailyTimeRecord[], adjustments: MonthlySettlementAdjustment[] } {
  const sampleEmployees: Employee[] = [
    {
      id: 'emp-1',
      name: 'Carlos Gómez',
      role: 'Operario de Taller',
      hourlyRate: 18000,
      paymentFrequency: 'quincenal',
      defaultEntry1: '08:00',
      defaultExit1: '12:00',
      defaultEntry2: '14:00',
      defaultExit2: '18:00',
      phone: '+595 981 123 456',
      active: true,
      color: 'bg-orange-600'
    },
    {
      id: 'emp-2',
      name: 'María Fernández',
      role: 'Encargada de Almacén',
      hourlyRate: 22000,
      paymentFrequency: 'mensual',
      defaultEntry1: '08:00',
      defaultExit1: '12:00',
      defaultEntry2: '13:30',
      defaultExit2: '17:30',
      phone: '+595 982 234 567',
      active: true,
      color: 'bg-amber-600'
    }
  ];

  const currentMonth = getCurrentMonthStr();
  const today = getTodayDateStr();
  const allDays = getAllDaysInMonth(currentMonth);
  const sampleRecords: DailyTimeRecord[] = [];

  allDays.forEach(dateStr => {
    if (dateStr > today) return;
    const [year, month, day] = dateStr.split('-').map(Number);
    const isSun = new Date(year, month - 1, day).getDay() === 0;

    sampleEmployees.forEach(emp => {
      const id = `${emp.id}_${dateStr}`;
      if (isSun) {
        sampleRecords.push({
          id,
          employeeId: emp.id,
          dateStr,
          entry1: '',
          exit1: '',
          entry2: '',
          exit2: '',
          isAbsent: false,
          notes: 'Descanso dominical',
          totalHours: 0
        });
      } else {
        const entry1 = emp.defaultEntry1 || '08:00';
        const exit1 = emp.defaultExit1 || '12:00';
        const entry2 = emp.defaultEntry2 || '14:00';
        const exit2 = emp.defaultExit2 || '18:00';
        sampleRecords.push({
          id,
          employeeId: emp.id,
          dateStr,
          entry1,
          exit1,
          entry2,
          exit2,
          isAbsent: false,
          notes: '',
          totalHours: calculateDailyTotalHours(entry1, exit1, entry2, exit2)
        });
      }
    });
  });

  return {
    employees: sampleEmployees,
    records: sampleRecords,
    adjustments: [
      {
        id: 'adj-1',
        employeeId: 'emp-1',
        monthStr: currentMonth,
        advanceAmount: 150000,
        bonusAmount: 0,
        notes: 'Adelanto',
        isPaid: false
      }
    ]
  };
}
