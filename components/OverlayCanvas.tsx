'use client';

import React from 'react';
import { NotificationPopup } from '@/components/overlay/NotificationPopup';

// ─── Tipos públicos ─────────────────────────────────────────────────────────

export type OverlaySettings = {
  overlay_notification_top?: number;
  overlay_notification_width?: number;
  overlay_notification_badge_size?: number;
  overlay_notification_content_size?: number;
  overlay_notification_sender_size?: number;
  overlay_media_top?: number;
  overlay_media_width?: number;
};

export type OverlayEvent = {
  id: string;
  type: 'sound' | 'tts' | 'animation' | 'voice' | 'image_audio' | 'video' | 'audio' | 'image';
  content: string;
  sender_roblox_user?: string | null;
  sender_tiktok_user?: string | null;
  sender_avatar_url?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  video_url?: string | null;
};

export type OverlayParticle = {
  id: number;
  char?: string;
  color?: string;
  size: number;
  left: number;
  delay: number;
  duration: number;
  rotation: number;
};

export type OverlayAnimationType = 'confetti' | 'eggs' | 'sparkles' | null;

// ─── Canvas interno: siempre 720×1280 ───────────────────────────────────────

/**
 * Ancho y alto del canvas de referencia.
 * Coincide con la resolución del overlay en OBS (720×1280, portrait HD).
 */
export const CANVAS_W = 720;
export const CANVAS_H = 1280;

// ─── Props ──────────────────────────────────────────────────────────────────

interface OverlayCanvasProps {
  /**
   * - 'obs'     → overlay real en OBS; muestra banner de mute, botón de
   *               habilitación de audio, fondo transparente.
   * - 'preview' → diseñador en el admin; fondo con cuadrícula, sin estados
   *               de error.
   */
  mode: 'obs' | 'preview';

  /**
   * Factor de escala aplicado al canvas de 720×1280.
   * En OBS siempre es 1. En el diseñador se calcula dinámicamente.
   */
  scale: number;

  /** Configuración visual del pop-up (posición, tamaños de fuente). */
  settings: OverlaySettings;

  /**
   * Evento activo que se muestra en el widget de notificación.
   * null → el widget está oculto.
   */
  event: OverlayEvent | null;

  /** Animación de partículas activa (confetti / eggs / sparkles). */
  animation: OverlayAnimationType;

  /** Partículas para la animación activa. */
  particles: OverlayParticle[];

  /** Si el stream está muteado (solo visible en mode='obs'). */
  isMuted?: boolean;

  /** Si se necesita interacción para desbloquear el audio (solo mode='obs'). */
  needsInteraction?: boolean;

  /** Callback cuando el usuario hace click en "Habilitar Audio" (mode='obs'). */
  onInteraction?: () => void;

  /** Mostrar el popup siempre estático sin animación (para preview mientras se arrastra). */
  staticPreview?: boolean;

  /** Nombre a mostrar en el widget. Si no se pasa usa sender_roblox_user del evento. */
  senderLabel?: string;

  /** Mostrar imagen de guía de diseño de fondo (en modo preview) */
  showBackgroundGuide?: boolean;
}

// ─── Componente ─────────────────────────────────────────────────────────────

/**
 * OverlayCanvas — fuente única de verdad para el renderizado del overlay.
 *
 * Siempre se dibuja a 720×1280 internamente.
 * El prop `scale` achica o agranda visualmente todo el canvas de forma uniforme.
 * Las posiciones absolutas (top, width) son en píxeles del canvas real —
 * no hay conversión: el scale ya lo maneja.
 */
export function OverlayCanvas({
  mode,
  scale,
  settings,
  event,
  animation,
  particles,
  isMuted = false,
  needsInteraction = false,
  onInteraction,
  staticPreview = false,
  senderLabel,
  showBackgroundGuide = false,
}: OverlayCanvasProps) {
  const top = settings.overlay_notification_top ?? 48;
  const width = settings.overlay_notification_width ?? 288;
  const avatarSize = settings.overlay_notification_badge_size ?? 32;
  const contentSize = settings.overlay_notification_content_size ?? 14;
  const senderSize = settings.overlay_notification_sender_size ?? 11;
  const mediaTop = settings.overlay_media_top ?? 48;
  const mediaWidth = settings.overlay_media_width ?? 400;

  const isObs = mode === 'obs';
  const isPreview = mode === 'preview';

  return (
    /**
     * Wrapper que recorta el canvas al tamaño escalado.
     * width / height vienen de la escala para que el contenedor padre
     * pueda dimensionarse correctamente.
     */
    <div
      style={{
        width: CANVAS_W * scale,
        height: CANVAS_H * scale,
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {/* ─── Canvas real 720×1280, luego escalado ─── */}
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'absolute',
          top: 0,
          left: 0,
          background: isObs ? 'transparent' : undefined,
          backgroundImage: isPreview && showBackgroundGuide ? 'url("/images/916 vertical layout.png")' : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className={
          isPreview && !showBackgroundGuide
            ? 'bg-neutral-950 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px]'
            : isPreview
            ? 'bg-neutral-950'
            : ''
        }
      >
        {/* ── Botón habilitación de audio (solo OBS) ── */}
        {isObs && needsInteraction && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center pointer-events-auto z-50 p-6 text-center">
            <button
              onClick={onInteraction}
              className="px-6 py-4 bg-[#FFD700] hover:bg-yellow-300 text-black font-black uppercase text-xs rounded-xl border-2 border-black transition-all flex items-center gap-2 shadow-[4px_4px_0_0_#000] cursor-pointer"
            >
              🔊 Habilitar Audio del Overlay
            </button>
          </div>
        )}

        {/* ── Banner de mute (solo OBS) ── */}
        {isObs && isMuted && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center border-4 border-red-600 animate-pulse z-40">
            <div className="bg-red-600 border-2 border-black p-4 rounded-xl text-white font-black text-sm uppercase tracking-wider shadow-[4px_4px_0_0_#000]">
              🔇 MUTED
            </div>
          </div>
        )}

        {/* ── Indicador de vista previa (solo preview) ── */}
        {isPreview && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/40 border border-white/10 rounded-full px-3 py-1 text-[10px] text-gray-500 font-mono tracking-widest uppercase z-30 select-none pointer-events-none">
            Preview OBS · 720×1280
          </div>
        )}

        {/* ── Widget de notificación ── */}
        {event && event.type !== 'animation' && event.type !== 'image_audio' && event.type !== 'video' && event.type !== 'image' && (isObs ? !isMuted : true) && (
          <div
            style={{
              top: `${top}px`,
              width: `${width}px`,
              maxWidth: '90%',
              left: '50%',
              transform: 'translateX(-50%)',
              position: 'absolute',
            }}
          >
            <NotificationPopup
              event={event}
              avatarSize={avatarSize}
              contentSize={contentSize}
              senderSize={senderSize}
              senderLabel={senderLabel}
              className={staticPreview ? '' : 'animate-slide-in'}
            />
          </div>
        )}

        {/* ── Media display (image_audio / video / image) ── */}
        {event && (event.type === 'image_audio' || event.type === 'video' || event.type === 'image') && (isObs ? !isMuted : true) && (
          <div
            style={{
              top: `${mediaTop}px`,
              width: `${mediaWidth}px`,
              maxWidth: '90%',
              left: '50%',
              transform: 'translateX(-50%)',
              position: 'absolute',
            }}
          >
            {event.type === 'image_audio' && event.image_url && (
              <div className="relative bg-black/80 border border-[#f5b94a]/50 overflow-hidden shadow-[0_0_30px_rgba(245,185,74,0.15)]">
                <img
                  src={event.image_url}
                  alt={event.content}
                  className="w-full object-contain max-h-[60vh]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5b94a]">
                    &gt;&gt;&gt; imagen + audio
                  </p>
                  <p className="text-xs font-black text-[#f4ead9] truncate">{event.content}</p>
                  <p className="text-[10px] font-bold text-[#c99a5b] truncate">
                    Por: @{event.sender_roblox_user ?? 'VIP'}
                  </p>
                </div>
              </div>
            )}
            {event.type === 'video' && event.video_url && (
              <div className="relative bg-black/80 border border-[#f5b94a]/50 overflow-hidden shadow-[0_0_30px_rgba(245,185,74,0.15)]">
                <video
                  src={event.video_url}
                  autoPlay
                  loop={false}
                  playsInline
                  muted={false}
                  className="w-full object-contain max-h-[60vh]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5b94a]">
                    &gt;&gt;&gt; video
                  </p>
                  <p className="text-xs font-black text-[#f4ead9] truncate">{event.content}</p>
                  <p className="text-[10px] font-bold text-[#c99a5b] truncate">
                    Por: @{event.sender_roblox_user ?? 'VIP'}
                  </p>
                </div>
              </div>
            )}
            {event.type === 'image' && event.image_url && (
              <div className="relative bg-black/80 border border-[#f5b94a]/50 overflow-hidden shadow-[0_0_30px_rgba(245,185,74,0.15)]">
                <img
                  src={event.image_url}
                  alt={event.content}
                  className="w-full object-contain max-h-[60vh]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#f5b94a]">
                    &gt;&gt;&gt; imagen
                  </p>
                  <p className="text-xs font-black text-[#f4ead9] truncate">{event.content}</p>
                  <p className="text-[10px] font-bold text-[#c99a5b] truncate">
                    Por: @{event.sender_roblox_user ?? 'VIP'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Partículas de animación ── */}
        {animation && particles.length > 0 && (isObs ? !isMuted : true) && (
          <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            {particles.map((p) => {
              const style: React.CSSProperties = {
                position: 'absolute',
                top: '-40px',
                left: `${p.left}%`,
                fontSize: `${p.size}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                animationName: 'overlay-fall',
                animationTimingFunction: 'linear',
                animationFillMode: 'forwards',
                transform: `rotate(${p.rotation}deg)`,
              };

              if (animation === 'confetti') {
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

        {/* ── Keyframes de caída ── */}
        <style>{`
          @keyframes overlay-fall {
            0%   { top: -50px;  transform: translateY(0)     rotate(0deg);   }
            100% { top: 110%;   transform: translateY(110%)  rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
