import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS, formatDate, formatPhone } from '../utils/helpers';
import {
  Users,
  Search,
  CreditCard,
  Banknote,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  History,
  DollarSign
} from 'lucide-react';

export default function Debtors() {
  const { t, transliterate } = useLanguage();
  const { debtors, payDebt } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDebtorFilter, setActiveDebtorFilter] = useState('active'); // 'active', 'all', 'settled'

  // Drawer / Modal States
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash'); // 'cash' or 'card'
  const [payNote, setPayNote] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Process debtor summary statistics
  const debtorsWithStats = useMemo(() => {
    return debtors.map((d) => {
      const totalTaken = (d.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalPaid = (d.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalTaken - totalPaid);
      return {
        ...d,
        totalTaken,
        totalPaid,
        remaining,
      };
    });
  }, [debtors]);

  // Overall Total Active Debt across all debtors
  const grandTotalActiveDebt = useMemo(() => {
    return debtorsWithStats.reduce((sum, d) => sum + d.remaining, 0);
  }, [debtorsWithStats]);

  // Filtered Debtors
  const filteredDebtors = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return debtorsWithStats.filter((d) => {
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.phone && d.phone.includes(q));

      if (!matchSearch) return false;

      if (activeDebtorFilter === 'active') return d.remaining > 0;
      if (activeDebtorFilter === 'settled') return d.remaining === 0;
      return true;
    });
  }, [debtorsWithStats, searchQuery, activeDebtorFilter]);

  // Open Pay Modal
  const handleOpenPay = (debtor) => {
    setSelectedDebtor(debtor);
    setPayAmount(debtor.remaining.toString());
    setPayMethod('cash');
    setPayNote('');
    setIsPayModalOpen(true);
  };

  // Submit Pay Debt
  const handleConfirmPayment = (e) => {
    e.preventDefault();
    if (!selectedDebtor || !payAmount || Number(payAmount) <= 0) return;

    const amountNum = Number(payAmount);
    if (amountNum > selectedDebtor.remaining) {
      alert("To'lov summasi qarzdan ortiq bo'lishi mumkin emas!");
      return;
    }

    const success = payDebt({
      debtorId: selectedDebtor.id,
      amount: amountNum,
      method: payMethod,
      note: payNote,
    });

    if (success) {
      showToast(t('paid_success'));
      setIsPayModalOpen(false);

      // Refresh drawer if open
      if (selectedDebtor) {
        const refreshed = debtors.find((d) => d.id === selectedDebtor.id);
        if (refreshed) {
          const totalTaken = (refreshed.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
          const totalPaid = (refreshed.payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
          setSelectedDebtor({
            ...refreshed,
            totalTaken,
            totalPaid,
            remaining: Math.max(0, totalTaken - totalPaid),
          });
        }
      }
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Active Debt Banner - responsive and min-w-0 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
            <Users className="w-6 h-6 text-red-600 flex-shrink-0" />
            <span className="truncate">{t('debtors_title')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Jamlanib boruvchi doimiy ustalar va mijozlar hisobi
          </p>
        </div>

        {/* Total Active Debts KPI Card */}
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-2.5 flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold flex-shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider truncate">
              {t('kpi_active_debts')}
            </p>
            <p className="text-base sm:text-lg font-black text-red-700 truncate">
              {formatUZS(grandTotalActiveDebt)}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 space-y-3 min-w-0">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_debtor')}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 scrollbar-thin">
          <button
            onClick={() => setActiveDebtorFilter('active')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${activeDebtorFilter === 'active'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
          >
            {t('debt_active')} ({debtorsWithStats.filter((d) => d.remaining > 0).length})
          </button>
          <button
            onClick={() => setActiveDebtorFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${activeDebtorFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_all')} ({debtorsWithStats.length})
          </button>
          <button
            onClick={() => setActiveDebtorFilter('settled')}
            className={`px-3.5 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${activeDebtorFilter === 'settled'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
          >
            {t('debt_cleared')} ({debtorsWithStats.filter((d) => d.remaining === 0).length})
          </button>
        </div>
      </div>

      {/* Debtors List: responsive grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 */}
      {filteredDebtors.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700">{t('no_debtors')}</h3>
          <p className="text-xs text-gray-400 mt-1">{t('search_debtor')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
          {filteredDebtors.map((d) => {
            const hasRemaining = d.remaining > 0;

            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between shadow-sm hover:shadow-md min-w-0
                  ${hasRemaining ? 'border-red-200 bg-red-50/10' : 'border-gray-200 bg-emerald-50/10'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm flex-shrink-0
                          ${hasRemaining ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}
                      >
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug truncate">
                          {transliterate(d.name)}
                        </h3>
                        {d.phone && (
                          <a
                            href={`tel:${d.phone}`}
                            className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 font-mono mt-0.5 truncate"
                          >
                            <Phone className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{formatPhone(d.phone)}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    <span
                      className={`badge ${hasRemaining ? 'badge-danger' : 'badge-success'} text-[11px] font-bold flex-shrink-0`}
                    >
                      {hasRemaining ? t('debt_active') : t('debt_cleared')}
                    </span>
                  </div>

                  {/* Financial Breakdown Card */}
                  <div className="bg-gray-50/90 rounded-xl p-3 mt-3 space-y-1.5 text-xs min-w-0">
                    <div className="flex items-center justify-between text-gray-600 min-w-0">
                      <span className="truncate">{t('total_debt')}:</span>
                      <span className="font-semibold text-gray-800 truncate ml-1">{formatUZS(d.totalTaken)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 min-w-0">
                      <span className="truncate">{t('total_paid')}:</span>
                      <span className="font-semibold font-mono truncate ml-1">{formatUZS(d.totalPaid)}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-200 font-bold min-w-0">
                      <span className={`truncate ${hasRemaining ? 'text-red-700' : 'text-emerald-700'}`}>
                        {t('remaining_debt')}:
                      </span>
                      <span className={`text-base truncate ml-1 ${hasRemaining ? 'text-red-700 font-black' : 'text-emerald-700'}`}>
                        {formatUZS(d.remaining)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 min-w-0">
                  {hasRemaining && (
                    <button
                      onClick={() => handleOpenPay(d)}
                      className="flex-1 btn-danger py-2 px-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 shadow-sm truncate"
                    >
                      <DollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{t('pay_debt')}</span>
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedDebtor(d)}
                    className="flex-1 btn-secondary py-2 px-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 hover:bg-gray-100 truncate"
                  >
                    <History className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{t('debt_details')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAILED HISTORY DRAWER */}
      {selectedDebtor && (
        <div className="drawer-overlay flex justify-end">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSelectedDebtor(null)}
          />
          <div className="drawer-content flex flex-col p-5">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-gray-900 truncate">
                    {transliterate(selectedDebtor.name)}
                  </h3>
                  {selectedDebtor.phone && (
                    <p className="text-xs text-gray-500 font-mono truncate">
                      {formatPhone(selectedDebtor.phone)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDebtor(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Balance Summary in Drawer */}
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="bg-gray-50 p-2.5 rounded-2xl text-center border border-gray-200/80 min-w-0">
                <p className="text-[10px] text-gray-400 font-semibold truncate">{t('total_debt')}</p>
                <p className="text-xs font-bold text-gray-900 mt-0.5 truncate">
                  {formatMoney(selectedDebtor.totalTaken)}
                </p>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-2xl text-center border border-emerald-200 min-w-0">
                <p className="text-[10px] text-emerald-600 font-semibold truncate">{t('total_paid')}</p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5 truncate">
                  {formatMoney(selectedDebtor.totalPaid)}
                </p>
              </div>
              <div className="bg-red-50 p-2.5 rounded-2xl text-center border border-red-200 min-w-0">
                <p className="text-[10px] text-red-600 font-semibold truncate">{t('remaining_debt')}</p>
                <p className="text-xs font-black text-red-700 mt-0.5 truncate">
                  {formatMoney(selectedDebtor.remaining)}
                </p>
              </div>
            </div>

            {/* Action inside drawer */}
            {selectedDebtor.remaining > 0 && (
              <button
                onClick={() => handleOpenPay(selectedDebtor)}
                className="btn-danger w-full py-3 text-xs font-bold flex items-center justify-center gap-2 mb-4 rounded-xl shadow-md"
              >
                <DollarSign className="w-4 h-4" />
                <span>{t('pay_debt')} ({formatUZS(selectedDebtor.remaining)})</span>
              </button>
            )}

            {/* Timelines: Taken Items & Payments */}
            <div className="flex-1 overflow-y-auto space-y-5 scrollbar-thin pr-1 min-w-0">
              {/* 1. Transactions: Items taken on credit */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>{t('debt_history')}</span>
                </h4>

                <div className="space-y-2">
                  {(selectedDebtor.transactions || []).map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-gray-50 rounded-2xl p-3 border border-gray-200 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-gray-500">
                        <span className="font-mono text-[11px]">{formatDate(tx.date)}</span>
                        <span className="font-extrabold text-red-600 text-sm">
                          {formatUZS(tx.amount)}
                        </span>
                      </div>

                      {/* Items list in this transaction */}
                      <div className="bg-white rounded-xl p-2 border border-gray-100 space-y-1">
                        {(tx.items || []).map((it, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-[11px] text-gray-700"
                          >
                            <span className="font-medium truncate mr-2">
                              {transliterate(it.name)} × {it.quantity}
                            </span>
                            <span className="font-mono text-gray-500 whitespace-nowrap">
                              {formatMoney(it.price * it.quantity)} so'm
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Payments Made */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('payment_history')}</span>
                </h4>

                {(selectedDebtor.payments || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Hali to'lovlar amalga oshirilmagan.</p>
                ) : (
                  <div className="space-y-2">
                    {(selectedDebtor.payments || []).map((pay) => (
                      <div
                        key={pay.id}
                        className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-800 text-sm">
                              +{formatUZS(pay.amount)}
                            </span>
                            <span className="badge bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              {pay.method === 'cash' ? t('cash') : pay.method === 'card' ? t('card') : 'Vozvrat'}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {formatDate(pay.date)}
                          </p>
                          {pay.note && (
                            <p className="text-[11px] text-gray-600 mt-0.5">{pay.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAY DEBT MODAL */}
      {isPayModalOpen && selectedDebtor && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">{t('pay_debt')}</h3>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-2xl">
                <p className="text-xs text-gray-500 font-medium">{t('debtor_name')}:</p>
                <p className="text-sm font-bold text-gray-900">{transliterate(selectedDebtor.name)}</p>
                <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 text-xs">
                  <span className="text-gray-500">{t('remaining_debt')}:</span>
                  <span className="font-black text-red-600 text-base">
                    {formatUZS(selectedDebtor.remaining)}
                  </span>
                </div>
              </div>

              {/* Amount input & Quick full pay button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-700">
                    {t('payment_amount')} (so'm) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPayAmount(selectedDebtor.remaining.toString())}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {t('full_payment')}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={selectedDebtor.remaining}
                  required
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="input-field text-base font-bold text-emerald-700"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t('payment_method')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all
                      ${payMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>{t('cash')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPayMethod('card')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all
                      ${payMethod === 'card'
                        ? 'bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>{t('card')}</span>
                  </button>
                </div>
              </div>

              {/* Optional note */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Izoh (ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="masalan: Qisman to'lov berildi"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-success text-xs font-bold px-6 py-2.5"
                >
                  {t('pay_now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
