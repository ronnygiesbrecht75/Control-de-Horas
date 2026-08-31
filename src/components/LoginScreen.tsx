import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, LogIn, UserPlus } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (username: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Password validation: minimum 4 characters (letters, numbers, symbols)
  const validatePassword = (pass: string): boolean => {
    return pass.length >= 4;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('Por favor, ingrese un nombre de usuario.');
      return;
    }

    if (!validatePassword(password)) {
      setError('La contraseña debe tener al menos 4 caracteres (puede incluir mayúsculas, minúsculas, números o símbolos).');
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden.');
        return;
      }

      // Save user credentials locally
      const usersMap = JSON.parse(localStorage.getItem('app_users_map') || '{}');
      if (usersMap[username.toLowerCase()]) {
        setError('Este nombre de usuario ya existe. Intente iniciar sesión.');
        return;
      }

      usersMap[username.toLowerCase()] = {
        username,
        password
      };
      localStorage.setItem('app_users_map', JSON.stringify(usersMap));
      localStorage.setItem('current_user', username);
      onLoginSuccess(username);
    } else {
      // Check login
      const usersMap = JSON.parse(localStorage.getItem('app_users_map') || '{}');
      const savedUser = usersMap[username.toLowerCase()];

      // Default access fallback or matching registered credentials
      if (savedUser && savedUser.password === password) {
        localStorage.setItem('current_user', savedUser.username);
        onLoginSuccess(savedUser.username);
      } else if (!savedUser && username.toLowerCase() === 'admin' && password === 'admin') {
        // Create default admin if none exists
        usersMap['admin'] = { username: 'Admin', password: 'admin' };
        localStorage.setItem('app_users_map', JSON.stringify(usersMap));
        localStorage.setItem('current_user', 'Admin');
        onLoginSuccess('Admin');
      } else {
        setError('Usuario o contraseña incorrectos. Verifique sus datos o cree una cuenta nueva.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 sm:p-8 text-white text-center relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldCheck className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Control de Planillas
          </h1>
          <p className="text-orange-100 text-xs sm:text-sm mt-1">
            Gestión de Horas y Liquidaciones - Paraguay (₲)
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-slate-800">
              {isRegistering ? 'Crear Cuenta de Usuario' : 'Iniciar Sesión'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isRegistering
                ? 'Elige un usuario y una contraseña segura (mínimo 4 caracteres).'
                : 'Ingresa con tu usuario y contraseña para continuar.'}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: admin"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Contraseña (mínimo 4 caracteres)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Puede contener letras mayúsculas, minúsculas, números y símbolos.
              </p>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Registrar y Entrar</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Ingresar al Sistema</span>
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline"
            >
              {isRegistering
                ? '¿Ya tienes una cuenta? Iniciar Sesión'
                : '¿No tienes cuenta? Registrar usuario nuevo'}
            </button>
          </div>

          {!isRegistering && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 text-center">
              <span className="font-semibold text-slate-700">Acceso predeterminado:</span> Usuario: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">admin</code> | Clave: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">admin</code>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
