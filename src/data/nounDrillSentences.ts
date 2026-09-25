import { WordEntry } from '../types';

/**
 * Sentences for the Der/Die/Das and Plural drills.
 *
 * They come from the word list's own "Singular example" and "Plural example"
 * columns, where the noun always appears in its dictionary form (der/die/das,
 * and die + plural). The importer marks the blank, so "Der Tisch ist aus Holz."
 * arrives as "{{blank}} Tisch ist aus Holz."
 *
 * A noun with no usable sentence falls back to a plain one, so nothing breaks.
 */

export const BLANK = '{{blank}}';

/**
 * The word list's own example sentences are nearly all one frame: 1,456 of the
 * 1,458 singular ones read "… ist wichtig", and the plurals "… sind wichtig".
 * Drilling a thousand nouns through one sentence teaches the sentence, not the
 * nouns, so a set of frames is used instead.
 *
 * Every frame is nominative. An accusative one ("Ich sehe den Tisch") would
 * change the very article being asked for, which would make the drill wrong.
 */
const ARTICLE_FRAMES = [
  `${BLANK} {noun} ist wichtig.`,
  `${BLANK} {noun} ist neu.`,
  `${BLANK} {noun} ist hier.`,
  `${BLANK} {noun} ist schön.`,
  `${BLANK} {noun} ist gut.`,
  `${BLANK} {noun} gefällt mir.`,
  `Wo ist ${BLANK} {noun}?`,
  `Das ist ${BLANK} {noun}.`,
  `Hier ist ${BLANK} {noun}.`,
];

const PLURAL_FRAMES = [
  `Die ${BLANK} sind wichtig.`,
  `Die ${BLANK} sind neu.`,
  `Die ${BLANK} sind schön.`,
  `Die ${BLANK} gefallen mir.`,
  `Hier sind die ${BLANK}.`,
  `Wo sind die ${BLANK}?`,
  `Das sind die ${BLANK}.`,
  `Die ${BLANK} sind gut.`,
];

/** Same word, same frame, every time — so a card does not change under you. */
function frameFor(frames: string[], id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return frames[hash % frames.length];
}

/** True for the one frame the word list used almost everywhere. */
const isTheStockSentence = (sentence: string) => /\b(ist|sind) wichtig\.?$/.test(sentence.trim());

export function articleSentence(word: WordEntry): string {
  const given = word.articleSentenceBlank;
  if (given && !isTheStockSentence(given)) return given;
  // Never a frame whose own words include the article being asked for:
  // "Das ist ___ Ei." would print the answer as its first word.
  const gender = (word.nounDetails?.gender ?? '').toLowerCase();
  const clash = new RegExp(`(?<!\\p{L})${gender}(?!\\p{L})`, 'iu');
  const usable = gender
    ? ARTICLE_FRAMES.filter((f) => !clash.test(f.replace(BLANK, '')))
    : ARTICLE_FRAMES;
  return frameFor(usable.length ? usable : ARTICLE_FRAMES, word.id).replace('{noun}', word.lemma);
}

export function pluralSentence(word: WordEntry): string {
  const given = word.pluralSentenceBlank;
  if (given && !isTheStockSentence(given)) return given;
  return frameFor(PLURAL_FRAMES, word.id);
}

/** The plural as it goes in the blank: "die Tische" → "Tische". */
export function barePlural(word: WordEntry): string {
  const plural = word.nounDetails?.pluralAlternatives?.[0] ?? word.nounDetails?.plural ?? '';
  return plural.replace(/^(der|die|das)\s+/i, '').trim();
}

/** Every plural spelling that counts, e.g. "die Ski / die Skier" → ["Ski", "Skier"]. */
export function acceptedPlurals(word: WordEntry): string[] {
  const list = word.nounDetails?.pluralAlternatives?.length
    ? word.nounDetails.pluralAlternatives
    : [word.nounDetails?.plural ?? ''];
  return list
    .flatMap((p) => {
      const full = p.trim();
      const bare = full.replace(/^(der|die|das)\s+/i, '').trim();
      return [full, bare];
    })
    .filter(Boolean);
}

/** Fills the blank; a sentence-initial article is capitalised ("Der Tisch …"). */
export function fillBlank(sentence: string, answer: string): string {
  const [before, after = ''] = sentence.split(BLANK);
  const word = before === '' ? answer.charAt(0).toUpperCase() + answer.slice(1) : answer;
  return `${before}${word}${after}`;
}
