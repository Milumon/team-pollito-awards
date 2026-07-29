'use client';

import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { Clock, Loader2, Mic, Send } from 'lucide-react';
import { motion } from 'motion/react';

type VoiceMode = 'text' | 'voice';

type MemberVoicePanelProps = {
  mode: VoiceMode;
  panelMode: boolean;
  text: string;
  cooldown: number;
  sendingText: boolean;
  isMuted: boolean | undefined;
  isRecording: boolean;
  hasRecording: boolean;
  recordDuration: number;
  sendingVoice: boolean;
  audioPreview: ReactNode;
  onModeChange: (mode: VoiceMode) => void;
  onTextChange: (text: string) => void;
  onTextSubmit: (event: FormEvent) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDiscardRecording: () => void;
  onSendVoice: () => void;
};

export default function MemberVoicePanel({
  mode,
  panelMode,
  text,
  cooldown,
  sendingText,
  isMuted,
  isRecording,
  hasRecording,
  recordDuration,
  sendingVoice,
  audioPreview,
  onModeChange,
  onTextChange,
  onTextSubmit,
  onStartRecording,
  onStopRecording,
  onDiscardRecording,
  onSendVoice,
}: MemberVoicePanelProps) {
  return (
    <motion.div
      key="tts-tab"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.15 }}
      className="absolute inset-0 flex flex-col justify-center overflow-y-auto max-w-2xl mx-auto w-full text-left"
    >
      <div className="h-fit max-h-full bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-neutral-700/60 pb-3 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-gray-400" />
            <h2 className="font-display font-bold text-base md:text-lg text-white">Mensaje de Voz</h2>
          </div>
          <div className="flex bg-[#1e1f22] rounded-lg p-0.5 border border-neutral-700/60">
            {([
              { mode: 'text' as const, label: '✏️ Texto', href: '/panel/voz?modo=texto' },
              { mode: 'voice' as const, label: '🎤 Grabar', href: '/panel/voz?modo=grabacion' },
            ]).map((item) => (
              <Link
                key={item.mode}
                href={panelMode ? item.href : '/console'}
                aria-current={mode === item.mode ? 'page' : undefined}
                onClick={(event) => {
                  if (!panelMode) event.preventDefault();
                  onModeChange(item.mode);
                }}
                className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${mode === item.mode ? 'bg-[#FFC200] text-black' : 'text-gray-500 hover:text-white'}`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {mode === 'text' ? (
            <>
              <p className="text-[11px] font-semibold text-gray-400 mb-4 shrink-0 leading-relaxed">
                Escribí tu mensaje para que la voz del directo lo lea con entonación neural en vivo.
              </p>
              <form onSubmit={onTextSubmit} className="space-y-4 p-1">
                <div className="relative">
                  <textarea
                    value={text}
                    onChange={(event) => onTextChange(event.target.value.slice(0, 120))}
                    disabled={cooldown > 0 || sendingText || isMuted}
                    placeholder={isMuted ? 'Consola silenciada...' : cooldown > 0 ? `Bloqueado. Esperá ${cooldown}s...` : 'Escribí un mensaje corto...'}
                    className="w-full bg-[#35373d] border border-neutral-700/60 rounded-xl p-4 font-sans text-sm outline-none focus:border-[#FFC200] focus:ring-1 focus:ring-[#FFC200]/50 min-h-[140px] resize-none disabled:opacity-50 disabled:cursor-not-allowed text-white placeholder-gray-500"
                  />
                  <span className={`absolute bottom-4 right-4 text-[9px] font-mono ${text.length >= 100 ? 'text-red-500' : 'text-gray-500'}`}>
                    {text.length}/120
                  </span>
                </div>
                <button type="submit" disabled={cooldown > 0 || !text.trim() || sendingText || isMuted}
                  className="w-full py-3.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-lg border border-neutral-700/60 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                  {sendingText ? <><Loader2 className="w-4 h-4 animate-spin text-black" /> Generando...</> : cooldown > 0 ? <><Clock className="w-4 h-4 text-black" /> Cooldown ({cooldown}s)</> : <><Send className="w-4 h-4 text-black" /> Enviar Mensaje</>}
                </button>
              </form>
            </>
          ) : (
            <div className="p-1 space-y-4">
              <p className="text-[11px] font-semibold text-gray-400 leading-relaxed">
                Grabá tu voz directamente desde el micrófono. Podés pre-escuchar y recortar antes de enviar.
              </p>
              {!hasRecording ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  {isRecording ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-red-500" />
                      </div>
                      <span className="text-xs font-mono text-red-400 font-bold">{recordDuration}s</span>
                      <button onClick={onStopRecording} className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-display font-semibold text-sm rounded-xl transition-all cursor-pointer active:scale-[0.97]">
                        Detener Grabación
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-[#FFC200]/10 border-4 border-[#FFC200]/40 flex items-center justify-center">
                        <Mic className="w-8 h-8 text-[#FFC200]" />
                      </div>
                      <button onClick={onStartRecording} disabled={cooldown > 0 || isMuted}
                        className="px-6 py-3 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed">
                        <Mic className="w-4 h-4" /> Empezar a Grabar
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="bg-[#35373d] border border-neutral-700/60 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">🎧 Tu grabación ({recordDuration}s)</span>
                      <button onClick={onDiscardRecording} className="text-[10px] text-red-400 hover:text-red-300 font-bold cursor-pointer">Descartar</button>
                    </div>
                    {audioPreview}
                  </div>
                  <button onClick={onSendVoice} disabled={sendingVoice || cooldown > 0 || isMuted}
                    className="w-full py-3.5 bg-[#FFC200] hover:brightness-105 text-black font-display font-semibold text-xs rounded-lg border border-neutral-700/60 transition-all flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(0,0,0,.3)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                    {sendingVoice ? <><Loader2 className="w-4 h-4 animate-spin text-black" /> Enviando...</> : cooldown > 0 ? <><Clock className="w-4 h-4 text-black" /> Cooldown ({cooldown}s)</> : <><Send className="w-4 h-4 text-black" /> Enviar Mensaje de Voz</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
