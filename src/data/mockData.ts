import { Employee, DailyTimeRecord, MonthlySettlementAdjustment } from '../types';
import { getTodayDateStr, getCurrentMonthStr, calculateDailyTotalHours, getAllDaysInMonth } from '../utils/timeUtils';

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Carlos Gómez',
    role: 'Operario de Taller',
    hourlyRate: 18000,
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
    defaultEntry1: '08:00',
    defaultExit1: '12:00',
    defaultEntry2: '13:30',
    defaultExit2: '17:30',
    phone: '+595 982 234 567',
    active: true,
    color: 'bg-amber-600'
  },
  {
    id: 'emp-3',
    name: 'Juan Martínez',
    role: 'Repartidor / Logística',
    hourlyRate: 15000,
    defaultEntry1: '07:30',
    defaultExit1: '11:30',
    defaultEntry2: '14:00',
    defaultExit2: '18:00',
    phone: '+595 983 345 678',
    active: true,
    color: 'bg-orange-700'
  }
];

export function generateInitialRecords(): DailyTimeRecord[] {
  const currentMonth = getCurrentMonthStr();
  const today = getTodayDateStr();
  const allDays = getAllDaysInMonth(currentMonth);
  const records: DailyTimeRecord[] = [];

  // Generate realistic data up to today
  allDays.forEach(dateStr => {
    if (dateStr > today) return; // don't fill future days
    
    // Check if Sunday
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const isSun = dateObj.getDay() === 0; // Sunday

    DEFAULT_EMPLOYEES.forEach(emp => {
      const id = `${emp.id}_${dateStr}`;
      
      if (isSun) {
        // Domingo - Descanso
        records.push({
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
        return;
      }

      // Slightly vary some days for realism
      let entry1 = emp.defaultEntry1 || '08:00';
      let exit1 = emp.defaultExit1 || '12:00';
      let entry2 = emp.defaultEntry2 || '14:00';
      let exit2 = emp.defaultExit2 || '18:00';
      let notes = '';

      if (emp.id === 'emp-1' && day % 7 === 2) {
        // Horas extras un martes
        exit2 = '19:00';
        notes = '1 hora extra de tarde';
      } else if (emp.id === 'emp-3' && day % 10 === 5) {
        // Salió antes
        exit2 = '16:30';
        notes = 'Permiso personal por la tarde';
      }

      const totalHours = calculateDailyTotalHours(entry1, exit1, entry2, exit2);

      records.push({
        id,
        employeeId: emp.id,
        dateStr,
        entry1,
        exit1,
        entry2,
        exit2,
        isAbsent: false,
        notes,
        totalHours
      });
    });
  });

  return records;
}

export const INITIAL_ADJUSTMENTS: MonthlySettlementAdjustment[] = [
  {
    id: 'adj-1',
    employeeId: 'emp-1',
    monthStr: getCurrentMonthStr(),
    advanceAmount: 150000,
    bonusAmount: 0,
    notes: 'Adelanto quincena',
    isPaid: false
  }
];

const STORAGE_KEYS = {
  EMPLOYEES: 'control_horas_employees_v1',
  RECORDS: 'control_horas_records_v1',
  ADJUSTMENTS: 'control_horas_adjustments_v1',
  CURRENCY: 'control_horas_currency_v1'
};

export function loadCurrencyFromStorage() {
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
    const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    if (data) return JSON.parse(data);
  } catch (err) {
    console.error('Error loading employees:', err);
  }
  return DEFAULT_EMPLOYEES;
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
  return generateInitialRecords();
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
  return INITIAL_ADJUSTMENTS;
}

export function saveAdjustmentsToStorage(adjustments: MonthlySettlementAdjustment[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.ADJUSTMENTS, JSON.stringify(adjustments));
  } catch (err) {
    console.error('Error saving adjustments:', err);
  }
}

export function resetAllStorageToDefaults() {
  localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
  localStorage.removeItem(STORAGE_KEYS.RECORDS);
  localStorage.removeItem(STORAGE_KEYS.ADJUSTMENTS);
  localStorage.removeItem(STORAGE_KEYS.CURRENCY);
}
