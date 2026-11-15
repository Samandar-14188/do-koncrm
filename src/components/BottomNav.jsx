import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LangContext';
import { Package, ShoppingCart, Users, RotateCcw, BarChart3, Settings, MoreHorizontal, X } from 'lucide-react';

export default function BottomNav({ activePage, onNavigate }) {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const mainTabs = [
    { key: 'pos', icon: ShoppingCart, labelKey: 'pos' },
    { key: 'inventory', icon: Package, labelKey: 'inventory' },
    { key: 'debtors', icon: Users, labelKey: 'debtors' },
    { key: 'returns', icon: RotateCcw, labelKey: 'returns' },
  ];

  const handleTabClick = (key) => {
    setShowMoreMenu(false);
    onNavigate(key);
  };

  return (
    <>
      {/* Mobile "More" Drawer / Modal */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMoreMenu(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-5 z-10 border-t border-gray-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <span className="font-bold text-gray-800 text-sm">{t('more')}</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-2">
              {isAdmin && (
                <button
                  onClick={() => handleTabClick('reports')}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center
                             ${activePage === 'reports'
                               ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                               : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                             }`}
                >
                  <BarChart3 className="w-6 h-6 mb-2 text-blue-600" />
                  <span className="text-xs font-bold">{t('reports')}</span>
                </button>
              )}

              <button
                onClick={() => handleTabClick('settings')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all text-center
                           ${activePage === 'settings'
                             ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                             : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                           }`}
              >
                <Settings className="w-6 h-6 mb-2 text-gray-600" />
                <span className="text-xs font-bold">{t('settings')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Nav Bar for Mobile (Honor X9c 390px-430px optimized) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg safe-bottom">
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activePage === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab.key)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[56px] transition-all relative
                           ${isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full shadow-sm" />
                )}
                <div className={`p-1 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {t(tab.labelKey)}
                </span>
              </button>
            );
          })}

          {/* More menu button */}
          <button
            onClick={() => setShowMoreMenu(true)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[56px] transition-all relative
                       ${['reports', 'settings'].includes(activePage) ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {['reports', 'settings'].includes(activePage) && (
              <span className="absolute top-0 w-8 h-1 bg-blue-600 rounded-b-full shadow-sm" />
            )}
            <div className={`p-1 rounded-xl transition-all ${['reports', 'settings'].includes(activePage) ? 'bg-blue-50' : ''}`}>
              <MoreHorizontal className={`w-5 h-5 ${['reports', 'settings'].includes(activePage) ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight ${['reports', 'settings'].includes(activePage) ? 'font-bold' : 'font-medium'}`}>
              {t('more')}
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
