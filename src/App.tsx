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
  loadSampleDemoData
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
import { ExEmployeesView } from './components/ExEmployeesView';
import { SidebarNav } from './components/SidebarNav';
import { LoginScreen } from './components/LoginScreen';
import { AutoUpdater } from './components/AutoUpdater';
import { EmployeeMobilePortal } from './components/EmployeeMobilePortal';
import { 
  syncEmployeesToCloud, 
  syncRecordsToCloud, 
  fetchCloudState 
} from './utils/syncService';

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

  // Persist and auto-sync whenever changes occur
  useEffect(() => {
    saveEmployeesToStorage(employees);
    if (employees.length > 0) {
      syncEmployeesToCloud(employees).catch(err => console.debug('Sync employees error:', err));
    }
  }, [employees]);

  useEffect(() => {
    saveRecordsToStorage(records);
    if (records.length > 0) {
      syncRecordsToCloud(records).catch(err => console.debug('Sync records error:', err));
    }
  }, [records]);

  useEffect(() => {
    saveAdjustmentsToStorage(adjustments);
  }, [adjustments]);

  useEffect(() => {
    saveCurrencyToStorage(currency);
  }, [currency]);

  // Pull latest updates from Cloud (employee device punches or web registrations)
  useEffect(() => {
    const pullCloudUpdates = async () => {
      try {
        const cloudData = await fetchCloudState();
        if (cloudData) {
          // Merge employees if cloud has extra ones or newly linked devices
          if (cloudData.employees && cloudData.employees.length > 0) {
            setEmployees(prev => {
              if (prev.length === 0) return cloudData.employees;
              const map = new Map<string, Employee>(prev.map(e => [e.id, e]));
              let hasChanges = false;
              cloudData.employees.forEach(ce => {
                if (!map.has(ce.id)) {
                  map.set(ce.id, ce);
                  hasChanges = true;
                } else {
                  const ex = map.get(ce.id);
                  if (ex && ce.deviceLinked && !ex.deviceLinked) {
                    map.set(ce.id, { ...ex, deviceLinked: true, deviceLinkedAt: ce.deviceLinkedAt });
                    hasChanges = true;
                  }
                }
              });
              return hasChanges ? Array.from(map.values()) : prev;
            });
          }

          // Merge records (especially punches captured on mobile devices)
          if (cloudData.records && cloudData.records.length > 0) {
            setRecords(prev => {
              if (prev.length === 0) return cloudData.records;
              const map = new Map<string, DailyTimeRecord>(prev.map(r => [`${r.employeeId}_${r.dateStr}`, r]));
              let hasChanges = false;
              cloudData.records.forEach(cr => {
                const key = `${cr.employeeId}_${cr.dateStr}`;
                const ex = map.get(key);
                if (!ex) {
                  map.set(key, cr);
                  hasChanges = true;
                } else {
                  const cloudPunchesCount = cr.punches?.length || 0;
                  const localPunchesCount = ex.punches?.length || 0;
                  if (cloudPunchesCount > localPunchesCount || (cr.totalHours && !ex.totalHours)) {
                    map.set(key, { ...ex, ...cr });
                    hasChanges = true;
                  }
                }
              });
              return hasChanges ? Array.from(map.values()) : prev;
            });
          }
        }
      } catch (err) {
        console.debug('Background cloud pull error:', err);
      }
    };

    pullCloudUpdates();
    const interval = setInterval(pullCloudUpdates, 20000);
    return () => clearInterval(interval);
  }, []);

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
      const entry1 = emp.defaultEntry1 || '07:00';
      const exit1 = emp.defaultExit1 || '11:30';
      const entry2 = emp.defaultEntry2 || '12:30';
      const exit2 = emp.defaultExit2 || '17:30';
      const existing = newRecords.find(r => r.id === id || (r.employeeId === emp.id && r.dateStr === dateStr));
      const intermediateExits = existing?.intermediateExits || [];
      const totalHours = calculateDailyTotalHours(entry1, exit1, entry2, exit2, intermediateExits);

      const idx = newRecords.findIndex(r => r.id === id || (r.employeeId === emp.id && r.dateStr === dateStr));
      const updated: DailyTimeRecord = {
        id,
        employeeId: emp.id,
        dateStr,
        entry1,
        exit1,
        entry2,
        exit2,
        intermediateExits,
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

  const handleUpdateEmployeeRate = (employeeId: string, newRate: number, effectiveDate?: string) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === employeeId) {
        const effDate = effectiveDate || getTodayDateStr();
        const existingHistory = emp.rateHistory && emp.rateHistory.length > 0 
          ? [...emp.rateHistory] 
          : [
              { 
                effectiveDate: emp.startDate || '2024-01-01', 
                rate: emp.hourlyRate || newRate, 
                notes: 'Tarifa inicial' 
              }
            ];
        const matchIdx = existingHistory.findIndex(h => h.effectiveDate === effDate);
        if (matchIdx >= 0) {
          existingHistory[matchIdx] = { ...existingHistory[matchIdx], rate: newRate };
        } else {
          existingHistory.push({
            effectiveDate: effDate,
            rate: newRate,
            notes: 'Ajuste / Aumento salarial'
          });
        }
        existingHistory.sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

        return { 
          ...emp, 
          hourlyRate: newRate,
          rateHistory: existingHistory
        };
      }
      return emp;
    }));
  };

  // Settlement adjustments handler
  const handleUpdateAdjustment = (updatedAdj: MonthlySettlementAdjustment) => {
    setAdjustments(prev => {
      const targetPeriodKey = updatedAdj.periodKey || updatedAdj.monthStr;
      const idx = prev.findIndex(a => {
        if (a.id === updatedAdj.id) return true;
        const aPeriodKey = a.periodKey || a.monthStr;
        return a.employeeId === updatedAdj.employeeId && aPeriodKey === targetPeriodKey;
      });
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedAdj;
        return copy;
      }
      return [...prev, updatedAdj];
    });
  };

  // Clear all data (clean slate)
  const handleClearAllData = () => {
    resetAllStorageToDefaults();
    setEmployees([]);
    setRecords([]);
    setAdjustments([]);
    setSelectedEmployeeId('');
    setDateStr(getTodayDateStr());
    setMonthStr(getCurrentMonthStr());
  };

  // Load sample demo data
  const handleLoadDemoData = () => {
    const demo = loadSampleDemoData();
    setEmployees(demo.employees);
    setRecords(demo.records);
    setAdjustments(demo.adjustments);
    if (demo.employees.length > 0) {
      setSelectedEmployeeId(demo.employees[0].id);
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
      if (data.employees.length > 0) {
        setSelectedEmployeeId(data.employees[0].id);
      }
    } else {
      throw new Error('Invalid JSON format');
    }
  };

  const [mobilePortalLicense, setMobilePortalLicense] = useState<string>('');

  // Decide if the app should open in Employee Mobile Portal mode
  const [isEmployeePortalActive, setIsEmployeePortalActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const hasDeviceLicense = Boolean(localStorage.getItem('control_horas_device_license'));
    const isExplicitPortal = (
      urlParams.get('portal') === 'empleado' ||
      window.location.hash.includes('portal-empleado') ||
      Boolean(urlParams.get('licencia'))
    );
    const hasAdminSession = Boolean(localStorage.getItem('current_user'));
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;

    // 1. If device already has an employee license saved, ALWAYS default to employee portal!
    if (hasDeviceLicense && !hasAdminSession) return true;
    // 2. If URL indicates employee portal
    if (isExplicitPortal) return true;
    // 3. On mobile devices without an active admin session, default directly to employee portal
    if (isMobileDevice && !hasAdminSession) return true;
    return false;
  });

  // Handle URL activation parameters (e.g. employee scanning QR code or clicking WhatsApp link from phone)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    let hashQuery = window.location.hash;
    if (hashQuery.includes('?')) {
      hashQuery = hashQuery.split('?')[1];
    } else {
      hashQuery = hashQuery.replace(/^#/, '');
    }
    const hashParams = new URLSearchParams(hashQuery);

    const licencia = (urlParams.get('licencia') || hashParams.get('licencia') || '').trim().toUpperCase();
    const empName = urlParams.get('emp_name') || hashParams.get('emp_name') || '';
    const empId = urlParams.get('emp_id') || hashParams.get('emp_id') || '';
    const empRole = urlParams.get('emp_role') || hashParams.get('emp_role') || 'Operario';

    if (licencia && empName) {
      // Auto-register employee on this device if not present
      setEmployees(prev => {
        const existingIdx = prev.findIndex(
          e => (e.licenseKey && e.licenseKey.trim().toUpperCase() === licencia) || (empId && e.id === empId)
        );
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = {
            ...copy[existingIdx],
            licenseKey: licencia,
            active: true,
            licenseActive: true,
            deviceLinked: true
          };
          return copy;
        } else {
          const newEmp: Employee = {
            id: empId || `emp-${Date.now()}`,
            name: decodeURIComponent(empName),
            role: decodeURIComponent(empRole),
            licenseKey: licencia,
            licenseActive: true,
            deviceLinked: true,
            deviceLinkedAt: new Date().toISOString(),
            active: true,
            hourlyRate: 18000
          };
          return [...prev, newEmp];
        }
      });

      // Save device activation locally so the phone stays activated permanently
      localStorage.setItem('control_horas_device_license', licencia);
      setMobilePortalLicense(licencia);
      setIsEmployeePortalActive(true);
    }
  }, []);

  const getUrlLicenseParam = () => {
    if (typeof window === 'undefined') return '';
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('licencia')) return urlParams.get('licencia') || '';
    if (window.location.hash.includes('licencia=')) {
      const match = window.location.hash.match(/licencia=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return '';
  };

  // Direct Mobile Portal Access for Employees (does not require admin user/password)
  if (isEmployeePortalActive || activeTab === 'mobile-portal') {
    return (
      <EmployeeMobilePortal
        employees={employees}
        records={records}
        onUpdateEmployee={handleUpdateEmployee}
        onUpdateRecord={handleUpdateRecord}
        onExitToAdmin={() => {
          setIsEmployeePortalActive(false);
          setActiveTab('daily');
          if (window.location.hash.includes('portal-empleado')) {
            window.location.hash = '';
          }
        }}
        onSwitchToAdmin={() => {
          setIsEmployeePortalActive(false);
        }}
        initialLicenseParam={mobilePortalLicense || getUrlLicenseParam()}
      />
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={(user) => setCurrentUser(user)} 
        onGoToEmployeePortal={() => setIsEmployeePortalActive(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currency={currency}
        setCurrency={setCurrency}
        onClearAllData={handleClearAllData}
        onExportData={handleExportData}
        onImportData={handleImportData}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Left Column Navigation Options - 15% wider as requested */}
          <aside className="w-full lg:w-[295px] xl:w-[330px] shrink-0 lg:sticky lg:top-20">
            <SidebarNav
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              exEmployeesCount={employees.filter(e => !e.active).length}
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
                currency={currency}
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
                onUpdateEmployee={handleUpdateEmployee}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManagementView
                employees={employees}
                currency={currency}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onGoToExEmployees={() => setActiveTab('ex-employees')}
                onOpenMobilePortal={(key) => {
                  setMobilePortalLicense(key);
                  setIsEmployeePortalActive(true);
                  setActiveTab('mobile-portal');
                }}
              />
            )}

            {activeTab === 'ex-employees' && (
              <ExEmployeesView
                employees={employees}
                records={records}
                currency={currency}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onUpdateRecord={handleUpdateRecord}
                onGoToActiveEmployees={() => setActiveTab('employees')}
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
