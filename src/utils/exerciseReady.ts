import { WordEntry } from '../types';

/**
 * Lessons waiting in the verb exercises, the way the noun drills already work:
 *
 *   finish a lesson's Words Practice  → that lesson is "ready" (amber) in
 *                                        Present, Simple Past and Present Perfect,
 *                                        where they have it
 *   finish a tense's Practice         → "done" there, and that lesson is ready
 *                                        in Sentence, in the same tense
 *   finish it in Sentence             → "done", and the notice goes
 *
 * Kept apart from the noun drills' state (srsEngine), in a synced "schritte_" key.
 */

const KEY = 'schritte_exercise_ready_v1';

export type ReadyExercise = 'conj' | 'past' | 'perfect' | 'sentPresent' | 'sentPast' | 'sentPerfect';
const ALL: ReadyExercise[] = ['conj', 'past', 'perfect', 'sentPresent', 'sentPast', 'sentPerfect'];
/** Sentence, tense by tense, waits for that tense's own Practice. */
export const SENTENCE_READY: Record<'present' | 'past' | 'perfect', ReadyExercise> = {
  present: 'sentPresent',
  past: 'sentPast',
  perfect: 'sentPerfect',
};
const SENTENCE_AFTER: Partial<Record<ReadyExercise, ReadyExercise>> = {
  conj: 'sentPresent',
  past: 'sentPast',
  perfect: 'sentPerfect',
};
export type ReadyState = Record<ReadyExercise, Record<string, 'ready' | 'done'>>;

export const readyKey = (level: string, lektion: number) => `${level}-${lektion}`;

export function loadExerciseReady(): ReadyState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Object.fromEntries(ALL.map((ex) => [ex, parsed[ex] ?? {}])) as ReadyState;
  } catch {
    return Object.fromEntries(ALL.map((ex) => [ex, {}])) as ReadyState;
  }
}

function save(state: ReadyState): ReadyState {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  return state;
}

/** Does this exercise have anything for that lesson? */
export function exerciseHasLesson(exercise: 'conj' | 'past' | 'perfect', lessonWords: WordEntry[]): boolean {
  if (exercise === 'conj') return lessonWords.some((w) => w.presentTense?.length === 6);
  if (exercise === 'past') return lessonWords.some((w) => w.simplePast?.length === 6 && w.simplePast.some((f) => f !== '-'));
  return lessonWords.some((w) => w.presentPerfect?.length === 6 && w.presentPerfect.some((f) => f !== '-'));
}

/** After a lesson's Words Practice: ready wherever that lesson has something — unless already done. */
export function markReadyAfterWords(level: string, lektion: number, lessonWords: WordEntry[]): ReadyState {
  const state = loadExerciseReady();
  const key = readyKey(level, lektion);
  for (const ex of ['conj', 'past', 'perfect'] as const) {
    if (state[ex][key] === 'done') continue;
    if (exerciseHasLesson(ex, lessonWords)) state[ex] = { ...state[ex], [key]: 'ready' };
  }
  return save(state);
}

/**
 * Finished in that exercise: those lessons are done there. A tense's Practice
 * also makes them ready in Sentence, in that tense (unless done there already).
 */
export function markExerciseDone(exercise: ReadyExercise, keys: string[]): ReadyState {
  const state = loadExerciseReady();
  state[exercise] = { ...state[exercise] };
  for (const k of keys) state[exercise][k] = 'done';
  const sentence = SENTENCE_AFTER[exercise];
  if (sentence) {
    state[sentence] = { ...state[sentence] };
    for (const k of keys) if (state[sentence][k] !== 'done') state[sentence][k] = 'ready';
  }
  return save(state);
}

/** Lessons waiting in an exercise. */
export function readyLessonKeys(state: ReadyState, exercise: ReadyExercise): string[] {
  return Object.entries(state[exercise] ?? {})
    .filter(([, s]) => s === 'ready')
    .map(([k]) => k);
}
