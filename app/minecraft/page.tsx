'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { Header } from '@/components/ui/Header';
import { NavBar } from '@/components/ui/NavBar';

type MinecraftStatus = {
  status: 'online' | 'offline' | 'unknown';
  stale: boolean;
  serverVersion?: string;
  playerNames?: string[];
  playerCount?: number;
  maxPlayers?: number;
  lastHeartbeatAt?: string | null;
};

function formatHeartbeat(value?: string | null) {
  if (!value) return 'Sin datos todavía';
  return `Actualizado ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))}`;
}

export default function MinecraftPage() {
  const [status, setStatus] = useState<MinecraftStatus | null>(null);
  const [error, setError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const response = await fetch('/api/minecraft/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('status');
        const nextStatus = await response.json() as MinecraftStatus;
        if (active) {
          setStatus(nextStatus);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };

    void loadStatus();
    const interval = window.setInterval(loadStatus, 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const online = status?.status === 'online' && !status.stale;
  const players = status?.playerNames ?? [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3139] selection:bg-[#FFB000] selection:text-black">
      <Header
        session={null}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onLogin={() => window.location.assign('/acceso?returnTo=/minecraft')}
      />
      <NavBar
        variant="drawer"
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onLogin={() => window.location.assign('/acceso?returnTo=/minecraft')}
      />

      <main className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-8 sm:py-16">
        <header className="flex flex-col-reverse items-center gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.3em] text-[#D4A000]">Nueva aventura del Team Pollito</p>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-tight text-[#2D3139] sm:text-7xl">Servidor Minecraft</h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-relaxed text-[#64748B] sm:text-lg">Un mundo persistente para construir, explorar y jugar juntos, con la misma comunidad que ya conoces.</p>
          </div>
          <div className="relative shrink-0 rounded-[2rem] bg-[#FFF7DC] p-4 shadow-[8px_8px_0_#FFDFA0]">
            <img src="/images/hero-chick.png" alt="Pollito explorador" className="h-36 w-36 object-contain sm:h-44 sm:w-44" />
            <span className="absolute -bottom-3 -right-3 text-4xl">⛏️</span>
          </div>
        </header>

        <section className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-3xl border-2 border-[#FFD500] bg-white p-6 shadow-[8px_8px_0_#FFD500] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-widest text-[#9A8D70]">Estado</p>
                <p className={`mt-2 text-3xl font-black ${online ? 'text-emerald-400' : 'text-red-400'}`}>
                  {online ? 'Online' : 'Sin conexión'}
                </p>
              </div>
              <span className="rounded-full border border-[#E8DFC5] bg-[#FFFDF5] px-4 py-2 text-sm text-[#64748B]">Java: <span className="font-mono">25565</span> · Bedrock: <span className="font-mono">19132</span></span>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Metric label="Jugadores conectados" value={`${status?.playerCount ?? 0}/${status?.maxPlayers ?? 10}`} />
              <Metric label="Ediciones" value="Java + Bedrock" />
            </div>
            <p className="mt-6 text-xs text-[#9A8D70]">{error ? 'No se pudo consultar el estado.' : formatHeartbeat(status?.lastHeartbeatAt)}</p>
          </div>

          <div className="rounded-3xl border border-[#E8DFC5] bg-white p-6 shadow-[0_8px_24px_rgba(76,59,18,.07)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#9A8D70]">Jugando ahora</p>
            {players.length > 0 ? (
                <ul className="mt-5 space-y-3">
                {players.map((player) => <li key={player} className="flex items-center gap-3 rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] px-4 py-3 font-semibold text-[#45413A]"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#B9E6A4] text-xl" aria-hidden>🧑‍🌾</span>{player}</li>)}
              </ul>
            ) : (
              <p className="mt-5 text-[#64748B]">El mundo está esperando a los primeros pollitos.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-[#E8DFC5] bg-[#FFFDF5] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>🥚</span>
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#D4A000]">Tu primera aventura</p><h2 className="font-display text-2xl font-bold text-[#2D3139]">Entra en 4 pasos fáciles</h2></div>
          </div>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['1', 'Conecta', 'Abre Minecraft Java o Bedrock.', '🎮'],
              ['2', 'Solicita', 'Elige tu edición y vincula tu cuenta.', '📝'],
              ['3', 'Regístrate', 'Crea tu contraseña dentro del servidor.', '🔐'],
              ['4', 'Juega', 'Construye, explora y conoce pollitos.', '🏡'],
            ].map(([number, title, detail, icon]) => <article key={number} className="rounded-2xl border border-[#E8DFC5] bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFDFA0] text-lg font-black text-[#8B6B00]">{number}</span><span className="text-2xl" aria-hidden>{icon}</span></div><h3 className="mt-4 font-display text-lg font-bold text-[#2D3139]">{title}</h3><p className="mt-1 text-sm font-medium leading-relaxed text-[#64748B]">{detail}</p></article>)}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-3xl border border-[#E8DFC5] bg-white p-6 shadow-[0_8px_24px_rgba(76,59,18,.07)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="font-display text-2xl font-bold text-[#2D3139]">¿Quieres entrar al mundo?</p>
            <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-[#64748B]">Entra desde Java o Bedrock. Vincula tu cuenta, registra tu contraseña dentro del servidor y ejecuta el código de vinculación.</p>
          </div>
          <Link href="/minecraft/link" className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#FFD500] px-5 py-3 font-black text-black transition hover:brightness-105">Vincular mi cuenta</Link>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div className="rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] p-4"><p className="text-xs uppercase tracking-widest text-[#9A8D70]">{label}</p><p className="mt-2 text-2xl font-black text-[#D4A000]">{value}</p></div>;
}
