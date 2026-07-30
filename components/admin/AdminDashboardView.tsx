'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { adminFetch, readApiPayload } from './adminApi';
import type { AdminDashboard } from './types';

const panelClassName = 'rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]';
const rowClassName = 'rounded-xl border border-neutral-700/40 bg-[#35373d]';
const focusClassName = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC200] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f22]';

export function AdminDashboardView() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminFetch('/api/admin/dashboard');
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'Error al cargar el Panel de Control'));
      setDashboard(payload as unknown as AdminDashboard);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error al cargar el Panel de Control');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void adminFetch('/api/admin/dashboard')
      .then(async (response) => {
        const payload = await readApiPayload(response);
        if (!response.ok) throw new Error(String(payload.error || 'Error al cargar el Panel de Control'));
        if (active) setDashboard(payload as unknown as AdminDashboard);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Error al cargar el Panel de Control');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const summary = dashboard?.summary;
  const metrics = [
    ['Usuarios totales', summary?.totalUsers ?? 0, '👥'],
    ['Miembros Oficiales aprobados', summary?.approvedUsers ?? 0, '✅'],
    ['Nuevos esta semana', summary?.newUsers ?? 0, '🌱'],
    ['Interacciones esta semana', summary?.interactions ?? 0, '⚡'],
    ['Postulaciones pendientes', summary?.pendingApplications ?? 0, '📝'],
    ['Envíos pendientes', summary?.pendingUploads ?? 0, '📦'],
  ] as const;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Centro de control</span>
          <h1 className="mt-1 font-display text-2xl font-bold text-white">Panel de Control</h1>
          <p className="mt-2 text-xs font-semibold text-gray-400">Actividad real de la comunidad y de la transmisión.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          className={`cursor-pointer rounded-xl border border-neutral-700/60 bg-[#2b2d31] px-3 py-2 text-xs font-bold text-gray-300 hover:text-white transition-colors disabled:opacity-50 ${focusClassName}`}
        >
          <RefreshCw className={`mr-1.5 inline h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-400">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value, icon]) => (
          <article key={label} className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-4 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
            <span className="text-lg" aria-hidden>{icon}</span>
            <p className="mt-3 text-[10px] font-semibold leading-tight text-gray-500">{label}</p>
            <p className="mt-1 font-mono text-2xl font-black text-white">{loading ? '—' : value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panelClassName}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Últimos accesos</h2>
          <div className="space-y-2">
            {(dashboard?.recentAccesses ?? []).map((access) => (
              <div key={access.userId} className={`flex items-center gap-3 p-3 ${rowClassName}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2b2d31]">🐣</span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-white">{access.name}</p>
                  <p className="truncate text-[9px] text-gray-500">{access.email}</p>
                </div>
              </div>
            ))}
            {!loading && (dashboard?.recentAccesses.length ?? 0) === 0 && <p className="py-5 text-center text-xs text-gray-500">No hay accesos registrados.</p>}
          </div>
        </section>
        <section className={panelClassName}>
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Miembros más activos</h2>
          <div className="space-y-2">
            {(dashboard?.topUsers ?? []).map((user, index) => (
              <div key={user.userId} className={`flex items-center gap-3 px-3 py-2 ${rowClassName}`}>
                <span className="w-5 text-center text-sm font-black">{index === 0 ? '👑' : `${index + 1}.`}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-white">@{user.name}</span>
                <span className="font-mono text-[10px] font-bold text-[#FFC200]">{user.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={panelClassName}>
          <h2 className="mb-4 font-display text-base font-semibold text-white">Sonidos más utilizados</h2>
          <div className="space-y-2">
            {(dashboard?.topSounds ?? []).map((sound, index) => (
              <div key={sound.soundId} className={`flex items-center gap-2 px-3 py-2 ${rowClassName}`}>
                <span className="w-4 text-xs font-black text-gray-500">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">{sound.name}</span>
                <span className="font-mono text-[10px] text-[#FFC200]">{sound.count} veces</span>
              </div>
            ))}
            {!loading && (dashboard?.topSounds.length ?? 0) === 0 && <p className="py-4 text-center text-xs text-gray-500">No hay sonidos utilizados esta semana.</p>}
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className="mb-4 font-display text-base font-semibold text-white">Miembros con más envíos</h2>
          <div className="space-y-2">
            {(dashboard?.topUploads ?? []).map((user, index) => (
              <div key={user.userId} className={`flex items-center gap-2 px-3 py-2 ${rowClassName}`}>
                <span className="w-4 text-xs font-black text-gray-500">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white">@{user.name}</span>
                <span className="font-mono text-[10px] text-[#FFC200]">{user.count}</span>
              </div>
            ))}
            {!loading && (dashboard?.topUploads.length ?? 0) === 0 && <p className="py-4 text-center text-xs text-gray-500">No hay envíos registrados.</p>}
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className="mb-4 font-display text-base font-semibold text-white">Acciones pendientes</h2>
          <div className="space-y-2">
            <Link href="/admin/operaciones?seccion=postulaciones" className={`flex items-center justify-between px-3 py-3 text-xs font-semibold text-gray-200 hover:border-[#FFC200]/50 transition-colors ${rowClassName} ${focusClassName}`}>
              <span>Postulaciones por revisar</span>
              <span className="font-mono font-black text-[#FFC200]">{summary?.pendingApplications ?? 0}</span>
            </Link>
            <Link href="/admin/operaciones?seccion=multimedia" className={`flex items-center justify-between px-3 py-3 text-xs font-semibold text-gray-200 hover:border-[#FFC200]/50 transition-colors ${rowClassName} ${focusClassName}`}>
              <span>Envíos por moderar</span>
              <span className="font-mono font-black text-[#FFC200]">{summary?.pendingUploads ?? 0}</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
