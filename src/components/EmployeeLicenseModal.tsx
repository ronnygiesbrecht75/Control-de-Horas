import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { 
  KeyRound, 
  X, 
  Copy, 
  Check, 
  Smartphone, 
  QrCode, 
  RefreshCw, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle,
  Share2,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';
import QRCode from 'qrcode';
import { generateLicenseKey } from '../data/mockData';

interface EmployeeLicenseModalProps {
  employee: Employee;
  onUpdateEmployee: (emp: Employee) => void;
  onClose: () => void;
  onOpenMobilePortal: (licenseKey: string) => void;
}

export const EmployeeLicenseModal: React.FC<EmployeeLicenseModalProps> = ({
  employee,
  onUpdateEmployee,
  onClose,
  onOpenMobilePortal
}) => {
  const [currentKey, setCurrentKey] = useState(employee.licenseKey || generateLicenseKey(employee.name));
  const [isActive, setIsActive] = useState(employee.licenseActive !== false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Default cloud/web app URL for phones and external devices
  const CLOUD_APP_URL = 'https://ais-pre-bzq2vla6xllilcoamfkh66-352215019352.us-east5.run.app';

  // Detect if running inside Electron on PC (protocol is file: or origin is file:// or null)
  const isElectronOrFile = 
    typeof window !== 'undefined' && 
    (window.location.protocol === 'file:' || !window.location.origin || window.location.origin === 'null' || window.location.origin.startsWith('file:'));

  const [webBaseUrl, setWebBaseUrl] = useState<string>(() => {
    return localStorage.getItem('control_horas_custom_web_url') || (isElectronOrFile ? CLOUD_APP_URL : window.location.origin);
  });
  const [showUrlConfig, setShowUrlConfig] = useState(false);

  // Generate mobile portal direct link with embedded employee activation data
  const safeBase = (webBaseUrl.trim() || CLOUD_APP_URL).replace(/\/+$/, '');
  const employeeParams = `portal=empleado&licencia=${encodeURIComponent(currentKey)}&emp_id=${encodeURIComponent(employee.id)}&emp_name=${encodeURIComponent(employee.name)}&emp_role=${encodeURIComponent(employee.role || 'Operario')}`;
  const portalUrl = `${safeBase}/?${employeeParams}#portal-empleado`;

  // Generate QR code
  useEffect(() => {
    QRCode.toDataURL(portalUrl, {
      width: 260,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Error generating QR:', err));
  }, [portalUrl]);

  const handleCopyKey = () => {
    navigator.clipboard.writeText(currentKey);
    setCopiedKey(true);
    setToastMessage('¡Clave de licencia copiada al portapapeles!');
    setTimeout(() => {
      setCopiedKey(false);
      setToastMessage(null);
    }, 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    setToastMessage('¡Enlace de activación copiado!');
    setTimeout(() => {
      setCopiedLink(false);
      setToastMessage(null);
    }, 2500);
  };

  const handleOpenWhatsApp = () => {
    const msg = `Hola ${employee.name}, aquí tienes tu acceso al Marcador Móvil. Ábrelo en tu celular para registrar tus horarios:\n\n${portalUrl}\n\nClave de Licencia: ${currentKey}`;
    const cleanPhone = (employee.phone || '').replace(/[^0-9]/g, '');
    const url = cleanPhone 
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleRegenerateKey = () => {
    if (window.confirm('¿Desea generar una nueva Clave de Licencia? Si el empleado ya tenía un celular vinculado, deberá actualizar la clave.')) {
      const newKey = generateLicenseKey(employee.name);
      setCurrentKey(newKey);
      onUpdateEmployee({
        ...employee,
        licenseKey: newKey,
        deviceLinked: false,
        deviceLinkedAt: undefined
      });
      setToastMessage('Nueva clave generada con éxito');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleToggleActive = () => {
    const nextStatus = !isActive;
    setIsActive(nextStatus);
    onUpdateEmployee({
      ...employee,
      licenseActive: nextStatus
    });
    setToastMessage(nextStatus ? 'Licencia habilitada' : 'Licencia suspendida');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUnlinkDevice = () => {
    if (window.confirm('¿Desea desvincular el dispositivo actual de este empleado? Podrá ingresar la clave en un nuevo teléfono.')) {
      onUpdateEmployee({
        ...employee,
        deviceLinked: false,
        deviceLinkedAt: undefined
      });
      setToastMessage('Dispositivo desvinculado con éxito');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-6">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Clave de Licencia & App Celular</h3>
              <p className="text-xs text-slate-400">{employee.name} · {employee.role}</p>
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

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5">
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Key Display Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Clave de Licencia del Empleado:
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {isActive ? 'Activa' : 'Suspendida'}
                </span>
                <button
                  type="button"
                  onClick={handleToggleActive}
                  className="text-xs text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                  title={isActive ? 'Suspender licencia' : 'Habilitar licencia'}
                >
                  {isActive ? <Unlock className="w-3.5 h-3.5 text-emerald-600" /> : <Lock className="w-3.5 h-3.5 text-rose-600" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border-2 border-blue-200 rounded-xl px-4 py-2.5 font-mono font-black text-lg text-blue-900 tracking-wider text-center select-all">
                {currentKey}
              </div>
              <button
                type="button"
                onClick={handleCopyKey}
                className="px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Copiar Clave"
              >
                {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey ? 'Copiada' : 'Copiar'}</span>
              </button>
            </div>

            {/* Device Status */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
              <div className="flex items-center gap-1.5 text-slate-600">
                <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {employee.deviceLinked ? (
                    <strong className="text-emerald-700">📱 Celular vinculado</strong>
                  ) : (
                    <span className="text-slate-500">Pendiente de vinculación en celular</span>
                  )}
                </span>
              </div>
              {employee.deviceLinked && (
                <button
                  type="button"
                  onClick={handleUnlinkDevice}
                  className="text-[11px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                >
                  Desvincular
                </button>
              )}
            </div>
          </div>

          {/* QR Code & Share link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            {/* QR */}
            <div className="text-center space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">
                Escanear con Cámara del Celular:
              </span>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-40 h-40 mx-auto rounded-xl border border-slate-200 shadow-sm bg-white p-1.5"
                />
              ) : (
                <div className="w-40 h-40 mx-auto bg-slate-200 rounded-xl animate-pulse" />
              )}
              <p className="text-[10px] text-slate-500 leading-tight">
                El empleado escanea este código y la app se abre ya activada en su teléfono.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Opciones de Envío / Activación:
              </span>

              {/* Send direct WhatsApp */}
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Enviar por WhatsApp al Empleado</span>
              </button>

              {/* Copy WhatsApp Link */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace de Activación'}</span>
              </button>

              {/* Open in this device to test */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenMobilePortal(currentKey);
                }}
                className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Probar Marcador de este Empleado</span>
              </button>

              {/* Web URL config toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowUrlConfig(!showUrlConfig)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 underline cursor-pointer"
                >
                  {showUrlConfig ? 'Ocultar dirección web' : '⚙️ Configurar dirección web de la app móvil'}
                </button>
                {showUrlConfig && (
                  <div className="mt-1.5 p-2.5 bg-white border border-slate-200 rounded-xl space-y-1.5 text-left">
                    <label className="text-[10px] font-bold text-slate-600 uppercase block">
                      URL Web para Teléfonos Móviles:
                    </label>
                    <input
                      type="text"
                      value={webBaseUrl}
                      onChange={(e) => {
                        setWebBaseUrl(e.target.value);
                        localStorage.setItem('control_horas_custom_web_url', e.target.value);
                      }}
                      placeholder="https://..."
                      className="w-full text-xs font-mono px-2 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-[9px] text-slate-400">
                      Esta es la dirección pública que cargará el celular al escanear el QR o abrir el enlace de WhatsApp.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
