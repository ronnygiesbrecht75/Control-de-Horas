/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  DailyTimeRecord, 
  MonthlySettlementAdjustment, 
  ActiveTab, 
  CurrencyConfig 
} from './types';
import { 
  loadEmployeesFromStorage, 
  saveEmployeesToStorage, 
  loadRecordsFromStorage, 
  saveRecordsToStorage, 
  loadAdjustmentsFromStorage, 
  saveAdjustmentsToStorage, 
  loadCurrencyFromStorage,
  saveCurrencyToStorage,
  resetAllStorageToDefaults, 
  DEFAULT_EMPLOYEES, 
  generateInitialRecords, 
  INITIAL_ADJUSTMENTS 
} from './data/mockData';
import { 
  getTodayDateStr, 
  getCurrentMonthStr, 
  calculateDailyTotalHours, 
  getAllDaysInMonth, 
  isSunday 
} from './utils/timeUtils';
import { Header } from './components/Header';
import { DailyEntryView } from './components/DailyEntryView';
import { MonthlyGridView } from './components/MonthlyGridView';
import { MonthlySettlementView } from './components/MonthlySettlementView';
import { EmployeeManagementView } from './components/EmployeeManagementView';
import { SidebarNav } from './components/SidebarNav';
import { LoginScreen } from './components/LoginScreen';
import { AutoUpdater } from './components/AutoUpdater';

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('current_user') || null;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [dateStr, setDateStr] = useState<string>(getTodayDateStr());
  const [monthStr, setMonthStr] = useState<string>(getCurrentMonthStr());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployeesFromStorage());
  const [records, setRecords] = useState<DailyTimeRecord[]>(() => loadRecordsFromStorage());
  const [adjustments, setAdjustments] = useState<MonthlySettlementAdjustment[]>(() => loadAdjustmentsFromStorage());
  const [currency, setCurrency] = useState<CurrencyConfig>(() => loadCurrencyFromStorage());

  const handleLogout = () => {
    localStorage.removeItem('current_user');
    setCurrentUser(null);
  };

  // Set default selected employee when employees load or change
  useEffect(() => {
    if (!selectedEmployeeId && employees.length > 0) {
      const firstActive = employees.find(e => e.active) || employees[0];
      if (firstActive) setSelectedEmployeeId(firstActive.id);
    }
  }, [employees, selectedEmployeeId]);

  // Persist whenever changes occur
  useEffect(() => {
    saveEmployeesToStorage(employees);
  }, [employees]);

  useEffect(() => {
    saveRecordsToStorage(records);
  }, [records]);

  useEffect(() => {
    saveAdjustmentsToStorage(adjustments);
  }, [adjustments]);

  useEffect(() => {
    saveCurrencyToStorage(currency);
  }, [currency]);

  // Update a single DailyTimeRecord
  const handleUpdateRecord = (updatedRecord: DailyTimeRecord) => {
    setRecords(prev => {
      const idx = prev.findIndex(r => r.id === updatedRecord.id || (r.employeeId === updatedRecord.employeeId && r.dateStr === updatedRecord.dateStr));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedRecord;
        return copy;
      }
      return [...prev, updatedRecord];
    });
  };

  // Bulk fill standard workday hours for all active employees on the currently selected date
  const handleFillAllDefault = () => {
    const activeEmps = employees.filter(e => e.active);
    const newRecords = [...records];

    activeEmps.forEach(emp => {
      const id = `${emp.id}_${dateStr}`;
      const entry1 = emp.defaultEntry1 || '08:00';
      const exit1 = emp.defaultExit1 || '12:00';
      const entry2 = emp.defaultEntry2 || '14:00';
      const exit2 = emp.defaultExit2 || '18:00';
      const totalHours = calculateDailyTotalHours(entry1, exit1, entry2, exit2);

      const idx = newRecords.findIndex(r => r.id === id || (r.employeeId === emp.id && r.dateStr === dateStr));
      const updated: DailyTimeRecord = {
        id,
        employeeId: emp.id,
        dateStr,
        entry1,
        exit1,
        entry2,
        exit2,
        isAbsent: false,
        totalHours
      };

      if (idx >= 0) {
        newRecords[idx] = updated;
      } else {
        newRecords.push(updated);
      }
    });

    setRecords(newRecords);
  };

  // Employee management handlers
  const handleAddEmployee = (newEmpData: Omit<Employee, 'id'>) => {
    const newId = `emp-${Date.now()}`;
    const newEmp: Employee = {
      ...newEmpData,
      id: newId
    };
    setEmployees(prev => [...prev, newEmp]);
    if (!selectedEmployeeId) {
      setSelectedEmployeeId(newId);
    }
  };

  const handleUpdateEmployee = (updatedEmp: Employee) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
    if (selectedEmployeeId === id) {
      const remaining = employees.filter(e => e.id !== id);
      setSelectedEmployeeId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  const handleUpdateEmployeeRate = (employeeId: string, newRate: number) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        return { ...emp, hourlyRate: newRate };
      }
      return emp;
    }));
  };

  // Settlement adjustments handler
  const handleUpdateAdjustment = (updatedAdj: MonthlySettlementAdjustment) => {
    setAdjustments(prev => {
      const idx = prev.findIndex(a => a.id === updatedAdj.id || (a.employeeId === updatedAdj.employeeId && a.monthStr === updatedAdj.monthStr));
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedAdj;
        return copy;
      }
      return [...prev, updatedAdj];
    });
  };

  // Reset Demo data
  const handleResetDemo = () => {
    resetAllStorageToDefaults();
    setEmployees(DEFAULT_EMPLOYEES);
    setRecords(generateInitialRecords());
    setAdjustments(INITIAL_ADJUSTMENTS);
    setDateStr(getTodayDateStr());
    setMonthStr(getCurrentMonthStr());
    if (DEFAULT_EMPLOYEES.length > 0) {
      setSelectedEmployeeId(DEFAULT_EMPLOYEES[0].id);
    }
  };

  // Export & Import backup JSON
  const handleExportData = () => {
    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      employees,
      records,
      adjustments,
      currency
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo_control_horas_${getTodayDateStr()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonStr: string) => {
    const data = JSON.parse(jsonStr);
    if (data && Array.isArray(data.employees)) {
      setEmployees(data.employees);
      if (Array.isArray(data.records)) {
        setRecords(data.records);
      }
      if (Array.isArray(data.adjustments)) {
        setAdjustments(data.adjustments);
      }
      if (data.currency) {
        setCurrency(data.currency);
      }
    } else {
      throw new Error('Invalid JSON format');
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        onResetDemo={handleResetDemo}
        onExportData={handleExportData}
        onImportData={handleImportData}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column Navigation Options */}
          <aside className="w-full lg:w-64 xl:w-72 shrink-0 lg:sticky lg:top-24">
            <SidebarNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />
          </aside>

          {/* Main Content View */}
          <div className="flex-1 w-full min-w-0">
            {activeTab === 'daily' && (
              <DailyEntryView
                dateStr={dateStr}
                setDateStr={setDateStr}
                employees={employees}
                records={records}
                onUpdateRecord={handleUpdateRecord}
              />
            )}

            {activeTab === 'monthly' && (
              <MonthlyGridView
                monthStr={monthStr}
                setMonthStr={setMonthStr}
                selectedEmployeeId={selectedEmployeeId}
                setSelectedEmployeeId={setSelectedEmployeeId}
                employees={employees}
                records={records}
                currency={currency}
                onUpdateRecord={handleUpdateRecord}
                onGoToSettlement={() => setActiveTab('settlement')}
              />
            )}

            {activeTab === 'settlement' && (
              <MonthlySettlementView
                monthStr={monthStr}
                setMonthStr={setMonthStr}
                employees={employees}
                records={records}
                adjustments={adjustments}
                currency={currency}
                onUpdateEmployeeRate={handleUpdateEmployeeRate}
                onUpdateAdjustment={handleUpdateAdjustment}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManagementView
                employees={employees}
                currency={currency}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            ⏱️ <strong>Control de Horas y Pago Mensual</strong> · Sistema con 2 Entradas y 2 Salidas Diarias
          </p>
          <p className="text-slate-400">
            Los datos se guardan de manera segura en tu navegador
          </p>
        </div>
      </footer>

      {/* Auto Updater Floating Banner */}
      <AutoUpdater />
    </div>
  );
}
