import { WordEntry } from '../types';

/**
 * What counts as a right answer.
 *
 * German (EN → DE) is strict, because that is the thing being learned: the
 * word must be spelled as the book spells it, and a noun must bring its
 * article. Only three things are forgiven — capitals, the bracketed parts of
 * a word like "das Kilo(gramm)", and, for a stem like "besonder-", whichever
 * ending you put on it.
 *
 * English (DE → EN) is loose, because it is only there to show you knew which
 * word it was: any one of the comma-separated meanings will do, a leading
 * "to", "a" or "the" is optional, and notes in brackets are ignored.
 *
 * A word with two numbered meanings is asked for both, in either order.
 */

const PUNCTUATION = /[.,/#!$%^&*;:{}=_`~"'?]/g;

function squash(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ German */

function normalizeGerman(text: string): string {
  return squash(text.toLowerCase().replace(/[.!?,;:]+$/g, '').replace(/·/g, ''));
}

/** "besonder-" also answers to besondere, besonderen, Lieblingsfarbe, … */
function matchesStem(user: string, stem: string): boolean {
  const base = normalizeGerman(stem).replace(/-+$/, '');
  if (!base) return false;
  return user === base || (user.startsWith(base) && user.length - base.length <= 12);
}

/** Same word apart from the umlauts — worth saying out loud in the feedback. */
function withoutUmlauts(text: string): string {
  return text.replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
}

function oneLetterOff(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return false;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let slips = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++;
      j++;
    } else {
      if (++slips > 1) return false;
      if (short.length === long.length) i++;
      j++;
    }
  }
  return true;
}

export type GermanMiss = 'article' | 'umlaut' | 'typo' | null;

export interface GermanResult {
  isCorrect: boolean;
  /** Why it was close, when it was close. */
  miss: GermanMiss;
  /** The answer to show, e.g. "die Frau". */
  expected: string;
}

/** Everything that counts as the German answer for this word. */
export function germanAnswers(word: WordEntry): string[] {
  const listed = word.answers?.length ? word.answers : [word.lemma];
  return listed.filter(Boolean);
}

export function checkGerman(input: string, word: WordEntry): GermanResult {
  const user = normalizeGerman(input);
  const accepted = germanAnswers(word);
  const expected = accepted[0] ?? word.lemma;
  if (!user) return { isCorrect: false, miss: null, expected };

  const normalized = accepted.map(normalizeGerman);
  if (normalized.includes(user)) return { isCorrect: true, miss: null, expected };

  if (word.isStem && accepted.some((a) => matchesStem(user, a))) {
    return { isCorrect: true, miss: null, expected };
  }

  // Wrong, but say what went wrong when it was nearly right.
  const bare = user.replace(/^(der|die|das)\s+/, '');
  const missingArticle = normalized.some((a) => a.replace(/^(der|die|das)\s+/, '') === bare);
  if (missingArticle) return { isCorrect: false, miss: 'article', expected };

  if (normalized.some((a) => withoutUmlauts(a) === withoutUmlauts(user))) {
    return { isCorrect: false, miss: 'umlaut', expected };
  }
  if (normalized.some((a) => oneLetterOff(a, user))) {
    return { isCorrect: false, miss: 'typo', expected };
  }
  return { isCorrect: false, miss: null, expected };
}

/* ----------------------------------------------------------------- English */

function normalizeEnglish(text: string): string {
  let t = text.toLowerCase();
  t = t.replace(/\([^)]*\)/g, ' ');       // "Mrs (title)" → "mrs"
  t = t.replace(PUNCTUATION, ' ');
  t = squash(t);
  t = t.replace(/^(to|a|an|the)\s+/, '');  // "to hear" → "hear"
  return squash(t);
}

/** The meanings of a word, one list per numbered sense. */
export function englishSenses(word: WordEntry): string[][] {
  if (word.senses?.length) return word.senses;
  return [[word.translation]];
}

/** Every spelling that answers one sense: "to lie, to be lying" → both. */
function optionsFor(sense: string[]): string[] {
  return sense
    // the brackets go first: "cream (AT/CH)" is one meaning, not two
    .map((part) => part.replace(/\([^)]*\)/g, ' '))
    .flatMap((part) => part.split(/[,;/]/))
    .map(normalizeEnglish)
    .filter(Boolean);
}

/** Does this answer any one of the word's meanings? */
export function checkEnglish(input: string, word: WordEntry): boolean {
  const user = normalizeEnglish(input);
  if (!user) return false;
  return englishSenses(word).some((sense) => optionsFor(sense).includes(user));
}

/**
 * Two boxes for a word with two meanings: both must be right, and it does not
 * matter which box you put which in. The same meaning twice is not both.
 */
export function checkEnglishPair(inputs: string[], word: WordEntry): boolean[] {
  const senses = englishSenses(word).map(optionsFor);
  const claimed = new Set<number>();
  return inputs.map((raw) => {
    const user = normalizeEnglish(raw);
    if (!user) return false;
    const index = senses.findIndex((options, i) => !claimed.has(i) && options.includes(user));
    if (index === -1) return false;
    claimed.add(index);
    return true;
  });
}

/** "1. woman<br>2. Mrs (title)" → ["woman", "Mrs (title)"], for showing. */
export function meaningLines(word: WordEntry): string[] {
  const senses = englishSenses(word);
  if (senses.length > 1) return senses.map((s) => s.join(', '));
  return [word.translation.replace(/<br\s*\/?>/g, ' · ')];
}
