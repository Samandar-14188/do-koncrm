import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LangContext';
import { LogOut, Languages, Shield, User } from 'lucide-react';

export default function Header() {
  const { logout, isAdmin } = useAuth();
  const { t, lang, toggleLang } = useLanguage();

  return (
    <header className="shrink-0 h-14 md:h-16 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between z-20">
      {/* Left: Brand on mobile & Page title on desktop */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-2 md:hidden">
          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm flex-shrink-0">
            D
          </span>
          <h1 className="text-base font-bold text-gray-900 truncate">DokonCRM</h1>
        </div>
        <div className="hidden md:block min-w-0">
          <h2 className="text-sm font-semibold text-slate-600 truncate">{t('dashboard')}</h2>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Dual Language Script Switcher */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 
                     bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all shadow-sm active:scale-95"
          title={lang === 'lotin' ? "Ўзбекча (Кирилл)га ўтиш" : "O'zbekcha (Lotin)ga o'tish"}
        >
          <Languages className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-blue-700">
            {lang === 'lotin' ? "O'zbek (Lotin)" : "Ўзбек (Кирилл)"}
          </span>
        </button>

        {/* Role badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl
                      ${isAdmin
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
        >
          {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          <span className="hidden xs:inline">{isAdmin ? t('admin_role') : t('seller_role')}</span>
          <span className="xs:hidden">{isAdmin ? 'Admin' : 'Sotuvchi'}</span>
        </div>

        {/* Logout button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-red-600 
                     bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all active:scale-95"
          title={t('logout')}
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">{t('logout')}</span>
        </button>
      </div>
    </header>
  );
}
