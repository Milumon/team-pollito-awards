'use client';

import { useEffect, useState } from 'react';

import { adminFetch, readApiPayload } from './adminApi';

type MinecraftRequest = {
  id: string;
  user_id: string;
  edition: 'java' | 'bedrock';
  username: string;
  player_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  rejection_reason: string | null;
  verified_at: string | null;
};

function requestStatus(request: MinecraftRequest) {
  if (request.status === 'pending' && request.verified_at) return 'Identidad verificada · acceso automático';
  if (request.status === 'pending') return 'Pendiente de verificación dentro del servidor';
  if (request.status === 'approved') return 'Aprobada · acceso activo';
  if (request.status === 'rejected') return 'Rechazada';
  return 'Revocada';
}

export default function MinecraftAdminView() {
  const [requests, setRequests] = useState<MinecraftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminFetch('/api/admin/minecraft/requests');
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'No se pudieron cargar las solicitudes.'));
      setRequests((payload.requests as MinecraftRequest[]) ?? []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const update = async (accountId: string, action: 'approve' | 'reject' | 'revoke') => {
    const reason = action === 'reject' ? window.prompt('Motivo del rechazo')?.trim() : undefined;
    if (action === 'reject' && !reason) return;
    const response = await adminFetch('/api/admin/minecraft/requests', { method: 'POST', body: JSON.stringify({ accountId, action, reason }) });
    const payload = await readApiPayload(response);
    if (!response.ok) {
      setError(String(payload.error || 'No se pudo actualizar la solicitud.'));
      return;
    }
    await load();
  };

  return (
    <div className="space-y-6">
       <div><p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">Servidor</p><h1 className="mt-1 font-display text-2xl font-bold text-white">Vinculaciones de Minecraft</h1><p className="mt-2 text-xs font-semibold text-gray-400">La verificación y el acceso se activan automáticamente. Aquí puedes revisar o revocar cuentas.</p></div>
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-bold text-red-400">{error}</p>}
       {loading ? <p className="text-sm text-gray-500">Cargando...</p> : <div className="space-y-3">{requests.map((request) => <article key={request.id} className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-display text-lg font-bold text-white">{request.username} <span className="text-xs uppercase text-gray-500">{request.edition}</span></p><p className="mt-1 font-mono text-xs text-gray-500">{request.player_id}</p><p className={`mt-2 text-xs font-bold ${request.verified_at ? 'text-emerald-300' : 'text-amber-300'}`}>{requestStatus(request)}</p></div><div className="flex gap-2">{request.status === 'pending' && <button onClick={() => void update(request.id, 'reject')} className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-200">Rechazar</button>}{request.status === 'approved' && <button onClick={() => void update(request.id, 'revoke')} className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-bold text-red-200">Revocar</button>}</div></div></article>)}</div>}
      {!loading && requests.length === 0 && <p className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 text-sm text-gray-500">No hay solicitudes de Minecraft.</p>}
    </div>
  );
}
