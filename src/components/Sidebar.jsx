import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LangContext';
import { Package, ShoppingCart, Users, RotateCcw, BarChart3, Settings, LogOut, Wrench, Shield, User } from 'lucide-react';

const navItems = [
  { key: 'pos', icon: ShoppingCart, labelKey: 'pos' },
  { key: 'inventory', icon: Package, labelKey: 'inventory' },
  { key: 'debtors', icon: Users, labelKey: 'debtors' },
  { key: 'returns', icon: RotateCcw, labelKey: 'returns' },
  { key: 'reports', icon: BarChart3, labelKey: 'reports', adminOnly: true },
  { key: 'settings', icon: Settings, labelKey: 'settings' },
];

export default function Sidebar({ activePage, onNavigate }) {
  const { logout, isAdmin, role } = useAuth();
  const { t } = useLanguage();

  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-full bg-white border-r border-slate-200 z-30">
      {/* Brand logo */}
      <div className="h-16 shrink-0 flex items-center gap-3 px-5 border-b border-slate-100">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-xl shadow-sm">
          <Wrench className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">DokonCRM</h1>
          <p className="text-[10px] text-gray-400 leading-tight">{t('Avto ehtiyot qismlar')}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="px-3 mb-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          {t('Asosiy')}
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.key;

          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`w-full flex items-center gap-3 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-blue-50 text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:bg-slate-50 hover:text-gray-900'
                }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{t(item.labelKey)}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: User info + Logout */}
      <div className="p-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div
            className={`flex items-center justify-center w-9 h-9 rounded-xl
                        ${isAdmin ? 'bg-purple-100' : 'bg-green-100'}`}
          >
            {isAdmin
              ? <Shield className="w-4.5 h-4.5 text-purple-600" />
              : <User className="w-4.5 h-4.5 text-green-600" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {isAdmin ? t('admin_role') : t('seller_role')}
            </p>
            <p className="text-xs text-gray-400 truncate">{isAdmin ? t('full_access') : t('restricted_access')}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium 
                     text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
