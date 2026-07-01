'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Header } from '@/components/ui/Header';
import { NavBar } from '@/components/ui/NavBar';
import { Button } from '@/components/ui/Button';
import RobloxOnboarding from '@/components/RobloxOnboarding';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  Volume2, 
  Send, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  ArrowLeft, 
  Loader2, 
  List, 
  User,
  LayoutDashboard,
  Settings,
  HelpCircle,
  Menu,
  X,
  Users,
  Crown,
  FileAudio,
  Activity,
  ExternalLink
} from 'lucide-react';
import { soundManager } from '@/lib/sound';
import { convertAudioToMp3 } from '@/lib/audioConverter';
import { motion, AnimatePresence } from 'motion/react';

type StoredRobloxProfile = {
  id: string;
  roblox_user_id: number | null;
  roblox_user: string | null;
  roblox_display_name: string | null;
  roblox_avatar_url: string | null;
  roblox_verified_at: string | null;
  tiktok_user?: string | null;
  link_status?: 'none' | 'pending' | 'approved' | 'rejected' | null;
  rejection_reason?: string | null;
  last_nickname_updated_at?: string | null;
};

type StreamEvent = {
  id: string;
  type: 'sound' | 'tts' | 'animation';
  content: string;
  sender_roblox_user: string | null;
  sender_tiktok_user: string | null;
  created_at: string;
};

type StreamSettings = {
  id: number;
  is_muted: boolean;
  global_cooldown_seconds: number;
  personal_cooldown_seconds: number;
};

interface PendingTrigger {
  type: 'sound' | 'tts' | 'animation';
  content: string;
  message: string;
}


const ANIMATIONS = [
  { id: 'eggs', name: '🥚 Lluvia de Huevos', color: 'from-amber-200 to-yellow-300' },
  { id: 'sparkles', name: '✨ Destellos Brillantes', color: 'from-teal-100 to-cyan-300' },
  { id: 'confetti', name: '🎉 Lluvia de Confeti', color: 'from-pink-200 to-purple-300' },
];

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

export default function MemberConsolePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StoredRobloxProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<StreamEvent[]>([]);

  // Navigation state (app feel)
  const [activeTab, setActiveTab] = useState<'sounds' | 'tts' | 'animations' | 'feed' | 'dashboard' | 'nickname' | 'settings' | 'help' | 'my-sounds'>('sounds');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRobloxOnboardingOpen, setIsRobloxOnboardingOpen] = useState(false);

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [sendingTts, setSendingTts] = useState(false);

  // Sound/Animation Trigger State
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [pendingTrigger, setPendingTrigger] = useState<PendingTrigger | null>(null);

  // Dynamic Sounds Board
  const [sounds, setSounds] = useState<{ id: string; name: string; url?: string }[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(true);

  // Stream Settings State
  const [streamSettings, setStreamSettings] = useState<StreamSettings | null>(null);

  // Cooldowns State
  const [soundCooldown, setSoundCooldown] = useState(0);
  const [ttsCooldown, setTtsCooldown] = useState(0);
  const [animationCooldown, setAnimationCooldown] = useState(0);

  // Local test mode (Probar sonido)
  const [isLocalTestMode, setIsLocalTestMode] = useState(false);

  // Stream stats
  const [totalMembers, setTotalMembers] = useState(54);
  const [soundsToday, setSoundsToday] = useState(312);
  const [viewers, setViewers] = useState(1248);
  const [uptimeSeconds, setUptimeSeconds] = useState(10113); // ~2:48:33

  // Nickname State
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submittingNickname, setSubmittingNickname] = useState(false);
  const [isBotAccount, setIsBotAccount] = useState(false);

  // Error/Success state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // My Audios — submissions & private sounds
  type MySubmission = {
    id: string; name: string; url: string; is_public: boolean;
    status: 'pending' | 'approved' | 'rejected';
    rejection_reason: string | null; created_at: string;
  };
  const [mySubmissions, setMySubmissions] = useState<MySubmission[]>([]);
  const [loadingMySubmissions, setLoadingMySubmissions] = useState(false);
  const [myPrivateSounds, setMyPrivateSounds] = useState<{ id: string; name: string; url: string; cooldown_seconds?: number | null }[]>([]);
  const [loadingMyPrivate, setLoadingMyPrivate] = useState(false);

  // Audio upload form
  const [audioName, setAudioName] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioCooldown, setAudioCooldown] = useState('0');
  const [audioIsPublic, setAudioIsPublic] = useState(true);
  const [submittingAudio, setSubmittingAudio] = useState(false);
  const [audioSubmitStatus, setAudioSubmitStatus] = useState<string | null>(null);

  // Anti-spam confirmation toggle (for kids safety)
  const [confirmSpamGuard, setConfirmSpamGuard] = useState<boolean>(true);

  // Load confirmSpamGuard from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('confirmSpamGuard');
      if (saved !== null) {
        setConfirmSpamGuard(saved === 'true');
      }
    }
  }, []);

  const warnedRealtimeRef = useRef(false);

  // 1. Fetch Profile
  const fetchProfile = useCallback(async (currentSession: Session) => {
    try {
      const response = await fetch('/api/profile/verify-roblox', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });
      const data = await response.json();
      if (data.profile) {
        setProfile(data.profile);
        setIsBotAccount(!!data.isBotAccount);

        // Auto-disparar onboarding si no tiene nickname personalizado y no es la cuenta del bot
        const hasEmojis = !!(data.profile.roblox_display_name?.startsWith('🐣') && data.profile.roblox_display_name?.endsWith('🐣'));
        if (data.profile.link_status === 'approved' && !hasEmojis && !data.isBotAccount) {
          setIsNicknameModalOpen(true);
          const cleanName = (data.profile.roblox_display_name || '').replace(/🐣/g, '').trim();
          setNewNickname(cleanName);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

  // Helper to check if nickname contains emojis 🐣
  const isCustomNickname = (displayName: string | null) => {
    return !!(displayName?.startsWith('🐣') && displayName?.endsWith('🐣'));
  };

  // Helper to calculate cooldown
  const getCooldownRemaining = useCallback((lastUpdatedStr: string | null | undefined) => {
    if (!lastUpdatedStr) return null;
    const lastUpdate = new Date(lastUpdatedStr).getTime();
    const diff = Date.now() - lastUpdate;
    const cooldown = 24 * 60 * 60 * 1000;
    if (diff < cooldown) {
      const remaining = cooldown - diff;
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.ceil((remaining % (1000 * 60 * 60)) / (1000 * 60));
      return { hours, minutes };
    }
    return null;
  }, []);

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setNicknameError(null);
    setSubmittingNickname(true);

    try {
      const response = await fetch('/api/profile/nickname', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ nickname: newNickname }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'No se pudo actualizar el nickname.');
      }

      setSuccess('¡Tu nickname y tag en Roblox fueron actualizados con éxito! 🐣');
      setTimeout(() => setSuccess(null), 5000);
      if (data.profile) {
        setProfile(data.profile);
      }
      setIsNicknameModalOpen(false);
      setNicknameError(null);
      soundManager.playHatch();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error al actualizar el nickname.';
      setNicknameError(errMsg);
    } finally {
      setSubmittingNickname(false);
    }
  };

  // 2. Fetch Recent Events
  const fetchRecentEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/stream/events');
      const data = await response.json();
      if (data.events) {
        setRecentEvents(data.events);
      }
    } catch (err) {
      console.error('Error fetching recent events:', err);
    }
  }, []);

  const fetchStreamSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/stream/settings');
      if (response.ok) {
        const data = await response.json();
        setStreamSettings(data);
      }
    } catch (err) {
      console.error('Error fetching stream settings:', err);
    }
  }, []);

  // 3. Trigger Event Helper
  const triggerEvent = useCallback(async (type: 'sound' | 'tts' | 'animation', content: string, bypassConfirm = false) => {
    if (!session) return;
    setError(null);
    setSuccess(null);

    // Anti-spam popup check
    if (!bypassConfirm && confirmSpamGuard && !isLocalTestMode) {
      const confirmMsg =
        type === 'sound'
          ? '¿Quieres reproducir este sonido en el stream?'
          : type === 'animation'
          ? '¿Quieres mostrar esta animación en pantalla?'
          : '¿Quieres enviar este mensaje de voz (TTS) al stream?';
      setPendingTrigger({
        type,
        content,
        message: confirmMsg
      });
      return;
    }

    // Local checks before calling the API
    if (type === 'sound' && soundCooldown > 0) {
      setError(`Esperá el cooldown de sonidos (${soundCooldown}s)`);
      return;
    }
    if (type === 'animation' && animationCooldown > 0) {
      setError(`Esperá el cooldown de animaciones (${animationCooldown}s)`);
      return;
    }
    if (type === 'tts' && ttsCooldown > 0) {
      setError(`Esperá el cooldown del TTS (${ttsCooldown}s)`);
      return;
    }

    if (type === 'sound') setTriggeringId(content);
    if (type === 'animation') setTriggeringId(content);
    if (type === 'tts') setSendingTts(true);

    try {
      const response = await fetch('/api/stream/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ type, content }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al disparar interacción');
      }

      setSuccess('¡Interacción enviada al stream en vivo! 🚀');
      setTimeout(() => setSuccess(null), 4000);
      soundManager.playPop();

      // Trigger local cooldowns
      if (type === 'sound') {
        const cd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
        setSoundCooldown(cd);
      } else if (type === 'animation') {
        const cd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
        setAnimationCooldown(cd);
      } else if (type === 'tts') {
        setTtsText('');
        const cd = streamSettings?.personal_cooldown_seconds ?? 300;
        setTtsCooldown(cd);
      }

      void fetchRecentEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
      setTimeout(() => setError(null), 6000);
    } finally {
      setTriggeringId(null);
      setSendingTts(false);
    }
  }, [session, soundCooldown, ttsCooldown, animationCooldown, fetchRecentEvents, streamSettings, confirmSpamGuard, isLocalTestMode]);

  const handleConfirmTrigger = useCallback(async () => {
    if (!pendingTrigger) return;
    const { type, content } = pendingTrigger;
    setPendingTrigger(null);
    await triggerEvent(type, content, true);
  }, [pendingTrigger, triggerEvent]);

  const fetchSounds = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sounds');
      const data = await response.json();
      if (data.sounds) {
        setSounds(data.sounds);
      }
    } catch (err) {
      console.error('Error fetching sounds:', err);
    } finally {
      setLoadingSounds(false);
    }
  }, []);

  const loadMySubmissions = useCallback(async (currentSession: Session) => {
    setLoadingMySubmissions(true);
    try {
      const response = await fetch('/api/console/sounds/my-submissions', {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await response.json();
      if (data.submissions) setMySubmissions(data.submissions);
    } catch (err) {
      console.error('Error loading my submissions:', err);
    } finally {
      setLoadingMySubmissions(false);
    }
  }, []);

  const loadMyPrivateSounds = useCallback(async (currentSession: Session) => {
    setLoadingMyPrivate(true);
    try {
      const response = await fetch('/api/console/sounds/my-private', {
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await response.json();
      if (data.sounds) setMyPrivateSounds(data.sounds);
    } catch (err) {
      console.error('Error loading private sounds:', err);
    } finally {
      setLoadingMyPrivate(false);
    }
  }, []);

  const handleSubmitAudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !audioFile || !audioName.trim()) return;
    setSubmittingAudio(true);
    setAudioSubmitStatus(null);
    setError(null);
    try {
      let processedFile: File | Blob = audioFile;
      if (audioFile.type !== 'audio/mpeg' && !audioFile.name.endsWith('.mp3')) {
        setAudioSubmitStatus('Convirtiendo audio a MP3...');
        processedFile = await convertAudioToMp3(audioFile);
      }

      const formData = new FormData();
      const ext = 'mp3';
      const slug = audioName.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'audio';
      formData.append('file', processedFile, `${slug}-${Date.now()}.${ext}`);
      formData.append('name', audioName.trim());
      formData.append('suggestedCooldown', audioCooldown);
      formData.append('isPublic', String(audioIsPublic));

      setAudioSubmitStatus('Subiendo audio...');
      const response = await fetch('/api/console/sounds/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al enviar el audio');

      setAudioName('');
      setAudioFile(null);
      setAudioCooldown('0');
      setAudioIsPublic(true);
      setAudioSubmitStatus('✓ Audio enviado para revisión. Te notificaremos cuando sea aprobado.');
      setTimeout(() => setAudioSubmitStatus(null), 6000);
      await loadMySubmissions(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el audio');
      setTimeout(() => setError(null), 6000);
    } finally {
      setSubmittingAudio(false);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      // Obtener conteo de miembros aprobados reales
      const { count: membersCount, error: err1 } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('link_status', 'approved');
      
      if (!err1 && membersCount !== null) {
        setTotalMembers(membersCount);
      }

      // Obtener conteo de eventos (sonidos, etc.) disparados hoy
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count: eventsCount, error: err2 } = await supabase
        .from('stream_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      if (!err2 && eventsCount !== null) {
        setSoundsToday(eventsCount);
      }
    } catch (e) {
      console.error('Error fetching stream stats:', e);
    }
  }, []);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        await fetchProfile(initialSession);
        await fetchRecentEvents();
        await fetchSounds();
        await fetchStreamSettings();
        await fetchStats();
        await loadMySubmissions(initialSession);
        await loadMyPrivateSounds(initialSession);
      }
      setLoading(false);
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      if (nextSession) {
        await fetchProfile(nextSession);
        await fetchRecentEvents();
        await fetchSounds();
        await fetchStreamSettings();
        await fetchStats();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRecentEvents, fetchSounds, fetchStreamSettings, fetchStats, loadMySubmissions, loadMyPrivateSounds]);

  // Load my-sounds data on tab switch
  useEffect(() => {
    if (activeTab === 'my-sounds' && session) {
      void loadMySubmissions(session);
      void loadMyPrivateSounds(session);
    }
  }, [activeTab, session, loadMySubmissions, loadMyPrivateSounds]);

  // Cooldown countdowns & simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSoundCooldown((c) => (c > 0 ? c - 1 : 0));
      setTtsCooldown((c) => (c > 0 ? c - 1 : 0));
      setAnimationCooldown((c) => (c > 0 ? c - 1 : 0));
      setUptimeSeconds((u) => u + 1);
    }, 1000);

    const viewersTimer = setInterval(() => {
      setViewers((v) => {
        const diff = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newVal = v + diff;
        return Math.max(1100, Math.min(1300, newVal));
      });
    }, 15000);

    return () => {
      clearInterval(timer);
      clearInterval(viewersTimer);
    };
  }, []);

  // Supabase Realtime Subscription for events and settings
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('stream-events-console')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stream_events' },
        (payload: { new: StreamEvent }) => {
          const newEvent = payload.new;
          setRecentEvents((prev) => {
            if (prev.some((e) => e.id === newEvent.id)) {
              return prev;
            }
            return [newEvent, ...prev.slice(0, 9)];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stream_settings', filter: 'id=eq.1' },
        (payload: { new: StreamSettings }) => {
          setStreamSettings(payload.new);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          if (!warnedRealtimeRef.current) {
            console.log('[Console] Suscrito a eventos y ajustes en tiempo real');
            warnedRealtimeRef.current = true;
          }
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session]);

  const handleTtsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsText.trim() || sendingTts) return;
    void triggerEvent('tts', ttsText);
  };

  const handleBackToLanding = () => {
    soundManager.playPop();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#1e1f22] text-white flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-[#FFC200]" />
        <p className="mt-3 font-sans text-sm text-gray-500">Cargando consola VIP...</p>
      </div>
    );
  }

  // Not logged in -> show warning
  if (!session) {
    return (
      <div className="h-screen w-screen bg-[#1e1f22] text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] space-y-4">
          <div className="w-14 h-14 rounded-xl bg-red-950/40 border border-red-500 text-red-400 flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-2xl leading-none text-red-500">Acceso Restringido</h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            Iniciá sesión en el portal de comunidad con tu cuenta autorizada para acceder a la Consola en Vivo de Miembros Oficiales.
          </p>
          <button
            onClick={handleBackToLanding}
            className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  // Profile pending/rejected/none -> show info card
  if (!profile || profile.link_status !== 'approved') {
    const isPending = profile?.link_status === 'pending';
    const isRejected = profile?.link_status === 'rejected';

    return (
      <div className="h-screen w-screen bg-[#1e1f22] text-white flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.25)] space-y-4">
          <div className={`w-14 h-14 rounded-xl border flex items-center justify-center ${
            isPending ? 'bg-yellow-950/40 border-yellow-500 text-yellow-400' : 'bg-red-950/40 border-red-500 text-red-400'
          }`}>
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="font-display font-bold text-2xl leading-none">
            {isPending ? 'Postulación en Revisión' : isRejected ? 'Postulación Rechazada' : 'Vinculación Requerida'}
          </h1>
          <p className="text-xs text-gray-400 leading-relaxed">
            {isPending 
              ? 'Tu solicitud de vinculación está siendo evaluada por Milumon. Cuando seas aprobado como Miembro Oficial, se habilitará la consola interactiva.'
              : isRejected 
              ? `Tu vinculación fue rechazada. Motivo: "${profile?.rejection_reason || 'Sin motivo especificado'}"`
              : 'Para acceder a la Consola en Vivo debés completar tu onboarding y ser aprobado como Miembro Oficial.'}
          </p>
          <button
            onClick={handleBackToLanding}
            className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const isMuted = streamSettings?.is_muted;

  const formatUptime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Soundboard cooldown math
  const maxSoundCd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
  const soundCooldownPercent = soundCooldown > 0 ? (soundCooldown / maxSoundCd) * 100 : 0;

  // Animation cooldown math
  const maxAnimCd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
  const animCooldownPercent = animationCooldown > 0 ? (animationCooldown / maxAnimCd) * 100 : 0;

  return (
    <div className="h-screen w-screen bg-[#1e1f22] text-white font-sans flex flex-col overflow-hidden select-none">
      
      {/* HEADER SUPERIOR */}
      <Header
        session={session}
        isAdmin={isBotAccount || session?.user?.email === 'kpopxfull@gmail.com'}
        onLogout={handleBackToLanding}
        panelName="Consola VIP"
        panelHref="/console"
        showMobileToggle={false}
        theme="dark"
      />

      {/* ----------------- CONTENEDOR PRINCIPAL DE PANELES ----------------- */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ----------------- SIDEBAR IZQUIERDA (280px) ----------------- */}
        <aside className="hidden md:flex flex-col justify-between w-[260px] shrink-0 bg-[#24262b] p-4 select-none">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-3 mb-3">Navegación</p>
            
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'sounds', label: 'Banco de Sonidos', icon: Volume2 },
              { id: 'tts', label: 'TTS Mensajes', icon: Send },
              { id: 'animations', label: 'Efectos Visuales', icon: Sparkles },
              { id: 'feed', label: 'Feed de Actividad', icon: List },
              { id: 'nickname', label: 'Nickname', icon: User },
              { id: 'my-sounds', label: 'Mis Audios', icon: FileAudio },
            ].map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundManager.playPop();
                    setActiveTab(tab.id as typeof activeTab);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl font-display font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FFC200]/10 text-[#FFC200]'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FFC200]' : 'text-gray-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="h-px bg-white/5 my-3" />

            <button
              onClick={() => { soundManager.playPop(); setActiveTab('settings'); }}
              className={`w-full py-2.5 px-3 rounded-xl font-display font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#FFC200]/10 text-[#FFC200]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'settings' ? 'text-[#FFC200]' : 'text-gray-500'}`} />
              <span>Configuración</span>
            </button>

            <button
              onClick={() => { soundManager.playPop(); setActiveTab('help'); }}
              className={`w-full py-2.5 px-3 rounded-xl font-display font-semibold text-sm flex items-center gap-2.5 transition-all cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-[#FFC200]/10 text-[#FFC200]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <HelpCircle className={`w-4 h-4 shrink-0 ${activeTab === 'help' ? 'text-[#FFC200]' : 'text-gray-500'}`} />
              <span>Ayuda</span>
            </button>
          </div>

          {/* ESTADO Y POLLITO */}
          <div className="pt-4 border-t border-white/5 space-y-3 shrink-0">
            <div className="flex flex-col items-center py-3">
              <span className="text-4xl animate-bounce duration-1000 block">🐣</span>
              <p className="font-display font-semibold text-xs text-gray-500 mt-1.5">Milumon Mascot</p>
            </div>

            <div className="bg-white/5 rounded-xl p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-300 leading-none">Sistema Online</p>
                  <span className="text-[10px] text-gray-500 leading-none">Sincronizado</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ÁREA CENTRAL DE CONTENIDO */}
        <main className="flex-1 flex flex-col overflow-hidden relative bg-[#1e1f22] pb-20 p-4 md:pb-6 md:p-6 lg:pb-7 lg:p-7">
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence mode="wait">
              
              {/* TAB: DASHBOARD */}
              {activeTab === 'dashboard' && (
                <motion.div
                  key="dashboard-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-y-auto pr-1 space-y-6 text-left"
                >
                  <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 shadow-[0_4px_12px_rgba(0,0,0,.25)] space-y-4">
                    <h2 className="font-display font-bold text-2xl text-white leading-none">
                      🐣 Bienvenido a la Consola VIP
                    </h2>
                    <p className="text-xs text-gray-400 font-semibold leading-relaxed max-w-2xl">
                      Hola, <strong className="text-white">@{profile.roblox_user}</strong>. Tienes acceso completo al panel de interacción en tiempo real de la transmisión de Milumon. Todo lo que dispares aquí se emitirá de forma instantánea en la transmisión en vivo.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-4 space-y-1">
                        <span className="text-[10px] text-gray-500 tracking-wide block">Miembros VIP</span>
                        <span className="font-mono text-xl font-black text-white">{totalMembers}</span>
                      </div>
                      <div className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-4 space-y-1">
                        <span className="text-[10px] text-gray-500 tracking-wide block">Interacciones de hoy</span>
                        <span className="font-mono text-xl font-black text-white">{soundsToday}</span>
                      </div>
                      <div className="bg-[#35373d] border border-neutral-700/40 rounded-xl p-4 space-y-1">
                        <span className="text-[10px] text-gray-500 tracking-wide block">Tu Estado de Conexión</span>
                        <span className="font-mono text-xs font-semibold text-emerald-400 uppercase flex items-center gap-1.5 mt-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> Conectado
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tutorial de uso rápido */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-3 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
                      <h3 className="font-display font-semibold text-sm text-gray-200">¿Cómo interactuar?</h3>
                      <ol className="text-xs text-gray-400 space-y-2.5 list-decimal list-inside pl-1 font-semibold">
                        <li>Ve a la pestaña de <strong className="text-white">Banco de Sonidos</strong> y presiona cualquier botón para enviar alertas auditivas.</li>
                        <li>Escribe mensajes personalizados en <strong className="text-white">TTS Mensajes</strong> para que la voz robótica de Milumon los lea.</li>
                        <li>Dispara efectos visuales en pantalla como la <strong className="text-white">Lluvia de Huevos</strong> desde la sección de Efectos.</li>
                      </ol>
                    </div>

                    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-3 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
                      <h3 className="font-display font-semibold text-sm text-gray-200">Consejos Útiles</h3>
                      <ul className="text-xs text-gray-400 space-y-2.5 list-disc list-inside pl-1 font-semibold">
                        <li>Utiliza la opción <strong className="text-white">Probar sonido</strong> localmente para escuchar los efectos en tus auriculares antes de emitirlos.</li>
                        <li>Configura tu tag oficial de pollito en <strong className="text-white">Nickname</strong> para que aparezca en el juego de Roblox.</li>
                        <li>Respeta los cooldowns de emisión para que todos los pollitos tengan oportunidad de interactuar.</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: SOUNDBOARD */}
              {activeTab === 'sounds' && (
                <motion.div
                  key="sounds-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 md:p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Banco de Sonidos</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2 py-0.5 font-mono text-gray-500">
                        Cooldown: {streamSettings ? `${Math.min(60, streamSettings.personal_cooldown_seconds)}s` : '60s'}
                      </span>
                    </div>

                    {/* INTERNAL SCROLLABLE GRID */}
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                      {loadingSounds ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center text-xs font-bold text-gray-500 uppercase animate-pulse">
                          <Loader2 className="w-7 h-7 animate-spin mb-2 text-[#FFC200]" />
                          Cargando sonidos...
                        </div>
                      ) : sounds.length === 0 ? (
                        <div className="py-12 text-center text-xs font-bold text-gray-500 border border-dashed border-[#FFC200]/45 rounded-2xl bg-black/20">
                          No hay sonidos disponibles en este momento.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
                          {sounds.map((sound) => {
                            const isCooldown = soundCooldown > 0;
                            
                            const handleSoundClick = () => {
                              if (isLocalTestMode) {
                                soundManager.playHatch();
                                if (sound.url) {
                                  try {
                                    const audio = new Audio(sound.url);
                                    audio.volume = 0.5;
                                    void audio.play();
                                  } catch (e) {
                                    console.warn('Fallback audio play failure', e);
                                  }
                                }
                                setSuccess(`Escuchando localmente: ${sound.name} 🎧`);
                                setTimeout(() => setSuccess(null), 3000);
                              } else {
                                void triggerEvent('sound', sound.id);
                              }
                            };

                            const soundStyles = getSoundColor(sound.id);
                            return (
                              <button
                                key={sound.id}
                                disabled={!isLocalTestMode && (isCooldown || triggeringId !== null || isMuted)}
                                onClick={handleSoundClick}
                                className="relative h-[135px] md:h-[140px] w-full bg-[#2b2d31] hover:bg-[#20242D] border border-neutral-700/60 rounded-2xl p-4 flex flex-col justify-between items-start transition-all duration-150 select-none cursor-pointer overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97] disabled:shadow-none disabled:translate-y-0 "
                              >
                                  {/* Background cooldown loading bar */}
                                  {isCooldown && !isLocalTestMode && (
                                    <motion.div
                                      initial={{ width: '100%' }}
                                      animate={{ width: `${soundCooldownPercent}%` }}
                                      transition={{ duration: 1, ease: 'linear' }}
                                      className="absolute inset-x-0 bottom-0 h-1.5 bg-red-500 pointer-events-none"
                                    />
                                  )}

                                  <div className="flex items-center justify-between w-full relative z-10">
                                    <span className="text-2xl">🐣</span>
                                    <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-2xl border ${
                                      isCooldown && !isLocalTestMode 
                                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                        : soundStyles.badge
                                    }`}>
                                      {isCooldown && !isLocalTestMode ? 'COOLDOWN' : 'LISTO'}
                                    </span>
                                  </div>

                                  <span className={`block truncate font-display font-semibold text-xs md:text-sm relative z-10 leading-none mb-1 text-left w-full ${soundStyles.text}`} title={sound.name}>
                                    {sound.name}
                                  </span>

                                  {isCooldown && !isLocalTestMode ? (
                                    <span className="text-xs font-mono font-bold text-red-500 z-10">
                                      {soundCooldown}s
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-gray-500 font-bold z-10">
                                      {isLocalTestMode ? 'PRUEBA LOCAL' : 'DISPARAR'}
                                    </span>
                                  )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* BARRA INFERIOR DEL SOUNDBOARD / STATUS */}
                    <div className="mt-4 pt-3 border-t border-neutral-700/40 flex flex-wrap items-center justify-between gap-3 text-[10px] text-gray-500 font-bold">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>Los cooldowns y mutes se sincronizan en tiempo real con todos los miembros VIP.</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        <span>Conectado via Supabase Realtime</span>
                      </div>
                    </div>
                  </div>

                  {/* ACCESOS RÁPIDOS */}
                  <div className="mt-4 shrink-0">
                    <h3 className="text-[10px] font-medium text-gray-500 tracking-wider uppercase text-left mb-2 px-1">
                      Accesos Rápidos
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button
                        onClick={() => {
                          soundManager.playPop();
                          setIsLocalTestMode(!isLocalTestMode);
                        }}
                        className={`py-3.5 px-4 border rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97] ${
                          isLocalTestMode 
                            ? 'bg-[#FFC200] text-black border-black shadow-[3px_3px_0_0_#000]' 
                            : 'bg-[#2b2d31] text-gray-400 border-black hover:text-white'
                        }`}
                      >
                        <span>🎧</span>
                        <span>{isLocalTestMode ? 'MODO PRUEBA: ON' : 'PROBAR SONIDO'}</span>
                      </button>

                      <button
                        onClick={() => {
                          soundManager.playPop();
                          setActiveTab('tts');
                        }}
                        className="py-3.5 px-4 bg-[#2b2d31] border border-neutral-700/60 text-gray-400 hover:text-white rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97]"
                      >
                        <span>💬</span>
                        <span>VISTA PREVIA TTS</span>
                      </button>

                      <button
                        onClick={() => {
                          soundManager.playPop();
                          setActiveTab('animations');
                        }}
                        className="py-3.5 px-4 bg-[#2b2d31] border border-neutral-700/60 text-gray-400 hover:text-white rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97]"
                      >
                        <span>✨</span>
                        <span>PROBAR EFECTO</span>
                      </button>

                      <button
                        onClick={() => {
                          soundManager.playPop();
                          setActiveTab('feed');
                        }}
                        className="py-3.5 px-4 bg-[#2b2d31] border border-neutral-700/60 text-gray-400 hover:text-white rounded-2xl font-display font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97]"
                      >
                        <span>🕒</span>
                        <span>HISTORIAL</span>
                      </button>
                    </div>
                  </div>

                  {/* USO RECIENTE */}
                  <div className="mt-4 shrink-0 overflow-hidden">
                    <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block text-left mb-2 px-1">
                      Uso Reciente (Feed Rápido)
                    </span>
                    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-3 flex items-center gap-3 overflow-x-auto scrollbar-none whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,.25)]">
                      {recentEvents.length === 0 ? (
                        <span className="text-[10px] text-gray-500 font-bold block py-1">Ninguna interacción reciente en el directo</span>
                      ) : (
                        recentEvents.slice(0, 5).map((evt) => {
                          let label = '';
                          if (evt.type === 'sound') {
                            label = `SONÓ: ${sounds.find(s => s.id === evt.content)?.name || evt.content}`;
                          } else if (evt.type === 'tts') {
                            label = `TTS: "${evt.content}"`;
                          } else if (evt.type === 'animation') {
                            label = `EFECTO: ${evt.content}`;
                          }
                          return (
                            <div key={evt.id} className="inline-flex items-center gap-2 bg-[#35373d] border border-neutral-700/40 rounded-lg px-2.5 py-1.5 text-[10px] ">
                              <span className="w-2 h-2 rounded-full bg-[#FFC200]" />
                              <strong className="text-white">@{evt.sender_roblox_user || 'VIP'}</strong>
                              <span className="text-gray-400">{label}</span>
                              <span className="font-mono text-[8px] text-gray-500">
                                {new Date(evt.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: TTS */}
              {activeTab === 'tts' && (
                <motion.div
                  key="tts-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden max-w-xl mx-auto w-full text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Send className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Text-To-Speech (TTS)</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2.5 py-0.5 font-medium text-gray-500">
                        Voz Neural
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-gray-400 mb-4 shrink-0 leading-relaxed">
                      Escribí tu mensaje para que la voz del directo lo lea con entonación neural en vivo.
                    </p>

                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                      <form onSubmit={handleTtsSubmit} className="space-y-4 p-1">
                        <div className="relative">
                          <textarea
                            value={ttsText}
                            onChange={(e) => setTtsText(e.target.value.slice(0, 120))}
                            disabled={ttsCooldown > 0 || sendingTts || isMuted}
                            placeholder={
                              isMuted 
                                ? "Consola silenciada temporalmente..." 
                                : ttsCooldown > 0
                                ? `TTS bloqueado. Esperá ${ttsCooldown}s...`
                                : "Escribí un mensaje corto para el directo..."
                            }
                            className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl p-4 font-sans text-sm outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 min-h-[140px] resize-none disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-gray-500 "
                          />
                          <span className={`absolute bottom-4 right-4 text-[9px] font-mono ${
                            ttsText.length >= 100 ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {ttsText.length}/120
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={ttsCooldown > 0 || !ttsText.trim() || sendingTts || isMuted}
                          className="w-full py-3.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-lg border border-neutral-700/60 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {sendingTts ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              Generando Audio...
                            </>
                          ) : ttsCooldown > 0 ? (
                            <>
                              <Clock className="w-4 h-4 text-black" />
                              Cooldown ({ttsCooldown}s)
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 text-black" />
                              Enviar Mensaje de Voz
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: ANIMATIONS */}
              {activeTab === 'animations' && (
                <motion.div
                  key="animations-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Efectos Visuales</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2.5 py-0.5 font-medium text-gray-500">
                        Animaciones
                      </span>
                    </div>

                    <p className="text-[11px] font-semibold text-gray-400 mb-4 shrink-0 leading-relaxed">
                      Elige un efecto visual para proyectarlo temporalmente sobre la pantalla del directo.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {ANIMATIONS.map((anim) => {
                        const isCooldown = animationCooldown > 0;
                        return (
                          <button
                            key={anim.id}
                            disabled={isCooldown || triggeringId !== null || isMuted}
                            onClick={() => void triggerEvent('animation', anim.id)}
                            className="bg-[#2b2d31] hover:bg-neutral-900 border border-neutral-700/60 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[140px] shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97] disabled:shadow-none disabled:translate-y-0"
                          >
                            <span className="text-4xl block">{anim.id === 'eggs' ? '🥚' : anim.id === 'sparkles' ? '✨' : '🎉'}</span>
                            <span className="font-display font-medium text-xs text-white">
                              {anim.name.split(' ').slice(1).join(' ')}
                            </span>
                            
                            {isCooldown ? (
                              <span className="text-[10px] font-mono font-bold text-red-500">
                                Cooldown ({animationCooldown}s)
                              </span>
                            ) : (
                              <span className="text-[8px] text-gray-500 font-bold uppercase">Disparar</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: FEED */}
              {activeTab === 'feed' && (
                <motion.div
                  key="feed-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <List className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Historial del Stream</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2.5 py-0.5 font-medium text-gray-500">
                        Feed Completo
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3">
                      {recentEvents.length === 0 ? (
                        <div className="py-12 text-center border border-dashed border-[#FFC200]/45 rounded-2xl bg-black/20">
                          <p className="text-xs font-bold text-gray-500 uppercase">Sin eventos recientes</p>
                        </div>
                      ) : (
                        recentEvents.map((evt) => {
                          let label = '';
                          let icon = '🔊';
                          if (evt.type === 'sound') {
                            label = `REPRODUJO SONIDO: ${sounds.find(s => s.id === evt.content)?.name || evt.content}`;
                            icon = '🔊';
                          } else if (evt.type === 'tts') {
                            label = `ENVIÓ TTS: "${evt.content}"`;
                            icon = '🗣️';
                          } else if (evt.type === 'animation') {
                            label = `DISPARÓ EFECTO: ${evt.content}`;
                            icon = '✨';
                          }

                          return (
                            <motion.div 
                              layout
                              key={evt.id} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-3.5 text-xs flex items-start gap-3 text-left "
                            >
                              <div className="w-9 h-9 rounded-2xl bg-[#2b2d31] border border-neutral-700/60 flex items-center justify-center text-lg shrink-0">
                                {icon}
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-display font-medium text-[10px] uppercase tracking-wider text-[#FFC200]">
                                    @{evt.sender_roblox_user || 'VIP'}
                                  </span>
                                  <span className="text-[8px] font-mono font-bold text-gray-500">
                                    {new Date(evt.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>
                                <p className="font-semibold text-white break-words pr-1 leading-snug">{label}</p>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: NICKNAME */}
              {activeTab === 'nickname' && (
                <motion.div
                  key="nickname-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden max-w-xl mx-auto w-full text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Configurar Nickname</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2.5 py-0.5 font-medium text-gray-500">
                        Tag de Roblox
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1">
                      <form onSubmit={handleNicknameSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-gray-500 tracking-wider uppercase">
                            Tu nombre central (Sin emojis)
                          </label>
                          <input
                            type="text"
                            value={newNickname}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val.length <= 15) {
                                  setNewNickname(val);
                              }
                            }}
                            placeholder="Ej: Milumon"
                            disabled={submittingNickname}
                            className="w-full bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-3 font-semibold text-sm outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] disabled:opacity-50 text-white placeholder-gray-500 "
                            required
                          />
                          <div className="flex justify-between text-[8px] font-mono text-gray-500">
                            <span>Solo letras, números y espacios</span>
                            <span>{newNickname.length}/15</span>
                          </div>
                        </div>

                        {/* VISTA PREVIA */}
                        <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 text-center space-y-1 ">
                          <span className="text-[10px] font-medium text-[#FFC200] tracking-wider uppercase block">Vista previa en el juego</span>
                          <span className="font-display font-semibold text-lg text-white">
                            🐣 {newNickname.trim() || 'TuNombre'} 🐣
                          </span>
                        </div>

                        {nicknameError && (
                          <div className="bg-red-950/80 border border-red-500 rounded-2xl p-3 text-[10px] font-semibold text-red-300 ">
                            ⚠️ {nicknameError}
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submittingNickname || newNickname.trim().length < 3 || newNickname.trim().length > 15}
                          className="w-full py-3.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-lg border border-neutral-700/60 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {submittingNickname ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              Guardando y Etiquetando...
                            </>
                          ) : (
                            'Confirmar Nickname 🐣'
                          )}
                        </button>
                      </form>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: SETTINGS */}
              {activeTab === 'settings' && (
                <motion.div
                  key="settings-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-hidden max-w-xl mx-auto w-full text-left"
                >
                  <div className="flex-1 bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
                    <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <h2 className="font-display font-bold text-base md:text-lg text-white">Configuración de Cuenta</h2>
                      </div>
                      <span className="text-[10px] bg-neutral-800 rounded-lg px-2.5 py-0.5 font-medium text-gray-500">
                        Ajustes
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 space-y-5">
                      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3 ">
                        <h3 className="font-display font-medium text-xs text-gray-500">Vinculaciones Activas</h3>
                        
                        <div className="space-y-3.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-bold">Usuario Roblox:</span>
                            <span className="font-mono text-white">@{profile.roblox_user}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-bold">Usuario TikTok:</span>
                            <span className="font-mono text-white">@{profile.tiktok_user || 'No Vinculado'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 font-bold">Estado de Cuenta:</span>
                            <span className="text-emerald-400 font-semibold text-xs bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full ">Aprobado VIP</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-neutral-700/40">
                          <button
                            type="button"
                            onClick={() => setIsRobloxOnboardingOpen(true)}
                            className="w-full py-2 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                          >
                            Modificar Cuentas Vinculadas
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3 ">
                        <h3 className="font-display font-medium text-xs text-gray-500">Seguridad Anti-Spam (Niños)</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                          Cuando está activado, solicita una confirmación en pantalla antes de reproducir sonidos o efectos. Ideal para evitar toques involuntarios.
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="confirm-spam-guard-checkbox"
                            checked={confirmSpamGuard}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setConfirmSpamGuard(val);
                              window.localStorage.setItem('confirmSpamGuard', String(val));
                            }}
                            className="w-4 h-4 cursor-pointer accent-[#FFC200]"
                          />
                          <label htmlFor="confirm-spam-guard-checkbox" className="text-xs font-bold text-white select-none cursor-pointer">
                            Confirmar antes de disparar sonidos/efectos
                          </label>
                        </div>
                      </div>

                      <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3 ">
                        <h3 className="font-display font-medium text-xs text-gray-500">Sesión</h3>
                        <p className="text-[11px] text-gray-500 leading-relaxed font-semibold">
                          Si cambiaste de cuenta de Google o necesitas desvincular tus credenciales, puedes cerrar sesión aquí.
                        </p>
                        <button
                          onClick={handleBackToLanding}
                          className="px-4 py-2 bg-red-950 hover:bg-red-900 border border-neutral-700/60 text-red-300 font-display font-medium text-xs rounded-xl transition-all cursor-pointer active:scale-[0.97]"
                        >
                          Cerrar Sesión VIP
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB: HELP */}
              {activeTab === 'help' && (
                <motion.div
                  key="help-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-y-auto pr-1 space-y-4 text-left"
                >
                  <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] space-y-3">
                    <div className="flex items-center gap-2 border-b border-neutral-700/60 pb-3 mb-2 shrink-0">
                      <HelpCircle className="w-5 h-5 text-gray-400" />
                      <h2 className="font-display font-bold text-base md:text-lg text-white">Preguntas Frecuentes</h2>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white">¿Por qué mis botones de sonido están deshabilitados?</h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                          Si disparaste un sonido recientemente, tendrás que esperar tu cooldown personal. También puede suceder que la consola esté bajo un **Mute Global** activado por el moderador del stream.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white">¿Cuánto tarda en sonar mi efecto en el stream?</h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                          La latencia promedio es inferior a 100 ms gracias a Supabase Realtime. El retraso que veas dependerá de la latencia nativa de la plataforma de stream (TikTok/Kick).
                        </p>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-white">¿Cómo puedo reportar un problema de sonido?</h4>
                        <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                          Si un efecto de sonido falla o no se escucha, por favor escribe al soporte o avisa a los moderadores de la comunidad en Discord.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              {/* TAB: MY AUDIOS */}
              {activeTab === 'my-sounds' && (
                <motion.div
                  key="my-sounds-tab"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="absolute inset-0 flex flex-col overflow-y-auto pr-1 space-y-4 text-left"
                >
                  {/* Upload form */}
                  <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] space-y-4">
                    <div className="border-b border-neutral-700/60 pb-3">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Proponer Sonido</span>
                      <h2 className="font-display font-semibold text-base text-white mt-0.5">Enviar Audio</h2>
                      <p className="text-[11px] text-gray-400 mt-1 font-semibold leading-relaxed">El audio será revisado por un admin antes de aparecer en la botonera.</p>
                    </div>

                    <form onSubmit={handleSubmitAudio} className="space-y-3">
                      <label className="block space-y-1">
                        <span className="text-xs text-gray-500">Nombre del botón</span>
                        <input
                          type="text"
                          value={audioName}
                          onChange={(e) => setAudioName(e.target.value)}
                          placeholder="Ej: Mi Risa, Clásico, Épico..."
                          maxLength={40}
                          className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
                        />
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <label className="block space-y-1">
                          <span className="text-xs text-gray-500">Cooldown sugerido (seg)</span>
                          <input
                            type="number" min={0} max={300}
                            value={audioCooldown}
                            onChange={(e) => setAudioCooldown(e.target.value)}
                            className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl px-3 py-2 text-sm focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 outline-none text-white transition-colors"
                          />
                        </label>
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 block">Visibilidad</span>
                          <button
                            type="button"
                            onClick={() => setAudioIsPublic(p => !p)}
                            className={`w-full h-[38px] rounded-xl border text-xs font-display font-semibold transition-all cursor-pointer ${
                              audioIsPublic
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {audioIsPublic ? '🌐 Público' : '🔒 Solo yo'}
                          </button>
                        </div>
                      </div>

                      <label className="block space-y-1">
                        <span className="text-xs text-gray-500">Archivo de audio (MP3, WAV, M4A — máx 2MB)</span>
                        <div className="relative border border-dashed border-[#FFC200]/45 rounded-2xl p-4 bg-[#35373d] hover:bg-[#3a3c42] cursor-pointer transition-colors text-center">
                          <input
                            type="file" accept="audio/*"
                            onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <FileAudio className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-400 font-medium truncate">
                            {audioFile ? audioFile.name : 'Elegir archivo de audio'}
                          </p>
                        </div>
                      </label>

                      {audioSubmitStatus && (
                        <p className={`text-xs font-semibold ${
                          audioSubmitStatus.startsWith('✓') ? 'text-emerald-400' : 'text-[#FFC200]'
                        }`}>{audioSubmitStatus}</p>
                      )}

                      <button
                        type="submit"
                        disabled={submittingAudio || !audioFile || !audioName.trim()}
                        className="w-full py-3 bg-[#FFC200] hover:bg-[#ffe359] text-black font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {submittingAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileAudio className="w-4 h-4" />}
                        {submittingAudio ? 'Enviando...' : 'Enviar para revisión'}
                      </button>
                    </form>
                  </div>

                  {/* Private sounds */}
                  {(loadingMyPrivate || myPrivateSounds.length > 0) && (
                    <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] space-y-3">
                      <div className="border-b border-neutral-700/60 pb-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider font-medium text-purple-400">🔒 Solo vos</span>
                          <h3 className="font-display font-semibold text-base text-white mt-0.5">Mis Sonidos Privados</h3>
                        </div>
                        <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl px-3 py-1">
                          {myPrivateSounds.length}
                        </span>
                      </div>
                      {loadingMyPrivate ? (
                        <div className="py-4 text-center text-gray-500 text-xs animate-pulse">Cargando...</div>
                      ) : (
                        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
                          {myPrivateSounds.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => void triggerEvent('sound', s.id)}
                              disabled={!!triggeringId || soundCooldown > 0}
                              className="bg-[#35373d] border border-purple-500/20 rounded-xl p-3 text-center hover:bg-[#3a3c42] transition-all cursor-pointer active:scale-[0.97] disabled:opacity-50 space-y-1"
                            >
                              <span className="text-xl block">🔒</span>
                              <p className="text-xs font-display font-semibold text-purple-300 truncate">{s.name}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submissions history */}
                  <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] space-y-3">
                    <div className="border-b border-neutral-700/60 pb-3">
                      <span className="text-[10px] uppercase tracking-wider font-medium text-gray-500">Historial</span>
                      <h3 className="font-display font-semibold text-base text-white mt-0.5">Mis Envíos</h3>
                    </div>
                    {loadingMySubmissions ? (
                      <div className="py-8 text-center text-gray-500 text-xs animate-pulse">Cargando historial...</div>
                    ) : mySubmissions.length === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <FileAudio className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-semibold">Todavía no enviaste ningún audio.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mySubmissions.map((sub) => (
                          <div key={sub.id} className="flex items-start gap-3 bg-[#35373d] border border-neutral-700/40 rounded-xl p-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-display font-semibold text-white truncate">{sub.name}</p>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                                  sub.status === 'approved'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : sub.status === 'rejected'
                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                  {sub.status === 'approved' ? '✓ Aprobado' : sub.status === 'rejected' ? '✕ Rechazado' : '⏳ Pendiente'}
                                </span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${
                                  sub.is_public
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                }`}>{sub.is_public ? '🌐' : '🔒'}</span>
                              </div>
                              {sub.rejection_reason && (
                                <p className="text-[10px] text-red-400 font-semibold mt-1 leading-relaxed">Motivo: {sub.rejection_reason}</p>
                              )}
                              <p className="text-[9px] text-gray-600 mt-0.5">{new Date(sub.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* ----------------- SIDEBAR DERECHA (360px - WIDGETS FIJOS) ----------------- */}
        <aside className="hidden xl:flex w-[360px] shrink-0 bg-[#2b2d31] border-l border-neutral-700/60 flex-col p-5 gap-4 overflow-y-auto select-none text-left shadow-[-4px_0_0_0_#000]">
          
          {/* Card: Actualizar Nickname */}
          <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3.5 shadow-[0_2px_8px_rgba(0,0,0,.25)]">
            <h3 className="font-display font-semibold text-xs text-[#FFC200] flex items-center gap-1.5 leading-none">
              <User className="w-4 h-4" /> Actualizar Nickname
            </h3>
            
            <div className="space-y-1 text-xs">
              <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block">Tu nickname actual</span>
              <p className="font-mono text-[13px] bg-black/40 border border-neutral-700/60 rounded-2xl p-2 text-white font-bold leading-none select-text ">
                {profile.roblox_display_name}
              </p>
            </div>

            <form onSubmit={handleNicknameSubmit} className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block">Nuevo nickname</span>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 15) {
                      setNewNickname(val);
                    }
                  }}
                  placeholder="Escribe tu nuevo nickname..."
                  disabled={submittingNickname}
                  className="w-full bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-2.5 font-bold text-xs outline-none focus:border-[#FFC200] text-white placeholder-gray-600 "
                  required
                />
              </div>

              {/* COOLDOWN INDICATOR */}
              {(() => {
                const cooldown = getCooldownRemaining(profile.last_nickname_updated_at);
                if (cooldown) {
                  const totalMins = cooldown.hours * 60 + cooldown.minutes;
                  const percent = Math.max(0, Math.min(100, (totalMins / 1440) * 100));
                  return (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono font-bold text-[#ea580c]">
                        <span>COOLDOWN DISPONIBLE EN:</span>
                        <span>{cooldown.hours.toString().padStart(2, '0')}:{cooldown.minutes.toString().padStart(2, '0')}</span>
                      </div>
                      <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-black ">
                        <div className="h-full bg-[#ea580c]" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {nicknameError && (
                <p className="text-[9px] font-bold text-red-500 leading-tight">⚠️ {nicknameError}</p>
              )}

              <button
                type="submit"
                disabled={submittingNickname || getCooldownRemaining(profile.last_nickname_updated_at) !== null || newNickname.trim().length < 3 || newNickname.trim().length > 15}
                className="w-full py-2.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-[0.97] disabled:bg-neutral-800 disabled:text-gray-600 disabled:border-transparent disabled:cursor-not-allowed cursor-pointer"
              >
                {submittingNickname ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-black" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <span>🔄</span> Actualizar Nickname
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card: Silenciadores Globales */}
          <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3 shadow-[0_2px_8px_rgba(0,0,0,.25)]">
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
              <h3 className="font-display font-semibold text-xs text-[#FFC200] flex items-center gap-1.5 leading-none">
                🔇 Silenciadores Globales
              </h3>
              <span className="text-[8px] bg-red-600 text-white font-mono font-black px-2 py-0.5 rounded-2xl border border-neutral-700/60  animate-pulse">
                EN VIVO
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-left leading-tight pr-2">
                  <span className="text-xs font-semibold text-white block">Mutear Sonidos</span>
                  <span className="text-[9px] font-bold text-gray-500 block leading-tight">Bloquea todos los sonidos del stream</span>
                </div>
                <button 
                  disabled
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-not-allowed shrink-0 ${
                    isMuted ? 'bg-[#FFC200]' : 'bg-neutral-800'
                  }`}
                >
                  <div className={`bg-black w-4.5 h-4.5 rounded-full shadow-md transform duration-200 ease-in-out ${
                    isMuted ? 'translate-x-4.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-left leading-tight pr-2">
                  <span className="text-xs font-semibold text-white block">Mutear TTS</span>
                  <span className="text-[9px] font-bold text-gray-500 block leading-tight">Bloquea todos los mensajes TTS</span>
                </div>
                <button 
                  disabled
                  className="w-10 h-5.5 rounded-full p-0.5 bg-neutral-800 focus:outline-none cursor-not-allowed shrink-0"
                >
                  <div className="bg-black w-4.5 h-4.5 rounded-full shadow-md transform translate-x-0" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-left leading-tight pr-2">
                  <span className="text-xs font-semibold text-white block">Mutear Efectos Visuales</span>
                  <span className="text-[9px] font-bold text-gray-500 block leading-tight">Bloquea todos los efectos/animaciones</span>
                </div>
                <button 
                  disabled
                  className="w-10 h-5.5 rounded-full p-0.5 bg-neutral-800 focus:outline-none cursor-not-allowed shrink-0"
                >
                  <div className="bg-black w-4.5 h-4.5 rounded-full shadow-md transform translate-x-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Card: Sincronización en tiempo real */}
          <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 space-y-3.5 shadow-[0_2px_8px_rgba(0,0,0,.25)]">
            <div className="flex items-center justify-between border-b border-neutral-700/60 pb-2">
              <h3 className="font-display font-semibold text-xs text-[#FFC200] flex items-center gap-1.5 leading-none">
                🔄 Sincronización Realtime
              </h3>
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 border border-neutral-700/60 font-mono font-black px-1.5 py-0.5 rounded-2xl  uppercase">
                CONECTADO
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-2 space-y-0.5 ">
                <span className="text-[9px] font-medium text-gray-500 uppercase block">Estado</span>
                <span className="text-[9px] text-emerald-500 font-black">Activo</span>
              </div>
              <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-2 space-y-0.5 ">
                <span className="text-[9px] font-medium text-gray-500 uppercase block">Canal</span>
                <span className="text-[8px] text-white font-mono truncate block">vip-console</span>
              </div>
              <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-2 space-y-0.5 ">
                <span className="text-[9px] font-medium text-gray-500 uppercase block">Latencia</span>
                <span className="text-[9px] text-emerald-400 font-mono">42 ms</span>
              </div>
            </div>

            <p className="text-[9px] font-semibold text-gray-500 leading-relaxed">
              Todos los cambios y disparos en la botonera o silenciadores se reflejan instantáneamente para todos los miembros VIP.
            </p>
          </div>
        </aside>
      </div>

      {/* ----------------- MOBILE BOTTOM NAV BAR ----------------- */}
      <nav className="flex md:hidden h-16 bg-[#2b2d31] border-t border-neutral-700/40 items-center justify-around z-20 shrink-0 px-2 select-none rounded-t-2xl shadow-[0_-4px_0_0_#000]">
        {[
          { id: 'sounds', label: 'Sonidos', icon: Volume2 },
          { id: 'tts', label: 'Voz', icon: Send },
          { id: 'animations', label: 'Efectos', icon: Sparkles },
          { id: 'feed', label: 'Feed', icon: List },
        ].map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                soundManager.playPop();
                setActiveTab(tab.id as typeof activeTab);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl border border-transparent transition-all cursor-pointer ${
                isActive
                  ? 'text-[#FFC200] font-semibold'
                  : 'text-gray-500 font-bold'
              }`}
            >
              <IconComponent className="w-4.5 h-4.5" />
              <span className="text-[8px] uppercase tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        
        <button
          onClick={() => {
            soundManager.playPop();
            setIsMobileMenuOpen(true);
          }}
          className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-2xl text-gray-500 font-bold cursor-pointer border border-transparent"
        >
          <Menu className="w-4.5 h-4.5" />
          <span className="text-[8px] uppercase tracking-wide">Más</span>
        </button>
      </nav>

      {/* ----------------- NICKNAME ONBOARDING MODAL (Solo primer ingreso) ----------------- */}
      <AnimatePresence>
        {isNicknameModalOpen && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 max-w-md w-full shadow-[0_4px_12px_rgba(0,0,0,.25)] relative space-y-4 text-left pointer-events-auto"
            >
              {profile && isCustomNickname(profile.roblox_display_name) && (
                <button
                  onClick={() => {
                    setIsNicknameModalOpen(false);
                    setNicknameError(null);
                  }}
                  className="absolute top-4 right-4 w-8 h-8 bg-[#2b2d31] hover:bg-neutral-900 border border-neutral-700/60 rounded-2xl flex items-center justify-center font-black cursor-pointer text-white  active:scale-[0.97]"
                >
                  ✕
                </button>
              )}

              <div className="text-center space-y-2">
                <span className="text-5xl block animate-bounce">🐣</span>
                <h2 className="font-display font-bold text-xl leading-none text-[#FFC200] tracking-tight">
                  {profile && !isCustomNickname(profile.roblox_display_name) ? '¡Elige tu Nickname Oficial!' : 'Modificar tu Nickname'}
                </h2>
                <p className="text-[11px] font-semibold text-gray-400 leading-relaxed text-center">
                  {profile && !isCustomNickname(profile.roblox_display_name)
                    ? 'Como Miembro Oficial del Team Pollito, tu nombre en el juego debe llevar los pollitos a los costados.'
                    : 'Puedes cambiar la parte central de tu nickname. Recuerda el cooldown de 24 horas.'}
                </p>
              </div>

              <form onSubmit={handleNicknameSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-medium text-gray-500 tracking-wider uppercase">
                    Tu nombre central
                  </label>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 15) {
                        setNewNickname(val);
                      }
                    }}
                    placeholder="Ej: Milumon"
                    disabled={submittingNickname}
                    className="w-full bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-3 font-semibold text-sm outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200] text-white placeholder-gray-600 "
                    required
                  />
                  <div className="flex justify-between text-[8px] font-mono text-gray-500">
                    <span>Solo letras, números y espacios</span>
                    <span>{newNickname.length}/15</span>
                  </div>
                </div>

                {/* VISTA PREVIA */}
                <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-4 text-center space-y-1 ">
                  <span className="text-[10px] font-medium text-[#FFC200] tracking-wider uppercase block">Vista previa en el juego</span>
                  <span className="font-display font-semibold text-lg text-white">
                    🐣 {newNickname.trim() || 'TuNombre'} 🐣
                  </span>
                </div>

                {nicknameError && (
                  <div className="bg-red-950/80 border border-red-500 rounded-2xl p-3 text-[10px] font-semibold text-red-300 ">
                    ⚠️ {nicknameError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingNickname || newNickname.trim().length < 3 || newNickname.trim().length > 15}
                  className="w-full py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-lg border border-neutral-700/60 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submittingNickname ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                      Guardando y Etiquetando...
                    </>
                  ) : (
                    'Confirmar Nickname 🐣'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsNicknameModalOpen(false);
                    setIsRobloxOnboardingOpen(true);
                  }}
                  className="w-full text-center text-[10px] font-bold text-gray-400 hover:text-white underline cursor-pointer pt-2 block"
                >
                  ¿No es tu cuenta de Roblox o TikTok? Corregir datos
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Tab Bar */}
      <NavBar
        variant="tabbar"
        tabs={[
          { id: 'dashboard', name: 'Dash', icon: <LayoutDashboard className="w-4 h-4" />, onClick: () => setActiveTab('dashboard') },
          { id: 'sounds', name: 'Sonidos', icon: <Volume2 className="w-4 h-4" />, onClick: () => setActiveTab('sounds') },
          { id: 'tts', name: 'TTS', icon: <Send className="w-4 h-4" />, onClick: () => setActiveTab('tts') },
          { id: 'animations', name: 'Efectos', icon: <Sparkles className="w-4 h-4" />, onClick: () => setActiveTab('animations') },
          { id: 'feed', name: 'Feed', icon: <List className="w-4 h-4" />, onClick: () => setActiveTab('feed') },
          { id: 'nickname', name: 'Tag', icon: <User className="w-4 h-4" />, onClick: () => setActiveTab('nickname') },
          { id: 'my-sounds', name: 'Mis Audios', icon: <FileAudio className="w-4 h-4" />, onClick: () => setActiveTab('my-sounds') },
        ]}
        activeTab={activeTab}
      />

      {/* ----------------- MODAL DE PROTECCIÓN ANTI-SPAM ----------------- */}
      <AnimatePresence>
        {pendingTrigger && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-6 max-w-md w-full shadow-[0_4px_24px_rgba(0,0,0,.5)] relative space-y-4 text-left pointer-events-auto"
            >
              <div className="flex items-center gap-3 border-b border-neutral-700/40 pb-3 mb-2 shrink-0">
                <div className={`p-2 rounded-xl border ${
                  pendingTrigger.type === 'sound'
                    ? 'bg-[#FFC200]/10 border-[#FFC200]/20 text-[#FFC200]'
                    : pendingTrigger.type === 'animation'
                    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                    : 'bg-purple-500/10 border-purple-500/20 text-purple-400'
                }`}>
                  {pendingTrigger.type === 'sound' && <Volume2 className="w-5 h-5" />}
                  {pendingTrigger.type === 'animation' && <Sparkles className="w-5 h-5" />}
                  {pendingTrigger.type === 'tts' && <Send className="w-5 h-5" />}
                </div>
                <h2 className="font-display font-bold text-lg leading-none text-white tracking-tight">
                  {pendingTrigger.type === 'sound' && 'Confirmar Sonido'}
                  {pendingTrigger.type === 'animation' && 'Confirmar Animación'}
                  {pendingTrigger.type === 'tts' && 'Confirmar Mensaje de Voz'}
                </h2>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-300 leading-relaxed">
                  {pendingTrigger.message}
                </p>

                {/* Vista previa rápida del contenido si corresponde */}
                {pendingTrigger.type === 'sound' && (
                  <div className="bg-neutral-800 rounded-xl p-3 border border-neutral-700/40">
                    <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block">Sonido seleccionado</span>
                    <span className="font-display font-medium text-xs text-white">
                      📢 {sounds.find(s => s.id === pendingTrigger.content)?.name || pendingTrigger.content}
                    </span>
                  </div>
                )}
                {pendingTrigger.type === 'animation' && (
                  <div className="bg-neutral-800 rounded-xl p-3 border border-neutral-700/40">
                    <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block">Animación seleccionada</span>
                    <span className="font-display font-medium text-xs text-white">
                      🎬 {ANIMATIONS.find(a => a.id === pendingTrigger.content)?.name || pendingTrigger.content}
                    </span>
                  </div>
                )}
                {pendingTrigger.type === 'tts' && (
                  <div className="bg-neutral-800 rounded-xl p-3 border border-neutral-700/40 max-h-24 overflow-y-auto scrollbar-thin">
                    <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase block">Mensaje de voz</span>
                    <span className="font-sans text-xs text-white italic">
                      "{pendingTrigger.content}"
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal-dont-ask-checkbox"
                  checked={!confirmSpamGuard}
                  onChange={(e) => {
                    const disableSpamGuard = e.target.checked;
                    setConfirmSpamGuard(!disableSpamGuard);
                    window.localStorage.setItem('confirmSpamGuard', String(!disableSpamGuard));
                  }}
                  className="w-4 h-4 cursor-pointer accent-[#FFC200]"
                />
                <label htmlFor="modal-dont-ask-checkbox" className="text-xs font-bold text-gray-400 hover:text-white select-none cursor-pointer">
                  No volver a preguntar (desactivar protección)
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingTrigger(null)}
                  className="flex-1 py-3 bg-[#2b2d31] hover:bg-neutral-900 border border-neutral-700/60 rounded-xl text-gray-400 hover:text-white font-display font-semibold text-xs transition-all cursor-pointer active:scale-[0.97]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTrigger}
                  className={`flex-1 py-3 font-display font-semibold text-xs rounded-xl border border-neutral-700/60 transition-all cursor-pointer active:scale-[0.97] ${
                    pendingTrigger.type === 'sound'
                      ? 'bg-[#FFC200] hover:brightness-105 text-black'
                      : pendingTrigger.type === 'animation'
                      ? 'bg-cyan-500 hover:bg-cyan-600 text-black'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  Enviar 🚀
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ROBLOX ONBOARDING MODAL */}
      <RobloxOnboarding
        isOpen={isRobloxOnboardingOpen}
        onClose={() => setIsRobloxOnboardingOpen(false)}
        onConfirm={async () => {
          if (session) {
            await fetchProfile(session);
          }
        }}
        userSession={session ? { session } : null}
        currentProfile={profile ? {
          displayName: profile.roblox_display_name || profile.roblox_user || 'Pollito',
          avatarUrl: profile.roblox_avatar_url || null,
          username: profile.roblox_user || null,
          tiktokUser: profile.tiktok_user || null,
          linkStatus: profile.link_status || 'none',
          rejectionReason: profile.rejection_reason || null,
        } : null}
      />
    </div>
  );
}





