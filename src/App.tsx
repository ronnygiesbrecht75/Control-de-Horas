/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Employee, 
  DailyTimeRecord, 
  MonthlySettlementAdjustment, 
  VacationEntry,
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
  loadVacationsFromStorage,
  saveVacationsToStorage,
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
import { LocationMapView } from './components/LocationMapView';
import { SidebarNav } from './components/SidebarNav';
import { LoginScreen } from './components/LoginScreen';
import { AutoUpdater } from './components/AutoUpdater';
import { EmployeeMobilePortal } from './components/EmployeeMobilePortal';
import { FaceKioskApp } from './components/FaceKioskApp';
import { 
  syncEmployeesToCloud, 
  syncRecordsToCloud, 
  syncAdjustmentsToCloud,
  syncVacationsToCloud,
  syncCurrencyToCloud,
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
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  const [employees, setEmployees] = useState<Employee[]>(() => loadEmployeesFromStorage());
  const [records, setRecords] = useState<DailyTimeRecord[]>(() => loadRecordsFromStorage());
  const [adjustments, setAdjustments] = useState<MonthlySettlementAdjustment[]>(() => loadAdjustmentsFromStorage());
  const [vacations, setVacations] = useState<VacationEntry[]>(() => loadVacationsFromStorage());
  const [currency, setCurrency] = useState<CurrencyConfig>(() => loadCurrencyFromStorage());

  // Listen to global Google Maps quota-exceeded event
  useEffect(() => {
    const handleQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
  }, []);

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
    if (adjustments.length > 0) {
      syncAdjustmentsToCloud(adjustments).catch(err => console.debug('Sync adjustments error:', err));
    }
  }, [adjustments]);

  useEffect(() => {
    saveVacationsToStorage(vacations);
    if (vacations.length > 0) {
      syncVacationsToCloud(vacations).catch(err => console.debug('Sync vacations error:', err));
    }
  }, [vacations]);

  useEffect(() => {
    saveCurrencyToStorage(currency);
    syncCurrencyToCloud(currency).catch(err => console.debug('Sync currency error:', err));
  }, [currency]);

  // Pull latest updates from Cloud (employee device punches, adjustments, vacations, currency)
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
                  if (ex) {
                    const needsDeviceLink = ce.deviceLinked && !ex.deviceLinked;
                    const cloudFaces = ce.faceDescriptors?.length || 0;
                    const localFaces = ex.faceDescriptors?.length || 0;
                    const needsFaceUpdate =
                      cloudFaces > localFaces ||
                      (ce.faceRegisteredAt && ce.faceRegisteredAt !== ex.faceRegisteredAt && cloudFaces > 0);
                    if (needsDeviceLink || needsFaceUpdate) {
                      map.set(ce.id, {
                        ...ex,
                        ...(needsDeviceLink ? { deviceLinked: true, deviceLinkedAt: ce.deviceLinkedAt } : {}),
                        ...(needsFaceUpdate
                          ? {
                              faceDescriptors: ce.faceDescriptors,
                              facePhoto: ce.facePhoto,
                              faceRegisteredAt: ce.faceRegisteredAt
                            }
                          : {})
                      });
                      hasChanges = true;
                    }
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

          // Merge adjustments (settlements / payments shown in mobile payments history)
          if (cloudData.adjustments && cloudData.adjustments.length > 0) {
            setAdjustments(prev => {
              if (prev.length === 0) return cloudData.adjustments!;
              const map = new Map<string, MonthlySettlementAdjustment>(prev.map(a => [a.id, a]));
              let hasChanges = false;
              cloudData.adjustments!.forEach(ca => {
                const ex = map.get(ca.id);
                if (!ex || (ca.isPaid && !ex.isPaid) || ca.bonusAmount !== ex.bonusAmount || ca.advanceAmount !== ex.advanceAmount) {
                  map.set(ca.id, ca);
                  hasChanges = true;
                }
              });
              return hasChanges ? Array.from(map.values()) : prev;
            });
          }

          // Merge vacations (requests from mobile app & approvals from admin)
          if (cloudData.vacations && cloudData.vacations.length > 0) {
            setVacations(prev => {
              if (prev.length === 0) return cloudData.vacations!;
              const map = new Map<string, VacationEntry>(prev.map(v => [v.id, v]));
              let hasChanges = false;
              cloudData.vacations!.forEach(cv => {
                const ex = map.get(cv.id);
                if (!ex || ex.status !== cv.status) {
                  map.set(cv.id, cv);
                  hasChanges = true;
                }
              });
              return hasChanges ? Array.from(map.values()) : prev;
            });
          }

          if (cloudData.currency && cloudData.currency.symbol) {
            setCurrency(prev =>
              prev.code === cloudData.currency!.code && prev.symbol === cloudData.currency!.symbol
                ? prev
                : cloudData.currency!
            );
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

  const handleAddVacationRequest = (vac: VacationEntry) => {
    setVacations(prev => {
      const idx = prev.findIndex(v => v.id === vac.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = vac;
        return copy;
      }
      return [vac, ...prev];
    });
  };

  // Clear all data (clean slate)
  const handleClearAllData = () => {
    resetAllStorageToDefaults();
    setEmployees([]);
    setRecords([]);
    setAdjustments([]);
    setVacations([]);
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
      vacations,
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
      if (Array.isArray(data.vacations)) {
        setVacations(data.vacations);
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

  // Decide if the app should open in Fixed Company Face Kiosk mode
  const [isFaceKioskActive, setIsFaceKioskActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    const isExplicitKiosk =
      urlParams.get('portal') === 'kiosco' ||
      window.location.hash.includes('kiosco');
    if (isExplicitKiosk) {
      localStorage.setItem('control_horas_kiosk_mode', 'true');
      return true;
    }
    const hasAdminSession = Boolean(localStorage.getItem('current_user'));
    if (!hasAdminSession && localStorage.getItem('control_horas_kiosk_mode') === 'true') {
      return true;
    }
    return false;
  });

  // Decide if the app should open in Employee Mobile Portal mode
  const [isEmployeePortalActive, setIsEmployeePortalActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('portal') === 'kiosco' || window.location.hash.includes('kiosco')) {
      return false;
    }
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
    if (isMobileDevice && !hasAdminSession && localStorage.getItem('control_horas_kiosk_mode') !== 'true') return true;
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

  const quotaBanner = quotaExceeded ? (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
      <span>
        Google Maps Platform quota reached. If you are the app owner, visit{' '}
        <a
          href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
          target="_blank"
          rel="noopener noreferrer"
          className="underline font-semibold text-amber-950 hover:text-amber-800"
        >
          maps developer site
        </a>{' '}
        for instructions to update your account.
      </span>
    </div>
  ) : null;

  // Dedicated Fixed Company Facial Recognition Kiosk App
  if (isFaceKioskActive || activeTab === 'face-kiosk') {
    return (
      <>
        {quotaBanner}
        <FaceKioskApp
          employees={employees}
          records={records}
          onUpdateEmployee={handleUpdateEmployee}
          onUpdateRecord={handleUpdateRecord}
          isAdminLoggedIn={Boolean(currentUser)}
          onExitToAdmin={() => {
            localStorage.removeItem('control_horas_kiosk_mode');
            setIsFaceKioskActive(false);
            setActiveTab('daily');
            if (window.location.hash.includes('kiosco')) {
              window.location.hash = '';
            }
          }}
        />
      </>
    );
  }

  // Direct Mobile Portal Access for Employees (does not require admin user/password)
  if (isEmployeePortalActive || activeTab === 'mobile-portal') {
    return (
      <>
        {quotaBanner}
        <EmployeeMobilePortal
          employees={employees}
          records={records}
          adjustments={adjustments}
          vacations={vacations}
          currency={currency}
          onUpdateEmployee={handleUpdateEmployee}
          onUpdateRecord={handleUpdateRecord}
          onAddVacationRequest={handleAddVacationRequest}
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
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {quotaBanner}
        <LoginScreen 
          onLoginSuccess={(user) => setCurrentUser(user)} 
          onGoToEmployeePortal={() => setIsEmployeePortalActive(true)}
          onGoToFaceKiosk={() => {
            localStorage.setItem('control_horas_kiosk_mode', 'true');
            setIsFaceKioskActive(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans">
      {quotaBanner}
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

            {activeTab === 'map' && (
              <LocationMapView
                dateStr={dateStr}
                setDateStr={setDateStr}
                monthStr={monthStr}
                setMonthStr={setMonthStr}
                employees={employees}
                records={records}
              />
            )}

            {activeTab === 'employees' && (
              <EmployeeManagementView
                employees={employees}
                currency={currency}
                vacations={vacations}
                onUpdateVacations={setVacations}
                onAddEmployee={handleAddEmployee}
                onUpdateEmployee={handleUpdateEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                onGoToExEmployees={() => setActiveTab('ex-employees')}
                onOpenMobilePortal={(key) => {
                  setMobilePortalLicense(key);
                  setIsEmployeePortalActive(true);
                  setActiveTab('mobile-portal');
                }}
                onOpenFaceKiosk={() => {
                  setIsFaceKioskActive(true);
                  setActiveTab('face-kiosk');
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
            ⏱️ <strong>Gestion de Empleados</strong> · Sistema con 2 Entradas y 2 Salidas Diarias
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
