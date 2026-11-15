import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { seedProducts, seedDebtors, seedSales } from '../utils/seedData';
import { generateId, calcRealizedProfit, isDateInRange } from '../utils/helpers';
import { autoInitSupabase, syncToCloud, syncFromCloud, isSupabaseConnected, clearCloudTables } from '../utils/supabase';

const AppContext = createContext();

export function AppProvider({ children }) {
  // 1. PRODUCTS STATE
  const [products, setProducts] = useState(() => {
    const initialized = storage.get('initialized', false);
    const saved = storage.get('products');
    if (initialized) {
      return Array.isArray(saved) ? saved : [];
    }
    storage.set('initialized', true);
    storage.set('products', seedProducts);
    return seedProducts;
  });

  // 2. DEBTORS STATE (Cumulative profiles)
  const [debtors, setDebtors] = useState(() => {
    const initialized = storage.get('initialized', false);
    const saved = storage.get('debtors');
    if (initialized) {
      return Array.isArray(saved) ? saved : [];
    }
    storage.set('debtors', seedDebtors);
    return seedDebtors;
  });

  // 3. SALES STATE
  const [sales, setSales] = useState(() => {
    const initialized = storage.get('initialized', false);
    const saved = storage.get('sales');
    if (initialized) {
      return Array.isArray(saved) ? saved : [];
    }
    storage.set('sales', seedSales);
    return seedSales;
  });

  // 4. CLOUD SYNC STATUS
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // Initialize Supabase on mount
  useEffect(() => {
    const client = autoInitSupabase();
    if (client) {
      setIsCloudConnected(true);
    }
  }, []);

  // Save to localStorage whenever state changes & optionally background sync
  const saveProducts = (updated) => {
    setProducts(updated);
    storage.set('products', updated);
    if (isSupabaseConnected()) syncToCloud('products', updated);
  };

  const saveDebtors = (updated) => {
    setDebtors(updated);
    storage.set('debtors', updated);
    if (isSupabaseConnected()) syncToCloud('debtors', updated);
  };

  const saveSales = (updated) => {
    setSales(updated);
    storage.set('sales', updated);
    if (isSupabaseConnected()) syncToCloud('sales', updated);
  };

  // ==========================================
  // INVENTORY / PRODUCT ACTIONS
  // ==========================================
  const addProduct = (productData) => {
    const now = new Date().toISOString();
    const newProduct = {
      id: generateId(),
      name: productData.name.trim(),
      artikul: (productData.artikul || '').trim(),
      costPrice: Number(productData.costPrice) || 0,
      sellPrice: Number(productData.sellPrice) || 0,
      quantity: Number(productData.quantity) || 0,
      createdAt: now,
      updatedAt: now,
    };
    const updated = [newProduct, ...products];
    saveProducts(updated);
    return newProduct;
  };

  const updateProduct = (id, updates) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          ...updates,
          name: updates.name !== undefined ? updates.name.trim() : p.name,
          artikul: updates.artikul !== undefined ? updates.artikul.trim() : p.artikul,
          costPrice: updates.costPrice !== undefined ? Number(updates.costPrice) : p.costPrice,
          sellPrice: updates.sellPrice !== undefined ? Number(updates.sellPrice) : p.sellPrice,
          quantity: updates.quantity !== undefined ? Number(updates.quantity) : p.quantity,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveProducts(updated);
  };

  const deleteProduct = (id) => {
    const updated = products.filter((p) => p.id !== id);
    saveProducts(updated);
  };

  // Restock existing product: adds to current quantity and updates cost/selling prices
  const restockProduct = (id, addQty, newCostPrice, newSellPrice) => {
    const addQuantity = Number(addQty) || 0;
    const updated = products.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          quantity: Math.max(0, Number((p.quantity + addQuantity).toFixed(2))),
          costPrice: newCostPrice !== undefined && newCostPrice !== '' ? Number(newCostPrice) : p.costPrice,
          sellPrice: newSellPrice !== undefined && newSellPrice !== '' ? Number(newSellPrice) : p.sellPrice,
          updatedAt: new Date().toISOString(),
        };
      }
      return p;
    });
    saveProducts(updated);
  };

  // ==========================================
  // POS & SALES ACTIONS (STRICT CASH-BASIS PROFIT)
  // ==========================================
  /**
   * Process a checkout sale:
   * items: array of { productId, productName, artikul, quantity, costPrice, sellPrice, bargainPrice }
   * paymentData: {
   *   mode: 'cash' | 'card' | 'credit' | 'mixed',
   *   paidCash: number,
   *   paidCard: number,
   *   creditAmount: number,
   *   debtorName: string,
   *   debtorPhone: string,
   *   debtorId: string | null
   * }
   */
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

    // 2. Deduct inventory stock (Zero-Stock rule: keep item with soni=0, do NOT delete)
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

      // Find existing debtor by ID, Phone, or Name
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
        // CUMULATIVE: add to existing debtor profile
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
        // Create new debtor
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

    // 4. Create Sale Record
    const newSale = {
      id: saleId,
      saleNumber: saleNum,
      date: now,
      items: items.map((it) => ({
        productId: it.productId,
        productName: it.productName,
        artikul: it.artikul || '',
        quantity: Number(it.quantity),
        costPrice: Number(it.costPrice || 0),
        sellPrice: Number(it.sellPrice || 0),
        bargainPrice: Number(it.bargainPrice !== undefined ? it.bargainPrice : it.sellPrice),
      })),
      totalAmount,
      totalCost,
      totalProfit,
      paymentMode: paymentData.mode,
      paidCash,
      paidCard,
      creditAmount,
      realizedProfit,
      debtorId: finalDebtorId,
      debtorName: paymentData.debtorName || '',
      debtorPhone: paymentData.debtorPhone || '',
      returned: false,
      returnedItems: [],
    };

    const updatedSales = [newSale, ...sales];
    saveSales(updatedSales);

    return newSale;
  };

  // ==========================================
  // DEBT REPAYMENT (CASH-BASIS PROFIT RECOGNITION)
  // ==========================================
  /**
   * Debtor pays off debt (either partially or in full).
   * Strict Rule: Recognize cash/card revenue and proportional profit on this date!
   */
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
      method: method || 'cash', // 'cash' or 'card'
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
    // We look for sales belonging to this debtor that still have unrealized profit
    let remainingPayToAllocate = payAmount;
    const updatedSales = sales.map((sale) => {
      if (
        remainingPayToAllocate > 0 &&
        sale.debtorId === debtorId &&
        sale.creditAmount > 0 &&
        sale.realizedProfit < sale.totalProfit
      ) {
        const unrealizedCredit = sale.creditAmount;
        const unrealizedProfit = Math.max(0, sale.totalProfit - sale.realizedProfit);

        const allocateAmount = Math.min(remainingPayToAllocate, unrealizedCredit);
        const addedProfit = unrealizedCredit > 0
          ? Math.round((allocateAmount / sale.totalAmount) * sale.totalProfit)
          : 0;

        remainingPayToAllocate -= allocateAmount;

        return {
          ...sale,
          realizedProfit: Math.min(sale.totalProfit, sale.realizedProfit + addedProfit),
          // Record debt collection payment event inside the sale for audit
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
  /**
   * Return items from a sale:
   * saleId: string
   * returnItems: array of { productId, quantity }
   * refundMethod: 'cash' | 'card' | 'debt_reduce'
   */
  const processReturn = ({ saleId, returnItems, refundMethod }) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return false;

    const now = new Date().toISOString();

    // 1. Calculate refund sum & restore inventory stock
    let refundTotal = 0;
    let costTotalToRestore = 0;

    const returnMap = new Map();
    returnItems.forEach((ri) => {
      const qty = Number(ri.quantity) || 0;
      if (qty > 0) returnMap.set(ri.productId, qty);
    });

    const updatedSaleItems = sale.items.map((item) => {
      if (returnMap.has(item.productId)) {
        const retQty = returnMap.get(item.productId);
        const itemPrice = item.bargainPrice !== undefined ? item.bargainPrice : item.sellPrice;
        refundTotal += itemPrice * retQty;
        costTotalToRestore += (item.costPrice || 0) * retQty;
      }
      return item;
    });

    // 2. Restore products in Ombor
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

    // 3. If credit sale: reduce debtor's remaining debt balance
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

    // 4. Update the sale record
    const profitDeduction = refundTotal - costTotalToRestore;
    const isFullReturn = returnItems.every((ri) => {
      const orig = sale.items.find((si) => si.productId === ri.productId);
      return orig && Number(ri.quantity) >= orig.quantity;
    });

    const updatedSales = sales.map((s) => {
      if (s.id === saleId) {
        return {
          ...s,
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
          totalAmount: Math.max(0, s.totalAmount - refundTotal),
          realizedProfit: Math.max(0, s.realizedProfit - (refundMethod !== 'debt_reduce' ? profitDeduction : 0)),
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
    // 1. Filter sales in range
    const filteredSales = sales.filter((s) => isDateInRange(s.date, dateRange));

    // 2. Real Cash collected: from direct cash sales in range + debt repayments in cash in range
    let totalCashCollected = 0;
    let totalCardCollected = 0;
    let realizedProfit = 0;

    filteredSales.forEach((s) => {
      totalCashCollected += Number(s.paidCash || 0);
      totalCardCollected += Number(s.paidCard || 0);
      realizedProfit += Number(s.realizedProfit || 0);
    });

    // Also include debtor debt payments made during this date range
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

    // 3. Tashqaridagi Jami Qarzlar (all currently active customer debts)
    let totalActiveDebts = 0;
    debtors.forEach((d) => {
      const totalTaken = (d.transactions || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalPaid = (d.payments || []).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);
      const remaining = totalTaken - totalPaid;
      if (remaining > 0) {
        totalActiveDebts += remaining;
      }
    });

    // 4. Ombordagi Qoldiq Qiymati (Total Cost Value & Total Retail Value of current stock)
    let stockCostValue = 0;
    let stockRetailValue = 0;
    products.forEach((p) => {
      const qty = Number(p.quantity || 0);
      stockCostValue += Number(p.costPrice || 0) * qty;
      stockRetailValue += Number(p.sellPrice || 0) * qty;
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
    };
  };

  // ==========================================
  // RESET ALL DATA TO ZERO (EMPTY STORE)
  // ==========================================
  const resetAllData = async () => {
    // 1. Reset React state to empty arrays
    setProducts([]);
    setDebtors([]);
    setSales([]);

    // 2. Clear stored collections and mark initialized=true so seed data is NEVER re-created
    storage.set('initialized', true);
    storage.set('products', []);
    storage.set('debtors', []);
    storage.set('sales', []);

    // 3. Delete all records from Supabase cloud tables
    if (isSupabaseConnected()) {
      await clearCloudTables();
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
        getReportData,
        resetAllData,
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
