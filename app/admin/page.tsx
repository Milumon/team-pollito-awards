import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CATEGORIES } from '@/src/data/categories';
import { Category } from '@/src/types';
import { RefreshCw, Save, Search, Shield, Sparkles, Trash2, Users, BarChart3, Award, Mail, Check, LogOut, X } from 'lucide-react';

type AdminNominee = {
  id: string;
  category_id: number;
  roblox_user_id: number | string | null;
  roblox_user: string;
  display_name: string | null;
  nickname: string | null;
  is_visible: boolean;
  profile_image_url: string;
  created_at: string;
};

type InterviewSlotEnriched = {
  id: string;
  slot_date: string;
  slot_time: string;
  is_booked: boolean;
  booked_by_user_id: string | null;
  user?: {
    email: string;
    roblox_user: string;
    roblox_display_name: string;
    roblox_avatar_url: string | null;
    tiktok_user: string;
    ban_reason: string | null;
    return_reason: string | null;
  } | null;
};

type AdminUser = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string;
  hasVerifiedRoblox: boolean;
  robloxUser: string | null;
  robloxDisplayName: string | null;
  robloxAvatarUrl: string | null;
  robloxVerifiedAt: string | null;
  tiktokUser: string | null;
  linkStatus: 'none' | 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  votedCount: number;
  totalCategories: number;
  votedPercentage: number;
  votes: { categoryId: number; nomineeName: string }[];
};

type AdminStatsCategory = {
  id: number;
  title: string;
  emoji: string;
  totalVotes: number;
  nominees: {
    id: string;
    nickname: string;
    profile_image_url: string | null;
    roblox_user: string | null;
    votes: number;
  }[];
};

type AdminStats = {
  summary: {
    totalUsers: number;
    verifiedUsers: number;
    totalVotes: number;
    completedVoters: number;
  };
  users: AdminUser[];
  categoryStats: AdminStatsCategory[];
};

type CategoryStatNominee = {
  id: string;
  nickname: string;
  profile_image_url: string | null;
  roblox_user: string | null;
  votes: number;
};

type StreamSettings = {
  id: number;
  is_muted: boolean;
  global_cooldown_seconds: number;
  personal_cooldown_seconds: number;
};

const ADMIN_TOKEN_STORAGE_KEY = 'pollitos-admin-token';

const readApiPayload = async (response: Response) => {
  const contentType = response.headers.get('content-type') || '';
  const rawText = await response.text();

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText);
    } catch {
      return { error: rawText || 'Respuesta JSON inválida' };
    }
  }

  return {
    error: rawText
      ? `Respuesta no JSON recibida: ${rawText.slice(0, 180)}`
      : `Respuesta no JSON recibida con estado ${response.status}`,
  };
};

function categoryLabel(categoryId: number) {
  return CATEGORIES.find((category) => category.id === categoryId)?.title || `Categoría ${categoryId}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return 'Nunca';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export default function AdminPage() {
  const [adminToken, setAdminToken] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [nominees, setNominees] = useState<AdminNominee[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [manualFriendId, setManualFriendId] = useState('');
  const [manualNickname, setManualNickname] = useState('');
  const [manualAdding, setManualAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [inspectingUser, setInspectingUser] = useState<AdminUser | null>(null);

  // New Dashboard Tab & Stats States
  const [activeTab, setActiveTab] = useState<'nominees' | 'votes' | 'users' | 'applications' | 'agenda' | 'stream'>('nominees');
  const [slots, setSlots] = useState<InterviewSlotEnriched[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [statsPhase, setStatsPhase] = useState(2);

  // Stream Settings States
  const [streamSettings, setStreamSettings] = useState<StreamSettings | null>(null);
  const [loadingStreamSettings, setLoadingStreamSettings] = useState(false);
  const [updatingStreamSettings, setUpdatingStreamSettings] = useState(false);

  useEffect(() => {
    const storedToken = window.sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '';
    if (storedToken) {
      Promise.resolve().then(() => {
        setAdminToken(storedToken);
        setTokenInput(storedToken);
      });
    }
  }, []);

  const apiFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const response = await fetch(input, {
      ...init,
      headers: {
        'content-type': 'application/json',
        'x-admin-token': adminToken,
        ...(init.headers || {}),
      },
    });

    if (response.status === 401) {
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      setAdminToken('');
      throw new Error('Token de admin inválido o faltante');
    }

    return response;
  }, [adminToken]);

  const loadNominees = useCallback(async () => {
    if (!adminToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/admin/nominees');
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los nominados');
      }

      setNominees(
        Array.isArray(data.nominees)
          ? data.nominees.map((nominee: AdminNominee) => ({
              ...nominee,
              nickname: nominee.nickname ?? nominee.display_name ?? nominee.roblox_user,
            }))
          : []
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [adminToken, apiFetch]);

  const loadStats = useCallback(async (phase = statsPhase) => {
    if (!adminToken) {
      return;
    }

    setLoadingStats(true);
    setError(null);

    try {
      const response = await apiFetch(`/api/admin/stats?phase=${phase}`);
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar las estadísticas');
      }
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [adminToken, apiFetch, statsPhase]);

  const loadInterviewSlots = useCallback(async () => {
    if (!adminToken) {
      return;
    }

    setLoadingSlots(true);
    setError(null);

    try {
      const response = await apiFetch('/api/admin/interviews');
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los slots');
      }
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [adminToken, apiFetch]);

  const loadStreamSettings = useCallback(async () => {
    if (!adminToken) return;
    setLoadingStreamSettings(true);
    setError(null);
    try {
      const response = await apiFetch('/api/stream/settings');
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron cargar los ajustes de stream');
      }
      setStreamSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ajustes de stream');
    } finally {
      setLoadingStreamSettings(false);
    }
  }, [adminToken, apiFetch]);

  const handleUpdateStreamSettings = async (updates: {
    isMuted?: boolean;
    globalCooldown?: number;
    personalCooldown?: number;
  }) => {
    if (!adminToken) return;
    setUpdatingStreamSettings(true);
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/stream/settings', {
        method: 'POST',
        body: JSON.stringify(updates),
      });
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudieron guardar los ajustes');
      }
      setStreamSettings(data.settings);
      setStatus('Ajustes de stream actualizados con éxito.');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar ajustes');
    } finally {
      setUpdatingStreamSettings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'agenda') {
      Promise.resolve().then(() => {
        void loadInterviewSlots();
      });
    }
  }, [activeTab, loadInterviewSlots]);

  useEffect(() => {
    if (activeTab === 'stream') {
      Promise.resolve().then(() => {
        void loadStreamSettings();
      });
    }
  }, [activeTab, loadStreamSettings]);

  const handleVerifyLink = async (userId: string, action: 'approve' | 'reject' | 'revoke', rejectionReason?: string) => {
    setVerifyingUserId(userId);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ userId, action, rejectionReason })
      });
      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la vinculación');
      }
      setStatus(`Vinculación procesada con éxito (${action === 'approve' ? 'aprobada' : action === 'reject' ? 'rechazada' : 'revocada'}).`);
      await loadStats();
      await loadNominees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar vinculación');
    } finally {
      setVerifyingUserId(null);
    }
  };

  const handleCreateSlot = async () => {
    if (!newSlotDate || !newSlotTime) {
      setError('Ingresá una fecha y hora para el slot.');
      return;
    }

    setCreatingSlot(true);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/interviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          slot_date: newSlotDate,
          slot_time: newSlotTime
        })
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear el slot');
      }

      setStatus('Nuevo slot de entrevista para viernes creado.');
      setNewSlotDate('');
      setNewSlotTime('');
      await loadInterviewSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el slot');
    } finally {
      setCreatingSlot(false);
    }
  };

  const handleRescheduleSlot = async (slotId: string) => {
    const confirmed = window.confirm('¿Reprogramar esta entrevista? El slot se liberará y se le notificará al candidato para volver a elegir.');
    if (!confirmed) return;

    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/interviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reschedule',
          slotId
        })
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo reprogramar la entrevista');
      }

      setStatus('Entrevista reprogramada. Se liberó el horario.');
      await loadInterviewSlots();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reprogramar');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    const confirmed = window.confirm('¿Borrar este slot? Si tiene reserva, se cancelará la entrevista del candidato.');
    if (!confirmed) return;

    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/interviews', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          slotId
        })
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo borrar el slot');
      }

      setStatus('Slot de entrevista eliminado.');
      await loadInterviewSlots();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar slot');
    }
  };

  useEffect(() => {
    if (!adminToken) {
      return;
    }

    Promise.resolve().then(() => {
      void loadNominees();
      void loadStats(statsPhase);
      void loadStreamSettings();
    });
  }, [adminToken, loadNominees, loadStats, statsPhase, loadStreamSettings]);

  const filteredNominees = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return nominees;
    }

    return nominees.filter((nominee) => {
      return [nominee.roblox_user, nominee.display_name || '', nominee.nickname || '', String(nominee.roblox_user_id || '')]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });
  }, [nominees, searchTerm]);

  // Filter users for Users tab
  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    const needle = userSearchTerm.trim().toLowerCase();
    if (!needle) return stats.users;
    return stats.users.filter((u: AdminUser) => {
      return [
        u.email || '',
        u.robloxUser || '',
        u.robloxDisplayName || '',
        u.id || ''
      ].some(val => val.toLowerCase().includes(needle));
    });
  }, [stats, userSearchTerm]);

  const handleSaveToken = async () => {
    const nextToken = tokenInput.trim();
    if (!nextToken) {
      setError('Por favor, ingresá el token.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/admin/nominees', {
        method: 'GET',
        headers: {
          'x-admin-token': nextToken,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token de administrador inválido.');
        }
        throw new Error('Error al validar el token de administrador.');
      }

      // Token is valid!
      window.sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextToken);
      setAdminToken(nextToken);
      setStatus('Token verificado. Cargando panel...');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al validar el token.');
      window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/sync', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo sincronizar');
      }

      if (data.jobId) {
        setStatus('Sincronización iniciada en la VM. Esperando progreso...');

        let latest = data;
        while (!latest?.job || latest.job.status === 'queued' || latest.job.status === 'running') {
          await new Promise((resolve) => setTimeout(resolve, 2500));

          const statusResponse = await apiFetch(`/api/admin/sync?jobId=${encodeURIComponent(data.jobId)}`, {
            method: 'GET',
          });

          latest = await readApiPayload(statusResponse);
          if (!statusResponse.ok) {
            throw new Error(latest.error || 'No se pudo leer el estado del job');
          }

          const jobStatus = latest?.job?.status;
          const progress = latest?.job?.progress ?? 0;
          const total = latest?.job?.total ?? 0;

          if (jobStatus === 'running' || jobStatus === 'queued') {
            setStatus(`Sincronizando en la VM: ${progress}/${total || '?'} nominados procesados...`);
            continue;
          }

          if (jobStatus === 'failed') {
            throw new Error(latest?.job?.error || latest?.job?.message || 'La sincronización falló');
          }

          if (jobStatus === 'cancelled') {
            throw new Error(latest?.job?.message || 'La sincronización fue cancelada');
          }

          break;
        }

        const finalJob = latest?.job;
        setStatus(finalJob?.message || `Sincronizado ${finalJob?.result?.upserted || 0} nominados.`);
      } else {
        setStatus(`Sincronizado ${data.upserted || 0} nominados y asignados a ${data.categories || CATEGORIES.length} categorías.`);
      }
      await loadNominees();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSyncing(false);
    }
  };

  const handleManualAddNominee = async () => {
    const friendId = manualFriendId.trim();
    if (!friendId) {
      setError('Ingresá un friendId válido');
      return;
    }

    setManualAdding(true);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/nominees', {
        method: 'POST',
        body: JSON.stringify({
          friendId,
          nickname: manualNickname,
        }),
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo crear el nominado manual');
      }

      setStatus(`Nominado manual ${data.created ? 'creado' : 'actualizado'} correctamente.`);
      setManualFriendId('');
      setManualNickname('');
      await loadNominees();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setManualAdding(false);
    }
  };

  const handleSaveNominee = async (nominee: AdminNominee) => {
    setSavingId(nominee.id);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/nominees', {
        method: 'PATCH',
        body: JSON.stringify({
          id: nominee.id,
          nickname: nominee.nickname,
          isVisible: nominee.is_visible,
        }),
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo guardar');
      }

      setNominees((current) => current.map((item) => {
        if (item.id !== nominee.id) {
          return item;
        }

        return {
          ...item,
          ...data.nominee,
          display_name: item.display_name || data.nominee?.display_name || item.roblox_user,
          nickname: data.nominee?.nickname ?? item.nickname,
          is_visible: typeof data.nominee?.is_visible === 'boolean' ? data.nominee.is_visible : item.is_visible,
        };
      }));
      setStatus('Cambios guardados.');
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNominee = async (nomineeId: string) => {
    const confirmed = window.confirm('¿Eliminar este nominado? Esta acción no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    setDeletingId(nomineeId);
    setError(null);
    setStatus(null);

    try {
      const response = await apiFetch('/api/admin/nominees', {
        method: 'DELETE',
        body: JSON.stringify({ id: nomineeId }),
      });

      const data = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo eliminar');
      }

      setNominees((current) => current.filter((item) => item.id !== nomineeId));
      setStatus('Nominado eliminado.');
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setDeletingId(null);
    }
  };

  const totalWithNickname = nominees.filter((nominee) => Boolean((nominee.nickname || '').trim())).length;
  const visibleNominees = nominees.filter((nominee) => nominee.is_visible).length;

  if (!adminToken) {
    return (
      <div className="min-h-screen bg-[#ffd54d] text-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border-4 border-black rounded-[2rem] p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.15)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-black text-yellow-400 flex items-center justify-center border-2 border-black">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-2xl uppercase leading-none">Admin Pollitos</h1>
              <p className="text-xs uppercase tracking-widest font-bold text-gray-500">Panel de Control</p>
            </div>
          </div>

          <p className="text-sm font-medium text-gray-700 mb-4">
            Ingresá el token de admin para acceder a la gestión de nominados, votos y usuarios.
          </p>

          {error && (
            <div className="bg-red-50 border-4 border-black rounded-2xl p-3 mb-4 text-xs font-bold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {status && (
            <div className="bg-emerald-50 border-4 border-black rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-700">
              {status}
            </div>
          )}

          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="ADMIN_PANEL_TOKEN"
            className="w-full bg-yellow-50 border-4 border-black rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 animate-pulse-once"
          />

          <button
            type="button"
            onClick={handleSaveToken}
            disabled={loading}
            className="mt-4 w-full py-3 bg-black text-yellow-400 font-black uppercase tracking-wider rounded-2xl border-4 border-black hover:bg-neutral-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? 'Validando...' : 'Entrar al panel'}
          </button>

          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            Este token se guarda sólo en esta sesión del navegador.
          </p>
        </div>
      </div>
    );
  }

  // Fallback / default values for stats summary
  const summary = stats?.summary || {
    totalUsers: 0,
    verifiedUsers: 0,
    totalVotes: 0,
    completedVoters: 0,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] text-black px-4 py-6 md:px-8 lg:px-10">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header and Summary Panel */}
        <section className="bg-black text-yellow-400 rounded-[2rem] border-4 border-black p-6 md:p-8 shadow-[12px_12px_0_0_rgba(0,0,0,0.18)] overflow-hidden relative">
          <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.35) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.35) 75%, transparent 75%, transparent)', backgroundSize: '18px 18px' }} />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] font-bold text-yellow-200/80 mb-2">The Pollitos Awards</p>
                <h1 className="text-4xl md:text-5xl font-black uppercase leading-none">Panel Admin</h1>
                <p className="mt-3 max-w-2xl text-sm md:text-base text-yellow-100/90">
                  Control global del evento: gestioná nominados, supervisá los votos de los usuarios en tiempo real y auditá las cuentas registradas.
                </p>
              </div>

              {/* Dynamic Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-0 lg:min-w-[560px]">
                <div className="bg-white text-black rounded-2xl p-4 border-4 border-black">
                  <p className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Registrados</p>
                  <p className="font-black text-2xl leading-tight mt-1">
                    {loadingStats ? '...' : summary.totalUsers}
                  </p>
                </div>
                <div className="bg-white text-black rounded-2xl p-4 border-4 border-black">
                  <p className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> Roblox Verif.</p>
                  <p className="font-black text-2xl leading-tight mt-1">
                    {loadingStats ? '...' : summary.verifiedUsers}
                  </p>
                </div>
                <div className="bg-white text-black rounded-2xl p-4 border-4 border-black">
                  <p className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-blue-600" /> Votos Cast</p>
                  <p className="font-black text-2xl leading-tight mt-1">
                    {loadingStats ? '...' : summary.totalVotes}
                  </p>
                </div>
                <div className="bg-white text-black rounded-2xl p-4 border-4 border-black">
                  <p className="text-[10px] uppercase font-bold text-gray-500 flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" /> Completados</p>
                  <p className="font-black text-2xl leading-tight mt-1">
                    {loadingStats ? '...' : summary.completedVoters}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('nominees')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'nominees'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              👥 Nominados
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('votes')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'votes'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              📊 Recuento de Votos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'users'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              👑 Usuarios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'applications'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              📝 Postulaciones
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('agenda')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'agenda'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              📅 Agenda Viernes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stream')}
              className={`px-5 py-3 font-black uppercase text-xs md:text-sm tracking-wider rounded-2xl border-4 border-black transition-all flex items-center gap-2 ${
                activeTab === 'stream'
                  ? 'bg-black text-yellow-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] -translate-x-[2px] -translate-y-[2px]'
                  : 'bg-white text-black hover:bg-yellow-50'
              }`}
            >
              📺 Interacción Stream
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5 bg-yellow-50 p-1.5 rounded-2xl border-4 border-black h-[52px] items-center shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
              <button
                type="button"
                onClick={() => setStatsPhase(1)}
                className={`px-3 py-1.5 font-black uppercase text-[10px] md:text-xs rounded-xl border-2 border-black transition-all cursor-pointer ${
                  statsPhase === 1
                    ? 'bg-black text-yellow-400'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Fase 1
              </button>
              <button
                type="button"
                onClick={() => setStatsPhase(2)}
                className={`px-3 py-1.5 font-black uppercase text-[10px] md:text-xs rounded-xl border-2 border-black transition-all cursor-pointer ${
                  statsPhase === 2
                    ? 'bg-black text-yellow-400'
                    : 'bg-white text-black hover:bg-gray-100'
                }`}
              >
                Fase 2
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                await loadNominees();
                await loadStats();
                setStatus('Datos actualizados manualmente.');
                setTimeout(() => setStatus(null), 3000);
              }}
              disabled={loading || loadingStats}
              className="p-3 bg-white hover:bg-gray-100 border-4 border-black rounded-2xl flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99 transition-all cursor-pointer"
              title="Recargar todos los datos"
            >
              <RefreshCw className={`w-5 h-5 ${(loading || loadingStats) ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                window.sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
                setAdminToken('');
                setTokenInput('');
                setStatus(null);
                setError(null);
              }}
              className="p-3 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-wider rounded-2xl border-4 border-black flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99 transition-all px-4 cursor-pointer text-xs md:text-sm"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-5 h-5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="bg-red-50 border-4 border-black rounded-2xl p-4 text-sm font-bold text-red-700 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {error}
          </div>
        )}

        {status && (
          <div className="bg-emerald-50 border-4 border-black rounded-2xl p-4 text-sm font-bold text-emerald-700 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {status}
          </div>
        )}

        {/* Dynamic Views based on Tab */}
        {activeTab === 'nominees' && (
          <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
            {/* Nominados Left Panel */}
            <aside className="bg-white rounded-[2rem] border-4 border-black p-5 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-4 lg:sticky lg:top-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-500">Control</p>
                <h2 className="font-black text-2xl uppercase leading-none mt-1">Pool global</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  Importá amigos con el polo del Team Pollito, decidí cuáles quedan visibles y editá nicknames del pool.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="w-full py-3.5 bg-black text-yellow-400 font-black uppercase tracking-wider rounded-2xl border-4 border-black hover:bg-neutral-900 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Importar amigos con polo'}
              </button>

              <div className="border-4 border-black rounded-2xl p-4 bg-white space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-500">Alta manual</p>
                  <h3 className="font-black text-xl uppercase leading-none mt-1">Agregar por friendId</h3>
                </div>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">friendId</span>
                  <input
                    value={manualFriendId}
                    onChange={(event) => setManualFriendId(event.target.value)}
                    placeholder="7332526030"
                    className="w-full bg-white border-4 border-black rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Nickname opcional</span>
                  <input
                    value={manualNickname}
                    onChange={(event) => setManualNickname(event.target.value)}
                    placeholder="Se usará Display Name si se deja vacío"
                    className="w-full bg-white border-4 border-black rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleManualAddNominee}
                  disabled={manualAdding}
                  className="w-full py-3 bg-orange-500 text-white font-black uppercase tracking-wider rounded-2xl border-4 border-black hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {manualAdding ? 'Creando...' : 'Agregar nominado manual'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-yellow-100 border-4 border-black rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Nickname</p>
                  <p className="text-lg font-black">{totalWithNickname}/{nominees.length || 1}</p>
                </div>
                <div className="bg-yellow-100 border-4 border-black rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Visibles</p>
                  <p className="text-lg font-black">{visibleNominees}</p>
                </div>
              </div>

              <label className="block space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Buscar Nominado</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="usuario, id o nickname"
                    className="w-full pl-10 pr-4 py-3 bg-white border-4 border-black rounded-2xl outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                  />
                </div>
              </label>
            </aside>

            {/* Nominados Main List */}
            <main className="bg-white rounded-[2rem] border-4 border-black p-4 md:p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)]">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-500">Lista activa</p>
                  <h2 className="font-black text-2xl uppercase leading-none mt-1">Nominados</h2>
                </div>
                <div className="inline-flex items-center gap-2 bg-yellow-100 border-4 border-black rounded-full px-4 py-2 font-black text-sm">
                  <Sparkles className="w-4 h-4" /> {filteredNominees.length} registros
                </div>
              </div>

              {loading ? (
                <div className="py-16 text-center text-gray-500 font-bold uppercase tracking-wider">Cargando nominados...</div>
              ) : filteredNominees.length === 0 ? (
                <div className="py-16 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[1.5rem]">
                  <p className="font-black text-xl uppercase">Sin nominados todavía</p>
                  <p className="text-sm text-gray-600 mt-2">Usá la sincronización para traer amigos con el polo o probá otro filtro de búsqueda.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNominees.map((nominee) => (
                    <article key={nominee.id} className="grid gap-4 lg:grid-cols-[110px_minmax(0,1fr)_minmax(260px,320px)] items-start bg-[#fffdf0] border-4 border-black rounded-[1.75rem] p-4 md:p-5">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-20 h-20 rounded-3xl border-4 border-black bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-[5px_5px_0_0_rgba(0,0,0,0.08)]">
                          {nominee.profile_image_url ? (
                            <img src={nominee.profile_image_url} alt={nominee.roblox_user} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">🐣</span>
                          )}
                        </div>

                        <span className={`inline-flex items-center justify-center rounded-full border-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-wider ${nominee.is_visible ? 'bg-emerald-200' : 'bg-gray-200'}`}>
                          {nominee.is_visible ? 'Visible' : 'Oculto'}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Pool global</p>
                          <h3 className="font-black text-2xl leading-tight truncate">{nominee.nickname || nominee.display_name || nominee.roblox_user}</h3>
                          <p className="text-sm font-semibold text-emerald-700 mt-1 truncate">
                            Display name: {nominee.display_name || 'No disponible'}
                          </p>
                          <p className="text-sm font-semibold text-gray-600 mt-1 truncate">@{nominee.roblox_user}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-700">
                          <span className="bg-white border-2 border-black rounded-full px-3 py-1">ID: {String(nominee.roblox_user_id || 'sin-id')}</span>
                          <span className="bg-white border-2 border-black rounded-full px-3 py-1">
                            {nominee.category_id ? categoryLabel(nominee.category_id) : 'Votable en todas las categorías'}
                          </span>
                          <span className={`border-2 border-black rounded-full px-3 py-1 ${nominee.is_visible ? 'bg-emerald-200' : 'bg-gray-200'}`}>
                            {nominee.is_visible ? 'Se muestra al público' : 'Oculto al público'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="block space-y-1">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Nickname editable</span>
                          <input
                            value={nominee.nickname || ''}
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              setNominees((current) => current.map((item) => (item.id === nominee.id ? { ...item, nickname: nextValue } : item)));
                            }}
                            className="w-full bg-white border-4 border-black rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                          />
                          <p className="text-[11px] text-gray-500 font-medium leading-tight">
                            Display name inicial de Roblox; si lo vaciás y guardás, volverá al valor original.
                          </p>
                        </label>

                        <label className="flex items-center justify-between gap-3 bg-white border-4 border-black rounded-2xl px-4 py-3 font-black uppercase text-[11px] tracking-wider cursor-pointer select-none">
                          <span>Visible en el panel público</span>
                          <input
                            type="checkbox"
                            checked={nominee.is_visible}
                            onChange={(event) => {
                              const nextValue = event.target.checked;
                              setNominees((current) => current.map((item) => (item.id === nominee.id ? { ...item, is_visible: nextValue } : item)));
                            }}
                            className="w-5 h-5 accent-black"
                          />
                        </label>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveNominee(nominee)}
                            disabled={savingId === nominee.id}
                            className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-black text-yellow-400 rounded-2xl border-4 border-black font-black uppercase text-xs tracking-wider hover:bg-neutral-900 transition-all disabled:opacity-60"
                          >
                            <Save className="w-4 h-4" />
                            {savingId === nominee.id ? 'Guardando...' : 'Guardar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNominee(nominee.id)}
                            disabled={deletingId === nominee.id}
                            className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-white text-black rounded-2xl border-4 border-black font-black uppercase text-xs tracking-wider hover:bg-gray-100 transition-all disabled:opacity-60"
                          >
                            <Trash2 className="w-4 h-4" />
                            {deletingId === nominee.id ? '...' : 'Borrar'}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </main>
          </section>
        )}

        {activeTab === 'votes' && (
          <section className="space-y-6">
            <div className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-black" />
                <div>
                  <h2 className="font-black text-2xl uppercase leading-none">Resultados de la Votación</h2>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Recuento de votos por categoría en tiempo real (excluye nominados ocultos).</p>
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div className="py-16 text-center text-gray-500 font-bold uppercase tracking-wider bg-white rounded-[2rem] border-4 border-black">
                Procesando votos...
              </div>
            ) : !stats?.categoryStats || stats.categoryStats.length === 0 ? (
              <div className="py-16 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[2rem]">
                <p className="font-black text-xl uppercase">No hay votos registrados aún</p>
                <p className="text-sm text-gray-600 mt-2">Los resultados aparecerán apenas los usuarios empiecen a enviar sus planillas.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {stats.categoryStats.map((cat: AdminStatsCategory) => (
                  <article key={cat.id} className="bg-white border-4 border-black rounded-[2rem] p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4 mb-4 border-b-4 border-black pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{cat.emoji || '🏆'}</span>
                          <div>
                            <h3 className="font-black text-xl uppercase leading-tight">{cat.title}</h3>
                            <p className="text-xs font-bold text-gray-500">Categoría ID: {cat.id}</p>
                          </div>
                        </div>
                        <div className="bg-black text-yellow-400 border-2 border-black rounded-xl px-3 py-1 text-xs font-black uppercase shrink-0">
                          {cat.totalVotes} votos
                        </div>
                      </div>

                      <div className="space-y-4">
                        {cat.nominees.slice(0, 5).map((nom: CategoryStatNominee, index: number) => {
                          const percentage = cat.totalVotes > 0 ? Math.round((nom.votes / cat.totalVotes) * 100) : 0;
                          
                          // Custom rank medal/emoji
                          let rankBadge = (
                            <span className="w-7 h-7 flex items-center justify-center font-black text-xs border-2 border-black rounded-full bg-gray-100 shrink-0">
                              {index + 1}
                            </span>
                          );
                          if (index === 0 && nom.votes > 0) {
                            rankBadge = (
                              <span className="w-7 h-7 flex items-center justify-center font-black text-xs border-2 border-black rounded-full bg-amber-400 shrink-0" title="1° Puesto">
                                👑
                              </span>
                            );
                          } else if (index === 1 && nom.votes > 0) {
                            rankBadge = (
                              <span className="w-7 h-7 flex items-center justify-center font-black text-xs border-2 border-black rounded-full bg-slate-300 shrink-0" title="2° Puesto">
                                🥈
                              </span>
                            );
                          } else if (index === 2 && nom.votes > 0) {
                            rankBadge = (
                              <span className="w-7 h-7 flex items-center justify-center font-black text-xs border-2 border-black rounded-full bg-amber-700 text-white shrink-0" title="3° Puesto">
                                🥉
                              </span>
                            );
                          }

                          return (
                            <div key={nom.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  {rankBadge}
                                  <div className="w-7 h-7 rounded-lg border-2 border-black bg-white overflow-hidden shrink-0">
                                    {nom.profile_image_url ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={nom.profile_image_url} alt={nom.nickname} className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-xs flex items-center justify-center w-full h-full">🐣</span>
                                    )}
                                  </div>
                                  <span className="font-bold truncate" title={nom.nickname}>
                                    {nom.nickname}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-500 truncate">@{nom.roblox_user}</span>
                                </div>
                                <span className="font-black shrink-0">{nom.votes} {nom.votes === 1 ? 'voto' : 'votos'}</span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-gray-100 border-2 border-black rounded-full h-5 overflow-hidden relative">
                                <div
                                  className={`h-full border-r-2 border-black transition-all duration-500 ${
                                    index === 0 && nom.votes > 0
                                      ? 'bg-amber-400'
                                      : index === 1 && nom.votes > 0
                                      ? 'bg-slate-300'
                                      : 'bg-yellow-200'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                                <span className="absolute inset-0 flex items-center justify-end pr-2 font-black text-[10px] text-gray-700">
                                  {percentage}%
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {cat.nominees.length > 5 && (
                          <details className="mt-2 group">
                            <summary className="font-black text-xs uppercase cursor-pointer hover:underline text-gray-600 outline-none select-none list-none flex items-center gap-1">
                              <span>▶ Ver otros {cat.nominees.length - 5} nominados</span>
                            </summary>
                            <div className="mt-3 space-y-4 pt-3 border-t-2 border-dashed border-black">
                              {cat.nominees.slice(5).map((nom: CategoryStatNominee, index: number) => {
                                const percentage = cat.totalVotes > 0 ? Math.round((nom.votes / cat.totalVotes) * 100) : 0;
                                return (
                                  <div key={nom.id} className="space-y-1">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-6 h-6 flex items-center justify-center font-black text-[10px] border-2 border-black rounded-full bg-gray-100 shrink-0">
                                          {index + 6}
                                        </span>
                                        <span className="font-bold truncate">{nom.nickname}</span>
                                        <span className="text-[10px] text-gray-500 truncate">@{nom.roblox_user}</span>
                                      </div>
                                      <span className="font-black shrink-0">{nom.votes} v</span>
                                    </div>
                                    <div className="w-full bg-gray-100 border-2 border-black rounded-full h-4 overflow-hidden relative">
                                      <div
                                        className="h-full bg-yellow-100 border-r-2 border-black"
                                        style={{ width: `${percentage}%` }}
                                      />
                                      <span className="absolute inset-0 flex items-center justify-end pr-2 font-black text-[9px] text-gray-600">
                                        {percentage}%
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="space-y-6">
            <div className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-black" />
                <div>
                  <h2 className="font-black text-2xl uppercase leading-none">Usuarios Registrados</h2>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Lista de votantes registrados, cuentas de Supabase y progreso de votación.</p>
                </div>
              </div>

              {/* User search bar */}
              <div className="relative w-full md:max-w-xs shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={userSearchTerm}
                  onChange={(event) => setUserSearchTerm(event.target.value)}
                  placeholder="Buscar por email o roblox..."
                  className="w-full pl-10 pr-4 py-2 bg-white border-4 border-black rounded-2xl outline-none focus:ring-4 focus:ring-yellow-300 text-sm font-semibold"
                />
              </div>
            </div>

            {loadingStats ? (
              <div className="py-16 text-center text-gray-500 font-bold uppercase tracking-wider bg-white rounded-[2rem] border-4 border-black">
                Obteniendo cuentas de usuarios...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[2rem]">
                <p className="font-black text-xl uppercase">Sin usuarios encontrados</p>
                <p className="text-sm text-gray-600 mt-2">No se encontraron registros que coincidan con la búsqueda.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredUsers.map((u: AdminUser) => {
                  const isCompleted = u.votedCount >= u.totalCategories;
                  
                  return (
                    <article
                      key={u.id}
                      className={`border-4 border-black rounded-[2rem] p-5 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex flex-col justify-between transition-all ${
                        isCompleted ? 'bg-emerald-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Header: Roblox info */}
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-2xl border-4 border-black bg-white overflow-hidden flex items-center justify-center shrink-0 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
                            {u.robloxAvatarUrl ? (
                              <img src={u.robloxAvatarUrl} alt={u.robloxUser || 'Roblox Avatar'} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl">🐣</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            {u.hasVerifiedRoblox ? (
                              <>
                                <h3 className="font-black text-lg truncate leading-tight flex items-center gap-1" title={u.robloxDisplayName || undefined}>
                                  {u.robloxDisplayName}
                                  <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-1 py-0.2 shrink-0">✓</span>
                                </h3>
                                <p className="text-xs font-semibold text-gray-500 truncate">@{u.robloxUser}</p>
                              </>
                            ) : (
                              <>
                                <h3 className="font-black text-lg truncate leading-tight text-gray-400">Sin Verificar</h3>
                                <p className="text-xs font-bold text-red-500 uppercase tracking-wider">No vinculó Roblox</p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Middle Info: Email & Dates */}
                        <div className="space-y-1.5 border-t-2 border-dashed border-black pt-3 text-xs">
                          <p className="flex items-center gap-1.5 font-bold text-gray-700 truncate" title={u.email}>
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            {u.email}
                          </p>
                          <p className="text-gray-500 font-medium">
                            <span className="font-bold">Registro:</span> {formatDate(u.createdAt)}
                          </p>
                          <p className="text-gray-500 font-medium">
                            <span className="font-bold">Último Login:</span> {formatDate(u.lastSignInAt)}
                          </p>
                        </div>
                      </div>

                      {/* Footer: Voting Progress */}
                      <div className="mt-4 border-t-4 border-black pt-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black uppercase">
                          <span>Progreso de Voto</span>
                          <span className={isCompleted ? 'text-emerald-700' : 'text-gray-700'}>
                            {u.votedCount}/{u.totalCategories} Categorías
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 border-2 border-black rounded-full h-5 overflow-hidden relative">
                          <div
                            className={`h-full border-r-2 border-black transition-all duration-500 ${
                              isCompleted ? 'bg-emerald-400' : u.votedCount > 0 ? 'bg-yellow-400' : 'bg-gray-300'
                            }`}
                            style={{ width: `${u.votedPercentage}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-gray-800">
                            {u.votedPercentage}%
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setInspectingUser(u)}
                          className={`w-full mt-3 py-2.5 px-3 border-4 border-black rounded-xl text-center font-black uppercase text-xs tracking-wider cursor-pointer select-none outline-none flex items-center justify-center gap-2 shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99 transition-all ${
                            isCompleted ? 'bg-emerald-200 text-emerald-900 hover:bg-emerald-300' : 'bg-yellow-100 text-black hover:bg-yellow-200'
                          }`}
                        >
                          {isCompleted ? '👑 Ver Planilla Completada' : `📋 Ver Planilla (${u.votedCount}/${u.totalCategories})`}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === 'applications' && (
          <section className="grid gap-6 lg:grid-cols-2 items-start animate-fade-in">
            {/* COLUMN 1: PENDING LINK REQUESTS */}
            <div className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-500">Revisión de cuentas</p>
                <h2 className="font-black text-2xl uppercase leading-none mt-1">Postulaciones Pendientes</h2>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Solicitudes de vinculación en espera de aprobación.
                </p>
              </div>

              {loadingStats ? (
                <div className="py-12 text-center text-gray-500 font-bold uppercase">Cargando postulaciones...</div>
              ) : filteredUsers.filter((u: AdminUser) => u.linkStatus === 'pending').length === 0 ? (
                <div className="py-12 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[1.5rem]">
                  <p className="font-black text-lg uppercase">Sin solicitudes pendientes</p>
                  <p className="text-xs text-gray-500 mt-1">No hay postulaciones de vinculación esperando revisión.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.filter((u: AdminUser) => u.linkStatus === 'pending').map((u: AdminUser) => (
                    <article key={u.id} className="border-4 border-black rounded-[1.5rem] p-4 bg-[#fffdf0] flex flex-col justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl border-2 border-black bg-white overflow-hidden shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.08)]">
                          {u.robloxAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.robloxAvatarUrl} alt={u.robloxUser || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl flex items-center justify-center h-full">🐣</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base leading-tight truncate">{u.robloxDisplayName || 'Usuario'}</h3>
                          <p className="text-xs font-semibold text-emerald-700 truncate">Roblox: @{u.robloxUser}</p>
                          {u.tiktokUser && (
                            <a 
                              href={`https://www.tiktok.com/@${u.tiktokUser}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center text-xs font-black text-black underline hover:text-neutral-700 mt-1"
                            >
                              TikTok: @{u.tiktokUser} ↗
                            </a>
                          )}
                          <p className="text-[10px] text-gray-400 truncate mt-1">Email: {u.email}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 border-t-2 border-dashed border-black pt-3">
                        <button
                          type="button"
                          onClick={() => handleVerifyLink(u.id, 'approve')}
                          disabled={verifyingUserId === u.id}
                          className="flex-1 py-2 bg-emerald-200 text-black font-black uppercase text-xs rounded-xl border-2 border-black hover:bg-emerald-300 transition-all cursor-pointer shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('Motivo del rechazo:', 'Los datos brindados no coinciden en Roblox/TikTok.');
                            if (reason !== null) {
                              void handleVerifyLink(u.id, 'reject', reason);
                            }
                          }}
                          disabled={verifyingUserId === u.id}
                          className="flex-1 py-2 bg-red-200 text-black font-black uppercase text-xs rounded-xl border-2 border-black hover:bg-red-300 transition-all cursor-pointer shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99"
                        >
                          Rechazar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* COLUMN 2: APPROVED OFFICIAL MEMBERS */}
            <div className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-gray-500">Miembros activos</p>
                <h2 className="font-black text-2xl uppercase leading-none mt-1">Miembros Oficiales</h2>
                <p className="text-sm text-gray-600 mt-2 font-medium">
                  Comunidad oficial con permisos VIP en la Consola en Vivo.
                </p>
              </div>

              {loadingStats ? (
                <div className="py-12 text-center text-gray-500 font-bold uppercase">Cargando miembros...</div>
              ) : filteredUsers.filter((u: AdminUser) => u.linkStatus === 'approved').length === 0 ? (
                <div className="py-12 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[1.5rem]">
                  <p className="font-black text-lg uppercase">Sin miembros oficiales</p>
                  <p className="text-xs text-gray-500 mt-1">Aún no se han verificado miembros oficiales.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.filter((u: AdminUser) => u.linkStatus === 'approved').map((u: AdminUser) => (
                    <article key={u.id} className="border-4 border-black rounded-[1.5rem] p-4 bg-[#f8fff8] flex flex-col justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl border-2 border-black bg-white overflow-hidden shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.08)]">
                          {u.robloxAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.robloxAvatarUrl} alt={u.robloxUser || 'User'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xl flex items-center justify-center h-full">🐣</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-black text-base leading-tight truncate flex items-center gap-1">
                            {u.robloxDisplayName || 'Usuario'}
                            <span className="text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 rounded px-1 shrink-0">✓</span>
                          </h3>
                          <p className="text-xs font-semibold text-gray-600 truncate">Roblox: @{u.robloxUser}</p>
                          {u.tiktokUser && (
                            <a 
                              href={`https://www.tiktok.com/@${u.tiktokUser}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="inline-flex items-center text-xs font-semibold text-black underline hover:text-neutral-700 mt-1"
                            >
                              TikTok: @{u.tiktokUser} ↗
                            </a>
                          )}
                          <p className="text-[10px] text-gray-400 truncate mt-1">Email: {u.email}</p>
                        </div>
                      </div>

                      <div className="flex border-t-2 border-dashed border-black pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('Motivo de revocación:', 'Membresía revocada por el administrador.');
                            if (reason !== null) {
                              void handleVerifyLink(u.id, 'revoke', reason);
                            }
                          }}
                          disabled={verifyingUserId === u.id}
                          className="w-full py-2 bg-red-600 text-white font-black uppercase text-xs rounded-xl border-2 border-black hover:bg-red-700 transition-all cursor-pointer shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:scale-101 active:scale-99"
                        >
                          Revocar Membresía
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'agenda' && (
          <section className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] items-start animate-fade-in">
            {/* SIDEBAR: CREATE SLOTS */}
            <aside className="bg-white rounded-[2rem] border-4 border-black p-5 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-4 lg:sticky lg:top-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Gestión de Turnos</p>
                <h2 className="font-black text-2xl uppercase leading-none mt-1">Alta de Slots</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed font-medium">
                  Creá nuevos horarios disponibles para los viernes. Los candidatos los verán en tiempo real.
                </p>
              </div>

              <div className="border-4 border-black rounded-2xl p-4 bg-[#fffdf0] space-y-4">
                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Fecha (Solo Viernes)</span>
                  <input
                    type="date"
                    value={newSlotDate}
                    onChange={(e) => setNewSlotDate(e.target.value)}
                    className="w-full bg-white border-4 border-black rounded-2xl px-4 py-2.5 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Hora</span>
                  <input
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    className="w-full bg-white border-4 border-black rounded-2xl px-4 py-2.5 font-semibold outline-none focus:ring-4 focus:ring-yellow-300 text-sm"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleCreateSlot}
                  disabled={creatingSlot}
                  className="w-full py-3 bg-yellow-400 text-black font-black uppercase tracking-wider rounded-2xl border-4 border-black hover:bg-yellow-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creatingSlot ? 'Creando...' : 'Crear Slot Viernes'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-yellow-100 border-4 border-black rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Total Slots</p>
                  <p className="text-lg font-black">{slots.length}</p>
                </div>
                <div className="bg-yellow-100 border-4 border-black rounded-2xl p-3">
                  <p className="text-[10px] uppercase tracking-wider font-black text-gray-500">Reservados</p>
                  <p className="text-lg font-black">{slots.filter((s) => s.is_booked).length}</p>
                </div>
              </div>
            </aside>

            {/* MAIN LIST OF SLOTS */}
            <main className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between gap-3 mb-5 border-b-4 border-black pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Calendario</p>
                  <h2 className="font-black text-2xl uppercase leading-none mt-1">Horarios Agendados</h2>
                </div>
                <div className="bg-yellow-100 border-4 border-black rounded-full px-4 py-1.5 font-black text-xs">
                  {slots.length} Slots Totales
                </div>
              </div>

              {loadingSlots ? (
                <div className="py-16 text-center text-gray-500 font-bold uppercase">Cargando turnos de agenda...</div>
              ) : slots.length === 0 ? (
                <div className="py-16 text-center bg-yellow-50 border-4 border-dashed border-black rounded-[1.5rem]">
                  <p className="font-black text-xl uppercase">No hay slots creados</p>
                  <p className="text-sm text-gray-600 mt-2">Definí un horario los viernes en el panel lateral para iniciar.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {slots.map((slot) => {
                    const slotDateTime = new Date(`${slot.slot_date}T${slot.slot_time}`);
                    const isPast = slotDateTime.getTime() < now;
                    
                    return (
                      <article key={slot.id} className={`border-4 border-black rounded-[1.5rem] p-4 flex flex-col justify-between gap-4 ${
                        slot.is_booked ? 'bg-[#fffcf0]' : 'bg-white'
                      } ${isPast ? 'opacity-75' : ''}`}>
                        <div>
                          {/* Slot Header */}
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-lg bg-yellow-200 border-2 border-black px-3 py-1 rounded-xl">
                              {slot.slot_time.substring(0, 5)} hs
                            </span>
                            <span className={`text-[10px] font-black uppercase tracking-wider border-2 border-black rounded-full px-2.5 py-0.5 ${
                              slot.is_booked ? 'bg-orange-400' : 'bg-emerald-200'
                            }`}>
                              {slot.is_booked ? 'Reservado' : 'Libre'}
                            </span>
                          </div>

                          <p className="font-bold text-xs text-gray-600 mt-2">
                            📅 {slot.slot_date}
                          </p>

                          {/* Candidate details if booked */}
                          {slot.is_booked && slot.user && (
                            <div className="mt-4 border-t-2 border-dashed border-black pt-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg border-2 border-black bg-white overflow-hidden shrink-0 shadow-[2px_2px_0_0_rgba(0,0,0,0.08)]">
                                  {slot.user.roblox_avatar_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={slot.user.roblox_avatar_url} alt={slot.user.roblox_user} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-sm flex items-center justify-center h-full">🐣</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black truncate">{slot.user.roblox_display_name}</p>
                                  <p className="text-[10px] font-semibold text-gray-500 truncate">@{slot.user.roblox_user}</p>
                                </div>
                              </div>
                              <p className="text-[10px] font-semibold text-gray-700">TikTok: @{slot.user.tiktok_user}</p>
                              <p className="text-[10px] font-semibold text-gray-500 truncate">Email: {slot.user.email}</p>

                              {/* Ban/Return reason details */}
                              {(slot.user.ban_reason || slot.user.return_reason) && (
                                <div className="bg-red-50 border-2 border-black rounded-xl p-2.5 text-[10px] space-y-1.5 mt-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.05)]">
                                  <p className="font-black text-red-700 uppercase tracking-wide">⚠️ Re-ingreso (Baneado)</p>
                                  <p className="text-gray-800"><span className="font-bold text-black">Motivo Baneo:</span> {slot.user.ban_reason}</p>
                                  <p className="text-gray-800"><span className="font-bold text-black">Explicación Retorno:</span> {slot.user.return_reason}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 border-t-2 border-black pt-3">
                          {slot.is_booked ? (
                            <button
                              type="button"
                              onClick={() => handleRescheduleSlot(slot.id)}
                              className="flex-1 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase text-[10px] rounded-lg border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                            >
                              Reprogramar
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="py-1.5 px-3 bg-red-100 hover:bg-red-200 text-black font-black uppercase text-[10px] rounded-lg border-2 border-black transition-all cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </main>
          </section>
        )}

        {activeTab === 'stream' && (
          <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)] items-start animate-fade-in">
            {/* PANEL LATERAL: ESTADO Y PANEL DE PÁNICO */}
            <aside className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-6 lg:sticky lg:top-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Mute General</p>
                <h2 className="font-black text-2xl uppercase leading-none mt-1">Panic Button</h2>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed font-medium">
                  Silenciá instantáneamente todas las interacciones de sonido y TTS del stream. Limpiará la cola de reproducción en OBS de forma inmediata.
                </p>
              </div>

              {loadingStreamSettings ? (
                <div className="py-6 text-center text-gray-500 font-bold uppercase">Cargando estado...</div>
              ) : streamSettings ? (
                <div className="space-y-4">
                  <div className={`border-4 border-black rounded-2xl p-5 text-center transition-all ${
                    streamSettings.is_muted ? 'bg-red-100' : 'bg-emerald-100'
                  }`}>
                    <span className="text-4xl block mb-2">{streamSettings.is_muted ? '🚫' : '🔊'}</span>
                    <h3 className="font-black text-xl uppercase">
                      {streamSettings.is_muted ? 'Stream Silenciado' : 'Consola Activa'}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 font-semibold">
                      {streamSettings.is_muted 
                        ? 'Ningún VIP puede reproducir sonidos o TTS.' 
                        : 'Los VIPs pueden enviar sonidos y mensajes.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={updatingStreamSettings}
                    onClick={() => handleUpdateStreamSettings({ isMuted: !streamSettings.is_muted })}
                    className={`w-full py-4 rounded-2xl border-4 border-black font-black uppercase tracking-wider text-sm transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] cursor-pointer text-center ${
                      streamSettings.is_muted 
                        ? 'bg-emerald-400 hover:bg-emerald-500 text-black' 
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {updatingStreamSettings 
                      ? 'Procesando...' 
                      : streamSettings.is_muted 
                      ? '🔊 Reactivar Consola' 
                      : '🚨 BOTÓN DE PÁNICO: MUTEAR'}
                  </button>
                </div>
              ) : (
                <div className="text-center font-bold text-gray-500 py-4">Sin datos de configuración</div>
              )}

              <div className="border-4 border-black rounded-2xl p-4 bg-yellow-50 space-y-2">
                <h4 className="font-black text-xs uppercase">Enlaces Rápidos del Stream</h4>
                <p className="text-[10px] text-gray-500 font-bold leading-tight">
                  Usá estos links para el Overlay en OBS y para testear la consola.
                </p>
                <div className="space-y-2 pt-2">
                  <a
                    href={`/overlay?token=${encodeURIComponent(adminToken)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 bg-black hover:bg-neutral-900 text-[#FFD700] text-center font-black uppercase text-[10px] rounded-lg border-2 border-black transition-all cursor-pointer"
                  >
                    Abrir Overlay en OBS ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${window.location.origin}/overlay?token=${encodeURIComponent(adminToken)}`;
                      navigator.clipboard.writeText(url);
                      alert('¡URL del Overlay copiada al portapapeles!');
                    }}
                    className="block w-full py-2 bg-white hover:bg-gray-100 text-black text-center font-black uppercase text-[10px] rounded-lg border-2 border-black transition-all cursor-pointer"
                  >
                    Copiar URL del Overlay
                  </button>
                  <a
                    href="/console"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 bg-[#ea580c] hover:bg-orange-600 text-white text-center font-black uppercase text-[10px] rounded-lg border-2 border-black transition-all cursor-pointer"
                  >
                    Probar Consola VIP (Miembros) ↗
                  </a>
                </div>
              </div>
            </aside>

            {/* SECCIÓN PRINCIPAL: CONFIGURACIÓN DE COOLDOWNS */}
            <main className="bg-white rounded-[2rem] border-4 border-black p-6 shadow-[10px_10px_0_0_rgba(0,0,0,0.12)] space-y-6">
              <div className="flex items-center justify-between border-b-4 border-black pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-gray-500">Temporizadores</p>
                  <h2 className="font-black text-2xl uppercase leading-none mt-1">Límites de Cooldown</h2>
                </div>
                <span className="bg-yellow-100 border-2 border-black rounded-full px-3 py-1 font-black text-xs">
                  Ajustes en vivo
                </span>
              </div>

              {loadingStreamSettings ? (
                <div className="py-12 text-center text-gray-500 font-bold uppercase">Cargando configuraciones...</div>
              ) : streamSettings ? (
                <div className="space-y-6">
                  {/* COOLDOWN GLOBAL */}
                  <div className="border-4 border-black rounded-2xl p-5 bg-[#fffdf0] space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-black text-lg uppercase flex items-center gap-1.5">
                          ⏳ Cooldown Global
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold mt-1">
                          Tiempo mínimo que debe pasar entre CUALQUIER sonido/TTS en el stream. Evita el spam masivo consecutivo.
                        </p>
                      </div>
                      <span className="font-mono font-black text-xl bg-yellow-200 border-2 border-black px-3 py-1 rounded-xl shrink-0">
                        {streamSettings.global_cooldown_seconds}s
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min="5"
                        max="180"
                        step="5"
                        value={streamSettings.global_cooldown_seconds}
                        disabled={updatingStreamSettings}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setStreamSettings((prev: StreamSettings | null) => prev ? { ...prev, global_cooldown_seconds: val } : null);
                        }}
                        className="w-full accent-black cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                        <span>5 segundos</span>
                        <span>3 minutos</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updatingStreamSettings}
                      onClick={() => handleUpdateStreamSettings({ globalCooldown: streamSettings.global_cooldown_seconds })}
                      className="py-2.5 px-4 bg-black hover:bg-neutral-900 text-yellow-400 font-black uppercase text-xs rounded-xl border-2 border-black transition-all cursor-pointer"
                    >
                      Guardar Cooldown Global
                    </button>
                  </div>

                  {/* COOLDOWN PERSONAL */}
                  <div className="border-4 border-black rounded-2xl p-5 bg-[#fffdf0] space-y-4">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-black text-lg uppercase flex items-center gap-1.5">
                          👤 Cooldown Personal (TTS)
                        </h3>
                        <p className="text-xs text-gray-500 font-semibold mt-1">
                          Tiempo de espera para un mismo usuario antes de poder enviar otro mensaje de voz (TTS).
                        </p>
                      </div>
                      <span className="font-mono font-black text-xl bg-yellow-200 border-2 border-black px-3 py-1 rounded-xl shrink-0">
                        {Math.floor(streamSettings.personal_cooldown_seconds / 60)} min
                      </span>
                    </div>

                    <div className="space-y-2">
                      <input
                        type="range"
                        min="60"
                        max="1200"
                        step="60"
                        value={streamSettings.personal_cooldown_seconds}
                        disabled={updatingStreamSettings}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          setStreamSettings((prev: StreamSettings | null) => prev ? { ...prev, personal_cooldown_seconds: val } : null);
                        }}
                        className="w-full accent-black cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] text-gray-400 font-bold">
                        <span>1 minuto</span>
                        <span>20 minutos</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={updatingStreamSettings}
                      onClick={() => handleUpdateStreamSettings({ personalCooldown: streamSettings.personal_cooldown_seconds })}
                      className="py-2.5 px-4 bg-black hover:bg-neutral-900 text-yellow-400 font-black uppercase text-xs rounded-xl border-2 border-black transition-all cursor-pointer"
                    >
                      Guardar Cooldown Personal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center font-bold text-gray-500 py-12">No se pudieron recuperar las configuraciones del stream.</div>
              )}
            </main>
          </section>
        )}
      </div>

      {/* USER VOTES INSPECTOR MODAL */}
      <AnimatePresence>
        {inspectingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 font-sans animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black rounded-[2rem] p-6 w-full max-w-md relative brutalist-shadow text-black flex flex-col max-h-[85vh] md:max-h-[80vh]"
            >
              <button
                onClick={() => setInspectingUser(null)}
                className="absolute top-4 right-4 text-black hover:scale-105 active:scale-95 transition-all w-8 h-8 flex items-center justify-center border-2 border-black rounded-lg bg-white cursor-pointer z-10"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>

              <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-3 shrink-0">
                <div className="w-12 h-12 rounded-xl border-2 border-black bg-yellow-100 overflow-hidden flex items-center justify-center shrink-0">
                  {inspectingUser.robloxAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inspectingUser.robloxAvatarUrl} alt={inspectingUser.robloxUser || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🐣</span>
                  )}
                </div>
                <div className="min-w-0 pr-8">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Planilla de Votación</p>
                  <h3 className="font-black text-xl uppercase leading-none truncate" title={inspectingUser.robloxDisplayName || inspectingUser.email}>
                    {inspectingUser.robloxDisplayName || inspectingUser.email}
                  </h3>
                  {inspectingUser.robloxUser && (
                    <p className="text-xs font-semibold text-gray-400 mt-1 truncate">@{inspectingUser.robloxUser}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-yellow-50 border-4 border-black p-3 rounded-2xl mb-4 font-black uppercase text-xs shrink-0">
                <span>Progreso General</span>
                <span className={inspectingUser.votedCount >= inspectingUser.totalCategories ? 'text-emerald-700 font-black' : 'text-orange-600 font-black'}>
                  {inspectingUser.votedCount}/{inspectingUser.totalCategories} Categorías
                </span>
              </div>

              <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-2 mb-4">
                {CATEGORIES.map((cat: Category) => {
                  const vote = inspectingUser.votes?.find((v: { categoryId: number; nomineeName: string }) => v.categoryId === cat.id);

                  return (
                    <div key={cat.id} className={`border-2 border-black rounded-xl p-3 flex items-center justify-between gap-3 text-xs ${
                      vote ? 'bg-white' : 'bg-red-50/70 border-dashed'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{cat.emoji || '🏆'}</span>
                        <span className="font-bold text-gray-700 truncate" title={cat.title}>
                          {cat.title}
                        </span>
                      </div>
                      
                      {vote ? (
                        <span className="font-black text-black shrink-0 bg-yellow-100 border-2 border-black px-2.5 py-1 rounded-xl truncate max-w-[140px]" title={vote.nomineeName}>
                          {vote.nomineeName}
                        </span>
                      ) : (
                        <span className="font-black text-red-700 shrink-0 bg-red-100 border-2 border-red-400 px-2.5 py-1 rounded-xl uppercase text-[9px] tracking-wider animate-pulse">
                          ❌ Sin Votar
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="w-full py-3 bg-black hover:bg-neutral-900 text-yellow-400 font-display font-black text-sm tracking-wider rounded-xl border-4 border-black active:translate-y-1 transition-all uppercase cursor-pointer focus:outline-none shrink-0"
              >
                Cerrar Planilla
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}