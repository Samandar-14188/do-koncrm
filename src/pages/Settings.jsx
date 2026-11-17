import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../utils/helpers';
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
  Loader2,
  DollarSign,
  Download,
  Upload,
  Database
} from 'lucide-react';

export default function Settings() {
  const { t, lang, toggleLang } = useLanguage();
  const { isAdmin, updatePasswords } = useAuth();
  const {
    resetAllData,
    isCloudConnected,
    exchangeRate,
    updateExchangeRate,
    exportBackupData,
    importBackupData,
  } = useApp();

  // Exchange Rate State (Admin only)
  const [rateInput, setRateInput] = useState(exchangeRate || 12800);
  const [isSavingRate, setIsSavingRate] = useState(false);
  const [rateSaveToast, setRateSaveToast] = useState(false);
  const [rateSaveMsg, setRateSaveMsg] = useState('');

  useEffect(() => {
    if (exchangeRate) {
      setRateInput(exchangeRate);
    }
  }, [exchangeRate]);

  // Password fields state (Admin only)
  const [adminPassInput, setAdminPassInput] = useState('');
  const [sellerPassInput, setSellerPassInput] = useState('');
  const [passSaveMsg, setPassSaveMsg] = useState('');
  const [passSaveToast, setPassSaveToast] = useState(false);
  const [isSavingPass, setIsSavingPass] = useState(false);

  // Backup & Restore State (Admin only)
  const fileInputRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [backupToastMsg, setBackupToastMsg] = useState('');

  // Reset confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // Save exchange rate
  const handleSaveExchangeRate = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const rate = Number(rateInput);
    if (!rate || rate <= 0) {
      alert("Iltimos, to'g'ri valyuta kursini kiriting!");
      return;
    }

    setIsSavingRate(true);
    try {
      await updateExchangeRate(rate);
      setRateSaveToast(true);
      setRateSaveMsg(t('exchange_rate_saved'));
      setTimeout(() => {
        setRateSaveToast(false);
        setRateSaveMsg('');
      }, 4000);
    } catch (err) {
      console.error('Exchange rate save error:', err);
      alert("Valyuta kursini saqlashda xatolik yuz berdi");
    } finally {
      setIsSavingRate(false);
    }
  };

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

  // Export Database to JSON
  const handleExportJSON = () => {
    if (!isAdmin) return;
    setIsExporting(true);
    try {
      const data = exportBackupData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `DokonCRM_Backup_${today}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupToastMsg("Ma'lumotlar bazasi zaxira nusxasi (JSON) muvaffaqiyatli yuklab olindi!");
      setTimeout(() => setBackupToastMsg(''), 4000);
    } catch (err) {
      console.error("Backup export error:", err);
      alert("Zaxira nusxani eksport qilishda xatolik yuz berdi");
    } finally {
      setIsExporting(false);
    }
  };

  // Trigger File Import Dialog
  const handleImportClick = () => {
    if (!isAdmin) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process Imported JSON File
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmRestore = window.confirm(
      "Diqqat! Yuklanayotgan zaxira faylidagi barcha ma'lumotlar (mahsulotlar, qarzlar, sotuvlar, yetkazib beruvchilar) joriy bazani to'liq almashtiradi.\n\nDavom etishni xohlaysizmi?"
    );
    if (!confirmRestore) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || (typeof parsed !== 'object')) {
        throw new Error("Fayl formati yaroqsiz");
      }

      const res = await importBackupData(parsed);
      setBackupToastMsg(
        `Baza muvaffaqiyatli tiklandi! (${res.productsCount} ta tovar, ${res.salesCount} ta sotuv). Sahifa yangilanmoqda...`
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Backup import error:", err);
      alert("Zaxira faylini tiklashda xatolik yuz berdi: " + (err.message || "Fayl yaroqsiz"));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      {/* Toast Alert for Exchange Rate */}
      {rateSaveToast && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{t('exchange_rate_saved')}</span>
        </div>
      )}

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

      {/* Toast Alert for Backup & Restore */}
      {backupToastMsg && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{backupToastMsg}</span>
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
            Tizim tili, valyuta kursi, xavfsizlik parollari va do'kon ma'lumotlarini boshqarish
          </p>
        </div>

        {/* Automatic Cloud Sync Status Pill */}
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

      {/* 2. Global Exchange Rate Setting (USD to UZS) - Admin Only */}
      {isAdmin ? (
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4 min-w-0">
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-gray-900 truncate">{t('exchange_rate_title')}</h3>
                <p className="text-xs text-gray-500 truncate">{t('exchange_rate_desc')}</p>
              </div>
            </div>

            {rateSaveMsg && (
              <span className="badge-success text-xs font-bold py-1 px-3 flex-shrink-0 ml-2">
                {rateSaveMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleSaveExchangeRate} className="space-y-3">
            <div className="max-w-xs">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                {t('exchange_rate_label')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600 font-bold text-sm">
                  1 $ =
                </div>
                <input
                  type="number"
                  step="1"
                  min="1"
                  required
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="input-field pl-12 pr-14 text-sm font-bold font-mono text-gray-900"
                  placeholder="12800"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 text-xs">
                  so'm
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Ombordagi dollar narxida ($) kiritilgan barcha tovarlar tan narxi ushbu kurs bo'yicha real vaqtda so'mga o'giriladi.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSavingRate || Number(rateInput) === exchangeRate}
              className="btn-primary py-2.5 px-5 text-xs font-bold rounded-xl flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSavingRate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Kursni saqlash</span>
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm flex items-center justify-between min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate">{t('exchange_rate_title')}</h3>
              <p className="text-xs text-gray-500 truncate">
                Amaldagi kurs: <strong className="font-mono text-emerald-700">1 USD = {formatMoney(exchangeRate)} so'm</strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. Password Settings (Admin Only) */}
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

      {/* 4. Backup & Restore (JSON Export & Import - Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-sm space-y-4 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-gray-900 truncate">
                Ma'lumotlar bazasini saqlash va tiklash (Zaxira)
              </h3>
              <p className="text-xs text-gray-500 truncate">
                Barcha tovarlar, sotuvlar, qarzdorlar va hisobotlarni JSON fayl sifatida yuklab olish yoki tiklash
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-600 leading-relaxed">
            💾 <strong>Zaxira nusxasi:</strong> Kompyuterni almashtirganda yoki ma'lumotlarni xavfsiz saqlash uchun JSON faylni yuklab oling. Keyinchalik ushbu faylni istalgan qurilmada qayta tiklashingiz mumkin.
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {/* Export Button */}
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={handleExportJSON}
              className="btn-primary py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-sm"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Eksport qilinmoqda...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Bazani saqlash (Eksport JSON)</span>
                </>
              )}
            </button>

            {/* Import Button */}
            <button
              type="button"
              disabled={isExporting || isImporting}
              onClick={handleImportClick}
              className="btn-secondary py-2.5 px-4 text-xs font-bold rounded-xl flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-xs"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tiklanmoqda...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Fayldan tiklash (Import JSON)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 5. Reset All Data to ZERO (Empty Store - Admin Only) */}
      {isAdmin && (
        <div className="bg-red-50/60 rounded-3xl p-5 border border-red-200 shadow-sm space-y-3 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center font-bold flex-shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-red-900 truncate">{t('reset_data_title')}</h3>
              <p className="text-xs text-red-700 leading-relaxed mt-0.5">
                Barcha mahsulotlar, sotuvlar, qarzdorlar va yetkazib beruvchilarni butunlay 0 ga tushirish (bo'sh do'kon holati).
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
