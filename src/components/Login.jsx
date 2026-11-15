import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LangContext';
import { Lock, Eye, EyeOff, Wrench, Languages, Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { t, lang, toggleLang } = useLanguage();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanPass = password.trim();
    if (!cleanPass) {
      setError(t('Parolni kiriting') || 'Parolni kiriting');
      return;
    }

    setLoading(true);
    try {
      const res = await login(cleanPass);
      if (!res || !res.success) {
        setError(t('wrong_password') || "Parol noto'g'ri!");
      }
    } catch (err) {
      setError(t('wrong_password') || "Parol noto'g'ri!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-indigo-50 flex items-center justify-center p-4">
      {/* Language toggle - top right */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 
                   bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all shadow-sm active:scale-95"
      >
        <Languages className="w-4 h-4 text-blue-600" />
        <span className="text-blue-700 font-bold">{lang === 'lotin' ? "O'zbek (Lotin)" : "Ўзбек (Кирилл)"}</span>
      </button>

      {/* Login card */}
      <div className="w-full max-w-md">
        {/* Logo and branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl shadow-xl shadow-blue-500/20 mb-4 ring-8 ring-blue-50">
            <Wrench className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">DokonCRM</h1>
          <p className="mt-1 text-sm font-medium text-gray-600">{t('app_subtitle')}</p>
        </div>

        {/* Login form card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{t('login_title')}</h2>
            <p className="text-xs text-gray-500 mt-1">{t('Parolni kiriting') || 'Tizimga kirish uchun parolingizni kiriting'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className={`w-full pl-11 pr-11 py-3 text-base border rounded-2xl bg-gray-50 
                             focus:bg-white focus:outline-none focus:ring-2 transition-all
                             ${error
                               ? 'border-red-300 focus:ring-red-200 focus:border-red-500'
                               : 'border-gray-300 focus:ring-blue-200 focus:border-blue-600'
                             }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <p className="mt-2 text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base font-bold flex items-center justify-center gap-2 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.99] disabled:opacity-75"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <span>{t('login')}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
