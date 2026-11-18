import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

let supabaseClient = null;
let realtimeChannel = null;

export function initSupabase(url, anonKey) {
  if (!url || !anonKey) return null;
  try {
    if (supabaseClient) {
      return supabaseClient;
    }
    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseClient;
  } catch (e) {
    console.error('Supabase init error:', e);
    return null;
  }
}

export function getSupabase() {
  if (!supabaseClient) autoInitSupabase();
  return supabaseClient;
}

export function isSupabaseConnected() {
  if (!supabaseClient) autoInitSupabase();
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
  if (supabaseClient) return supabaseClient;
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    return initSupabase(url, key);
  }
  return null;
}

// -------------------------------------------------------------
// Fetch a table directly from Supabase (Returns success flag)
// -------------------------------------------------------------
export async function fetchTableFromCloud(tableName) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { success: false, data: [], error: 'Not connected' };

  try {
    const { data, error } = await supabaseClient
      .from(tableName)
      .select('*')
      .order('updated_at', { ascending: false });

    // Fallback for suppliers if table has an issue in schema cache
    if (tableName === 'suppliers' && (error || !data)) {
      try {
        const res = await supabaseClient
          .from('settings')
          .select('*')
          .eq('id', 'store_suppliers')
          .maybeSingle();
        if (res.data && Array.isArray(res.data.data)) {
          return { success: true, data: res.data.data, error: null };
        }
      } catch (_) {}
    }

    if (error) {
      console.warn(`Fetch ${tableName} error:`, error.message);
      return { success: false, data: [], error: error.message };
    }

    const records = (data || []).map((r) => r.data).filter(Boolean);
    return { success: true, data: records, error: null };
  } catch (e) {
    console.warn(`Fetch ${tableName} exception:`, e.message);
    return { success: false, data: [], error: e.message };
  }
}

// Backward-compatible syncFromCloud helper
export async function syncFromCloud(tableName) {
  const res = await fetchTableFromCloud(tableName);
  return res.success ? res.data : [];
}

// -------------------------------------------------------------
// Save / Upsert a single record to cloud table
// -------------------------------------------------------------
export async function saveRecordToCloud(tableName, record) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient || !record || !record.id) return { error: 'Not connected' };

  try {
    const row = {
      id: record.id,
      data: record,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseClient
      .from(tableName)
      .upsert([row], { onConflict: 'id' });

    if (error) console.error(`saveRecordToCloud ${tableName} error:`, error);
    return { data, error };
  } catch (e) {
    console.error(`saveRecordToCloud ${tableName} error:`, e);
    return { error: e.message };
  }
}

// -------------------------------------------------------------
// Delete a single record from cloud table
// -------------------------------------------------------------
export async function deleteRecordFromCloud(tableName, recordId) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient || !recordId) return { error: 'Not connected' };

  try {
    const { data, error } = await supabaseClient
      .from(tableName)
      .delete()
      .eq('id', recordId);

    if (error) console.error(`deleteRecordFromCloud ${tableName} error:`, error);
    return { data, error };
  } catch (e) {
    console.error(`deleteRecordFromCloud ${tableName} error:`, e);
    return { error: e.message };
  }
}

// -------------------------------------------------------------
// Sync multiple records to cloud (batch upsert)
// -------------------------------------------------------------
export async function syncToCloud(tableName, records) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { data: null, error: 'Not connected' };

  try {
    if (!Array.isArray(records) || records.length === 0) {
      return { data: [], error: null };
    }

    const rows = records.map((r) => ({
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
        await supabaseClient.from('settings').upsert([
          {
            id: 'store_suppliers',
            data: records,
            updated_at: new Date().toISOString(),
          },
        ], { onConflict: 'id' });
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

// -------------------------------------------------------------
// Passwords
// -------------------------------------------------------------
export async function saveCloudPasswords(passwords) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { error: 'Not connected' };
  try {
    const payload = {
      admin: passwords.admin,
      seller: passwords.seller,
      adminPassword: passwords.admin,
      sellerPassword: passwords.seller,
      updatedAt: new Date().toISOString(),
    };
    const row = {
      id: 'auth_passwords',
      data: payload,
      updated_at: new Date().toISOString(),
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
        seller: p.seller || p.sellerPassword || 'sotuvchi123',
      };
    }
    return null;
  } catch (e) {
    console.warn('fetchCloudPasswords error:', e);
    return null;
  }
}

// -------------------------------------------------------------
// Exchange Rate
// -------------------------------------------------------------
export async function saveCloudExchangeRate(rate) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { error: 'Not connected' };
  try {
    const row = {
      id: 'exchange_rate',
      data: { rate: Number(rate) || 12800, updatedAt: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseClient
      .from('settings')
      .upsert([row], { onConflict: 'id' });
    if (error) console.error('saveCloudExchangeRate error:', error);
    return { data, error };
  } catch (e) {
    console.error('saveCloudExchangeRate error:', e);
    return { error: e.message };
  }
}

export async function fetchCloudExchangeRate() {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('settings')
      .select('*')
      .eq('id', 'exchange_rate')
      .maybeSingle();
    if (data && data.data && data.data.rate) {
      return Number(data.data.rate);
    }
    return null;
  } catch (e) {
    console.warn('fetchCloudExchangeRate error:', e);
    return null;
  }
}

// -------------------------------------------------------------
// Clear Cloud Tables (Wipe Store)
// -------------------------------------------------------------
export async function clearCloudTables() {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { success: false, error: 'Not connected' };
  try {
    await Promise.allSettled([
      supabaseClient.from('products').delete().neq('id', ''),
      supabaseClient.from('debtors').delete().neq('id', ''),
      supabaseClient.from('sales').delete().neq('id', ''),
      supabaseClient.from('suppliers').delete().neq('id', ''),
      supabaseClient.from('settings').delete().not('id', 'in', '("auth_passwords","exchange_rate")'),
    ]);
    return { success: true };
  } catch (err) {
    console.error('clearCloudTables error:', err);
    return { success: false, error: err.message };
  }
}

// -------------------------------------------------------------
// Realtime Broadcast across devices (PC <-> Phone <-> Tablet)
// -------------------------------------------------------------
export function broadcastDbChange(actionData) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return;

  try {
    if (!realtimeChannel) {
      realtimeChannel = supabaseClient.channel('dokon-realtime-sync', {
        config: { broadcast: { self: false } },
      });
      realtimeChannel.subscribe();
    }

    realtimeChannel.send({
      type: 'broadcast',
      event: 'db_change',
      payload: {
        ...actionData,
        senderId: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
      },
    });
  } catch (e) {
    console.warn('broadcastDbChange error:', e);
  }
}

// -------------------------------------------------------------
// Initialize Multi-Device Realtime Sync Listener
// -------------------------------------------------------------
export function initRealtimeSync(onEvent) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return () => {};

  try {
    if (realtimeChannel) {
      try {
        supabaseClient.removeChannel(realtimeChannel);
      } catch (_) {}
    }

    const channel = supabaseClient.channel('dokon-realtime-sync', {
      config: { broadcast: { self: false } },
    });

    // 1. Broadcast Listener (instant <50ms sync between PC and phone)
    channel.on('broadcast', { event: 'db_change' }, (msg) => {
      if (onEvent && msg && msg.payload) {
        onEvent(msg.payload);
      }
    });

    // 2. Postgres Changes Listeners (direct database row change events)
    const tables = ['products', 'debtors', 'sales', 'suppliers', 'settings'];
    tables.forEach((t) => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, (payload) => {
        if (onEvent) {
          onEvent({
            source: 'postgres_changes',
            table: t,
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old,
          });
        }
      });
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        realtimeChannel = channel;
      }
    });

    return () => {
      try {
        supabaseClient.removeChannel(channel);
        if (realtimeChannel === channel) realtimeChannel = null;
      } catch (_) {}
    };
  } catch (e) {
    console.error('initRealtimeSync error:', e);
    return () => {};
  }
}

// Backward-compatible individual subscribe
export function subscribeToChanges(tableName, callback) {
  if (!supabaseClient) autoInitSupabase();
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

export function unsubscribeChannel(channel) {
  if (channel && supabaseClient) {
    supabaseClient.removeChannel(channel);
  }
}
