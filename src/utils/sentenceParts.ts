import { WordEntry } from '../types';

/**
 * Finding the word inside its own example sentence, so it can be shown in bold.
 *
 * The sentence carries the word as it is really used, which is rarely the
 * dictionary form: "Tisch" appears as "Tische", "besonder-" as "besondere",
 * and a separable verb splits in two — "Ich stehe um sechs auf." So the match
 * is by word stem, and a separable verb is looked for in both halves.
 */

export interface SentencePart {
  text: string;
  /** True for the piece that is the word being learned. */
  hit: boolean;
}

/** The prefixes that walk to the end of the sentence on their own. */
const SEPARABLE_PREFIXES = [
  'zurück', 'herunter', 'hinunter', 'zusammen', 'vorbei', 'weiter', 'zurecht',
  'heraus', 'herein', 'hinaus', 'hinein', 'entlang', 'gegenüber',
  'nach', 'vor', 'mit', 'aus', 'ein', 'auf', 'ab', 'an', 'zu', 'bei',
  'her', 'hin', 'los', 'weg', 'um', 'fest', 'frei', 'statt', 'teil',
];

/** "hin·fallen" → ["hin", "fallen"], and "ansehen" → ["an", "sehen"]. */
function separableHalves(display: string, lemma: string): string[] {
  if (display.includes('·')) return display.split('·').map((p) => p.trim()).filter(Boolean);
  const verb = lemma.toLowerCase();
  for (const prefix of SEPARABLE_PREFIXES) {
    if (verb.startsWith(prefix) && verb.length - prefix.length >= 3) {
      return [prefix, verb.slice(prefix.length)];
    }
  }
  return [];
}

/** Enough of the front of a word to survive its endings. */
function stemOf(word: string): string {
  let bare = word.replace(/^(der|die|das)\s+/i, '').replace(/-+$/, '').trim();
  // an infinitive's -en is an ending like any other: lernen → lern → lernt, lernst
  const withoutInfinitive = bare.replace(/e?n$/, '');
  if (withoutInfinitive.length >= 3) bare = withoutInfinitive;
  if (bare.length <= 4) return bare;
  // German endings sit at the back; four fifths of the word is a safe front.
  return bare.slice(0, Math.max(4, Math.ceil(bare.length * 0.8)));
}

/** The things worth highlighting for this word, longest first. */
function targets(word: WordEntry): string[] {
  const display = word.display ?? word.lemma;
  const halves = word.partOfSpeech === 'verb' ? separableHalves(display, word.lemma) : separableHalves(display, '');
  const base = [word.lemma, display.replace(/·/g, '')];
  const clean = (w: string) =>
    w
      .replace(/\([^)]*\)/g, ' ')   // "surfen (im Internet)" — the note is not the word
      .replace(/^(der|die|das)\s+/i, '')
      .replace(/[-.]+$/, '')
      .trim();
  // "spazieren gehen" and "leid tun" are two words; both are worth finding —
  // but the article in front of a noun is not part of the word.
  const phraseWords = [...halves, ...base]
    .map(clean)
    .flatMap((w) => (w.includes(' ') ? w.split(/\s+/) : []));
  const all = [...halves, ...base, ...phraseWords]
    .map(clean)
    .filter((w) => w.length >= 2);
  return [...new Set(all)].sort((a, b) => b.length - a.length);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** A plural often only adds an umlaut: Wort → Wörter, Buch → Bücher. */
function umlautTolerant(stem: string): string {
  return escape(stem)
    .replace(/[aä]/gi, '[aä]')
    .replace(/[oö]/gi, '[oö]')
    .replace(/[uü]/gi, '[uü]');
}

/** No "ge-" in the participle: besuchen → besucht, telefonieren → telefoniert. */
const NO_GE = /^(be|emp|ent|er|ge|miss|ver|zer|über|unter|wider|hinter)/;

/**
 * The verb as the book often prints it: the participle (heiraten → geheiratet,
 * einschlafen → eingeschlafen) and the zu-infinitive (aufhalten → aufzuhalten).
 */
function participles(word: WordEntry): string[] {
  if (word.partOfSpeech !== 'verb') return [];
  const lemma = word.lemma.toLowerCase().replace(/^sich\s+/, '').replace(/·/g, '');
  const halves = separableHalves(word.display ?? lemma, lemma);
  const [prefix, rest] = halves.length === 2 ? [halves[0].toLowerCase(), halves[1].toLowerCase()] : ['', lemma];
  const stem = rest.replace(/e?n$/, '');
  if (stem.length < 3 || /ieren$/.test(rest)) return [];
  const out = [];
  if (!NO_GE.test(rest)) out.push(`${escape(prefix)}ge${umlautTolerant(stem)}\\p{L}{0,3}`);
  if (prefix) out.push(`${escape(prefix)}zu${umlautTolerant(stem)}\\p{L}{0,3}`);
  return out;
}

/**
 * Splits a sentence into plain pieces and the piece(s) that are the word.
 * A sentence with no recognisable match comes back as one plain piece.
 */
export function highlightWord(sentence: string, word: WordEntry): SentencePart[] {
  if (!sentence) return [];
  // A noun hides at the back of a compound: Telefonnummer, Deutschlehrer.
  const compoundable = word.partOfSpeech === 'noun';
  const patterns = targets(word)
    .map((t) => {
      const stem = stemOf(t);
      if (stem.length < 3) return escape(t);
      const front = compoundable && stem.length >= 4 ? '\\p{L}*' : '';
      // a stem like "Lieblings-" carries a whole second word behind it;
      // a noun can lead a compound too: Einkauf → Einkaufsstraße
      const tail = word.isStem ? '{0,9}' : compoundable && stem.length >= 5 ? '*' : '{0,5}';
      // the stem, plus whatever ending it wears here
      return `${front}${umlautTolerant(stem)}\\p{L}${tail}`;
    })
    .filter(Boolean);
  patterns.push(...participles(word));
  if (!patterns.length) return [{ text: sentence, hit: false }];

  const re = new RegExp(`(?<!\\p{L})(${patterns.join('|')})(?!\\p{L})`, 'giu');
  const parts: SentencePart[] = [];
  let last = 0;
  for (const m of sentence.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > last) parts.push({ text: sentence.slice(last, start), hit: false });
    parts.push({ text: m[0], hit: true });
    last = start + m[0].length;
  }
  if (last < sentence.length) parts.push({ text: sentence.slice(last), hit: false });
  return parts.length ? parts : [{ text: sentence, hit: false }];
}

/** The label to print above a sentence for a stem word, e.g. "besonder-". */
export function stemLabel(word: WordEntry): string | null {
  return word.isStem ? (word.display ?? word.lemma) : null;
}
