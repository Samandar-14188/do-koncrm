import React, { useState, useMemo } from 'react';
import { useLanguage } from '../context/LangContext';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { formatMoney, formatUZS } from '../utils/helpers';
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
  Boxes
} from 'lucide-react';

export default function Inventory() {
  const { t, transliterate } = useLanguage();
  const { isAdmin } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct, restockProduct } = useApp();

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'

  // Modal States
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockItem, setRestockItem] = useState(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockSell, setRestockSell] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Form State for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    artikul: '',
    costPrice: '',
    sellPrice: '',
    quantity: '',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.artikul && p.artikul.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (stockFilter === 'out') return Number(p.quantity) <= 0;
      if (stockFilter === 'low') return Number(p.quantity) > 0 && Number(p.quantity) <= 5;
      return true;
    });
  }, [products, searchQuery, stockFilter]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      artikul: '',
      costPrice: '',
      sellPrice: '',
      quantity: '',
    });
    setIsAddEditOpen(true);
  };

  // Open Edit Modal - if not admin, do NOT leak costPrice into state
  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      artikul: p.artikul || '',
      costPrice: isAdmin ? (p.costPrice || '') : '',
      sellPrice: p.sellPrice || '',
      quantity: p.quantity,
    });
    setIsAddEditOpen(true);
  };

  // Open Restock Modal - if not admin, do NOT leak costPrice into restockCost
  const handleOpenRestock = (p) => {
    setRestockItem(p);
    setRestockQty('');
    setRestockCost(isAdmin ? (p.costPrice || '') : '');
    setRestockSell(p.sellPrice || '');
    setIsRestockOpen(true);
  };

  // Submit Add or Edit
  const handleSaveProduct = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sellPrice) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        name: formData.name,
        artikul: formData.artikul,
        // If seller is editing, keep original costPrice untouched
        costPrice: isAdmin ? (Number(formData.costPrice) || 0) : editingProduct.costPrice,
        sellPrice: Number(formData.sellPrice) || 0,
        quantity: Number(formData.quantity) || 0,
      });
      showToast(t('product_updated'));
    } else {
      addProduct({
        name: formData.name,
        artikul: formData.artikul,
        costPrice: isAdmin ? (Number(formData.costPrice) || 0) : 0,
        sellPrice: Number(formData.sellPrice) || 0,
        quantity: Number(formData.quantity) || 0,
      });
      showToast(t('product_added'));
    }

    setIsAddEditOpen(false);
  };

  // Submit Restock
  const handleSaveRestock = (e) => {
    e.preventDefault();
    if (!restockItem || !restockQty || Number(restockQty) <= 0) return;

    restockProduct(
      restockItem.id,
      Number(restockQty),
      isAdmin && restockCost !== '' ? Number(restockCost) : restockItem.costPrice,
      restockSell !== '' ? Number(restockSell) : restockItem.sellPrice
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

      {/* Header and Add Button - responsive and min-w-0 */}
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

        <button
          onClick={handleOpenAdd}
          className="btn-primary flex items-center justify-center gap-2 py-2.5 sm:py-3 px-4 sm:px-5 text-sm font-bold rounded-2xl shadow-md shadow-blue-500/20 active:scale-95 whitespace-nowrap flex-shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t('add_product')}</span>
        </button>
      </div>

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

      {/* Product List: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 */}
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
                      {p.artikul && (
                        <span className="inline-block text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md mt-1 truncate max-w-full">
                          {p.artikul}
                        </span>
                      )}
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
                      <span className="font-bold text-gray-900 text-sm truncate ml-1">{formatUZS(p.sellPrice)}</span>
                    </div>

                    {/* Tan Narxi: STRICTLY HIDDEN from seller role */}
                    {isAdmin && (
                      <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-purple-700 min-w-0">
                        <span className="font-medium text-[11px] truncate">{t('cost_price')}:</span>
                        <span className="font-bold font-mono truncate ml-1">{formatUZS(p.costPrice)}</span>
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

      {/* Add / Edit Product Modal - Protects Cost Price from Seller */}
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

              {/* Cost Price & Selling Price Fields */}
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-purple-700 mb-1">
                      {t('cost_price')} (so'm)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="95000"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                      className="input-field border-purple-200 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {t('sell_price')} (so'm) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="140000"
                      value={formData.sellPrice}
                      onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                      className="input-field font-semibold text-blue-700"
                    />
                  </div>
                </div>
              ) : (
                /* SELLER VIEW: Tan narxi is completely HIDDEN */
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {t('sell_price')} (so'm) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="140000"
                    value={formData.sellPrice}
                    onChange={(e) => setFormData({ ...formData, sellPrice: e.target.value })}
                    className="input-field font-semibold text-blue-700"
                  />
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
                <p className="text-[11px] text-gray-400 mt-1">
                  Moy va antifrizlar uchun o'nlik kasr (masalan: 4.5 litr) kiritish mumkin.
                </p>
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

      {/* Restock Modal - Tan narxi is completely hidden from Seller */}
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

              {/* Price updates on restock: Cost Price is ONLY shown to Admin */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-purple-700 mb-1">
                    {t('new_cost_price')} (so'm)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="Tan narxi"
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                    className="input-field text-sm font-mono border-purple-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  {t('new_sell_price')} (so'm)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="Sotuv narxi"
                  value={restockSell}
                  onChange={(e) => setRestockSell(e.target.value)}
                  className="input-field text-sm"
                />
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
