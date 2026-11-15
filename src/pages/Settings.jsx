import React, { useState } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import {
  Settings as SettingsIcon,
  Languages,
  Lock,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ArrowLeftRight,
  Loader2
} from 'lucide-react';

export default function Settings() {
  const { t, lang, toggleLang } = useLanguage();
  const { isAdmin, updatePasswords } = useAuth();
  const { resetAllData, isCloudConnected } = useApp();

  // Password fields state (Admin only)
  const [adminPassInput, setAdminPassInput] = useState('');
  const [sellerPassInput, setSellerPassInput] = useState('');
  const [passSaveMsg, setPassSaveMsg] = useState('');
  const [passSaveToast, setPassSaveToast] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // Reset confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Save new passwords to both localStorage and Supabase settings table
  const handleSavePasswords = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const trimmedAdmin = adminPassInput.trim();
    const trimmedSeller = sellerPassInput.trim();

    if (!trimmedAdmin && !trimmedSeller) return;

    if (trimmedAdmin && trimmedAdmin.length < 4) {
      alert(t('pass_min_warn'));
      return;
    }

    if (trimmedSeller && trimmedSeller.length < 4) {
      alert(t('pass_min_warn'));
      return;
    }

    setIsSavingPass(true);
    try {
      await updatePasswords({
        admin: trimmedAdmin || undefined,
        seller: trimmedSeller || undefined,
      });

      setAdminPassInput('');
      setSellerPassInput('');
      setPassSaveToast(true);
      setPassSaveMsg(t('passwords_saved'));
      setTimeout(() => {
        setPassSaveToast(false);
        setPassSaveMsg('');
      }, 4000);
    } catch (err) {
      console.error('Password save error:', err);
      alert("Parollarni saqlashda xatolik yuz berdi");
    } finally {
      setIsSavingPass(false);
    }
  };

  // Reset all data completely to ZERO (Empty store in localStorage & Supabase)
  const handleConfirmReset = async () => {
    if (!isAdmin) return;
    setIsResetting(true);
    try {
      await resetAllData();
      setIsResetConfirmOpen(false);
      setResetSuccessMsg(t('data_reset_success'));
      setTimeout(() => {
        setResetSuccessMsg('');
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Reset error:", err);
      alert("Ma'lumotlarni tozalashda xatolik yuz berdi");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl min-w-0">
      {/* Toast Alert for Passwords */}
      {passSaveToast && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{t('passwords_saved')}</span>
        </div>
      )}

      {/* Toast Alert for Data Reset */}
      {resetSuccessMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{resetSuccessMsg}</span>
        </div>
      )}

      {/* Page Title & Cloud Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
            <SettingsIcon className="w-6 h-6 text-gray-700 flex-shrink-0" />
            <span className="truncate">{t('settings_title')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Tizim tili, xavfsizlik parollari va do'kon ma'lumotlarini boshqarish
          </p>
        </div>

        {/* Automatic Cloud Sync Status Pill (URL/Key are hidden from UI for protection) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm self-start sm:self-auto">
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${isCloudConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}
          />
          <span className="text-xs font-semibold text-slate-700">
            Bulut sinxronlash: {isCloudConnected ? 'Faol (Supabase)' : 'Lokal rejim'}
          </span>
        </div>
      </div>

      {/* 1. Language Script Switcher Card (Accessible to both Admin & Seller) */}
      <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0">
            <Languages className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-gray-900 truncate">{t('language_settings')}</h3>
            <p className="text-xs text-gray-500 truncate">
              {t('current_script')}{' '}
              <span className="font-bold text-blue-700">
                {lang === 'lotin' ? "O'zbek (Lotin)" : "Ўзбек (Кирилл)"}
              </span>
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="btn-primary py-2.5 px-5 text-xs font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>
              {lang === 'lotin'
                ? "Ўзбекча (Кирилл)га ўтказиш"
                : "O'zbekcha (Lotin)ga o'tkazish"}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Password Settings (Admin Only) */}
      {isAdmin ? (
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4 min-w-0">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">{t('password_settings')}</h3>
                <p className="text-xs text-gray-500 truncate">Admin va Sotuvchi parollarini yangilash</p>
              </div>
            </div>

            {passSaveMsg && (
              <span className="badge-success text-xs font-bold py-1 px-3 flex-shrink-0 ml-2">
                {passSaveMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleSavePasswords} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-800 mb-1">
                  {t('admin_pass_label')}
                </label>
                <input
                  type="password"
                  placeholder={t('new_password_placeholder')}
                  value={adminPassInput}
                  onChange={(e) => setAdminPassInput(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  {t('seller_pass_label')}
                </label>
                <input
                  type="password"
                  placeholder={t('new_password_placeholder')}
                  value={sellerPassInput}
                  onChange={(e) => setSellerPassInput(e.target.value)}
                  className="input-field text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={(!adminPassInput.trim() && !sellerPassInput.trim()) || isSavingPass}
              className="btn-primary py-2.5 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSavingPass ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('update_passwords')}</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-gray-100/90 rounded-3xl p-4 border border-gray-200 text-xs text-gray-500 flex items-center gap-2.5">
          <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span>Parollarni o'zgartirish faqat Boshliq (Admin) roli uchun ruxsat etilgan.</span>
        </div>
      )}

      {/* 3. Reset All Data to ZERO (Empty Store - Admin Only) */}
      {isAdmin && (
        <div className="bg-red-50/60 rounded-3xl p-5 border border-red-200 shadow-sm space-y-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-red-900 truncate">{t('reset_data_title')}</h3>
              <p className="text-xs text-red-700 leading-relaxed mt-0.5">
                Barcha mahsulotlar, sotuvlar va qarzdorlarni butunlay 0 ga tushirish (bo'sh do'kon holati).
              </p>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className="btn-danger py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('reset_btn')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-2">{t('reset_data_title')}</h3>
            <p className="text-xs text-gray-600 mb-6 leading-relaxed">
              {t('reset_confirm')}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => setIsResetConfirmOpen(false)}
                className="btn-secondary text-xs flex-1"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isResetting}
                onClick={handleConfirmReset}
                className="btn-danger text-xs flex-1 font-bold flex items-center justify-center gap-1.5"
              >
                {isResetting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isResetting ? "O'chirilmoqda..." : t('reset_btn')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
