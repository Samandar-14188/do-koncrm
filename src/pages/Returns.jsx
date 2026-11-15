import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS, formatDate } from '../utils/helpers';
import {
  RotateCcw,
  Search,
  Package,
  X,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Banknote,
  Clock,
  Plus,
  Minus,
  CheckCheck
} from 'lucide-react';

export default function Returns() {
  const { t, transliterate } = useLanguage();
  const { sales, processReturn } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  // Return quantities map for modal: { [productId]: returnQty }
  const [returnQtys, setReturnQtys] = useState({});
  const [refundMethod, setRefundMethod] = useState('cash'); // 'cash', 'card', 'debt_reduce'
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filtered Sales
  const filteredSales = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return sales;
    return sales.filter((s) => {
      const matchNum = s.saleNumber && s.saleNumber.toLowerCase().includes(q);
      const matchDebtor = s.debtorName && s.debtorName.toLowerCase().includes(q);
      const matchItem = (s.items || []).some((it) =>
        it.productName.toLowerCase().includes(q)
      );
      return matchNum || matchDebtor || matchItem;
    });
  }, [sales, searchQuery]);

  // Open Return Modal for the entire sale (default to select all)
  const handleOpenEntireSaleReturn = (sale) => {
    setSelectedSale(sale);
    const allQtys = {};
    (sale.items || []).forEach((item) => {
      const alreadyReturned = (sale.returnedItems || [])
        .filter((ri) => ri.productId === item.productId)
        .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
      const availableToReturn = Math.max(0, item.quantity - alreadyReturned);
      allQtys[item.productId] = availableToReturn;
    });
    setReturnQtys(allQtys);
    setRefundMethod(sale.paymentMode === 'credit' ? 'debt_reduce' : 'cash');
  };

  // Open Return Modal with customized partial selection
  const handleOpenPartialReturn = (sale) => {
    setSelectedSale(sale);
    const emptyQtys = {};
    (sale.items || []).forEach((item) => {
      emptyQtys[item.productId] = 0;
    });
    setReturnQtys(emptyQtys);
    setRefundMethod(sale.paymentMode === 'credit' ? 'debt_reduce' : 'cash');
  };

  // Open Return Modal pre-configured for a single specific item
  const handleOpenSingleItemReturn = (sale, productId) => {
    setSelectedSale(sale);
    const qtys = {};
    (sale.items || []).forEach((item) => {
      const alreadyReturned = (sale.returnedItems || [])
        .filter((ri) => ri.productId === item.productId)
        .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
      const availableToReturn = Math.max(0, item.quantity - alreadyReturned);
      qtys[item.productId] = item.productId === productId ? availableToReturn : 0;
    });
    setReturnQtys(qtys);
    setRefundMethod(sale.paymentMode === 'credit' ? 'debt_reduce' : 'cash');
  };

  // Helper inside modal to select all items to max
  const handleSelectAllInModal = () => {
    if (!selectedSale) return;
    const allQtys = {};
    (selectedSale.items || []).forEach((item) => {
      const alreadyReturned = (selectedSale.returnedItems || [])
        .filter((ri) => ri.productId === item.productId)
        .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
      allQtys[item.productId] = Math.max(0, item.quantity - alreadyReturned);
    });
    setReturnQtys(allQtys);
  };

  // Helper inside modal to clear all selections
  const handleClearAllInModal = () => {
    if (!selectedSale) return;
    const emptyQtys = {};
    (selectedSale.items || []).forEach((item) => {
      emptyQtys[item.productId] = 0;
    });
    setReturnQtys(emptyQtys);
  };

  // Calculate return total
  const returnTotals = useMemo(() => {
    if (!selectedSale) return { totalRefund: 0, totalItemsToReturn: 0 };
    let totalRefund = 0;
    let totalItemsToReturn = 0;

    (selectedSale.items || []).forEach((it) => {
      const qty = Number(returnQtys[it.productId]) || 0;
      if (qty > 0) {
        const price = it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice;
        totalRefund += price * qty;
        totalItemsToReturn += qty;
      }
    });

    return { totalRefund, totalItemsToReturn };
  }, [selectedSale, returnQtys]);

  // Submit Return
  const handleConfirmReturn = (e) => {
    e.preventDefault();
    if (!selectedSale || returnTotals.totalItemsToReturn <= 0) {
      alert("Kamida bitta mahsulot soni 0 dan katta bo'lishi kerak!");
      return;
    }

    const returnItemsPayload = Object.entries(returnQtys)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: Number(quantity),
      }));

    const success = processReturn({
      saleId: selectedSale.id,
      returnItems: returnItemsPayload,
      refundMethod,
    });

    if (success) {
      showToast(t('return_success'));
      setSelectedSale(null);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-fade-in">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
          <RotateCcw className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <span className="truncate">{t('returns_title')}</span>
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          Mahsulotni omborga qaytarish, pulni qaytarish yoki qarzdor hisobidan chegirish
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 min-w-0">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_sale')}
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
      </div>

      {/* Sales List with Return Action */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700">Sotuvlar topilmadi</h3>
          <p className="text-xs text-gray-400 mt-1">{t('search_sale')}</p>
        </div>
      ) : (
        <div className="space-y-3 min-w-0">
          {filteredSales.map((sale) => {
            const isFullReturn = sale.returned;
            const hasPartialReturn = (sale.returnedItems || []).length > 0 && !isFullReturn;

            return (
              <div
                key={sale.id}
                className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all duration-150 shadow-sm hover:shadow-md min-w-0
                  ${isFullReturn ? 'border-gray-200 bg-gray-50/70 opacity-80' : 'border-gray-200'}`}
              >
                {/* Header row of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg">
                      {sale.saleNumber}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatDate(sale.date)}
                    </span>
                    {sale.debtorName && (
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-xs">
                        {transliterate(sale.debtorName)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Payment Mode Badge */}
                    <span
                      className={`badge text-[11px] font-semibold
                        ${sale.paymentMode === 'cash'
                          ? 'badge-success'
                          : sale.paymentMode === 'card'
                          ? 'badge-info'
                          : sale.paymentMode === 'credit'
                          ? 'badge-danger'
                          : 'badge-warning'
                        }`}
                    >
                      {sale.paymentMode === 'cash'
                        ? t('cash')
                        : sale.paymentMode === 'card'
                        ? t('card')
                        : sale.paymentMode === 'credit'
                        ? t('credit')
                        : t('mixed')
                      }
                    </span>

                    {/* Return Status Badges */}
                    {isFullReturn ? (
                      <span className="badge-danger text-[10px] font-bold">
                        {t('returned_badge')}
                      </span>
                    ) : hasPartialReturn ? (
                      <span className="badge-warning text-[10px] font-bold">
                        {t('partial_returned_badge')}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Items sold in this transaction with individual return action */}
                <div className="py-3 space-y-2 min-w-0">
                  {(sale.items || []).map((it, idx) => {
                    const price = it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice;
                    const alreadyRet = (sale.returnedItems || [])
                      .filter((ri) => ri.productId === it.productId)
                      .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
                    const isItemReturned = alreadyRet >= it.quantity;

                    return (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-xl bg-gray-50/80 hover:bg-gray-50 border border-gray-100 text-xs min-w-0"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-gray-800 break-words">
                            {transliterate(it.productName)}
                          </span>
                          <span className="text-gray-500 ml-1.5">
                            ({it.quantity} {t('pieces_unit')})
                          </span>
                          {alreadyRet > 0 && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded ml-2">
                              {alreadyRet} ta qaytarilgan
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-200/50">
                          <span className="font-mono font-bold text-gray-700 whitespace-nowrap">
                            {formatUZS(price * it.quantity)}
                          </span>

                          {!isFullReturn && !isItemReturned && (
                            <button
                              onClick={() => handleOpenSingleItemReturn(sale, it.productId)}
                              className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                              title="Faqat shu mahsulotni qaytarish"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Qaytarish</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Row: Total & Clearly Visible Return Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 min-w-0">
                  <div className="text-xs min-w-0">
                    <span className="text-gray-400">{t('total')}: </span>
                    <span className="font-black text-gray-900 text-sm sm:text-base">
                      {formatUZS(sale.totalAmount)}
                    </span>
                  </div>

                  {!isFullReturn && (
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {/* 1. Partial / Selective Return Button */}
                      <button
                        onClick={() => handleOpenPartialReturn(sale)}
                        className="btn-secondary py-2 px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-1.5 rounded-xl shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        <span>Tanlab qaytarish</span>
                      </button>

                      {/* 2. Full Sale Return Button */}
                      <button
                        onClick={() => handleOpenEntireSaleReturn(sale)}
                        className="btn-danger py-2 px-3.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center justify-center gap-1.5 rounded-xl shadow-sm flex-1 sm:flex-initial whitespace-nowrap"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>To'liq chekni qaytarish</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VOZVRAT CONFIRMATION MODAL (SUPPORTS INDIVIDUAL ITEMS OR ENTIRE SALE) */}
      {selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content max-w-lg p-5 sm:p-6 min-w-0">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 min-w-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5 truncate">
                  <RotateCcw className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span className="truncate">{t('return_action')}</span>
                </h3>
                <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">
                  {selectedSale.saleNumber} — {formatDate(selectedSale.date)}
                </p>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReturn} className="space-y-4 mt-4">
              {/* Quick Preset Buttons: All / Clear */}
              <div className="flex items-center justify-between gap-2 bg-gray-50 p-2 rounded-xl">
                <span className="text-xs font-semibold text-gray-700">Tezkor tanlov:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAllInModal}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    Barchasini belgilash (100%)
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllInModal}
                    className="px-2.5 py-1 text-xs font-semibold text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                  >
                    Tozalash (0)
                  </button>
                </div>
              </div>

              {/* Product item selection and quantities stepper */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Qaytarilayotgan mahsulotlar sonini belgilang:
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin pr-1">
                  {(selectedSale.items || []).map((it) => {
                    const price = it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice;
                    const alreadyRet = (selectedSale.returnedItems || [])
                      .filter((ri) => ri.productId === it.productId)
                      .reduce((sum, ri) => sum + Number(ri.quantity || 0), 0);
                    const maxAllowed = Math.max(0, it.quantity - alreadyRet);
                    const currentQty = returnQtys[it.productId] ?? 0;

                    return (
                      <div
                        key={it.productId}
                        className={`rounded-2xl p-3 border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2
                          ${currentQty > 0 ? 'bg-amber-50/60 border-amber-300' : 'bg-gray-50 border-gray-200'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 break-words">
                            {transliterate(it.productName)}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            Sotilgan: <span className="font-semibold">{it.quantity}</span> | Qaytarish mumkin: <span className="font-bold text-amber-800">{maxAllowed}</span> | Narx: {formatMoney(price)} so'm
                          </p>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center bg-white border border-gray-300 rounded-xl px-1 py-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() =>
                                setReturnQtys({
                                  ...returnQtys,
                                  [it.productId]: Math.max(0, Number((currentQty - 1).toFixed(2))),
                                })
                              }
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={maxAllowed}
                              value={currentQty}
                              onChange={(e) =>
                                setReturnQtys({
                                  ...returnQtys,
                                  [it.productId]: Math.min(maxAllowed, Math.max(0, Number(e.target.value))),
                                })
                              }
                              className="w-12 text-center font-bold text-xs bg-transparent focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setReturnQtys({
                                  ...returnQtys,
                                  [it.productId]: Math.min(maxAllowed, Number((currentQty + 1).toFixed(2))),
                                })
                              }
                              className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-700"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Quick Max Button */}
                          <button
                            type="button"
                            onClick={() =>
                              setReturnQtys({
                                ...returnQtys,
                                [it.productId]: maxAllowed,
                              })
                            }
                            className="text-[10px] font-bold px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                          >
                            Maks ({maxAllowed})
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Method Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {t('return_refund_mode')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundMethod('cash')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all
                      ${refundMethod === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>{t('refund_cash')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRefundMethod('debt_reduce')}
                    className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border text-xs font-bold transition-all
                      ${refundMethod === 'debt_reduce'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                  >
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>{t('refund_debt_reduce')}</span>
                  </button>
                </div>
              </div>

              {/* Summary Banner */}
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between text-xs font-bold">
                <span className="text-amber-900">
                  Qaytariladigan jami summa ({returnTotals.totalItemsToReturn} ta):
                </span>
                <span className="text-base font-black text-amber-950 font-mono">
                  {formatUZS(returnTotals.totalRefund)}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedSale(null)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={returnTotals.totalItemsToReturn <= 0}
                  className="btn-danger text-xs font-bold px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  {t('return_confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
