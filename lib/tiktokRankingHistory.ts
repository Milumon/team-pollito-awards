export type HistoryPosition = number | null;
export type HistoryChange = 'up' | 'down' | 'entered' | 'exited' | 'unchanged';

export function compareHistoryPosition(current: HistoryPosition, previous: HistoryPosition): HistoryChange {
  if (current === null && previous === null) return 'unchanged';
  if (current === null) return 'exited';
  if (previous === null) return 'entered';
  if (current < previous) return 'up';
  if (current > previous) return 'down';
  return 'unchanged';
}
