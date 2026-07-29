'use client';

import { motion } from 'motion/react';

export type MemberHomeViewProps = {
  panelMode: boolean;
  profile: { roblox_user: string | null };
  totalMembers: number;
  soundsToday: number;
};

export function MemberHomeView({ panelMode, profile, totalMembers, soundsToday }: MemberHomeViewProps) {
  return (
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
          🐣 {panelMode ? 'Bienvenido al Panel del Miembro' : 'Bienvenido a la Consola'}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#2b2d31] border border-neutral-700/60 rounded-2xl p-5 space-y-3 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
          <h3 className="font-display font-semibold text-sm text-gray-200">¿Cómo interactuar?</h3>
          <ol className="text-xs text-gray-400 space-y-2.5 list-decimal list-inside pl-1 font-semibold">
            <li>Ve a la pestaña de <strong className="text-white">Banco</strong> y presiona cualquier botón para enviar alertas auditivas, imágenes o videos.</li>
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
  );
}
