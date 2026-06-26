'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  Volume2, 
  Send, 
  Clock, 
  Sparkles, 
  ShieldAlert, 
  ArrowLeft, 
  Loader2, 
  List, 
  User
} from 'lucide-react';
import { soundManager } from '@/lib/sound';
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

const ANIMATIONS = [
  { id: 'eggs', name: '🥚 Lluvia de Huevos', color: 'from-amber-200 to-yellow-300' },
  { id: 'sparkles', name: '✨ Destellos Brillantes', color: 'from-teal-100 to-cyan-300' },
  { id: 'confetti', name: '🎉 Lluvia de Confeti', color: 'from-pink-200 to-purple-300' },
];

const getSoundColor = (soundId: string) => {
  switch (soundId) {
    case 'risa': return 'bg-yellow-100 hover:bg-yellow-200/80 text-yellow-900 border-yellow-400';
    case 'bocina': return 'bg-red-100 hover:bg-red-200/80 text-red-900 border-red-400';
    case 'grito': return 'bg-pink-100 hover:bg-pink-200/80 text-pink-900 border-pink-400';
    case 'aplausos': return 'bg-emerald-100 hover:bg-emerald-200/80 text-emerald-900 border-emerald-400';
    case 'suspenso': return 'bg-purple-100 hover:bg-purple-200/80 text-purple-900 border-purple-400';
    case 'sorpresa': return 'bg-orange-100 hover:bg-orange-200/80 text-orange-900 border-orange-400';
    case 'fallo': return 'bg-slate-100 hover:bg-slate-200/80 text-slate-800 border-slate-400';
    case 'victoria': return 'bg-sky-100 hover:bg-sky-200/80 text-sky-900 border-sky-400';
    default: return 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-300';
  }
};

export default function MemberConsolePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StoredRobloxProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<StreamEvent[]>([]);

  // Navigation state (app feel)
  const [activeTab, setActiveTab] = useState<'sounds' | 'tts' | 'animations' | 'feed'>('sounds');

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [sendingTts, setSendingTts] = useState(false);

  // Sound/Animation Trigger State
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Dynamic Sounds Board
  const [sounds, setSounds] = useState<{ id: string; name: string }[]>([]);
  const [loadingSounds, setLoadingSounds] = useState(true);

  // Stream Settings State
  const [streamSettings, setStreamSettings] = useState<StreamSettings | null>(null);

  // Cooldowns State
  const [soundCooldown, setSoundCooldown] = useState(0);
  const [ttsCooldown, setTtsCooldown] = useState(0);
  const [animationCooldown, setAnimationCooldown] = useState(0);

  // Nickname State
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [submittingNickname, setSubmittingNickname] = useState(false);
  const [isBotAccount, setIsBotAccount] = useState(false);

  // Error/Success state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  const triggerEvent = useCallback(async (type: 'sound' | 'tts' | 'animation', content: string) => {
    if (!session) return;
    setError(null);
    setSuccess(null);

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
  }, [session, soundCooldown, ttsCooldown, animationCooldown, fetchRecentEvents, streamSettings]);

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
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRecentEvents, fetchSounds, fetchStreamSettings]);

  // Cooldown countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setSoundCooldown((c) => (c > 0 ? c - 1 : 0));
      setTtsCooldown((c) => (c > 0 ? c - 1 : 0));
      setAnimationCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
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
      <div className="h-screen w-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
        <p className="mt-3 font-black text-sm uppercase tracking-wider">Cargando consola VIP...</p>
      </div>
    );
  }

  // Not logged in -> show warning
  if (!session) {
    return (
      <div className="h-screen w-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex items-center justify-center p-4 font-sans text-black">
        <div className="w-full max-w-md bg-white border-4 border-black rounded-[2rem] p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 border-4 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-black text-3xl uppercase leading-tight mb-2">Acceso Restringido</h1>
          <p className="text-sm font-semibold text-gray-600 leading-relaxed mb-6">
            Iniciá sesión en el portal de comunidad con tu cuenta autorizada para acceder a la Consola en Vivo de Miembros Oficiales.
          </p>
          <button
            onClick={handleBackToLanding}
            className="w-full py-3 bg-black hover:bg-neutral-900 text-[#FFD700] font-black uppercase text-sm rounded-xl border-4 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer"
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
      <div className="h-screen w-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex items-center justify-center p-4 font-sans text-black">
        <div className="w-full max-w-md bg-white border-4 border-black rounded-[2rem] p-6 shadow-[10px_10px_0_0_rgba(0,0,0,1)]">
          <div className={`w-16 h-16 rounded-2xl border-4 border-black flex items-center justify-center mb-4 shadow-[4px_4px_0_0_rgba(0,0,0,1)] ${
            isPending ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
          }`}>
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="font-black text-2xl uppercase leading-tight mb-2">
            {isPending ? 'Postulación en Revisión' : isRejected ? 'Postulación Rechazada' : 'Vinculación Requerida'}
          </h1>
          <p className="text-sm font-semibold text-gray-600 leading-relaxed mb-4">
            {isPending 
              ? 'Tu solicitud de vinculación está siendo evaluada por Milumon. Cuando seas aprobado como Miembro Oficial, se habilitará la consola interactiva.'
              : isRejected 
              ? `Tu vinculación fue rechazada. Motivo: "${profile?.rejection_reason || 'Sin motivo especificado'}"`
              : 'Para acceder a la Consola en Vivo debés completar tu onboarding y ser aprobado como Miembro Oficial.'}
          </p>
          <button
            onClick={handleBackToLanding}
            className="w-full py-3 bg-black hover:bg-neutral-900 text-[#FFD700] font-black uppercase text-sm rounded-xl border-4 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  const isMuted = streamSettings?.is_muted;

  // Soundboard cooldown math
  const maxSoundCd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
  const soundCooldownPercent = soundCooldown > 0 ? (soundCooldown / maxSoundCd) * 100 : 0;

  // Animation cooldown math
  const maxAnimCd = Math.min(60, streamSettings?.personal_cooldown_seconds ?? 60);
  const animCooldownPercent = animationCooldown > 0 ? (animationCooldown / maxAnimCd) * 100 : 0;



  return (
    <div className="h-[100dvh] w-screen bg-[#ffe97a] md:bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] text-black font-sans flex flex-col md:flex-row overflow-hidden select-none">
      
      {/* ----------------- MOBILE HEADER ----------------- */}
      <header className="flex md:hidden bg-black text-[#FFD700] border-b-4 border-black p-3 items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-white border-2 border-black overflow-hidden flex items-center justify-center shrink-0">
            {profile.roblox_avatar_url ? (
              <img src={profile.roblox_avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">🐣</span>
            )}
          </div>
          <div className="text-left leading-none">
            <span className="bg-[#ea580c] text-white border border-black rounded px-1 text-[7px] font-black uppercase tracking-wider">VIP</span>
            <h1 className="font-black text-sm uppercase truncate max-w-[120px] mt-0.5">{profile.roblox_display_name}</h1>
          </div>
        </div>

        {/* STATUS INDICATORS */}
        <div className="flex items-center gap-2">
          {isMuted && (
            <span className="text-xs bg-red-600 text-white font-black px-2 py-0.5 border-2 border-black rounded-lg animate-pulse">
              🔇 MUTE
            </span>
          )}
          <button
            onClick={() => {
              const cleanName = (profile.roblox_display_name || '').replace(/🐣/g, '').trim();
              setNewNickname(cleanName);
              setIsNicknameModalOpen(true);
            }}
            className="p-1.5 bg-neutral-800 text-[#FFD700] rounded-lg border-2 border-black hover:bg-neutral-700 active:scale-95 transition-all"
            title="Editar Nickname"
          >
            <User className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleBackToLanding}
            className="p-1.5 bg-[#FFD700] text-black rounded-lg border-2 border-black active:scale-95 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        </div>
      </header>

      {/* ----------------- DESKTOP SIDEBAR ----------------- */}
      <aside className="hidden md:flex md:w-80 bg-black text-[#FFD700] border-r-4 border-black p-6 flex-col justify-between shrink-0 z-10 select-none">
        <div className="space-y-6">
          {/* PROFILE CARD */}
          <div className="bg-neutral-900 border-4 border-[#FFD700] rounded-[1.5rem] p-4 shadow-[4px_4px_0_0_#000] relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white border-2 border-black overflow-hidden flex items-center justify-center shrink-0">
                {profile.roblox_avatar_url ? (
                  <img src={profile.roblox_avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🐣</span>
                )}
              </div>
              <div className="min-w-0 text-left">
                <span className="bg-[#ea580c] text-white border-2 border-black rounded px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider">VIP MEMBER</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <h2 className="font-black text-lg uppercase truncate leading-none">{profile.roblox_display_name}</h2>
                  {!isBotAccount && !getCooldownRemaining(profile.last_nickname_updated_at) && (
                    <button
                      onClick={() => {
                        const cleanName = (profile.roblox_display_name || '').replace(/🐣/g, '').trim();
                        setNewNickname(cleanName);
                        setIsNicknameModalOpen(true);
                      }}
                      className="p-0.5 hover:bg-neutral-800 rounded text-[#FFD700] hover:text-white cursor-pointer"
                      title="Editar Nickname"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-yellow-100 font-bold mt-1">Roblox: @{profile.roblox_user}</p>
              </div>
            </div>
            
            {/* Nickname Lock status */}
            {(() => {
              if (isBotAccount) return null;
              const cooldown = getCooldownRemaining(profile.last_nickname_updated_at);
              if (cooldown) {
                return (
                  <div className="mt-3 bg-black/40 border border-yellow-500/20 rounded-lg p-1.5 text-[9px] font-black text-yellow-300 flex items-center justify-center gap-1">
                    🔒 Cambio de nick listo en: {cooldown.hours}h {cooldown.minutes}m
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* DESKTOP TABS SELECTORS */}
          <nav className="flex flex-col gap-2.5">
            <span className="text-[9px] uppercase tracking-widest font-black text-gray-500 block px-1">Secciones</span>
            <button
              onClick={() => { soundManager.playPop(); setActiveTab('sounds'); }}
              className={`w-full py-3.5 px-4 rounded-xl border-4 border-black font-black uppercase text-xs tracking-wider flex items-center justify-between transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                activeTab === 'sounds'
                  ? 'bg-[#FFD700] text-black shadow-[4px_4px_0_0_#000]'
                  : 'bg-neutral-900 text-gray-400 hover:text-white border-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Botonera Sonidos</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-black/20 rounded">🔊</span>
            </button>
            
            <button
              onClick={() => { soundManager.playPop(); setActiveTab('tts'); }}
              className={`w-full py-3.5 px-4 rounded-xl border-4 border-black font-black uppercase text-xs tracking-wider flex items-center justify-between transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                activeTab === 'tts'
                  ? 'bg-[#FFD700] text-black shadow-[4px_4px_0_0_#000]'
                  : 'bg-neutral-900 text-gray-400 hover:text-white border-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2"><Send className="w-4 h-4" /> Voz del Stream (TTS)</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-black/20 rounded">🗣️</span>
            </button>
            
            <button
              onClick={() => { soundManager.playPop(); setActiveTab('animations'); }}
              className={`w-full py-3.5 px-4 rounded-xl border-4 border-black font-black uppercase text-xs tracking-wider flex items-center justify-between transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer ${
                activeTab === 'animations'
                  ? 'bg-[#FFD700] text-black shadow-[4px_4px_0_0_#000]'
                  : 'bg-neutral-900 text-gray-400 hover:text-white border-neutral-800'
              }`}
            >
              <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Efectos en Pantalla</span>
              <span className="text-[9px] px-1.5 py-0.2 bg-black/20 rounded">✨</span>
            </button>
          </nav>

          {/* STREAM STATUS PANEL */}
          <div className="bg-neutral-950 border-4 border-neutral-800 rounded-2xl p-4 space-y-3.5 text-left">
            <h3 className="font-black text-xs uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              Estado del Stream
            </h3>
            
            <div className="space-y-1.5 text-[11px] font-semibold text-gray-400">
              <p className="flex justify-between">
                <span>Consola VIP:</span>
                <span className={isMuted ? 'text-red-500 font-bold' : 'text-emerald-500 font-bold'}>
                  {isMuted ? '🔇 SILENCIADA' : '🔊 ACTIVA'}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Cooldown Global:</span>
                <span className="text-white font-mono">{streamSettings?.global_cooldown_seconds ?? 30}s</span>
              </p>
              <p className="flex justify-between">
                <span>Cooldown Personal:</span>
                <span className="text-white font-mono">{streamSettings?.personal_cooldown_seconds ?? 300}s</span>
              </p>
            </div>
          </div>
        </div>

        {/* LOGOUT */}
        <button
          onClick={handleBackToLanding}
          className="w-full py-3 bg-[#FFD700] hover:bg-yellow-300 text-black font-black uppercase text-xs rounded-xl border-4 border-black flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(255,255,255,0.05)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[3]" />
          Volver al Inicio
        </button>
      </aside>

      {/* ----------------- FEEDBACK BANNERS ----------------- */}
      <AnimatePresence>
        {(error || success) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-16 md:top-6 left-6 right-6 md:left-auto md:right-6 md:max-w-md z-40"
          >
            {error && (
              <div className="bg-red-100 border-4 border-black rounded-2xl p-4 text-xs font-bold text-red-800 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex items-start gap-2">
                <span className="text-lg">⚠️</span>
                <div>{error}</div>
              </div>
            )}
            {success && (
              <div className="bg-emerald-100 border-4 border-black rounded-2xl p-4 text-xs font-bold text-emerald-800 shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex items-start gap-2">
                <span className="text-lg">🚀</span>
                <div>{success}</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- MAIN VIEWPORT CONTAINER ----------------- */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 relative overflow-hidden md:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'sounds' && (
              <motion.div
                key="sounds-tab"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 md:p-0 flex flex-col overflow-hidden"
              >
                {/* CONTAINER CARD FOR SOUNDS */}
                <div className="flex-1 bg-white border-4 border-black rounded-[2rem] p-5 md:p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-6 h-6 text-[#ea580c]" />
                      <h2 className="font-black text-lg md:text-xl uppercase">Botonera VIP (Soundboard)</h2>
                    </div>
                    <span className="text-[10px] bg-yellow-100 border-2 border-black rounded-full px-2.5 py-0.5 font-black uppercase text-amber-800">
                      Coold: {streamSettings ? `${Math.min(60, streamSettings.personal_cooldown_seconds)}s` : '60s'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-gray-500 mb-4 shrink-0">
                    Tocá un sonido para reproducirlo instantáneamente en el directo de Milumon.
                  </p>

                  {/* INTERNAL SCROLLABLE GRID */}
                  <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                    {loadingSounds ? (
                      <div className="flex flex-col items-center justify-center h-48 text-center text-xs font-bold text-gray-500 uppercase animate-pulse">
                        <Loader2 className="w-7 h-7 animate-spin mb-2" />
                        Cargando sonidos...
                      </div>
                    ) : sounds.length === 0 ? (
                      <div className="py-12 text-center text-xs font-bold text-gray-400 border-4 border-dashed border-gray-300 rounded-[1.5rem]">
                        No hay sonidos disponibles en este momento.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
                        {sounds.map((sound) => {
                          const isCooldown = soundCooldown > 0;
                          const colorClasses = getSoundColor(sound.id);

                          return (
                            <motion.button
                              key={sound.id}
                              whileTap={{ scale: 0.94 }}
                              disabled={isCooldown || triggeringId !== null || isMuted}
                              onClick={() => void triggerEvent('sound', sound.id)}
                              className={`relative py-4.5 px-3 border-4 border-black rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all select-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer overflow-hidden ${colorClasses}`}
                            >
                              {/* Background cooldown loading bar */}
                              {isCooldown && (
                                <motion.div
                                  initial={{ width: '100%' }}
                                  animate={{ width: `${soundCooldownPercent}%` }}
                                  transition={{ duration: 1, ease: 'linear' }}
                                  className="absolute inset-0 bg-black/10 pointer-events-none"
                                />
                              )}

                              <span className="block truncate relative z-10" title={sound.name}>
                                {sound.name}
                              </span>

                              {isCooldown && (
                                <span className="absolute inset-0 bg-black/2 hover:bg-black/5 rounded-xl flex items-center justify-center text-xs font-mono font-black text-black z-20 pointer-events-none">
                                  <Clock className="w-3.5 h-3.5 mr-1" /> {soundCooldown}s
                                </span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tts' && (
              <motion.div
                key="tts-tab"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 md:p-0 flex flex-col overflow-hidden"
              >
                {/* CONTAINER CARD FOR TTS */}
                <div className="flex-1 bg-white border-4 border-black rounded-[2rem] p-5 md:p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col overflow-hidden max-w-xl mx-auto w-full">
                  <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <Send className="w-6 h-6 text-[#ea580c]" />
                      <h2 className="font-black text-lg md:text-xl uppercase">Text-To-Speech (TTS)</h2>
                    </div>
                    <span className="text-[10px] bg-yellow-100 border-2 border-black rounded-full px-2.5 py-0.5 font-black uppercase text-amber-800">
                      Voz Neural
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-gray-500 mb-4 shrink-0">
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
                          className="w-full bg-[#fcfbf7] border-4 border-black rounded-2xl p-4 font-semibold text-sm outline-none focus:ring-4 focus:ring-yellow-300 min-h-[120px] resize-none disabled:opacity-50 disabled:cursor-not-allowed text-black placeholder-gray-400"
                        />
                        <span className={`absolute bottom-4 right-4 text-[10px] font-black ${
                          ttsText.length >= 100 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {ttsText.length}/120
                        </span>
                      </div>

                      <motion.button
                        type="submit"
                        whileTap={{ scale: 0.96 }}
                        disabled={ttsCooldown > 0 || !ttsText.trim() || sendingTts || isMuted}
                        className="w-full py-4 bg-black hover:bg-neutral-900 text-[#FFD700] font-black uppercase text-sm rounded-xl border-4 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {sendingTts ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" />
                            Generando Audio...
                          </>
                        ) : ttsCooldown > 0 ? (
                          <>
                            <Clock className="w-4 h-4 text-[#FFD700]" />
                            Cooldown ({ttsCooldown}s)
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 text-[#FFD700]" />
                            Enviar Mensaje de Voz
                          </>
                        )}
                      </motion.button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'animations' && (
              <motion.div
                key="animations-tab"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 md:p-0 flex flex-col overflow-hidden"
              >
                {/* CONTAINER CARD FOR ANIMATIONS */}
                <div className="flex-1 bg-white border-4 border-black rounded-[2rem] p-5 md:p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between border-b-4 border-black pb-3 mb-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-[#ea580c]" />
                      <h2 className="font-black text-lg md:text-xl uppercase">Efectos Visuales (Animations)</h2>
                    </div>
                    <span className="text-[10px] bg-yellow-100 border-2 border-black rounded-full px-2.5 py-0.5 font-black uppercase text-amber-800">
                      Coold: {streamSettings ? `${Math.min(60, streamSettings.personal_cooldown_seconds)}s` : '60s'}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-gray-500 mb-6 shrink-0">
                    Dispará efectos visuales animados directamente en la pantalla de la transmisión.
                  </p>

                  <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-1">
                      {ANIMATIONS.map((anim) => {
                        const isCooldown = animationCooldown > 0;
                        const isThisTriggering = triggeringId === anim.id;

                        return (
                          <motion.div
                            key={anim.id}
                            whileHover={{ y: -3 }}
                            className="bg-white border-4 border-black rounded-3xl p-5 shadow-[4px_4px_0_0_rgba(0,0,0,1)] flex flex-col justify-between h-48 relative overflow-hidden"
                          >
                            {/* Inner cooldown loading bar */}
                            {isCooldown && (
                              <motion.div
                                initial={{ height: '100%' }}
                                animate={{ height: `${animCooldownPercent}%` }}
                                transition={{ duration: 1, ease: 'linear' }}
                                className="absolute left-0 right-0 bottom-0 bg-black/5 pointer-events-none"
                              />
                            )}

                            <div className="space-y-1">
                              <span className="text-3xl block mb-2">{anim.name.split(' ')[0]}</span>
                              <h3 className="font-black text-sm uppercase text-left">{anim.name.substring(anim.name.indexOf(' ') + 1)}</h3>
                              <p className="text-[10px] text-gray-400 font-bold text-left uppercase">FX de Pantalla</p>
                            </div>

                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              disabled={isCooldown || triggeringId !== null || isMuted}
                              onClick={() => void triggerEvent('animation', anim.id)}
                              className={`w-full py-2.5 border-3 border-black rounded-xl font-black text-[11px] uppercase tracking-wide cursor-pointer transition-all shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 bg-gradient-to-r ${anim.color} text-black`}
                            >
                              {isCooldown ? (
                                <span className="flex items-center justify-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> Esperar {animationCooldown}s
                                </span>
                              ) : isThisTriggering ? (
                                'Enviando...'
                              ) : (
                                'Disparar Alerta'
                              )}
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'feed' && (
              <motion.div
                key="feed-tab"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 p-4 md:p-0 flex flex-col overflow-hidden"
              >
                {/* CONTAINER CARD FOR FEED (Mobile Only fallback tab) */}
                <div className="flex-1 bg-white border-4 border-black rounded-[2rem] p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] flex flex-col overflow-hidden">
                  <div className="flex items-center gap-2 border-b-4 border-black pb-3 mb-4 shrink-0">
                    <List className="w-5 h-5 text-[#ea580c]" />
                    <h2 className="font-black text-lg uppercase">Feed del Directo</h2>
                  </div>

                  {/* EVENT FEED SCROLLABLE */}
                  <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3">
                    {recentEvents.length === 0 ? (
                      <div className="py-12 text-center bg-yellow-50/50 border-4 border-dashed border-black rounded-[1.5rem]">
                        <p className="text-xs font-bold text-gray-500 uppercase">Sin eventos recientes</p>
                      </div>
                    ) : (
                      recentEvents.map((evt) => {
                        let icon = '🔊';
                        let badge = 'SONIDO';
                        let details = evt.content;
                        if (evt.type === 'sound') {
                          details = sounds.find(s => s.id === evt.content)?.name || evt.content;
                        } else if (evt.type === 'tts') {
                          icon = '🗣️';
                          badge = 'TTS';
                          details = `"${evt.content}"`;
                        } else if (evt.type === 'animation') {
                          icon = '✨';
                          badge = 'EFECTO';
                          details = ANIMATIONS.find(a => a.id === evt.content)?.name || evt.content;
                        }

                        return (
                          <div 
                            key={evt.id} 
                            className="bg-[#fffdf2] border-3 border-black rounded-2xl p-3 text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] flex items-start gap-2.5"
                          >
                            <div className="w-8 h-8 rounded-lg bg-yellow-100 border-2 border-black flex items-center justify-center text-sm shrink-0">
                              {icon}
                            </div>
                            <div className="min-w-0 flex-1 text-left">
                              <span className="font-mono font-black text-[8px] bg-yellow-200 border border-black rounded px-1.5 py-0.5">
                                {badge}
                              </span>
                              <p className="font-bold text-black break-words mt-1 leading-snug">{details}</p>
                              <p className="text-[9px] font-black text-[#ea580c] mt-0.5">Por: @{evt.sender_roblox_user || 'VIP'}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ----------------- DESKTOP RIGHT SIDEBAR (Feed always visible) ----------------- */}
      <aside className="hidden lg:flex lg:w-80 bg-white border-l-4 border-black p-5 flex-col overflow-hidden z-10 shrink-0 select-none">
        <div className="flex items-center gap-2 border-b-4 border-black pb-3 shrink-0">
          <List className="w-5 h-5 text-[#ea580c]" />
          <h2 className="font-black text-lg uppercase">Feed del Directo</h2>
        </div>
        
        <p className="text-[10px] font-semibold text-gray-500 leading-tight py-3 text-left border-b border-black/10 shrink-0">
          Historial en vivo de las interacciones disparadas por la comunidad VIP.
        </p>

        {/* FEED SCROLLABLE */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin space-y-3 pt-3">
          {recentEvents.length === 0 ? (
            <div className="py-8 text-center bg-yellow-50/70 border-2 border-dashed border-black rounded-xl">
              <p className="text-xs font-bold text-gray-500 uppercase">Sin eventos recientes</p>
            </div>
          ) : (
            recentEvents.map((evt) => {
              let badge = '';
              let details = evt.content;
              if (evt.type === 'sound') {
                badge = '🔊 SONIDO';
                details = sounds.find(s => s.id === evt.content)?.name || evt.content;
              } else if (evt.type === 'tts') {
                badge = '🗣️ TTS';
                details = `"${evt.content}"`;
              } else if (evt.type === 'animation') {
                badge = '✨ EFECTO';
                details = ANIMATIONS.find(a => a.id === evt.content)?.name || evt.content;
              }

              return (
                <motion.article 
                  layout
                  key={evt.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#fffdf2] border-2 border-black rounded-xl p-3 text-[11px] shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex flex-col gap-1.5 text-left"
                >
                  <div className="flex items-center justify-between gap-1.5 border-b border-black/10 pb-1.5">
                    <span className="font-mono font-black text-[8px] bg-yellow-200 border border-black rounded px-1">
                      {badge}
                    </span>
                    <span className="text-[8px] font-semibold text-gray-400">
                      {new Date(evt.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  
                  <p className="font-sans font-bold text-black break-words leading-snug">
                    {details}
                  </p>

                  <p className="text-[9px] font-black text-[#ea580c] truncate">
                    Por: @{evt.sender_roblox_user || 'VIP'}
                  </p>
                </motion.article>
              );
            })
          )}
        </div>
      </aside>

      {/* ----------------- MOBILE BOTTOM NAV BAR ----------------- */}
      <nav className="flex md:hidden h-18 bg-white border-t-4 border-black items-center justify-around z-20 shrink-0 px-2 select-none">
        <button
          onClick={() => { soundManager.playPop(); setActiveTab('sounds'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'sounds'
              ? 'bg-[#FFD700] border-3 border-black text-black font-black'
              : 'text-gray-500 font-bold border-3 border-transparent'
          }`}
        >
          <Volume2 className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wide">Sonidos</span>
        </button>
        
        <button
          onClick={() => { soundManager.playPop(); setActiveTab('tts'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'tts'
              ? 'bg-[#FFD700] border-3 border-black text-black font-black'
              : 'text-gray-500 font-bold border-3 border-transparent'
          }`}
        >
          <Send className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wide">Voz</span>
        </button>
        
        <button
          onClick={() => { soundManager.playPop(); setActiveTab('animations'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-xl transition-all ${
            activeTab === 'animations'
              ? 'bg-[#FFD700] border-3 border-black text-black font-black'
              : 'text-gray-500 font-bold border-3 border-transparent'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wide">Efectos</span>
        </button>
        
        <button
          onClick={() => { soundManager.playPop(); setActiveTab('feed'); }}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-3.5 rounded-xl transition-all relative ${
            activeTab === 'feed'
              ? 'bg-[#FFD700] border-3 border-black text-black font-black'
              : 'text-gray-500 font-bold border-3 border-transparent'
          }`}
        >
          <List className="w-5 h-5" />
          <span className="text-[9px] uppercase tracking-wide">Feed</span>
        </button>
      </nav>

      {/* ----------------- NICKNAME ONBOARDING & EDIT MODAL ----------------- */}
      <AnimatePresence>
        {isNicknameModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border-4 border-black rounded-[2.5rem] p-6 max-w-md w-full shadow-[10px_10px_0_0_rgba(0,0,0,1)] relative space-y-4 text-left pointer-events-auto"
            >
              
              {/* Si ya tiene nickname personalizado, permitimos cerrar el modal */}
              {profile && isCustomNickname(profile.roblox_display_name) && (
                <button
                  onClick={() => {
                    setIsNicknameModalOpen(false);
                    setNicknameError(null);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 bg-yellow-100 hover:bg-yellow-200 border-2 border-black rounded-full flex items-center justify-center font-black cursor-pointer shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                >
                  ✕
                </button>
              )}

              <div className="text-center space-y-2">
                <span className="text-5xl block animate-bounce">🐣</span>
                <h2 className="font-display font-black text-2xl uppercase leading-none">
                  {profile && !isCustomNickname(profile.roblox_display_name) ? '¡Elegí tu Nickname Oficial!' : 'Modificar tu Nickname'}
                </h2>
                <p className="text-xs font-semibold text-gray-500 leading-relaxed text-balance text-center">
                  {profile && !isCustomNickname(profile.roblox_display_name)
                    ? 'Como Miembro Oficial del Team Pollito, tu nombre en el juego debe llevar los pollitos a los costados.'
                    : 'Podés cambiar la parte central de tu nickname. Recordá el cooldown de 1 vez al día.'}
                </p>
              </div>

              <form onSubmit={handleNicknameSubmit} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-gray-500 tracking-wider">
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
                    className="w-full bg-[#fcfbf7] border-4 border-black rounded-xl p-3 font-bold text-sm outline-none focus:ring-3 focus:ring-yellow-300 disabled:opacity-50 text-black placeholder-gray-400"
                    required
                  />
                  <div className="flex justify-between text-[9px] font-black text-gray-400">
                    <span>Solo letras, números y espacios</span>
                    <span>{newNickname.length}/15</span>
                  </div>
                </div>

                {/* VISTA PREVIA */}
                <div className="bg-yellow-50 border-3 border-black rounded-2xl p-4 text-center space-y-1">
                  <span className="text-[9px] uppercase font-black text-yellow-600 tracking-wider block">Vista previa en el juego</span>
                  <span className="font-display font-black text-lg text-black uppercase tracking-wide">
                    🐣 {newNickname.trim() || 'TuNombre'} 🐣
                  </span>
                </div>

                {nicknameError && (
                  <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 text-[11px] font-bold text-red-700">
                    ⚠️ {nicknameError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingNickname || newNickname.trim().length < 3 || newNickname.trim().length > 15}
                  className="w-full py-3.5 bg-black hover:bg-neutral-900 text-[#FFD700] font-black uppercase text-sm rounded-xl border-4 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:translate-y-0.5 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)]"
                >
                  {submittingNickname ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" />
                      Guardando y Etiquetando...
                    </>
                  ) : (
                    'Confirmar Nickname 🐣'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
