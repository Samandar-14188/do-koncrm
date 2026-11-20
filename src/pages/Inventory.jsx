import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS, formatUSD } from '../utils/helpers';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  AlertTriangle,
  X,
  RotateCw,
  CheckCircle2,
  Boxes,
  Truck,
  Building2,
  Phone,
  DollarSign
} from 'lucide-react';

export default function Inventory() {
  const { t, transliterate } = useLanguage();
  const { isAdmin } = useAuth();
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    restockProduct,
    suppliers,
    addSupplier,
    exchangeRate
  } = useApp();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('all');

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockCostCurrency, setRestockCostCurrency] = useState('UZS'); // 'UZS' or 'USD'
  const [restockSell, setRestockSell] = useState('');
  const [restockSellCurrency, setRestockSellCurrency] = useState('UZS'); // 'UZS' or 'USD'
  const [restockSupplierId, setRestockSupplierId] = useState('');
  const [restockPaymentMode, setRestockPaymentMode] = useState('cash'); // 'cash' or 'credit'

  // Quick Add Supplier Modal
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierCurrency, setNewSupplierCurrency] = useState('UZS'); // 'UZS' or 'USD'

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    artikul: '',
    costPrice: '',
    costCurrency: 'UZS', // 'UZS' or 'USD'
    costPriceUSD: '',
    sellPrice: '',
    sellCurrency: 'UZS', // 'UZS' or 'USD'
    sellPriceUSD: '',
    quantity: '',
    supplierId: '',
    supplierName: '',
    purchasePaymentMode: 'cash', // 'cash' or 'credit'
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Stock cost map per supplier for the top filter pills
  const supplierStockMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      if (p.supplierId) {
        map[p.supplierId] = (map[p.supplierId] || 0) + (Number(p.costPrice || 0) * Number(p.quantity || 0));
      }
    });
    return map;
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.artikul && p.artikul.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (stockFilter === 'out' && Number(p.quantity) > 0) return false;
      if (stockFilter === 'low' && (Number(p.quantity) <= 0 || Number(p.quantity) > 5)) return false;

      if (selectedSupplierFilter !== 'all' && p.supplierId !== selectedSupplierFilter) {
        return false;
      }

      return true;
    });
  }, [products, searchQuery, stockFilter, selectedSupplierFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      artikul: '',
      costPrice: '',
      costCurrency: 'UZS',
      costPriceUSD: '',
      sellPrice: '',
      sellCurrency: 'UZS',
      priceCurrency: 'UZS',
      sellPriceUSD: '',
      quantity: '',
      supplierId: '',
      supplierName: '',
      purchasePaymentMode: 'cash',
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Modal - if not admin, do NOT leak costPrice into state
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    const costCurr = p.costCurrency === 'USD' ? 'USD' : 'UZS';
    const sellCurr = (p.sellCurrency === 'USD' || p.priceCurrency === 'USD') ? 'USD' : 'UZS';

    const costDisplay = costCurr === 'USD'
      ? (p.costPriceUSD !== undefined && p.costPriceUSD !== null ? p.costPriceUSD : (Math.round((p.costPrice / exchangeRate) * 100) / 100))
      : (p.costPrice || '');

    const sellDisplay = sellCurr === 'USD'
      ? (p.sellPriceUSD !== undefined && p.sellPriceUSD !== null ? p.sellPriceUSD : (Math.round((p.sellPrice / exchangeRate) * 100) / 100))
      : (p.sellPrice || '');

    setFormData({
      name: p.name,
      artikul: p.artikul || '',
      costCurrency: costCurr,
      costPrice: isAdmin ? costDisplay : '',
      costPriceUSD: isAdmin && costCurr === 'USD' ? costDisplay : '',
      sellCurrency: sellCurr,
      priceCurrency: sellCurr,
      sellPrice: sellDisplay,
      sellPriceUSD: sellCurr === 'USD' ? sellDisplay : '',
      quantity: p.quantity,
      supplierId: p.supplierId || '',
      supplierName: p.supplierName || '',
      purchasePaymentMode: 'cash',
    });
    setIsAddEditOpen(true);
  };

  // Open Restock Modal - if not admin, do NOT leak costPrice into restockCost
  const handleOpenRestock = (p) => {
    setRestockItem(p);
    setRestockQty('');
    const pCostCurr = p.costCurrency === 'USD' ? 'USD' : 'UZS';
    const pSellCurr = p.sellCurrency === 'USD' ? 'USD' : 'UZS';
    setRestockCostCurrency(pCostCurr);
    setRestockSellCurrency(pSellCurr);
    setRestockCost(
      isAdmin
        ? (pCostCurr === 'USD'
            ? (p.costPriceUSD !== undefined && p.costPriceUSD !== null ? p.costPriceUSD : (Math.round((p.costPrice / exchangeRate) * 100) / 100))
            : (p.costPrice || ''))
        : ''
    );
    setRestockSell(
      pSellCurr === 'USD'
        ? (p.sellPriceUSD !== undefined && p.sellPriceUSD !== null ? p.sellPriceUSD : (Math.round((p.sellPrice / exchangeRate) * 100) / 100))
        : (p.sellPrice || '')
    );
    setRestockSupplierId(p.supplierId || suppliers[0]?.id || '');
    setRestockPaymentMode('cash');
    setIsRestockOpen(true);
  };

  // Quick save new supplier
  const handleSaveNewSupplier = (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    const created = addSupplier({
      name: newSupplierName.trim(),
      phone: newSupplierPhone.trim(),
      currency: newSupplierCurrency,
    });

    // Automatically select the new supplier in the open form
    if (isAddEditOpen) {
      setFormData((prev) => ({
        ...prev,
        supplierId: created.id,
        supplierName: created.name,
        costCurrency: created.currency || prev.costCurrency,
      }));
    }
    if (isRestockOpen) {
      setRestockSupplierId(created.id);
      if (created.currency) {
        setRestockCostCurrency(created.currency);
      }
    }

    setNewSupplierName('');
    setNewSupplierPhone('');
    setNewSupplierCurrency('UZS');
    setIsAddSupplierOpen(false);
    showToast(t('supplier_added'));
  };

  // Submit Add or Edit
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sellPrice) return;
    if (isAdmin && !formData.costPrice) {
      alert("Tan narxini kiritish majburiy!");
      return;
    }

    const selectedSup = suppliers.find((s) => s.id === formData.supplierId);
    const isUSD = formData.costCurrency === 'USD';
    const costInputVal = Number(formData.costPrice) || 0;
    const computedUZS = isUSD ? Math.round(costInputVal * exchangeRate) : costInputVal;
    const computedUSD = isUSD ? costInputVal : null;

    const isUSDSell = (formData.sellCurrency === 'USD' || formData.priceCurrency === 'USD');
    const sellInputVal = Number(formData.sellPrice) || 0;
    const computedSellUZS = isUSDSell ? Math.round(sellInputVal * exchangeRate) : sellInputVal;
    const computedSellUSD = isUSDSell ? sellInputVal : null;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name,
        artikul: formData.artikul,
        costCurrency: isUSD ? 'USD' : 'UZS',
        // If seller is editing, keep original costPrice untouched
        costPrice: isAdmin ? computedUZS : editingProduct.costPrice,
        costPriceUSD: isAdmin ? computedUSD : (isUSD ? computedUSD : null),
        sellCurrency: isUSDSell ? 'USD' : 'UZS',
        priceCurrency: isUSDSell ? 'USD' : 'UZS',
        sellPrice: computedSellUZS,
        sellPriceUSD: computedSellUSD,
        quantity: Number(formData.quantity) || 0,
        supplierId: formData.supplierId || null,
        supplierName: selectedSup ? selectedSup.name : (formData.supplierName || ''),
      });
      showToast(t('product_updated'));
    } else {
      addProduct({
        name: formData.name,
        artikul: formData.artikul,
        costCurrency: isUSD ? 'USD' : 'UZS',
        costPrice: isAdmin ? computedUZS : 0,
        costPriceUSD: isAdmin ? computedUSD : null,
        sellCurrency: isUSDSell ? 'USD' : 'UZS',
        priceCurrency: isUSDSell ? 'USD' : 'UZS',
        sellPrice: computedSellUZS,
        sellPriceUSD: computedSellUSD,
        quantity: Number(formData.quantity) || 0,
        supplierId: formData.supplierId || null,
        supplierName: selectedSup ? selectedSup.name : '',
        purchasePaymentMode: formData.purchasePaymentMode || 'cash',
      });
      showToast(t('product_added'));
    }

    setIsAddEditOpen(false);
  };

  // Submit Restock
  const handleSaveRestock = (e) => {
    e.preventDefault();
    if (!restockItem || !restockQty || Number(restockQty) <= 0) return;
    if (isAdmin && !restockCost) {
      alert("Yangi tan narxini kiritish majburiy!");
      return;
    }

    const selectedSup = suppliers.find((s) => s.id === restockSupplierId);
    const isUSD = restockCostCurrency === 'USD';
    const costInputVal = Number(restockCost) || 0;
    const computedUZS = isUSD ? Math.round(costInputVal * exchangeRate) : costInputVal;
    const computedUSD = isUSD ? costInputVal : null;

    const isUSDSell = restockSellCurrency === 'USD';
    const sellInputVal = Number(restockSell) || 0;
    const computedSellUZS = isUSDSell ? Math.round(sellInputVal * exchangeRate) : sellInputVal;
    const computedSellUSD = isUSDSell ? sellInputVal : null;

    restockProduct(
      restockItem.id,
      Number(restockQty),
      isAdmin && restockCost !== '' ? computedUZS : restockItem.costPrice,
      restockSell !== '' ? computedSellUZS : restockItem.sellPrice,
      {
        supplierId: restockSupplierId || null,
        supplierName: selectedSup ? selectedSup.name : '',
        purchasePaymentMode: restockPaymentMode || 'cash',
        costCurrency: isUSD ? 'USD' : 'UZS',
        costPriceUSD: computedUSD,
        sellCurrency: isUSDSell ? 'USD' : 'UZS',
        priceCurrency: isUSDSell ? 'USD' : 'UZS',
        sellPriceUSD: computedSellUSD,
      }
    );

    showToast(t('product_restocked'));
    setIsRestockOpen(false);
  };

  // Confirm Delete
  const handleDeleteProduct = (id) => {
    deleteProduct(id);
    setDeleteConfirmId(null);
    showToast(t('product_deleted'));
  };

  return (
    <div className="space-y-4 min-w-0">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2 truncate">
            <Boxes className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <span className="truncate">{t('inventory_title')}</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {t('all_products')}: <span className="font-bold text-gray-800">{products.length} {t('pieces_unit')}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <button
            onClick={handleOpenAdd}
            className="btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 sm:px-5 text-sm font-bold rounded-2xl shadow-md shadow-blue-500/20 active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('add_product')}</span>
          </button>
        </div>
      </div>

      {/* Supplier Filter Pills */}
      {suppliers.length > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200/80 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-thin">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex-shrink-0 mr-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              <span>{t('supplier')}:</span>
            </span>

            <button
              onClick={() => setSelectedSupplierFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                selectedSupplierFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('all_suppliers')} ({products.length})
            </button>

            {suppliers.map((s) => {
              const stockVal = supplierStockMap[s.id] || 0;
              const isSelected = selectedSupplierFilter === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSupplierFilter(s.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                      : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{transliterate(s.name)}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold ${
                      isSelected ? 'bg-blue-800 text-white' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {formatUZS(stockVal)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Stock Filter Tabs */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200/80 space-y-3 min-w-0">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <button
            onClick={() => setStockFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${stockFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            {t('all_products')} ({products.length})
          </button>
          <button
            onClick={() => setStockFilter('low')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${stockFilter === 'low'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
          >
            {t('low_stock')} ({products.filter((p) => p.quantity > 0 && p.quantity <= 5).length})
          </button>
          <button
            onClick={() => setStockFilter('out')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors
              ${stockFilter === 'out'
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
          >
            {t('out_of_stock_filter')} ({products.filter((p) => Number(p.quantity) <= 0).length})
          </button>
        </div>
      </div>

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-700">{t('no_products')}</h3>
          <p className="text-xs text-gray-400 mt-1">{t('search_placeholder')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-w-0">
          {filteredProducts.map((p) => {
            const isOutOfStock = Number(p.quantity) <= 0;
            const isLowStock = !isOutOfStock && Number(p.quantity) <= 5;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-150 flex flex-col justify-between shadow-sm hover:shadow-md min-w-0
                  ${isOutOfStock
                    ? 'border-red-200 bg-red-50/20'
                    : isLowStock
                    ? 'border-amber-200'
                    : 'border-gray-200'
                  }`}
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug break-words">
                        {transliterate(p.name)}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        {p.artikul && (
                          <span className="inline-block text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-full">
                            {p.artikul}
                          </span>
                        )}
                        {p.supplierName && (
                          <span className="inline-block text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-full">
                            {transliterate(p.supplierName)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stock Status Badge */}
                    <div className="flex-shrink-0">
                      {isOutOfStock ? (
                        <span className="badge-danger font-bold text-[11px] whitespace-nowrap">
                          {t('out_of_stock')}
                        </span>
                      ) : isLowStock ? (
                        <span className="badge-warning font-semibold text-[11px] whitespace-nowrap">
                          {p.quantity} {t('pieces_unit')}
                        </span>
                      ) : (
                        <span className="badge-success font-semibold text-[11px] whitespace-nowrap">
                          {p.quantity} {t('pieces_unit')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="bg-gray-50/80 rounded-xl p-2.5 mt-3 space-y-1 text-xs min-w-0">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-gray-500 font-medium truncate">{t('sell_price')}:</span>
                      {(() => {
                        const isUSDSell = p.sellCurrency === 'USD' || p.priceCurrency === 'USD';
                        if (isUSDSell) {
                          const pUSD = p.sellPriceUSD !== undefined && p.sellPriceUSD !== null
                            ? p.sellPriceUSD
                            : Math.round((p.sellPrice / exchangeRate) * 100) / 100;
                          return (
                            <span className="font-bold text-gray-900 text-sm truncate ml-1 font-mono">
                              {formatUSD(pUSD)} <span className="text-[11px] text-gray-500 font-sans font-normal">({formatUZS(p.sellPrice)})</span>
                            </span>
                          );
                        }
                        return (
                          <span className="font-bold text-gray-900 text-sm truncate ml-1 font-mono">{formatUZS(p.sellPrice)}</span>
                        );
                      })()}
                    </div>

                    {/* Tan Narxi: STRICTLY HIDDEN from seller role */}
                    {isAdmin && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-purple-700 min-w-0">
                        <span className="font-medium text-[11px] truncate">{t('cost_price')}:</span>
                        <div className="text-right truncate ml-1">
                          {p.costCurrency === 'USD' ? (
                            <span className="font-bold font-mono">
                              {formatUSD(p.costPriceUSD !== undefined ? p.costPriceUSD : (p.costPrice / exchangeRate))}
                              <span className="text-[10px] text-gray-500 font-sans ml-1">
                                ({formatUZS(p.costPrice)})
                              </span>
                            </span>
                          ) : (
                            <span className="font-bold font-mono">{formatUZS(p.costPrice)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Bottom Bar */}
                <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-gray-100 min-w-0">
                  <button
                    onClick={() => handleOpenRestock(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-semibold 
                               bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl transition-colors truncate"
                  >
                    <RotateCw className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{t('restock')}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                    title={t('edit_product')}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete Button: ONLY ADMIN */}
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirmId(p.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {isAddEditOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">
                {editingProduct ? t('edit_product') : t('add_product')}
              </h2>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('product_name')} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="masalan: Cobalt old tormoz kolodkasi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('artikul')}
                </label>
                <input
                  type="text"
                  placeholder="masalan: A-12 / GM-9647"
                  value={formData.artikul}
                  onChange={(e) => setFormData({ ...formData, artikul: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Supplier Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    {t('supplier')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    {t('add_new_supplier')}
                  </button>
                </div>
                <select
                  value={formData.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      supplierId: e.target.value,
                      supplierName: sup ? sup.name : '',
                      costCurrency: !editingProduct && sup?.currency ? sup.currency : prev.costCurrency,
                    }));
                  }}
                  className="input-field text-xs"
                >
                  <option value="">{t('supplier_select')}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.currency === 'USD' ? '($)' : '(so\'m)'} {s.phone ? `(${s.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Incoming Stock Payment Mode Toggle (Only when adding with selected supplier) */}
              {formData.supplierId && !editingProduct && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 space-y-2">
                  <label className="block text-xs font-bold text-blue-900">
                    {t('purchase_payment_mode')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, purchasePaymentMode: 'cash' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.purchasePaymentMode === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('paid_cash_supplier')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, purchasePaymentMode: 'credit' })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        formData.purchasePaymentMode === 'credit'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('paid_credit_supplier')}
                    </button>
                  </div>
                </div>
              )}

              {/* Unified Currency Toggle for Modal */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Narxlar valyutasi:</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Kurs: 1$ = {formatUZS(exchangeRate)}
                  </span>
                </div>
                <div className="flex items-center bg-white p-0.5 rounded-xl border border-gray-300 text-xs font-bold shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        costCurrency: 'UZS',
                        sellCurrency: 'UZS',
                      }));
                    }}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      formData.costCurrency === 'UZS' && formData.sellCurrency === 'UZS'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    UZS (so'm)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        costCurrency: 'USD',
                        sellCurrency: 'USD',
                      }));
                    }}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      formData.costCurrency === 'USD' || formData.sellCurrency === 'USD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
              </div>

              {/* Cost Price & Selling Price Fields - MANDATORY FOR ADMIN */}
              {isAdmin ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-purple-700">
                        {t('cost_price')} *
                      </label>
                      <div className="flex items-center bg-purple-50 p-0.5 rounded-lg border border-purple-200 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, costCurrency: 'UZS' })}
                          className={`px-2 py-0.5 rounded transition-all ${
                            formData.costCurrency === 'UZS'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'text-purple-700 hover:text-purple-900'
                          }`}
                        >
                          UZS (so'm)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, costCurrency: 'USD' })}
                          className={`px-2 py-0.5 rounded transition-all ${
                            formData.costCurrency === 'USD'
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'text-purple-700 hover:text-purple-900'
                          }`}
                        >
                          USD ($)
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {formData.costCurrency === 'USD' && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-600 font-bold text-sm">
                          $
                        </div>
                      )}
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder={formData.costCurrency === 'USD' ? "10" : "95000"}
                        value={formData.costPrice}
                        onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                        className={`input-field border-purple-200 focus:border-purple-500 font-semibold font-mono ${
                          formData.costCurrency === 'USD' ? 'pl-7' : ''
                        }`}
                      />
                    </div>

                    {/* Live conversion helper */}
                    {formData.costPrice && Number(formData.costPrice) > 0 && (
                      <p className="text-[11px] text-purple-600 mt-1 font-mono font-medium">
                        {formData.costCurrency === 'USD'
                          ? `≈ ${formatUZS(Math.round(Number(formData.costPrice) * exchangeRate))} (kurs: 1$ = ${formatUZS(exchangeRate)})`
                          : `≈ ${formatUSD(Number(formData.costPrice) / exchangeRate)} (kurs: 1$ = ${formatUZS(exchangeRate)})`}
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-gray-700">
                        {t('sell_price')} *
                      </label>
                      <div className="flex items-center bg-blue-50 p-0.5 rounded-lg border border-blue-200 text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, sellCurrency: 'UZS' })}
                          className={`px-2 py-0.5 rounded transition-all ${
                            formData.sellCurrency === 'UZS'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-blue-700 hover:text-blue-900'
                          }`}
                        >
                          UZS (so'm)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, sellCurrency: 'USD' })}
                          className={`px-2 py-0.5 rounded transition-all ${
                            formData.sellCurrency === 'USD'
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-blue-700 hover:text-blue-900'
                          }`}
                        >
                          USD ($)
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      {formData.sellCurrency === 'USD' && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600 font-bold text-sm">
                          $
                        </div>
                      )}
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        placeholder={formData.sellCurrency === 'USD' ? "19" : "140000"}
                        value={formData.sellPrice}
                        onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                        className={`input-field font-semibold text-blue-700 font-mono ${
                          formData.sellCurrency === 'USD' ? 'pl-7' : ''
                        }`}
                      />
                    </div>

                    {/* Live conversion helper */}
                    {formData.sellPrice && Number(formData.sellPrice) > 0 && (
                      <p className="text-[11px] text-blue-600 mt-1 font-mono font-medium">
                        {formData.sellCurrency === 'USD'
                          ? `≈ ${formatUZS(Math.round(Number(formData.sellPrice) * exchangeRate))} (kurs: 1$ = ${formatUZS(exchangeRate)})`
                          : `≈ ${formatUSD(Number(formData.sellPrice) / exchangeRate)} (kurs: 1$ = ${formatUZS(exchangeRate)})`}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* SELLER VIEW: Tan narxi is completely HIDDEN */
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">
                      {t('sell_price')} *
                    </label>
                    <div className="flex items-center bg-blue-50 p-0.5 rounded-lg border border-blue-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sellCurrency: 'UZS' })}
                        className={`px-2 py-0.5 rounded transition-all ${
                          formData.sellCurrency === 'UZS'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-blue-700 hover:text-blue-900'
                        }`}
                      >
                        UZS (so'm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sellCurrency: 'USD' })}
                        className={`px-2 py-0.5 rounded transition-all ${
                          formData.sellCurrency === 'USD'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-blue-700 hover:text-blue-900'
                        }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {formData.sellCurrency === 'USD' && (
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600 font-bold text-sm">
                        $
                      </div>
                    )}
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder={formData.sellCurrency === 'USD' ? "19" : "140000"}
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                      className={`input-field font-semibold text-blue-700 font-mono ${
                        formData.sellCurrency === 'USD' ? 'pl-7' : ''
                      }`}
                    />
                  </div>

                  {/* Live conversion helper */}
                  {formData.sellPrice && Number(formData.sellPrice) > 0 && (
                    <p className="text-[11px] text-blue-600 mt-1 font-mono font-medium">
                      {formData.sellCurrency === 'USD'
                        ? `≈ ${formatUZS(Math.round(Number(formData.sellPrice) * exchangeRate))} (kurs: 1$ = ${formatUZS(exchangeRate)})`
                        : `≈ ${formatUSD(Number(formData.sellPrice) / exchangeRate)} (kurs: 1$ = ${formatUZS(exchangeRate)})`}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('quantity')} ({t('pieces_unit')} / litr) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="10 yoki 4.5"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary text-xs font-bold px-6">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {isRestockOpen && restockItem && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <RotateCw className="w-4 h-4 text-blue-600" />
                <span>{t('restock')}</span>
              </h2>
              <button
                onClick={() => setIsRestockOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="space-y-4 mt-4">
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-xs font-bold text-gray-900">{transliterate(restockItem.name)}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Hozirgi qoldiq:{' '}
                  <span className="font-bold text-blue-600">
                    {restockItem.quantity} {t('pieces_unit')}
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('restock_quantity_add')} *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  placeholder="masalan: 10 yoki 5.5"
                  autoFocus
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="input-field text-base font-bold text-blue-700"
                />
              </div>

              {/* Supplier Selection in Restock */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    {t('supplier')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddSupplierOpen(true)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    {t('add_new_supplier')}
                  </button>
                </div>
                <select
                  value={restockSupplierId}
                  onChange={(e) => {
                    setRestockSupplierId(e.target.value);
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    if (sup?.currency) {
                      setRestockCostCurrency(sup.currency);
                    }
                  }}
                  className="input-field text-xs"
                >
                  <option value="">{t('supplier_select')}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.currency === 'USD' ? '($)' : '(so\'m)'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment toggle if supplier chosen */}
              {restockSupplierId && (
                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-2.5 space-y-1.5">
                  <label className="block text-xs font-bold text-blue-900">
                    {t('purchase_payment_mode')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestockPaymentMode('cash')}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                        restockPaymentMode === 'cash'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('paid_cash_supplier')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockPaymentMode('credit')}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                        restockPaymentMode === 'credit'
                          ? 'bg-red-600 text-white border-red-600 shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {t('paid_credit_supplier')}
                    </button>
                  </div>
                </div>
              )}

              {/* Price updates on restock: Cost Price is MANDATORY for Admin */}
              {isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-purple-700">
                      {t('new_cost_price')} *
                    </label>
                    <div className="flex items-center bg-purple-50 p-0.5 rounded-lg border border-purple-200 text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setRestockCostCurrency('UZS')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          restockCostCurrency === 'UZS'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-purple-700 hover:text-purple-900'
                        }`}
                      >
                        UZS (so'm)
                      </button>
                      <button
                        type="button"
                        onClick={() => setRestockCostCurrency('USD')}
                        className={`px-2 py-0.5 rounded transition-all ${
                          restockCostCurrency === 'USD'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-purple-700 hover:text-purple-900'
                        }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    {restockCostCurrency === 'USD' && (
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-600 font-bold text-sm">
                        $
                      </div>
                    )}
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={restockCostCurrency === 'USD' ? "Tan narxi ($)" : "Tan narxi (so'm)"}
                      value={restockCost}
                      onChange={(e) => setRestockCost(e.target.value)}
                      className={`input-field text-sm font-mono border-purple-200 font-semibold ${
                        restockCostCurrency === 'USD' ? 'pl-7' : ''
                      }`}
                    />
                  </div>

                  {/* Live conversion helper */}
                  {restockCost && Number(restockCost) > 0 && (
                    <p className="text-[11px] text-purple-600 mt-1 font-mono font-medium">
                      {restockCostCurrency === 'USD'
                        ? `≈ ${formatUZS(Math.round(Number(restockCost) * exchangeRate))} (kurs: 1$ = ${formatUZS(exchangeRate)})`
                        : `≈ ${formatUSD(Number(restockCost) / exchangeRate)} (kurs: 1$ = ${formatUZS(exchangeRate)})`}
                    </p>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">
                    {t('new_sell_price')}
                  </label>
                  <div className="flex items-center bg-blue-50 p-0.5 rounded-lg border border-blue-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setRestockSellCurrency('UZS')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        restockSellCurrency === 'UZS'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-blue-700 hover:text-blue-900'
                      }`}
                    >
                      UZS (so'm)
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestockSellCurrency('USD')}
                      className={`px-2 py-0.5 rounded transition-all ${
                        restockSellCurrency === 'USD'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-blue-700 hover:text-blue-900'
                      }`}
                    >
                      USD ($)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  {restockSellCurrency === 'USD' && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600 font-bold text-sm">
                      $
                    </div>
                  )}
                  <input
                    type="number"
                    step="any"
                    placeholder={restockSellCurrency === 'USD' ? "Sotuv narxi ($)" : "Sotuv narxi (so'm)"}
                    value={restockSell}
                    onChange={(e) => setRestockSell(e.target.value)}
                    className={`input-field text-sm font-mono ${
                      restockSellCurrency === 'USD' ? 'pl-7' : ''
                    }`}
                  />
                </div>

                {/* Live conversion helper */}
                {restockSell && Number(restockSell) > 0 && (
                  <p className="text-[11px] text-blue-600 mt-1 font-mono font-medium">
                    {restockSellCurrency === 'USD'
                      ? `≈ ${formatUZS(Math.round(Number(restockSell) * exchangeRate))} (kurs: 1$ = ${formatUZS(exchangeRate)})`
                      : `≈ ${formatUSD(Number(restockSell) / exchangeRate)} (kurs: 1$ = ${formatUZS(exchangeRate)})`}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRestockOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary text-xs font-bold px-6">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {isAddSupplierOpen && (
        <div className="modal-overlay">
          <div className="modal-content max-w-sm p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <span>{t('add_new_supplier')}</span>
              </h2>
              <button
                onClick={() => setIsAddSupplierOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('supplier_name')} *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="masalan: Avto Lider Optom"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('supplier_phone')}
                </label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="input-field"
                />
              </div>

              {/* Currency selection for new supplier */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Hisob-kitob valyutasi *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSupplierCurrency('UZS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      newSupplierCurrency === 'UZS'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    UZS (so'm)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSupplierCurrency('USD')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      newSupplierCurrency === 'USD'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    USD ($)
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddSupplierOpen(false)}
                  className="btn-secondary text-xs"
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="btn-primary text-xs font-bold px-6">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="modal-overlay">
          <div className="modal-content max-w-xs p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{t('confirm_delete')}</h3>
            <p className="text-xs text-gray-500 mb-5">
              Bu mahsulot butunlay o'chiriladi.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary text-xs flex-1"
              >
                {t('cancel')}
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmId)}
                className="btn-danger text-xs flex-1 font-bold"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
