import { SRSRating, SRSItemState, SRSHistoryEntry } from '../types';

const SRS_STORAGE_KEY = 'deutschmeister_srs_state_v1';
export const INITIAL_EASE_FACTOR = 2.5;

/**
 * Creates a fresh SRS state for a new word
 */
export function createInitialSRSState(wordId: string): SRSItemState {
  return {
    wordId,
    stability: 20, // Initial base familiarity
    intervalDays: 0,
    repetitionCount: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    lastReviewed: null,
    nextDue: new Date().toISOString(), // Due immediately
    history: [],
  };
}

/**
 * Calculates human-friendly interval string preview for SRS buttons
 */
export function getIntervalPreview(currentState: SRSItemState, rating: SRSRating): string {
  const currentInterval = currentState.intervalDays || 0;
  const currentEase = currentState.easeFactor || INITIAL_EASE_FACTOR;

  switch (rating) {
    case 'again':
      return '< 10m';
    case 'hard': {
      const days = currentInterval === 0 ? 1 : Math.max(1, Math.round(currentInterval * 1.2));
      return days === 1 ? '1d' : `${days}d`;
    }
    case 'good': {
      let days = 1;
      if (currentInterval === 0) days = 1;
      else if (currentInterval === 1) days = 3;
      else days = Math.round(currentInterval * currentEase);
      return `${days}d`;
    }
    case 'easy': {
      let days = 2;
      if (currentInterval === 0) days = 3;
      else if (currentInterval === 1) days = 5;
      else days = Math.round(currentInterval * currentEase * 1.35);
      return `${days}d`;
    }
  }
}

/**
 * Calculates new SRS parameters after user provides feedback or evaluation
 */
export function calculateNextSRSState(
  currentState: SRSItemState,
  rating: SRSRating,
  exerciseMode: string,
  accuracyScore: number
): SRSItemState {
  const now = new Date();
  let { stability, intervalDays, repetitionCount, easeFactor, history } = { ...currentState };
  history = [...history];

  const historyEntry: SRSHistoryEntry = {
    timestamp: now.toISOString(),
    rating,
    mode: exerciseMode,
    score: accuracyScore,
  };
  history.push(historyEntry);

  let nextIntervalDays = 0;

  switch (rating) {
    case 'again':
      nextIntervalDays = 0.007; // ~10 minutes
      repetitionCount = 0;
      {
        const penalty = accuracyScore > 50 ? 10 : 25;
        stability = Math.max(10, stability - penalty);
        easeFactor = Math.max(1.3, easeFactor - 0.2);
      }
      break;
    case 'hard':
      if (intervalDays === 0) {
        nextIntervalDays = 1;
      } else {
        nextIntervalDays = Math.max(1, Math.round(intervalDays * 1.2));
      }
      repetitionCount += 1;
      stability = Math.min(100, stability + 10);
      easeFactor = Math.max(1.3, easeFactor - 0.15);
      break;
    case 'good':
      if (intervalDays === 0) {
        nextIntervalDays = 1;
      } else if (intervalDays <= 1) {
        nextIntervalDays = 3;
      } else {
        nextIntervalDays = Math.round(intervalDays * easeFactor);
      }
      repetitionCount += 1;
      stability = Math.min(100, stability + 25);
      easeFactor = Math.min(3.0, easeFactor + 0.05);
      break;
    case 'easy':
      if (intervalDays === 0) {
        nextIntervalDays = 3;
      } else if (intervalDays <= 1) {
        nextIntervalDays = 5;
      } else {
        nextIntervalDays = Math.round(intervalDays * easeFactor * 1.35);
      }
      repetitionCount += 1;
      stability = Math.min(100, stability + 40);
      easeFactor = Math.min(3.0, easeFactor + 0.15);
      break;
  }

  const nextDueDate = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);

  return {
    wordId: currentState.wordId,
    stability: Math.round(stability),
    intervalDays: nextIntervalDays,
    repetitionCount,
    easeFactor: Number(easeFactor.toFixed(2)),
    lastReviewed: now.toISOString(),
    nextDue: nextDueDate.toISOString(),
    history,
  };
}

/**
 * Load all SRS items from localStorage
 */
export function loadSRSStates(): Record<string, SRSItemState> {
  try {
    const raw = localStorage.getItem(SRS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load SRS state from localStorage', err);
    return {};
  }
}

/**
 * Save all SRS items to localStorage
 */
export function saveSRSStates(states: Record<string, SRSItemState>): void {
  try {
    localStorage.setItem(SRS_STORAGE_KEY, JSON.stringify(states));
  } catch (err) {
    console.error('Failed to save SRS state to localStorage', err);
  }
}
