import { SRSRating, SRSItemState, SRSHistoryEntry, FSRSCardRecord, WordEntry } from '../types';

const SRS_STORAGE_KEY = 'deutschmeister_srs_state_v1';
const FSRS_STORAGE_KEY = 'deutschmeister_fsrs_records_v1';
export const INITIAL_EASE_FACTOR = 2.5;

/**
 * Binary FSRS (Free Spaced Repetition Scheduler) Configuration
 */
export const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  targetRetention: 0.90, // 90% memory recall probability target
};

/**
 * Core Binary FSRS Function: calculates new stability, difficulty, interval and next review date
 */
export function processFSRSReview(
  passed: boolean,
  currentStability: number = 1.0,
  currentDifficulty: number = 5.0,
  daysElapsed: number = 0
) {
  let newDifficulty: number;
  let newStability: number;

  if (!passed) {
    // FAIL (Rating = 1 / Again)
    newDifficulty = Math.min(10, Math.max(1, currentDifficulty + 1.5));
    newStability =
      FSRS_PARAMS.w[11] *
      Math.pow(newDifficulty, -FSRS_PARAMS.w[12]) *
      (Math.pow(currentStability + 1, FSRS_PARAMS.w[13]) - 1);
    newStability = Math.max(0.1, newStability);
  } else {
    // PASS (Rating = 3 / Good)
    newDifficulty = Math.min(10, Math.max(1, currentDifficulty - 0.2));
    const retrievability = Math.pow(1 + daysElapsed / (9 * currentStability), -1);

    newStability =
      currentStability *
      (1 +
        Math.exp(FSRS_PARAMS.w[8]) *
          (11 - newDifficulty) *
          Math.pow(currentStability, -FSRS_PARAMS.w[9]) *
          (Math.exp((1 - retrievability) * FSRS_PARAMS.w[10]) - 1));
  }

  // Calculate interval in days to hit target memory retention
  const nextInterval = Math.max(1, Math.round(newStability * 9 * (1 / FSRS_PARAMS.targetRetention - 1)));

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval);

  return {
    nextInterval,
    newStability,
    newDifficulty,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

const INITIAL_SEEDED_WORD_IDS = [
  'l1_name',
  'l1_land',
  'l1_stadt',
  'l1_herr',
  'l1_frau',
  'l1_telefon',
  'l1_bild',
  'l1_buch',
  'l1_stuhl',
  'l1_tisch',
];

/**
 * Load all FSRS card records from localStorage
 * Seeds 10 words ready for immediate Spaced Repetition Review on initial launch
 */
export function loadAllFSRSRecords(): Record<string, FSRSCardRecord> {
  try {
    const raw = localStorage.getItem(FSRS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load FSRS records from localStorage', err);
  }

  // Initial seed: 10 starter words due for review right away
  const seededRecords: Record<string, FSRSCardRecord> = {};
  const pastDate = new Date(Date.now() - 3600000).toISOString(); // Due 1 hour ago
  const yesterday = new Date(Date.now() - 86400000).toISOString();

  INITIAL_SEEDED_WORD_IDS.forEach((id) => {
    seededRecords[id] = {
      wordId: id,
      status: 'review',
      isUnlocked: true,
      stability: 1.0,
      difficulty: 5.0,
      intervalDays: 1,
      lastReviewedAt: yesterday,
      nextReviewDate: pastDate,
      repetitionCount: 1,
    };
  });

  saveAllFSRSRecords(seededRecords);
  return seededRecords;
}

/**
 * Save all FSRS card records to localStorage
 */
export function saveAllFSRSRecords(records: Record<string, FSRSCardRecord>): void {
  try {
    localStorage.setItem(FSRS_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('Failed to save FSRS records to localStorage', err);
  }
}

/**
 * Check if a card record is currently due for Review
 * Rule: isUnlocked === true AND status === 'review' AND nextReviewDate <= CurrentTimestamp
 */
export function isCardDueForReview(record?: FSRSCardRecord | null): boolean {
  if (!record) return false;
  if (!record.isUnlocked || record.status !== 'review') return false;
  if (!record.nextReviewDate) return false;
  return new Date(record.nextReviewDate).getTime() <= Date.now();
}

/**
 * Activation Rule:
 * When a user finishes the "Practice" session for a lesson, set a flag
 * (isUnlocked: true, status: 'review', nextReviewDate: tomorrow)
 * so those words are injected into the "Review" pool starting the next day.
 * If a word is ALREADY unlocked from a previous practice session, do not re-inject or overwrite its review state.
 */
export function unlockWordsAfterPractice(
  wordIds: string[],
  existingRecords: Record<string, FSRSCardRecord>
): Record<string, FSRSCardRecord> {
  const updated = { ...existingRecords };
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  let changed = false;

  for (const id of wordIds) {
    const existing = updated[id];
    // 1-Time injection rule: Only inject words that haven't been unlocked yet
    if (!existing || !existing.isUnlocked) {
      updated[id] = {
        wordId: id,
        status: 'review',
        isUnlocked: true,
        stability: 1.0,
        difficulty: 5.0,
        intervalDays: 1,
        lastReviewedAt: now.toISOString(),
        nextReviewDate: tomorrow.toISOString(),
        repetitionCount: 1,
      };
      changed = true;
    }
  }

  if (changed) {
    saveAllFSRSRecords(updated);
  }
  return updated;
}

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

// ---------------------------------------------------------------------------
// Der/Die/Das and Plural review
// ---------------------------------------------------------------------------
//
// Same engine as Flashcard Review, but each drill keeps its own schedule per
// noun: knowing what "Tisch" means is a different memory from knowing it is
// "der Tisch" or "die Tische". Their cards live in the same records map under
// "article:<wordId>" and "plural:<wordId>", so they save and sync with the rest.

export type DrillSkill = 'article' | 'plural';

export function drillCardId(skill: DrillSkill, wordId: string): string {
  return `${skill}:${wordId}`;
}

/** Nouns a drill can review: every noun has an article; singular-only nouns ("(Sg.)") have no plural. */
export function isDrillable(skill: DrillSkill, word: WordEntry): boolean {
  const details = word.nounDetails;
  if (!details?.gender) return false;
  if (skill === 'plural') return !!details.plural && !/\(Sg\.?\)/i.test(details.plural);
  return true;
}

/**
 * When a lesson's Flashcard Practice is finished, its nouns join Der/Die/Das and
 * Plural review too — first due tomorrow, the same rule as Flashcard Review.
 */
export function unlockDrillsAfterPractice(
  words: WordEntry[],
  existingRecords: Record<string, FSRSCardRecord>
): Record<string, FSRSCardRecord> {
  const ids = (['article', 'plural'] as DrillSkill[]).flatMap((skill) =>
    words.filter((w) => isDrillable(skill, w)).map((w) => drillCardId(skill, w.id))
  );
  return unlockWordsAfterPractice(ids, existingRecords);
}

/** One review answer, scheduled exactly as Flashcard Review schedules it. */
export function reviewCard(cardId: string, passed: boolean, existing?: FSRSCardRecord): FSRSCardRecord {
  const base: FSRSCardRecord = existing ?? {
    wordId: cardId,
    status: 'review',
    isUnlocked: true,
    stability: 1.0,
    difficulty: 5.0,
    intervalDays: 1,
    nextReviewDate: new Date().toISOString(),
  };
  const lastReviewed = base.lastReviewedAt ? new Date(base.lastReviewedAt).getTime() : Date.now();
  const daysElapsed = Math.max(0, (Date.now() - lastReviewed) / (1000 * 60 * 60 * 24));
  const result = processFSRSReview(passed, base.stability, base.difficulty, daysElapsed);
  return {
    ...base,
    status: 'review',
    isUnlocked: true,
    stability: result.newStability,
    difficulty: result.newDifficulty,
    intervalDays: result.nextInterval,
    nextReviewDate: result.nextReviewDate,
    lastReviewedAt: new Date().toISOString(),
    repetitionCount: (base.repetitionCount || 0) + 1,
  };
}

/** Which nouns a drill's Review shows: the due ones, or — like Flashcard — the unlocked ones when nothing is due. */
export function drillReviewPool(
  skill: DrillSkill,
  words: WordEntry[],
  records: Record<string, FSRSCardRecord>
): { due: WordEntry[]; unlocked: WordEntry[] } {
  const drillable = words.filter((w) => isDrillable(skill, w));
  const unlocked = drillable.filter((w) => {
    const r = records[drillCardId(skill, w.id)];
    return !!r?.isUnlocked && r.status === 'review';
  });
  const due = unlocked.filter((w) => isCardDueForReview(records[drillCardId(skill, w.id)]));
  return { due, unlocked };
}
