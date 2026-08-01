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
    border: 'border-[#D4A000]',
    badge: 'bg-[#FFD500] text-black',
    ring: 'ring-[#FFD500]',
    label: '1',
  },
  2: {
    height: '72%',
    gradient: 'from-[#D1D5DB] via-[#C0C0C0] to-[#A8A8A8]',
    border: 'border-[#9CA3AF]',
    badge: 'bg-[#C0C0C0] text-white',
    ring: 'ring-[#C0C0C0]',
    label: '2',
  },
  3: {
    height: '62%',
    gradient: 'from-[#F59E0B] via-[#E8973A] to-[#CD7F32]',
    border: 'border-[#B8860B]',
    badge: 'bg-[#CD7F32] text-white',
    ring: 'ring-[#CD7F32]',
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
      <div className={`relative z-10 mb-2 flex h-8 w-8 items-center justify-center rounded-full ${config.badge} border-2 border-black text-sm font-black shadow-md`}>
        {rank === 1 ? <Crown className="h-4 w-4" /> : config.label}
      </div>

      {/* Avatar */}
      <div className="avatar-pop mb-2" style={{ animationDelay: `${(rank - 1) * 120 + 100}ms` }}>
        <div className={`relative h-16 w-16 rounded-full border-3 ${config.border} ring-4 ${config.ring}/30 bg-[#35373d] overflow-hidden sm:h-20 sm:w-20`}>
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={`Avatar de @${entry.display_id}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center text-2xl">♪</span>
          )}
          {/* Chick decoration on avatar */}
          <span className="absolute -bottom-1 -right-1 text-lg opacity-70">🐣</span>
        </div>
      </div>

      {/* Name + badge + linked user */}
      <div className="mb-2 text-center">
        <p className="text-sm font-black text-[#2D3139] sm:text-base">
          {entry.nickname || `@${entry.display_id}`}
        </p>
        {linked && (
          <span className="mt-1 inline-block rounded-full border border-black bg-[#FFD500] px-2 py-0.5 text-[8px] font-black uppercase text-black">
            Miembro
          </span>
        )}
        {linked && (
          <p className="mt-1 text-[10px] text-gray-500">@{entry.profile?.roblox_user}</p>
        )}
      </div>

      {/* Value */}
      <p className={`mb-3 text-xs font-bold ${rank === 1 ? 'text-[#B8860B]' : 'text-[#2D3139]'} sm:text-sm`}>
        {formatValue(entry.value, metric)}
      </p>

      {/* Pedestal bar */}
      <div
        className={`bar-grow relative w-24 overflow-hidden rounded-t-2xl border-3 border-b-0 ${config.border} bg-gradient-to-b ${config.gradient} sm:w-28`}
        style={{
          height: config.height,
          minHeight: rank === 1 ? '180px' : rank === 2 ? '130px' : '110px',
          animationDelay: `${(rank - 1) * 120 + 200}ms`,
        }}
      >
        {/* Crown watermark */}
        <Crown className="absolute inset-0 m-auto h-12 w-12 opacity-[0.08]" />

        {/* Subtle inner glow */}
        <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/20 to-transparent" />
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
    <div className="podium-container relative overflow-hidden rounded-2xl border-3 border-black bg-[#FFFDF5] p-4 shadow-[6px_6px_0_0_#000] sm:p-6">
      {/* Background stars */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {[
          { top: '8%', left: '5%', size: 'text-xs' },
          { top: '15%', right: '8%', size: 'text-sm' },
          { top: '45%', left: '3%', size: 'text-[10px]' },
          { top: '60%', right: '5%', size: 'text-xs' },
          { bottom: '12%', left: '10%', size: 'text-sm' },
          { bottom: '20%', right: '12%', size: 'text-[10px]' },
        ].map((star, i) => (
          <span
            key={i}
            className={`absolute ${star.size} text-[#FFD500]/20`}
            style={{ top: star.top, left: star.left, right: star.right, bottom: star.bottom }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Podium grid */}
      <div className="podium-grid relative z-10 flex items-end justify-center gap-3 sm:gap-6" style={{ minHeight: '320px' }}>
        {second && <Pedestal entry={second} rank={2} metric={metric} />}
        {first && <Pedestal entry={first} rank={1} metric={metric} />}
        {third && <Pedestal entry={third} rank={3} metric={metric} />}
      </div>
    </div>
  );
}
