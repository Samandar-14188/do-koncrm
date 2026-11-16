import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LangContext';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../utils/helpers';
import { LogOut, Languages, Shield, User } from 'lucide-react';

export default function Header() {
  const { logout, isAdmin } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const { exchangeRate } = useApp();

  return (
    <header className="shrink-0 h-14 md:h-16 bg-white border-b border-slate-200 px-2.5 sm:px-4 md:px-6 flex items-center justify-between z-20 gap-2">
      {/* Left: Brand on mobile & Page title on desktop */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink">
        <div className="flex items-center gap-1.5 md:hidden min-w-0">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-sm flex-shrink-0">
            D
          </span>
          <h1 className="text-sm font-extrabold text-gray-900 truncate tracking-tight">DokonCRM</h1>
        </div>
        <div className="hidden md:block min-w-0">
          <h2 className="text-sm font-semibold text-slate-600 truncate">{t('dashboard')}</h2>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Active USD Exchange Rate Badge */}
        <div
          className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200"
          title={`1 USD = ${formatMoney(exchangeRate)} so'm`}
        >
          <span className="font-extrabold text-emerald-700">$</span>
          <span className="font-mono font-bold text-emerald-900 text-[10px] sm:text-xs">
            {formatMoney(exchangeRate)}
          </span>
        </div>

        {/* Dual Language Script Switcher */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-gray-700 
                     bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all shadow-sm active:scale-95"
          title={lang === 'lotin' ? "Ўзбекча (Кирилл)га ўтиш" : "O'zbekcha (Lotin)ga o'tish"}
        >
          <Languages className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="font-bold text-blue-700 hidden sm:inline">
            {lang === 'lotin' ? "O'zbek (Lotin)" : "Ўзбек (Кирилл)"}
          </span>
          <span className="font-bold text-blue-700 text-[11px] sm:hidden">
            {lang === 'lotin' ? "Lotin" : "Кирилл"}
          </span>
        </button>

        {/* Role badge */}
        <div
          className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] sm:text-xs font-semibold rounded-xl
                      ${isAdmin
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
        >
          {isAdmin ? <Shield className="w-3.5 h-3.5 flex-shrink-0" /> : <User className="w-3.5 h-3.5 flex-shrink-0" />}
          <span className="hidden sm:inline">{isAdmin ? t('admin_role') : t('seller_role')}</span>
          <span className="sm:hidden">{isAdmin ? 'Admin' : 'Sotuvchi'}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center gap-1 p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-red-600 
                     bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all active:scale-95"
          title={t('logout')}
        >
          <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
          <span className="hidden md:inline">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
}
