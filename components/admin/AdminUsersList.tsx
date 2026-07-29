'use client';

import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useDeferredValue, useMemo, useState } from 'react';

import { adminFetch, readApiPayload } from './adminApi';
import { useAdminUsers } from './AdminUsersProvider';
import { getAdminUserStatusLabel } from './types';

const USERS_PER_PAGE = 12;
const focusClassName = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1f22]';

export function AdminUsersList() {
  const { users, loading, error, refresh } = useAdminUsers();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.get('busqueda') || '';
  const deferredSearch = useDeferredValue(search);
  const requestedPage = Number(searchParams.get('pagina'));
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) return users;
    return users.filter((user) =>
      [user.email, user.robloxUser ?? '', user.robloxDisplayName ?? '', user.id]
        .some((value) => value.toLowerCase().includes(needle)),
    );
  }, [deferredSearch, users]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1;
  const visibleUsers = filteredUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);

  const navigateToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage > 1) params.set('pagina', String(nextPage));
    else params.delete('pagina');
    const query = params.toString();
    const destination = query ? `${pathname}?${query}` : pathname;
    window.history.pushState(null, '', destination);
  };

  const runAction = async (userId: string, path: string, body: Record<string, unknown>) => {
    setUpdatingId(userId);
    setActionError(null);
    try {
      const response = await adminFetch(path, { method: 'POST', body: JSON.stringify(body) });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'No se pudo actualizar el usuario'));
      await refresh();
    } catch (updateError) {
      setActionError(updateError instanceof Error ? updateError.message : 'No se pudo actualizar el usuario');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="space-y-5 rounded-2xl border-3 border-black bg-[#2b2d31] p-5 shadow-[4px_4px_0_0_#FFD500] animate-fade-in">
      <div className="flex flex-col gap-4 border-b-3 border-black pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Padrón electoral</span>
          <h1 className="mt-0.5 font-display text-lg font-semibold leading-none text-white">Usuarios de la Comunidad</h1>
          <p className="mt-1 text-xs font-semibold text-gray-400">Administra accesos y perfiles de Miembros Oficiales.</p>
        </div>
        <form action={pathname} className="relative w-full shrink-0 sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            defaultValue={search}
            name="busqueda"
            aria-label="Buscar usuarios"
            placeholder="Buscar por usuario, email o id..."
            className={`w-full rounded-xl border-3 border-black bg-[#202226] py-2 pl-9 pr-3 text-xs text-white shadow-[3px_3px_0_0_#FFD500] outline-none focus:border-black ${focusClassName}`}
          />
        </form>
      </div>

      {(error || actionError) && <p className="rounded-xl border-3 border-black bg-red-950/40 p-3 text-xs font-bold text-red-300 shadow-[3px_3px_0_0_#FFD500]">{error || actionError}</p>}

      {loading ? (
        <p className="py-16 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Cargando usuarios...</p>
      ) : visibleUsers.length === 0 ? (
        <p className="py-16 text-center text-sm font-bold text-white">Sin usuarios encontrados</p>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border-3 border-black shadow-[3px_3px_0_0_#FFD500]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b-3 border-black font-semibold uppercase tracking-wider text-gray-300">
                  <th className="px-2 py-3">Usuario Roblox</th>
                  <th className="px-2 py-3">Detalles</th>
                  <th className="px-2 py-3">Estado</th>
                  <th className="px-2 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-[3px] divide-black">
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[.02]">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border-3 border-black bg-[#202226] shadow-[2px_2px_0_0_#FFD500]">🐣</span>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-white">{user.robloxDisplayName || 'Usuario'}</p>
                          <p className="truncate text-[10px] text-gray-500">@{user.robloxUser || 'no-vinculado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 font-medium text-gray-400">
                      <p className="max-w-48 truncate">{user.email}</p>
                      {user.tiktokUser && <p className="text-[10px] text-gray-500">TikTok: @{user.tiktokUser}</p>}
                    </td>
                    <td className="px-2 py-3">
                      <span className="rounded-xl border-3 border-black bg-white/5 px-2 py-1 text-[9px] font-semibold text-gray-200 shadow-[2px_2px_0_0_#FFD500]">
                        {getAdminUserStatusLabel(user.linkStatus)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/admin/usuarios/${encodeURIComponent(user.id)}`}
                          aria-label={`Editar ${user.robloxDisplayName || user.robloxUser || user.email}`}
                          className={`rounded-xl border-3 border-black bg-[#FFD500] px-2.5 py-1.5 font-display font-medium text-black shadow-[3px_3px_0_0_#FFD500] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#FFD500] ${focusClassName}`}
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          disabled={updatingId === user.id}
                          onClick={() => void runAction(user.id, '/api/admin/roles', { userId: user.id, isAdmin: !user.isAdmin })}
                          className={`cursor-pointer rounded-xl border-3 border-black bg-[#202226] px-2.5 py-1.5 font-display font-medium text-white shadow-[3px_3px_0_0_#FFD500] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#FFD500] disabled:opacity-50 ${focusClassName}`}
                        >
                          {user.isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
                        </button>
                        <button
                          type="button"
                          disabled={updatingId === user.id}
                          onClick={() => void runAction(user.id, '/api/admin/users/soundboard-toggle', { userId: user.id, disabled: !user.soundboardDisabled })}
                          className={`cursor-pointer rounded-xl border-3 border-black bg-[#202226] px-2.5 py-1.5 font-display font-medium text-gray-200 shadow-[3px_3px_0_0_#FFD500] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#FFD500] disabled:opacity-50 ${focusClassName}`}
                        >
                          {user.soundboardDisabled ? 'Habilitar' : 'Bloquear'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t-3 border-black pt-4 text-xs font-semibold">
              <span className="text-gray-400">{filteredUsers.length} usuarios</span>
              <div className="inline-flex items-center gap-2 rounded-xl border-3 border-black bg-[#202226] p-1 shadow-[3px_3px_0_0_#FFD500]">
                <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => navigateToPage(page - 1)} className={`rounded-lg border-3 border-black bg-[#2b2d31] p-1.5 disabled:opacity-30 ${focusClassName}`}><ChevronLeft className="h-4 w-4" /></button>
                <span className="px-2 font-mono text-[10px] font-bold">PÁG. {page} / {totalPages}</span>
                <button type="button" aria-label="Página siguiente" disabled={page === totalPages} onClick={() => navigateToPage(page + 1)} className={`rounded-lg border-3 border-black bg-[#2b2d31] p-1.5 disabled:opacity-30 ${focusClassName}`}><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
