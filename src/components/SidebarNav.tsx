import React from 'react';
import { ActiveTab } from '../types';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  Users, 
  ChevronRight,
  Layers
} from 'lucide-react';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab
}) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'daily',
      label: 'Carga diaria',
      description: 'Registrar entradas y salidas',
      icon: <Clock className="w-5 h-5 shrink-0" />
    },
    {
      id: 'monthly',
      label: 'Planilla mensual',
      description: 'Ver horas de todo el mes',
      icon: <Calendar className="w-5 h-5 shrink-0" />
    },
    {
      id: 'settlement',
      label: 'Arreglo de fin de mes',
      description: 'Liquidación y pagos',
      icon: <DollarSign className="w-5 h-5 shrink-0" />,
      badge: 'Pago'
    },
    {
      id: 'employees',
      label: 'Empleados',
      description: 'Gestionar equipo y tarifas',
      icon: <Users className="w-5 h-5 shrink-0" />
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-3.5">
        <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Navegación
          </h2>
          <p className="text-[11px] text-slate-400">
            Selecciona una sección
          </p>
        </div>
      </div>

      <nav className="space-y-2.5">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-50/80 hover:bg-orange-50/70 text-slate-700 hover:text-orange-700 border border-slate-200/80 hover:border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 shadow-sm border border-slate-200'
                  }`}
                >
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-sm truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white text-orange-700'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      isActive ? 'text-orange-100' : 'text-slate-400'
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </div>

              <ChevronRight
                className={`w-4 h-4 shrink-0 ml-2 transition-transform ${
                  isActive
                    ? 'text-white translate-x-0.5'
                    : 'text-slate-400'
                }`}
              />
            </button>
          );
        })}
      </nav>

      <div className="mt-4 pt-3.5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">💡 Consejo de uso</p>
        <p>
          Revisa la planilla mensual y haz el arreglo final desde el menú lateral izquierdo de manera directa.
        </p>
      </div>
    </div>
  );
};
