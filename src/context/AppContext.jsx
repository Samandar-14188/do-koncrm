import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { generateId, calcRealizedProfit, isDateInRange } from '../utils/helpers';
import {
  autoInitSupabase,
  syncToCloud,
  fetchTableFromCloud,
  saveRecordToCloud,
  deleteRecordFromCloud,
  isSupabaseConnected,
  clearCloudTables,
  saveCloudExchangeRate,
  fetchCloudExchangeRate,
  broadcastDbChange,
  initRealtimeSync,
} from '../utils/supabase';

const AppContext = createContext();

// Helper to strictly sanitize product currency and values
export const cleanProduct = (p, currentRate = 12800) => {
  if (!p) return p;
  const costCurrency = p.costCurrency === 'USD' ? 'USD' : 'UZS';
  const sellCurrency = (p.sellCurrency === 'USD' || p.priceCurrency === 'USD') ? 'USD' : 'UZS';
  const priceCurrency = sellCurrency;

  const costPrice = Number(p.costPrice) || 0;
  const sellPrice = Number(p.sellPrice) || 0;

  let costPriceUSD = null;
  if (costCurrency === 'USD') {
    costPriceUSD = p.costPriceUSD !== undefined && p.costPriceUSD !== null
      ? Number(p.costPriceUSD)
      : Math.round((costPrice / currentRate) * 100) / 100;
  }

  let sellPriceUSD = null;
  if (sellCurrency === 'USD') {
    sellPriceUSD = p.sellPriceUSD !== undefined && p.sellPriceUSD !== null
      ? Number(p.sellPriceUSD)
      : Math.round((sellPrice / currentRate) * 100) / 100;
  }

  return {
    ...p,
    costCurrency,
    costPrice,
    costPriceUSD,
    sellCurrency,
    priceCurrency,
    sellPrice,
    sellPriceUSD,
  };
};

export function AppProvider({ children }) {
  // 1. PRODUCTS STATE (Starts empty array [] on new devices, syncs from Supabase)
  const [products, setProducts] = useState(() => {
    const saved = storage.get('products');
    const deleted = new Set(storage.get('deleted_products_ids') || []);
    return Array.isArray(saved)
      ? saved
          .filter((p) => !deleted.has(String(p.id)) && !String(p.id).startsWith('prod-'))
          .map((p) => cleanProduct(p, 12800))
      : [];
  });

  // 2. DEBTORS STATE (Cumulative profiles)
  const [debtors, setDebtors] = useState(() => {
    const saved = storage.get('debtors');
    const deleted = new Set(storage.get('deleted_debtors_ids') || []);
    return Array.isArray(saved) ? saved.filter((d) => !deleted.has(String(d.id))) : [];
  });

  // 3. SALES STATE
  const [sales, setSales] = useState(() => {
    const saved = storage.get('sales');
    return Array.isArray(saved) ? saved : [];
  });

  // 4. SUPPLIERS STATE (Yetkazib beruvchilar)
  const [suppliers, setSuppliers] = useState(() => {
    const saved = storage.get('suppliers');
    const deleted = new Set(storage.get('deleted_suppliers_ids') || []);
    return Array.isArray(saved) ? saved.filter((s) => !deleted.has(String(s.id))) : [];
  });

  // 5. EXCHANGE RATE STATE (USD to UZS Rate, default 12800)
  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = storage.get('exchange_rate');
    return Number(saved) || 12800;
  });

  // 6. CLOUD SYNC STATUS
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Helper to fetch all tables directly from Supabase (Single Source of Truth)
  // AND immediately push any existing unsynced localStorage items to Supabase!
  const syncAllFromCloud = useCallback(async (forcedRate) => {
    if (!isSupabaseConnected()) {
      autoInitSupabase();
    }
    if (!isSupabaseConnected()) return false;

    try {
      const [prodsRes, debtorsRes, salesRes, suppliersRes, cloudRate] = await Promise.all([
        fetchTableFromCloud('products'),
        fetchTableFromCloud('debtors'),
        fetchTableFromCloud('sales'),
        fetchTableFromCloud('suppliers'),
        fetchCloudExchangeRate(),
      ]);

      const activeRate = Number(cloudRate) || forcedRate || exchangeRate || 12800;
      if (cloudRate && Number(cloudRate) > 0) {
        setExchangeRate(Number(cloudRate));
        storage.set('exchange_rate', Number(cloudRate));
      }

      // 1. PRODUCTS: Supabase is the single source of truth
      if (prodsRes.success) {
        const deletedProductIds = new Set(storage.get('deleted_products_ids') || []);
        for (const delId of deletedProductIds) {
          if (prodsRes.data.some((p) => String(p.id) === delId)) {
            deleteRecordFromCloud('products', delId);
          }
        }
        const validCloudProducts = prodsRes.data
          .filter((p) => !deletedProductIds.has(String(p.id)) && !String(p.id).startsWith('prod-'))
          .map((p) => cleanProduct(p, activeRate));

        setProducts(validCloudProducts);
        storage.set('products', validCloudProducts);
      }

      // 2. DEBTORS: Supabase is the single source of truth
      if (debtorsRes.success) {
        const deletedDebtorIds = new Set(storage.get('deleted_debtors_ids') || []);
        for (const delId of deletedDebtorIds) {
          if (debtorsRes.data.some((d) => String(d.id) === delId)) {
            deleteRecordFromCloud('debtors', delId);
          }
        }
        const validDebtors = debtorsRes.data.filter((d) => !deletedDebtorIds.has(String(d.id)));
        setDebtors(validDebtors);
        storage.set('debtors', validDebtors);
      }

      // 3. SALES: Supabase is the single source of truth
      if (salesRes.success) {
        setSales(salesRes.data);
        storage.set('sales', salesRes.data);
      }

      // 4. SUPPLIERS: Supabase is the single source of truth
      if (suppliersRes.success) {
        const deletedSupplierIds = new Set(storage.get('deleted_suppliers_ids') || []);
        for (const delId of deletedSupplierIds) {
          if (suppliersRes.data.some((s) => String(s.id) === delId)) {
            deleteRecordFromCloud('suppliers', delId);
          }
        }
        const validSuppliers = suppliersRes.data.filter((s) => !deletedSupplierIds.has(String(s.id)));
        setSuppliers(validSuppliers);
        storage.set('suppliers', validSuppliers);
      }

      setIsCloudConnected(true);
      return true;
    } catch (err) {
      console.warn('Cloud sync error on mount:', err);
      return false;
    }
  }, [exchangeRate]);

  // Realtime multi-device sync and reconnection listeners
  useEffect(() => {
    autoInitSupabase();
    syncAllFromCloud();

    // 1. Multi-device Realtime channel (PC <-> Honor X9c phone <-> Tablet)
    const unsubscribe = initRealtimeSync((event) => {
      if (!event) return;

      if (event.action === 'wipe_all') {
        setProducts([]);
        setDebtors([]);
        setSales([]);
        setSuppliers([]);
        storage.set('products', []);
        storage.set('debtors', []);
        storage.set('sales', []);
        storage.set('suppliers', []);
        storage.set('deleted_products_ids', []);
        storage.set('deleted_suppliers_ids', []);
        storage.set('deleted_debtors_ids', []);
        return;
      }

      const table = event.table;
      if (!table) {
        syncAllFromCloud();
        return;
      }

      // 1. PRODUCTS REALTIME HANDLING
      if (table === 'products') {
        if (event.action === 'delete') {
          const delId = String(event.id || event.old?.id || '').trim();
          if (delId) {
            const deletedIds = new Set(storage.get('deleted_products_ids') || []);
            deletedIds.add(delId);
            storage.set('deleted_products_ids', Array.from(deletedIds));

            setProducts((prev) => prev.filter((p) => String(p.id) !== delId));
            const local = (storage.get('products') || []).filter((p) => String(p.id) !== delId);
            storage.set('products', local);
          }
          return;
        }

        // For adds or updates from other devices:
        fetchTableFromCloud('products').then((res) => {
          if (res.success) {
            const deletedProductIds = new Set(storage.get('deleted_products_ids') || []);
            const valid = res.data
              .filter((p) => !deletedProductIds.has(String(p.id)) && !String(p.id).startsWith('prod-'))
              .map((p) => cleanProduct(p, exchangeRate));
            setProducts(valid);
            storage.set('products', valid);
          }
        });
        return;
      }

      // 2. SUPPLIERS REALTIME HANDLING
      if (table === 'suppliers') {
        if (event.action === 'delete') {
          const delId = String(event.id || event.old?.id || '').trim();
          if (delId) {
            const deletedIds = new Set(storage.get('deleted_suppliers_ids') || []);
            deletedIds.add(delId);
            storage.set('deleted_suppliers_ids', Array.from(deletedIds));

            setSuppliers((prev) => prev.filter((s) => String(s.id) !== delId));
            const local = (storage.get('suppliers') || []).filter((s) => String(s.id) !== delId);
            storage.set('suppliers', local);
          }
          return;
        }

        fetchTableFromCloud('suppliers').then((res) => {
          if (res.success) {
            const deletedSupplierIds = new Set(storage.get('deleted_suppliers_ids') || []);
            const valid = res.data.filter((s) => !deletedSupplierIds.has(String(s.id)));
            setSuppliers(valid);
            storage.set('suppliers', valid);
          }
        });
        return;
      }

      // 3. DEBTORS REALTIME HANDLING
      if (table === 'debtors') {
        if (event.action === 'delete') {
          const delId = String(event.id || event.old?.id || '').trim();
          if (delId) {
            const deletedIds = new Set(storage.get('deleted_debtors_ids') || []);
            deletedIds.add(delId);
            storage.set('deleted_debtors_ids', Array.from(deletedIds));

            setDebtors((prev) => prev.filter((d) => String(d.id) !== delId));
            const local = (storage.get('debtors') || []).filter((d) => String(d.id) !== delId);
            storage.set('debtors', local);
          }
          return;
        }

        fetchTableFromCloud('debtors').then((res) => {
          if (res.success) {
            const deletedDebtorIds = new Set(storage.get('deleted_debtors_ids') || []);
            const valid = res.data.filter((d) => !deletedDebtorIds.has(String(d.id)));
            setDebtors(valid);
            storage.set('debtors', valid);
          }
        });
        return;
      }

      // 4. SALES REALTIME HANDLING
      if (table === 'sales') {
        fetchTableFromCloud('sales').then((res) => {
          if (res.success) {
            setSales(res.data);
            storage.set('sales', res.data);
          }
        });
        return;
      }

      // 5. SETTINGS REALTIME HANDLING
      if (table === 'settings') {
        fetchCloudExchangeRate().then((rate) => {
          if (rate && Number(rate) > 0) {
            setExchangeRate(Number(rate));
            storage.set('exchange_rate', Number(rate));
          }
        });
      }
    });

    // 2. Re-sync on window focus / visibility change / online event (e.g. phone screen unlocked)
    const handleRecheck = () => {
      if (document.visibilityState === 'visible') {
        syncAllFromCloud();
      }
    };

    window.addEventListener('focus', handleRecheck);
    window.addEventListener('online', handleRecheck);
    document.addEventListener('visibilitychange', handleRecheck);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', handleRecheck);
      window.removeEventListener('online', handleRecheck);
      document.removeEventListener('visibilitychange', handleRecheck);
    };
  }, [syncAllFromCloud, exchangeRate]);

  // Save helpers (Immediate local write + Supabase sync + Realtime broadcast)
  const saveProducts = (updated, shouldBroadcast = true) => {
    const cleaned = updated.map((p) => cleanProduct(p, exchangeRate));
    setProducts(cleaned);
    storage.set('products', cleaned);
    if (isSupabaseConnected()) {
      syncToCloud('products', cleaned);
      if (shouldBroadcast) {
        broadcastDbChange({ table: 'products', action: 'sync' });
      }
    }
  };

  const saveDebtors = (updated, shouldBroadcast = true) => {
    setDebtors(updated);
    storage.set('debtors', updated);
    if (isSupabaseConnected()) {
      syncToCloud('debtors', updated);
      if (shouldBroadcast) {
        broadcastDbChange({ table: 'debtors', action: 'sync' });
      }
    }
  };

  const saveSales = (updated, shouldBroadcast = true) => {
    setSales(updated);
    storage.set('sales', updated);
    if (isSupabaseConnected()) {
      syncToCloud('sales', updated);
      if (shouldBroadcast) {
        broadcastDbChange({ table: 'sales', action: 'sync' });
      }
    }
  };

  const saveSuppliers = (updated, shouldBroadcast = true) => {
    setSuppliers(updated);
    storage.set('suppliers', updated);
    if (isSupabaseConnected()) {
      syncToCloud('suppliers', updated);
      if (shouldBroadcast) {
        broadcastDbChange({ table: 'suppliers', action: 'sync' });
      }
    }
  };

  // Update Exchange Rate (USD to UZS)
  const updateExchangeRate = async (newRate) => {
    const rate = Number(newRate);
    if (!rate || rate <= 0) return false;

    setExchangeRate(rate);
    storage.set('exchange_rate', rate);
    if (isSupabaseConnected()) {
      await saveCloudExchangeRate(rate);
      broadcastDbChange({ table: 'settings', action: 'exchange_rate', rate });
    }

    // Recalculate converted UZS costPrice and sellPrice for all products with USD
    const updatedProducts = products.map((p) => {
      let changed = false;
      let newCost = p.costPrice;
      let newSell = p.sellPrice;
      if (p.costCurrency === 'USD' && p.costPriceUSD) {
        newCost = Math.round(Number(p.costPriceUSD) * rate);
        changed = true;
      }
      if (p.sellCurrency === 'USD' && p.sellPriceUSD) {
        newSell = Math.round(Number(p.sellPriceUSD) * rate);
        changed = true;
      }
      if (changed) {
        return {
          ...p,
          costPrice: newCost,
          sellPrice: newSell,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveProducts(updatedProducts);

    return true;
  };

  // ==========================================
  // SUPPLIERS ACTIONS
  // ==========================================
  const addSupplier = (supplierData) => {
    const now = new Date().toISOString();
    const newSupplier = {
      id: generateId(),
      name: supplierData.name.trim(),
      phone: (supplierData.phone || '').trim(),
      currency: supplierData.currency === 'USD' ? 'USD' : 'UZS',
      totalPurchased: 0,
      totalPaid: 0,
      debtBalance: 0,
      payments: [],
      createdAt: now,
      updatedAt: now,
    };
    const updated = [...suppliers, newSupplier];
    setSuppliers(updated);
    storage.set('suppliers', updated);
    if (isSupabaseConnected()) {
      saveRecordToCloud('suppliers', newSupplier);
      broadcastDbChange({ table: 'suppliers', action: 'add', record: newSupplier });
    }
    return newSupplier;
  };

  const updateSupplier = (id, updates) => {
    let updatedSupplierItem = null;
    const updated = suppliers.map((s) => {
      if (s.id === id) {
        updatedSupplierItem = {
          ...s,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : s.name,
          phone: updates.phone !== undefined ? updates.phone.trim() : s.phone,
          currency: updates.currency !== undefined ? updates.currency : (s.currency || 'UZS'),
          updatedAt: new Date().toISOString(),
        };
        return updatedSupplierItem;
      }
      return s;
    });
    setSuppliers(updated);
    storage.set('suppliers', updated);
    if (isSupabaseConnected() && updatedSupplierItem) {
      saveRecordToCloud('suppliers', updatedSupplierItem);
      broadcastDbChange({ table: 'suppliers', action: 'update', record: updatedSupplierItem });
    }
  };

  const deleteSupplier = async (id) => {
    const cleanId = String(id).trim();
    const updated = suppliers.filter((s) => String(s.id).trim() !== cleanId);
    setSuppliers(updated);
    storage.set('suppliers', updated);

    // Track in deleted_suppliers_ids blacklist in localStorage
    const deletedIds = new Set(storage.get('deleted_suppliers_ids') || []);
    deletedIds.add(cleanId);
    storage.set('deleted_suppliers_ids', Array.from(deletedIds));

    if (isSupabaseConnected()) {
      await deleteRecordFromCloud('suppliers', cleanId);
      try {
        const client = getSupabase();
        if (client) {
          await client.from('settings').upsert([
            {
              id: 'store_suppliers',
              data: updated,
              updated_at: new Date().toISOString(),
            },
          ], { onConflict: 'id' });
        }
      } catch (_) {}
      broadcastDbChange({ table: 'suppliers', action: 'delete', id: cleanId });
    }
  };

  // Record payment to supplier (supports USD or UZS)
  const paySupplierDebt = ({ supplierId, amount, method = 'cash', note = '', paymentCurrency }) => {
    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) return false;
    const now = new Date().toISOString();

    const updated = suppliers.map((s) => {
      if (s.id === supplierId) {
        const supCurr = s.currency || 'UZS';
        const payCurr = paymentCurrency || supCurr;

        let debtDeduction = payAmt;
        if (supCurr === 'USD' && payCurr === 'UZS') {
          debtDeduction = Math.round((payAmt / exchangeRate) * 100) / 100;
        } else if (supCurr === 'UZS' && payCurr === 'USD') {
          debtDeduction = Math.round(payAmt * exchangeRate);
        }

        const newDebt = Math.max(0, (s.debtBalance || 0) - debtDeduction);
        const newPaid = (s.totalPaid || 0) + debtDeduction;
        const newPayment = {
          id: generateId(),
          date: now,
          amount: payAmt,
          currency: payCurr,
          debtDeduction,
          method,
          note: note.trim(),
        };
        return {
          ...s,
          debtBalance: newDebt,
          totalPaid: newPaid,
          payments: [newPayment, ...(s.payments || [])],
          updatedAt: now,
        };
      }
      return s;
    });
    saveSuppliers(updated);
    return true;
  };

  // ==========================================
  // INVENTORY / PRODUCT ACTIONS
  // ==========================================
  const addProduct = (productData) => {
    const now = new Date().toISOString();
    const costCurrency = productData.costCurrency === 'USD' ? 'USD' : 'UZS';
    let costPrice = 0;
    let costPriceUSD = null;

    if (costCurrency === 'USD') {
      costPriceUSD = Number(productData.costPriceUSD !== undefined && productData.costPriceUSD !== null ? productData.costPriceUSD : productData.costPrice) || 0;
      costPrice = Math.round(costPriceUSD * exchangeRate);
    } else {
      costPrice = Number(productData.costPrice) || 0;
      costPriceUSD = null;
    }

    const sellCurrency = productData.sellCurrency === 'USD' ? 'USD' : 'UZS';
    let sellPrice = 0;
    let sellPriceUSD = null;

    if (sellCurrency === 'USD') {
      sellPriceUSD = Number(productData.sellPriceUSD !== undefined && productData.sellPriceUSD !== null ? productData.sellPriceUSD : productData.sellPrice) || 0;
      sellPrice = Math.round(sellPriceUSD * exchangeRate);
    } else {
      sellPrice = Number(productData.sellPrice) || 0;
      sellPriceUSD = null;
    }

    const qty = Number(productData.quantity) || 0;
    const supplierId = productData.supplierId || null;
    const supplierName = productData.supplierName || '';
    const paymentMode = productData.purchasePaymentMode || 'cash'; // 'cash' or 'credit'

    const rawProduct = {
      id: generateId(),
      name: productData.name.trim(),
      artikul: (productData.artikul || '').trim(),
      costPrice,
      costPriceUSD,
      costCurrency,
      sellPrice,
      sellPriceUSD,
      sellCurrency,
      quantity: qty,
      supplierId,
      supplierName,
      createdAt: now,
      updatedAt: now,
    };
    const cleanedProduct = cleanProduct(rawProduct, exchangeRate);
    const updatedProducts = [cleanedProduct, ...products];
    setProducts(updatedProducts);
    storage.set('products', updatedProducts);

    if (isSupabaseConnected()) {
      saveRecordToCloud('products', cleanedProduct);
      broadcastDbChange({ table: 'products', action: 'add', record: cleanedProduct });
    }

    // If supplier selected and quantity > 0 and cost > 0, record incoming purchase in supplier's currency
    if (supplierId && qty > 0 && costPrice > 0) {
      const selectedSup = suppliers.find((s) => s.id === supplierId);
      const isUSDSupplier = selectedSup?.currency === 'USD';
      const incomingSum = isUSDSupplier ? ((costPriceUSD || (costPrice / exchangeRate)) * qty) : (costPrice * qty);

      const updatedSuppliers = suppliers.map((s) => {
        if (s.id === supplierId) {
          const totalPurchased = (s.totalPurchased || 0) + incomingSum;
          let debtBalance = s.debtBalance || 0;
          let totalPaid = s.totalPaid || 0;
          if (paymentMode === 'credit') {
            debtBalance += incomingSum;
          } else {
            totalPaid += incomingSum;
          }
          return {
            ...s,
            totalPurchased,
            debtBalance,
            totalPaid,
            updatedAt: now,
          };
        }
        return s;
      });
      saveSuppliers(updatedSuppliers);
    }

    return cleanedProduct;
  };

  const updateProduct = (id, updates) => {
    let updatedProductItem = null;
    const updated = products.map((p) => {
      if (p.id === id) {
        const costCurrency = updates.costCurrency !== undefined ? updates.costCurrency : (p.costCurrency || 'UZS');
        let costPrice = p.costPrice;
        let costPriceUSD = p.costPriceUSD;

        if (updates.costPrice !== undefined || updates.costPriceUSD !== undefined || updates.costCurrency !== undefined) {
          if (costCurrency === 'USD') {
            costPriceUSD = Number(updates.costPriceUSD !== undefined && updates.costPriceUSD !== null
              ? updates.costPriceUSD
              : (updates.costPrice !== undefined ? updates.costPrice : p.costPriceUSD || 0)) || 0;
            costPrice = Math.round(costPriceUSD * exchangeRate);
          } else {
            costPrice = Number(updates.costPrice !== undefined ? updates.costPrice : p.costPrice) || 0;
            costPriceUSD = null;
          }
        }

        const sellCurrency = updates.sellCurrency !== undefined ? updates.sellCurrency : (p.sellCurrency || 'UZS');
        let sellPrice = p.sellPrice;
        let sellPriceUSD = p.sellPriceUSD;

        if (updates.sellPrice !== undefined || updates.sellPriceUSD !== undefined || updates.sellCurrency !== undefined) {
          if (sellCurrency === 'USD') {
            sellPriceUSD = Number(updates.sellPriceUSD !== undefined && updates.sellPriceUSD !== null
              ? updates.sellPriceUSD
              : (updates.sellPrice !== undefined ? updates.sellPrice : p.sellPriceUSD || 0)) || 0;
            sellPrice = Math.round(sellPriceUSD * exchangeRate);
          } else {
            sellPrice = Number(updates.sellPrice !== undefined ? updates.sellPrice : p.sellPrice) || 0;
            sellPriceUSD = null;
          }
        }

        updatedProductItem = cleanProduct({
          ...p,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : p.name,
          artikul: updates.artikul !== undefined ? updates.artikul.trim() : p.artikul,
          costPrice,
          costPriceUSD,
          costCurrency,
          sellPrice,
          sellPriceUSD,
          sellCurrency,
          quantity: updates.quantity !== undefined ? Number(updates.quantity) : p.quantity,
          supplierId: updates.supplierId !== undefined ? updates.supplierId : p.supplierId,
          supplierName: updates.supplierName !== undefined ? updates.supplierName : p.supplierName,
          updatedAt: new Date().toISOString(),
        }, exchangeRate);
        return updatedProductItem;
      }
      return p;
    });

    setProducts(updated);
    storage.set('products', updated);

    if (isSupabaseConnected() && updatedProductItem) {
      saveRecordToCloud('products', updatedProductItem);
      broadcastDbChange({ table: 'products', action: 'update', record: updatedProductItem });
    }
  };

  const deleteProduct = async (id) => {
    const cleanId = String(id).trim();
    const prodToDelete = products.find((p) => String(p.id).trim() === cleanId);
    const updated = products.filter((p) => String(p.id).trim() !== cleanId);
    setProducts(updated);
    storage.set('products', updated);

    // Track in deleted_products_ids blacklist in localStorage
    const deletedIds = new Set(storage.get('deleted_products_ids') || []);
    deletedIds.add(cleanId);
    storage.set('deleted_products_ids', Array.from(deletedIds));

    if (isSupabaseConnected()) {
      const res = await deleteRecordFromCloud('products', cleanId);
      if (res && res.error) {
        console.error('Failed to delete product from Supabase:', res.error);
      }
      broadcastDbChange({ table: 'products', action: 'delete', id: cleanId });
    }

    // Deduct remaining stock load from supplier if product had a supplier
    if (prodToDelete && prodToDelete.supplierId) {
      const sup = suppliers.find((s) => String(s.id).trim() === String(prodToDelete.supplierId).trim());
      if (sup) {
        const isUSD = sup.currency === 'USD';
        const qty = Number(prodToDelete.quantity) || 0;
        let deductAmount = 0;
        if (isUSD) {
          const costUSD = prodToDelete.costPriceUSD !== undefined && prodToDelete.costPriceUSD !== null
            ? Number(prodToDelete.costPriceUSD)
            : (Number(prodToDelete.costPrice || 0) / (exchangeRate || 12800));
          deductAmount = costUSD * qty;
        } else {
          deductAmount = Number(prodToDelete.costPrice || 0) * qty;
        }

        if (deductAmount > 0) {
          const now = new Date().toISOString();
          const newTotalPurchased = Math.max(0, Number(((sup.totalPurchased || 0) - deductAmount).toFixed(2)));
          const debtDeduct = Math.min(sup.debtBalance || 0, deductAmount);
          const newDebtBalance = Math.max(0, Number(((sup.debtBalance || 0) - debtDeduct).toFixed(2)));
          const paidDeduct = deductAmount - debtDeduct;
          const newTotalPaid = Math.max(0, Number(((sup.totalPaid || 0) - paidDeduct).toFixed(2)));

          const updatedSuppliers = suppliers.map((s) => {
            if (String(s.id).trim() === String(sup.id).trim()) {
              return {
                ...s,
                totalPurchased: newTotalPurchased,
                debtBalance: newDebtBalance,
                totalPaid: newTotalPaid,
                updatedAt: now,
              };
            }
            return s;
          });

          saveSuppliers(updatedSuppliers);
        }
      }
    }
  };

  // Restock existing product: adds to current quantity, updates prices and optionally supplier accounting
  const restockProduct = (id, addQty, newCostPrice, newSellPrice, supplierInfo = {}) => {
    const addQuantity = Number(addQty) || 0;
    const now = new Date().toISOString();
    let effectiveCostUZS = 0;
    let effectiveCostUSD = null;
    let targetSupplierId = supplierInfo.supplierId || null;
    let targetSupplierName = supplierInfo.supplierName || '';
    const purchaseMode = supplierInfo.purchasePaymentMode || 'cash';
    const costCurrency = supplierInfo.costCurrency || 'UZS';
    const sellCurrency = supplierInfo.sellCurrency || 'UZS';

    const updated = products.map((p) => {
      if (p.id === id) {
        if (costCurrency === 'USD') {
          effectiveCostUSD = Number(supplierInfo.costPriceUSD !== undefined && supplierInfo.costPriceUSD !== null
            ? supplierInfo.costPriceUSD
            : newCostPrice) || p.costPriceUSD || 0;
          effectiveCostUZS = Math.round(effectiveCostUSD * exchangeRate);
        } else {
          effectiveCostUZS = newCostPrice !== undefined && newCostPrice !== '' ? Number(newCostPrice) : (p.costPrice || 0);
          effectiveCostUSD = null;
        }

        let effectiveSellUZS = p.sellPrice;
        let effectiveSellUSD = p.sellPriceUSD;
        if (newSellPrice !== undefined && newSellPrice !== '') {
          if (sellCurrency === 'USD') {
            effectiveSellUSD = Number(supplierInfo.sellPriceUSD !== undefined && supplierInfo.sellPriceUSD !== null
              ? supplierInfo.sellPriceUSD
              : newSellPrice) || 0;
            effectiveSellUZS = Math.round(effectiveSellUSD * exchangeRate);
          } else {
            effectiveSellUZS = Number(newSellPrice) || 0;
            effectiveSellUSD = null;
          }
        }

        if (!targetSupplierId && p.supplierId) {
          targetSupplierId = p.supplierId;
          targetSupplierName = p.supplierName || '';
        }

        return {
          ...p,
          quantity: Math.max(0, Number((p.quantity + addQuantity).toFixed(2))),
          costPrice: effectiveCostUZS,
          costPriceUSD: effectiveCostUSD,
          costCurrency: costCurrency || 'UZS',
          sellPrice: effectiveSellUZS,
          sellPriceUSD: effectiveSellUSD,
          sellCurrency: sellCurrency || 'UZS',
          supplierId: targetSupplierId || p.supplierId || null,
          supplierName: targetSupplierName || p.supplierName || '',
          updatedAt: now,
        };
      }
      return p;
    });
    saveProducts(updated);

    // If supplier selected and stock added, update supplier accounting
    if (targetSupplierId && addQuantity > 0 && effectiveCostUZS > 0) {
      const selectedSup = suppliers.find((s) => s.id === targetSupplierId);
      const isUSDSupplier = selectedSup?.currency === 'USD';
      const incomingSum = isUSDSupplier
        ? ((effectiveCostUSD || (effectiveCostUZS / (exchangeRate || 12800))) * addQuantity)
        : (effectiveCostUZS * addQuantity);

      const updatedSuppliers = suppliers.map((s) => {
        if (s.id === targetSupplierId) {
          const totalPurchased = (s.totalPurchased || 0) + incomingSum;
          let debtBalance = s.debtBalance || 0;
          let totalPaid = s.totalPaid || 0;
          if (purchaseMode === 'credit') {
            debtBalance += incomingSum;
          } else {
            totalPaid += incomingSum;
          }
          return {
            ...s,
            totalPurchased,
            debtBalance,
            totalPaid,
            updatedAt: now,
          };
        }
        return s;
      });
      saveSuppliers(updatedSuppliers);
    }
  };

  // ==========================================
  // POS & SALES ACTIONS (STRICT CASH-BASIS PROFIT)
  // ==========================================
  const processSale = ({ items, paymentData }) => {
    const now = new Date().toISOString();
    const saleId = generateId();
    const saleNum = `S-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Calculate totals
    let totalAmount = 0;
    let totalCost = 0;

    items.forEach((item) => {
      const price = Number(item.bargainPrice !== undefined ? item.bargainPrice : item.sellPrice);
      const cost = Number(item.costPrice || 0);
      const qty = Number(item.quantity || 1);
      totalAmount += price * qty;
      totalCost += cost * qty;
    });

    const totalProfit = totalAmount - totalCost;

    // Payment amounts
    let paidCash = 0;
    let paidCard = 0;
    let creditAmount = 0;

    if (paymentData.mode === 'cash') {
      paidCash = totalAmount;
    } else if (paymentData.mode === 'card') {
      paidCard = totalAmount;
    } else if (paymentData.mode === 'credit') {
      creditAmount = totalAmount;
    } else if (paymentData.mode === 'mixed') {
      paidCash = Number(paymentData.paidCash) || 0;
      paidCard = Number(paymentData.paidCard) || 0;
      creditAmount = Math.max(0, totalAmount - paidCash - paidCard);
    }

    const totalPaidNow = paidCash + paidCard;

    // STRICT CASH-BASIS: Only recognized on actual collected cash/card
    const realizedProfit = totalAmount > 0
      ? Math.round(calcRealizedProfit(totalProfit, totalAmount, totalPaidNow))
      : 0;

    // 2. Deduct inventory stock (Zero-Stock rule: keep item with quantity=0, do NOT delete)
    const productStockMap = new Map();
    items.forEach((item) => {
      productStockMap.set(item.productId, (productStockMap.get(item.productId) || 0) + Number(item.quantity));
    });

    const updatedProducts = products.map((p) => {
      if (productStockMap.has(p.id)) {
        const deductQty = productStockMap.get(p.id);
        const newQty = Math.max(0, Number((p.quantity - deductQty).toFixed(2)));
        return {
          ...p,
          quantity: newQty,
          updatedAt: now,
        };
      }
      return p;
    });
    saveProducts(updatedProducts);

    // 3. Handle Cumulative Debtor Profile if there is creditAmount > 0
    let finalDebtorId = paymentData.debtorId || null;
    let updatedDebtorsList = [...debtors];

    if (creditAmount > 0) {
      const cleanName = (paymentData.debtorName || '').trim();
      const cleanPhone = (paymentData.debtorPhone || '').trim();

      let debtor = null;
      if (finalDebtorId) {
        debtor = updatedDebtorsList.find((d) => d.id === finalDebtorId);
      }
      if (!debtor && cleanPhone) {
        debtor = updatedDebtorsList.find(
          (d) => d.phone && d.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '')
        );
      }
      if (!debtor && cleanName) {
        debtor = updatedDebtorsList.find(
          (d) => d.name.toLowerCase() === cleanName.toLowerCase()
        );
      }

      const creditTx = {
        id: generateId(),
        saleId,
        date: now,
        amount: creditAmount,
        items: items.map((it) => ({
          name: it.productName,
          quantity: Number(it.quantity),
          price: Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice),
        })),
      };

      if (debtor) {
        finalDebtorId = debtor.id;
        updatedDebtorsList = updatedDebtorsList.map((d) => {
          if (d.id === debtor.id) {
            return {
              ...d,
              phone: cleanPhone || d.phone,
              transactions: [creditTx, ...(d.transactions || [])],
            };
          }
          return d;
        });
      } else {
        finalDebtorId = generateId();
        const newDebtor = {
          id: finalDebtorId,
          name: cleanName || "Noma'lum usta",
          phone: cleanPhone,
          createdAt: now,
          transactions: [creditTx],
          payments: [],
        };
        updatedDebtorsList = [newDebtor, ...updatedDebtorsList];
      }

      saveDebtors(updatedDebtorsList);
    }

    // 4. Create Sale Record with preserved supplier info
    const newSale = {
      id: saleId,
      saleNumber: saleNum,
      date: now,
      items: items.map((it) => {
        const prod = products.find((p) => p.id === it.productId);
        return {
          productId: it.productId,
          productName: it.productName,
          artikul: it.artikul || '',
          quantity: Number(it.quantity),
          costPrice: Number(it.costPrice || 0),
          sellPrice: Number(it.sellPrice || 0),
          bargainPrice: Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice),
          supplierId: it.supplierId || prod?.supplierId || null,
          supplierName: it.supplierName || prod?.supplierName || '',
        };
      }),
      totalAmount,
      totalCost,
      totalProfit,
      paymentMode: paymentData.mode,
      paidCash,
      paidCard,
      creditAmount,
      realizedProfit,
      initialRealizedProfit: realizedProfit,
      debtorId: finalDebtorId,
      debtorName: paymentData.debtorName || '',
      debtorPhone: paymentData.debtorPhone || '',
      returned: false,
      returnedItems: [],
      debtPayments: [],
    };

    const updatedSales = [newSale, ...sales];
    saveSales(updatedSales);

    return newSale;
  };

  // ==========================================
  // DEBT REPAYMENT (CASH-BASIS PROFIT RECOGNITION)
  // ==========================================
  const payDebt = ({ debtorId, amount, method, note = '' }) => {
    const payAmount = Number(amount) || 0;
    if (payAmount <= 0) return false;

    const now = new Date().toISOString();
    const paymentId = generateId();

    const debtor = debtors.find((d) => d.id === debtorId);
    if (!debtor) return false;

    // 1. Record payment in Debtor profile
    const paymentRecord = {
      id: paymentId,
      date: now,
      amount: payAmount,
      method: method || 'cash',
      note: note.trim(),
    };

    const updatedDebtors = debtors.map((d) => {
      if (d.id === debtorId) {
        return {
          ...d,
          payments: [paymentRecord, ...(d.payments || [])],
        };
      }
      return d;
    });
    saveDebtors(updatedDebtors);

    // 2. Attribute proportional profit to the debtor's uncompleted sales
    let remainingPayToAllocate = payAmount;
    const updatedSales = sales.map((sale) => {
      if (
        remainingPayToAllocate > 0 &&
        sale.debtorId === debtorId &&
        sale.creditAmount > 0 &&
        sale.realizedProfit < sale.totalProfit
      ) {
        const unrealizedCredit = sale.creditAmount;
        const allocateAmount = Math.min(remainingPayToAllocate, unrealizedCredit);
        const addedProfit = unrealizedCredit > 0 && sale.totalAmount > 0
          ? Math.round((allocateAmount / sale.totalAmount) * sale.totalProfit)
          : 0;

        remainingPayToAllocate -= allocateAmount;

        return {
          ...sale,
          realizedProfit: Math.min(sale.totalProfit, sale.realizedProfit + addedProfit),
          debtPayments: [
            ...(sale.debtPayments || []),
            {
              paymentId,
              date: now,
              amount: allocateAmount,
              method: method || 'cash',
              profitRecognized: addedProfit,
            },
          ],
        };
      }
      return sale;
    });

    saveSales(updatedSales);
    return true;
  };

  // ==========================================
  // VOZVRAT / PRODUCT RETURN ACTION
  // ==========================================
  const processReturn = ({ saleId, returnItems, refundMethod }) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return false;

    const now = new Date().toISOString();

    let refundTotal = 0;
    let costTotalToRestore = 0;

    const returnMap = new Map();
    returnItems.forEach((ri) => {
      const qty = Number(ri.quantity) || 0;
      if (qty > 0) returnMap.set(ri.productId, qty);
    });

    sale.items.forEach((item) => {
      if (returnMap.has(item.productId)) {
        const retQty = returnMap.get(item.productId);
        const itemPrice = item.bargainPrice !== undefined ? item.bargainPrice : item.sellPrice;
        refundTotal += itemPrice * retQty;
        costTotalToRestore += (item.costPrice || 0) * retQty;
      }
    });

    // Restore stock in Ombor
    const updatedProducts = products.map((p) => {
      if (returnMap.has(p.id)) {
        const retQty = returnMap.get(p.id);
        return {
          ...p,
          quantity: Math.max(0, Number((p.quantity + retQty).toFixed(2))),
          updatedAt: now,
        };
      }
      return p;
    });
    saveProducts(updatedProducts);

    // Adjust debtor balance if debt_reduce
    if (refundMethod === 'debt_reduce' && sale.debtorId) {
      const debtor = debtors.find((d) => d.id === sale.debtorId);
      if (debtor) {
        const returnCreditAdjustment = {
          id: generateId(),
          date: now,
          amount: refundTotal,
          method: 'return_adjustment',
          note: `Vozvrat bo'yicha qarz kamaytirildi (${sale.saleNumber})`,
        };
        const updatedDebtors = debtors.map((d) => {
          if (d.id === debtor.id) {
            return {
              ...d,
              payments: [returnCreditAdjustment, ...(d.payments || [])],
            };
          }
          return d;
        });
        saveDebtors(updatedDebtors);
      }
    }

    // Update returnedQuantity on each item
    const updatedItems = (sale.items || []).map((it) => {
      const additionalRet = returnMap.get(it.productId) || 0;
      const newRetQty = Number((Number(it.returnedQuantity || 0) + additionalRet).toFixed(2));
      return {
        ...it,
        returnedQuantity: newRetQty,
      };
    });

    // Recalculate remaining active items, quantities, totals and costs
    let activeTotalAmount = 0;
    let activeTotalCost = 0;
    let anyActiveItems = false;

    updatedItems.forEach((it) => {
      const activeQty = Math.max(0, Number(it.quantity || 0) - Number(it.returnedQuantity || 0));
      if (activeQty > 0) anyActiveItems = true;
      const price = Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice);
      const cost = Number(it.costPrice || 0);
      activeTotalAmount += price * activeQty;
      activeTotalCost += cost * activeQty;
    });

    const isFullReturn = !anyActiveItems || activeTotalAmount <= 0;

    let newPaidCash = Number(sale.paidCash || 0);
    let newPaidCard = Number(sale.paidCard || 0);
    let newCreditAmount = Number(sale.creditAmount || 0);

    if (isFullReturn) {
      newPaidCash = 0;
      newPaidCard = 0;
      newCreditAmount = 0;
      activeTotalAmount = 0;
      activeTotalCost = 0;
    } else {
      if (refundMethod === 'cash') {
        const deduct = Math.min(newPaidCash, refundTotal);
        newPaidCash -= deduct;
        const remainder = refundTotal - deduct;
        if (remainder > 0) {
          const deductCard = Math.min(newPaidCard, remainder);
          newPaidCard -= deductCard;
          const remainderCredit = remainder - deductCard;
          if (remainderCredit > 0) {
            newCreditAmount = Math.max(0, newCreditAmount - remainderCredit);
          }
        }
      } else if (refundMethod === 'card') {
        const deduct = Math.min(newPaidCard, refundTotal);
        newPaidCard -= deduct;
        const remainder = refundTotal - deduct;
        if (remainder > 0) {
          const deductCash = Math.min(newPaidCash, remainder);
          newPaidCash -= deductCash;
          const remainderCredit = remainder - deductCash;
          if (remainderCredit > 0) {
            newCreditAmount = Math.max(0, newCreditAmount - remainderCredit);
          }
        }
      } else if (refundMethod === 'debt_reduce') {
        newCreditAmount = Math.max(0, newCreditAmount - refundTotal);
      }

      // Ensure total doesn't exceed activeTotalAmount
      if (newPaidCash + newPaidCard + newCreditAmount > activeTotalAmount) {
        if (newCreditAmount > 0) {
          newCreditAmount = Math.max(0, activeTotalAmount - newPaidCash - newPaidCard);
        }
        if (newPaidCash + newPaidCard > activeTotalAmount) {
          newPaidCard = Math.max(0, activeTotalAmount - newPaidCash);
          newPaidCash = Math.min(newPaidCash, activeTotalAmount);
        }
      }
    }

    const activeTotalProfit = Math.max(0, activeTotalAmount - activeTotalCost);
    const activeCollected = newPaidCash + newPaidCard;
    const activeCollectedRatio = activeTotalAmount > 0 ? (activeCollected / activeTotalAmount) : 0;
    const newRealizedProfit = isFullReturn ? 0 : Math.round(activeTotalProfit * activeCollectedRatio);

    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        return {
          ...s,
          items: updatedItems,
          returned: isFullReturn || s.returned,
          returnedItems: [
            ...(s.returnedItems || []),
            ...returnItems.map((ri) => ({
              ...ri,
              refundTotal,
              refundMethod,
              date: now,
            })),
          ],
          totalAmount: activeTotalAmount,
          totalCost: activeTotalCost,
          totalProfit: activeTotalProfit,
          paidCash: newPaidCash,
          paidCard: newPaidCard,
          creditAmount: newCreditAmount,
          realizedProfit: newRealizedProfit,
          initialRealizedProfit: newRealizedProfit,
        };
      }
      return s;
    });

    saveSales(updatedSales);
    return true;
  };

  // ==========================================
  // KPI & REPORT CALCULATIONS (DATE FILTERED)
  // ==========================================
  const getReportData = (dateRange = 'today') => {
    const filteredSales = sales.filter((s) => isDateInRange(s.date, dateRange));

    let totalCashCollected = 0;
    let totalCardCollected = 0;
    let realizedProfit = 0;

    filteredSales.forEach((s) => {
      // Map returned items to handle both new and legacy returns
      const returnedMap = new Map();
      (s.returnedItems || []).forEach((ri) => {
        returnedMap.set(ri.productId, (returnedMap.get(ri.productId) || 0) + Number(ri.quantity || 0));
      });

      let saleActiveAmount = 0;
      let hasActive = false;
      (s.items || []).forEach((it) => {
        const retQty = Number(it.returnedQuantity !== undefined ? it.returnedQuantity : (returnedMap.get(it.productId) || 0));
        const activeQty = Math.max(0, Number(it.quantity || 0) - retQty);
        if (activeQty > 0) hasActive = true;
        const price = Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice);
        saleActiveAmount += price * activeQty;
      });

      // If fully returned or no active amount, do NOT add any cash, card, or profit!
      if ((s.returned && !hasActive) || saleActiveAmount <= 0) {
        return;
      }

      totalCashCollected += Number(s.paidCash || 0);
      totalCardCollected += Number(s.paidCard || 0);
      realizedProfit += Number(s.realizedProfit || 0);
    });

    // Also include debtor debt payments made during this date range (both cash/card & realized profit)
    sales.forEach((s) => {
      (s.debtPayments || []).forEach((dp) => {
        if (isDateInRange(dp.date, dateRange)) {
          realizedProfit += Number(dp.profitRecognized || 0);
        }
      });
    });

    debtors.forEach((d) => {
      (d.payments || []).forEach((p) => {
        if (p.method !== 'return_adjustment' && isDateInRange(p.date, dateRange)) {
          if (p.method === 'cash') {
            totalCashCollected += Number(p.amount || 0);
          } else if (p.method === 'card') {
            totalCardCollected += Number(p.amount || 0);
          }
        }
      });
    });

    const totalRevenue = totalCashCollected + totalCardCollected;

    // Active customer debts
    let totalActiveDebts = 0;
    debtors.forEach((d) => {
      const totalTaken = (d.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalPaid = (d.payments || []).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      const remaining = totalTaken - totalPaid;
      if (remaining > 0) {
        totalActiveDebts += remaining;
      }
    });

    // Warehouse stock valuation (in UZS)
    let stockCostValue = 0;
    let stockRetailValue = 0;
    products.forEach((p) => {
      const qty = Number(p.quantity || 0);
      const cost = p.costCurrency === 'USD' && p.costPriceUSD ? Math.round(p.costPriceUSD * exchangeRate) : (p.costPrice || 0);
      stockCostValue += cost * qty;
      stockRetailValue += Number(p.sellPrice || 0) * qty;
    });

    // Supplier Analytics
    const supplierAnalytics = suppliers.map((sup) => {
      const isUSD = sup.currency === 'USD';
      let stockCostUZS = 0;
      let stockCostUSD = 0;
      let stockRetail = 0;

      products.forEach((p) => {
        if (p.supplierId === sup.id) {
          const q = Number(p.quantity || 0);
          const costUZS = p.costCurrency === 'USD' && p.costPriceUSD ? Math.round(Number(p.costPriceUSD) * exchangeRate) : (Number(p.costPrice) || 0);
          const costUSD = p.costCurrency === 'USD' && p.costPriceUSD ? Number(p.costPriceUSD) : (exchangeRate > 0 ? (costUZS / exchangeRate) : 0);
          stockCostUZS += costUZS * q;
          stockCostUSD += costUSD * q;
          stockRetail += (Number(p.sellPrice) || 0) * q;
        }
      });

      let soldCostUZS = 0;
      let soldCostUSD = 0;
      let supplierProfit = 0;

      sales.forEach((s) => {
        const returnedMap = new Map();
        (s.returnedItems || []).forEach((ri) => {
          returnedMap.set(ri.productId, (returnedMap.get(ri.productId) || 0) + Number(ri.quantity || 0));
        });

        let saleActiveAmount = 0;
        let anyActive = false;
        (s.items || []).forEach((it) => {
          const retQty = Number(it.returnedQuantity !== undefined ? it.returnedQuantity : (returnedMap.get(it.productId) || 0));
          const activeQty = Math.max(0, Number(it.quantity || 0) - retQty);
          if (activeQty > 0) anyActive = true;
          const price = Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice);
          saleActiveAmount += price * activeQty;
        });

        if ((s.returned && !anyActive) || saleActiveAmount <= 0) return;

        const collectedSum = Number(s.paidCash || 0) + Number(s.paidCard || 0);
        const saleRealizedRatio = s.totalAmount > 0 ? (collectedSum / s.totalAmount) : (s.paymentMode === 'credit' ? 0 : 1);

        (s.items || []).forEach((it) => {
          if (it.supplierId === sup.id) {
            const retQty = Number(it.returnedQuantity !== undefined ? it.returnedQuantity : (returnedMap.get(it.productId) || 0));
            const activeQty = Math.max(0, Number(it.quantity || 0) - retQty);
            if (activeQty <= 0) return;

            const actualPrice = it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice;
            const itemCost = Number(it.costPrice || 0);
            const itemMargin = (actualPrice - itemCost) * activeQty;
            supplierProfit += Math.round(itemMargin * saleRealizedRatio);

            soldCostUZS += itemCost * activeQty;
            soldCostUSD += exchangeRate > 0 ? ((itemCost / exchangeRate) * activeQty) : 0;
          }
        });
      });

      // Dynamic reconciliation for live recalculation:
      // Active goods value received from this supplier = remaining warehouse stock + goods already sold
      const actualGoodsLoad = isUSD ? (stockCostUSD + soldCostUSD) : (stockCostUZS + soldCostUZS);

      const explicitPaid = (sup.payments || []).reduce(
        (sum, pm) => sum + Number(pm.debtDeduction || pm.amount || 0),
        0
      );

      let dynamicPurchased = 0;
      let dynamicPaid = 0;
      let dynamicDebt = 0;

      if (actualGoodsLoad <= 0) {
        // When stock is 0 and no sales: NO stale load or phantom paid amounts!
        dynamicPurchased = explicitPaid;
        dynamicPaid = explicitPaid;
        dynamicDebt = 0;
      } else {
        dynamicPurchased = actualGoodsLoad;

        const recordedDebt = Number(sup.debtBalance || 0);
        if (recordedDebt > 0) {
          dynamicDebt = Math.max(0, Math.min(actualGoodsLoad, recordedDebt));
          dynamicPaid = Math.max(0, actualGoodsLoad - dynamicDebt) + explicitPaid;
        } else {
          dynamicDebt = 0;
          dynamicPaid = actualGoodsLoad + explicitPaid;
        }
      }

      return {
        ...sup,
        currency: isUSD ? 'USD' : 'UZS',
        totalPurchased: Number(dynamicPurchased.toFixed(2)),
        totalPaid: Number(dynamicPaid.toFixed(2)),
        debtBalance: Number(dynamicDebt.toFixed(2)),
        stockCostValue: Math.round(stockCostUZS),
        stockCostValueUSD: Number(stockCostUSD.toFixed(2)),
        stockRetailValue: Math.round(stockRetail),
        supplierProfit,
      };
    });

    return {
      totalCashCollected,
      totalCardCollected,
      totalRevenue,
      netProfit: realizedProfit,
      totalActiveDebts,
      stockCostValue,
      stockRetailValue,
      salesCount: filteredSales.length,
      salesList: filteredSales,
      supplierAnalytics,
      exchangeRate,
    };
  };

  // ==========================================
  // BACKUP & RESTORE (EXPORT / IMPORT JSON)
  // ==========================================
  const exportBackupData = () => {
    return {
      version: '1.0',
      appName: 'DokonCRM',
      exportDate: new Date().toISOString(),
      exchangeRate,
      products,
      debtors,
      sales,
      suppliers,
    };
  };

  const importBackupData = async (backup) => {
    if (!backup || typeof backup !== 'object') {
      throw new Error("Noto'g'ri fayl formati!");
    }

    const rawProducts = Array.isArray(backup.products) ? backup.products : [];
    const newDebtors = Array.isArray(backup.debtors) ? backup.debtors : [];
    const newSales = Array.isArray(backup.sales) ? backup.sales : [];
    const newSuppliers = Array.isArray(backup.suppliers) ? backup.suppliers : [];
    const newRate = Number(backup.exchangeRate) || exchangeRate || 12800;
    const newProducts = rawProducts.map((p) => cleanProduct(p, newRate));

    setProducts(newProducts);
    setDebtors(newDebtors);
    setSales(newSales);
    setSuppliers(newSuppliers);
    setExchangeRate(newRate);

    storage.set('initialized', true);
    storage.set('products', newProducts);
    storage.set('debtors', newDebtors);
    storage.set('sales', newSales);
    storage.set('suppliers', newSuppliers);
    storage.set('exchange_rate', newRate);

    if (isSupabaseConnected()) {
      await clearCloudTables();
      await Promise.allSettled([
        syncToCloud('products', newProducts),
        syncToCloud('debtors', newDebtors),
        syncToCloud('sales', newSales),
        syncToCloud('suppliers', newSuppliers),
        saveCloudExchangeRate(newRate),
      ]);
    }

    return {
      productsCount: newProducts.length,
      debtorsCount: newDebtors.length,
      salesCount: newSales.length,
      suppliersCount: newSuppliers.length,
    };
  };

  // ==========================================
  // RESET ALL DATA TO ZERO (EMPTY STORE)
  // ==========================================
  const resetAllData = async () => {
    setProducts([]);
    setDebtors([]);
    setSales([]);
    setSuppliers([]);

    storage.set('initialized', true);
    storage.set('products', []);
    storage.set('debtors', []);
    storage.set('sales', []);
    storage.set('suppliers', []);
    storage.set('deleted_products_ids', []);
    storage.set('deleted_suppliers_ids', []);
    storage.set('deleted_debtors_ids', []);

    if (isSupabaseConnected()) {
      await clearCloudTables();
      broadcastDbChange({ action: 'wipe_all' });
    }
  };

  return (
    <AppContext.Provider
      value={{
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        restockProduct,
        sales,
        processSale,
        processReturn,
        debtors,
        payDebt,
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        paySupplierDebt,
        exchangeRate,
        updateExchangeRate,
        getReportData,
        resetAllData,
        exportBackupData,
        importBackupData,
        isCloudConnected,
        setIsCloudConnected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
