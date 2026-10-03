import { WordEntry } from '../types';
import { WordCard, cardsFor } from './wordCards';

/**
 * Words · which cards are still waiting to be practised, per direction.
 *
 * A card is done in a direction the first time it is answered right in that
 * direction's Practice. Everything else in the lesson is pending — including
 * words added to the list later, so they turn up in the next Practice instead
 * of hiding behind a lesson that was already finished.
 *
 * Saved as { de: { cardKey: when }, en: { … } }, synced with the rest.
 */
export type PracticeDir = 'de' | 'en';
export type PracticeDone = Record<PracticeDir, Record<string, string>>;

export const dirOf = (direction: 'DE_TO_EN' | 'EN_TO_DE'): PracticeDir => (direction === 'DE_TO_EN' ? 'de' : 'en');

/** Word ids added after Practice could already be finished — never counted as done by the first move-over. */
const ADDED_LATER = new Set([
  'a12_l8_arzt',
  'a12_l8_frage',
  'a12_l8_abteilung',
  'a12_l8_zeigen',
  'a12_l8_kenntnisse',
  'a12_l8_unterlagen',
]);

const empty = (): PracticeDone => ({ de: {}, en: {} });

export function loadPracticeDone(key: string): PracticeDone | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PracticeDone>;
    return { de: parsed.de ?? {}, en: parsed.en ?? {} };
  } catch {
    return null;
  }
}

export function savePracticeDone(key: string, done: PracticeDone): void {
  try {
    localStorage.setItem(key, JSON.stringify(done));
  } catch {
    // out of space: pending counts just start over next time
  }
}

interface OldLessonProgress {
  practiceCompleted?: boolean;
  practiceDe?: boolean;
  practiceEn?: boolean;
}
interface OldSavedPractice {
  level: string;
  lektion: number | string;
  dir: 'DE_TO_EN' | 'EN_TO_DE';
  keys: string[];
  index: number;
  redo: string[];
}

const inLesson = (word: WordEntry, lektion: number | string) =>
  lektion === 'ALL' ||
  (lektion === 'PART_1' && word.lektion >= 0 && word.lektion <= 7) ||
  (lektion === 'PART_2' && word.lektion >= 8 && word.lektion <= 14) ||
  word.lektion === lektion;

/**
 * The first time: work out what is already done from what was saved before
 * there was a done list — finished lessons, and the Practice you were halfway
 * through (every card behind you that is not waiting in the redo round).
 */
export function firstPracticeDone(
  words: WordEntry[],
  prefix: string,
  lessonProgress: Record<string, OldLessonProgress>,
  saved: OldSavedPractice | null
): PracticeDone {
  const done = empty();
  const when = new Date().toISOString();
  const mark = (cards: WordCard[], dir: PracticeDir, skip: Set<string> = new Set()) => {
    for (const c of cards) if (!ADDED_LATER.has(c.word.id) && !skip.has(c.key)) done[dir][c.key] = when;
  };
  for (const [lessonKey, p] of Object.entries(lessonProgress)) {
    const m = lessonKey.match(/^([AB]\d)_L(\d+)$/);
    if (!m) continue;
    const cards = cardsFor(words.filter((w) => w.level === m[1] && w.lektion === Number(m[2])), prefix);
    if (p.practiceDe ?? p.practiceCompleted) mark(cards, 'de');
    if (p.practiceEn ?? p.practiceCompleted) mark(cards, 'en');
  }
  if (saved?.keys?.length) {
    const waiting = new Set([...saved.keys.slice(saved.index), ...(saved.redo ?? [])]);
    const cards = cardsFor(words.filter((w) => w.level === saved.level && inLesson(w, saved.lektion)), prefix);
    mark(cards, dirOf(saved.dir), waiting);
  }
  return done;
}

// --- Learn keeps its place too ---------------------------------------------

const LEARN_PLACE_KEY = 'schritte_learn_place_v1';
const placeKey = (level: string, lektion: number | string, dir: string) => `${level}_${lektion}_${dir}`;

/**
 * The card you stopped on, by its key, so it is the same word even when the
 * lesson's order changes. Older saves kept a page number; those come back as one.
 */
export function loadLearnPlace(level: string, lektion: number | string, dir: string): string | number | null {
  try {
    const all = JSON.parse(localStorage.getItem(LEARN_PLACE_KEY) || '{}') as Record<string, string | number>;
    const place = all[placeKey(level, lektion, dir)];
    return typeof place === 'string' || typeof place === 'number' ? place : null;
  } catch {
    return null;
  }
}

/** null forgets the place (the lesson was finished, or the session ended). */
export function saveLearnPlace(level: string, lektion: number | string, dir: string, cardKey: string | null): void {
  try {
    const all = JSON.parse(localStorage.getItem(LEARN_PLACE_KEY) || '{}') as Record<string, string | number>;
    const k = placeKey(level, lektion, dir);
    if (cardKey === null) delete all[k];
    else all[k] = cardKey;
    localStorage.setItem(LEARN_PLACE_KEY, JSON.stringify(all));
  } catch {
    // nothing to do
  }
}
