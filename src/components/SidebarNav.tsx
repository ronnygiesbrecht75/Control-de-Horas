import React from 'react';
import { ActiveTab } from '../types';
import { 
  Clock, 
  Calendar, 
  DollarSign, 
  Users, 
  UserX,
  ChevronRight,
  Layers
} from 'lucide-react';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  exEmployeesCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  exEmployeesCount = 0
}) => {
  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: 'daily',
      label: 'Carga diaria',
      icon: <Clock className="w-5 h-5 shrink-0" />
    },
    {
      id: 'monthly',
      label: 'Planilla mensual',
      icon: <Calendar className="w-5 h-5 shrink-0" />
    },
    {
      id: 'settlement',
      label: 'Liquidación',
      icon: <DollarSign className="w-5 h-5 shrink-0" />,
      badge: 'Pago'
    },
    {
      id: 'employees',
      label: 'Empleados',
      icon: <Users className="w-5 h-5 shrink-0" />
    },
    {
      id: 'ex-employees',
      label: 'Ex Empleados',
      icon: <UserX className="w-5 h-5 shrink-0" />,
      badge: exEmployeesCount > 0 ? `${exEmployeesCount}` : undefined
    }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
      <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3.5 mb-3.5">
        <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
          <Layers className="w-4 h-4" />
        </div>
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
          Navegación
        </h2>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-slate-50/80 hover:bg-orange-50/70 text-slate-700 hover:text-orange-700 border border-slate-200/80 hover:border-orange-200'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 shadow-2xs border border-slate-200'
                  }`}
                >
                  {item.icon}
                </div>
                <span className="font-bold text-sm sm:text-[15px] truncate">
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
    </div>
  );
};
