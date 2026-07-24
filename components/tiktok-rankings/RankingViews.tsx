'use client';

import { useState } from 'react';
import { ArrowRight, CalendarDays, Crown, Loader2, Medal, RefreshCw, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTikTokRankings } from './useTikTokRankings';
import { METRIC_LABELS, PERIOD_LABELS, RANKING_METRICS, RANKING_PERIODS } from './types';
import type { RankingEntry, RankingMetric, RankingPeriod, RankingSet, RankingsState } from './types';

function visibleEntries(set: RankingSet | undefined) {
  return (set?.entries ?? []).filter((entry) => entry.profile);
}

function formatValue(value: string) {
  try { return BigInt(value).toLocaleString('es-ES'); } catch { return value; }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatWindow(set: RankingSet | undefined) {
  if (!set) return '';
  if (!set.window.begin || !set.window.end) return 'No informada por TikTok';
  return `${formatDate(set.window.begin)} - ${formatDate(set.window.end)}`;
}

function Avatar({ entry, large = false }: { entry: RankingEntry; large?: boolean }) {
  return (
    <div className={`${large ? 'h-11 w-11' : 'h-8 w-8'} shrink-0 overflow-hidden rounded-full border ${large ? 'border-[#FFC200]' : 'border-neutral-700'} bg-[#35373d] flex items-center justify-center`}>
      {entry.profile?.roblox_avatar_url ? <img src={entry.profile.roblox_avatar_url} alt={`Avatar de ${entry.profile.roblox_display_name}`} className="h-full w-full object-cover" /> : <span>{large ? '🐣' : '🪶'}</span>}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-xl border border-dashed border-neutral-700 bg-[#24262b] px-4 py-8 text-center"><p className="font-display text-sm text-white">{title}</p><p className="mt-1 text-xs text-gray-500">{detail}</p></div>;
}

function StatusState({ state, dark = false }: { state: RankingsState; dark?: boolean }) {
  if (state.loading) return <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wide text-gray-500"><Loader2 className="h-4 w-4 animate-spin text-[#FFC200]" /> Cargando ranking...</div>;
  if (state.error) return <EmptyState title="No se pudo cargar el ranking" detail={dark ? 'Intenta actualizar la pestaña.' : 'Vuelve a intentarlo en unos segundos.'} />;
  if (!state.data?.batch_id || state.data.sets.length === 0) return <EmptyState title="Aún no hay snapshot publicado" detail="El ranking aparecerá después de la próxima importación." />;
  return null;
}

function RankingRows({ entries, dark = false, limit }: { entries: RankingEntry[]; dark?: boolean; limit?: number }) {
  return <div className="space-y-2">{entries.slice(0, limit).map((entry, index) => (
    <div key={`${entry.display_id}-${entry.position}`} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${index === 0 ? (dark ? 'border border-[#FFC200]/50 bg-[#FFC200]/10' : 'border border-[#FFC200]/30 bg-[#FFF9E6]') : (dark ? 'border border-neutral-700/40 bg-[#2b2d31]' : 'border border-gray-100 bg-white')}`}>
      <span className={`w-6 text-center font-black ${index === 0 ? 'text-[#D4A000] text-lg' : 'text-gray-400 text-xs'}`}>{index === 0 ? <Crown className="mx-auto h-4 w-4" /> : entry.position}</span>
      <Avatar entry={entry} large={index === 0} />
      <div className="min-w-0 flex-1"><p className={`truncate font-bold ${index === 0 ? 'text-[#D4A000]' : dark ? 'text-white' : 'text-[#2D3139]'} text-xs`}>{entry.profile?.roblox_display_name}</p><p className="truncate text-[10px] text-gray-500">@{entry.profile?.roblox_user}</p></div>
      <span className={`shrink-0 font-mono text-xs font-bold ${dark ? 'text-gray-300' : 'text-[#2D3139]'}`}>{formatValue(entry.value)}</span>
    </div>
  ))}</div>;
}

function RankingControls({ metric, period, onMetric, onPeriod, dark = false }: { metric: RankingMetric; period: RankingPeriod; onMetric: (value: RankingMetric) => void; onPeriod: (value: RankingPeriod) => void; dark?: boolean }) {
  const selectClass = dark ? 'border-neutral-700 bg-[#20232a] text-white' : 'border-gray-200 bg-white text-[#2D3139]';
  return <div className="flex flex-wrap gap-2"><select value={metric} onChange={(event) => onMetric(event.target.value as RankingMetric)} className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-[#FFC200] ${selectClass}`}>{RANKING_METRICS.map((item) => <option key={item} value={item}>{METRIC_LABELS[item]}</option>)}</select><select value={period} onChange={(event) => onPeriod(event.target.value as RankingPeriod)} className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-[#FFC200] ${selectClass}`}>{RANKING_PERIODS.map((item) => <option key={item} value={item}>{PERIOD_LABELS[item]}</option>)}</select></div>;
}

function findSet(data: RankingsState['data'], metric: RankingMetric, period: RankingPeriod) {
  return data?.sets.find((item) => item.metric === metric && item.period === period);
}

export function TikTokRankingLanding() {
  const state = useTikTokRankings(null, 5);
  const canonical = state.data?.sets.find((set) => set.metric === 'viewers' && set.period === 'last_live') ?? state.data?.sets[0];
  const entries = visibleEntries(canonical);

  return <section id="rankings" className="space-y-5 pt-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-[#D4A000]" /><h3 className="font-display text-2xl font-bold tracking-tight text-[#2D3139]">Top Pollitos del Live</h3></div><p className="mt-1 text-sm font-semibold text-gray-500">Participación de Miembros Oficiales en el directo más reciente.</p></div><Link href="/console" className="inline-flex items-center gap-1 text-xs font-bold text-[#D4A000] hover:text-[#2D3139]">Ver mi ranking <ArrowRight className="h-3.5 w-3.5" /></Link></div>{state.loading || state.error || !state.data?.batch_id || state.data.sets.length === 0 ? <StatusState state={state} /> : <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,.06)]"><div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3"><div><p className="font-display text-xs font-bold uppercase text-[#2D3139]">{canonical ? `${METRIC_LABELS[canonical.metric]} · ${PERIOD_LABELS[canonical.period]}` : 'Ranking actual'}</p><p className="mt-1 text-[10px] text-gray-400">Actualizado {formatDate(state.data.captured_at)}{canonical ? ` · Ventana: ${formatWindow(canonical)}` : ''}</p></div><span className="rounded-full bg-[#FFF9E6] px-2.5 py-1 text-[10px] font-bold text-[#D4A000]">Solo comunidad vinculada</span></div>{entries.length === 0 ? <EmptyState title="Sin actividad vinculada en este período" detail="Cuando un Miembro Oficial participe, aparecerá aquí." /> : <RankingRows entries={entries} limit={5} />}</div>}</section>;
}

export function TikTokRankingConsole({ accessToken }: { accessToken: string }) {
  const state = useTikTokRankings(accessToken);
  const [metric, setMetric] = useState<RankingMetric>('viewers');
  const [period, setPeriod] = useState<RankingPeriod>('last_live');
  const selected = findSet(state.data, metric, period);
  const entries = visibleEntries(selected);
  const me = selected?.me?.profile ? selected.me : null;
  const meIsVisible = me ? entries.some((entry) => entry.position === me.position && entry.profile?.roblox_user === me.profile?.roblox_user) : false;

  return <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin text-left"><div className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]"><div className="mb-4 flex flex-col gap-3 border-b border-neutral-700/60 pb-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-[#FFC200]" /><div><h2 className="font-display text-lg font-bold text-white">Rankings de TikTok LIVE</h2><p className="mt-1 text-[10px] font-semibold text-gray-500">Actividad comunitaria de Miembros Oficiales</p></div></div><RankingControls metric={metric} period={period} onMetric={setMetric} onPeriod={setPeriod} dark /></div>{state.loading || state.error || !state.data?.batch_id || state.data.sets.length === 0 ? <StatusState state={state} dark /> : !selected ? <EmptyState title="Combinación no disponible" detail="El snapshot actual no contiene este período." /> : <><div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-gray-500"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Capturado {formatDate(state.data.captured_at)}</span><span>Ventana {formatWindow(selected)}</span></div>{entries.length === 0 ? <EmptyState title="Sin actividad vinculada" detail="No hay actividad de Miembros Oficiales en esta combinación." /> : <RankingRows entries={entries} dark />}{selected.me ? <div className={`mt-5 rounded-xl border p-4 ${me ? meIsVisible ? 'border-[#FFC200]/40 bg-[#FFC200]/10' : 'border-sky-500/30 bg-sky-500/10' : 'border-neutral-700 bg-[#24262b]'}`}><div className="flex items-center gap-3">{me ? <Avatar entry={me} large /> : <Medal className="h-7 w-7 text-gray-500" />}<div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Tu posición</p>{me ? <p className="truncate font-display text-sm font-bold text-white">#{me.position} · {me.profile?.roblox_display_name}</p> : <p className="font-display text-sm font-bold text-white">No vinculada a un Miembro Oficial</p>}</div>{me && <span className="font-mono text-sm font-bold text-[#FFC200]">{formatValue(me.value)}</span>}</div>{me && !meIsVisible && <p className="mt-3 text-xs font-semibold text-sky-300">Estás fuera del tramo visible, pero tu posición sí está registrada.</p>}{!me && <p className="mt-3 text-xs font-semibold text-gray-500">No se encontró actividad personal para esta combinación.</p>}</div> : <div className="mt-5 rounded-xl border border-neutral-700 bg-[#24262b] p-4"><p className="font-display text-sm font-bold text-white">Sin actividad personal</p><p className="mt-1 text-xs text-gray-500">Tu identidad no aparece en esta ventana.</p></div>}</>}</div>{state.data?.captured_at && <p className="flex items-center gap-1 text-[10px] text-gray-600"><RefreshCw className="h-3 w-3" /> El ranking muestra únicamente el snapshot actual, sin historial.</p>}</div>;
}
