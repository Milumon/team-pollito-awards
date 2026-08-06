'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Session } from '@supabase/supabase-js';

import { Header } from '@/components/ui/Header';
import { NavBar } from '@/components/ui/NavBar';
import { supabase } from '@/lib/supabaseClient';

type MinecraftStatus = {
  status: 'online' | 'offline' | 'unknown';
  stale: boolean;
  playerNames?: string[];
  playerCount?: number;
  maxPlayers?: number;
  lastHeartbeatAt?: string | null;
  players?: MinecraftPlayer[];
};

type MinecraftPlayer = {
  nickname: string | null;
  avatarUrl: string | null;
  java: string | null;
  bedrock: string | null;
};

type MinecraftAccount = {
  edition: 'java' | 'bedrock';
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  verified_at: string | null;
};

function formatHeartbeat(value?: string | null) {
  if (!value) return 'Sin datos todavía';
  return `Actualizado ${new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))}`;
}

export default function MinecraftPage() {
  const [status, setStatus] = useState<MinecraftStatus | null>(null);
  const [accounts, setAccounts] = useState<MinecraftAccount[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/minecraft/status', { cache: 'no-store' });
        if (!response.ok) throw new Error('status');
        if (active) {
          setStatus(await response.json() as MinecraftStatus);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    void loadStatus();
    const interval = window.setInterval(loadStatus, 30_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      const result = await supabase.auth.getSession();
      if (active) setSession(result.data.session);
    };
    void loadSession();
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!session) {
      setAccounts([]);
      return;
    }
    let active = true;
    void fetch('/api/minecraft/link', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as { accounts?: MinecraftAccount[] };
      if (active) setAccounts(payload.accounts ?? []);
    });
    return () => { active = false; };
  }, [session]);

  const online = status?.status === 'online' && !status.stale;
  const players = status?.players ?? [];
  const ready = accounts.some((account) => account.status === 'approved' && account.verified_at);
  const playHref = !session ? '/acceso?returnTo=/minecraft' : ready ? '/minecraft/guias#como-entrar' : '/minecraft/link';
  const playLabel = !session ? 'Iniciar aventura' : ready ? 'Entrar al mundo' : 'Preparar mi Minecraft';

  const logout = async () => { await supabase.auth.signOut(); };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2D3139] selection:bg-[#FFB000] selection:text-black">
      <Header session={session} onLogout={logout} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} onLogin={() => window.location.assign('/acceso?returnTo=/minecraft')} />
      <NavBar variant="drawer" isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} session={session} onLogout={logout} onLogin={() => window.location.assign('/acceso?returnTo=/minecraft')} />

      <main className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-8 sm:py-16">
        <section className="grid items-center gap-8 md:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="mb-3 font-display text-sm font-bold uppercase tracking-[0.3em] text-[#D4A000]">Minecraft · Team Pollito</p>
            <h1 className="font-display text-5xl font-black uppercase leading-[.9] tracking-tight text-[#2D3139] sm:text-7xl">Servidor<br /><span className="text-[#D4A000]">Minecraft</span></h1>
            <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-[#64748B] sm:text-lg">Construye, explora y juega con los pollitos en un mundo compartido para Java y Bedrock.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3"><Link href={playHref} className="inline-flex items-center justify-center rounded-xl bg-[#FFD500] px-6 py-4 font-black text-black shadow-[4px_4px_0_#D4A000] transition hover:-translate-y-0.5">🎮 {playLabel}</Link><Link href="/minecraft/guias" className="inline-flex items-center justify-center rounded-xl border-2 border-[#E8DFC5] bg-white px-5 py-3 font-black text-[#64748B] transition hover:border-[#FFD500]">Ver guías</Link></div>
          </div>
          <div className="relative mx-auto rounded-[2.5rem] bg-[#FFF7DC] p-5 shadow-[10px_10px_0_#FFDFA0]"><img src="/images/hero-chick.png" alt="Pollito explorador" className="h-56 w-56 object-contain sm:h-72 sm:w-72" /><span className="absolute -bottom-4 -right-4 text-5xl">⛏️</span></div>
        </section>

        <section className="grid gap-5 md:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border-2 border-[#FFD500] bg-white p-6 shadow-[8px_8px_0_#FFD500] sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-[#9A8D70]">Estado del servidor</p><p className={`mt-2 text-4xl font-black ${online ? 'text-emerald-500' : 'text-red-400'}`}>{online ? 'Online' : 'Sin conexión'}</p></div><span className="rounded-full bg-[#FFFDF5] px-4 py-2 text-sm font-black text-[#D4A000]">🎮 Java + Bedrock</span></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2"><Metric label="Jugando ahora" value={`${status?.playerCount ?? 0}/${status?.maxPlayers ?? 20}`} /><Metric label="Mundo" value="Persistente" /></div>
            <p className="mt-5 text-xs text-[#9A8D70]">{error ? 'No se pudo consultar el estado.' : formatHeartbeat(status?.lastHeartbeatAt)}</p>
          </div>
           <div className="rounded-3xl border border-[#E8DFC5] bg-white p-6 shadow-[0_8px_24px_rgba(76,59,18,.07)] sm:p-8"><p className="text-sm font-bold uppercase tracking-widest text-[#9A8D70]">Jugando ahora</p>{players.length > 0 ? <div className="mt-5 space-y-3">{players.map((player) => <PlayerCard key={`${player.java ?? ''}:${player.bedrock ?? ''}`} player={player} />)}</div> : <p className="mt-5 text-[#64748B]">El mundo espera a los primeros pollitos.</p>}</div>
        </section>

        <section className="rounded-3xl border border-[#E8DFC5] bg-[#FFFDF5] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D4A000]">¿Es tu primera vez?</p><h2 className="mt-1 font-display text-3xl font-bold text-[#2D3139]">Entrar es muy fácil</h2></div><span className="text-4xl">🥚</span></div><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[['1', 'Elige', 'Java o Bedrock', '🎮'], ['2', 'Vincula', 'Preparamos tu cuenta', '🔗'], ['3', 'Regístrate', 'Protege tu personaje', '🔐'], ['4', 'Juega', 'Construye con amigos', '🏡']].map(([number, title, detail, icon]) => <article key={number} className="rounded-2xl border border-[#E8DFC5] bg-white p-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFDFA0] text-lg font-black text-[#8B6B00]">{number}</span><span className="text-2xl" aria-hidden>{icon}</span></div><h3 className="mt-4 font-display text-lg font-bold">{title}</h3><p className="mt-1 text-sm font-medium text-[#64748B]">{detail}</p></article>)}</div><Link href={playHref} className="mt-7 inline-flex w-full items-center justify-center rounded-xl bg-[#FFD500] px-5 py-4 font-black text-black">🎮 {playLabel}</Link></section>

        <section><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#D4A000]">Descubre el mundo</p><h2 className="mt-1 font-display text-3xl font-bold">Aquí pasan cosas</h2></div><span className="text-3xl">✨</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><WorldCard icon="🏡" title="Construye" text="Protege tu casita y crea proyectos enormes." /><WorldCard icon="💎" title="Explora" text="Encuentra lugares nuevos y secretos del mundo." /><WorldCard icon="🐣" title="Haz amigos" text="Juega, ayuda y construye con otros pollitos." /><WorldCard icon="🎉" title="Eventos" text="Participa en aventuras y proyectos comunitarios." /></div></section>

        <section className="rounded-3xl border-2 border-[#B9E6A4] bg-[#F4FBEF] p-6 sm:p-8"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#4F8A3D]">Guías</p><h2 className="mt-1 font-display text-3xl font-bold">¿Necesitas una mano?</h2></div><span className="text-3xl">📖</span></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><GuideLink icon="🏡" title="Protege tu casita" href="/minecraft/guias#claims" /><GuideLink icon="🎮" title="Cómo entrar" href="/minecraft/guias#como-entrar" /><GuideLink icon="❓" title="Tengo un problema" href="/minecraft/guias#problemas" /></div><Link href="/minecraft/guias" className="mt-6 inline-flex rounded-xl border-2 border-[#A7D88E] bg-white px-5 py-3 font-black text-[#4F8A3D]">Ver todas las guías →</Link></section>

        <section className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-[#E8DFC5] bg-white p-6 shadow-[0_8px_24px_rgba(76,59,18,.07)] sm:flex-row sm:items-center sm:p-8"><div><h2 className="font-display text-3xl font-bold">¿Nos vemos dentro?</h2><p className="mt-2 text-sm font-medium text-[#64748B]">Tu próxima aventura empieza con un botón.</p></div><Link href={playHref} className="inline-flex shrink-0 rounded-xl bg-[#FFD500] px-6 py-4 font-black text-black">🎮 {playLabel}</Link></section>

        <details className="rounded-2xl border border-[#E8DFC5] bg-white p-5 text-sm text-[#64748B]"><summary className="cursor-pointer font-black text-[#45413A]">⚙️ Datos del servidor</summary><div className="mt-4 grid gap-2 sm:grid-cols-2"><p>Java: <code>mc.milumon.dev:25565</code></p><p>Bedrock: <code>mc.milumon.dev:19132</code></p></div></details>
      </main>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="rounded-xl border border-[#E8DFC5] bg-[#FFFDF5] p-4"><p className="text-xs uppercase tracking-widest text-[#9A8D70]">{label}</p><p className="mt-2 text-2xl font-black text-[#D4A000]">{value}</p></div>; }
function WorldCard({ icon, title, text }: Readonly<{ icon: string; title: string; text: string }>) { return <article className="rounded-2xl border border-[#E8DFC5] bg-white p-5"><span className="text-3xl" aria-hidden>{icon}</span><h3 className="mt-4 font-display text-xl font-bold">{title}</h3><p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B]">{text}</p></article>; }
function GuideLink({ icon, title, href }: Readonly<{ icon: string; title: string; href: string }>) { return <Link href={href} className="rounded-2xl border border-[#D8EACD] bg-white p-4 font-bold text-[#45413A] transition hover:border-[#A7D88E]"><span className="mr-2 text-xl" aria-hidden>{icon}</span>{title}</Link>; }
function PlayerCard({ player }: Readonly<{ player: MinecraftPlayer }>) {
  const displayName = player.nickname || player.java || player.bedrock || 'Pollito';
  const connections = [player.java && `Java: ${player.java}`, player.bedrock && `Bedrock: ${player.bedrock}`].filter(Boolean).join(' · ');
  return <article className="flex items-center gap-3 rounded-2xl border border-[#E8DFC5] bg-[#FFFDF5] p-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#FFDFA0]">{player.avatarUrl ? <img src={player.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-xl" aria-hidden>🐣</span>}</div><div className="min-w-0"><p className="truncate font-black text-[#45413A]">{displayName}</p><p className="truncate text-xs font-semibold text-[#9A8D70]">{connections || 'Minecraft'}</p></div></article>;
}
