'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, LogIn, LogOut, Minus } from 'lucide-react';
import { compareHistoryPosition, type HistoryChange } from '@/lib/tiktokRankingHistory';
import {
  METRIC_LABELS,
  PERIOD_LABELS,
  RANKING_METRICS,
  RANKING_PERIODS,
  type RankingMetric,
  type RankingPeriod,
} from './types';

type HistorySnapshot = {
  batch_id: string;
  captured_at: string;
  sets: Array<{
    metric: RankingMetric;
    period: RankingPeriod;
    window: { begin: string | null; end: string | null };
    entries: Array<{ position: number; value: string }>;
  }>;
};

const labels: Record<HistoryChange, string> = {
  up: 'Subiste',
  down: 'Bajaste',
  entered: 'Entraste',
  exited: 'Saliste',
  unchanged: 'Sin cambio',
};

function Change({ value }: { value: HistoryChange }) {
  const Icon = value === 'up'
    ? ArrowUp
    : value === 'down'
      ? ArrowDown
      : value === 'entered'
        ? LogIn
        : value === 'exited'
          ? LogOut
          : Minus;

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
      <Icon className="h-3 w-3" />
      {labels[value]}
    </span>
  );
}

export function TikTokRankingHistory({ accessToken }: { accessToken: string }) {
  const [metric, setMetric] = useState<RankingMetric>('viewers');
  const [period, setPeriod] = useState<RankingPeriod>('last_live');
  const [snapshots, setSnapshots] = useState<HistorySnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetch(`/api/tiktok/rankings?metric=${metric}&period=${period}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const body = await response.json() as { history?: HistorySnapshot[]; error?: string };
        if (!response.ok) throw new Error(body.error || 'No se pudo cargar el historial.');
        return body;
      })
      .then((body) => {
        if (!cancelled) {
          setSnapshots((body.history ?? []).reverse());
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setSnapshots([]);
          setError(cause instanceof Error ? cause.message : 'No se pudo cargar el historial.');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [accessToken, metric, period]);

  return (
    <section className="rounded-2xl border border-neutral-700/60 bg-[#2b2d31] p-5 shadow-[0_4px_12px_rgba(0,0,0,.25)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-700/60 pb-3">
        <div>
          <h3 className="font-display text-sm font-bold text-white">Historial personal</h3>
          <p className="mt-1 text-[10px] font-semibold text-gray-500">
            {METRIC_LABELS[metric]} · {PERIOD_LABELS[period]} · solo snapshots comparables
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={metric}
            onChange={(event) => {
              setLoading(true);
              setError(null);
              setMetric(event.target.value as RankingMetric);
            }}
            className="rounded-lg border border-neutral-700 bg-[#20232a] px-2 py-1 text-[10px] font-bold text-white"
          >
            {RANKING_METRICS.map((item) => <option key={item} value={item}>{METRIC_LABELS[item]}</option>)}
          </select>
          <select
            value={period}
            onChange={(event) => {
              setLoading(true);
              setError(null);
              setPeriod(event.target.value as RankingPeriod);
            }}
            className="rounded-lg border border-neutral-700 bg-[#20232a] px-2 py-1 text-[10px] font-bold text-white"
          >
            {RANKING_PERIODS.map((item) => <option key={item} value={item}>{PERIOD_LABELS[item]}</option>)}
          </select>
        </div>
      </div>

      {error ? (
        <p className="py-6 text-center text-xs text-red-400">{error}</p>
      ) : loading ? (
        <p className="py-6 text-center text-xs text-gray-500">Cargando historial...</p>
      ) : snapshots.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-500">Aún no hay snapshots para esta combinación.</p>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snapshot, index) => {
            const entry = snapshot.sets[0]?.entries[0];
            const previous = snapshots[index - 1]?.sets[0]?.entries[0];
            const change = index === 0
              ? 'unchanged'
              : compareHistoryPosition(entry?.position ?? null, previous?.position ?? null);

            return (
              <div key={snapshot.batch_id} className="flex items-center gap-3 rounded-xl border border-neutral-700/50 bg-[#24262b] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white">
                    {new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(snapshot.captured_at))}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {entry ? `Posición #${entry.position} · Valor ${entry.value}` : 'Sin actividad en este snapshot'}
                  </p>
                </div>
                <Change value={change} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
