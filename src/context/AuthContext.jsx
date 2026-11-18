import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { saveCloudPasswords, fetchCloudPasswords, autoInitSupabase, broadcastDbChange } from '../utils/supabase';

const AuthContext = createContext();

const DEFAULT_PASSWORDS = {
  admin: 'admin123',
  seller: 'sotuvchi123',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = storage.get('auth');
    return saved || null; // { role: 'admin'|'seller', loggedIn: true }
  });

  const [passwords, setPasswords] = useState(() => {
    return storage.get('passwords', DEFAULT_PASSWORDS);
  });

  // Sync cloud passwords
  const syncPasswordsFromCloud = useCallback(async () => {
    try {
      const cloud = await fetchCloudPasswords();
      if (cloud) {
        const merged = {
          admin: cloud.admin || DEFAULT_PASSWORDS.admin,
          seller: cloud.seller || DEFAULT_PASSWORDS.seller,
        };
        setPasswords(merged);
        storage.set('passwords', merged);
      }
    } catch (e) {
      console.warn('Could not sync cloud passwords:', e);
    }
  }, []);

  // On mount and visibility/focus change, sync cloud passwords
  useEffect(() => {
    autoInitSupabase();
    syncPasswordsFromCloud();

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        syncPasswordsFromCloud();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [syncPasswordsFromCloud]);

  // Update passwords (both admin and seller or either)
  const updatePasswords = useCallback(async ({ admin, seller }) => {
    const current = storage.get('passwords', passwords || DEFAULT_PASSWORDS);
    const updated = {
      admin: admin && admin.trim() ? admin.trim() : (current.admin || DEFAULT_PASSWORDS.admin),
      seller: seller && seller.trim() ? seller.trim() : (current.seller || DEFAULT_PASSWORDS.seller),
    };

    // 1. Update in-memory state
    setPasswords(updated);

    // 2. Persist to localStorage immediately
    storage.set('passwords', updated);

    // 3. Persist to Supabase cloud settings table and broadcast to other devices
    try {
      await saveCloudPasswords(updated);
      broadcastDbChange({ table: 'settings', action: 'auth_passwords', passwords: updated });
    } catch (e) {
      console.error('Failed to sync passwords to Supabase:', e);
    }

    return { success: true, passwords: updated };
  }, [passwords]);

  // Backward-compatible changePassword helper
  const changePassword = useCallback(async (role, newPassword) => {
    if (role === 'admin') {
      return await updatePasswords({ admin: newPassword });
    } else if (role === 'seller') {
      return await updatePasswords({ seller: newPassword });
    }
  }, [updatePasswords]);

  // Login handler
  const login = useCallback(async (inputPassword) => {
    const cleanPass = (inputPassword || '').trim();
    if (!cleanPass) return { success: false };

    // 1. Check local state & localStorage first
    const local = storage.get('passwords', passwords || DEFAULT_PASSWORDS);
    const adminPass = local.admin || passwords.admin || DEFAULT_PASSWORDS.admin;
    const sellerPass = local.seller || passwords.seller || DEFAULT_PASSWORDS.seller;

    if (cleanPass === adminPass) {
      const u = { role: 'admin', loggedIn: true };
      setUser(u);
      storage.set('auth', u);
      return { success: true, role: 'admin' };
    }

    if (cleanPass === sellerPass) {
      const u = { role: 'seller', loggedIn: true };
      setUser(u);
      storage.set('auth', u);
      return { success: true, role: 'seller' };
    }

    // 2. If not matched locally, do a cloud check in case passwords changed from another device
    try {
      const cloud = await fetchCloudPasswords();
      if (cloud) {
        const cloudAdmin = cloud.admin || cloud.adminPassword;
        const cloudSeller = cloud.seller || cloud.sellerPassword;

        // Update local if cloud has passwords
        const synced = {
          admin: cloudAdmin || adminPass,
          seller: cloudSeller || sellerPass,
        };
        setPasswords(synced);
        storage.set('passwords', synced);

        if (cleanPass === cloudAdmin) {
          const u = { role: 'admin', loggedIn: true };
          setUser(u);
          storage.set('auth', u);
          return { success: true, role: 'admin' };
        }

        if (cleanPass === cloudSeller) {
          const u = { role: 'seller', loggedIn: true };
          setUser(u);
          storage.set('auth', u);
          return { success: true, role: 'seller' };
        }
      }
    } catch (err) {
      console.warn('Cloud password check error:', err);
    }

    return { success: false };
  }, [passwords]);

  const logout = useCallback(() => {
    setUser(null);
    storage.remove('auth');
  }, []);

  const isAdmin = user?.role === 'admin';
  const isSeller = user?.role === 'seller';

  return (
    <AuthContext.Provider
      value={{
        user,
        passwords,
        login,
        logout,
        changePassword,
        updatePasswords,
        isAdmin,
        isSeller,
        role: user?.role,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
