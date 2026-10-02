import { WordEntry } from '../types';
import { checkEnglish, checkGerman, englishOptions, englishSenses, meaningLines, normalizeEnglish } from './answerCheck';

/**
 * Words · one card per thing to learn.
 *
 * A noun with a real plural is two cards: "der Student" and "die Studenten".
 * Each has its own place in Review. The singular card keeps the word's own id,
 * so everything learned before plural cards existed stays where it was; the
 * plural card is "wpl:<id>".
 *
 * Speaking keeps its own schedule — saying a word is a different skill from
 * typing it — so its cards carry a "speak:" prefix.
 */
export interface WordCard {
  word: WordEntry;
  plural: boolean;
  /** Its key in the review records. */
  key: string;
}

export function cardKey(wordId: string, plural: boolean, prefix = ''): string {
  return `${prefix}${plural ? 'wpl:' : ''}${wordId}`;
}

/** "die Studenten", or null for a noun with no plural of its own (Sg., die Jeans, die SMS). */
export function pluralOf(word: WordEntry): string | null {
  if (word.nounDetails?.pluralOnly) return null;
  const raw = word.nounDetails?.gender ? word.nounDetails.plural?.trim() : '';
  if (!raw || /\(Sg\.?\)|^die\s*-?$/i.test(raw)) return null;
  const plural = raw.toLowerCase().startsWith('die ') ? raw : `die ${raw}`;
  // Same as the singular (die Jeans → die Jeans): nothing new to learn
  if (plural.toLowerCase() === `${word.nounDetails!.gender} ${word.lemma}`.toLowerCase()) return null;
  return plural;
}

/** Every accepted plural answer: "die Studenten", and a second form where the list gives one. */
export function pluralAnswers(word: WordEntry): string[] {
  const listed = word.nounDetails?.pluralAlternatives?.filter(Boolean) ?? [];
  const main = pluralOf(word);
  const all = [...(main ? [main] : []), ...listed.map((p) => (p.toLowerCase().startsWith('die ') ? p : `die ${p}`))];
  return [...new Set(all)];
}

export function cardsFor(words: WordEntry[], prefix = ''): WordCard[] {
  const out: WordCard[] = [];
  for (const word of words) {
    out.push({ word, plural: false, key: cardKey(word.id, false, prefix) });
    if (pluralOf(word)) out.push({ word, plural: true, key: cardKey(word.id, true, prefix) });
  }
  return out;
}

/**
 * The book's little tag after a noun: "Sg." when it has no plural
 * (die Wirtschaft), "Pl." when it only has one (die Kenntnisse).
 */
export function numberTag(card: WordCard): 'Sg.' | 'Pl.' | null {
  const details = card.word.nounDetails;
  if (!details?.gender) return null;
  if (details.pluralOnly) return 'Pl.';
  const raw = (details.plural ?? '').trim();
  return !raw || raw === '-' || /\(Sg\.?\)/i.test(raw) ? 'Sg.' : null;
}

/** Is this card asking for the plural? A plural card, or a noun that only has a plural. */
export function asksPlural(card: WordCard): boolean {
  return card.plural || !!card.word.nounDetails?.pluralOnly;
}

/** The German side: "der Student" / "die Studenten" / "gehen". */
export function germanOf(card: WordCard): string {
  const { word } = card;
  if (card.plural) return pluralOf(word) ?? word.lemma;
  return word.nounDetails?.gender ? `${word.nounDetails.gender} ${word.lemma}` : word.lemma;
}

/**
 * The German side as the book writes it, for showing: "die Uni(versität)",
 * "(an)bieten", "die (Arbeits-)Stelle". germanOf stays the plain form, for
 * audio and checking.
 */
export function germanShown(card: WordCard): string {
  const { word } = card;
  if (card.plural) return germanOf(card);
  const written = (word.display || word.lemma)
    .replace(/·/g, '')
    .replace(/\s+\([^)]*\)/g, '') // notes after a space: "(Pl.)", "(die Uni)"
    .trim();
  if (!word.nounDetails?.gender) return written || word.lemma;
  const noun = written.replace(/^(?:(?:der|die|das)\s*\/\s*)*(?:der|die|das)\s+/i, '').trim();
  return `${word.nounDetails.gender} ${noun || word.lemma}`;
}

/** The example for this card: the plural card uses the plural sentence. */
export function exampleOf(card: WordCard): { german: string; english: string } | null {
  const { word } = card;
  if (card.plural) {
    if (word.pluralSentence) return { german: word.pluralSentence, english: word.pluralSentenceEnglish ?? '' };
    return null;
  }
  const ex = word.exampleSentences?.[0];
  if (!ex?.german) return null;
  return { german: ex.german.replace(/\{\{blank\}\}/g, word.lemma), english: ex.english || '' };
}

// --- The two little switches beside the DE → EN answer box ------------------

export type GenderChoice = 'M' | 'F';
export type NumberChoice = 'S' | 'P';

/** A person word with a female and a male form ("journalist (f.)"), so M / F says which. */
export function genderMark(word: WordEntry, all: WordEntry[]): GenderChoice | null {
  const text = englishSenses(word).flat().join(' ');
  if (/\((f\.?|female)\)/i.test(text)) return 'F';
  if (/\((m\.?|male)\)/i.test(text)) return 'M';
  if (!word.nounDetails?.gender) return null;
  // The male form often carries no mark; it has one when its female twin does.
  const bare = englishSenses(word)
    .flat()
    .flatMap((s) => s.split(/[,;/]/))
    .map((s) => s.replace(/\([^)]*\)/g, '').trim().toLowerCase());
  const twin = femaleMeanings(all);
  return bare.some((s) => twin.has(s)) ? 'M' : null;
}

let femaleCache: { list: WordEntry[]; set: Set<string> } | null = null;
function femaleMeanings(all: WordEntry[]): Set<string> {
  if (femaleCache?.list === all) return femaleCache.set;
  const set = new Set<string>();
  for (const w of all) {
    for (const s of englishSenses(w).flat()) {
      const m = s.match(/^(.*?)\s*\((f\.?|female)\)\s*$/i);
      if (m) set.add(m[1].trim().toLowerCase());
    }
  }
  femaleCache = { list: all, set };
  return set;
}

/** Nouns ask singular or plural; everything else has no S / P switch. */
export function hasNumberSwitch(card: WordCard): boolean {
  return !!card.word.nounDetails?.gender;
}

// --- English plurals ---------------------------------------------------------
//
// A plural card wants the English plural: die Kellner → "waiters", not "waiter".

const IRREGULAR: Record<string, string> = {
  man: 'men', woman: 'women', child: 'children', person: 'people', foot: 'feet', tooth: 'teeth',
  mouse: 'mice', wife: 'wives', knife: 'knives', life: 'lives', leaf: 'leaves', half: 'halves',
  shelf: 'shelves', thief: 'thieves', goose: 'geese',
};
// The same in the plural: the information → the information.
const SAME = new Set([
  'information', 'furniture', 'equipment', 'money', 'news', 'luggage', 'baggage', 'advice', 'homework',
  'sheep', 'fish', 'staff', 'police', 'people', 'data', 'media', 'series', 'species', 'knowledge',
  'software', 'hardware', 'traffic', 'weather', 'research', 'stuff', 'fruit', 'feedback', 'aircraft',
]);

/** Every way to write the plural of one English word: "boss" → bosses; "photo" → photos, photoes. */
function pluralWords(word: string): string[] {
  const w = word.toLowerCase();
  if (!w || SAME.has(w)) return [w];
  if (IRREGULAR[w]) return [IRREGULAR[w]];
  if (/(man)$/.test(w) && !/(human|german|roman)$/.test(w)) return [w.replace(/man$/, 'men')];
  if (/ing$/.test(w)) return [w, `${w}s`]; // shopping, cleaning — usually the same
  if (/(ss|sh|ch|x|z)$/.test(w)) return [`${w}es`];
  if (/s$/.test(w)) return [w, `${w}es`]; // studies, glasses — already plural, or bus → buses
  if (/[^aeiou]y$/.test(w)) return [w.replace(/y$/, 'ies')];
  if (/[^aeiou]o$/.test(w)) return [`${w}s`, `${w}es`];
  if (/(?:[^f]fe|[lr]f)$/.test(w)) return [`${w}s`, w.replace(/fe?$/, 'ves')];
  return [`${w}s`];
}

/** "police officer" → ["police officers"]: the last word takes the plural — or the one before "of" ("forms of address"). */
function pluralPhrases(phrase: string): string[] {
  const at = phrase.indexOf(' of ');
  const head = at > 0 ? phrase.slice(0, at) : phrase;
  const tail = at > 0 ? phrase.slice(at) : '';
  const words = head.split(' ');
  const last = words.pop() ?? '';
  return pluralWords(last).map((p) => [...words, p].join(' ').trim() + tail);
}

/** Split on commas, but not on the ones inside brackets: "number (0, 1, 2 …), figure". */
function splitOutsideBrackets(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else current += ch;
  }
  out.push(current);
  return out;
}

/** For showing: "caretaker, janitor" → "caretakers, janitors"; notes in brackets stay. */
export function pluralEnglish(text: string): string {
  return splitOutsideBrackets(text)
    .map((part) => {
      const note = part.match(/\s*\([^)]*\)\s*$/)?.[0] ?? '';
      const head = part.slice(0, part.length - note.length);
      const lead = head.match(/^\s*(?:\([^)]*\)\s*)?/)?.[0] ?? '';
      const body = head.slice(lead.length).trim();
      if (!body) return part;
      const at = body.indexOf(' of ');
      const front = at > 0 ? body.slice(0, at) : body;
      const tail = at > 0 ? body.slice(at) : '';
      const words = front.split(' ');
      const last = words.pop() ?? '';
      // already plural ("studies", "glasses"): leave it
      const plural = /[^s]s$|ies$/i.test(last) ? last : pluralWords(last)[0];
      return `${lead}${[...words, plural].join(' ')}${tail}${note}`;
    })
    .join(',');
}

/** What the card shows as its meaning: the plural card says it in the plural. */
export function cardMeaningLines(card: WordCard): string[] {
  const lines = meaningLines(card.word);
  return card.plural ? lines.map(pluralEnglish) : lines;
}

/** Which listed meaning a typed plural belongs to ("waiters" → "waiter"), or null. */
function listedForPlural(input: string, card: WordCard): string | null {
  const user = normalizeEnglish(input);
  if (!user) return null;
  for (const sense of englishOptions(card.word)) {
    for (const option of sense) {
      if (pluralPhrases(option).includes(user)) return option;
    }
  }
  return null;
}

// --- Checking ----------------------------------------------------------------

/** EN → DE: the plural card wants the plural ("die Studenten"), article and all. */
export function checkCardGerman(input: string, card: WordCard) {
  if (!card.plural) return checkGerman(input, card.word);
  return checkGerman(input, { ...card.word, answers: pluralAnswers(card.word), isStem: false });
}

/** DE → EN: the meaning. A plural card wants it in the plural: "students", not "student". */
export function checkCardEnglish(input: string, card: WordCard): boolean {
  if (!card.plural) return checkEnglish(input, card.word);
  return listedForPlural(input, card) !== null;
}

/** The typed meaning as the word list writes it ("areas" → "area" on a plural card), for the two-box check. */
export function asListedEnglish(input: string, card: WordCard): string {
  if (!card.plural) return input;
  // A singular typed on a plural card matches nothing, so it is marked wrong.
  return listedForPlural(input, card) ?? '\u0000';
}
