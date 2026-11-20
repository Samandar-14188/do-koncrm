import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

// Direct production credentials fallback: Guarantees connection on Vercel even if .env is missing
export const DEFAULT_SUPABASE_URL = 'https://onfetmohvsootnglvtro.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_8etDnrIl9owmyMKMXjkWvQ_zNjOhXIE';

let supabaseClient = null;
let realtimeChannel = null;

export function initSupabase(url, anonKey) {
  const targetUrl = url || DEFAULT_SUPABASE_URL;
  const targetKey = anonKey || DEFAULT_SUPABASE_ANON_KEY;

  try {
    if (supabaseClient) {
      return supabaseClient;
    }
    supabaseClient = createClient(targetUrl, targetKey, {
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

// Get current Supabase credentials: environment variables first, then localStorage, then hardcoded production fallback
export function getSupabaseConfig() {
  const config = storage.get('supabase_config');
  const envUrl = import.meta.env?.VITE_SUPABASE_URL;
  const envKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

  return {
    url: (envUrl && envUrl.trim()) || config?.url || DEFAULT_SUPABASE_URL,
    key: (envKey && envKey.trim()) || config?.key || DEFAULT_SUPABASE_ANON_KEY,
  };
}

// Load Supabase config and initialize client immediately
export function autoInitSupabase() {
  if (supabaseClient) return supabaseClient;
  const { url, key } = getSupabaseConfig();
  return initSupabase(url, key);
}

// Auto-run on module load to guarantee instant connection
autoInitSupabase();

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
  if (!supabaseClient || !record || record.id === undefined) return { error: 'Not connected' };

  try {
    const row = {
      id: String(record.id),
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
  if (!supabaseClient || recordId === undefined || recordId === null) return { success: false, error: 'Not connected' };

  try {
    const strId = String(recordId).trim();
    const { data, error, count } = await supabaseClient
      .from(tableName)
      .delete({ count: 'exact' })
      .eq('id', strId);

    if (error) {
      console.error(`deleteRecordFromCloud ${tableName} error:`, error);
      return { success: false, error: error.message };
    }

    return { success: true, count, data };
  } catch (e) {
    console.error(`deleteRecordFromCloud ${tableName} error:`, e);
    return { success: false, error: e.message };
  }
}

// -------------------------------------------------------------
// Sync multiple records to cloud (batch upsert - ONLY for backup restore)
// -------------------------------------------------------------
export async function syncToCloud(tableName, records) {
  if (!supabaseClient) autoInitSupabase();
  if (!supabaseClient) return { data: null, error: 'Not connected' };

  try {
    if (!Array.isArray(records) || records.length === 0) {
      return { data: [], error: null };
    }

    const rows = records.map((r) => ({
      id: String(r.id),
      data: r,
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabaseClient
      .from(tableName)
      .upsert(rows, { onConflict: 'id' });

    if (error) {
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

// Unique session identifier to prevent self-echo and delete-resurrect race conditions
export const CLIENT_SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : Math.random().toString(36).substring(2, 9);

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
        senderId: CLIENT_SESSION_ID,
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
        // Skip events originated by ourselves to prevent race conditions
        if (msg.payload.senderId === CLIENT_SESSION_ID) return;
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
            action: payload.eventType === 'DELETE' ? 'delete' : (payload.eventType === 'INSERT' ? 'add' : 'update'),
            eventType: payload.eventType,
            id: payload.old?.id || payload.new?.id,
            record: payload.new?.data || payload.new,
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
