'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { adminFetch, readApiPayload } from './adminApi';
import type { AdminStats, AdminUser } from './types';

type AdminUsersContextValue = {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const AdminUsersContext = createContext<AdminUsersContextValue | null>(null);

export function AdminUsersProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch('/api/admin/stats?phase=2');
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'Error al cargar usuarios'));
      setUsers((payload as unknown as AdminStats).users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void adminFetch('/api/admin/stats?phase=2')
      .then(async (response) => {
        const payload = await readApiPayload(response);
        if (!response.ok) throw new Error(String(payload.error || 'Error al cargar usuarios'));
        if (active) setUsers((payload as unknown as AdminStats).users ?? []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Error al cargar usuarios');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <AdminUsersContext value={{ users, loading, error, refresh }}>
      {children}
    </AdminUsersContext>
  );
}

export function useAdminUsers() {
  const context = useContext(AdminUsersContext);
  if (!context) throw new Error('useAdminUsers debe usarse dentro de AdminUsersProvider');
  return context;
}
