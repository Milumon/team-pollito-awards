'use client';

import { useState } from 'react';
import { ArrowRight, CalendarDays, Crown, Loader2, Medal, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTikTokRankings } from './useTikTokRankings';
import { buildPublicRankingHref, parsePublicRankingFilters } from '@/lib/publicRankingRoute';
import { MAX_RANKING_ENTRIES_PER_SNAPSHOT } from '@/lib/tiktokRankingLimits';
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

function Avatar({
  entry,
  large = false,
  publicStyle = false,
}: {
  entry: RankingEntry;
  large?: boolean;
  publicStyle?: boolean;
}) {
  const robloxUrl = entry.profile?.roblox_avatar_url;
  const tiktokUrl = tiktokAvatarUrl(entry.tiktok_avatar_uri);
  const imgSrc = robloxUrl || tiktokUrl;

  return (
    <div className={`${large ? 'h-11 w-11' : 'h-8 w-8'} flex shrink-0 items-center justify-center overflow-hidden ${publicStyle ? 'rounded-2xl border-3 border-black bg-[#FFD500]' : `rounded-full border ${entry.profile ? 'border-[#FFC200]' : 'border-neutral-700'} bg-[#35373d]`}`}>
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

function EmptyState({
  title,
  detail,
  publicStyle = false,
}: {
  title: string;
  detail: string;
  publicStyle?: boolean;
}) {
  return (
    <div className={publicStyle
      ? "rounded-2xl border-3 border-black bg-[#FFD500] px-4 py-8 text-center font-['Inter'] shadow-[6px_6px_0_0_#000]"
      : 'rounded-xl border border-dashed border-neutral-700 bg-[#24262b] px-4 py-8 text-center'}>
      <p className={publicStyle ? "font-['Anton'] text-sm uppercase text-black" : 'font-display text-sm text-white'}>{title}</p>
      <p className={`mt-1 text-xs ${publicStyle ? 'text-black' : 'text-gray-500'}`}>{detail}</p>
    </div>
  );
}

function StatusState({ state, publicStyle = false }: { state: RankingsState; publicStyle?: boolean }) {
  if (state.loading) {
    return (
      <div className={publicStyle
        ? "flex items-center justify-center gap-2 rounded-2xl border-3 border-black bg-[#FDFBF7] py-12 font-['Inter'] text-xs font-bold uppercase tracking-wide text-black shadow-[6px_6px_0_0_#000]"
        : 'flex items-center justify-center gap-2 py-12 text-xs font-bold uppercase tracking-wide text-gray-500'}>
        <Loader2 className={`h-4 w-4 animate-spin ${publicStyle ? 'text-[#FFD500]' : 'text-[#FFC200]'}`} />
        {publicStyle ? 'Cargando Snapshot de Ranking...' : 'Cargando ranking...'}
      </div>
    );
  }
  if (state.error) {
    return (
      <EmptyState
        title={publicStyle ? 'No se pudo cargar el Snapshot de Ranking' : 'No se pudo cargar el ranking'}
        detail="Vuelve a intentarlo en unos segundos."
        publicStyle={publicStyle}
      />
    );
  }
  if (!state.data?.batch_id || state.data.sets.length === 0) {
    return (
      <EmptyState
        title={publicStyle ? 'Aún no hay Snapshot de Ranking publicado' : 'Aún no hay snapshot publicado'}
        detail={publicStyle ? 'El Snapshot de Ranking aparecerá después de la próxima importación.' : 'El ranking aparecerá después de la próxima importación.'}
        publicStyle={publicStyle}
      />
    );
  }
  return null;
}

function RankingRows({
  entries,
  dark = false,
  publicStyle = false,
  limit,
  metric,
}: {
  entries: RankingEntry[];
  dark?: boolean;
  publicStyle?: boolean;
  limit?: number;
  metric?: RankingMetric;
}) {
  return (
    <div className={publicStyle ? 'space-y-4' : 'space-y-2'}>
      {entries.slice(0, limit).map((entry) => {
        const winner = entry.position === 1;
        const linked = Boolean(entry.profile);
        const rowClass = publicStyle
          ? 'border-black bg-white shadow-[6px_6px_0_0_#000]'
          : dark
          ? linked ? 'border-[#FFC200]/35 bg-[#FFC200]/5' : 'border-neutral-700/40 bg-[#2b2d31]'
          : linked ? 'border-[#FFC200]/35 bg-[#FFF9E6]' : 'border-gray-100 bg-white';

        return (
          <div key={`${entry.display_id}-${entry.position}`} className={`flex items-center gap-3 px-3 py-2 ${publicStyle ? 'rounded-2xl border-3' : 'rounded-xl border'} ${rowClass}`}>
            <span className={`w-6 text-center font-black ${winner ? `text-lg ${publicStyle ? 'text-black' : 'text-[#D4A000]'}` : `text-xs ${publicStyle ? 'text-black' : 'text-gray-400'}`}`}>
              {winner ? <Crown className={`mx-auto h-4 w-4 ${publicStyle ? 'fill-[#FFD500] text-black' : ''}`} /> : entry.position}
            </span>
            <Avatar entry={entry} large={winner} publicStyle={publicStyle} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className={`truncate text-xs font-bold ${dark ? 'text-white' : publicStyle ? 'text-black' : 'text-[#2D3139]'}`}>{entry.nickname || `@${entry.display_id}`}</p>
                {linked && <span className={publicStyle ? 'shrink-0 rounded-2xl border-3 border-black bg-[#FFD500] px-2 py-0.5 text-[8px] font-black uppercase text-black shadow-[2px_2px_0_0_#000]' : 'shrink-0 rounded-full bg-[#FFC200]/15 px-2 py-0.5 text-[8px] font-black uppercase text-[#D4A000]'}>Miembro</span>}
              </div>
              {linked && <p className="truncate text-[10px] text-gray-500">Perfil vinculado: @{entry.profile?.roblox_user}</p>}
            </div>
            <span className={`shrink-0 font-mono text-xs font-bold ${dark ? 'text-gray-300' : publicStyle ? 'text-black' : 'text-[#2D3139]'}`}>{formatValue(entry.value, metric)}</span>
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
  publicStyle = false,
}: {
  metric: RankingMetric;
  period: RankingPeriod;
  onMetric: (value: RankingMetric) => void;
  onPeriod: (value: RankingPeriod) => void;
  dark?: boolean;
  publicStyle?: boolean;
}) {
  const selectClass = publicStyle
    ? 'border-3 border-black bg-white text-black shadow-[3px_3px_0_0_#000]'
    : dark ? 'border border-neutral-700 bg-[#20232a] text-white' : 'border border-gray-200 bg-white text-[#2D3139]';
  const focusClass = publicStyle ? 'focus:border-[#FFD500]' : 'focus:border-[#FFC200]';
  return (
    <div className="flex flex-wrap gap-2">
      <select aria-label="Métrica de clasificación" value={metric} onChange={(event) => onMetric(event.target.value as RankingMetric)} className={`${publicStyle ? 'rounded-2xl' : 'rounded-xl'} px-3 py-2 text-xs font-bold outline-none ${focusClass} ${selectClass}`}>
        {RANKING_METRICS.map((item) => <option key={item} value={item}>{METRIC_LABELS[item]}</option>)}
      </select>
      <select aria-label="Período de clasificación" value={period} onChange={(event) => onPeriod(event.target.value as RankingPeriod)} className={`${publicStyle ? 'rounded-2xl' : 'rounded-xl'} px-3 py-2 text-xs font-bold outline-none ${focusClass} ${selectClass}`}>
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
          <p className="mt-1 text-sm font-semibold text-gray-500">Resumen del Snapshot de Ranking publicado; los Miembros Oficiales aparecen destacados.</p>
        </div>
        <Link href={buildPublicRankingHref({ metric, period })} className="inline-flex items-center gap-1 text-xs font-bold text-[#D4A000] hover:text-[#2D3139]">
          Ver clasificaciones completas <ArrowRight className="h-3.5 w-3.5" />
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

export function TikTokRankingPublicPage() {
  const state = useTikTokRankings(null, MAX_RANKING_ENTRIES_PER_SNAPSHOT);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { metric, period } = parsePublicRankingFilters({
    metrica: searchParams.get('metrica'),
    periodo: searchParams.get('periodo'),
  });
  const selected = findSet(state.data, metric, period);

  const navigateToFilters = (nextMetric: RankingMetric, nextPeriod: RankingPeriod) => {
    if (nextMetric === metric && nextPeriod === period) return;

    router.push(buildPublicRankingHref({ metric: nextMetric, period: nextPeriod }), {
      scroll: false,
    });
  };

  return (
    <main className="min-h-screen bg-[#FDFBF7] px-4 py-10 font-['Inter'] text-black sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <p className="inline-flex border-3 border-black bg-[#FFD500] px-3 py-1 font-['Anton'] text-xs font-black uppercase tracking-[0.2em] shadow-[3px_3px_0_0_#000]">Clasificaciones</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-['Anton'] text-4xl font-bold uppercase tracking-tight">Clasificaciones de TikTok LIVE</h1>
              <p className="mt-2 text-sm font-semibold text-gray-700">El Snapshot de Ranking publicado se muestra completo y admite filtros compartibles en español.</p>
            </div>
            <Link href="/" className="inline-flex items-center gap-1 rounded-2xl border-3 border-black bg-[#FFD500] px-3 py-2 font-['Anton'] text-xs font-black uppercase text-black shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[3px] active:translate-y-[3px] active:shadow-none">
              Volver a la comunidad <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <section className="brutalist-shadow rounded-2xl border-3 border-black bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-3">
            <div>
              <p className="font-['Anton'] text-xs font-bold uppercase text-black">{METRIC_LABELS[metric]} · {PERIOD_LABELS[period]}</p>
              <p className="mt-1 text-[10px] text-gray-400">
                Actualizado {formatDate(state.data?.captured_at)} · Ventana: {formatWindow(selected)}
              </p>
            </div>
            <RankingControls
              metric={metric}
              period={period}
              onMetric={(nextMetric) => navigateToFilters(nextMetric, period)}
              onPeriod={(nextPeriod) => navigateToFilters(metric, nextPeriod)}
              publicStyle
            />
          </div>

          {state.loading || state.error || !state.data?.batch_id ? (
            <StatusState state={state} publicStyle />
          ) : !selected || selected.entries.length === 0 ? (
            <EmptyState title="Snapshot de Ranking sin actividad en este período" detail="TikTok no devolvió participantes para esta combinación." publicStyle />
          ) : (
            <RankingRows entries={selected.entries} metric={metric} publicStyle />
          )}
        </section>
      </div>
    </main>
  );
}
