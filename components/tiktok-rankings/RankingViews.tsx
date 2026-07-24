'use client';

import { useState } from 'react';
import { ArrowRight, CalendarDays, Crown, Loader2, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useTikTokRankings } from './useTikTokRankings';
import {
  METRIC_LABELS,
  PERIOD_LABELS,
  RANKING_METRICS,
  RANKING_PERIODS,
  type RankingEntry,
  type RankingMetric,
  type RankingPeriod,
  type RankingSet,
  type RankingsState,
} from './types';

export function formatValue(value: string, metric?: RankingMetric) {
  try {
    if (metric === 'viewers') {
      const totalMinutes = BigInt(value) / BigInt(60_000);
      const hours = totalMinutes / BigInt(60);
      const minutes = totalMinutes % BigInt(60);
      if (hours > BigInt(0)) return `${hours} h ${minutes} min`;
      return `${minutes} min`;
    }
    return BigInt(value).toLocaleString('es-ES');
  } catch {
    return value;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatWindow(set: RankingSet | undefined) {
  if (!set) return '';
  if (!set.window.begin || !set.window.end) return 'No informada por TikTok';
  return `${formatDate(set.window.begin)} - ${formatDate(set.window.end)}`;
}

function tiktokAvatarUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  return `/api/tiktok/avatar?uri=${encodeURIComponent(uri)}`;
}

function Avatar({ entry, large = false }: { entry: RankingEntry; large?: boolean }) {
  const robloxUrl = entry.profile?.roblox_avatar_url;
  const tiktokUrl = tiktokAvatarUrl(entry.tiktok_avatar_uri);
  const imgSrc = robloxUrl || tiktokUrl;

  return (
    <div className={`${large ? 'h-11 w-11' : 'h-8 w-8'} flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${entry.profile ? 'border-[#FFC200]' : 'border-neutral-700'} bg-[#35373d]`}>
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgSrc}
          alt={`Avatar de @${entry.display_id}`}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className={large ? 'text-lg' : 'text-sm'}>♪</span>
      )}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-700 bg-[#24262b] px-4 py-8 text-center">
      <p className="font-display text-sm text-white">{title}</p>
      <p className="mt-1 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

function StatusState({ state }: { state: RankingsState }) {
  if (state.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wide text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin text-[#FFC200]" />
        Cargando ranking...
      </div>
    );
  }
  if (state.error) return <EmptyState title="No se pudo cargar el ranking" detail="Vuelve a intentarlo en unos segundos." />;
  if (!state.data?.batch_id || state.data.sets.length === 0) {
    return <EmptyState title="Aún no hay snapshot publicado" detail="El ranking aparecerá después de la próxima importación." />;
  }
  return null;
}

function RankingRows({ entries, dark = false, limit, metric }: { entries: RankingEntry[]; dark?: boolean; limit?: number; metric?: RankingMetric }) {
  return (
    <div className="space-y-2">
      {entries.slice(0, limit).map((entry) => {
        const winner = entry.position === 1;
        const linked = Boolean(entry.profile);
        const rowClass = dark
          ? linked ? 'border-[#FFC200]/35 bg-[#FFC200]/5' : 'border-neutral-700/40 bg-[#2b2d31]'
          : linked ? 'border-[#FFC200]/35 bg-[#FFF9E6]' : 'border-gray-100 bg-white';

        return (
          <div key={`${entry.display_id}-${entry.position}`} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${rowClass}`}>
            <span className={`w-6 text-center font-black ${winner ? 'text-lg text-[#D4A000]' : 'text-xs text-gray-400'}`}>
              {winner ? <Crown className="mx-auto h-4 w-4" /> : entry.position}
            </span>
            <Avatar entry={entry} large={winner} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className={`truncate text-xs font-bold ${dark ? 'text-white' : 'text-[#2D3139]'}`}>{entry.nickname || `@${entry.display_id}`}</p>
                {linked && <span className="shrink-0 rounded-full bg-[#FFC200]/15 px-2 py-0.5 text-[8px] font-black uppercase text-[#D4A000]">Miembro</span>}
              </div>
              {linked && <p className="truncate text-[10px] text-gray-500">Perfil vinculado: @{entry.profile?.roblox_user}</p>}
            </div>
            <span className={`shrink-0 font-mono text-xs font-bold ${dark ? 'text-gray-300' : 'text-[#2D3139]'}`}>{formatValue(entry.value, metric)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RankingControls({
  metric,
  period,
  onMetric,
  onPeriod,
  dark = false,
}: {
  metric: RankingMetric;
  period: RankingPeriod;
  onMetric: (value: RankingMetric) => void;
  onPeriod: (value: RankingPeriod) => void;
  dark?: boolean;
}) {
  const selectClass = dark ? 'border-neutral-700 bg-[#20232a] text-white' : 'border-gray-200 bg-white text-[#2D3139]';
  return (
    <div className="flex flex-wrap gap-2">
      <select value={metric} onChange={(event) => onMetric(event.target.value as RankingMetric)} className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-[#FFC200] ${selectClass}`}>
        {RANKING_METRICS.map((item) => <option key={item} value={item}>{METRIC_LABELS[item]}</option>)}
      </select>
      <select value={period} onChange={(event) => onPeriod(event.target.value as RankingPeriod)} className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none focus:border-[#FFC200] ${selectClass}`}>
        {RANKING_PERIODS.map((item) => <option key={item} value={item}>{PERIOD_LABELS[item]}</option>)}
      </select>
    </div>
  );
}

function findSet(data: RankingsState['data'], metric: RankingMetric, period: RankingPeriod) {
  return data?.sets.find((item) => item.metric === metric && item.period === period);
}

export function TikTokRankingLanding() {
  const state = useTikTokRankings(null, 10);
  const [metric, setMetric] = useState<RankingMetric>('viewers');
  const [period, setPeriod] = useState<RankingPeriod>('last_live');
  const selected = findSet(state.data, metric, period);

  return (
    <section id="rankings" className="space-y-5 pt-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#D4A000]" />
            <h3 className="font-display text-2xl font-bold tracking-tight text-[#2D3139]">Top 10 de TikTok LIVE</h3>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-500">Ranking completo; los Miembros Oficiales aparecen destacados.</p>
        </div>
        <Link href="/console" className="inline-flex items-center gap-1 text-xs font-bold text-[#D4A000] hover:text-[#2D3139]">
          Ver mi ranking <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {state.loading || state.error || !state.data?.batch_id ? (
        <StatusState state={state} />
      ) : (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,.06)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <p className="font-display text-xs font-bold uppercase text-[#2D3139]">{METRIC_LABELS[metric]} · {PERIOD_LABELS[period]}</p>
              <p className="mt-1 text-[10px] text-gray-400">Actualizado {formatDate(state.data.captured_at)} · Ventana: {formatWindow(selected)}</p>
            </div>
            <RankingControls metric={metric} period={period} onMetric={setMetric} onPeriod={setPeriod} />
          </div>
          {!selected || selected.entries.length === 0
            ? <EmptyState title="Sin actividad para este período" detail="TikTok no devolvió participantes para esta combinación." />
            : <RankingRows entries={selected.entries} limit={10} metric={metric} />}
        </div>
      )}
    </section>
  );
}

export function TikTokRankingConsole({ accessToken }: { accessToken: string }) {
  const state = useTikTokRankings(accessToken);
  const [metric, setMetric] = useState<RankingMetric>('viewers');
  const [period, setPeriod] = useState<RankingPeriod>('last_live');
  const selected = findSet(state.data, metric, period);
  const me = selected?.me ?? null;
  const meIsVisible = me ? selected?.entries.some((entry) => entry.position === me.position && entry.display_id === me.display_id) : false;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1 text-left scrollbar-thin">
      <div className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
        <div className="mb-4 flex flex-col gap-3 border-b border-neutral-700/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-[#FFC200]" />
            <div>
              <h2 className="font-display text-lg font-bold text-white">Rankings de TikTok LIVE</h2>
              <p className="mt-1 text-[10px] font-semibold text-gray-500">Ranking completo con Miembros Oficiales destacados</p>
            </div>
          </div>
          <RankingControls metric={metric} period={period} onMetric={setMetric} onPeriod={setPeriod} dark />
        </div>

        {state.loading || state.error || !state.data?.batch_id ? (
          <StatusState state={state} />
        ) : !selected ? (
          <EmptyState title="Combinación no disponible" detail="El snapshot actual no contiene este período." />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-gray-500">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Capturado {formatDate(state.data.captured_at)}</span>
              <span>Ventana {formatWindow(selected)}</span>
            </div>
            {selected.entries.length === 0
              ? <EmptyState title="Sin actividad" detail="No hay actividad en esta combinación." />
              : <RankingRows entries={selected.entries} dark metric={metric} />}

            <div className={`mt-5 rounded-xl border p-4 ${me ? meIsVisible ? 'border-[#FFC200]/40 bg-[#FFC200]/10' : 'border-sky-500/30 bg-sky-500/10' : 'border-neutral-700 bg-[#24262b]'}`}>
              <div className="flex items-center gap-3">
                {me ? <Avatar entry={me} large /> : <Medal className="h-7 w-7 text-gray-500" />}
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Tu posición</p>
                  {me ? (
                    <p className="truncate font-display text-sm font-bold text-white">#{me.position} · {me.nickname || `@${me.display_id}`} · {formatValue(me.value, metric)}</p>
                  ) : (
                    <p className="text-xs font-semibold text-gray-400">Sin actividad vinculada en esta combinación.</p>
                  )}
                  {me && !meIsVisible && <p className="mt-1 text-[10px] text-sky-300">Tu posición está fuera del tramo visible.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
