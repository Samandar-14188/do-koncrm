import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS } from '../utils/helpers';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Banknote,
  Clock,
  Split,
  User,
  Package,
  X,
  ChevronRight
} from 'lucide-react';

export default function POS() {
  const { t, transliterate } = useLanguage();
  const { isAdmin } = useAuth();
  const { products, processSale, debtors } = useApp();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State: array of { product, quantity, bargainPrice }
  const [cart, setCart] = useState([]);

  // Mobile cart drawer toggle
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'card', 'credit', 'mixed'

  // Mixed Payment inputs
  const [paidCashInput, setPaidCashInput] = useState('');
  const [paidCardInput, setPaidCardInput] = useState('');

  // Debtor info
  const [selectedDebtorId, setSelectedDebtorId] = useState('');
  const [debtorNameInput, setDebtorNameInput] = useState('');
  const [debtorPhoneInput, setDebtorPhoneInput] = useState('');

  // Success Feedback
  const [saleSuccessMessage, setSaleSuccessMessage] = useState('');

  // Filtered Products for POS
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.artikul && p.artikul.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  // Cart Calculations
  const cartTotals = useMemo(() => {
    let total = 0;
    let totalCost = 0;
    let itemCount = 0;

    cart.forEach((item) => {
      const price = Number(item.bargainPrice !== undefined && item.bargainPrice !== '' ? item.bargainPrice : item.product.sellPrice);
      const cost = Number(item.product.costPrice || 0);
      const qty = Number(item.quantity);
      total += price * qty;
      totalCost += cost * qty;
      itemCount += 1;
    });

    return {
      total,
      totalCost,
      totalProfit: total - totalCost,
      itemCount,
    };
  }, [cart]);

  // Add product to cart
  const addToCart = (product) => {
    if (Number(product.quantity) <= 0) return; // Zero-stock rule

    setCart((prev) => {
      const existingIndex = prev.findIndex((it) => it.product.id === product.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        const newQty = Math.min(product.quantity, Number((item.quantity + 1).toFixed(2)));
        const copy = [...prev];
        copy[existingIndex] = { ...item, quantity: newQty };
        return copy;
      }
      return [
        ...prev,
        {
          product,
          quantity: 1,
          bargainPrice: product.sellPrice,
        },
      ];
    });
  };

  // Update item quantity in cart
  const updateQuantity = (productId, newQty) => {
    const qty = Number(newQty);
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxAvailable = item.product.quantity;
          const clampedQty = Math.min(maxAvailable, Number(qty.toFixed(2)));
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  // Update Bargain Price per item
  const updateBargainPrice = (productId, newPrice) => {
    const price = newPrice === '' ? '' : Math.max(0, Number(newPrice));
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, bargainPrice: price };
        }
        return item;
      })
    );
  };

  // Remove single item from cart
  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((it) => it.product.id !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
  };

  // Select existing debtor for credit
  const handleSelectDebtor = (id) => {
    setSelectedDebtorId(id);
    if (id) {
      const found = debtors.find((d) => d.id === id);
      if (found) {
        setDebtorNameInput(found.name);
        setDebtorPhoneInput(found.phone || '');
      }
    } else {
      setDebtorNameInput('');
      setDebtorPhoneInput('');
    }
  };

  // Open Checkout Modal
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setPaymentMode('cash');
    setPaidCashInput('');
    setPaidCardInput('');
    setSelectedDebtorId('');
    setDebtorNameInput('');
    setDebtorPhoneInput('');
    setIsCheckoutOpen(true);
  };

  // Execute Sale
  const handleConfirmSale = (e) => {
    e.preventDefault();

    const total = cartTotals.total;
    let paidCash = 0;
    let paidCard = 0;
    let creditAmount = 0;

    if (paymentMode === 'cash') {
      paidCash = total;
    } else if (paymentMode === 'card') {
      paidCard = total;
    } else if (paymentMode === 'credit') {
      creditAmount = total;
      if (!debtorNameInput.trim()) {
        alert(t('enter_debtor_info'));
        return;
      }
    } else if (paymentMode === 'mixed') {
      paidCash = Number(paidCashInput) || 0;
      paidCard = Number(paidCardInput) || 0;
      creditAmount = Math.max(0, total - paidCash - paidCard);
      if (creditAmount > 0 && !debtorNameInput.trim()) {
        alert(t('enter_debtor_info'));
        return;
      }
    }

    const saleItems = cart.map((it) => ({
      productId: it.product.id,
      productName: it.product.name,
      artikul: it.product.artikul,
      quantity: it.quantity,
      costPrice: it.product.costPrice,
      sellPrice: it.product.sellPrice,
      bargainPrice: Number(it.bargainPrice !== undefined && it.bargainPrice !== '' ? it.bargainPrice : it.product.sellPrice),
      supplierId: it.product.supplierId || null,
      supplierName: it.product.supplierName || '',
    }));

    const result = processSale({
      items: saleItems,
      paymentData: {
        mode: paymentMode,
        paidCash,
        paidCard,
        creditAmount,
        debtorId: selectedDebtorId || null,
        debtorName: debtorNameInput.trim(),
        debtorPhone: debtorPhoneInput.trim(),
      },
    });

    if (result) {
      setCart([]);
      setIsCheckoutOpen(false);
      setIsMobileCartOpen(false);
      setSaleSuccessMessage(`${t('sale_success')} (${result.saleNumber})`);
      setTimeout(() => setSaleSuccessMessage(''), 4000);
    }
  };

  // Mixed Payment Remaining Credit
  const mixedRemainingDebt = useMemo(() => {
    if (paymentMode !== 'mixed') return 0;
    const paidC = Number(paidCashInput) || 0;
    const paidK = Number(paidCardInput) || 0;
    return Math.max(0, cartTotals.total - paidC - paidK);
  }, [paymentMode, paidCashInput, paidCardInput, cartTotals.total]);

  return (
    <div className="space-y-4 min-w-0">
      {/* Sale Success Notification */}
      {saleSuccessMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-bold animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      {/* Main 2-Column POS Layout: 8 cols for catalog, 4 cols for cart on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-w-0">
        {/* Left Column: Product Catalog & Fast Search (8 cols on desktop) */}
        <div className="lg:col-span-8 space-y-3 min-w-0">
          {/* Search bar */}
          <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 min-w-0">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_placeholder')}
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

          {/* Product Grid: responsive columns */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">Mahsulotlar mavjud emas</p>
              <p className="text-xs text-gray-400 mt-1">Avval Ombor bo'limidan mahsulot qo'shing yoki qidiruv so'zini tekshiring.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 min-w-0">
              {filteredProducts.map((p) => {
              const isOutOfStock = Number(p.quantity) <= 0;
              const inCartItem = cart.find((it) => it.product.id === p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => addToCart(p)}
                  className={`bg-white rounded-2xl p-3 text-left border transition-all duration-150 flex flex-col justify-between relative group min-w-0
                    ${isOutOfStock
                      ? 'border-gray-200 opacity-60 cursor-not-allowed bg-gray-50'
                      : inCartItem
                      ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                      : 'border-gray-200 hover:border-blue-400 hover:shadow-md active:scale-[0.98]'
                    }`}
                >
                  {/* Cart badge if item is in cart */}
                  {inCartItem && (
                    <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-black flex items-center justify-center shadow-md">
                      {inCartItem.quantity}
                    </span>
                  )}

                  <div className="min-w-0 w-full">
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      {isOutOfStock ? (
                        <span className="badge-danger text-[10px] font-bold truncate">
                          {t('Tugagan')}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md truncate">
                          {p.quantity} {t('pieces_unit')}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-gray-900 text-xs sm:text-sm line-clamp-2 leading-snug break-words">
                      {transliterate(p.name)}
                    </h4>

                    {p.artikul && (
                      <p className="text-[10px] font-mono text-gray-400 truncate mt-0.5">
                        {p.artikul}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between min-w-0 w-full">
                    <span className="text-xs sm:text-sm font-extrabold text-blue-700 truncate">
                      {formatMoney(p.sellPrice)}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400 flex-shrink-0 ml-1">so'm</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
        </div>

        {/* Right Column: Desktop Cart (4 cols on desktop, comfortable width) */}
        <div className="hidden lg:block lg:col-span-4 sticky top-20 min-w-0">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4 flex flex-col max-h-[calc(100vh-6rem)] min-w-0">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm xl:text-base">{t('cart')}</h3>
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                  {cartTotals.itemCount}
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('clear_cart')}</span>
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-thin">
              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 font-medium">{t('cart_empty')}</p>
                </div>
              ) : (
                cart.map((item) => {
                  const effectivePrice = item.bargainPrice !== undefined && item.bargainPrice !== ''
                    ? Number(item.bargainPrice)
                    : item.product.sellPrice;
                  const isBelowCost = item.product.costPrice && effectivePrice < item.product.costPrice;

                  return (
                    <div
                      key={item.product.id}
                      className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200/80 space-y-2 min-w-0"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-gray-900 leading-tight truncate">
                            {transliterate(item.product.name)}
                          </h5>
                          {item.product.artikul && (
                            <span className="text-[10px] text-gray-400 font-mono truncate block">
                              {item.product.artikul}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-400 hover:text-red-500 p-0.5 flex-shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quantity Selector + Bargain Price Field */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1 min-w-0">
                        {/* Quantity */}
                        <div className="flex items-center bg-white border border-gray-200 rounded-xl px-1 py-1 justify-between min-w-0">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 flex-shrink-0"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max={item.product.quantity}
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product.id, e.target.value)}
                            className="w-10 text-center text-xs font-bold bg-transparent focus:outline-none"
                          />
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Bargaining Price (Kelishilgan narx) */}
                        <div className="relative min-w-0">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder={t('bargain_price')}
                            value={item.bargainPrice !== undefined ? item.bargainPrice : item.product.sellPrice}
                            onChange={(e) => updateBargainPrice(item.product.id, e.target.value)}
                            className={`w-full px-2 py-1 text-xs font-bold rounded-xl border text-right focus:outline-none focus:ring-1
                              ${isBelowCost
                                ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-400'
                                : 'border-gray-200 bg-white text-gray-900 focus:ring-blue-400'
                              }`}
                          />
                        </div>
                      </div>

                      {/* Below Cost Warning */}
                      {isBelowCost && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-lg truncate">
                          <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          <span className="truncate">{t('below_cost_warning')}</span>
                        </div>
                      )}

                      {/* Line Total */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200/50">
                        <span className="text-gray-400 text-[11px]">Jami:</span>
                        <span className="font-extrabold text-gray-900 truncate ml-1">
                          {formatUZS(effectivePrice * item.quantity)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cart Footer */}
            {cart.length > 0 && (
              <div className="pt-3 border-t border-gray-100 space-y-2.5">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-500">{t('total')}:</span>
                    <span className="text-lg xl:text-xl font-black text-blue-700 truncate ml-2">
                      {formatUZS(cartTotals.total)}
                    </span>
                  </div>

                  {/* Net Profit: ONLY ADMIN */}
                  {isAdmin && (
                    <div className="flex items-center justify-between text-xs text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-xl font-semibold">
                      <span>{t('profit')}:</span>
                      <span className="font-mono font-bold truncate ml-2">{formatUZS(cartTotals.totalProfit)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleOpenCheckout}
                  className="w-full btn-primary py-3 text-xs xl:text-sm font-bold flex items-center justify-center gap-1.5 rounded-2xl shadow-lg shadow-blue-500/25 active:scale-95"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span className="truncate">{t('sell_button')} ({formatMoney(cartTotals.total)} so'm)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Sticky Cart Bar */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 z-30 pointer-events-none">
        {cart.length > 0 && (
          <div className="max-w-md mx-auto pointer-events-auto">
            <button
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-98 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-white/20 rounded-xl flex items-center justify-center font-bold text-xs">
                  {cartTotals.itemCount}
                </div>
                <span className="text-xs font-semibold">{t('cart')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold">{formatUZS(cartTotals.total)}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Cart Drawer */}
      {isMobileCartOpen && (
        <div className="lg:hidden drawer-overlay flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="relative bg-white rounded-t-3xl shadow-2xl p-4 max-h-[85vh] flex flex-col z-10">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-base text-gray-900">{t('cart')}</h3>
                <span className="badge-info text-xs">{cartTotals.itemCount} ta</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCart}
                  className="text-xs text-red-500 font-medium px-2 py-1"
                >
                  {t('clear_cart')}
                </button>
                <button
                  onClick={() => setIsMobileCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Cart Items */}
            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {cart.map((item) => {
                const effectivePrice = item.bargainPrice !== undefined && item.bargainPrice !== ''
                  ? Number(item.bargainPrice)
                  : item.product.sellPrice;
                const isBelowCost = item.product.costPrice && effectivePrice < item.product.costPrice;

                return (
                  <div
                    key={item.product.id}
                    className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <h5 className="font-bold text-xs text-gray-900">
                        {transliterate(item.product.name)}
                      </h5>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center bg-white border border-gray-200 rounded-xl px-2 py-1 justify-between">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="any"
                          value={item.bargainPrice !== undefined ? item.bargainPrice : item.product.sellPrice}
                          onChange={(e) => updateBargainPrice(item.product.id, e.target.value)}
                          className="w-full px-2 py-1 text-xs font-bold rounded-xl border bg-white text-right"
                        />
                      </div>
                    </div>

                    {isBelowCost && (
                      <p className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        {t('below_cost_warning')}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs font-bold pt-1 border-t border-gray-200">
                      <span className="text-gray-400">Jami:</span>
                      <span>{formatUZS(effectivePrice * item.quantity)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Drawer Bottom */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between text-base font-black">
                <span>{t('total')}:</span>
                <span className="text-blue-700">{formatUZS(cartTotals.total)}</span>
              </div>
              <button
                onClick={handleOpenCheckout}
                className="w-full btn-primary py-3.5 text-sm font-bold rounded-2xl"
              >
                {t('checkout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 PAYMENT MODES CHECKOUT MODAL */}
      {isCheckoutOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <h3 className="text-base font-bold text-gray-900">{t('checkout')}</h3>
                <p className="text-xs text-gray-500">
                  {t('total')}: <span className="font-extrabold text-blue-700">{formatUZS(cartTotals.total)}</span>
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSale} className="space-y-4 mt-4">
              {/* Payment Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  {t('payment_mode')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMode('cash')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all
                      ${paymentMode === 'cash'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Banknote className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{t('payment_mode_cash')}</p>
                      <p className="text-[10px] text-gray-400">100% Naqd</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('card')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all
                      ${paymentMode === 'card'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{t('payment_mode_card')}</p>
                      <p className="text-[10px] text-gray-400">Click / Terminal</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('credit')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all
                      ${paymentMode === 'credit'
                        ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Clock className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{t('payment_mode_credit')}</p>
                      <p className="text-[10px] text-gray-400">Nasiya (100% Qarz)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMode('mixed')}
                    className={`flex items-center gap-2 p-3 rounded-2xl border text-left transition-all
                      ${paymentMode === 'mixed'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-200'
                        : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Split className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold">{t('payment_mode_mixed')}</p>
                      <p className="text-[10px] text-gray-400">Qisman to'lov</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Mixed Payment Details */}
              {paymentMode === 'mixed' && (
                <div className="bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200 space-y-3">
                  <p className="text-xs font-semibold text-purple-900">
                    {t('mixed_payment_info')}
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        {t('cash_amount')}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={paidCashInput}
                        onChange={(e) => setPaidCashInput(e.target.value)}
                        className="input-field text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        {t('card_amount')}
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={paidCardInput}
                        onChange={(e) => setPaidCardInput(e.target.value)}
                        className="input-field text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-200 font-bold">
                    <span className="text-purple-900">{t('credit_amount')}:</span>
                    <span className="text-red-600 font-mono text-sm">
                      {formatUZS(mixedRemainingDebt)}
                    </span>
                  </div>
                </div>
              )}

              {/* Debtor Profile Inputs (Visible if 100% Credit or Mixed with remaining debt > 0) */}
              {(paymentMode === 'credit' || (paymentMode === 'mixed' && mixedRemainingDebt > 0)) && (
                <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      <span>{t('debtor_info')}</span>
                    </span>
                  </div>

                  {/* Autocomplete / Select from existing debtors */}
                  {debtors.length > 0 && (
                    <div>
                      <label className="block text-[11px] font-medium text-gray-600 mb-1">
                        {t('select_or_add_debtor')}
                      </label>
                      <select
                        value={selectedDebtorId}
                        onChange={(e) => handleSelectDebtor(e.target.value)}
                        className="input-field text-xs bg-white"
                      >
                        <option value="">-- Yangi qarzdor kiritish --</option>
                        {debtors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.phone ? `(${d.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        {t('debtor_name')} *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="masalan: Bahrom usta"
                        value={debtorNameInput}
                        onChange={(e) => setDebtorNameInput(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                        {t('debtor_phone')}
                      </label>
                      <input
                        type="tel"
                        placeholder="+998901234567"
                        value={debtorPhoneInput}
                        onChange={(e) => setDebtorPhoneInput(e.target.value)}
                        className="input-field text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit / Cancel Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs font-bold px-6 py-3"
                >
                  {t('confirm')} ({formatMoney(cartTotals.total)} so'm)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
