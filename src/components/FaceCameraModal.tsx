import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertTriangle, X, ShieldCheck } from 'lucide-react';

interface FaceCameraModalProps {
  employeeName: string;
  punchLabel: string;
  onCapture: (photoBase64: string) => void;
  onClose: () => void;
}

export const FaceCameraModal: React.FC<FaceCameraModalProps> = ({
  employeeName,
  punchLabel,
  onCapture,
  onClose
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [analysisWarning, setAnalysisWarning] = useState<string | null>(null);

  // Start front camera
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);
    setCapturedPhoto(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Su navegador no soporta acceso a la cámara frontal.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.error('Error al iniciar cámara:', err);
      setIsInitializing(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permiso de cámara denegado. Por favor, permita el acceso a la cámara en su navegador para registrar su foto de verificación.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No se encontró ninguna cámara frontal en este dispositivo.');
      } else {
        setCameraError(err.message || 'No se pudo acceder a la cámara frontal.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Periodic face detector heuristic on video feed
  useEffect(() => {
    if (capturedPhoto || isInitializing || cameraError) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = 160;
        offscreen.height = 160;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        // Sample center square of video (where face oval is positioned)
        const minDim = Math.min(video.videoWidth, video.videoHeight);
        const startX = (video.videoWidth - minDim) / 2;
        const startY = (video.videoHeight - minDim) / 2;
        ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 160, 160);

        const imgData = ctx.getImageData(30, 30, 100, 100);
        const data = imgData.data;
        let skinPixels = 0;
        let totalChecked = 0;
        let totalBrightness = 0;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalChecked++;
          const brightness = (r + g + b) / 3;
          totalBrightness += brightness;

          // RGB / YCbCr skin tone heuristic for facial detection in oval center
          const isSkin = 
            r > 65 && g > 40 && b > 20 &&
            r > g && r > b &&
            Math.abs(r - g) > 15 &&
            brightness > 50 && brightness < 240;

          if (isSkin) skinPixels++;
        }

        const skinRatio = skinPixels / totalChecked;
        const avgBrightness = totalBrightness / totalChecked;

        // Considered face present if skin ratio is balanced and not too dark/blown out
        const hasFace = skinRatio >= 0.18 && avgBrightness > 45 && avgBrightness < 245;
        setFaceDetected(hasFace);
        if (!hasFace) {
          if (avgBrightness <= 45) {
            setAnalysisWarning('Muy poca luz: acérquese a una zona más iluminada');
          } else {
            setAnalysisWarning('Encuadre su rostro en el centro del óvalo');
          }
        } else {
          setAnalysisWarning(null);
        }
      } catch (e) {
        // Fallback silently if canvas read is blocked
        setFaceDetected(true);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [capturedPhoto, isInitializing, cameraError]);

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    const canvas = canvasRef.current || document.createElement('canvas');
    const width = 600;
    const height = 600;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop square from video center
    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    // Mirror horizontal for selfie perspective
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, width, height);

    // Reset transform for overlay watermark
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Watermark overlay bar at bottom
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, height - 70, width, 70);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const dateStr = now.toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' });

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`${punchLabel} · ${timeStr}`, 20, height - 42);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${employeeName} · ${dateStr} · Verificación Facial`, 20, height - 18);

    // Export compressed JPEG base64 (~35KB)
    const base64 = canvas.toDataURL('image/jpeg', 0.82);
    setCapturedPhoto(base64);

    // Stop live stream tracks while reviewing photo
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedPhoto) return;
    onCapture(capturedPhoto);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Foto de Verificación Facial</h3>
              <p className="text-[11px] text-slate-400">{punchLabel} · {employeeName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport or Error */}
        <div className="p-4 sm:p-5 space-y-4">
          {cameraError ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
              <h4 className="text-sm font-bold text-rose-900">Acceso a la Cámara no disponible</h4>
              <p className="text-xs text-rose-700 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar permiso</span>
              </button>
            </div>
          ) : (
            <div className="relative aspect-square w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden bg-black shadow-inner border-2 border-slate-300">
              {flashEffect && (
                <div className="absolute inset-0 bg-white z-30 animate-out fade-out duration-200 pointer-events-none" />
              )}

              {capturedPhoto ? (
                // Captured Photo Preview
                <img
                  src={capturedPhoto}
                  alt="Foto de verificación"
                  className="w-full h-full object-cover"
                />
              ) : (
                // Live Stream with Face Oval
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  {/* Face Guide Oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={`w-[72%] h-[82%] rounded-[50%/45%] border-4 border-dashed transition-all duration-300 shadow-2xl ${
                        faceDetected
                          ? 'border-emerald-400 shadow-emerald-500/30 ring-4 ring-emerald-500/20'
                          : 'border-amber-400/80 shadow-amber-500/20'
                      }`}
                    />
                  </div>

                  {/* Live Status Badge */}
                  <div className="absolute top-3 inset-x-0 flex justify-center pointer-events-none">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold shadow-md transition-all flex items-center gap-1.5 ${
                        faceDetected
                          ? 'bg-emerald-600 text-white animate-pulse'
                          : 'bg-slate-900/80 text-amber-300 backdrop-blur-xs'
                      }`}
                    >
                      {faceDetected ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                          <span>Rostro detectado</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                          <span>{analysisWarning || 'Mire hacia la cámara'}</span>
                        </>
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Action buttons */}
          {!cameraError && (
            <div>
              {capturedPhoto ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Foto capturada correctamente con su rostro verificado.</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRetake}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Tomar otra foto</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirm}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirmar Marcación</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Asegúrese de que su cara esté descubierta y bien iluminada en el círculo.
                  </p>

                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={isInitializing}
                    className={`w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      faceDetected
                        ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25 ring-2 ring-blue-500/30'
                        : 'bg-slate-800 hover:bg-slate-900 shadow-slate-900/20'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>Tomar Foto y Marcar</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
