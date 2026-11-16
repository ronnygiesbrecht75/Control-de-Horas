import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Employee,
  DailyTimeRecord,
  PunchAuditLog,
  IntermediateExit,
  PunchLocation
} from '../types';
import {
  ScanFace,
  Camera,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Clock,
  Users,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Lock,
  UserCheck
} from 'lucide-react';
import {
  loadFaceModels,
  detectSingleFaceDescriptor,
  findBestMatchingEmployee,
  captureVideoSnapshot,
  playKioskBeep
} from '../utils/faceRecognition';
import {
  getTodayDateStr,
  getCurrentTimeStr,
  calculateDailyTotalHours
} from '../utils/timeUtils';
import { syncPunchToCloud, syncEmployeesToCloud } from '../utils/syncService';
import { FaceEnrollModal } from './FaceEnrollModal';

interface FaceKioskAppProps {
  employees: Employee[];
  records: DailyTimeRecord[];
  onUpdateEmployee: (emp: Employee) => void;
  onUpdateRecord: (record: DailyTimeRecord) => void;
  isAdminLoggedIn?: boolean;
  onExitToAdmin?: () => void;
}

interface KioskConfirmation {
  employee: Employee;
  slotLabel: string;
  timeStr: string;
  photo: string;
  isIntermediate: boolean;
  confidencePct: number;
  alreadyDoneWarning?: string;
}

export const FaceKioskApp: React.FC<FaceKioskAppProps> = ({
  employees,
  records,
  onUpdateEmployee,
  onUpdateRecord,
  isAdminLoggedIn = false,
  onExitToAdmin
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Refs for latest props inside animation/interval loop
  const employeesRef = useRef<Employee[]>(employees);
  const recordsRef = useRef<DailyTimeRecord[]>(records);
  const punchModeRef = useRef<'auto' | 'intermedia'>('auto');
  const consecutiveMatchRef = useRef<{ empId: string; count: number }>({ empId: '', count: 0 });
  const lastPunchAtRef = useRef<Record<string, number>>({});
  const confirmationTimerRef = useRef<number | null>(null);
  const cachedGpsRef = useRef<PunchLocation | undefined>(undefined);

  useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const [now, setNow] = useState<Date>(() => new Date());
  const [punchMode, setPunchMode] = useState<'auto' | 'intermedia'>('auto');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [scanHint, setScanHint] = useState<string>('Coloca tu rostro frente a la cámara');
  const [confirmation, setConfirmation] = useState<KioskConfirmation | null>(null);

  // Face enrollment management overlay
  const [showEnrollManager, setShowEnrollManager] = useState(false);
  const [enrollingEmployee, setEnrollingEmployee] = useState<Employee | null>(null);
  const [showPinPrompt, setShowPinPrompt] = useState(false);
  const [pinPurpose, setPinPurpose] = useState<'enroll' | 'exit'>('enroll');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  // Keep punchModeRef synced
  useEffect(() => {
    punchModeRef.current = punchMode;
  }, [punchMode]);

  // Live clock every second
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Optional background GPS cache for fixed company location (non-blocking)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          cachedGpsRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy),
            capturedAt: new Date().toISOString()
          };
        },
        () => {},
        { enableHighAccuracy: false, timeout: 4000, maximumAge: 600000 }
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const startCamera = useCallback(
    async (mode: 'user' | 'environment' = facingMode) => {
      stopCamera();
      setCameraError(null);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Este navegador no permite acceso a la cámara.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 720 },
            height: { ideal: 540 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      } catch {
        setCameraError('Permiso de cámara denegado o cámara ocupada. Verifica permisos en el navegador.');
      }
    },
    [facingMode, stopCamera]
  );

  // Initialize models and camera (pause main kiosk camera while FaceEnrollModal is open)
  useEffect(() => {
    let cancelled = false;
    loadFaceModels()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setModelsError('No se pudo cargar el motor de reconocimiento facial.');
        }
      });

    return () => {
      cancelled = true;
      if (confirmationTimerRef.current) {
        window.clearTimeout(confirmationTimerRef.current);
      }
      stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (!enrollingEmployee && !showEnrollManager) {
      startCamera(facingMode);
    } else if (enrollingEmployee) {
      // Release camera exclusively for FaceEnrollModal
      stopCamera();
    }
  }, [enrollingEmployee, showEnrollManager, facingMode, startCamera, stopCamera]);

  // Execute punch calculation & persistence for a recognized employee
  const recordPunchForEmployee = useCallback(
    (emp: Employee, snapshotPhoto: string, confidencePct: number) => {
      const todayStr = getTodayDateStr();
      const timeStr = getCurrentTimeStr();
      const existing = recordsRef.current.find(
        (r) => r.employeeId === emp.id && r.dateStr === todayStr
      );

      const baseRecord: DailyTimeRecord = existing
        ? {
            ...existing,
            punches: existing.punches ? [...existing.punches] : [],
            intermediateExits: existing.intermediateExits
              ? [...existing.intermediateExits]
              : []
          }
        : {
            id: `${emp.id}_${todayStr}`,
            employeeId: emp.id,
            dateStr: todayStr,
            entry1: '',
            exit1: '',
            entry2: '',
            exit2: '',
            punches: [],
            intermediateExits: []
          };

      const isIntermediate = punchModeRef.current === 'intermedia';
      let slotLabel = '';
      let punchType: PunchAuditLog['type'] = 'entry1';
      let alreadyDoneWarning: string | undefined;

      if (isIntermediate) {
        const exits = baseRecord.intermediateExits || [];
        const openIdx = exits.findIndex((ex) => ex.exitTime && !ex.returnTime);

        if (openIdx >= 0) {
          const updatedExit: IntermediateExit = {
            ...exits[openIdx],
            returnTime: timeStr,
            returnPhoto: snapshotPhoto,
            returnLocation: cachedGpsRef.current
          };
          exits[openIdx] = updatedExit;
          baseRecord.intermediateExits = exits;
          slotLabel = 'Regreso de Salida Intermedia';
          punchType = 'intermediate_return';
        } else {
          exits.push({
            id: `int-${Date.now()}`,
            exitTime: timeStr,
            returnTime: '',
            label: 'Salida intermedia',
            exitPhoto: snapshotPhoto,
            exitLocation: cachedGpsRef.current
          });
          baseRecord.intermediateExits = exits;
          slotLabel = 'Salida Intermedia';
          punchType = 'intermediate_exit';
        }
      } else {
        // Automatic normal schedule order
        if (!baseRecord.entry1) {
          baseRecord.entry1 = timeStr;
          baseRecord.entry1Photo = snapshotPhoto;
          baseRecord.entry1Location = cachedGpsRef.current;
          slotLabel = '1ra Entrada (Mañana)';
          punchType = 'entry1';
        } else if (!baseRecord.exit1) {
          baseRecord.exit1 = timeStr;
          baseRecord.exit1Photo = snapshotPhoto;
          baseRecord.exit1Location = cachedGpsRef.current;
          slotLabel = '1ra Salida (Mañana)';
          punchType = 'exit1';
        } else if (!baseRecord.entry2) {
          baseRecord.entry2 = timeStr;
          baseRecord.entry2Photo = snapshotPhoto;
          baseRecord.entry2Location = cachedGpsRef.current;
          slotLabel = '2da Entrada (Tarde)';
          punchType = 'entry2';
        } else if (!baseRecord.exit2) {
          baseRecord.exit2 = timeStr;
          baseRecord.exit2Photo = snapshotPhoto;
          baseRecord.exit2Location = cachedGpsRef.current;
          slotLabel = '2da Salida (Tarde)';
          punchType = 'exit2';
        } else {
          alreadyDoneWarning = `${emp.name} ya completó las 4 marcaciones de hoy. Si necesitas salir, selecciona "Salida Intermedia" abajo.`;
        }
      }

      if (alreadyDoneWarning) {
        playKioskBeep('warning');
        setConfirmation({
          employee: emp,
          slotLabel: 'Horario del día completo',
          timeStr,
          photo: snapshotPhoto,
          isIntermediate: false,
          confidencePct,
          alreadyDoneWarning
        });
        if (confirmationTimerRef.current) {
          window.clearTimeout(confirmationTimerRef.current);
        }
        confirmationTimerRef.current = window.setTimeout(() => setConfirmation(null), 2200);
        return;
      }

      const auditEntry: PunchAuditLog = {
        id: `punch-${Date.now()}`,
        type: punchType,
        time: timeStr,
        timestamp: new Date().toISOString(),
        photo: snapshotPhoto,
        label: `${slotLabel} · Kiosco Facial`,
        location: cachedGpsRef.current
      };

      baseRecord.punches = [...(baseRecord.punches || []), auditEntry];
      baseRecord.totalHours = calculateDailyTotalHours(
        baseRecord.entry1,
        baseRecord.exit1,
        baseRecord.entry2,
        baseRecord.exit2,
        baseRecord.intermediateExits
      );

      onUpdateRecord(baseRecord);
      syncPunchToCloud(baseRecord).catch(() => {});

      playKioskBeep(isIntermediate ? 'intermediate' : 'success');

      setConfirmation({
        employee: emp,
        slotLabel,
        timeStr,
        photo: snapshotPhoto,
        isIntermediate,
        confidencePct
      });

      // Reset mode back to normal automatic schedule for the next employee
      setPunchMode('auto');
      punchModeRef.current = 'auto';

      if (confirmationTimerRef.current) {
        window.clearTimeout(confirmationTimerRef.current);
      }
      confirmationTimerRef.current = window.setTimeout(() => {
        setConfirmation(null);
      }, 2000);
    },
    [onUpdateRecord]
  );

  // Real-time continuous face detection loop
  useEffect(() => {
    if (!modelsReady || !cameraReady || confirmation || showEnrollManager || enrollingEmployee || showPinPrompt) {
      // Clear overlay box when paused
      const canvas = overlayCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;
    let timerId: number | undefined;

    const scanFrame = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = overlayCanvasRef.current;

      if (!video || video.readyState < 2 || video.videoWidth === 0) {
        timerId = window.setTimeout(scanFrame, 300);
        return;
      }

      const activeWithFaces = employeesRef.current.filter(
        (e) => e.active && e.faceDescriptors && e.faceDescriptors.length > 0
      );

      try {
        const detected = await detectSingleFaceDescriptor(video);

        if (canvas && video.videoWidth > 0) {
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (detected) {
              const { x, y, width, height } = detected.box;
              // Mirror X if front camera is mirrored visually
              const drawX = facingMode === 'user' ? canvas.width - x - width : x;
              const match = activeWithFaces.length > 0
                ? findBestMatchingEmployee(detected.descriptor, activeWithFaces, 0.53)
                : null;

              ctx.strokeStyle = match ? '#10b981' : '#f59e0b';
              ctx.lineWidth = 4;
              const corner = Math.min(26, width * 0.22);

              // Draw sleek corner brackets
              ctx.beginPath();
              // Top-left
              ctx.moveTo(drawX, y + corner);
              ctx.lineTo(drawX, y);
              ctx.lineTo(drawX + corner, y);
              // Top-right
              ctx.moveTo(drawX + width - corner, y);
              ctx.lineTo(drawX + width, y);
              ctx.lineTo(drawX + width, y + corner);
              // Bottom-right
              ctx.moveTo(drawX + width, y + height - corner);
              ctx.lineTo(drawX + width, y + height);
              ctx.lineTo(drawX + width - corner, y + height);
              // Bottom-left
              ctx.moveTo(drawX + corner, y + height);
              ctx.lineTo(drawX, y + height);
              ctx.lineTo(drawX, y + height - corner);
              ctx.stroke();

              if (match) {
                const nowMs = Date.now();
                const lastPunch = lastPunchAtRef.current[match.employee.id] || 0;
                const cooldownLeftSec =
                  punchModeRef.current === 'intermedia'
                    ? 0
                    : Math.ceil((30000 - (nowMs - lastPunch)) / 1000);

                if (cooldownLeftSec > 0) {
                  setScanHint(
                    `${match.employee.name} ya marcó (${cooldownLeftSec}s)`
                  );
                  consecutiveMatchRef.current = { empId: '', count: 0 };
                } else {
                  setScanHint(`Identificado: ${match.employee.name} · Mantén un instante...`);
                  if (consecutiveMatchRef.current.empId === match.employee.id) {
                    consecutiveMatchRef.current.count += 1;
                  } else {
                    consecutiveMatchRef.current = { empId: match.employee.id, count: 1 };
                  }

                  // Require 2 consecutive consistent frames for reliable recognition
                  if (consecutiveMatchRef.current.count >= 2) {
                    consecutiveMatchRef.current = { empId: '', count: 0 };
                    lastPunchAtRef.current[match.employee.id] = nowMs;
                    const photo = captureVideoSnapshot(video, 420, 0.78);
                    recordPunchForEmployee(match.employee, photo, match.confidencePct);
                    return;
                  }
                }
              } else if (activeWithFaces.length === 0) {
                setScanHint('No hay rostros registrados. Toca «Registrar Rostros» arriba.');
                consecutiveMatchRef.current = { empId: '', count: 0 };
              } else {
                setScanHint('Rostro no reconocido. Acércate de frente con buena luz.');
                consecutiveMatchRef.current = { empId: '', count: 0 };
              }
            } else {
              consecutiveMatchRef.current = { empId: '', count: 0 };
              setScanHint(
                activeWithFaces.length === 0
                  ? 'Sin rostros registrados aún. Usa «Registrar Rostros».'
                  : punchModeRef.current === 'intermedia'
                  ? 'Modo Salida Intermedia · Mira la cámara'
                  : 'Acércate y mira la cámara para marcar tu horario'
              );
            }
          }
        }
      } catch (err) {
        console.debug('Kiosk scan frame skip:', err);
      }

      if (!cancelled) {
        timerId = window.setTimeout(scanFrame, 320);
      }
    };

    timerId = window.setTimeout(scanFrame, 350);
    return () => {
      cancelled = true;
      if (timerId) window.clearTimeout(timerId);
    };
  }, [
    modelsReady,
    cameraReady,
    confirmation,
    showEnrollManager,
    enrollingEmployee,
    showPinPrompt,
    facingMode,
    recordPunchForEmployee
  ]);

  // Admin password verification for managing faces or exiting kiosk on fixed phone
  const verifyAdminPassword = (pwd: string): boolean => {
    try {
      const savedMapRaw = localStorage.getItem('app_users_map');
      if (savedMapRaw) {
        const usersMap = JSON.parse(savedMapRaw) as Record<string, { username: string; password: string }>;
        const passwords = Object.values(usersMap).map((u) => u.password);
        if (passwords.includes(pwd)) return true;
      }
    } catch {
      // Fallback below
    }
    return pwd === 'admin';
  };

  const handleOpenAdminAction = (purpose: 'enroll' | 'exit') => {
    if (isAdminLoggedIn) {
      if (purpose === 'enroll') {
        setShowEnrollManager(true);
      } else if (onExitToAdmin) {
        stopCamera();
        onExitToAdmin();
      }
      return;
    }
    setPinPurpose(purpose);
    setAdminPasswordInput('');
    setAdminPinError('');
    setShowPinPrompt(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyAdminPassword(adminPasswordInput)) {
      setAdminPinError('Contraseña de administrador incorrecta (por defecto: admin).');
      return;
    }
    setShowPinPrompt(false);
    if (pinPurpose === 'enroll') {
      setShowEnrollManager(true);
    } else if (onExitToAdmin) {
      stopCamera();
      onExitToAdmin();
    }
  };

  const activeEmployees = employees.filter((e) => e.active);
  const enrolledCount = activeEmployees.filter(
    (e) => e.faceDescriptors && e.faceDescriptors.length > 0
  ).length;

  const timeFormatted = now.toLocaleTimeString('es-PY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const dateFormatted = now.toLocaleDateString('es-PY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Compact Top Kiosk Bar */}
      <header className="px-4 sm:px-6 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <ScanFace className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white truncate">
              Kiosco Facial · Control de Asistencia
            </h1>
            <p className="text-xs text-slate-400 truncate capitalize">
              {dateFormatted} · {enrolledCount} {enrolledCount === 1 ? 'rostro activo' : 'rostros activos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAdminAction('enroll')}
            className="min-h-[44px] px-3 sm:px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Registrar Rostros</span>
            <span className="sm:hidden">Rostros</span>
          </button>

          {onExitToAdmin && (
            <button
              type="button"
              onClick={() => handleOpenAdminAction('exit')}
              className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Salir al Panel de Administración"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Panel</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area: Live Clock + Camera Biometric Viewport */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 max-w-3xl w-full mx-auto gap-4">
        {/* Live Digital Clock + Active Mode Banner */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-slate-400 shrink-0" />
            <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums tracking-tight text-white">
              {timeFormatted}
            </span>
          </div>

          <div
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-2 ${
              punchMode === 'intermedia'
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            {punchMode === 'intermedia' ? (
              <>
                <Coffee className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Modo activo: Salida Intermedia</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Modo automático: Entrada / Salida</span>
              </>
            )}
          </div>
        </div>

        {/* Camera Viewport Focal Anchor */}
        <div
          className={`relative w-full aspect-[4/3] sm:aspect-[16/10] bg-slate-900 rounded-3xl overflow-hidden border-2 transition-colors shadow-2xl ${
            confirmation
              ? confirmation.alreadyDoneWarning
                ? 'border-amber-500'
                : confirmation.isIntermediate
                ? 'border-amber-400'
                : 'border-emerald-400'
              : punchMode === 'intermedia'
              ? 'border-amber-500/70'
              : 'border-slate-800'
          }`}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Top-left hint & camera switch inside viewport */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950/80 backdrop-blur-md text-xs sm:text-sm font-semibold text-slate-100 border border-white/10">
              {!modelsReady && !modelsError
                ? 'Cargando reconocimiento facial...'
                : modelsError || cameraError || scanHint}
            </div>

            <button
              type="button"
              onClick={() => setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))}
              className="pointer-events-auto min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-950/80 hover:bg-slate-900 text-slate-200 rounded-xl border border-white/10 backdrop-blur-md flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Cambiar cámara frontal / trasera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Model loading overlay */}
          {!modelsReady && !modelsError && (
            <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-9 h-9 animate-spin text-emerald-400" />
              <p className="text-sm font-semibold text-slate-200">
                Iniciando cámara y motor facial...
              </p>
            </div>
          )}

          {/* Error fallback */}
          {(cameraError || modelsError) && (
            <div className="absolute inset-0 bg-slate-950/85 flex flex-col items-center justify-center p-6 text-center gap-3">
              <AlertCircle className="w-10 h-10 text-amber-400" />
              <p className="text-sm font-bold text-white max-w-sm">
                {cameraError || modelsError}
              </p>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Reintentar cámara
              </button>
            </div>
          )}

          {/* Recognition Success Confirmation Overlay */}
          {confirmation && (
            <div
              onClick={() => {
                if (confirmationTimerRef.current) {
                  window.clearTimeout(confirmationTimerRef.current);
                }
                setConfirmation(null);
              }}
              title="Toca para pasar al siguiente empleado"
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-4">
                {confirmation.photo ? (
                  <img
                    src={confirmation.photo}
                    alt={confirmation.employee.name}
                    className={`w-24 h-24 rounded-2xl object-cover border-2 shadow-xl ${
                      confirmation.alreadyDoneWarning
                        ? 'border-amber-400'
                        : confirmation.isIntermediate
                        ? 'border-amber-400'
                        : 'border-emerald-400'
                    }`}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl font-bold">
                    {confirmation.employee.name.charAt(0)}
                  </div>
                )}
              </div>

              {confirmation.alreadyDoneWarning ? (
                <>
                  <AlertCircle className="w-9 h-9 text-amber-400 mb-2" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    {confirmation.employee.name}
                  </h2>
                  <p className="text-sm text-amber-300 mt-1 max-w-md font-medium">
                    {confirmation.alreadyDoneWarning}
                  </p>
                </>
              ) : (
                <>
                  <CheckCircle2
                    className={`w-10 h-10 mb-2 ${
                      confirmation.isIntermediate ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  />
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {confirmation.employee.name}
                  </h2>
                  <p className="text-sm text-slate-300 mt-0.5">
                    {confirmation.employee.role || 'Operario'} · Coincidencia{' '}
                    <span className="tabular-nums font-bold">{confirmation.confidencePct}%</span>
                  </p>

                  <div
                    className={`mt-4 px-5 py-3 rounded-2xl border text-center ${
                      confirmation.isIntermediate
                        ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                        : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                    }`}
                  >
                    <span className="text-xs font-semibold block">{confirmation.slotLabel}</span>
                    <span className="text-2xl font-extrabold font-mono tabular-nums text-white block mt-0.5">
                      {confirmation.timeStr}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Fixed Bottom Thumb-Zone Action Bar */}
      <footer className="px-4 py-3 sm:py-4 bg-slate-900/95 border-t border-slate-800 shrink-0">
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPunchMode('auto')}
            className={`min-h-[56px] px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              punchMode === 'auto'
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/25'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
            }`}
          >
            <Camera className="w-5 h-5 shrink-0" />
            <span>Horario Normal</span>
          </button>

          <button
            type="button"
            onClick={() => setPunchMode((m) => (m === 'intermedia' ? 'auto' : 'intermedia'))}
            className={`min-h-[56px] px-4 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              punchMode === 'intermedia'
                ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-lg shadow-amber-500/30'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
            }`}
          >
            <Coffee className="w-5 h-5 shrink-0" />
            <span>Salida Intermedia</span>
          </button>
        </div>
      </footer>

      {/* Admin Password Prompt (when not logged in as admin) */}
      {showPinPrompt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handlePinSubmit}
            className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Acceso Administrador</h3>
                <p className="text-xs text-slate-500">
                  {pinPurpose === 'enroll'
                    ? 'Ingresa la clave para registrar o editar rostros.'
                    : 'Ingresa la clave para salir del Kiosco.'}
                </p>
              </div>
            </div>

            {adminPinError && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5 font-semibold">
                {adminPinError}
              </p>
            )}

            <input
              type="password"
              autoFocus
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              placeholder="Contraseña de administrador"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowPinPrompt(false)}
                className="min-h-[44px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Continuar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Face Enrollment Directory Drawer / Modal */}
      {showEnrollManager && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-base">Registrar Rostros de Empleados</h3>
                <p className="text-xs text-slate-400">
                  Toca un empleado para capturar su rostro con esta cámara
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollManager(false)}
                className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Volver al Kiosco
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-2.5">
              {activeEmployees.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No hay empleados activos cargados todavía.
                </p>
              ) : (
                activeEmployees.map((emp) => {
                  const hasFace = emp.faceDescriptors && emp.faceDescriptors.length > 0;
                  return (
                    <div
                      key={emp.id}
                      className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {emp.facePhoto ? (
                          <img
                            src={emp.facePhoto}
                            alt={emp.name}
                            className="w-11 h-11 rounded-xl object-cover border border-slate-300 shrink-0"
                          />
                        ) : (
                          <div
                            className={`w-11 h-11 rounded-xl ${emp.color || 'bg-slate-700'} text-white font-bold flex items-center justify-center text-sm shrink-0`}
                          >
                            {emp.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">
                            {emp.name}
                          </h4>
                          <p className="text-xs text-slate-500 truncate">
                            {emp.role || 'Operario'} ·{' '}
                            {hasFace
                              ? `${emp.faceDescriptors!.length} muestra(s) registradas`
                              : 'Sin rostro registrado'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setEnrollingEmployee(emp)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors ${
                          hasFace
                            ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <ScanFace className="w-4 h-4" />
                        <span>{hasFace ? 'Actualizar' : 'Registrar Rostro'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Face Enrollment Camera Modal */}
      {enrollingEmployee && (
        <FaceEnrollModal
          employee={enrollingEmployee}
          onSaveEmployee={(updated) => {
            onUpdateEmployee(updated);
            const nextList = employeesRef.current.map((e) =>
              e.id === updated.id ? updated : e
            );
            syncEmployeesToCloud(nextList).catch(() => {});
          }}
          onClose={() => setEnrollingEmployee(null)}
        />
      )}
    </div>
  );
};
