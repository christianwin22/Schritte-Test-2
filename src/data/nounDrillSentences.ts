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

export function articleSentence(word: WordEntry): string {
  return word.articleSentenceBlank ?? `${BLANK} ${word.lemma} ist hier.`;
}

export function pluralSentence(word: WordEntry): string {
  return word.pluralSentenceBlank ?? `Hier sind zwei ${BLANK}.`;
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
