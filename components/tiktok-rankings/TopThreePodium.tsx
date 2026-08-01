'use client';

import { Crown } from 'lucide-react';
import { formatValue } from './RankingViews';
import type { RankingEntry, RankingMetric } from './types';

function tiktokAvatarUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  return `/api/tiktok/avatar?uri=${encodeURIComponent(uri)}`;
}

const RANK_CONFIG = {
  1: {
    height: '100%',
    gradient: 'from-[#FFD500] via-[#FFC200] to-[#F5A623]',
    border: 'border-[#FFD500]',
    badge: 'bg-[#FFD500] text-white',
    ring: 'ring-[#FFD500]',
    label: '1',
  },
  2: {
    height: '72%',
    gradient: 'from-[#E5E7EB] via-[#D1D5DB] to-[#B8BCC4]',
    border: 'border-[#D1D5DB]',
    badge: 'bg-[#9CA3AF] text-white',
    ring: 'ring-[#D1D5DB]',
    label: '2',
  },
  3: {
    height: '62%',
    gradient: 'from-[#FCD9B6] via-[#F0C48A] to-[#D4A056]',
    border: 'border-[#E8B87A]',
    badge: 'bg-[#D4A056] text-white',
    ring: 'ring-[#E8B87A]',
    label: '3',
  },
} as const;

function Pedestal({
  entry,
  rank,
  metric,
}: {
  entry: RankingEntry;
  rank: 1 | 2 | 3;
  metric: RankingMetric;
}) {
  const config = RANK_CONFIG[rank];
  const robloxUrl = entry.profile?.roblox_avatar_url;
  const tiktokUrl = tiktokAvatarUrl(entry.tiktok_avatar_uri);
  const imgSrc = robloxUrl || tiktokUrl;
  const linked = Boolean(entry.profile);

  return (
    <div
      className="podium-col flex flex-col items-center"
      style={{ animationDelay: `${(rank - 1) * 120}ms` }}
    >
      {/* Position badge */}
      <div className={`relative z-10 mb-2 flex h-7 w-7 items-center justify-center rounded-full ${config.badge} text-xs font-bold shadow-sm`}>
        {rank === 1 ? <Crown className="h-3.5 w-3.5" /> : config.label}
      </div>

      {/* Avatar */}
      <div className="avatar-pop mb-2" style={{ animationDelay: `${(rank - 1) * 120 + 100}ms` }}>
        <div className={`relative h-14 w-14 rounded-full border-2 ${config.border} ring-4 ${config.ring}/20 bg-gray-100 overflow-hidden sm:h-16 sm:w-16`}>
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={`Avatar de @${entry.display_id}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-xl text-gray-400">♪</span>
          )}
        </div>
      </div>

      {/* Name + badge + linked user */}
      <div className="mb-2 text-center">
        <p className="text-sm font-bold text-[#2D3139] sm:text-base">
          {entry.nickname || `@${entry.display_id}`}
        </p>
        {linked && (
          <span className="mt-1 inline-block rounded-full bg-[#FFD500]/15 px-2 py-0.5 text-[8px] font-bold uppercase text-[#B8860B]">
            Miembro
          </span>
        )}
        {linked && (
          <p className="mt-0.5 text-[10px] text-gray-400">@{entry.profile?.roblox_user}</p>
        )}
      </div>

      {/* Value */}
      <p className={`mb-3 text-xs font-semibold ${rank === 1 ? 'text-[#B8860B]' : 'text-gray-500'} sm:text-sm`}>
        {formatValue(entry.value, metric)}
      </p>

      {/* Pedestal bar */}
      <div
        className={`bar-grow relative w-20 overflow-hidden rounded-xl bg-gradient-to-b ${config.gradient} sm:w-24`}
        style={{
          height: config.height,
          minHeight: rank === 1 ? '160px' : rank === 2 ? '115px' : '100px',
          animationDelay: `${(rank - 1) * 120 + 200}ms`,
        }}
      >
        {/* Crown watermark */}
        <Crown className="absolute inset-0 m-auto h-10 w-10 opacity-[0.06]" />

        {/* Subtle inner glow */}
        <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/25 to-transparent" />
      </div>
    </div>
  );
}

export function TopThreePodium({
  viewers,
  metric,
}: {
  viewers: RankingEntry[];
  metric: RankingMetric;
}) {
  const sorted = [...viewers].sort((a, b) => a.position - b.position);
  const first = sorted.find((e) => e.position === 1);
  const second = sorted.find((e) => e.position === 2);
  const third = sorted.find((e) => e.position === 3);

  if (!first && !second && !third) return null;

  return (
    <div className="podium-container relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,.06)] sm:p-8">
      {/* Background stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[
          { top: '10%', left: '6%' },
          { top: '18%', right: '9%' },
          { top: '50%', left: '4%' },
          { top: '65%', right: '6%' },
          { bottom: '15%', left: '12%' },
          { bottom: '25%', right: '14%' },
        ].map((pos, i) => (
          <span
            key={i}
            className="absolute text-xs text-[#FFD500]/15"
            style={pos}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Podium grid */}
      <div className="podium-grid relative z-10 flex items-end justify-center gap-4 sm:gap-8" style={{ minHeight: '300px' }}>
        {second && <Pedestal entry={second} rank={2} metric={metric} />}
        {first && <Pedestal entry={first} rank={1} metric={metric} />}
        {third && <Pedestal entry={third} rank={3} metric={metric} />}
      </div>
    </div>
  );
}
