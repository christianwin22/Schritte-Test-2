/**
 * The streak, and which of the last days you practised on.
 *
 * One answered card is a day's work — any exercise, any mode. The days
 * themselves are what is stored; the streak is counted from them, so it can
 * never drift out of step with what actually happened.
 */

const KEY = 'deutschmeister_activity_v1'; // travels with the rest of the progress
const KEEP_DAYS = 400;

/** Local calendar day, "2026-09-24" — not UTC, or a late session lands on tomorrow. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function shiftDays(from: Date, by: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + by);
  return d;
}

export function activeDays(): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.filter((d) => typeof d === 'string') : []);
  } catch {
    return new Set();
  }
}

/** Marks today as practised. Safe to call on every answer. */
export function recordActivity(): void {
  const days = activeDays();
  const today = dayKey();
  if (days.has(today)) return;
  days.add(today);
  const kept = [...days].sort().slice(-KEEP_DAYS);
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // out of space: the streak just won't grow today
  }
}

/**
 * Days in a row up to now. Today not being done yet does not break it —
 * the streak only ends once a whole day has passed with nothing in it.
 */
export function currentStreak(days: Set<string> = activeDays()): number {
  const now = new Date();
  let cursor = days.has(dayKey(now)) ? now : shiftDays(now, -1);
  if (!days.has(dayKey(cursor))) return 0;
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count++;
    cursor = shiftDays(cursor, -1);
  }
  return count;
}

/** The last seven days, oldest first, for the little week strip. */
export function lastSevenDays(days: Set<string> = activeDays()): { date: Date; active: boolean }[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDays(today, i - 6);
    return { date, active: days.has(dayKey(date)) };
  });
}

/** Clears the record, for Reset progress. */
export function clearActivity(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to do
  }
}
