import { WordEntry } from '../types';
import { SCHRITTE_SENTENCE_STEM_DRILLS } from '../data/schritteVerbs';

/**
 * Lessons waiting in the verb exercises, the way the noun drills already work:
 *
 *   finish a lesson's Words Practice  → that lesson is "ready" (amber) in
 *                                        Present, Simple Past, Present Perfect
 *                                        and Sentence, where they have it
 *   finish it there                   → "done", and the notice goes
 *
 * Kept apart from the noun drills' state (srsEngine), in a synced "schritte_" key.
 */

const KEY = 'schritte_exercise_ready_v1';

export type ReadyExercise = 'conj' | 'past' | 'perfect' | 'sentence';
export type ReadyState = Record<ReadyExercise, Record<string, 'ready' | 'done'>>;

export const readyKey = (level: string, lektion: number) => `${level}-${lektion}`;

export function loadExerciseReady(): ReadyState {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { conj: parsed.conj ?? {}, past: parsed.past ?? {}, perfect: parsed.perfect ?? {}, sentence: parsed.sentence ?? {} };
  } catch {
    return { conj: {}, past: {}, perfect: {}, sentence: {} };
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
export function exerciseHasLesson(exercise: ReadyExercise, level: string, lektion: number, lessonWords: WordEntry[]): boolean {
  if (exercise === 'conj') return lessonWords.some((w) => w.presentTense?.length === 6);
  if (exercise === 'past') return lessonWords.some((w) => w.simplePast?.length === 6);
  if (exercise === 'perfect') return lessonWords.some((w) => w.presentPerfect?.length === 6);
  return level === 'A1' && SCHRITTE_SENTENCE_STEM_DRILLS.some((s) => s.lektion === lektion);
}

/** After a lesson's Words Practice: ready wherever that lesson has something — unless already done. */
export function markReadyAfterWords(level: string, lektion: number, lessonWords: WordEntry[]): ReadyState {
  const state = loadExerciseReady();
  const key = readyKey(level, lektion);
  for (const ex of ['conj', 'past', 'perfect', 'sentence'] as ReadyExercise[]) {
    if (state[ex][key] === 'done') continue;
    if (exerciseHasLesson(ex, level, lektion, lessonWords)) state[ex] = { ...state[ex], [key]: 'ready' };
  }
  return save(state);
}

/** Finished in that exercise: those lessons are done there. */
export function markExerciseDone(exercise: ReadyExercise, keys: string[]): ReadyState {
  const state = loadExerciseReady();
  state[exercise] = { ...state[exercise] };
  for (const k of keys) state[exercise][k] = 'done';
  return save(state);
}

/** Lessons waiting in an exercise. */
export function readyLessonKeys(state: ReadyState, exercise: ReadyExercise): string[] {
  return Object.entries(state[exercise])
    .filter(([, s]) => s === 'ready')
    .map(([k]) => k);
}
