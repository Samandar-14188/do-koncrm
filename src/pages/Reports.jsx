import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS, formatDate } from '../utils/helpers';
import * as XLSX from 'xlsx';
import {
  BarChart3,
  Wallet,
  TrendingUp,
  AlertCircle,
  Package,
  FileSpreadsheet,
  Receipt,
  ShieldAlert,
  CheckCircle2
} from 'lucide-react';

export default function Reports() {
  const { t, transliterate } = useLanguage();
  const { isAdmin } = useAuth();
  const { getReportData, products, sales, debtors } = useApp();

  // Date range filter
  const [dateRange, setDateRange] = useState('today'); // 'today', 'yesterday', 'week', 'month', 'all'
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // If non-admin user somehow opens this page, show security restriction
  if (!isAdmin) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-red-200 text-center max-w-md mx-auto my-12">
        <ShieldAlert className="w-14 h-14 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Ruxsat cheklangan</h2>
        <p className="text-xs text-gray-500 mt-1">
          Moliya va hisobotlar faqat Boshliq (Admin) roli uchun ochiq.
        </p>
      </div>
    );
  }

  // Get calculated metrics for the selected date range
  const report = useMemo(() => {
    return getReportData(dateRange);
  }, [getReportData, dateRange]);

  // Export to Excel with 3 sheets: Ombor_Qoldiq, Sotuvlar_va_Foyda, Qarzdorlar
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. SHEET 1: Ombor_Qoldiq
      const omborData = products.map((p, idx) => ({
        "№": idx + 1,
        "Mahsulot nomi": p.name,
        "Artikul / Polka": p.artikul || "-",
        "Tan narxi (so'm)": p.costPrice || 0,
        "Sotuv narxi (so'm)": p.sellPrice || 0,
        "Qoldiq soni": p.quantity || 0,
        "Tan qiymati (so'm)": (p.costPrice || 0) * (p.quantity || 0),
        "Sotuv qiymati (so'm)": (p.sellPrice || 0) * (p.quantity || 0),
      }));
      const wsOmbor = XLSX.utils.json_to_sheet(omborData);
      XLSX.utils.book_append_sheet(wb, wsOmbor, "Ombor_Qoldiq");

      // 2. SHEET 2: Sotuvlar_va_Foyda
      const sotuvData = sales.map((s, idx) => ({
        "№": idx + 1,
        "Sana": formatDate(s.date),
        "Chek raqami": s.saleNumber || "-",
        "Mahsulotlar": (s.items || []).map((it) => `${it.productName} (${it.quantity})`).join(", "),
        "Jami summa (so'm)": s.totalAmount || 0,
        "Naqd (so'm)": s.paidCash || 0,
        "Karta (so'm)": s.paidCard || 0,
        "Qarz (so'm)": s.creditAmount || 0,
        "Real Foyda (so'm)": s.realizedProfit || 0,
        "To'lov turi": s.paymentMode || "-",
        "Qarzdor": s.debtorName || "-",
        "Holat": s.returned ? "Qaytarilgan" : "Normal",
      }));
      const wsSotuv = XLSX.utils.json_to_sheet(sotuvData);
      XLSX.utils.book_append_sheet(wb, wsSotuv, "Sotuvlar_va_Foyda");

      // 3. SHEET 3: Qarzdorlar
      const qarzdorData = debtors.map((d, idx) => {
        const totalTaken = (d.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const totalPaid = (d.payments || []).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
        const remaining = Math.max(0, totalTaken - totalPaid);
        return {
          "№": idx + 1,
          "Qarzdor ismi": d.name,
          "Telefon raqami": d.phone || "-",
          "Jami qarz (so'm)": totalTaken,
          "To'langan (so'm)": totalPaid,
          "Qolgan qarz (so'm)": remaining,
          "Holat": remaining === 0 ? "Yopilgan" : "Faol qarz",
        };
      });
      const wsQarzdor = XLSX.utils.json_to_sheet(qarzdorData);
      XLSX.utils.book_append_sheet(wb, wsQarzdor, "Qarzdorlar");

      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `DokonCRM_Hisobot_${dateStr}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(t('excel_downloaded'));
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Excel yuklashda xatolik yuz berdi");
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

      {/* Top Header & Excel Export Button - responsive without overflow */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
            <BarChart3 className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <span className="truncate">{t('reports_title')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            Faqat Boshliq (Admin) uchun moliyaviy hisobot va statistika
          </p>
        </div>

        {/* Excel Export Button */}
        <button
          onClick={handleExportExcel}
          className="btn-success flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 sm:px-5 text-xs font-bold rounded-2xl shadow-md shadow-emerald-600/20 active:scale-95 whitespace-nowrap flex-shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t('export_excel')}</span>
        </button>
      </div>

      {/* Date Range Filter Bar */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-sm border border-gray-200 min-w-0">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1 sm:pb-0 scrollbar-thin">
          <button
            onClick={() => setDateRange('today')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors
              ${dateRange === 'today'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_today')}
          </button>
          <button
            onClick={() => setDateRange('yesterday')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors
              ${dateRange === 'yesterday'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_yesterday')}
          </button>
          <button
            onClick={() => setDateRange('week')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors
              ${dateRange === 'week'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_week')}
          </button>
          <button
            onClick={() => setDateRange('month')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors
              ${dateRange === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_month')}
          </button>
          <button
            onClick={() => setDateRange('all')}
            className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-colors
              ${dateRange === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('date_all')}
          </button>
        </div>
      </div>

      {/* KPI DASHBOARD CARDS (CRITICAL FINANCIAL DATA) - responsive grid min-w-0 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-3 min-w-0">
        {/* 1. Jami Real Tushum (Naqd + Karta) */}
        <div className="kpi-card bg-gradient-to-br from-blue-50/80 to-white border-blue-200 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider truncate">
              {t('kpi_cash_collected')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 ml-2">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl xl:text-2xl font-black text-blue-900 mt-2 truncate">
            {formatUZS(report.totalRevenue)}
          </p>

          {/* Breakdown: Naqd & Karta */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-blue-100 text-[11px]">
            <div className="min-w-0">
              <span className="text-gray-500 font-medium truncate block">{t('kpi_cash_sub')}:</span>
              <p className="font-bold text-gray-900 font-mono mt-0.5 truncate">{formatUZS(report.totalCashCollected)}</p>
            </div>
            <div className="min-w-0">
              <span className="text-gray-500 font-medium truncate block">{t('kpi_card_sub')}:</span>
              <p className="font-bold text-gray-900 font-mono mt-0.5 truncate">{formatUZS(report.totalCardCollected)}</p>
            </div>
          </div>
        </div>

        {/* 2. Sof Foyda (Cash-basis: strictly from paid collections) */}
        <div className="kpi-card bg-gradient-to-br from-emerald-50/80 to-white border-emerald-200 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider truncate">
              {t('kpi_net_profit')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 ml-2">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl xl:text-2xl font-black text-emerald-900 mt-2 truncate">
            {formatUZS(report.netProfit)}
          </p>
          <p className="text-[10px] text-emerald-600 mt-2 font-medium truncate">
            Faqat kassaga tushgan naqd/kartadan sof foyda
          </p>
        </div>

        {/* 3. Tashqaridagi Jami Qarzlar */}
        <div className="kpi-card bg-gradient-to-br from-red-50/80 to-white border-red-200 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider truncate">
              {t('kpi_active_debts')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0 ml-2">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl xl:text-2xl font-black text-red-800 mt-2 truncate">
            {formatUZS(report.totalActiveDebts)}
          </p>
          <p className="text-[10px] text-red-600 mt-2 font-medium truncate">
            Barcha ustalardan qaytishi kutilayotgan qarz
          </p>
        </div>

        {/* 4. Ombordagi Qoldiq Qiymati */}
        <div className="kpi-card bg-gradient-to-br from-purple-50/80 to-white border-purple-200 p-4 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider truncate">
              {t('kpi_stock_cost')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 ml-2">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl xl:text-2xl font-black text-purple-900 mt-2 truncate">
            {formatUZS(report.stockCostValue)}
          </p>
          <div className="mt-3 pt-2.5 border-t border-purple-100 text-[11px] flex items-center justify-between min-w-0">
            <span className="text-gray-500 font-medium truncate">{t('kpi_stock_retail')}:</span>
            <span className="font-bold text-purple-800 font-mono truncate ml-1">{formatUZS(report.stockRetailValue)}</span>
          </div>
        </div>
      </div>

      {/* Sales Transactions History for Filtered Range */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-sm space-y-3 min-w-0">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <span>Sotuvlar ro'yxati ({report.salesCount})</span>
          </h3>
        </div>

        {report.salesList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Tanlangan vaqt oralig'ida sotuvlar topilmadi.
          </div>
        ) : (
          <div className="overflow-x-auto min-w-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5 pl-2">{t('report_table_num')}</th>
                  <th className="pb-2.5">{t('report_table_date')}</th>
                  <th className="pb-2.5">{t('report_table_items')}</th>
                  <th className="pb-2.5">{t('report_table_sum')}</th>
                  <th className="pb-2.5">{t('report_table_payment')}</th>
                  <th className="pb-2.5">{t('report_table_profit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {report.salesList.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-2.5 pl-2 font-mono text-[11px] text-gray-400">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {formatDate(s.date)}
                    </td>
                    <td className="py-2.5 max-w-xs truncate font-medium">
                      {(s.items || []).map((it) => it.productName).join(', ')}
                    </td>
                    <td className="py-2.5 font-extrabold text-gray-900 font-mono whitespace-nowrap">
                      {formatUZS(s.totalAmount)}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`badge text-[10px] font-semibold
                          ${s.paymentMode === 'cash'
                            ? 'badge-success'
                            : s.paymentMode === 'card'
                            ? 'badge-info'
                            : s.paymentMode === 'credit'
                            ? 'badge-danger'
                            : 'badge-warning'
                          }`}
                      >
                        {s.paymentMode === 'cash'
                          ? t('cash')
                          : s.paymentMode === 'card'
                          ? t('card')
                          : s.paymentMode === 'credit'
                          ? t('credit')
                          : t('mixed')
                        }
                      </span>
                    </td>
                    <td className="py-2.5 font-bold font-mono text-emerald-700 whitespace-nowrap">
                      +{formatUZS(s.realizedProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
