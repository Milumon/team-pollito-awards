'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, ShieldAlert } from 'lucide-react';

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

const SOUND_URLS: Record<string, string> = {
  'risa.mp3': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-84.wav',
  'bocina.mp3': 'https://assets.mixkit.co/active_storage/sfx/2744/2744-84.wav',
  'grito.mp3': 'https://assets.mixkit.co/active_storage/sfx/2658/2658-84.wav',
  'aplausos.mp3': 'https://assets.mixkit.co/active_storage/sfx/2019/2019-84.wav',
  'suspenso.mp3': 'https://assets.mixkit.co/active_storage/sfx/1117/1117-84.wav',
  'sorpresa.mp3': 'https://assets.mixkit.co/active_storage/sfx/2017/2017-84.wav',
  'fallo.mp3': 'https://assets.mixkit.co/active_storage/sfx/911/911-84.wav',
  'victoria.mp3': 'https://assets.mixkit.co/active_storage/sfx/2020/2020-84.wav',
};

const CONFETTI_COLORS = ['#ff4500', '#ffd700', '#00ff7f', '#1e90ff', '#ff1493', '#8a2be2'];

type Particle = {
  id: number;
  char?: string;
  color?: string;
  size: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
};

export default function ObsOverlayPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [settings, setSettings] = useState<StreamSettings | null>(null);

  // Queue state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<StreamEvent | null>(null);
  
  // Animation overlay state
  const [activeAnimation, setActiveAnimation] = useState<'eggs' | 'sparkles' | 'confetti' | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  const queueRef = useRef<StreamEvent[]>([]);
  const isPlayingRef = useRef(false);
  const settingsRef = useRef<StreamSettings | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  const warnedRealtimeRef = useRef(false);
  const playNextRef = useRef<() => void>(() => {});

  // 1. Mark event as played in DB
  const markEventAsPlayed = useCallback(async (eventId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/stream/events/played?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
    } catch (err) {
      console.error('[Overlay] Error al marcar evento como jugado:', err);
    }
  }, [token]);

  // 2. Play Next Queue Item
  const playNext = useCallback(async () => {
    if (settingsRef.current?.is_muted) {
      console.log('[Overlay] Mute activo. Deteniendo reproducción.');
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentEvent(null);
      setActiveAnimation(null);
      return;
    }

    if (queueRef.current.length === 0) {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentEvent(null);
      setActiveAnimation(null);
      return;
    }

    setIsPlaying(true);
    isPlayingRef.current = true;
    const nextEvent = queueRef.current.shift()!;
    setCurrentEvent(nextEvent);

    console.log('[Overlay] Reproduciendo evento:', nextEvent);

    if (nextEvent.type === 'sound') {
      const audioUrl = SOUND_URLS[nextEvent.content] || `/sounds/${nextEvent.content}`;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioUrl;
        try {
          await audioPlayerRef.current.play();
        } catch (err) {
          console.error('[Overlay] Error al reproducir audio de sonido:', err);
          // Failsafe: mark played and skip
          await markEventAsPlayed(nextEvent.id);
          setTimeout(() => { playNextRef.current(); }, 500);
        }
      }
    } else if (nextEvent.type === 'tts') {
      const ttsUrl = `/api/stream/tts?text=${encodeURIComponent(nextEvent.content)}`;
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = ttsUrl;
        try {
          await audioPlayerRef.current.play();
        } catch (err) {
          console.error('[Overlay] Error al reproducir TTS:', err);
          await markEventAsPlayed(nextEvent.id);
          setTimeout(() => { playNextRef.current(); }, 500);
        }
      }
    } else if (nextEvent.type === 'animation') {
      // Setup particles
      const animType = nextEvent.content as 'eggs' | 'sparkles' | 'confetti';
      setActiveAnimation(animType);

      const generated: Particle[] = [];
      const count = animType === 'confetti' ? 60 : 30;
      
      for (let i = 0; i < count; i++) {
        generated.push({
          id: i,
          char: animType === 'eggs' ? '🥚' : animType === 'sparkles' ? '✨' : undefined,
          color: animType === 'confetti' ? CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] : undefined,
          size: Math.random() * 20 + 20, // 20px - 40px
          left: Math.random() * 95, // left %
          delay: Math.random() * 1.5, // 0s - 1.5s delay
          duration: Math.random() * 2 + 2, // 2s - 4s duration
          rotation: Math.random() * 360,
        });
      }
      setParticles(generated);

      // Hold animation for 5 seconds, then advance
      setTimeout(async () => {
        await markEventAsPlayed(nextEvent.id);
        setParticles([]);
        setActiveAnimation(null);
        playNextRef.current();
      }, 5500);
    }
  }, [markEventAsPlayed]);

  useEffect(() => {
    playNextRef.current = playNext;
  }, [playNext]);

  // 3. Audio Ended Listener
  const handleAudioEnded = useCallback(async () => {
    if (currentEvent) {
      await markEventAsPlayed(currentEvent.id);
    }
    playNextRef.current();
  }, [currentEvent, markEventAsPlayed]);

  // Read query token and fetch settings/events on mount
  useEffect(() => {
    const initializeOverlay = async () => {
      const params = new URLSearchParams(window.location.search);
      const queryToken = params.get('token');

      if (!queryToken) {
        setLoading(false);
        setAuthorized(false);
        return;
      }

      setToken(queryToken);

      // Verify token via settings fetch
      try {
        const response = await fetch('/api/stream/settings', {
          headers: { 'x-admin-token': queryToken },
        });

        if (!response.ok) {
          setAuthorized(false);
          setLoading(false);
          return;
        }

        const data = await response.json();
        setSettings(data);
        settingsRef.current = data;
        setAuthorized(true);

        // Fetch unplayed events to initialize the queue
        const eventsResponse = await fetch('/api/stream/events');
        const eventsData = await eventsResponse.json();
        if (eventsData.events) {
          // Add unplayed events to queue
          const unplayed = (eventsData.events as StreamEvent[])
            .filter((e) => e.created_at) // just a check
            .reverse(); // FIFO: oldest first
          
          queueRef.current = unplayed;
          if (!isPlayingRef.current && queueRef.current.length > 0) {
            playNextRef.current();
          }
        }
      } catch (err) {
        console.error('[Overlay Init Error]:', err);
        setAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    void initializeOverlay();
  }, []);

  // Handle Realtime updates (stream_events & stream_settings)
  useEffect(() => {
    if (!authorized || !token) return;

    // Realtime Stream Settings Subscription (Panic Button check)
    const settingsChannel = supabase
      .channel('overlay-settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'stream_settings', filter: 'id=eq.1' },
        (payload: { new: StreamSettings }) => {
          const nextSettings = payload.new;
          console.log('[Overlay] Ajustes actualizados:', nextSettings);
          setSettings(nextSettings);
          settingsRef.current = nextSettings;

          // If panic button is pressed (is_muted === true)
          if (nextSettings.is_muted) {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.pause();
              audioPlayerRef.current.src = '';
            }
            queueRef.current = [];
            isPlayingRef.current = false;
            setIsPlaying(false);
            setCurrentEvent(null);
            setActiveAnimation(null);
            setParticles([]);
          }
        }
      )
      .subscribe();

    // Realtime Stream Events Subscription (FIFO queue pushes)
    const eventsChannel = supabase
      .channel('overlay-events')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'stream_events' },
        (payload: { new: StreamEvent }) => {
          const newEvent = payload.new;
          
          // Check if muted
          if (settingsRef.current?.is_muted) {
            console.log('[Overlay] Evento ignorado (mute activo):', newEvent.id);
            return;
          }

          console.log('[Overlay] Nuevo evento recibido en tiempo real:', newEvent);
          queueRef.current.push(newEvent);

          if (!isPlayingRef.current) {
            playNextRef.current();
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          if (!warnedRealtimeRef.current) {
            console.log('[Overlay] Suscrito a eventos de stream en vivo');
            warnedRealtimeRef.current = true;
          }
        }
      });

    return () => {
      void supabase.removeChannel(settingsChannel);
      void supabase.removeChannel(eventsChannel);
    };
  }, [authorized, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-[#FFD700] flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="mt-2 text-xs font-black uppercase">Cargando Overlay OBS...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex flex-col items-center justify-center p-6 font-sans text-center">
        <ShieldAlert className="w-12 h-12 mb-3" />
        <h1 className="font-black text-2xl uppercase">Token Inválido o Faltante</h1>
        <p className="text-sm font-semibold text-gray-400 mt-2 max-w-sm">
          Por favor, agregá el parámetro de token correcto en la URL para conectar el overlay con Supabase. (ej: `/overlay?token=TU_TOKEN`)
        </p>
      </div>
    );
  }

  const isMuted = settings?.is_muted;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent select-none pointer-events-none font-sans">
      
      {/* Hidden audio element for MP3 playback */}
      <audio
        ref={audioPlayerRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />

      {/* PANIC BUTTON WARNING INDICATOR */}
      {isMuted && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center border-8 border-red-600 animate-pulse">
          <div className="bg-red-600 border-4 border-black p-6 rounded-2xl text-white font-black text-2xl uppercase tracking-wider shadow-[8px_8px_0_0_#000]">
            🔇 PANIC MODE: MUTED
          </div>
        </div>
      )}

      {/* EVENT NOTIFIER WIDGET (Top-Right Alert Card) */}
      {isPlaying && currentEvent && !isMuted && (
        <div className="absolute top-6 right-6 bg-white border-4 border-black p-4 rounded-2xl shadow-[6px_6px_0_0_rgba(0,0,0,1)] flex items-center gap-3 animate-slide-in min-w-[260px] max-w-sm pointer-events-auto">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 border-2 border-black flex items-center justify-center text-xl shrink-0">
            {currentEvent.type === 'sound' ? '🔊' : currentEvent.type === 'tts' ? '🗣️' : '✨'}
          </div>
          <div className="min-w-0 text-left">
            <span className="bg-[#ea580c] text-white border border-black rounded px-1 text-[8px] font-black uppercase">
              {currentEvent.type === 'sound' ? 'VIP Sound' : currentEvent.type === 'tts' ? 'VIP Speak' : 'VIP FX'}
            </span>
            <p className="font-black text-xs text-black truncate mt-0.5">
              {currentEvent.type === 'tts' ? `"${currentEvent.content}"` : currentEvent.type === 'sound' ? `Sonido: ${currentEvent.content}` : `Animación: ${currentEvent.content}`}
            </p>
            <p className="text-[9px] font-black text-gray-500 truncate">
              Por: @{currentEvent.sender_roblox_user || 'VIP'}
            </p>
          </div>
        </div>
      )}

      {/* PARTICLE ANIMATION CANVAS ENGINE */}
      {activeAnimation && particles.length > 0 && !isMuted && (
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          {particles.map((p) => {
            const style: React.CSSProperties = {
              position: 'absolute',
              top: '-40px',
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              animationName: 'fall-animation',
              animationTimingFunction: 'linear',
              animationFillMode: 'forwards',
              transform: `rotate(${p.rotation}deg)`,
            };

            if (activeAnimation === 'confetti') {
              return (
                <div
                  key={p.id}
                  style={{
                    ...style,
                    width: `${p.size * 0.4}px`,
                    height: `${p.size * 0.8}px`,
                    backgroundColor: p.color,
                    borderRadius: '2px',
                  }}
                />
              );
            }

            return (
              <div key={p.id} style={style}>
                {p.char}
              </div>
            );
          })}
        </div>
      )}

      {/* FALLING KEYFRAME ANIMATIONS INJECTED IN STYLE BLOCK */}
      <style>{`
        @keyframes fall-animation {
          0% {
            top: -50px;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            top: 110vh;
            transform: translateY(110vh) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
