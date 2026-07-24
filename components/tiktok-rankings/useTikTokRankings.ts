'use client';

import { useEffect, useState } from 'react';
import type { CurrentRankings, RankingsState } from './types';

export function useTikTokRankings(accessToken?: string | null, limit = 100): RankingsState {
  const [state, setState] = useState<RankingsState>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    const headers: HeadersInit = accessToken ? { Authorization: `Bearer ${accessToken}` } : {};

    fetch(`/api/tiktok/rankings/current?limit=${limit}`, { headers })
      .then(async (response) => {
        const body = await response.json() as CurrentRankings | { error?: string };
        if (!response.ok) throw new Error('error' in body && body.error ? body.error : 'No se pudo cargar el ranking.');
        return body as CurrentRankings;
      })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ data: null, loading: false, error: error instanceof Error ? error.message : 'No se pudo cargar el ranking.' });
        }
      });

    return () => { cancelled = true; };
  }, [accessToken, limit]);

  return state;
}
