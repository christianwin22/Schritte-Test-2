import { WordEntry } from '../types';

/**
 * One short sentence per noun for the Der/Die/Das and Plural drills.
 *
 * - `article`: the noun appears with its nominative article (der/die/das),
 *   and {{blank}} stands for that article — so the answer is never ambiguous.
 * - `plural`: {{blank}} stands for the plural noun alone (e.g. "Tische"),
 *   in a nominative or accusative plural, never the dative (which adds -n).
 *   Singular-only nouns have no plural sentence.
 *
 * Original sentences written for this app. Nouns without an entry fall back
 * to a plain generic sentence, so new words still work before they get one.
 */
export const NOUN_DRILL_SENTENCES: Record<string, { article: string; plural?: string }> = {
  l1_name: { article: 'Wie ist {{blank}} Name?', plural: 'Die {{blank}} stehen auf der Liste.' },
  l1_land: { article: '{{blank}} Land ist sehr groß.', plural: 'Wir besuchen drei {{blank}}.' },
  l1_stadt: { article: '{{blank}} Stadt hat einen Bahnhof.', plural: 'Berlin und Hamburg sind große {{blank}}.' },
  l1_sprache: { article: '{{blank}} Sprache ist nicht schwer.', plural: 'Ich spreche zwei {{blank}}.' },
  l1_vorname: { article: '{{blank}} Vorname ist kurz.', plural: 'Die Kinder haben schöne {{blank}}.' },
  l1_familienname: { article: 'Hier steht {{blank}} Familienname.', plural: 'Bitte schreiben Sie die {{blank}} hier.' },
  l2_vater: { article: '{{blank}} Vater kocht heute.', plural: 'Die {{blank}} spielen Fußball.' },
  l2_mutter: { article: '{{blank}} Mutter arbeitet im Büro.', plural: 'Die {{blank}} warten vor der Schule.' },
  l2_kind: { article: '{{blank}} Kind spielt im Garten.', plural: 'Wir haben zwei {{blank}}.' },
  l2_eltern: { article: '{{blank}} Eltern wohnen in Berlin.', plural: 'Meine {{blank}} wohnen in Hamburg.' },
  l2_bruder: { article: '{{blank}} Bruder ist zehn Jahre alt.', plural: 'Ich habe zwei {{blank}}.' },
  l2_schwester: { article: 'Heute kommt {{blank}} Schwester.', plural: 'Sie hat drei {{blank}}.' },
  l3_apfel: { article: '{{blank}} Apfel ist rot.', plural: 'Ich kaufe fünf {{blank}}.' },
  l3_banane: { article: '{{blank}} Banane ist gelb.', plural: 'Die {{blank}} sind sehr süß.' },
  l3_brot: { article: '{{blank}} Brot ist frisch.', plural: 'Wir brauchen zwei {{blank}}.' },
  l3_ei: { article: 'Wo ist {{blank}} Ei?', plural: 'Ich esse zwei {{blank}}.' },
  l3_kaese: { article: '{{blank}} Käse kommt aus der Schweiz.', plural: 'Im Supermarkt gibt es viele {{blank}}.' },
  l3_milch: { article: '{{blank}} Milch ist kalt.' },
  l4_wohnung: { article: '{{blank}} Wohnung hat drei Zimmer.', plural: 'Die {{blank}} hier sind teuer.' },
  l4_zimmer: { article: '{{blank}} Zimmer ist hell.', plural: 'Die Wohnung hat vier {{blank}}.' },
  l4_kueche: { article: 'Hier ist {{blank}} Küche.', plural: 'Die {{blank}} sind modern.' },
  l4_bad: { article: '{{blank}} Bad ist neben der Küche.', plural: 'Das Haus hat zwei {{blank}}.' },
  l4_tisch: { article: '{{blank}} Tisch ist aus Holz.', plural: 'Im Klassenzimmer stehen zehn {{blank}}.' },
  l4_stuhl: { article: '{{blank}} Stuhl ist bequem.', plural: 'Wir brauchen vier {{blank}}.' },
  l5_uhrzeit: { article: '{{blank}} Uhrzeit steht auf dem Handy.', plural: 'Die {{blank}} stehen im Plan.' },
  l5_fruehstueck: { article: '{{blank}} Frühstück ist fertig.', plural: 'Wir bestellen zwei {{blank}}.' },
  l6_wetter: { article: 'Heute ist {{blank}} Wetter schön.' },
  l6_ausflug: { article: '{{blank}} Ausflug beginnt um neun Uhr.', plural: 'Im Sommer machen wir viele {{blank}}.' },
  l8_arzt: { article: '{{blank}} Arzt hat heute keine Zeit.', plural: 'Im Krankenhaus arbeiten viele {{blank}}.' },
  l8_aerztin: { article: '{{blank}} Ärztin ist sehr nett.', plural: 'Die {{blank}} sind sehr freundlich.' },
  l9_bahnhof: { article: 'Wo ist {{blank}} Bahnhof?', plural: 'Berlin hat viele {{blank}}.' },
  l11_zug: { article: '{{blank}} Zug kommt pünktlich.', plural: 'Die {{blank}} sind heute voll.' },
  l13_kleid: { article: '{{blank}} Kleid ist blau.', plural: 'Sie kauft zwei {{blank}}.' },
  l14_geschenk: { article: '{{blank}} Geschenk ist für meine Mutter.', plural: 'Die Kinder bekommen viele {{blank}}.' },
  a2_berufserfahrung: {
    article: '{{blank}} Berufserfahrung ist wichtig.',
    plural: 'Er hat im Ausland viele {{blank}} gesammelt.',
  },
  b1_herausforderung: { article: '{{blank}} Herausforderung ist groß.', plural: 'Das Leben hat viele {{blank}}.' },
};

export const BLANK = '{{blank}}';

export function articleSentence(word: WordEntry): string {
  return NOUN_DRILL_SENTENCES[word.id]?.article ?? `${BLANK} ${word.lemma} ist hier.`;
}

export function pluralSentence(word: WordEntry): string {
  return NOUN_DRILL_SENTENCES[word.id]?.plural ?? `Hier sind zwei ${BLANK}.`;
}

/** The plural as it goes in the blank: "die Tische" → "Tische". */
export function barePlural(word: WordEntry): string {
  return (word.nounDetails?.plural ?? '').replace(/^(der|die|das)\s+/i, '').trim();
}

/** Fills the blank; a sentence-initial article is capitalised ("Der Tisch …"). */
export function fillBlank(sentence: string, answer: string): string {
  const [before, after = ''] = sentence.split(BLANK);
  const word = before === '' ? answer.charAt(0).toUpperCase() + answer.slice(1) : answer;
  return `${before}${word}${after}`;
}
