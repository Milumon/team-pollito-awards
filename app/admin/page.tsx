"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';
import { CATEGORIES } from '@/src/data/categories';
import { Category } from '@/src/types';
import { RefreshCw, Save, Search, ShieldAlert, X, Play, Trash2, Music, Upload, Loader, Edit, ChevronLeft, ChevronRight, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { convertAudioToMp3 } from '@/lib/audioConverter';
import dynamic from 'next/dynamic';
const AudioPreview = dynamic(() => import('@/components/ui/AudioPreview'), { ssr: false });
import { Header } from '@/components/ui/Header';
import { OverlayCanvas, CANVAS_W, CANVAS_H, type OverlayParticle, type OverlayAnimationType } from '@/components/OverlayCanvas';
import MediaSubmissionsPanel from '@/components/admin/MediaSubmissionsPanel';
import MediaUploadForm from '@/components/console/MediaUploadForm';

function maskEmail(email: string): string {
  if (!email) return '';
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  if (localPart.length <= 3) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.substring(0, 2)}***${localPart.substring(localPart.length - 1)}@${domain}`;
}

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
  isAdmin: boolean;
  soundboardDisabled: boolean;
  permUploadImages: boolean;
  permUploadVideos: boolean;
  permUploadAudio: boolean;
  permTtsText: boolean;
  permTtsRecord: boolean;
  permEditNickname: boolean;
  permTriggerSounds: boolean;
  permTriggerMedia: boolean;
  permTriggerAnimations: boolean;
  permEditSounds: boolean;
  testimonial: string | null;
  testimonialApproved: boolean;
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

type StreamSettings = {
  id: number;
  is_muted: boolean;
  global_cooldown_seconds: number;
  personal_cooldown_seconds: number;
  overlay_active_at: string | null;
  overlay_notification_top: number;
  overlay_notification_left: number;
  overlay_notification_width: number;
  overlay_notification_badge_size: number;
  overlay_notification_content_size: number;
  overlay_notification_sender_size: number;
  overlay_media_top: number;
  overlay_media_left: number;
  overlay_media_width: number;
};

type AuditLog = {
  id: string;
  admin_email: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
};

type SoundItem = {
  id: string;
  name: string;
  url: string;
  file_path?: string | null;
  created_at: string;
  cooldown_seconds?: number | null;
  is_public?: boolean;
  owner_user_id?: string | null;
  media_type?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
  trim_start?: number | null;
  trim_end?: number | null;
  profiles?: { roblox_user: string | null; roblox_display_name: string | null; roblox_avatar_url: string | null } | null;
};


const getSoundColor = (soundId: string) => {
  switch (soundId) {
    case 'risa': return { text: 'text-[#FFC200]', badge: 'bg-[#FFC200]/10 text-[#FFC200] border-[#FFC200]/20' };
    case 'bocina': return { text: 'text-red-500', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
    case 'grito': return { text: 'text-pink-500', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
    case 'aplausos': return { text: 'text-emerald-400', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'suspenso': return { text: 'text-fuchsia-400', badge: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20' };
    case 'sorpresa': return { text: 'text-orange-500', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    case 'fallo': return { text: 'text-slate-400', badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20' };
    case 'victoria': return { text: 'text-sky-400', badge: 'bg-sky-500/10 text-sky-400 border-sky-400/20' };
    default: return { text: 'text-yellow-400', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
  }
};

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
  // Auth states
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Core entities
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

  // User CRUD / Edit States
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingUserTab, setEditingUserTab] = useState<'profile' | 'votes' | 'permissions'>('profile');
  const [updatingUser, setUpdatingUser] = useState(false);
  const [editForm, setEditForm] = useState({
    robloxUsername: '',
    tiktokUsername: '',
    linkStatus: 'none' as 'none' | 'pending' | 'approved' | 'rejected',
    rejectionReason: '',
  });
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [isValidatingRoblox, setIsValidatingRoblox] = useState(false);
  const [adminIsDuplicate, setAdminIsDuplicate] = useState(false);
  const [adminConflictedEmail, setAdminConflictedEmail] = useState('');
  const [adminForceClaim, setAdminForceClaim] = useState(false);
  const [adminVerifiedProfile, setAdminVerifiedProfile] = useState<{ id: number; displayName: string; avatarUrl: string | null; username: string } | null>(null);
  const [adminRobloxConfirmed, setAdminRobloxConfirmed] = useState(false);
  const [editFormSuccess, setEditFormSuccess] = useState<string | null>(null);

  // Active Nominee Drawer State
  const [editingNominee, setEditingNominee] = useState<AdminNominee | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Mobile menu states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // User pagination
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 12;

  // Tabs
  const [activeTab, setActiveTab] = useState<'nominees' | 'votes' | 'users' | 'applications' | 'agenda' | 'stream' | 'overlay-design' | 'soundboard' | 'media-submissions' | 'stream-status' | 'testimonials'>('nominees');
  
  // Slots & Stats
  const [slots, setSlots] = useState<InterviewSlotEnriched[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTime, setNewSlotTime] = useState('');
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [statsPhase, setStatsPhase] = useState(2);

  // Stream Settings & Services Status
  const [streamSettings, setStreamSettings] = useState<StreamSettings | null>(null);
  const [loadingStreamSettings, setLoadingStreamSettings] = useState(false);
  const [updatingStreamSettings, setUpdatingStreamSettings] = useState(false);
  const [vmStatus, setVmStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [pingingVM, setPingingVM] = useState(false);

  // Simulated Event Previews for Overlay Simulator
  const [simulatedEvent, setSimulatedEvent] = useState<{
    type: 'sound' | 'tts' | 'animation' | 'image_audio' | 'video' | 'audio' | 'image';
    content: string;
    senderRobloxUser: string;
    visible: boolean;
    image_url?: string;
    audio_url?: string;
    video_url?: string;
  } | null>(null);

  const [simulatedParticles, setSimulatedParticles] = useState<OverlayParticle[]>([]);
  const [simulatedAnimation, setSimulatedAnimation] = useState<OverlayAnimationType>(null);
  const [sendingTestEvent, setSendingTestEvent] = useState(false);

  // Canvas viewer state
  const [canvasContainerEl, setCanvasContainerEl] = useState<HTMLDivElement | null>(null);
  const canvasContainerRefCallback = useCallback((el: HTMLDivElement | null) => setCanvasContainerEl(el), []);
  const [canvasFitScale, setCanvasFitScale] = useState(0.3);
  const [zoomLevel, setZoomLevel] = useState<'fit' | 0.75 | 1 | 1.25>('fit');
  const [designerMobileTab, setDesignerMobileTab] = useState<'controls' | 'preview'>('controls');
  const [showBackgroundGuide, setShowBackgroundGuide] = useState(true);

  // Siempre mostrar el popup estático mientras el usuario edita
  const staticPreviewEvent = streamSettings ? {
    id: 'preview',
    type: 'tts' as const,
    content: '¡Hola stream, este es el pop-up!',
    sender_roblox_user: 'MilumonGaming',
    sender_avatar_url: adminVerifiedProfile?.avatarUrl || null,
  } : null;

  const CONFETTI_COLORS = ['#ff4500', '#ffd700', '#00ff7f', '#1e90ff', '#ff1493', '#8a2be2'];

  const triggerLocalTestEvent = (type: 'sound' | 'tts' | 'animation' | 'image_audio' | 'video' | 'audio' | 'image', content: string, extra?: { image_url?: string; audio_url?: string; video_url?: string }) => {
    setSimulatedEvent({
      type,
      content,
      senderRobloxUser: 'MilumonGaming',
      visible: true,
      ...extra
    });
    
    if (type === 'animation') {
      const animationType = content as 'confetti' | 'eggs' | 'sparkles';
      setSimulatedAnimation(animationType);
      
      const newParticles = Array.from({ length: 45 }).map((_, i) => {
        const isConf = animationType === 'confetti';
        const char = animationType === 'eggs' ? '🐣' : animationType === 'sparkles' ? '✨' : '';
        return {
          id: i,
          char,
          color: isConf ? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] : undefined,
          size: Math.floor(Math.random() * 12) + 10,
          left: Math.random() * 95,
          delay: Math.random() * 0.4,
          duration: Math.random() * 1.5 + 1.2,
          rotation: Math.floor(Math.random() * 360)
        };
      });
      setSimulatedParticles(newParticles);
      
      setTimeout(() => {
        setSimulatedAnimation(null);
        setSimulatedParticles([]);
      }, 6000);
    }

    setTimeout(() => {
      setSimulatedEvent(prev => prev && prev.type === type && prev.content === content ? { ...prev, visible: false } : prev);
    }, 8000);
  };

  const triggerLiveTestEvent = async (type: 'sound' | 'tts' | 'animation' | 'image_audio' | 'video' | 'audio' | 'image', content: string, extra?: { image_url?: string; audio_url?: string; video_url?: string }) => {
    setSendingTestEvent(true);
    try {
      const response = await apiFetch('/api/admin/stream/test-event', {
        method: 'POST',
        body: JSON.stringify({
          type,
          content,
          senderRobloxUser: 'PruebaAdmin',
          senderTiktokUser: 'prueba_admin',
          ...extra
        })
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al disparar evento de prueba');
      setStatus('¡Alerta de prueba enviada con éxito al OBS en vivo!');
      setTimeout(() => setStatus(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar evento de prueba');
    } finally {
      setSendingTestEvent(false);
    }
  };

  // Soundboard states
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(false);
  const [isAddSoundModalOpen, setIsAddSoundModalOpen] = useState(false);
  const [soundName, setSoundName] = useState('');
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [soundTrim, setSoundTrim] = useState<{ start: number; end: number } | null>(null);
  const [soundCooldown, setSoundCooldown] = useState<string>('0');
  const [editingSound, setEditingSound] = useState<SoundItem | null>(null);
  const [editingSoundName, setEditingSoundName] = useState('');
  const [editingSoundCooldown, setEditingSoundCooldown] = useState('0');
  const [editingSoundAudioEnabled, setEditingSoundAudioEnabled] = useState(false);
  const [editingSoundAudioFile, setEditingSoundAudioFile] = useState<File | null>(null);
  const [editingSoundAudioTrim, setEditingSoundAudioTrim] = useState<{ start: number; end: number } | null>(null);
  const [editingSoundAudioLoading, setEditingSoundAudioLoading] = useState(false);
  const [editingSoundAudioError, setEditingSoundAudioError] = useState('');
  const [editVideoTrimStart, setEditVideoTrimStart] = useState(0);
  const [editVideoTrimEnd, setEditVideoTrimEnd] = useState(0);
  const [editVideoDuration, setEditVideoDuration] = useState(0);
  const [submittingSound, setSubmittingSound] = useState(false);
  const [soundboardSubTab, setSoundboardSubTab] = useState<'audios' | 'multimedia' | 'videos'>('audios');
  const [isLocalTestMode, setIsLocalTestMode] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [moderatingTestimonial, setModeratingTestimonial] = useState<string | null>(null);

  // Calculated properties
  const totalWithNickname = useMemo(() => nominees.filter(n => n.nickname).length, [nominees]);
  const visibleNominees = useMemo(() => nominees.filter(n => n.is_visible).length, [nominees]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const isOverlayOnline = useMemo(() => {
    if (!streamSettings?.overlay_active_at) return false;
    try {
      const lastActive = new Date(streamSettings.overlay_active_at).getTime();
      return (currentTime - lastActive) < 30000;
    } catch {
      return false;
    }
  }, [currentTime, streamSettings]);

  const filteredNominees = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) return nominees;
    return nominees.filter((n) =>
      [n.roblox_user, n.display_name || '', n.nickname || '', String(n.roblox_user_id || '')]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [nominees, searchTerm]);

  const filteredUsers = useMemo(() => {
    if (!stats?.users) return [];
    const needle = userSearchTerm.trim().toLowerCase();
    if (!needle) return stats.users;
    return stats.users.filter((u) =>
      [u.email || '', u.robloxUser || '', u.robloxDisplayName || '', u.id || '']
        .some((val) => val.toLowerCase().includes(needle))
    );
  }, [stats, userSearchTerm]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const startIndex = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  }, [filteredUsers]);

  // Auth initialization
  const checkAdminRole = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setIsAdmin(false);
      setCheckingAuth(false);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!profile?.is_admin);
    } catch (err) {
      console.error('Error checking admin role:', err);
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      checkAdminRole(initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      checkAdminRole(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const apiFetch = useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const token = currentSession?.access_token;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token || ''}`,
      ...(init.headers as Record<string, string> || {}),
    };

    if (!(init.body instanceof FormData) && !headers['content-type'] && !headers['Content-Type']) {
      headers['content-type'] = 'application/json';
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    if (response.status === 401) {
      setIsAdmin(false);
      throw new Error('No autorizado para realizar esta acción');
    }

    return response;
  }, []);

  const loadNominees = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/admin/nominees');
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al cargar nominados');
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
  }, [isAdmin, apiFetch]);

  const loadStats = useCallback(async (phase = statsPhase) => {
    if (!isAdmin) return;
    setLoadingStats(true);
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/stats?phase=${phase}`);
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al cargar estadísticas');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, [isAdmin, apiFetch, statsPhase]);

  const loadInterviewSlots = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingSlots(true);
    setError(null);
    try {
      const response = await apiFetch('/api/admin/interviews');
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al cargar slots');
      setSlots(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar slots');
    } finally {
      setLoadingSlots(false);
    }
  }, [isAdmin, apiFetch]);

  const loadStreamSettings = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingStreamSettings(true);
    setError(null);
    try {
      const response = await apiFetch('/api/stream/settings');
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al cargar ajustes');
      setStreamSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar ajustes');
    } finally {
      setLoadingStreamSettings(false);
    }
  }, [isAdmin, apiFetch]);

  const loadSounds = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingSounds(true);
    try {
      const response = await apiFetch('/api/admin/sounds');
      const data = await readApiPayload(response);
      if (response.ok) {
        setSounds(Array.isArray(data.sounds) ? data.sounds : []);
      }
    } catch (err) {
      console.error('Error al cargar la botonera de sonidos:', err);
    } finally {
      setLoadingSounds(false);
    }
  }, [isAdmin, apiFetch]);

  const loadAuditLogs = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAuditLogs(true);
    try {
      const response = await apiFetch('/api/admin/logs');
      const data = await readApiPayload(response);
      if (response.ok) {
        setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error('Error al cargar logs de auditoría:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [isAdmin, apiFetch]);

  const pingAlexaVM = useCallback(async () => {
    if (!isAdmin) return;
    setPingingVM(true);
    try {
      const response = await apiFetch('/api/admin/ping-vm');
      const data = await readApiPayload(response);
      if (response.ok && data.status === 'online') {
        setVmStatus('online');
      } else {
        setVmStatus('offline');
      }
    } catch {
      setVmStatus('offline');
    } finally {
      setPingingVM(false);
    }
  }, [isAdmin, apiFetch]);

  const handleUpdateStreamSettings = async (updates: {
    isMuted?: boolean;
    globalCooldown?: number;
    personalCooldown?: number;
    overlayNotificationTop?: number;
    overlayNotificationLeft?: number;
    overlayNotificationWidth?: number;
    overlayNotificationBadgeSize?: number;
    overlayNotificationContentSize?: number;
    overlayNotificationSenderSize?: number;
    overlayMediaTop?: number;
    overlayMediaLeft?: number;
    overlayMediaWidth?: number;
  }) => {
    if (!isAdmin) return;
    setUpdatingStreamSettings(true);
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/stream/settings', {
        method: 'POST',
        body: JSON.stringify(updates),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al guardar ajustes');
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
    if (!isAdmin) return;

    void (async () => {
      await Promise.all([
        loadNominees(),
        loadStats(),
        loadInterviewSlots(),
        loadStreamSettings(),
        loadSounds(),
        loadAuditLogs(),
        pingAlexaVM(),
      ]);
    })();

    const channel = supabase
      .channel('admin_audit_logs_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_audit_logs' },
        (payload) => {
          setAuditLogs((prev) => [payload.new as AuditLog, ...prev]);
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      void pingAlexaVM();
      void loadStreamSettings();
    }, 15000);

    return () => {
      void channel.unsubscribe();
      clearInterval(interval);
    };
  }, [isAdmin, loadNominees, loadStats, loadInterviewSlots, loadStreamSettings, loadSounds, loadAuditLogs, pingAlexaVM]);

  // Load admin's own Roblox profile for preview avatar
  useEffect(() => {
    if (!isAdmin || !session?.access_token || adminVerifiedProfile) return;
    void (async () => {
      try {
        const res = await fetch('/api/profile/verify-roblox', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();
        if (data.profile?.roblox_avatar_url) {
          setAdminVerifiedProfile({
            id: data.profile.roblox_user_id || 0,
            displayName: data.profile.roblox_display_name || data.profile.roblox_user || 'Admin',
            avatarUrl: data.profile.roblox_avatar_url,
            username: data.profile.roblox_user || '',
          });
        }
      } catch {}
    })();
  }, [isAdmin, session?.access_token, adminVerifiedProfile]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'agenda') {
      void (async () => {
        await loadInterviewSlots();
      })();
    } else if (activeTab === 'stream' || activeTab === 'overlay-design') {
      void (async () => {
        await loadStreamSettings();
      })();
    } else if (activeTab === 'soundboard') {
      void (async () => {
        await loadSounds();
      })();
    }
  }, [activeTab, isAdmin, loadInterviewSlots, loadStreamSettings, loadSounds]);

  const handleVerifyLink = async (userId: string, action: 'approve' | 'reject' | 'revoke', rejectionReason?: string) => {
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/verify', {
        method: 'POST',
        body: JSON.stringify({ userId, action, rejectionReason })
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al procesar vinculación');
      setStatus(`Vinculación procesada con éxito (${action === 'approve' ? 'aprobada' : action === 'reject' ? 'rechazada' : 'revocada'}).`);
      await loadStats();
      await loadNominees();
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar vinculación');
    } finally {
    }
  };

  const handleCreateSlot = async () => {
    if (!newSlotDate || !newSlotTime) {
      setError('Ingresa una fecha y hora para el slot.');
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
      if (!response.ok) throw new Error(data.error || 'Error al crear slot');
      setStatus('Nuevo slot de entrevista creado.');
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
    const confirmed = window.confirm('¿Reprogramar esta entrevista? Se liberará el horario y se le notificará al candidato.');
    if (!confirmed) return;
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/interviews', {
        method: 'POST',
        body: JSON.stringify({ action: 'reschedule', slotId })
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al reprogramar');
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
        body: JSON.stringify({ action: 'delete', slotId })
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al eliminar slot');
      setStatus('Slot de entrevista eliminado.');
      await loadInterviewSlots();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar slot');
    }
  };

  const handleToggleAdminRole = async (targetUserId: string, currentIsAdmin: boolean) => {
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/roles', {
        method: 'POST',
        body: JSON.stringify({ userId: targetUserId, isAdmin: !currentIsAdmin }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar el rol');
      setStatus(`Rol de administrador actualizado con éxito.`);
      await loadStats();
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar rol');
    }
  };

  const handleToggleSoundboard = async (targetUserId: string, disabled: boolean) => {
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/users/soundboard-toggle', {
        method: 'POST',
        body: JSON.stringify({ userId: targetUserId, disabled }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar acceso');
      setStatus(disabled ? 'Botonera deshabilitada para este usuario.' : 'Botonera habilitada para este usuario.');
      await loadStats();
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar acceso');
    }
  };

  const startEditingUser = (u: AdminUser) => {
    setEditingUser(u);
    setEditingUserTab('profile');
    setEditForm({
      robloxUsername: u.robloxUser || '',
      tiktokUsername: u.tiktokUser || '',
      linkStatus: u.linkStatus || 'none',
      rejectionReason: u.rejectionReason || '',
    });
    setEditFormError(null);
    setAdminIsDuplicate(false);
    setAdminConflictedEmail('');
    setAdminForceClaim(false);
    setIsValidatingRoblox(false);
    setAdminVerifiedProfile(null);
    setAdminRobloxConfirmed(false);
    setEditFormSuccess(null);
  };

  const handleAdminVerifyRoblox = async () => {
    if (!editingUser) return;
    setEditFormError(null);
    setEditFormSuccess(null);
    setAdminIsDuplicate(false);
    setAdminConflictedEmail('');
    setAdminForceClaim(false);

    if (!editForm.robloxUsername.trim()) {
      setEditFormError('El nombre de usuario de Roblox es obligatorio.');
      return;
    }

    setIsValidatingRoblox(true);
    try {
      const response = await apiFetch('/api/profile/verify-roblox', {
        method: 'POST',
        body: JSON.stringify({
          robloxUsername: editForm.robloxUsername.trim(),
          userIdToExclude: editingUser.id,
        }),
      });
      const data = await readApiPayload(response);

      if (!response.ok) {
        setAdminVerifiedProfile(null);
        setAdminRobloxConfirmed(false);
        setEditFormSuccess(null);
        if (data.isDuplicate) {
          setAdminIsDuplicate(true);
          setAdminConflictedEmail(data.conflictedEmail || '');
          setEditFormError(null);
        } else {
          setEditFormError(data.error || 'No se pudo validar el usuario de Roblox.');
        }
      } else {
        setAdminVerifiedProfile({
          id: data.id,
          displayName: data.displayName,
          avatarUrl: data.avatarUrl || null,
          username: editForm.robloxUsername.trim(),
        });
        setAdminRobloxConfirmed(true);
        setEditFormSuccess('Usuario de Roblox verificado correctamente.');
      }
    } catch (err) {
      setEditFormError('Error al conectar con el servidor.');
    } finally {
      setIsValidatingRoblox(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (adminIsDuplicate && !adminForceClaim) {
      setEditFormError('Por favor confirma la reasignación forzada de la cuenta de Roblox.');
      return;
    }

    setUpdatingUser(true);
    setEditFormError(null);
    try {
      const response = await apiFetch('/api/admin/users/update', {
        method: 'POST',
        body: JSON.stringify({
          userId: editingUser.id,
          robloxUsername: editForm.robloxUsername,
          tiktokUsername: editForm.tiktokUsername,
          linkStatus: editForm.linkStatus,
          rejectionReason: editForm.rejectionReason,
          forceClaim: adminForceClaim,
        }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el usuario');
      
      setStatus('Usuario actualizado correctamente.');
      setEditingUser(null);
      await loadStats();
      await loadAuditLogs();
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : 'Error al actualizar el usuario';
      if (errMsg.includes('ya está vinculada')) {
        setAdminIsDuplicate(true);
        const emailMatch = errMsg.match(/correo\s+([^\s]+)/);
        if (emailMatch && emailMatch[1]) {
          setAdminConflictedEmail(emailMatch[1].replace(/\.$/, ''));
        }
        setEditFormError(null);
      } else {
        setEditFormError(errMsg);
      }
    } finally {
      setUpdatingUser(false);
    }
  };

  const handlePlaySound = async (soundId: string) => {
    try {
      const response = await apiFetch('/api/stream/events', {
        method: 'POST',
        body: JSON.stringify({
          type: 'sound',
          content: soundId
        }),
      });
      if (!response.ok) throw new Error('No se pudo reproducir el sonido');
      await loadAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlayMedia = async (type: 'image_audio' | 'video' | 'image', content: string, extra?: { image_url?: string; audio_url?: string; video_url?: string }) => {
    try {
      const response = await apiFetch('/api/stream/events', {
        method: 'POST',
        body: JSON.stringify({ type, content, ...extra }),
      });
      if (!response.ok) throw new Error('No se pudo enviar el media al stream');
      await loadAuditLogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSound = async (soundId: string) => {
    if (!window.confirm('¿Borrar este sonido de la botonera?')) return;
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/sounds/${soundId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('No se pudo borrar el sonido');
      await loadSounds();
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al borrar el sonido');
    }
  };

  const handleToggleSoundPublic = async (soundId: string, isPublic: boolean) => {
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/sounds/${soundId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic }),
      });
      if (!response.ok) throw new Error('No se pudo cambiar visibilidad');
      setSounds(prev => prev.map(s => s.id === soundId ? { ...s, is_public: isPublic } : s));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleUpdateSound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSound || !editingSoundName.trim()) return;
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/sounds/${editingSound.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editingSoundName.trim(),
          cooldownSeconds: parseInt(editingSoundCooldown) || 0,
          ...(editingSound.media_type === 'video' ? {
            trimStart: editVideoTrimStart,
            trimEnd: editVideoTrimEnd,
          } : {}),
        }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el sonido');
      setEditingSound(null);
      setEditVideoDuration(0);
      await loadSounds();
      await loadAuditLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el sonido');
    }
  };

  useEffect(() => {
    if (!editingSound || !editingSoundAudioEnabled) return;

    let cancelled = false;

    const loadEditingAudio = async () => {
      setEditingSoundAudioLoading(true);
      setEditingSoundAudioError('');

      try {
        const response = await fetch(editingSound.url);
        if (!response.ok) {
          throw new Error('No se pudo cargar el audio actual para recortarlo.');
        }

        const blob = await response.blob();
        const inferredName = editingSound.file_path?.split('/').pop() || `${editingSound.id}.mp3`;
        const file = new File([blob], inferredName, { type: blob.type || 'audio/mpeg' });

        if (!cancelled) {
          setEditingSoundAudioFile(file);
        }
      } catch (err) {
        if (!cancelled) {
          setEditingSoundAudioFile(null);
          setEditingSoundAudioError(err instanceof Error ? err.message : 'No se pudo cargar el audio actual.');
        }
      } finally {
        if (!cancelled) {
          setEditingSoundAudioLoading(false);
        }
      }
    };

    void loadEditingAudio();

    return () => {
      cancelled = true;
    };
  }, [editingSound, editingSoundAudioEnabled]);

  const handleUpdateSoundAudio = async () => {
    if (!editingSound || !editingSoundAudioFile || !editingSoundAudioTrim) {
      setError('Primero habilita el editor de audio y carga un archivo válido.');
      return;
    }

    setError(null);
    setStatus(null);

    try {
      const processedFile = await convertAudioToMp3(
        editingSoundAudioFile,
        editingSoundAudioTrim.start,
        editingSoundAudioTrim.end
      );

      const formData = new FormData();
      formData.append('file', processedFile, processedFile.name);
      formData.append('name', editingSoundName.trim() || editingSound.name);
      formData.append('cooldownSeconds', editingSoundCooldown);

      const response = await apiFetch(`/api/admin/sounds/${editingSound.id}`, {
        method: 'PATCH',
        body: formData,
      });

      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar el audio');

      setStatus('Audio actualizado correctamente.');
      setEditingSound(null);
      setEditingSoundAudioEnabled(false);
      setEditingSoundAudioFile(null);
      setEditingSoundAudioTrim(null);
      setEditingSoundAudioError('');
      await loadSounds();
      await loadAuditLogs();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el audio');
    }
  };

  const handleUploadSound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soundFile || !soundName.trim()) {
      setError('Por favor, ingresa un nombre y elige un archivo de sonido.');
      return;
    }
    setSubmittingSound(true);
    setError(null);
    try {
      let processedFile: File | Blob = soundFile;
      if (soundFile.type !== 'audio/mpeg' && !soundFile.name.endsWith('.mp3')) {
        setStatus('Convirtiendo audio a MP3...');
        processedFile = await convertAudioToMp3(
          soundFile,
          soundTrim?.start,
          soundTrim?.end
        );
      } else if (soundTrim) {
        // mp3 but user set a trim — still convert to apply the trim
        setStatus('Recortando audio...');
        processedFile = await convertAudioToMp3(
          soundFile,
          soundTrim.start,
          soundTrim.end
        );
      }

      const soundId = soundName.trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

      if (!soundId) throw new Error('El nombre del sonido no contiene caracteres válidos.');

      const fileExt = 'mp3';
      const fileName = `${soundId}-${Date.now()}.${fileExt}`;
      
      setStatus('Subiendo archivo...');
      
      const formData = new FormData();
      formData.append('file', processedFile, fileName);
      formData.append('name', soundName.trim());
      formData.append('id', soundId);
      formData.append('cooldownSeconds', soundCooldown);

      const response = await apiFetch('/api/admin/sounds', {
        method: 'POST',
        body: formData
      });

      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al registrar el sonido');

      setStatus('Sonido agregado a la botonera.');
      setSoundName('');
      setSoundFile(null);
      setSoundTrim(null);
      setSoundCooldown('0');
      setIsAddSoundModalOpen(false);
      await loadSounds();
      await loadAuditLogs();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir sonido');
    } finally {
      setSubmittingSound(false);
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
      if (!response.ok) throw new Error(data.error || 'No se pudo sincronizar');

      if (data.jobId) {
        setStatus('Sincronización iniciada en la VM. Esperando progreso...');
        let latest = data;
        while (!latest?.job || latest.job.status === 'queued' || latest.job.status === 'running') {
          await new Promise((resolve) => setTimeout(resolve, 2500));
          const statusResponse = await apiFetch(`/api/admin/sync?jobId=${encodeURIComponent(data.jobId)}`);
          latest = await readApiPayload(statusResponse);
          if (!statusResponse.ok) throw new Error(latest.error || 'Error de estado');

          const jobStatus = latest?.job?.status;
          const progress = latest?.job?.progress ?? 0;
          const total = latest?.job?.total ?? 0;

          if (jobStatus === 'running' || jobStatus === 'queued') {
            setStatus(`Sincronizando: ${progress}/${total || '?'} nominados...`);
            continue;
          }
          if (jobStatus === 'failed') throw new Error(latest?.job?.error || 'Sincronización falló');
          if (jobStatus === 'cancelled') throw new Error('Sincronización cancelada');
          break;
        }
        setStatus(latest?.job?.message || 'Sincronización finalizada.');
      } else {
        setStatus(`Sincronizado ${data.upserted || 0} nominados.`);
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
      setError('Ingresa un friendId válido');
      return;
    }
    setManualAdding(true);
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/nominees', {
        method: 'POST',
        body: JSON.stringify({ friendId, nickname: manualNickname }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo agregar manual');
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
        body: JSON.stringify({ id: nominee.id, nickname: nominee.nickname, isVisible: nominee.is_visible }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'Error al guardar');
      setNominees((current) => current.map((item) => {
        if (item.id !== nominee.id) return item;
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
      if (editingNominee?.id === nominee.id) {
        setEditingNominee(prev => prev ? { ...prev, nickname: nominee.nickname, is_visible: nominee.is_visible } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteNominee = async (nomineeId: string) => {
    const confirmed = window.confirm('¿Eliminar este nominado? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    setDeletingId(nomineeId);
    setError(null);
    setStatus(null);
    try {
      const response = await apiFetch('/api/admin/nominees', {
        method: 'DELETE',
        body: JSON.stringify({ id: nomineeId }),
      });
      const data = await readApiPayload(response);
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar');
      setNominees((current) => current.filter((item) => item.id !== nomineeId));
      setStatus('Nominado eliminado.');
      if (editingNominee?.id === nomineeId) {
        setDrawerOpen(false);
        setEditingNominee(null);
      }
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setDeletingId(null);
    }
  };

  const renderOverview = () => (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start animate-fade-in">
      <aside className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 lg:sticky lg:top-6 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div>
          <span className="text-[10px] text-gray-500 tracking-wide">Nominados</span>
          <h2 className="font-display font-bold text-lg text-white mt-1 leading-none">Pool Global</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed font-semibold">
            Sincroniza y gestiona el listado de amigos con el polo del Team Pollito.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar Polo'}
        </button>

        <div className="border border-neutral-700/60 rounded-2xl p-4 bg-[#2b2d31] space-y-3 ">
          <h3 className="font-display font-semibold text-xs text-gray-300">Alta Manual</h3>
          
          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Roblox User ID</span>
            <input
              value={manualFriendId}
              onChange={(e) => setManualFriendId(e.target.value)}
              placeholder="7332526030"
              className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors "
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Nickname Opcional</span>
            <input
              value={manualNickname}
              onChange={(e) => setManualNickname(e.target.value)}
              placeholder="Se usará Display Name"
              className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors "
            />
          </label>

          <button
            type="button"
            onClick={handleManualAddNominee}
            disabled={manualAdding}
            className="w-full py-2 bg-[#35373d] hover:bg-neutral-600/40 text-gray-200 border border-neutral-700/60 font-display font-medium text-sm rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
          >
            {manualAdding ? 'Agregando...' : 'Agregar Manual'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-3">
            <p className="text-[10px] font-medium text-gray-500">Nickname</p>
            <p className="text-base font-mono font-black text-white mt-1">{totalWithNickname}/{nominees.length}</p>
          </div>
          <div className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-3">
            <p className="text-[10px] font-medium text-gray-500">Visibles</p>
            <p className="text-base font-mono font-black text-white mt-1">{visibleNominees}</p>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-xs text-gray-500">Buscar Nominado</span>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Usuario, ID o apodo"
              className="w-full pl-9 pr-3 py-2 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors font-medium "
            />
          </div>
        </label>
      </aside>

      <main className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between border-b border-neutral-700/60 pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Listado Activo</span>
            <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Nominados Registrados</h2>
          </div>
          <span className="text-[10px] font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 rounded-2xl px-3 py-1">
            {filteredNominees.length} Nominados
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando nominados...</div>
        ) : filteredNominees.length === 0 ? (
          <div className="py-16 text-center bg-[#2b2d31] border border-dashed border-[#FFC200]/45 rounded-2xl">
            <p className="font-bold text-white text-sm">Sin registros de nominados</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Sincroniza el Polo o agrega uno manualmente.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredNominees.map((nominee) => (
              <article key={nominee.id} className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-[0_2px_8px_rgba(0,0,0,.4)] hover:scale-[1.01] hover:shadow-[0_6px_16px_rgba(0,0,0,.5)] transition-all">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-2xl border border-neutral-700/60 bg-[#2b2d31] overflow-hidden flex items-center justify-center shrink-0 ">
                    {nominee.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={nominee.profile_image_url} alt={nominee.roblox_user} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🐣</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-xs truncate" title={nominee.nickname || nominee.display_name || nominee.roblox_user}>
                      {nominee.nickname || nominee.display_name || nominee.roblox_user}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-medium truncate">@{nominee.roblox_user}</p>
                    
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${nominee.is_visible ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                        {nominee.is_visible ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-black/20 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNominee(nominee);
                      setDrawerOpen(true);
                    }}
                    className="flex-1 py-1.5 bg-[#2b2d31] hover:bg-[#20242D] border border-neutral-700/60 text-white text-xs font-display font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-[0.97]"
                  >
                    <Edit className="w-3 h-3 text-[#FFC200]" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNominee(nominee.id)}
                    disabled={deletingId === nominee.id}
                    className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-2xl border border-neutral-700/60 transition-colors cursor-pointer  active:scale-[0.97]"
                  >
                    {deletingId === nominee.id ? '...' : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  const renderVotes = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Recuento</span>
          <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Resultados Parciales</h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Votos acumulados en tiempo real por cada categoría activa.</p>
        </div>

        <div className="flex items-center gap-2 bg-[#2b2d31] border border-neutral-700/60 p-1 rounded-2xl shrink-0 ">
          <button
            type="button"
            onClick={() => setStatsPhase(1)}
            className={`px-3 py-1.5 font-display font-black text-xs uppercase rounded-2xl border border-transparent transition-all cursor-pointer ${
              statsPhase === 1 ? 'bg-[#FFC200] text-black border-black ' : 'text-gray-400 hover:text-white'
            }`}
          >
            Fase 1 (Votables)
          </button>
          <button
            type="button"
            onClick={() => setStatsPhase(2)}
            className={`px-3 py-1.5 font-display font-black text-xs uppercase rounded-2xl border border-transparent transition-all cursor-pointer ${
              statsPhase === 2 ? 'bg-[#FFC200] text-black border-black ' : 'text-gray-400 hover:text-white'
            }`}
          >
            Fase 2 (Finalistas)
          </button>
        </div>
      </div>

      {loadingStats ? (
        <div className="py-16 text-center text-gray-500 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando resultados...</div>
      ) : !stats?.categoryStats || stats.categoryStats.length === 0 ? (
        <div className="py-16 text-center bg-[#2b2d31] border border-dashed border-[#FFC200]/45 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,.3)]">
          <p className="font-bold text-white text-sm">Sin estadísticas registradas</p>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Los votos se procesan automáticamente cuando los usuarios participan.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {stats.categoryStats.map((cat) => {
            const maxVotes = Math.max(...cat.nominees.map((n) => n.votes), 1);
            return (
              <section key={cat.id} className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
                <h3 className="font-display font-semibold text-base text-white flex items-center gap-2">
                  <span>{cat.emoji || '🏆'}</span>
                  <span>{cat.title}</span>
                  <span className="text-[10px] bg-black border border-neutral-700/60 text-[#FFC200] rounded-2xl px-2.5 py-0.5 ml-auto font-mono ">
                    Total: {cat.totalVotes}
                  </span>
                </h3>

                <div className="space-y-3">
                  {cat.nominees.map((nominee) => {
                    const percentage = cat.totalVotes > 0 ? (nominee.votes / cat.totalVotes) * 100 : 0;
                    const isWinner = nominee.votes === maxVotes && nominee.votes > 0;
                    return (
                      <article key={nominee.id} className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-3space-y-2 ">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-8 h-8 rounded-2xl bg-[#2b2d31] border border-neutral-700/60 overflow-hidden flex items-center justify-center shrink-0">
                              {nominee.profile_image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={nominee.profile_image_url} alt={nominee.nickname || 'Nominee'} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm">🐣</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                                {nominee.nickname || nominee.roblox_user}
                                {isWinner && <span className="text-xs text-[#FFC200]" title="Líder actual">👑</span>}
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium truncate">@{nominee.roblox_user}</p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-bold text-white font-mono">{nominee.votes} votos</span>
                            <p className="text-[9px] text-gray-500 font-mono mt-0.5">{percentage.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="h-2 bg-[#111318] border border-black rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${isWinner ? 'bg-[#FFC200]' : 'bg-gray-600'}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-700/60 pb-4">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Padrón Electoral</span>
          <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Usuarios de la Comunidad</h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Administra accesos y supervisa el progreso de votaciones individuales.</p>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={userSearchTerm}
            onChange={(e) => {
              setUserSearchTerm(e.target.value);
              setUserPage(1);
            }}
            placeholder="Buscar por usuario, email o id..."
            className="w-full pl-9 pr-3 py-2 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors font-medium "
          />
        </div>
      </div>

      {loadingStats ? (
        <div className="py-16 text-center text-gray-500 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando usuarios...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 text-center bg-[#2b2d31] border border-dashed border-[#FFC200]/45 rounded-2xl">
          <p className="font-bold text-white text-sm">Sin usuarios encontrados</p>
          <p className="text-xs text-gray-400 mt-1 font-medium">Prueba con otro término de búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-700/60 text-gray-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-2">Usuario Roblox</th>
                  <th className="py-3 px-2">Detalles</th>
                  <th className="py-3 px-2">Estado</th>
                  <th className="py-3 px-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {paginatedUsers.map((u: AdminUser) => (
                  <tr key={u.id} className="hover:bg-[#2b2d31] transition-colors">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl border border-neutral-700/60 bg-[#2b2d31] overflow-hidden shrink-0 flex items-center justify-center ">
                          {u.robloxAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.robloxAvatarUrl} alt={u.robloxUser || 'User'} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                          ) : (
                            <span className="text-sm">🐣</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-white truncate flex items-center gap-1 text-xs">
                            {u.robloxDisplayName || 'Usuario'}
                            {u.robloxUser && <span className="text-[10px] text-emerald-400">✓</span>}
                          </h4>
                          <p className="text-[10px] text-gray-500 font-medium truncate">@{u.robloxUser || 'no-vinculado'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-gray-400 font-medium">
                      <p className="truncate max-w-[160px]">{u.email}</p>
                      {u.tiktokUser && <p className="text-[10px] text-gray-500">TikTok: @{u.tiktokUser}</p>}
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-flex items-center rounded-2xl px-1.5 py-0.5 text-[9px] font-semibold border ${
                        u.linkStatus === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : u.linkStatus === 'pending'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : u.linkStatus === 'rejected'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {u.linkStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEditingUser(u)}
                          className="px-2.5 py-1.5 bg-[#FFC200] hover:brightness-105 text-black border border-black rounded-2xl font-display font-medium text-xs transition-colors cursor-pointer active:scale-[0.97]"
                        >
                          Editar
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => handleToggleAdminRole(u.id, u.isAdmin)}
                          className={`px-2.5 py-1.5 border rounded-2xl font-display font-medium text-xs transition-colors cursor-pointer active:scale-[0.97] ${
                            u.isAdmin
                              ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                              : 'bg-[#2b2d31] hover:bg-[#20242D] text-white border border-neutral-700/60'
                          }`}
                        >
                          {u.isAdmin ? 'Quitar Admin' : 'Hacer Admin'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSoundboard(u.id, u.soundboardDisabled)}
                          className={`px-2.5 py-1.5 border rounded-2xl font-display font-medium text-xs transition-colors cursor-pointer active:scale-[0.97] ${
                            u.soundboardDisabled
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20'
                              : 'bg-[#2b2d31] hover:bg-[#20242D] text-gray-400 border border-neutral-700/60'
                          }`}
                          title={u.soundboardDisabled ? 'Habilitar botonera' : 'Deshabilitar botonera'}
                        >
                          {u.soundboardDisabled ? '🔓 Habilitar' : '🚫 Bloquear'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalUserPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-700/60 pt-4 text-xs font-semibold">
              <span className="text-gray-400">
                Mostrando usuarios <strong className="text-white">{(userPage - 1) * USERS_PER_PAGE + 1}</strong> a <strong className="text-white">{Math.min(userPage * USERS_PER_PAGE, filteredUsers.length)}</strong> de <strong className="text-white">{filteredUsers.length}</strong>
              </span>

              <div className="inline-flex items-center gap-1.5 bg-[#2b2d31] border border-neutral-700/60 p-1 rounded-2xl ">
                <button
                  type="button"
                  disabled={userPage === 1}
                  onClick={() => setUserPage(prev => Math.max(prev - 1, 1))}
                  className="p-1.5 hover:bg-neutral-800 text-white rounded-2xl border border-transparent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono font-bold text-white text-[10px]">
                  PAG {userPage} / {totalUserPages}
                </span>
                <button
                  type="button"
                  disabled={userPage === totalUserPages}
                  onClick={() => setUserPage(prev => Math.min(prev + 1, totalUserPages))}
                  className="p-1.5 hover:bg-neutral-800 text-white rounded-2xl border border-transparent transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderApplications = () => {
    const pendingUsers = stats?.users?.filter((u) => u.linkStatus === 'pending') || [];
    return (
      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] animate-fade-in">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Moderación</span>
          <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Postulaciones Pendientes</h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Autoriza o rechaza postulantes para acceder al rol de VIP (Onboarding de comunidad).</p>
        </div>

        {loadingStats ? (
          <div className="py-16 text-center text-gray-500 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando postulaciones...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="py-16 text-center bg-[#2b2d31] border border-dashed border-[#FFC200]/45 rounded-2xl">
            <p className="font-bold text-white text-sm">No hay postulaciones pendientes</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Todo al día. Las nuevas solicitudes aparecerán aquí automáticamente.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {pendingUsers.map((u: AdminUser) => (
              <article key={u.id} className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-[0_4px_8px_rgba(0,0,0,.2)]">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl border border-neutral-700/60 bg-[#2b2d31] overflow-hidden flex items-center justify-center shrink-0 ">
                    {u.robloxAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.robloxAvatarUrl} alt={u.robloxUser || 'User'} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                    ) : (
                      <span className="text-xl">🐣</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm truncate">{u.robloxDisplayName || u.robloxUser}</h3>
                    <p className="text-xs text-gray-400 font-medium truncate">@{u.robloxUser}</p>
                    {u.tiktokUser && <p className="text-[10px] text-gray-400 font-medium truncate mt-1">TikTok: @{u.tiktokUser}</p>}
                    <p className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{u.email}</p>
                  </div>
                </div>

                {/* Detección de Colisiones y Motivos de Reclamación */}
                {(() => {
                  const conflictedUser = stats?.users?.find(
                    (other) =>
                      other.id !== u.id &&
                      other.linkStatus === 'approved' &&
                      other.robloxUser &&
                      u.robloxUser &&
                      other.robloxUser.toLowerCase().trim() === u.robloxUser.toLowerCase().trim()
                  );
                  const isClaim = u.rejectionReason?.startsWith('RECLAMO:');
                  
                  if (!conflictedUser && !isClaim) return null;

                  return (
                    <div className="mt-2 p-2.5 bg-black/25 border border-neutral-700/60 rounded-xl space-y-1 text-[11px] font-sans">
                      {conflictedUser && (
                        <p className="text-amber-400 font-semibold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>Conflicto: Ya vinculada a {maskEmail(conflictedUser.email)}</span>
                        </p>
                      )}
                      {isClaim && (
                        <p className="text-gray-300">
                          <span className="font-semibold text-gray-400">Motivo del reclamo:</span>{" "}
                          <span className="italic text-white">&quot;{u.rejectionReason?.replace('RECLAMO:', '').trim()}&quot;</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div className="flex gap-2 pt-2 border-t border-black/20">
                  <a
                    href={`https://www.roblox.com/users/${u.robloxUser || ''}/profile`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 bg-[#2b2d31] hover:bg-[#20242D] text-white border border-neutral-700/60 text-center font-display font-medium text-xs rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    Ver Perfil ↗
                  </a>
                  <button
                    type="button"
                    onClick={() => handleVerifyLink(u.id, 'approve')}
                    className="flex-1 py-1.5 bg-[#FFC200] hover:bg-[#ffe359] text-black border border-neutral-700/60 font-display font-medium text-xs rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    Aceptar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('Motivo de rechazo:');
                      if (reason !== null) handleVerifyLink(u.id, 'reject', reason);
                    }}
                    className="py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-neutral-700/60 font-display font-medium text-xs rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
                  >
                    Rechazar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  };

  const handleTestimonialAction = async (userId: string, action: 'approve' | 'reject') => {
    setModeratingTestimonial(userId);
    try {
      const response = await apiFetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action })
      });
      if (response.ok) {
        await loadStats(statsPhase);
      } else {
        const err = await response.json();
          setError(err.error || 'No se pudo procesar la opinión');
      }
    } catch (err) {
      console.error(err);
      setError('Error de red al moderar opinión.');
    } finally {
      setModeratingTestimonial(null);
    }
  };

  const renderTestimonials = () => {
    const usersWithTestimonials = stats?.users?.filter(u => u.testimonial) || [];
    
    return (
      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] animate-fade-in text-white">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Moderación</span>
          <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Opiniones de la Comunidad</h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">Aprueba o elimina las opiniones dejadas por los usuarios.</p>
        </div>

        {usersWithTestimonials.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-[#FFC200]/45 rounded-2xl">
            <p className="font-bold text-white text-sm">No hay opiniones registradas</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Los usuarios aún no han escrito opiniones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {usersWithTestimonials.map((u) => (
              <div key={u.id} className="bg-[#232428] border border-neutral-700/50 p-4 rounded-xl flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1e1f22] overflow-hidden shrink-0">
                      {u.robloxAvatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.robloxAvatarUrl} alt={u.robloxUser || ''} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">🐣</div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs">{u.robloxDisplayName || 'Usuario'}</h4>
                      <p className="text-[10px] text-gray-500 font-medium">@{u.robloxUser || 'no-vinculado'}</p>
                    </div>
                    <span className={`ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      u.testimonialApproved 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {u.testimonialApproved ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </div>
                  <p className="text-xs italic text-gray-300 font-sans leading-relaxed bg-[#1e1f22] p-3 rounded-lg border border-neutral-800">
                    &quot;{u.testimonial}&quot;
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-neutral-800">
                  <button
                    disabled={moderatingTestimonial !== null}
                    onClick={() => handleTestimonialAction(u.id, 'reject')}
                    className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-xl font-display font-medium text-xs transition-colors cursor-pointer active:scale-[0.97] disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                  {!u.testimonialApproved && (
                    <button
                      disabled={moderatingTestimonial !== null}
                      onClick={() => handleTestimonialAction(u.id, 'approve')}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/20 text-emerald-400 rounded-xl font-display font-medium text-xs transition-colors cursor-pointer active:scale-[0.97] disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAgenda = () => (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start animate-fade-in">
      <aside className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-4 lg:sticky lg:top-6 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div>
          <span className="text-[10px] text-gray-500 tracking-wide">Agenda Viernes</span>
          <h2 className="font-display font-bold text-lg text-white mt-1 leading-none">Crear Horario</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed font-semibold">
            Habilita nuevos slots de entrevista para el directo.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Fecha</span>
            <input
              type="date"
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
              className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors "
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-gray-500">Hora</span>
            <input
              type="time"
              value={newSlotTime}
              onChange={(e) => setNewSlotTime(e.target.value)}
              className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors "
            />
          </label>

          <button
            type="button"
            onClick={handleCreateSlot}
            disabled={creatingSlot}
            className="w-full py-3 bg-[#FFC200] hover:bg-[#ffe359] text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50"
          >
            {creatingSlot ? 'Creando...' : 'Crear Slot'}
          </button>
        </div>
      </aside>

      <main className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between border-b border-neutral-700/60 pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Calendario</span>
            <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Slots de Entrevistas</h2>
          </div>
          <span className="text-[10px] font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 rounded-2xl px-3 py-1">
            {slots.length} Slots totales
          </span>
        </div>

        {loadingSlots ? (
          <div className="py-16 text-center text-gray-500 text-xs font-bold uppercase tracking-wider animate-pulse">Cargando slots...</div>
        ) : slots.length === 0 ? (
          <div className="py-16 text-center bg-[#2b2d31] border border-dashed border-[#FFC200]/45 rounded-2xl">
            <p className="font-bold text-white text-sm">No hay slots creados</p>
            <p className="text-xs text-gray-400 mt-1 font-medium">Crea un slot a la izquierda para comenzar.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {slots.map((slot) => {
              const isPast = new Date(`${slot.slot_date}T${slot.slot_time}`).getTime() < currentTime;
              return (
                <article key={slot.id} className={`bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-[0_4px_8px_rgba(0,0,0,.2)] ${
                  isPast ? 'opacity-50' : ''
                }`}>
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 px-2.5 py-0.5 rounded-2xl">
                        {slot.slot_time.substring(0, 5)}
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-2xl border ${
                        slot.is_booked 
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {slot.is_booked ? 'Reservado' : 'Libre'}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 font-bold mt-2">
                      📅 {slot.slot_date}
                    </p>

                    {slot.is_booked && slot.user && (
                      <div className="mt-3 border-t border-neutral-700/60/25 pt-2 space-y-1">
                        <p className="text-xs font-bold text-white truncate">{slot.user.roblox_display_name}</p>
                        <p className="text-[10px] text-gray-400 font-semibold truncate">@{slot.user.roblox_user}</p>
                        <p className="text-[10px] text-gray-500 truncate">{slot.user.email}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 pt-2 border-t border-black/25 mt-1">
                    {slot.is_booked && (
                      <button
                        type="button"
                        onClick={() => handleRescheduleSlot(slot.id)}
                        className="flex-1 py-1 bg-[#2b2d31] hover:bg-[#1c1f27] border border-neutral-700/60 text-white text-xs font-display font-medium rounded-xl cursor-pointer  active:scale-[0.97]"
                      >
                        Liberar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="py-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold rounded-2xl border border-neutral-700/60 cursor-pointer  active:scale-[0.97]"
                    >
                      Borrar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );

  const renderStreamSettingsTab = () => (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] items-start animate-fade-in">
      <aside className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-5 lg:sticky lg:top-6 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-medium text-red-400">Mute General</span>
          <h2 className="font-display font-bold text-lg text-white mt-1 leading-none">Panic Button</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed font-semibold">
            Silencia instantáneamente las interacciones de sonido y TTS del stream.
          </p>
        </div>

        {loadingStreamSettings ? (
          <div className="py-6 text-center text-gray-500 text-xs font-bold uppercase animate-pulse">Cargando estado...</div>
        ) : streamSettings ? (
          <div className="space-y-4">
            <div className={`border border-neutral-700/60 rounded-2xl p-4 text-center transition-all shadow-[0_4px_8px_rgba(0,0,0,.2)] ${
              streamSettings.is_muted ? 'bg-red-950/20 border-red-500/25' : 'bg-emerald-950/20 border-emerald-500/25'
            }`}>
              <span className="text-3xl block mb-2">{streamSettings.is_muted ? '🚫' : '🔊'}</span>
              <h3 className={`font-display font-black text-sm uppercase ${streamSettings.is_muted ? 'text-red-400' : 'text-emerald-400'}`}>
                {streamSettings.is_muted ? 'Stream Silenciado' : 'Consola Activa'}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 font-semibold leading-normal">
                {streamSettings.is_muted 
                  ? 'Ningún VIP puede reproducir sonidos o TTS.' 
                  : 'Los VIPs pueden enviar sonidos y mensajes.'}
              </p>
            </div>

            <button
              type="button"
              disabled={updatingStreamSettings}
              onClick={() => handleUpdateStreamSettings({ isMuted: !streamSettings.is_muted })}
              className={`w-full py-3 rounded-2xl border border-neutral-700/60 font-display font-black uppercase tracking-wider text-xs transition-colors cursor-pointer text-center shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] ${
                streamSettings.is_muted 
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-black' 
                  : 'bg-red-600 hover:bg-red-500 text-white'
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
          <div className="text-center text-xs text-gray-500 py-4 font-bold">Sin datos de configuración</div>
        )}
      </aside>

      <main className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-6 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between border-b border-neutral-700/60 pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Stream Control</span>
            <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Cooldowns del Stream</h2>
          </div>
          <span className="text-[10px] font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 rounded-2xl px-3 py-1">
            Ajustes en vivo
          </span>
        </div>

        {loadingStreamSettings ? (
          <div className="py-12 text-center text-gray-500 text-xs font-bold uppercase animate-pulse">Cargando cooldowns...</div>
        ) : streamSettings ? (
          <div className="space-y-4">
            <div className="border border-neutral-700/60 rounded-2xl p-4 bg-[#2b2d31] space-y-3 ">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-display font-semibold text-sm text-white">⏳ Cooldown Global</h3>
                  <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                    Espera mínima entre CUALQUIER sonido/TTS en el overlay (evita spam masivo).
                  </p>
                </div>
                <span className="text-xs font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 px-2.5 py-1 rounded-2xl ">
                  {streamSettings.global_cooldown_seconds === 0 ? 'Sin cooldown' : `${streamSettings.global_cooldown_seconds}s`}
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="1"
                  value={streamSettings.global_cooldown_seconds}
                  disabled={updatingStreamSettings}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                      setStreamSettings((prev) => prev ? { ...prev, global_cooldown_seconds: val } : null);
                  }}
                  className="w-full accent-[#FFC200] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-gray-500 font-mono font-bold">
                  <span>Sin cooldown</span>
                  <span>3 minutos</span>
                </div>
              </div>

              <button
                type="button"
                disabled={updatingStreamSettings}
                onClick={() => handleUpdateStreamSettings({ globalCooldown: streamSettings.global_cooldown_seconds })}
                className="py-2 px-3 bg-[#2b2d31] hover:bg-[#1a1c23] border border-neutral-700/60 text-xs font-display font-black uppercase rounded-2xl transition-colors cursor-pointer  active:scale-[0.97]"
              >
                Guardar Cooldown Global
              </button>
            </div>

            <div className="border border-neutral-700/60 rounded-2xl p-4 bg-[#2b2d31] space-y-3 ">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <h3 className="font-display font-semibold text-sm text-white">👤 Cooldown Personal (TTS)</h3>
                  <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                    Espera para un mismo usuario antes de enviar otro mensaje de voz (TTS).
                  </p>
                </div>
                <span className="text-xs font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 px-2.5 py-1 rounded-2xl ">
                  {streamSettings.personal_cooldown_seconds === 0 ? 'Sin cooldown' : streamSettings.personal_cooldown_seconds < 60 ? `${streamSettings.personal_cooldown_seconds}s` : `${Math.floor(streamSettings.personal_cooldown_seconds / 60)} min`}
                </span>
              </div>

              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="1200"
                  step="1"
                  value={streamSettings.personal_cooldown_seconds}
                  disabled={updatingStreamSettings}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                      setStreamSettings((prev) => prev ? { ...prev, personal_cooldown_seconds: val } : null);
                  }}
                  className="w-full accent-[#FFC200] cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-gray-500 font-mono font-bold">
                  <span>Sin cooldown</span>
                  <span>20 minutos</span>
                </div>
              </div>

              <button
                type="button"
                disabled={updatingStreamSettings}
                onClick={() => handleUpdateStreamSettings({ personalCooldown: streamSettings.personal_cooldown_seconds })}
                className="py-2 px-3 bg-[#2b2d31] hover:bg-[#1a1c23] text-white border border-neutral-700/60 text-xs font-display font-black uppercase rounded-2xl transition-colors cursor-pointer  active:scale-[0.97]"
              >
                Guardar Cooldown Personal
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-xs text-gray-500 py-12">No se pudieron recuperar las configuraciones del stream.</div>
        )}
      </main>
    </div>
  );

  // ─── ResizeObserver para el canvas del diseñador ───────────────────────────
  // Usamos un callback ref en vez de useRef para que el observer
  // se registre cuando el elemento se MONTA (al activar el tab),
  // no al montar el componente padre.
  useEffect(() => {
    if (!canvasContainerEl) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setCanvasFitScale(Math.min(height / CANVAS_H, width / CANVAS_W, 1));
    });
    observer.observe(canvasContainerEl);
    // Medir inmediatamente sin esperar el primer resize
    const { clientWidth: w, clientHeight: h } = canvasContainerEl;
    if (w > 0 && h > 0) {
      setCanvasFitScale(Math.min(h / CANVAS_H, w / CANVAS_W, 1));
    }
    return () => observer.disconnect();
  }, [canvasContainerEl]);

  const effectiveScale = zoomLevel === 'fit' ? canvasFitScale : canvasFitScale * zoomLevel;

  const renderOverlayDesignTab = () => (
    <div className="animate-fade-in h-full flex flex-col">
      {loadingStreamSettings ? (
        <div className="py-12 text-center text-gray-500 text-xs font-bold uppercase animate-pulse">Cargando diseñador...</div>
      ) : streamSettings ? (
        <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,.25)] overflow-hidden flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center gap-3 px-4 py-3 border-b border-neutral-700/60">
            <div>
              <h3 className="font-display font-semibold text-sm text-white">🎨 Diseñador del Pop-up en Vivo</h3>
              <p className="text-[10px] text-gray-400 mt-0.5 font-semibold">Modificá → Mirá el preview → Ajustá → Guardá → Probá en OBS</p>
            </div>
            <span className="text-[9px] font-bold bg-[#FFC200]/10 text-[#FFC200] border border-neutral-700/60 px-2 py-0.5 rounded-xl uppercase shrink-0">Canvas 720×1280</span>
          </div>

          {/* Mobile tab switcher */}
          <div className="flex lg:hidden border-b border-neutral-700/60">
            <button
              type="button"
              onClick={() => setDesignerMobileTab('controls')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase transition-colors ${
                designerMobileTab === 'controls'
                  ? 'bg-[#FFC200]/10 text-[#FFC200] border-b-2 border-[#FFC200]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              ⚙️ Controles
            </button>
            <button
              type="button"
              onClick={() => setDesignerMobileTab('preview')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase transition-colors ${
                designerMobileTab === 'preview'
                  ? 'bg-[#FFC200]/10 text-[#FFC200] border-b-2 border-[#FFC200]'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              📺 Preview OBS
            </button>
          </div>

          {/* Split Layout */}
          <div className="flex flex-col lg:flex-row flex-1 min-h-0">

            {/* ─── Controles ─────────────────────────────────────── */}
            <div className={`lg:w-[35%] lg:max-w-[380px] p-4 space-y-5 border-r border-neutral-700/60 flex-shrink-0 ${
              designerMobileTab === 'preview' ? 'max-lg:hidden' : ''
            }`}>

              {/* Posición */}
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Posición</p>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Distancia Superior (Y)</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_top ?? 48}px</span>
                  </label>
                  <input
                    type="range" min="0" max="1200" step="10"
                    value={streamSettings.overlay_notification_top ?? 48}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_top: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>0px (Arriba)</span><span>1200px (Abajo)</span></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Posición Horizontal (X) — Centro de la imagen</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_left ?? 50}%</span>
                  </label>
                  <input
                    type="range" min="10" max="90" step="1"
                    value={streamSettings.overlay_notification_left ?? 50}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_left: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>10% (Izquierda)</span><span>90% (Derecha)</span></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Ancho del Pop-up</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_width ?? 288}px</span>
                  </label>
                  <input
                    type="range" min="200" max="700" step="10"
                    value={streamSettings.overlay_notification_width ?? 288}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_width: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>200px (compacto)</span><span>700px (ancho)</span></div>
                </div>
              </div>

              {/* Tipografía */}
              <div className="space-y-3 pt-3 border-t border-neutral-700/40">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Tipografía</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold flex justify-between">
                      <span>Avatar</span>
                      <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_badge_size ?? 10}px</span>
                    </label>
                    <input
                      type="range" min="24" max="64" step="1"
                      value={streamSettings.overlay_notification_badge_size ?? 10}
                      disabled={updatingStreamSettings}
                      onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_badge_size: parseInt(e.target.value, 10) } : null)}
                      className="w-full accent-[#FFC200] cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>24px</span><span>64px</span></div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-400 font-bold flex justify-between">
                      <span>Remitente</span>
                      <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_sender_size ?? 11}px</span>
                    </label>
                    <input
                      type="range" min="8" max="30" step="1"
                      value={streamSettings.overlay_notification_sender_size ?? 11}
                      disabled={updatingStreamSettings}
                      onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_sender_size: parseInt(e.target.value, 10) } : null)}
                      className="w-full accent-[#FFC200] cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>8px</span><span>30px</span></div>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-gray-400 font-bold flex justify-between">
                      <span>Mensaje</span>
                      <span className="text-[#FFC200] font-mono">{streamSettings.overlay_notification_content_size ?? 14}px</span>
                    </label>
                    <input
                      type="range" min="8" max="40" step="1"
                      value={streamSettings.overlay_notification_content_size ?? 14}
                      disabled={updatingStreamSettings}
                      onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_notification_content_size: parseInt(e.target.value, 10) } : null)}
                      className="w-full accent-[#FFC200] cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>8px</span><span>40px</span></div>
                  </div>
                </div>
              </div>

              {/* Media Position */}
              <div className="space-y-3 pt-3 border-t border-neutral-700/40">
                <p className="text-[10px] uppercase tracking-widest font-bold text-gray-500">Posición Media (IMG+Audio / Video)</p>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Distancia Superior (Y)</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_media_top ?? 48}px</span>
                  </label>
                  <input
                    type="range" min="0" max="1200" step="10"
                    value={streamSettings.overlay_media_top ?? 48}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_media_top: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>0px (Arriba)</span><span>1200px (Abajo)</span></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Posición Horizontal (X) — Centro de la imagen</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_media_left ?? 50}%</span>
                  </label>
                  <input
                    type="range" min="10" max="90" step="1"
                    value={streamSettings.overlay_media_left ?? 50}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_media_left: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>10% (Izquierda)</span><span>90% (Derecha)</span></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-gray-400 font-bold flex justify-between">
                    <span>Ancho del Media</span>
                    <span className="text-[#FFC200] font-mono">{streamSettings.overlay_media_width ?? 400}px</span>
                  </label>
                  <input
                    type="range" min="200" max="700" step="10"
                    value={streamSettings.overlay_media_width ?? 400}
                    disabled={updatingStreamSettings}
                    onChange={(e) => setStreamSettings((prev) => prev ? { ...prev, overlay_media_width: parseInt(e.target.value, 10) } : null)}
                    className="w-full accent-[#FFC200] cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-mono"><span>200px (compacto)</span><span>700px (ancho)</span></div>
                </div>
              </div>

              {/* Guardar + Pruebas */}
              <div className="space-y-3 pt-3 border-t border-neutral-700/40">
                <button
                  type="button"
                  disabled={updatingStreamSettings}
                  onClick={() => handleUpdateStreamSettings({
                    overlayNotificationTop: streamSettings.overlay_notification_top,
                    overlayNotificationLeft: streamSettings.overlay_notification_left,
                    overlayNotificationWidth: streamSettings.overlay_notification_width,
                    overlayNotificationBadgeSize: streamSettings.overlay_notification_badge_size,
                    overlayNotificationContentSize: streamSettings.overlay_notification_content_size,
                    overlayNotificationSenderSize: streamSettings.overlay_notification_sender_size,
                    overlayMediaTop: streamSettings.overlay_media_top,
                    overlayMediaLeft: streamSettings.overlay_media_left,
                    overlayMediaWidth: streamSettings.overlay_media_width
                  })}
                  className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 border border-black text-black text-xs font-display font-black uppercase rounded-2xl transition-all cursor-pointer active:scale-[0.97] shadow-[2px_2px_0_0_#000] text-center"
                >
                  {updatingStreamSettings ? 'Guardando...' : '💾 Guardar Diseño del Pop-up'}
                </button>

                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 mb-2">Pruebas locales (Preview)</p>
                  <div className="grid gap-2 grid-cols-2">
                    <button type="button" onClick={() => triggerLocalTestEvent('sound', 'prueba_sonido')}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🔊 Sonido
                    </button>
                    <button type="button" onClick={() => triggerLocalTestEvent('tts', '¡Hola stream, este es un texto de prueba!')}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🗣️ TTS
                    </button>
                    <button type="button" onClick={() => triggerLocalTestEvent('animation', 'confetti')}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🎉 Confetti
                    </button>
                    <button type="button" onClick={() => triggerLocalTestEvent('animation', 'eggs')}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🐣 Huevos
                    </button>
                    <button type="button" onClick={() => triggerLocalTestEvent('image_audio', 'Prueba IMG+Audio', { image_url: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400', audio_url: '/sounds/sorpresa.mp3' })}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🖼️ IMG+Audio
                    </button>
                    <button type="button" onClick={() => triggerLocalTestEvent('video', 'Prueba Video', { video_url: 'https://www.w3schools.com/html/mov_bbb.mp4' })}
                      className="py-2 px-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 text-xs font-semibold rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-95 text-center">
                      🎬 Video
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] uppercase tracking-widest font-bold text-gray-600 mb-2">Probar en OBS en vivo</p>
                  <div className="flex gap-2">
                    <button type="button" disabled={sendingTestEvent}
                      onClick={() => triggerLiveTestEvent('sound', 'sorpresa')}
                      className="flex-1 py-2 px-2 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-display font-black uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-center">
                      {sendingTestEvent ? 'Enviando...' : '📡 Sonido OBS'}
                    </button>
                    <button type="button" disabled={sendingTestEvent}
                      onClick={() => triggerLiveTestEvent('tts', 'Mensaje de prueba en vivo desde el panel de administración')}
                      className="flex-1 py-2 px-2 bg-[#FFC200] hover:brightness-105 text-black text-[10px] font-display font-black uppercase rounded-xl transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-center">
                      {sendingTestEvent ? 'Enviando...' : '📡 TTS OBS'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Canvas real 720×1280 (65% del ancho en desktop) ─────────── */}
            <div
              className={`flex-1 flex flex-col bg-neutral-950/60 ${
                designerMobileTab === 'controls' ? 'max-lg:hidden' : ''
              }`}
            >
              {/* Barra de zoom */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-700/40 shrink-0">
                <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Canvas OBS</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowBackgroundGuide(!showBackgroundGuide)}
                    className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-colors border ${
                      showBackgroundGuide
                        ? 'bg-[#FFC200]/10 text-[#FFC200] border-[#FFC200]/30 hover:bg-[#FFC200]/20'
                        : 'bg-neutral-800 text-gray-400 border-transparent hover:bg-neutral-700'
                    }`}
                  >
                    🖼️ Guía: {showBackgroundGuide ? 'ON' : 'OFF'}
                  </button>

                  <div className="flex gap-1">
                    {(['fit', 0.75, 1, 1.25] as const).map((z) => (
                      <button
                        key={String(z)}
                        type="button"
                        onClick={() => setZoomLevel(z)}
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase transition-colors ${
                          zoomLevel === z
                            ? 'bg-[#FFC200] text-black'
                            : 'bg-neutral-800 text-gray-400 hover:bg-neutral-700'
                        }`}
                      >
                        {z === 'fit' ? 'Fit' : `${Math.round(z * 100)}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Viewport del canvas — resize vertical para estirarlo */}
              <div
                ref={canvasContainerRefCallback}
                className="flex-1 overflow-auto flex items-start justify-center p-4"
                style={{
                  minHeight: '320px',
                  resize: 'vertical',
                  overflow: 'auto',
                }}
              >
                <OverlayCanvas
                  mode="preview"
                  scale={effectiveScale}
                  settings={streamSettings}
                  event={
                    simulatedEvent?.visible
                      ? {
                          id: simulatedEvent.content,
                          type: simulatedEvent.type,
                          content: simulatedEvent.content,
                          sender_roblox_user: simulatedEvent.senderRobloxUser,
                          sender_avatar_url: adminVerifiedProfile?.avatarUrl || null,
                          image_url: simulatedEvent.image_url,
                          audio_url: simulatedEvent.audio_url,
                          video_url: simulatedEvent.video_url,
                        }
                      : staticPreviewEvent
                  }
                  staticPreview={!simulatedEvent?.visible}
                  animation={simulatedAnimation}
                  particles={simulatedParticles}
                  senderLabel={simulatedEvent?.visible ? simulatedEvent.senderRobloxUser : 'MilumonGaming'}
                  showBackgroundGuide={showBackgroundGuide}
                />
              </div>
            </div>

          </div>{/* ← cierra Split Layout */}
        </div>
      ) : (
        <div className="text-center text-xs text-gray-500 py-12">No se pudieron recuperar las configuraciones del stream.</div>
      )}
    </div>
  );

  const renderSoundboardTab = () => {
    const filteredSounds = sounds.filter(s => {
      if (soundboardSubTab === 'audios') return !s.media_type || s.media_type === 'audio';
      if (soundboardSubTab === 'multimedia') return s.media_type === 'image_audio' || s.media_type === 'image';
      if (soundboardSubTab === 'videos') return s.media_type === 'video';
      return true;
    });

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header + Sub-tabs */}
        <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-gray-400" />
              <h2 className="font-display font-bold text-base md:text-lg text-white">Banco</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLocalTestMode(!isLocalTestMode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                  isLocalTestMode
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-neutral-800 text-gray-500 border-neutral-700/60 hover:text-white'
                }`}
              >
                🎧 {isLocalTestMode ? 'PRUEBA: ON' : 'Escuchar local'}
              </button>
              <span className="text-[10px] bg-neutral-800 rounded-lg px-2 py-0.5 font-mono text-gray-500">
                {sounds.length} items
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { id: 'audios' as const, label: '🔊 Audios' },
              { id: 'multimedia' as const, label: '🖼️ Imágenes' },
              { id: 'videos' as const, label: '🎬 Videos' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSoundboardSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-display font-semibold border transition-all cursor-pointer ${
                  soundboardSubTab === tab.id
                    ? 'bg-[#FFC200] text-black border-[#FFC200] shadow-[2px_2px_0_0_#000]'
                    : 'bg-[#35373d] text-gray-400 border-neutral-700/60 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Form */}
        <MediaUploadForm
          session={session}
          onSuccess={() => { void loadSounds(); }}
        />

        {/* Sound Grid */}
        <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 md:p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
            {loadingSounds ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-xs font-bold text-gray-500 uppercase animate-pulse">
                <Loader className="w-7 h-7 animate-spin mb-2 text-[#FFC200]" />
                Cargando contenido...
              </div>
            ) : filteredSounds.length === 0 ? (
              <div className="py-12 text-center text-xs font-bold text-gray-500 border border-dashed border-[#FFC200]/45 rounded-2xl bg-black/20">
                {soundboardSubTab === 'audios' && 'No hay audios disponibles en este momento.'}
                {soundboardSubTab === 'multimedia' && 'No hay imágenes disponibles en este momento.'}
                {soundboardSubTab === 'videos' && 'No hay videos disponibles en este momento.'}
              </div>
            ) : (
              (() => {
                const grouped = filteredSounds.reduce((acc, sound) => {
                  const ownerName = sound.profiles?.roblox_display_name || sound.profiles?.roblox_user || 'Comunidad';
                  if (!acc[ownerName]) acc[ownerName] = { avatar: sound.profiles?.roblox_avatar_url ?? null, sounds: [] };
                  acc[ownerName].sounds.push(sound);
                  return acc;
                }, {} as Record<string, { avatar: string | null; sounds: typeof filteredSounds }>);

                return (
                  <div className="space-y-4 p-1">
                    {Object.entries(grouped).map(([ownerName, { avatar, sounds: ownerSounds }]) => (
                      <div key={ownerName}>
                        <div className="flex items-center gap-2.5 mb-2 px-1">
                          {avatar ? (
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-600 shrink-0">
                              <img src={avatar} alt={ownerName} className="w-full h-full object-cover" style={{ transform: 'scale(1.4)', transformOrigin: 'center 30%', objectPosition: 'center top' }} />
                            </div>
                          ) : (
                            <span className="text-sm">🐣</span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{ownerName}</span>
                          <span className="text-[9px] text-gray-600 font-mono">({ownerSounds.length})</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                          {ownerSounds.map((sound) => {
                            const soundStyles = getSoundColor(sound.id);
                            const handleCardClick = () => {
                              if (isLocalTestMode) {
                                const url = sound.audio_url || sound.url;
                                if (url) {
                                  try {
                                    const audio = new Audio(url);
                                    audio.volume = 0.5;
                                    void audio.play();
                                  } catch (e) {
                                    console.warn('Local play failure', e);
                                  }
                                }
                              } else if (sound.media_type === 'image_audio') {
                                handlePlayMedia('image_audio', sound.name, { image_url: sound.image_url || undefined, audio_url: sound.audio_url || sound.url });
                              } else if (sound.media_type === 'video') {
                                handlePlayMedia('video', sound.name, { video_url: sound.video_url || undefined });
                              } else if (sound.media_type === 'image') {
                                handlePlayMedia('image', sound.name, { image_url: sound.image_url || undefined });
                              } else {
                                handlePlaySound(sound.id);
                              }
                            };
                            return (
                              <div
                                key={sound.id}
                                onClick={handleCardClick}
                                className={`relative h-[135px] md:h-[140px] w-full bg-[#2b2d31] hover:bg-[#20242D] border border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between items-start transition-all duration-150 select-none overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,.25)] cursor-pointer group ${isLocalTestMode ? 'border-emerald-500/30' : ''}`}
                              >
                                <div className="flex items-center justify-between w-full relative z-10">
                                  {sound.image_url ? (
                                    <img src={sound.image_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-neutral-700/60" />
                                  ) : (
                                    <span className="text-lg">
                                      {sound.media_type === 'video' ? '🎬' : sound.media_type === 'image' ? '🖼️' : '🔊'}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSound(sound);
                                        setEditingSoundName(sound.name);
                                        setEditingSoundCooldown(String(sound.cooldown_seconds ?? 0));
                                        setEditingSoundAudioEnabled(false);
                                        setEditingSoundAudioFile(null);
                                        setEditingSoundAudioTrim(null);
                                        setEditingSoundAudioLoading(false);
                                        setEditingSoundAudioError('');
                                        setEditVideoTrimStart(sound.trim_start ?? 0);
                                        setEditVideoTrimEnd(sound.trim_end ?? 0);
                                        setEditVideoDuration(0);
                                      }}
                                      className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-neutral-700 text-gray-400 hover:text-white border border-neutral-600 cursor-pointer"
                                    >✏️</button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSoundPublic(sound.id, !(sound.is_public ?? true));
                                      }}
                                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded border cursor-pointer ${
                                        sound.is_public
                                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                          : 'bg-neutral-700 text-gray-400 border-neutral-600 hover:bg-neutral-700'
                                      }`}
                                      title={sound.is_public ? 'Público — click para hacer privado' : 'Privado — click para hacer público'}
                                    >
                                      {sound.is_public ? '🌍' : '🔒'}
                                    </button>
                                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-2xl border ${soundStyles.badge}`}>
                                      {sound.cooldown_seconds && sound.cooldown_seconds > 0 ? `CD: ${sound.cooldown_seconds}s` : 'LISTO'}
                                    </span>
                                  </div>
                                </div>

                                <span className={`block truncate font-display font-semibold text-xs md:text-sm relative z-10 leading-none mb-1 text-left w-full ${soundStyles.text}`} title={sound.name}>
                                  {sound.name}
                                </span>

                                <div className="flex items-center justify-between w-full relative z-10">
                                  <span className="text-[9px] text-gray-500 font-bold">
                                    {sound.cooldown_seconds ? `CD: ${sound.cooldown_seconds}s` : 'Sin CD'}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteSound(sound.id);
                                    }}
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        </div>

      {/* Modal para Editar Sonido */}
      <AnimatePresence>
        {editingSound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#2b2d31] border border-neutral-700/60 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-neutral-700/60 pb-3">
                <h3 className="font-display font-bold text-white text-base">Editar</h3>
                <button
                  type="button"
                  onClick={() => { setEditingSound(null); setEditVideoDuration(0); }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateSound} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-1">
                    <span className="text-xs text-gray-500">Nombre del sonido</span>
                    <input
                      type="text"
                      value={editingSoundName}
                      onChange={(e) => setEditingSoundName(e.target.value)}
                      className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
                    />
                  </label>

                  <label className="block space-y-1">
                    <span className="text-xs text-gray-500">Cooldown personalizado (segundos)</span>
                    <input
                      type="number"
                      min={0}
                      value={editingSoundCooldown}
                      onChange={(e) => setEditingSoundCooldown(e.target.value)}
                      className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
                    />
                  </label>
                </div>

                {/* ── Video/Image Preview ── */}
                {editingSound.media_type === 'video' && editingSound.video_url && (
                  <div className="space-y-2">
                    <label className="block space-y-1">
                      <span className="text-xs text-gray-500">Vista previa del video</span>
                      <video controls src={editingSound.video_url} className="w-full max-h-48 rounded-xl"
                        onLoadedMetadata={(e) => {
                          const dur = e.currentTarget.duration;
                          setEditVideoDuration(dur);
                          if (editVideoTrimEnd === 0 || editVideoTrimEnd > dur) {
                            setEditVideoTrimEnd(dur);
                          }
                        }}
                      />
                    </label>
                    {editVideoDuration > 0 && (
                      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Recortar video</p>
                        <div className="flex items-center gap-3">
                          <label className="text-[9px] text-gray-500 font-bold w-12 text-right">Inicio</label>
                          <input type="range" min={0} max={editVideoDuration} step={0.1} value={editVideoTrimStart}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setEditVideoTrimStart(v);
                              if (v >= editVideoTrimEnd) setEditVideoTrimEnd(Math.min(v + 1, editVideoDuration));
                            }}
                            className="flex-1 accent-[#FFC200] h-1" />
                          <span className="text-[9px] font-mono text-gray-400 w-10">{editVideoTrimStart.toFixed(1)}s</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="text-[9px] text-gray-500 font-bold w-12 text-right">Fin</label>
                          <input type="range" min={0} max={editVideoDuration} step={0.1} value={editVideoTrimEnd}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              setEditVideoTrimEnd(v);
                              if (v <= editVideoTrimStart) setEditVideoTrimStart(Math.max(v - 1, 0));
                            }}
                            className="flex-1 accent-[#FFC200] h-1" />
                          <span className="text-[9px] font-mono text-gray-400 w-10">{editVideoTrimEnd.toFixed(1)}s</span>
                        </div>
                        <p className="text-[9px] text-gray-500 text-center">
                          Duración recortada: <span className="font-mono text-[#FFC200]">{(editVideoTrimEnd - editVideoTrimStart).toFixed(1)}s</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {editingSound.media_type === 'image' && editingSound.image_url && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Vista previa</span>
                    <img src={editingSound.image_url} alt="" className="w-full max-h-48 object-contain rounded-xl" />
                  </div>
                )}
                {editingSound.media_type === 'image_audio' && editingSound.image_url && (
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Vista previa</span>
                    <div className="flex gap-2">
                      <img src={editingSound.image_url} alt="" className="w-1/2 max-h-40 object-contain rounded-xl" />
                      {editingSound.audio_url && <audio controls src={editingSound.audio_url} className="w-1/2" />}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-neutral-700/60 bg-[#35373d] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-white">Audio</p>
                      <p className="text-[11px] text-gray-500">Activa esto si quieres recortar o reemplazar el archivo ya subido.</p>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editingSoundAudioEnabled}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          setEditingSoundAudioEnabled(enabled);
                          if (!enabled) {
                            setEditingSoundAudioFile(null);
                            setEditingSoundAudioTrim(null);
                            setEditingSoundAudioError('');
                          }
                        }}
                        className="accent-[#FFC200]"
                      />
                      Editar audio
                    </label>
                  </div>

                  {editingSoundAudioEnabled && (
                    <div className="space-y-3 pt-1">
                      {editingSoundAudioLoading ? (
                        <div className="py-8 text-center text-xs text-gray-400 uppercase tracking-wider font-bold animate-pulse">
                          Cargando audio actual...
                        </div>
                      ) : (
                        <>
                          <label className="block space-y-1">
                            <span className="text-xs text-gray-500">Reemplazar por un archivo nuevo</span>
                            <div className="relative border border-dashed border-[#FFC200]/45 rounded-2xl p-4 bg-[#2b2d31] hover:bg-[#20242D] cursor-pointer transition-colors text-center">
                              <input
                                type="file"
                                accept="audio/*,video/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0] || null;
                                  setEditingSoundAudioFile(file);
                                  setEditingSoundAudioTrim(null);
                                  setEditingSoundAudioError('');
                                }}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              />
                              <Music className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                              <p className="text-[10px] text-gray-400 font-medium truncate">
                                {editingSoundAudioFile ? editingSoundAudioFile.name : 'Elegir archivo para recortar o reemplazar'}
                              </p>
                            </div>
                          </label>

                          {editingSoundAudioError && (
                            <p className="text-[10px] font-semibold text-amber-400">{editingSoundAudioError}</p>
                          )}

                          {editingSoundAudioFile && (
                            <AudioPreview
                              file={editingSoundAudioFile}
                              embedded
                              onTrimChange={(start, end) => setEditingSoundAudioTrim({ start, end })}
                            />
                          )}

                          <button
                            type="button"
                            onClick={handleUpdateSoundAudio}
                            disabled={!editingSoundAudioFile || !editingSoundAudioTrim}
                            className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Guardar audio recortado
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                  onClick={() => { setEditingSound(null); setEditVideoDuration(0); }}
                    className="flex-1 py-2 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-[#FFC200] hover:brightness-105 text-black font-semibold text-sm rounded-xl transition-all cursor-pointer"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

  const renderStreamStatusMobileTab = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Diagnóstico</span>
        <h2 className="font-display font-semibold text-lg text-white mt-0.5 leading-none">Estado del Stream</h2>
        <p className="text-xs text-gray-400 mt-1 font-semibold">Conectividad de servidores y servicios de automatización en tiempo real.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center justify-between p-4 bg-[#2b2d31] rounded-2xl border border-neutral-700/60 ">
          <span className="text-xs text-gray-300 font-bold">Supabase Database</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>

        <div className="flex items-center justify-between p-4 bg-[#2b2d31] rounded-2xl border border-neutral-700/60 ">
          <span className="text-xs text-gray-300 font-bold">Supabase Storage</span>
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
        </div>

        <div className="flex items-center justify-between p-4 bg-[#2b2d31] rounded-2xl border border-neutral-700/60 ">
          <span className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
            Alexa VM (Roblox)
            {pingingVM && <RefreshCw className="w-3.5 h-3.5 text-gray-500 animate-spin" />}
          </span>
          <span className={`h-2 w-2 rounded-full ${
            vmStatus === 'online' 
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
              : vmStatus === 'checking'
              ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
              : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
          }`} />
        </div>

        <div className="flex items-center justify-between p-4 bg-[#2b2d31] rounded-2xl border border-neutral-700/60 ">
          <span className="text-xs text-gray-300 font-bold">OBS WebSocket (Overlay)</span>
          <span className={`h-2 w-2 rounded-full ${
            isOverlayOnline 
              ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
              : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
          }`} />
        </div>
      </div>

      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-4 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <h3 className="font-display font-semibold text-xs text-gray-300">Bitácora de Auditoría</h3>
        
        <div className="border border-neutral-700/60 bg-[#2b2d31] rounded-2xl p-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin ">
          {loadingAuditLogs ? (
            <p className="text-xs text-gray-500 text-center uppercase tracking-wider py-4 animate-pulse">Cargando logs...</p>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center uppercase tracking-wider py-4">Sin actividad reciente</p>
          ) : (
            auditLogs.map((log) => {
              const time = formatDate(log.created_at);
              return (
                <div key={log.id} className="text-xs border-b border-black/20 pb-3 last:border-0 last:pb-0">
                  <p className="font-bold text-[#FFC200] text-xs">{log.action}</p>
                  <p className="text-gray-400 font-semibold mt-1 truncate">{log.admin_email}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{time}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'nominees':
        return renderOverview();
      case 'votes':
        return renderVotes();
      case 'users':
        return renderUsers();
      case 'applications':
        return renderApplications();
      case 'agenda':
        return renderAgenda();
      case 'stream':
        return renderStreamSettingsTab();
      case 'overlay-design':
        return renderOverlayDesignTab();
      case 'soundboard':
        return renderSoundboardTab();
      case 'media-submissions':
        return <MediaSubmissionsPanel apiFetch={apiFetch} token="" />;
      case 'stream-status':
        return renderStreamStatusMobileTab();
      case 'testimonials':
        return renderTestimonials();
      default:
        return renderOverview();
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#2b2d31] text-gray-200 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader className="w-8 h-8 text-[#FFC200] animate-spin" />
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Validando permisos de administración...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#2b2d31] text-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,.25)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#FFC200]"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#FFC200] text-black flex items-center justify-center font-bold text-xl border border-neutral-700/60 ">
              🛡️
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white leading-none">MILUMON ADMIN</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Consola de Control</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-400 mb-6 leading-relaxed">
            Inicia sesión con tu cuenta de administrador autorizada para acceder a la gestión del stream, nominados y usuarios.
          </p>

          {error && (
            <div className="bg-red-950/40 border border-red-500/20 rounded-2xl p-3 mb-4 text-xs font-bold text-red-400">
              ⚠️ {error}
            </div>
          )}

          <button
            type="button"
            onClick={async () => {
              setError(null);
              const { error: loginError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                  redirectTo: window.location.origin + '/admin'
                }
              });
              if (loginError) setError(loginError.message);
            }}
            className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
          >
            Entrar con Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#2b2d31] text-gray-200 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_8px_24px_rgba(0,0,0,.5)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-red-500"></div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-xl border border-neutral-700/60 ">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg text-white leading-none">ACCESO RESTRINGIDO</h1>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Permisos Insuficientes</p>
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-400 mb-4 leading-relaxed">
            Tu cuenta <strong className="text-white font-bold">{session.user.email}</strong> no posee rol de administrador. Si crees que esto es un error, por favor contacta al propietario del stream.
          </p>

          <div className="flex flex-col gap-2">
            <Link
              href="/"
              className="w-full py-3 bg-[#2b2d31] hover:bg-[#20242D] text-white font-display font-medium text-sm rounded-xl border border-neutral-700/60 transition-all flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              Volver al Inicio
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-display font-medium text-sm rounded-xl border border-neutral-700/60 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderSidebarContent = () => {
    const navBtnClass = (tab: string) =>
      `w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-display font-semibold transition-all cursor-pointer ${
        activeTab === tab
          ? 'bg-[#FFC200]/10 text-[#FFC200]'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`;

    return (
      <>
        <div className="space-y-5">
          {/* Módulo: Comunidad */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-2">Comunidad</p>
            <button type="button" onClick={() => { setActiveTab('nominees'); setMobileMenuOpen(false); }} className={navBtnClass('nominees')}>
              <span>👥</span> Overview Nominados
            </button>
            <button type="button" onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} className={navBtnClass('users')}>
              <span>👑</span> Usuarios
            </button>
            <button type="button" onClick={() => { setActiveTab('applications'); setMobileMenuOpen(false); }} className={navBtnClass('applications')}>
              <span>📝</span> Postulaciones
            </button>
            <button type="button" onClick={() => { setActiveTab('testimonials'); setMobileMenuOpen(false); }} className={navBtnClass('testimonials')}>
              <span>💬</span> Opiniones
            </button>
          </div>

          {/* Módulo: Awards */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-2">Awards</p>
            <button type="button" onClick={() => { setActiveTab('votes'); setMobileMenuOpen(false); }} className={navBtnClass('votes')}>
              <span>📊</span> Recuento de Votos
            </button>
            <button type="button" onClick={() => { setActiveTab('agenda'); setMobileMenuOpen(false); }} className={navBtnClass('agenda')}>
              <span>📅</span> Agenda Viernes
            </button>
          </div>

          {/* Módulo: Stream */}
          <div className="space-y-0.5">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-2">Stream</p>
            <button type="button" onClick={() => { setActiveTab('stream'); setMobileMenuOpen(false); }} className={navBtnClass('stream')}>
              <span>📺</span> Ajustes de Cooldown
            </button>
            <button type="button" onClick={() => { setActiveTab('overlay-design'); setMobileMenuOpen(false); }} className={navBtnClass('overlay-design')}>
              <span>🎨</span> Diseño del Pop-up
            </button>
            <button type="button" onClick={() => { setActiveTab('soundboard'); setMobileMenuOpen(false); }} className={navBtnClass('soundboard')}>
              <span>🔊</span> Botonera OBS
            </button>
            <button type="button" onClick={() => { setActiveTab('media-submissions'); setMobileMenuOpen(false); }} className={navBtnClass('media-submissions')}>
              <span>🖼️</span> Media de Usuarios
            </button>
          </div>

          {/* Módulo Móvil: Diagnóstico */}
          <div className="space-y-0.5 block lg:hidden">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-2">Diagnóstico</p>
            <button type="button" onClick={() => { setActiveTab('stream-status'); setMobileMenuOpen(false); }} className={navBtnClass('stream-status')}>
              <span>📡</span> Estado del Directo
            </button>
          </div>
        </div>

        {/* Sidebar footer */}
        <div className="space-y-2 pt-4 border-t border-white/5 mt-auto">
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-white/8 rounded-xl text-sm font-display font-semibold text-gray-300 hover:text-white transition-colors decoration-transparent"
          >
            ← Volver al Landing
          </Link>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/15 text-red-400 rounded-xl text-sm font-display font-semibold transition-colors cursor-pointer"
          >
            Cerrar Sesión
          </button>
        </div>
      </>
    );
  };
  return (
    <div className="min-h-screen bg-[#1e1f22] text-gray-200 font-sans flex flex-col antialiased">
      {/* HEADER NAVBAR */}
      <Header
        session={session}
        isAdmin={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          window.location.reload();
        }}
        panelName="Admin"
        panelHref="/admin"
        isMobileMenuOpen={mobileMenuOpen}
        setIsMobileMenuOpen={setMobileMenuOpen}
        theme="dark"
      />

      {/* 2. BODY CONTAINER */}
      <div className="flex flex-1 overflow-hidden min-h-0 relative">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="w-[260px] bg-[#24262b] hidden lg:flex flex-col justify-between shrink-0 p-4 select-none">
          {renderSidebarContent()}
        </aside>

        {/* MOBILE DRAWER LATERAL (Con Framer Motion, estilo Discord) */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop de cierre */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
              />

              {/* Sidebar deslizable */}
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed top-0 left-0 h-full w-[260px] z-50 bg-[#24262b] p-4 shadow-xl flex flex-col justify-between select-none lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 shrink-0">
                  <span className="text-xs font-semibold text-gray-400">Navegación</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 flex flex-col justify-between overflow-y-auto scrollbar-none">
                  {renderSidebarContent()}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN DISPLAY AREA */}
        <main className={`flex-grow overflow-y-auto bg-[#1e1f22] min-w-0 ${
          activeTab === 'overlay-design' ? 'flex flex-col p-0' : 'p-4 sm:p-6'
        }`}>
          {error && (
            <div className="bg-red-950/40 border border-neutral-700/60 rounded-2xl p-4 text-xs font-bold text-red-400 mb-6 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,.3)]">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">✕</button>
            </div>
          )}
          {status && (
            <div className="bg-emerald-950/30 border border-neutral-700/60 rounded-2xl p-4 text-xs font-bold text-emerald-400 mb-6 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,.3)]">
              <span>{status}</span>
              <button onClick={() => setStatus(null)} className="text-emerald-400 hover:text-emerald-300">✕</button>
            </div>
          )}

          <div className={activeTab === 'overlay-design' ? 'flex-1 flex flex-col min-h-0 p-4 sm:p-6' : ''}>
            {renderActiveTabContent()}
          </div>
        </main>

        {/* 3. DESKTOP CONTROL COLUMN / STATUS (Oculto en móvil) */}
        <aside className="w-[320px] bg-[#111318] border-l-4 border-black p-5 hidden lg:flex flex-col justify-between shrink-0 select-none">
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-[11px] font-display font-medium text-gray-400 uppercase tracking-wider">Estado del Stream</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-[#171A20] rounded-xl border border-neutral-700/60 ">
                  <span className="text-xs text-gray-300 font-bold">Supabase Database</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171A20] rounded-xl border border-neutral-700/60 ">
                  <span className="text-xs text-gray-300 font-bold">Supabase Storage</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171A20] rounded-xl border border-neutral-700/60 ">
                  <span className="text-xs text-gray-300 font-bold flex items-center gap-1.5">
                    Alexa VM (Roblox)
                    {pingingVM && <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${
                    vmStatus === 'online' 
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                      : vmStatus === 'checking'
                      ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]'
                      : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  }`} />
                </div>

                <div className="flex items-center justify-between p-3 bg-[#171A20] rounded-xl border border-neutral-700/60 ">
                  <span className="text-xs text-gray-300 font-bold">OBS WebSocket (Overlay)</span>
                  <span className={`h-2 w-2 rounded-full ${
                    isOverlayOnline 
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' 
                      : 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                  }`} />
                </div>
              </div>
            </div>

            <div className="space-y-3 flex-grow flex flex-col min-h-0">
              <h3 className="text-[11px] font-display font-medium text-gray-400 uppercase tracking-wider">Actividad Reciente</h3>
              
              <div className="flex-1 overflow-y-auto max-h-[360px] border border-neutral-700/60 bg-[#171A20] rounded-xl p-3 space-y-2.5 scrollbar-thin ">
                {loadingAuditLogs ? (
                  <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider py-4 animate-pulse">Cargando bitácora...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-[10px] text-gray-500 text-center uppercase tracking-wider py-4">Sin actividad registrada</p>
                ) : (
                  auditLogs.slice(0, 15).map((log) => {
                    const time = formatDate(log.created_at);
                    return (
                      <div key={log.id} className="text-[10px] border-b border-black/40 pb-2 last:border-0 last:pb-0">
                        <p className="font-bold text-[#FFC200]">{log.action}</p>
                        <p className="text-gray-400 font-medium mt-0.5 truncate">{log.admin_email}</p>
                        <p className="text-gray-500 text-[9px] mt-0.5">{time}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t-2 border-black text-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
              Design specs by Milumon
            </span>
          </div>
        </aside>
      </div>

      {/* DRAWER LATERAL INTERACTIVO PARA EDICIÓN DE NOMINADO */}
      <AnimatePresence>
        {drawerOpen && editingNominee && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setDrawerOpen(false);
                setEditingNominee(null);
              }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-[400px] z-50 bg-[#111318] border-l-4 border-black p-6 shadow-2xl flex flex-col justify-between"
            >
              <div className="space-y-6 flex-grow overflow-y-auto scrollbar-thin pr-1">
                <div className="flex items-center justify-between border-b-2 border-black pb-4">
                  <div>
                    <span className="text-[10px] text-gray-500 tracking-wide">Editor del Nominado</span>
                    <h3 className="font-display font-semibold text-base text-white mt-0.5 leading-none">Editar Nominación</h3>
                  </div>
                  <button
                    onClick={() => {
                      setDrawerOpen(false);
                      setEditingNominee(null);
                    }}
                    className="p-1.5 border border-neutral-700/60 rounded-lg bg-[#171A20] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center p-4 bg-[#171A20] border border-neutral-700/60 rounded-xl ">
                  <div className="w-20 h-20 rounded-2xl border border-neutral-700/60 bg-[#111318] overflow-hidden mb-3 ">
                    {editingNominee.profile_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editingNominee.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl flex items-center justify-center h-full">🐣</span>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-sm">{editingNominee.display_name || editingNominee.roblox_user}</h4>
                  <p className="text-xs text-gray-400 font-medium">@{editingNominee.roblox_user}</p>
                  <p className="text-[9px] text-gray-500 font-mono mt-1">ID de Roblox: {editingNominee.roblox_user_id || 'N/A'}</p>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-gray-500">Apodo en Votación (Nickname)</span>
                    <input
                      type="text"
                      value={editingNominee.nickname || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingNominee(prev => prev ? { ...prev, nickname: val } : null);
                        setNominees(curr => curr.map(item => item.id === editingNominee.id ? { ...item, nickname: val } : item));
                      }}
                      placeholder="Nickname visible para los usuarios"
                      className="w-full bg-[#171A20] border border-neutral-700/60 rounded-xl px-3 py-2 text-xs text-white focus:border-[#FFC200] outline-none transition-colors font-medium "
                    />
                  </label>

                  <div className="flex items-center justify-between bg-[#171A20] border border-neutral-700/60 rounded-xl p-3.5 ">
                    <div>
                      <h4 className="font-bold text-xs text-white">Visibilidad</h4>
                      <p className="text-[9px] text-gray-400 font-medium mt-0.5">Determina si aparece en el listado para votar.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={editingNominee.is_visible}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setEditingNominee(prev => prev ? { ...prev, is_visible: val } : null);
                        setNominees(curr => curr.map(item => item.id === editingNominee.id ? { ...item, is_visible: val } : item));
                      }}
                      className="w-4.5 h-4.5 accent-[#FFC200] cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-black mt-4 space-y-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSaveNominee(editingNominee)}
                  disabled={savingId === editingNominee.id}
                  className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-[0.97]"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingId === editingNominee.id ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Seguro que deseas eliminar este nominado?')) {
                      void handleDeleteNominee(editingNominee.id);
                    }
                  }}
                  className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-display font-medium text-sm rounded-xl border border-neutral-700/60 transition-colors cursor-pointer active:scale-[0.97]"
                >
                  Eliminar Nominación
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* INSPECTOR DE VOTOS (MODAL) */}
      <AnimatePresence>
        {inspectingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#111318] border border-neutral-700/60 rounded-2xl p-6 w-full max-w-md relative text-gray-200 flex flex-col max-h-[80vh] shadow-[0_8px_24px_rgba(0,0,0,.5)]"
            >
              <button
                onClick={() => setInspectingUser(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center border border-neutral-700/60 rounded-lg bg-[#171A20] cursor-pointer  active:scale-[0.97]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b-2 border-black pb-3 shrink-0">
                <div className="w-11 h-11 rounded-lg border border-neutral-700/60 bg-[#171A20] overflow-hidden flex items-center justify-center shrink-0 ">
                  {inspectingUser.robloxAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={inspectingUser.robloxAvatarUrl} alt={inspectingUser.robloxUser || 'User'} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                  ) : (
                    <span className="text-xl">🐣</span>
                  )}
                </div>
                <div className="min-w-0 pr-8">
                  <p className="text-[10px] text-gray-500 tracking-wide">Planilla de Votos</p>
                  <h3 className="font-display font-semibold text-base text-white truncate" title={inspectingUser.robloxDisplayName || inspectingUser.email}>
                    {inspectingUser.robloxDisplayName || inspectingUser.email}
                  </h3>
                  {inspectingUser.robloxUser && (
                    <p className="text-xs text-gray-400 font-medium mt-0.5">@{inspectingUser.robloxUser}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center bg-[#171A20] border border-neutral-700/60 p-3 rounded-xl mb-4 font-display font-medium text-xs text-gray-400 shrink-0 ">
                <span className="text-gray-300">Progreso General</span>
                <span className={inspectingUser.votedCount >= inspectingUser.totalCategories ? 'text-[#FFC200]' : 'text-orange-400'}>
                  {inspectingUser.votedCount}/{inspectingUser.totalCategories} Categorías
                </span>
              </div>

              <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-2.5 mb-4 max-h-[300px]">
                {CATEGORIES.map((cat: Category) => {
                  const vote = inspectingUser.votes?.find((v: { categoryId: number; nomineeName: string }) => v.categoryId === cat.id);
                  return (
                    <div key={cat.id} className={`border-2 rounded-xl p-3 flex items-center justify-between gap-3 text-xs  ${
                      vote ? 'bg-[#171A20] border-black' : 'bg-red-500/5 border-dashed border-red-500/20'
                    }`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base shrink-0">{cat.emoji || '🏆'}</span>
                        <span className="font-medium text-gray-300 truncate" title={cat.title}>
                          {cat.title}
                        </span>
                      </div>
                      
                      {vote ? (
                        <span className="font-bold text-[#FFC200] shrink-0 bg-[#FFC200]/10 border border-[#FFC200]/20 px-2.5 py-0.5 rounded-lg truncate max-w-[120px]" title={vote.nomineeName}>
                          {vote.nomineeName}
                        </span>
                      ) : (
                        <span className="font-bold text-red-400 shrink-0 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg uppercase text-[9px] tracking-wider animate-pulse">
                          Sin Votar
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setInspectingUser(null)}
                className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-colors cursor-pointer shrink-0 active:scale-[0.97]"
              >
                Cerrar Planilla
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL DE EDICIÓN / CRUD DE USUARIO */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#111318] border border-neutral-700/60 rounded-2xl p-6 w-full max-w-md relative text-gray-200 flex flex-col max-h-[85vh] shadow-[0_8px_24px_rgba(0,0,0,.5)]"
            >
              <button
                onClick={() => setEditingUser(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center border border-neutral-700/60 rounded-lg bg-[#171A20] cursor-pointer active:scale-[0.97]"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4 border-b-2 border-black pb-3 shrink-0">
                <div className="w-11 h-11 rounded-lg border border-neutral-700/60 bg-[#171A20] overflow-hidden flex items-center justify-center shrink-0 ">
                  {adminVerifiedProfile ? (
                    adminVerifiedProfile.avatarUrl ? (
                      <img src={adminVerifiedProfile.avatarUrl} alt={adminVerifiedProfile.displayName} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                    ) : (
                      <span className="text-xl">🐣</span>
                    )
                  ) : editingUser.robloxAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editingUser.robloxAvatarUrl} alt={editingUser.robloxUser || 'User'} className="w-full h-full object-cover" style={{ transform: 'scale(1.6) translateY(-8%)', transformOrigin: 'center top', objectPosition: 'center top' }} />
                  ) : (
                    <span className="text-xl">🐣</span>
                  )}
                </div>
                <div className="min-w-0 pr-8">
                  <p className="text-[10px] text-gray-500 tracking-wide">Gestión de Perfil</p>
                  <h3 className="font-display font-semibold text-base text-white truncate" title={adminVerifiedProfile ? adminVerifiedProfile.displayName : (editingUser.robloxDisplayName || editingUser.email)}>
                    {adminVerifiedProfile ? adminVerifiedProfile.displayName : (editingUser.robloxDisplayName || editingUser.email)}
                  </h3>
                  {(adminVerifiedProfile ? adminVerifiedProfile.username : editingUser.robloxUser) && (
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      @{adminVerifiedProfile ? adminVerifiedProfile.username : editingUser.robloxUser}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500 font-medium mt-1">ID: {editingUser.id.substring(0, 8)}...</p>
                </div>
              </div>

              {/* TABS DENTRO DEL MODAL */}
              <div className="flex border-b border-neutral-700/60 mb-5 shrink-0 font-medium">
                <button
                  type="button"
                  onClick={() => setEditingUserTab('profile')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    editingUserTab === 'profile'
                      ? 'border-[#FFC200] text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Perfil (CRUD)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUserTab('votes')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    editingUserTab === 'votes'
                      ? 'border-[#FFC200] text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Premios y Votos
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUserTab('permissions')}
                  className={`flex-1 pb-2 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-colors cursor-pointer ${
                    editingUserTab === 'permissions'
                      ? 'border-[#FFC200] text-white'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Permisos
                </button>
              </div>

              {editingUserTab === 'profile' ? (
                <form onSubmit={handleUpdateUser} className="flex flex-col flex-grow overflow-y-auto space-y-4 pr-1">
                  {editFormError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                      {editFormError}
                    </div>
                  )}

                  {editFormSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold font-sans">
                      {editFormSuccess}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Usuario Roblox</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editForm.robloxUsername}
                        onChange={(e) => {
                          setEditForm(prev => ({ ...prev, robloxUsername: e.target.value }));
                          setAdminIsDuplicate(false);
                          setAdminConflictedEmail('');
                          setAdminForceClaim(false);
                          setEditFormError(null);
                          setEditFormSuccess(null);
                        }}
                        placeholder="Username de Roblox..."
                        className="flex-grow px-3.5 py-2.5 bg-[#171A20] border border-neutral-700/60 rounded-xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors font-medium font-sans"
                      />
                      <button
                        type="button"
                        disabled={isValidatingRoblox || !editForm.robloxUsername.trim()}
                        onClick={handleAdminVerifyRoblox}
                        className="px-4 py-2 bg-[#2b2d31] hover:bg-neutral-800 text-white font-display font-semibold text-xs rounded-xl transition-all disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isValidatingRoblox ? 'Validando...' : 'Validar'}
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-500 font-medium font-sans">Se validará contra la API oficial de Roblox al guardar.</p>
                  </div>

                  {adminIsDuplicate && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 font-sans">
                      <p className="text-xs text-amber-400 font-semibold leading-relaxed">
                        ⚠️ Esta cuenta de Roblox ya está vinculada al correo <span className="underline">{adminConflictedEmail}</span>.
                      </p>
                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={adminForceClaim}
                          onChange={(e) => {
                            setAdminForceClaim(e.target.checked);
                            if (e.target.checked) setEditFormError(null);
                          }}
                          className="rounded text-[#FFC200] bg-[#171A20] border-neutral-700/60 focus:ring-[#FFC200]/30"
                        />
                        Confirmar reasignación forzada de cuenta
                      </label>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Usuario TikTok</label>
                    <input
                      type="text"
                      value={editForm.tiktokUsername}
                      onChange={(e) => setEditForm(prev => ({ ...prev, tiktokUsername: e.target.value }))}
                      placeholder="Username de TikTok..."
                      className="w-full px-3.5 py-2.5 bg-[#171A20] border border-neutral-700/60 rounded-xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors font-medium"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Estado de Vinculación</label>
                    <select
                      value={editForm.linkStatus}
                      onChange={(e) => setEditForm(prev => ({ ...prev, linkStatus: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 bg-[#171A20] border border-neutral-700/60 rounded-xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors font-semibold"
                    >
                      <option value="none">NONE (Sin verificar)</option>
                      <option value="pending">PENDING (Pendiente)</option>
                      <option value="approved">APPROVED (Aprobado)</option>
                      <option value="rejected">REJECTED (Rechazado)</option>
                    </select>
                  </div>

                  {editForm.linkStatus === 'rejected' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Motivo del Rechazo</label>
                      <textarea
                        value={editForm.rejectionReason}
                        onChange={(e) => setEditForm(prev => ({ ...prev, rejectionReason: e.target.value }))}
                        placeholder="Razón del rechazo..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 bg-[#171A20] border border-neutral-700/60 rounded-xl text-xs focus:border-[#FFC200] outline-none text-white transition-colors resize-none font-medium"
                      />
                    </div>
                  )}

                  <div className="pt-2 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 bg-[#171A20] hover:bg-neutral-800 border border-neutral-700/60 text-white font-display font-semibold text-xs rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={
                        updatingUser ||
                        (editForm.robloxUsername.trim() !== (editingUser.robloxUser || '').trim() &&
                          !adminRobloxConfirmed &&
                          !adminForceClaim)
                      }
                      className="flex-1 py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingUser && <Loader className="w-3.5 h-3.5 animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </form>
              ) : editingUserTab === 'votes' ? (
                <div className="flex flex-col flex-grow overflow-hidden">
                  <div className="flex justify-between items-center bg-[#171A20] border border-neutral-700/60 p-3 rounded-xl mb-4 font-display font-medium text-xs text-gray-400 shrink-0 ">
                    <span className="text-gray-300 font-semibold">Progreso General</span>
                    <span className={editingUser.votedCount >= editingUser.totalCategories ? 'text-[#FFC200]' : 'text-orange-400'}>
                      {editingUser.votedCount}/{editingUser.totalCategories} Categorías
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-2.5 mb-4 max-h-[300px]">
                    {CATEGORIES.map((cat: Category) => {
                      const vote = editingUser.votes?.find((v: { categoryId: number; nomineeName: string }) => v.categoryId === cat.id);
                      return (
                        <div key={cat.id} className={`border-2 rounded-xl p-3 flex items-center justify-between gap-3 text-xs  ${
                          vote ? 'bg-[#171A20] border-black' : 'bg-red-500/5 border-dashed border-red-500/20'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat.emoji || '🏆'}</span>
                            <span className="font-semibold text-gray-300 truncate" title={cat.title}>
                              {cat.title}
                            </span>
                          </div>
                          
                          {vote ? (
                            <span className="font-bold text-[#FFC200] shrink-0 bg-[#FFC200]/10 border border-[#FFC200]/20 px-2.5 py-0.5 rounded-lg truncate max-w-[120px]" title={vote.nomineeName}>
                              {vote.nomineeName}
                            </span>
                          ) : (
                            <span className="font-bold text-red-400 shrink-0 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-lg uppercase text-[9px] tracking-wider animate-pulse">
                              Sin Votar
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-colors cursor-pointer shrink-0 active:scale-[0.97]"
                  >
                    Cerrar Planilla
                  </button>
                </div>
              ) : (
                <div className="flex flex-col flex-grow overflow-hidden">
                  <div className="flex justify-between items-center bg-[#171A20] border border-neutral-700/60 p-3 rounded-xl mb-4 font-display font-medium text-xs text-gray-400 shrink-0">
                    <span className="text-gray-300 font-semibold">Permisos Granulares</span>
                  </div>

                  <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-3 mb-4 max-h-[300px]">
                    {[
                      { key: 'permUploadImages', label: 'Subir Imágenes', desc: 'Subir archivos de imagen a la botonera' },
                      { key: 'permUploadVideos', label: 'Subir Videos', desc: 'Subir videos a la botonera' },
                      { key: 'permUploadAudio', label: 'Subir Audio', desc: 'Subir archivos de audio a la botonera' },
                      { key: 'permTtsText', label: 'TTS por Texto', desc: 'Usar generación de voz por texto' },
                      { key: 'permTtsRecord', label: 'TTS por Grabación', desc: 'Usar generación de voz por grabación' },
                      { key: 'permEditNickname', label: 'Cambiar Apodo', desc: 'Editar su propio apodo en la plataforma' },
                      { key: 'permTriggerSounds', label: 'Activar Sonidos', desc: 'Reproducir sonidos desde la botonera' },
                      { key: 'permTriggerMedia', label: 'Activar Media', desc: 'Reproducir media (imagen/audio/video) desde la botonera' },
                      { key: 'permTriggerAnimations', label: 'Activar Animaciones', desc: 'Ejecutar animaciones desde la botonera' },
                      { key: 'permEditSounds', label: 'Editar Sonidos', desc: 'Editar o eliminar sonidos propios en la botonera' },
                    ].map((perm) => (
                      <label
                        key={perm.key}
                        className="flex items-center justify-between bg-[#171A20] border border-neutral-700/60 rounded-xl p-3 cursor-pointer hover:bg-neutral-800/60 transition-colors"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-white text-xs">{perm.label}</span>
                          <span className="text-[10px] text-gray-500">{perm.desc}</span>
                        </div>
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={(editingUser as Record<string, unknown>)[perm.key] as boolean}
                            onChange={(e) => {
                              setEditingUser({ ...editingUser, [perm.key]: e.target.checked });
                            }}
                            className="sr-only"
                          />
                          <div className={`w-10 h-5 rounded-full transition-colors ${
                            (editingUser as Record<string, unknown>)[perm.key] ? 'bg-[#FFC200]' : 'bg-neutral-700'
                          }`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mt-0.5 ${
                              (editingUser as Record<string, unknown>)[perm.key] ? 'translate-x-5' : 'translate-x-0.5'
                            }`} />
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  {editFormError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold mb-3 shrink-0">
                      {editFormError}
                    </div>
                  )}

                  {editFormSuccess && (
                    <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs font-semibold font-sans mb-3 shrink-0">
                      {editFormSuccess}
                    </div>
                  )}

                  <div className="pt-2 flex gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 bg-[#171A20] hover:bg-neutral-800 border border-neutral-700/60 text-white font-display font-semibold text-xs rounded-xl transition-colors cursor-pointer active:scale-[0.97]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={updatingUser}
                      onClick={async () => {
                        setUpdatingUser(true);
                        setEditFormError('');
                        setEditFormSuccess('');
                        try {
                          const permissions: Record<string, boolean> = {};
                          for (const key of ['permUploadImages','permUploadVideos','permUploadAudio','permTtsText','permTtsRecord','permEditNickname','permTriggerSounds','permTriggerMedia','permTriggerAnimations','permEditSounds']) {
                            permissions[key] = !!(editingUser as Record<string, unknown>)[key];
                          }
                          const response = await apiFetch(`/api/admin/users/update`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: editingUser.id, permissions }),
                          });
                          const data = await readApiPayload(response);
                          if (!response.ok) throw new Error(data.error || 'Error al guardar permisos');
                          setEditFormSuccess('Permisos guardados correctamente');
                          loadStats();
                        } catch (err) {
                          setEditFormError(err instanceof Error ? err.message : 'Error desconocido');
                        } finally {
                          setUpdatingUser(false);
                        }
                      }}
                      className="flex-1 py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updatingUser && <Loader className="w-3.5 h-3.5 animate-spin" />}
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}




