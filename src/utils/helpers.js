// Format number with spaces: 1250000 → "1 250 000"
export function formatMoney(amount) {
  if (amount == null || isNaN(amount)) return '0';
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Format with "so'm" suffix
export function formatUZS(amount) {
  return formatMoney(amount) + " so'm";
}

// Format with "$" prefix
export function formatUSD(amount) {
  if (amount == null) return '$0';
  const cleanStr = typeof amount === 'string' ? amount.replace(/\$/g, '').trim() : amount;
  const num = Number(cleanStr);
  if (isNaN(num)) return '$0';
  const isNeg = num < 0;
  const absNum = Math.abs(num);
  const formatted = absNum % 1 === 0
    ? formatMoney(absNum)
    : absNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (isNeg ? '-$' : '$') + formatted;
}

// Generate UUID
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Get today's date as ISO string
export function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Check if date is within range
export function isDateInRange(dateStr, range) {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return date >= today;
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return date >= yesterday && date < today;
    }
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return date >= monthAgo;
    }
    case 'all':
    default:
      return true;
  }
}

// Calculate proportional profit for partial payment
export function calcRealizedProfit(totalProfit, totalAmount, paidAmount) {
  if (totalAmount === 0) return 0;
  return (paidAmount / totalAmount) * totalProfit;
}

// Format phone number
export function formatPhone(phone) {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 12) {
    return `+${clean.slice(0, 3)} (${clean.slice(3, 5)}) ${clean.slice(5, 8)}-${clean.slice(8, 10)}-${clean.slice(10)}`;
  }
  if (clean.length === 9) {
    return `+998 (${clean.slice(0, 2)}) ${clean.slice(2, 5)}-${clean.slice(5, 7)}-${clean.slice(7)}`;
  }
  return phone;
}

// Format date to readable: "15.11.2026 14:30"
export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || '';
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Short date format: "15.11.2026"
export function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr || '';
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

// Truncate string
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}
