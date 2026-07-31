'use client';

import { Loader, X } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { CATEGORIES } from '@/src/data/categories';

import { adminFetch, readApiPayload } from './adminApi';
import { useAdminUsers } from './AdminUsersProvider';
import type { AdminUser } from './types';

const focusClassName = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC200] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318]';

type EditorTab = 'profile' | 'votes' | 'permissions';
type ProfileForm = {
  robloxUsername: string;
  tiktokUsername: string;
  linkStatus: AdminUser['linkStatus'];
  rejectionReason: string;
};

const permissions = [
  ['permUploadImages', 'perm_upload_images', 'Subir imágenes'],
  ['permUploadVideos', 'perm_upload_videos', 'Subir videos'],
  ['permUploadAudio', 'perm_upload_audio', 'Subir audio'],
  ['permTtsText', 'perm_tts_text', 'TTS por texto'],
  ['permTtsRecord', 'perm_tts_record', 'TTS por grabación'],
  ['permEditNickname', 'perm_edit_nickname', 'Cambiar apodo'],
  ['permTriggerSounds', 'perm_trigger_sounds', 'Activar sonidos'],
  ['permTriggerMedia', 'perm_trigger_media', 'Activar multimedia'],
  ['permTriggerAnimations', 'perm_trigger_animations', 'Activar animaciones'],
  ['permEditSounds', 'perm_edit_sounds', 'Editar sonidos'],
] as const;

function profileFormFor(user: AdminUser): ProfileForm {
  return {
    robloxUsername: user.robloxUser || '',
    tiktokUsername: user.tiktokUser || '',
    linkStatus: user.linkStatus,
    rejectionReason: user.rejectionReason || '',
  };
}

export function AdminUserEditor({ userId, onSaved }: { userId: string; onSaved?: () => void }) {
  const { users, loading, error: usersError, refresh } = useAdminUsers();
  const user = users.find((candidate) => candidate.id === userId) ?? null;

  if (loading) {
    return <p className="py-16 text-center text-xs font-bold uppercase tracking-wider text-gray-500">Cargando usuario...</p>;
  }
  if (usersError) {
    return <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{usersError}</p>;
  }
  if (!user) {
    return (
      <div className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-6 text-center">
        <h1 className="font-display text-xl font-bold text-white">Usuario no encontrado</h1>
        <Link href="/admin/usuarios" className="mt-4 inline-flex rounded-xl border border-neutral-700/60 bg-[#FFC200] px-4 py-2 text-sm font-bold text-black hover:brightness-105 transition-all">Volver a Usuarios</Link>
      </div>
    );
  }

  return <LoadedAdminUserEditor key={user.id} user={user} refresh={refresh} onSaved={onSaved} />;
}

function LoadedAdminUserEditor({
  user,
  refresh,
  onSaved,
}: {
  user: AdminUser;
  refresh: () => Promise<void>;
  onSaved?: () => void;
}) {
  const [tab, setTab] = useState<EditorTab>('profile');
  const [form, setForm] = useState<ProfileForm>(() => profileFormFor(user));
  const [permissionDraft, setPermissionDraft] = useState<AdminUser>(user);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validatedRoblox, setValidatedRoblox] = useState<string | null>(null);
  const [forceClaim, setForceClaim] = useState(false);
  const [conflictedEmail, setConflictedEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);

  const robloxChanged = form.robloxUsername.trim() !== (user.robloxUser || '').trim();

  const verifyRoblox = async () => {
    setValidating(true);
    setEditorError(null);
    setMessage(null);
    setForceClaim(false);
    setConflictedEmail('');
    try {
      const response = await adminFetch('/api/profile/verify-roblox', {
        method: 'POST',
        body: JSON.stringify({
          robloxUsername: form.robloxUsername.trim(),
          userIdToExclude: user.id,
          validateOnly: true,
        }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) {
        if (payload.isDuplicate) {
          setConflictedEmail(String(payload.conflictedEmail || 'otro usuario'));
          setValidatedRoblox(null);
          return;
        }
        throw new Error(String(payload.error || 'No se pudo validar Roblox'));
      }
      setValidatedRoblox(form.robloxUsername.trim());
      setMessage('Usuario de Roblox verificado correctamente.');
    } catch (validationError) {
      setValidatedRoblox(null);
      setEditorError(validationError instanceof Error ? validationError.message : 'No se pudo validar Roblox');
    } finally {
      setValidating(false);
    }
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (robloxChanged && validatedRoblox !== form.robloxUsername.trim() && !forceClaim) {
      setEditorError('Valida el usuario de Roblox antes de guardar.');
      return;
    }
    setSaving(true);
    setEditorError(null);
    try {
      const response = await adminFetch('/api/admin/users/update', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          robloxUsername: form.robloxUsername,
          tiktokUsername: form.tiktokUsername,
          linkStatus: form.linkStatus,
          rejectionReason: form.rejectionReason,
          forceClaim,
        }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) {
        if (payload.isDuplicate) {
          setConflictedEmail(String(payload.conflictedEmail || 'otro usuario'));
          return;
        }
        throw new Error(String(payload.error || 'No se pudo actualizar el usuario'));
      }
      setMessage('Usuario actualizado correctamente.');
      await refresh();
      onSaved?.();
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : 'No se pudo actualizar el usuario');
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    setSaving(true);
    setEditorError(null);
    try {
      const permissionPayload = Object.fromEntries(
        permissions.map(([clientKey, apiKey]) => [apiKey, permissionDraft[clientKey]]),
      );
      const response = await adminFetch('/api/admin/users/update', {
        method: 'POST',
        body: JSON.stringify({ userId: user.id, permissions: permissionPayload }),
      });
      const payload = await readApiPayload(response);
      if (!response.ok) throw new Error(String(payload.error || 'No se pudieron guardar los permisos'));
      setMessage('Permisos guardados correctamente.');
      await refresh();
    } catch (saveError) {
      setEditorError(saveError instanceof Error ? saveError.message : 'No se pudieron guardar los permisos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="flex max-h-[78vh] flex-col text-gray-200">
      <header className="mb-4 flex shrink-0 items-center gap-3 border-b border-neutral-700/60 pb-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1b1d22] border border-neutral-700/60">🐣</span>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Gestión de perfil</p>
          <h1 className="truncate font-display text-xl font-semibold text-white">Editar usuario</h1>
          <p className="truncate text-xs text-gray-400">{user.email}</p>
          <p className="text-[10px] text-gray-500">ID: {user.id}</p>
        </div>
      </header>

      <div className="mb-5 flex shrink-0 border-b border-neutral-700/60">
        {([['profile', 'Perfil'], ['votes', 'Premios y votos'], ['permissions', 'Permisos']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setEditorError(null);
              setMessage(null);
            }}
            className={`flex-1 cursor-pointer border-b-2 pb-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${tab === key ? 'border-[#FFC200] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'} ${focusClassName}`}
          >
            {label}
          </button>
        ))}
      </div>

      {editorError && <p className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-300">{editorError}</p>}
      {message && <p className="mb-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-300">{message}</p>}

      {tab === 'profile' && (
        <form onSubmit={saveProfile} className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
          <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Usuario Roblox
            <div className="flex gap-2">
              <input
                value={form.robloxUsername}
                onChange={(event) => {
                  setForm({ ...form, robloxUsername: event.target.value });
                  setValidatedRoblox(null);
                  setConflictedEmail('');
                  setForceClaim(false);
                }}
                className="min-w-0 flex-1 rounded-2xl border border-neutral-700/60 bg-[#1b1d22] px-3.5 py-2.5 text-xs normal-case tracking-normal text-white outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] transition-colors"
              />
              <button type="button" onClick={() => void verifyRoblox()} disabled={validating || !form.robloxUsername.trim()} className="cursor-pointer rounded-2xl border border-neutral-700/60 bg-[#2b2d31] px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700/40 disabled:opacity-50 transition-colors">
                {validating ? 'Validando...' : 'Validar'}
              </button>
            </div>
          </label>
          {conflictedEmail && (
            <label className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold normal-case tracking-normal text-amber-200">
              La cuenta ya está vinculada a {conflictedEmail}.
              <span className="mt-2 flex items-center gap-2">
                <input type="checkbox" checked={forceClaim} onChange={(event) => setForceClaim(event.target.checked)} className="h-4 w-4 accent-[#FFC200]" />
                Confirmar reasignación forzada
              </span>
            </label>
          )}
          <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Usuario TikTok
            <input value={form.tiktokUsername} onChange={(event) => setForm({ ...form, tiktokUsername: event.target.value })} className="w-full rounded-2xl border border-neutral-700/60 bg-[#1b1d22] px-3.5 py-2.5 text-xs normal-case tracking-normal text-white outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] transition-colors" />
          </label>
          <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Estado de vinculación
            <select value={form.linkStatus} onChange={(event) => setForm({ ...form, linkStatus: event.target.value as AdminUser['linkStatus'] })} className="w-full rounded-2xl border border-neutral-700/60 bg-[#1b1d22] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] transition-colors">
              <option value="none">Sin verificar</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
              <option value="rejected">Rechazado</option>
            </select>
          </label>
          {form.linkStatus === 'rejected' && (
            <label className="space-y-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Motivo del rechazo
              <textarea value={form.rejectionReason} onChange={(event) => setForm({ ...form, rejectionReason: event.target.value })} rows={2} className="w-full resize-none rounded-2xl border border-neutral-700/60 bg-[#1b1d22] px-3.5 py-2.5 text-xs normal-case tracking-normal text-white outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] transition-colors" />
            </label>
          )}
          <button type="submit" disabled={saving} className="mt-auto flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FFC200] py-3 font-display text-xs font-semibold text-black hover:brightness-105 disabled:opacity-50 transition-all">
            {saving && <Loader className="h-3.5 w-3.5 animate-spin" />} Guardar perfil
          </button>
        </form>
      )}

      {tab === 'votes' && (
        <div className="flex-1 space-y-2 overflow-y-auto">
          <p className="rounded-2xl border border-neutral-700/60 bg-[#1b1d22] p-3 text-xs font-semibold text-gray-200">Progreso: {user.votedCount}/{user.totalCategories} categorías</p>
          {CATEGORIES.map((category) => {
            const vote = user.votes.find((candidate) => candidate.categoryId === category.id);
            return (
              <div key={category.id} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-700/60 bg-[#1b1d22] p-3 text-xs">
                <span className="truncate text-gray-200">{category.title}</span>
                <span className={vote ? 'text-[#FFC200]' : 'text-red-300'}>{vote?.nomineeName || 'Sin votar'}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'permissions' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {permissions.map(([clientKey, , label]) => (
              <label key={clientKey} className="flex cursor-pointer items-center justify-between rounded-2xl border border-neutral-700/60 bg-[#1b1d22] p-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors">
                {label}
                <input type="checkbox" checked={permissionDraft[clientKey]} onChange={(event) => setPermissionDraft({ ...permissionDraft, [clientKey]: event.target.checked })} className="h-4 w-4 accent-[#FFC200]" />
              </label>
            ))}
          </div>
          <button type="button" onClick={() => void savePermissions()} disabled={saving} className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#FFC200] py-3 font-display text-xs font-semibold text-black hover:brightness-105 disabled:opacity-50 transition-all">
            {saving && <Loader className="h-3.5 w-3.5 animate-spin" />} Guardar permisos
          </button>
        </div>
      )}
    </article>
  );
}

export function AdminUserEditorPage({ userId }: { userId: string }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-neutral-700/60 bg-[#1e1f22] p-6">
      <Link href="/admin/usuarios" className="mb-5 inline-flex rounded-2xl border border-neutral-700/60 bg-[#2b2d31] px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-neutral-700/40 hover:text-white transition-colors">← Volver a Usuarios</Link>
      <AdminUserEditor userId={userId} />
    </div>
  );
}

export function AdminUserEditorModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Editor de usuario" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-700/60 bg-[#1e1f22] p-6 shadow-2xl">
        <button type="button" aria-label="Cerrar editor" onClick={onClose} className="absolute right-4 top-4 z-10 cursor-pointer rounded-xl border border-neutral-700/60 bg-[#2b2d31] p-2 text-gray-200 hover:text-white transition-colors"><X className="h-4 w-4" /></button>
        <AdminUserEditor userId={userId} onSaved={onClose} />
      </div>
    </div>
  );
}
