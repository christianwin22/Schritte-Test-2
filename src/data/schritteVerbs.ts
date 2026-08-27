import { VerbConjugationTable, SentenceStemExercise } from '../types';

export interface VerbGrammarEntry {
  id: string;
  lemma: string;
  english: string;
  level: 'A1' | 'A2' | 'B1';
  type: 'regular' | 'vowel_change' | 'modal' | 'auxiliary' | 'separable';
  vowelChangeNote?: string;
  presentTable: VerbConjugationTable;
  pastParticiple?: string;
  auxiliary?: 'haben' | 'sein';
  preterite?: string;
  ruleExplanation: string;
}

export const SCHRITTE_VERBS: VerbGrammarEntry[] = [
  // --- 1. sein (to be) ---
  {
    id: 'verb_sein',
    lemma: 'sein',
    english: 'to be',
    level: 'A1',
    type: 'auxiliary',
    vowelChangeNote: 'Unregelmäßig (Irregular auxiliary)',
    presentTable: {
      ich: 'bin',
      du: 'bist',
      er_sie_es: 'ist',
      wir: 'sind',
      ihr: 'seid',
      sie_Sie: 'sind'
    },
    pastParticiple: 'gewesen',
    auxiliary: 'sein',
    preterite: 'war',
    ruleExplanation: 'The most irregular verb in German. Essential auxiliary for Perfekt motion/change-of-state verbs.'
  },
  // --- 2. haben (to have) ---
  {
    id: 'verb_haben',
    lemma: 'haben',
    english: 'to have',
    level: 'A1',
    type: 'auxiliary',
    vowelChangeNote: 'du hast, er/sie/es hat (-b drops)',
    presentTable: {
      ich: 'habe',
      du: 'hast',
      er_sie_es: 'hat',
      wir: 'haben',
      ihr: 'habt',
      sie_Sie: 'haben'
    },
    pastParticiple: 'gehabt',
    auxiliary: 'haben',
    preterite: 'hatte',
    ruleExplanation: 'Notice that "b" is dropped in 2nd and 3rd person singular (du hast, er hat).'
  },
  // --- 3. kommen (to come) ---
  {
    id: 'verb_kommen',
    lemma: 'kommen',
    english: 'to come / originate from',
    level: 'A1',
    type: 'regular',
    presentTable: {
      ich: 'komme',
      du: 'kommst',
      er_sie_es: 'kommt',
      wir: 'kommen',
      ihr: 'kommt',
      sie_Sie: 'kommen'
    },
    pastParticiple: 'gekommen',
    auxiliary: 'sein',
    preterite: 'kam',
    ruleExplanation: 'Standard regular verb endings: -e, -st, -t, -en, -t, -en.'
  },
  // --- 4. heißen (to be named) ---
  {
    id: 'verb_heissen',
    lemma: 'heißen',
    english: 'to be called / named',
    level: 'A1',
    type: 'regular',
    vowelChangeNote: 'Stem ends in ß: du takes only -t (du heißt)',
    presentTable: {
      ich: 'heiße',
      du: 'heißt',
      er_sie_es: 'heißt',
      wir: 'heißen',
      ihr: 'heißt',
      sie_Sie: 'heißen'
    },
    pastParticiple: 'geheißen',
    auxiliary: 'haben',
    preterite: 'hieß',
    ruleExplanation: 'Because the verb stem ends in "ß", the "du" form only adds "-t" instead of "-st".'
  },
  // --- 5. sprechen (to speak) ---
  {
    id: 'verb_sprechen',
    lemma: 'sprechen',
    english: 'to speak',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: e -> i (du sprichst, er spricht)',
    presentTable: {
      ich: 'spreche',
      du: 'sprichst',
      er_sie_es: 'spricht',
      wir: 'sprechen',
      ihr: 'sprecht',
      sie_Sie: 'sprechen'
    },
    pastParticiple: 'gesprochen',
    auxiliary: 'haben',
    preterite: 'sprach',
    ruleExplanation: 'Strong verb with vowel shift "e" -> "i" in 2nd and 3rd person singular.'
  },
  // --- 6. wohnen (to reside / live) ---
  {
    id: 'verb_wohnen',
    lemma: 'wohnen',
    english: 'to live / reside',
    level: 'A1',
    type: 'regular',
    presentTable: {
      ich: 'wohne',
      du: 'wohnst',
      er_sie_es: 'wohnt',
      wir: 'wohnen',
      ihr: 'wohnt',
      sie_Sie: 'wohnen'
    },
    pastParticiple: 'gewohnt',
    auxiliary: 'haben',
    preterite: 'wohnte',
    ruleExplanation: 'Regular weak verb: stem "wohn-" + standard personal endings.'
  },
  // --- 7. arbeiten (to work) ---
  {
    id: 'verb_arbeiten',
    lemma: 'arbeiten',
    english: 'to work',
    level: 'A1',
    type: 'regular',
    vowelChangeNote: 'Stem ends in -t: inserts -e- (du arbeitest, er arbeitet)',
    presentTable: {
      ich: 'arbeite',
      du: 'arbeitest',
      er_sie_es: 'arbeitet',
      wir: 'arbeiten',
      ihr: 'arbeitet',
      sie_Sie: 'arbeiten'
    },
    pastParticiple: 'gearbeitet',
    auxiliary: 'haben',
    preterite: 'arbeitete',
    ruleExplanation: 'When the verb stem ends in -d or -t, an extra "-e-" is inserted for phonetic ease before -st and -t.'
  },
  // --- 8. essen (to eat) ---
  {
    id: 'verb_essen',
    lemma: 'essen',
    english: 'to eat',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: e -> i (du isst, er/sie/es isst)',
    presentTable: {
      ich: 'esse',
      du: 'isst',
      er_sie_es: 'isst',
      wir: 'essen',
      ihr: 'esst',
      sie_Sie: 'essen'
    },
    pastParticiple: 'gegessen',
    auxiliary: 'haben',
    preterite: 'aß',
    ruleExplanation: 'Strong verb with vowel shift: "du isst" and "er/sie/es isst".'
  },
  // --- 9. trinken (to drink) ---
  {
    id: 'verb_trinken',
    lemma: 'trinken',
    english: 'to drink',
    level: 'A1',
    type: 'regular',
    presentTable: {
      ich: 'trinke',
      du: 'trinkst',
      er_sie_es: 'trinkt',
      wir: 'trinken',
      ihr: 'trinkt',
      sie_Sie: 'trinken'
    },
    pastParticiple: 'getrunken',
    auxiliary: 'haben',
    preterite: 'trank',
    ruleExplanation: 'Regular in the present tense (trink- stem), irregular Partizip II (getrunken).'
  },
  // --- 10. schlafen (to sleep) ---
  {
    id: 'verb_schlafen',
    lemma: 'schlafen',
    english: 'to sleep',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: a -> ä (du schläfst, er schläft)',
    presentTable: {
      ich: 'schlafe',
      du: 'schläfst',
      er_sie_es: 'schläft',
      wir: 'schlafen',
      ihr: 'schlaft',
      sie_Sie: 'schlafen'
    },
    pastParticiple: 'geschlafen',
    auxiliary: 'haben',
    preterite: 'schlief',
    ruleExplanation: 'Strong verb with Umlaut change "a" -> "ä" in 2nd and 3rd person singular.'
  },
  // --- 11. fahren (to drive / travel) ---
  {
    id: 'verb_fahren',
    lemma: 'fahren',
    english: 'to drive / ride / travel',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: a -> ä (du fährst, er fährt)',
    presentTable: {
      ich: 'fahre',
      du: 'fährst',
      er_sie_es: 'fährt',
      wir: 'fahren',
      ihr: 'fahrt',
      sie_Sie: 'fahren'
    },
    pastParticiple: 'gefahren',
    auxiliary: 'sein',
    preterite: 'fuhr',
    ruleExplanation: 'Vowel change "a" -> "ä" in du/er forms. Forms Perfekt with "sein".'
  },
  // --- 12. lesen (to read) ---
  {
    id: 'verb_lesen',
    lemma: 'lesen',
    english: 'to read',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: e -> ie (du liest, er liest)',
    presentTable: {
      ich: 'lese',
      du: 'liest',
      er_sie_es: 'liest',
      wir: 'lesen',
      ihr: 'lest',
      sie_Sie: 'lesen'
    },
    pastParticiple: 'gelesen',
    auxiliary: 'haben',
    preterite: 'las',
    ruleExplanation: 'Vowel change "e" -> "ie". Since stem ends in "s", du takes only "-t" (du liest).'
  },
  // --- 13. sehen (to see / watch) ---
  {
    id: 'verb_sehen',
    lemma: 'sehen',
    english: 'to see / look',
    level: 'A1',
    type: 'vowel_change',
    vowelChangeNote: 'Vokalwechsel: e -> ie (du siehst, er sieht)',
    presentTable: {
      ich: 'sehe',
      du: 'siehst',
      er_sie_es: 'sieht',
      wir: 'sehen',
      ihr: 'seht',
      sie_Sie: 'sehen'
    },
    pastParticiple: 'gesehen',
    auxiliary: 'haben',
    preterite: 'sah',
    ruleExplanation: 'Strong verb with vowel shift "e" -> "ie" in 2nd and 3rd person singular.'
  },
  // --- 14. können (can / to be able to) ---
  {
    id: 'verb_koennen',
    lemma: 'können',
    english: 'can / to be able to',
    level: 'A1',
    type: 'modal',
    vowelChangeNote: 'Modal: ich kann, du kannst, er/sie/es kann (no ending in 1st/3rd person)',
    presentTable: {
      ich: 'kann',
      du: 'kannst',
      er_sie_es: 'kann',
      wir: 'können',
      ihr: 'könnt',
      sie_Sie: 'können'
    },
    pastParticiple: 'gekonnt',
    auxiliary: 'haben',
    preterite: 'konnte',
    ruleExplanation: 'Modal verb rule: 1st (ich kann) and 3rd person (er kann) are identical and have no suffix.'
  },
  // --- 15. wollen (to want / intend to) ---
  {
    id: 'verb_wollen',
    lemma: 'wollen',
    english: 'to want / to intend',
    level: 'A1',
    type: 'modal',
    vowelChangeNote: 'Modal: ich will, du willst, er/sie/es will',
    presentTable: {
      ich: 'will',
      du: 'willst',
      er_sie_es: 'will',
      wir: 'wollen',
      ihr: 'wollt',
      sie_Sie: 'wollen'
    },
    pastParticiple: 'gewollt',
    auxiliary: 'haben',
    preterite: 'wollte',
    ruleExplanation: 'Singular stem changes to "will-". 1st and 3rd person singular have no ending.'
  },
  // --- 16. müssen (must / to have to) ---
  {
    id: 'verb_muessen',
    lemma: 'müssen',
    english: 'must / to have to (necessity)',
    level: 'A1',
    type: 'modal',
    vowelChangeNote: 'Modal: ich muss, du musst, er/sie/es muss',
    presentTable: {
      ich: 'muss',
      du: 'musst',
      er_sie_es: 'muss',
      wir: 'müssen',
      ihr: 'müsst',
      sie_Sie: 'müssen'
    },
    pastParticiple: 'gemusst',
    auxiliary: 'haben',
    preterite: 'musste',
    ruleExplanation: 'Loses Umlaut in singular: "ich muss, du musst, er muss". Plural keeps Umlaut.'
  },
  // --- 17. aufstehen (to get up) - Separable ---
  {
    id: 'verb_aufstehen',
    lemma: 'aufstehen',
    english: 'to get up / wake up',
    level: 'A1',
    type: 'separable',
    vowelChangeNote: 'Trennbar: Prefix "auf-" moves to sentence end in present tense',
    presentTable: {
      ich: 'stehe auf',
      du: 'stehst auf',
      er_sie_es: 'steht auf',
      wir: 'stehen auf',
      ihr: 'steht auf',
      sie_Sie: 'stehen auf'
    },
    pastParticiple: 'aufgestanden',
    auxiliary: 'sein',
    preterite: 'stand auf',
    ruleExplanation: 'Separable verb: in present main clause, conjugated verb is at Position 2 and "auf" goes to the very end.'
  },
  // --- 18. einkaufen (to shop / buy groceries) - Separable ---
  {
    id: 'verb_einkaufen',
    lemma: 'einkaufen',
    english: 'to go shopping',
    level: 'A1',
    type: 'separable',
    vowelChangeNote: 'Trennbar: Prefix "ein-" moves to sentence end',
    presentTable: {
      ich: 'kaufe ein',
      du: 'kaufst ein',
      er_sie_es: 'kauft ein',
      wir: 'kaufen ein',
      ihr: 'kauft ein',
      sie_Sie: 'kaufen ein'
    },
    pastParticiple: 'eingekauft',
    auxiliary: 'haben',
    preterite: 'kaufte ein',
    ruleExplanation: 'Prefix "ein-" goes to the end: "Lara kauft im Supermarkt ein."'
  },
];

// --- Mode 2: Sentence Cloze Exercises with Verb Stem / Lemma in Parentheses ---
export const SCHRITTE_SENTENCE_STEM_DRILLS: SentenceStemExercise[] = [
  // Lektion 1
  {
    id: 'st_1',
    verbLemma: 'heißen',
    verbStem: 'heißen',
    sentenceBefore: 'Wie',
    sentenceAfter: 'du?',
    expectedAnswer: 'heißt',
    fullEnglish: 'What is your name?',
    hint: 'du-Form von heißen (Stem ends in ß -> add -t)',
    personTarget: 'du',
    lektion: 1
  },
  {
    id: 'st_2',
    verbLemma: 'kommen',
    verbStem: 'kommen',
    sentenceBefore: 'Lara',
    sentenceAfter: 'aus Polen.',
    expectedAnswer: 'kommt',
    fullEnglish: 'Lara comes from Poland.',
    hint: '3. Person Singular (er/sie/es) -> -t',
    personTarget: 'er/sie/es',
    lektion: 1
  },
  {
    id: 'st_3',
    verbLemma: 'sprechen',
    verbStem: 'sprechen',
    sentenceBefore: 'Ich',
    sentenceAfter: 'ein bisschen Deutsch und Englisch.',
    expectedAnswer: 'spreche',
    fullEnglish: 'I speak a bit of German and English.',
    hint: 'ich-Form (no vowel change in 1st person)',
    personTarget: 'ich',
    lektion: 1
  },
  {
    id: 'st_4',
    verbLemma: 'sprechen',
    verbStem: 'sprechen',
    sentenceBefore: 'Was',
    sentenceAfter: 'du, Amir?',
    expectedAnswer: 'sprichst',
    fullEnglish: 'What languages do you speak, Amir?',
    hint: 'du-Form: Vokalwechsel e -> i',
    personTarget: 'du',
    lektion: 1
  },
  {
    id: 'st_5',
    verbLemma: 'sein',
    verbStem: 'sein',
    sentenceBefore: 'Das',
    sentenceAfter: 'Walter Baumann.',
    expectedAnswer: 'ist',
    fullEnglish: 'That is Walter Baumann.',
    hint: '3. Person Singular von sein',
    personTarget: 'er/sie/es',
    lektion: 1
  },
  // Lektion 2
  {
    id: 'st_6',
    verbLemma: 'leben',
    verbStem: 'leben',
    sentenceBefore: 'Laras Vater',
    sentenceAfter: 'in Poznań.',
    expectedAnswer: 'lebt',
    fullEnglish: "Lara's father lives in Poznan.",
    hint: 'er-Form von leben',
    personTarget: 'er/sie/es',
    lektion: 2
  },
  {
    id: 'st_7',
    verbLemma: 'haben',
    verbStem: 'haben',
    sentenceBefore: 'Wir',
    sentenceAfter: 'zwei Kinder: einen Sohn und eine Tochter.',
    expectedAnswer: 'haben',
    fullEnglish: 'We have two children: a son and a daughter.',
    hint: 'wir-Form von haben',
    personTarget: 'wir',
    lektion: 2
  },
  // Lektion 3
  {
    id: 'st_10',
    verbLemma: 'essen',
    verbStem: 'essen',
    sentenceBefore: 'Was',
    sentenceAfter: 'du gern zum Frühstück?',
    expectedAnswer: 'isst',
    fullEnglish: 'What do you like to eat for breakfast?',
    hint: 'du-Form von essen: Vokalwechsel e -> i (isst)',
    personTarget: 'du',
    lektion: 3
  },
  {
    id: 'st_11',
    verbLemma: 'essen',
    verbStem: 'essen',
    sentenceBefore: 'Carlos',
    sentenceAfter: 'am liebsten Bananenpfannkuchen.',
    expectedAnswer: 'isst',
    fullEnglish: 'Carlos loves eating banana pancakes most.',
    hint: 'er-Form von essen (isst)',
    personTarget: 'er/sie/es',
    lektion: 3
  },
  // Lektion 5
  {
    id: 'st_14',
    verbLemma: 'schlafen',
    verbStem: 'schlafen',
    sentenceBefore: 'Tim',
    sentenceAfter: 'am Sonntag immer sehr lange.',
    expectedAnswer: 'schläft',
    fullEnglish: 'Tim always sleeps very long on Sunday.',
    hint: 'er-Form von schlafen: Vokalwechsel a -> ä',
    personTarget: 'er/sie/es',
    lektion: 5
  },
  {
    id: 'st_15',
    verbLemma: 'aufstehen',
    verbStem: 'aufstehen',
    sentenceBefore: 'Lara',
    sentenceAfter: 'morgens um Viertel nach sieben',
    separableEnd: 'auf.',
    expectedAnswer: 'steht',
    fullEnglish: 'Lara gets up at quarter past seven in the morning.',
    hint: 'Trennbares Verb: Verb steht an Pos. 2 (auf... am Ende)',
    personTarget: 'er/sie/es',
    lektion: 5
  },
  {
    id: 'st_16',
    verbLemma: 'einkaufen',
    verbStem: 'einkaufen',
    sentenceBefore: 'Frau Bond',
    sentenceAfter: 'jeden Samstag im Supermarkt',
    separableEnd: 'ein.',
    expectedAnswer: 'kauft',
    fullEnglish: 'Ms. Bond shops in the supermarket every Saturday.',
    hint: 'Trennbares Verb: "kauft" an Pos. 2, "ein" am Ende',
    personTarget: 'er/sie/es',
    lektion: 5
  },
  // Lektion 7
  {
    id: 'st_22',
    verbLemma: 'können',
    verbStem: 'können',
    sentenceBefore: 'Walter',
    sentenceAfter: 'wirklich gut Gitarre spielen.',
    expectedAnswer: 'kann',
    fullEnglish: 'Walter can really play guitar well.',
    hint: 'Modalverb: er kann (no ending)',
    personTarget: 'er/sie/es',
    lektion: 7
  },
  {
    id: 'st_23',
    verbLemma: 'wollen',
    verbStem: 'wollen',
    sentenceBefore: 'Ich',
    sentenceAfter: 'das so gern wieder lernen!',
    expectedAnswer: 'will',
    fullEnglish: 'I want to learn that again so much!',
    hint: 'Modalverb: ich will',
    personTarget: 'ich',
    lektion: 7
  },
];
