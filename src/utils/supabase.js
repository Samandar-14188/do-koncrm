import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

let supabaseClient = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) return null;
  try {
    supabaseClient = createClient(url, anonKey);
    return supabaseClient;
  } catch (e) {
    console.error('Supabase init error:', e);
    return null;
  }
}

export function getSupabase() {
  return supabaseClient;
}

export function isSupabaseConnected() {
  return !!supabaseClient;
}

// Get current Supabase credentials: localStorage first, then fallback to .env VITE_ variables
export function getSupabaseConfig() {
  const config = storage.get('supabase_config');
  return {
    url: config?.url || import.meta.env?.VITE_SUPABASE_URL || '',
    key: config?.key || import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
  };
}

// Load Supabase config from localStorage or default to .env
export function autoInitSupabase() {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    return initSupabase(url, key);
  }
  return null;
}

// Sync records to cloud (upsert)
export async function syncToCloud(tableName, records) {
  if (!supabaseClient) return { data: null, error: 'Not connected' };
  try {
    const rows = records.map(r => ({
      id: r.id,
      data: r,
      updated_at: new Date().toISOString(),
    }));
    const { data, error } = await supabaseClient
      .from(tableName)
      .upsert(rows, { onConflict: 'id' });
    
    // For suppliers, also backup to settings table for seamless fallback
    if (tableName === 'suppliers') {
      try {
        await supabaseClient.from('settings').upsert([{
          id: 'store_suppliers',
          data: records,
          updated_at: new Date().toISOString()
        }], { onConflict: 'id' });
      } catch (_) {}
    }

    if (error && tableName !== 'suppliers') {
      console.error(`Sync to ${tableName} error:`, error);
    }
    return { data, error };
  } catch (e) {
    console.error('syncToCloud error:', e);
    return { data: null, error: e.message };
  }
}

// Fetch all records from cloud
export async function syncFromCloud(tableName) {
  if (!supabaseClient) return [];
  try {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .order('updated_at', { ascending: false });
    
    // Fallback for suppliers if table not created yet in schema cache
    if (tableName === 'suppliers' && (error || !data || data.length === 0)) {
      try {
        const res = await supabaseClient
          .from('settings')
          .select('*')
          .eq('id', 'store_suppliers')
          .maybeSingle();
        if (res.data && Array.isArray(res.data.data)) {
          return res.data.data;
        }
      } catch (_) {}
    }

    if (error) {
      if (tableName !== 'suppliers') {
        console.error(`Sync from ${tableName} error:`, error);
      }
      return [];
    }
    return (data || []).map(r => r.data);
  } catch (e) {
    console.error('syncFromCloud error:', e);
    return [];
  }
}

// Save passwords to cloud settings table
export async function saveCloudPasswords(passwords) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { error: 'Not connected' };
  try {
    const payload = {
      admin: passwords.admin,
      seller: passwords.seller,
      adminPassword: passwords.admin,
      sellerPassword: passwords.seller,
      updatedAt: new Date().toISOString()
    };
    const row = {
      id: 'auth_passwords',
      data: payload,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await supabaseClient
      .from('settings')
      .upsert([row], { onConflict: 'id' });
    if (error) console.error('saveCloudPasswords error:', error);
    return { data, error };
  } catch (e) {
    console.error('saveCloudPasswords error:', e);
    return { error: e.message };
  }
}

// Fetch passwords from cloud settings table
export async function fetchCloudPasswords() {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('*')
      .eq('id', 'auth_passwords')
      .maybeSingle();
    if (error) {
      console.warn('fetchCloudPasswords error:', error);
      return null;
    }
    if (data && data.data) {
      const p = data.data;
      return {
        admin: p.admin || p.adminPassword || 'admin123',
        seller: p.seller || p.sellerPassword || 'sotuvchi123'
      };
    }
    return null;
  } catch (e) {
    console.warn('fetchCloudPasswords error:', e);
    return null;
  }
}

// Delete all records from cloud tables (Empty Store wipe - preserves auth_passwords)
export async function clearCloudTables() {
  if (!supabaseClient) return { success: false, error: 'Not connected' };
  try {
    await Promise.allSettled([
      supabaseClient.from('products').delete().neq('id', ''),
      supabaseClient.from('debtors').delete().neq('id', ''),
      supabaseClient.from('sales').delete().neq('id', ''),
      supabaseClient.from('suppliers').delete().neq('id', ''),
      supabaseClient.from('settings').delete().neq('id', 'auth_passwords'),
    ]);
    return { success: true };
  } catch (err) {
    console.error('clearCloudTables error:', err);
    return { success: false, error: err.message };
  }
}

// Subscribe to real-time changes
export function subscribeToChanges(tableName, callback) {
  if (!supabaseClient) return null;
  try {
    return supabaseClient
      .channel(`${tableName}-changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        payload => { callback(payload); }
      )
      .subscribe();
  } catch (e) {
    console.error('Subscribe error:', e);
    return null;
  }
}

// Remove subscription
export function unsubscribeChannel(channel) {
  if (channel && supabaseClient) {
    supabaseClient.removeChannel(channel);
  }
}
