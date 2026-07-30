'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

type Animation = {
  id: string;
  name: string;
};

type MemberEffectsPanelProps = {
  animations: Animation[];
  cooldown: number;
  triggeringId: string | null;
  isMuted: boolean | undefined;
  onTrigger: (animationId: string) => void;
};

export default function MemberEffectsPanel({
  animations,
  cooldown,
  triggeringId,
  isMuted,
  onTrigger,
}: MemberEffectsPanelProps) {
  return (
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
          {animations.map((animation) => {
            const isCooldown = cooldown > 0;
            return (
              <button
                key={animation.id}
                disabled={isCooldown || triggeringId !== null || isMuted}
                onClick={() => onTrigger(animation.id)}
                className="bg-[#2b2d31] hover:bg-neutral-900 border border-neutral-700/60 rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[140px] shadow-[0_2px_8px_rgba(0,0,0,.25)] active:scale-[0.97] disabled:shadow-none disabled:translate-y-0"
              >
                <span className="text-4xl block">{animation.id === 'eggs' ? '🥚' : animation.id === 'sparkles' ? '✨' : '🎉'}</span>
                <span className="font-display font-medium text-xs text-white">
                  {animation.name.split(' ').slice(1).join(' ')}
                </span>
                {isCooldown ? (
                  <span className="text-[10px] font-mono font-bold text-red-500">Cooldown ({cooldown}s)</span>
                ) : (
                  <span className="text-[8px] text-gray-500 font-bold uppercase">Disparar</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
