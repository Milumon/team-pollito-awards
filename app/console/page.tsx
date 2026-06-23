'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Volume2, Send, Clock, Sparkles, ShieldAlert, ArrowLeft, Loader2, List } from 'lucide-react';
import { soundManager } from '@/lib/sound';

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
};

type StreamEvent = {
  id: string;
  type: 'sound' | 'tts' | 'animation';
  content: string;
  sender_roblox_user: string | null;
  sender_tiktok_user: string | null;
  created_at: string;
};

const SOUNDS = [
  { id: 'risa', name: '😂 Risa', file: 'risa.mp3' },
  { id: 'bocina', name: '🚨 Bocina', file: 'bocina.mp3' },
  { id: 'grito', name: '😱 Grito', file: 'grito.mp3' },
  { id: 'aplausos', name: '👏 Aplausos', file: 'aplausos.mp3' },
  { id: 'suspenso', name: '🎻 Suspenso', file: 'suspenso.mp3' },
  { id: 'sorpresa', name: '😮 Sorpresa', file: 'sorpresa.mp3' },
  { id: 'fallo', name: '❌ Fallo', file: 'fallo.mp3' },
  { id: 'victoria', name: '🏆 Victoria', file: 'victoria.mp3' },
];

const ANIMATIONS = [
  { id: 'eggs', name: '🥚 Lluvia de Huevos' },
  { id: 'sparkles', name: '✨ Destellos Brillantes' },
  { id: 'confetti', name: '🎉 Lluvia de Confeti' },
];

export default function MemberConsolePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StoredRobloxProfile | null>(null);
  const [recentEvents, setRecentEvents] = useState<StreamEvent[]>([]);

  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [sendingTts, setSendingTts] = useState(false);

  // Sound/Animation Trigger State
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Cooldowns State
  const [soundCooldown, setSoundCooldown] = useState(0);
  const [ttsCooldown, setTtsCooldown] = useState(0);
  const [animationCooldown, setAnimationCooldown] = useState(0);

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
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  }, []);

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
      soundManager.playPop();

      // Trigger local cooldowns
      if (type === 'sound') {
        setSoundCooldown(60); // 60s cooldown for sounds
      } else if (type === 'animation') {
        setAnimationCooldown(60); // 60s cooldown for animations
      } else if (type === 'tts') {
        setTtsText('');
        setTtsCooldown(300); // 5 mins cooldown for TTS
      }

      void fetchRecentEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar');
    } finally {
      setTriggeringId(null);
      setSendingTts(false);
    }
  }, [session, soundCooldown, ttsCooldown, animationCooldown, fetchRecentEvents]);

  // Auth initialization
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);
      if (initialSession) {
        await fetchProfile(initialSession);
        await fetchRecentEvents();
      }
      setLoading(false);
    };

    void initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, nextSession: Session | null) => {
      setSession(nextSession);
      if (nextSession) {
        await fetchProfile(nextSession);
        await fetchRecentEvents();
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchRecentEvents]);

  // Cooldown countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setSoundCooldown((c) => (c > 0 ? c - 1 : 0));
      setTtsCooldown((c) => (c > 0 ? c - 1 : 0));
      setAnimationCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Supabase Realtime Subscription for events
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('stream-events-console')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stream_events' },
        (payload: { new: StreamEvent }) => {
          const newEvent = payload.new;
          setRecentEvents((prev) => [newEvent, ...prev.slice(0, 9)]);
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          if (!warnedRealtimeRef.current) {
            console.log('[Console] Suscrito a eventos en tiempo real');
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
        <p className="mt-3 font-black text-sm uppercase tracking-wider">Cargando consola VIP...</p>
      </div>
    );
  }

  // Not logged in -> show warning
  if (!session) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex items-center justify-center p-4 font-sans text-black">
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] flex items-center justify-center p-4 font-sans text-black">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fffbe0_0%,_#fff4b8_45%,_#ffe97a_100%)] text-black px-4 py-6 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="bg-black text-[#FFD700] rounded-[2rem] border-4 border-black p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-black overflow-hidden flex items-center justify-center shrink-0">
              {profile.roblox_avatar_url ? (
                <img src={profile.roblox_avatar_url} alt={profile.roblox_user || 'User'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">🐣</span>
              )}
            </div>
            <div className="text-left">
              <span className="bg-[#ea580c] text-white border-2 border-black rounded px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">VIP MEMBER</span>
              <h1 className="font-black text-xl leading-none uppercase mt-1">{profile.roblox_display_name}</h1>
              <p className="text-[10px] text-yellow-100 font-bold">Roblox: @{profile.roblox_user}</p>
            </div>
          </div>

          <button
            onClick={handleBackToLanding}
            className="px-4 py-2.5 bg-[#FFD700] hover:bg-yellow-300 text-black font-black uppercase text-xs rounded-xl border-2 border-black flex items-center gap-1.5 shadow-[3px_3px_0_0_rgba(255,255,255,0.15)] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[3]" />
            Inicio
          </button>
        </header>

        {/* FEEDBACK STATUS BANNERS */}
        {error && (
          <div className="bg-red-100 border-4 border-black rounded-2xl p-4 text-xs font-bold text-red-800 shadow-[4px_4px_0_0_rgba(0,0,0,1)] animate-shake">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-100 border-4 border-black rounded-2xl p-4 text-xs font-bold text-emerald-800 shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            {success}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[1fr_320px]">
          
          {/* MAIN VIP INTERACTIVE SECTION */}
          <main className="space-y-6">
            
            {/* SOUNDBOARD PANEL */}
            <section className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-6 h-6 text-[#ea580c]" />
                <h2 className="font-black text-xl uppercase">Botonera VIP (Soundboard)</h2>
              </div>
              <p className="text-xs font-semibold text-gray-500">
                Elegí un sonido para reproducir instantáneamente en el stream de Milumon. (Cooldown: 60s).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {SOUNDS.map((sound) => {
                  const isCooldown = soundCooldown > 0;
                  const isThisTriggering = triggeringId === sound.file;

                  return (
                    <button
                      key={sound.id}
                      disabled={isCooldown || triggeringId !== null}
                      onClick={() => void triggerEvent('sound', sound.file)}
                      className={`relative py-4 px-3 border-4 border-black rounded-2xl font-black text-sm uppercase tracking-wider transition-all select-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                        isThisTriggering
                          ? 'bg-[#ea580c] text-white animate-pulse'
                          : 'bg-[#fffbeb] text-black hover:bg-yellow-50'
                      }`}
                    >
                      {sound.name}
                      {isCooldown && (
                        <span className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center text-xs font-mono font-black text-black">
                          <Clock className="w-3.5 h-3.5 mr-1" /> {soundCooldown}s
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* TEXT-TO-SPEECH (TTS) PANEL */}
            <section className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-2">
                <Send className="w-6 h-6 text-[#ea580c]" />
                <h2 className="font-black text-xl uppercase">Text-To-Speech (Voz del Stream)</h2>
              </div>
              <p className="text-xs font-semibold text-gray-500">
                Escribí un mensaje corto para que Google Cloud lo lea con voz neural en el directo. (Cooldown: 5 minutos).
              </p>

              <form onSubmit={handleTtsSubmit} className="space-y-3">
                <div className="relative">
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value.slice(0, 120))}
                    disabled={ttsCooldown > 0 || sendingTts}
                    placeholder={
                      ttsCooldown > 0
                        ? `TTS Bloqueado. Esperá ${ttsCooldown}s...`
                        : "Mandale un saludo a Milumon o comentá algo gracioso..."
                    }
                    className="w-full bg-[#fcfbf7] border-4 border-black rounded-2xl p-4 font-semibold text-sm outline-none focus:ring-4 focus:ring-yellow-300 min-h-[100px] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="absolute bottom-4 right-4 text-xs font-black text-gray-400">
                    {ttsText.length}/120
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={ttsCooldown > 0 || !ttsText.trim() || sendingTts}
                  className="w-full py-3.5 bg-black hover:bg-neutral-900 text-[#FFD700] font-black uppercase text-sm rounded-xl border-4 border-black transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sendingTts ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#FFD700]" />
                      Generando Voz...
                    </>
                  ) : ttsCooldown > 0 ? (
                    <>
                      <Clock className="w-4 h-4 text-[#FFD700]" />
                      Espera Cooldown ({ttsCooldown}s)
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#FFD700]" />
                      Enviar Mensaje de Voz
                    </>
                  )}
                </button>
              </form>
            </section>

            {/* ANIMATIONS PANEL */}
            <section className="bg-white border-4 border-black rounded-[2rem] p-6 shadow-[8px_8px_0_0_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#ea580c]" />
                <h2 className="font-black text-xl uppercase">Efectos Visuales (Animaciones)</h2>
              </div>
              <p className="text-xs font-semibold text-gray-500">
                Dispará animaciones y overlays visuales que caerán en la pantalla del directo. (Cooldown: 60s).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ANIMATIONS.map((anim) => {
                  const isCooldown = animationCooldown > 0;
                  const isThisTriggering = triggeringId === anim.id;

                  return (
                    <button
                      key={anim.id}
                      disabled={isCooldown || triggeringId !== null}
                      onClick={() => void triggerEvent('animation', anim.id)}
                      className={`relative py-3.5 px-3 border-4 border-black rounded-2xl font-black text-xs uppercase tracking-wider transition-all select-none shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_0_rgba(0,0,0,1)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                        isThisTriggering
                          ? 'bg-[#ea580c] text-white animate-pulse'
                          : 'bg-[#fffbeb] text-black hover:bg-yellow-50'
                      }`}
                    >
                      {anim.name}
                      {isCooldown && (
                        <span className="absolute inset-0 bg-black/5 rounded-xl flex items-center justify-center text-xs font-mono font-black text-black">
                          <Clock className="w-3.5 h-3.5 mr-1" /> {animationCooldown}s
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

          </main>

          {/* SIDEBAR: RECENT STREAM EVENTS FEED */}
          <aside className="bg-white border-4 border-black rounded-[2rem] p-5 shadow-[8px_8px_0_0_rgba(0,0,0,1)] h-fit space-y-4">
            <div className="flex items-center gap-2 border-b-4 border-black pb-3">
              <List className="w-5 h-5 text-[#ea580c]" />
              <h2 className="font-black text-lg uppercase">Feed del Directo</h2>
            </div>
            
            <p className="text-[10px] font-semibold text-gray-500 leading-tight">
              Historial en vivo de los sonidos y TTS disparados por los miembros.
            </p>

            {recentEvents.length === 0 ? (
              <div className="py-8 text-center bg-yellow-50/70 border-2 border-dashed border-black rounded-xl">
                <p className="text-xs font-bold text-gray-500 uppercase">Sin eventos recientes</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
                {recentEvents.map((evt) => {
                  let badge = '';
                  let details = '';
                  if (evt.type === 'sound') {
                    badge = '🔊 SONIDO';
                    details = SOUNDS.find(s => s.file === evt.content)?.name || evt.content;
                  } else if (evt.type === 'tts') {
                    badge = '🗣️ TTS';
                    details = `"${evt.content}"`;
                  } else if (evt.type === 'animation') {
                    badge = '✨ EFECTO';
                    details = ANIMATIONS.find(a => a.id === evt.content)?.name || evt.content;
                  }

                  return (
                    <article key={evt.id} className="bg-[#fffdf2] border-2 border-black rounded-xl p-3 text-[11px] shadow-[2px_2px_0_0_rgba(0,0,0,1)] flex flex-col gap-1.5 animate-slide-in">
                      <div className="flex items-center justify-between gap-1.5 border-b border-black/10 pb-1.5">
                        <span className="font-mono font-black text-[9px] bg-yellow-200 border border-black rounded px-1">
                          {badge}
                        </span>
                        <span className="text-[9px] font-semibold text-gray-400">
                          {new Date(evt.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="font-sans font-bold text-black break-words leading-snug">
                        {details}
                      </p>

                      <p className="text-[9px] font-black text-[#ea580c] truncate">
                        Por: @{evt.sender_roblox_user || 'VIP'}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
