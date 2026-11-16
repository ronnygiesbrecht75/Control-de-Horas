import React, { useState, useEffect, useRef } from 'react';
import { Employee } from '../types';
import {
  Camera,
  CheckCircle2,
  X,
  Upload,
  RefreshCw,
  Trash2,
  ScanFace,
  AlertCircle,
  Loader2
} from 'lucide-react';
import {
  loadFaceModels,
  detectSingleFaceDescriptor,
  captureVideoSnapshot,
  captureImageSnapshot,
  playKioskBeep
} from '../utils/faceRecognition';

interface FaceEnrollModalProps {
  employee: Employee;
  onSaveEmployee: (updated: Employee) => void;
  onClose: () => void;
}

export const FaceEnrollModal: React.FC<FaceEnrollModalProps> = ({
  employee,
  onSaveEmployee,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [modelsReady, setModelsReady] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [samples, setSamples] = useState<number[][]>(employee.faceDescriptors || []);
  const [previewPhoto, setPreviewPhoto] = useState<string>(employee.facePhoto || '');
  const [liveFaceDetected, setLiveFaceDetected] = useState<boolean>(false);
  const [capturing, setCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stop camera cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setLiveFaceDetected(false);
  };

  // Load face recognition models once on mount
  useEffect(() => {
    let cancelled = false;
    loadFaceModels()
      .then(() => {
        if (!cancelled) setModelsReady(true);
      })
      .catch((err) => {
        console.error('Error loading face models:', err);
        if (!cancelled) {
          setModelsError('No se pudieron cargar los modelos de reconocimiento facial.');
        }
      });

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, []);

  // Start camera
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    stopCamera();
    setCameraError(null);
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Este dispositivo o navegador no habilitó el acceso a la cámara. Puedes subir una foto.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch {
      setCameraError('No se pudo abrir la cámara. Verifica los permisos o sube una foto de frente.');
    }
  };

  // Live lightweight detection indicator while camera is active
  useEffect(() => {
    if (!cameraActive || !modelsReady) return;
    let cancelled = false;
    let timer: number | undefined;

    const checkLive = async () => {
      if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
        if (!cancelled) timer = window.setTimeout(checkLive, 450);
        return;
      }
      try {
        const res = await detectSingleFaceDescriptor(videoRef.current);
        if (!cancelled) {
          setLiveFaceDetected(Boolean(res));
        }
      } catch {
        // Ignore single frame errors
      }
      if (!cancelled) {
        timer = window.setTimeout(checkLive, 500);
      }
    };

    timer = window.setTimeout(checkLive, 350);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [cameraActive, modelsReady]);

  const handleCaptureFromCamera = async () => {
    if (!videoRef.current || !modelsReady || capturing) return;
    setCapturing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const result = await detectSingleFaceDescriptor(videoRef.current);
      if (!result) {
        setErrorMessage('No se detectó ningún rostro claro. Acércate un poco más con buena luz e intenta nuevamente.');
        playKioskBeep('warning');
        setCapturing(false);
        return;
      }

      const photo = captureVideoSnapshot(videoRef.current, 420, 0.8);
      const nextSamples = [...samples, result.descriptor].slice(-4);
      setSamples(nextSamples);
      if (photo) setPreviewPhoto(photo);

      playKioskBeep('success');
      setStatusMessage(
        nextSamples.length === 1
          ? 'Muestra 1 guardada. Puedes guardar ahora o capturar otra con distinto ángulo.'
          : `Muestra ${nextSamples.length} agregada para mayor precisión.`
      );
    } catch {
      setErrorMessage('Ocurrió un error al analizar el rostro. Intenta otra captura.');
    } finally {
      setCapturing(false);
    }
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCapturing(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const result = await detectSingleFaceDescriptor(img);
      if (!result) {
        setErrorMessage('No se pudo detectar un rostro frontal en esa imagen. Prueba con una foto más clara.');
        setCapturing(false);
        return;
      }

      const compressed = captureImageSnapshot(img, 420, 0.82);
      const nextSamples = [...samples, result.descriptor].slice(-4);
      setSamples(nextSamples);
      setPreviewPhoto(compressed || dataUrl);
      playKioskBeep('success');
      setStatusMessage('Rostro extraído de la foto correctamente.');
    } catch {
      setErrorMessage('No se pudo procesar el archivo seleccionado.');
    } finally {
      setCapturing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveAndClose = () => {
    stopCamera();
    onSaveEmployee({
      ...employee,
      faceDescriptors: samples.length > 0 ? samples : undefined,
      facePhoto: samples.length > 0 ? previewPhoto : undefined,
      faceRegisteredAt: samples.length > 0 ? new Date().toISOString() : undefined
    });
    onClose();
  };

  const handleClearFaces = () => {
    setSamples([]);
    setPreviewPhoto('');
    setStatusMessage('Muestras faciales borradas. Presiona Guardar para confirmar.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ScanFace className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold truncate">Registro Facial para Kiosco</h3>
              <p className="text-xs text-slate-400 truncate">
                {employee.name} · {employee.role || 'Empleado'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {!modelsReady && !modelsError && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 text-xs text-slate-700 font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span>Preparando motor de reconocimiento facial local...</span>
            </div>
          )}

          {modelsError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{modelsError}</span>
            </div>
          )}

          {/* Live Camera Preview or Start Prompt */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden relative aspect-[4/3] flex items-center justify-center border border-slate-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${cameraActive ? 'block' : 'hidden'}`}
            />

            {!cameraActive && (
              <div className="text-center p-6 space-y-4">
                {previewPhoto ? (
                  <img
                    src={previewPhoto}
                    alt={employee.name}
                    className="w-28 h-28 rounded-2xl object-cover mx-auto border-2 border-emerald-500 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <ScanFace className="w-10 h-10" />
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">
                    {samples.length > 0
                      ? `${samples.length} muestra(s) faciales registradas`
                      : 'Sin rostro registrado todavía'}
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Enciende la cámara y captura el rostro de frente para que el kiosco lo reconozca al instante.
                  </p>
                </div>

                {cameraError && (
                  <p className="text-xs text-amber-300 bg-amber-950/60 border border-amber-800/70 rounded-xl px-3 py-2 max-w-sm mx-auto">
                    {cameraError}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={!modelsReady}
                    onClick={() => startCamera('user')}
                    className="min-h-[44px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Abrir Cámara</span>
                  </button>

                  <button
                    type="button"
                    disabled={!modelsReady || capturing}
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Subir Foto</span>
                  </button>
                </div>
              </div>
            )}

            {/* Overlay guide when camera is active */}
            {cameraActive && (
              <>
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div
                    className={`w-48 h-60 rounded-3xl border-2 transition-colors ${
                      liveFaceDetected
                        ? 'border-emerald-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]'
                        : 'border-white/50 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]'
                    }`}
                  />
                </div>
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md ${
                      liveFaceDetected
                        ? 'bg-emerald-600/90 text-white'
                        : 'bg-slate-900/80 text-slate-200'
                    }`}
                  >
                    {liveFaceDetected ? 'Rostro detectado' : 'Centra el rostro en el recuadro'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = facingMode === 'user' ? 'environment' : 'user';
                      setFacingMode(next);
                      startCamera(next);
                    }}
                    className="min-h-[40px] px-3 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Cambiar cámara</span>
                  </button>
                </div>
              </>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadPhoto}
              className="hidden"
            />
          </div>

          {/* Camera capture actions when live */}
          {cameraActive && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={!modelsReady || capturing}
                onClick={handleCaptureFromCamera}
                className="flex-1 min-h-[48px] px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
              >
                {capturing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analizando rostro...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Capturar Muestra ({samples.length}/4)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={capturing}
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[48px] px-3.5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Subir Foto</span>
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Summary Row */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-600">
            <span>
              Muestras capturadas:{' '}
              <strong className="text-slate-900 tabular-nums">{samples.length}</strong> (recomendado 1–3 ángulos)
            </span>
            {samples.length > 0 && (
              <button
                type="button"
                onClick={handleClearFaces}
                className="min-h-[36px] px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveAndClose}
            className="min-h-[44px] px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Rostro</span>
          </button>
        </div>
      </div>
    </div>
  );
};
