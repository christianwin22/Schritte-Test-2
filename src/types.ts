export type Gender = 'der' | 'die' | 'das';
export type CEFRLevel = 'A1' | 'A2' | 'B1';
export type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'phrase';

export interface NounDetails {
  gender: Gender;
  /** Words written with two articles: "der / das Joghurt" → ['der','das']. Either is accepted. */
  genderAlternatives?: Gender[];
  plural: string;
  /** "die Ski / die Skier" → both forms; either is accepted. */
  pluralAlternatives?: string[];
  pluralEndingHint?: string;
  genderRuleHint?: string;
}

export interface VerbConjugationTable {
  ich: string;
  du: string;
  er_sie_es: string;
  wir: string;
  ihr: string;
  sie_Sie: string;
}

export interface VerbDetails {
  pastParticiple: string;
  auxiliary: 'haben' | 'sein';
  isSeparable: boolean;
  separablePrefix?: string;
  present3rd?: string; // e.g. "er/sie/es kommt an"
  preterite?: string;  // e.g. "kam an"
  conjugationNotes?: string;
  conjugationTable?: VerbConjugationTable;
  vowelChange?: string; // e.g. "e -> i", "a -> ä", "Modal"
}

export interface ClozeSentence {
  id: string;
  german: string; // e.g. "Ich fahre morgen mit dem {{blank}} nach Berlin."
  english: string;
  targetWord: string; // e.g. "Zug"
  alternateAcceptable?: string[];
  hint?: string;
}

export interface WordEntry {
  id: string;
  /** Exactly as written in the word list: "der / das Joghurt", "hin·fallen", "besonder-". */
  display?: string;
  /** Which book the word comes from: A1.1 … B1.2 */
  volume?: string;
  /** The word type as written in the list ("Adj/Adv", "Prefix", …) */
  wordType?: string;
  /** Headwords ending in "-": any ending counts as a correct answer. */
  isStem?: boolean;
  /** Accepted German answers (EN → DE), brackets and second articles included. */
  answers?: string[];
  /** English meanings: one entry per numbered sense, each with its comma variants. */
  senses?: string[][];
  /** The sentence shown under the card. */
  sentence?: string;
  /** Der/Die/Das drill: the sentence, and the same with {{blank}} in place of the article. */
  articleSentence?: string;
  articleSentenceBlank?: string;
  /** Accusative drill: the sentence, and the same with {{blank}} in place of den / die / das. */
  accusativeSentence?: string;
  accusativeSentenceBlank?: string;
  /** Plural drill: the sentence, and the same with {{blank}} in place of the plural. */
  pluralSentence?: string;
  pluralSentenceBlank?: string;
  lemma: string; // e.g. "Zug", "ankommen", "schön"
  translation: string; // English translation
  level: CEFRLevel;
  lektion?: number; // 1 to 14 (Schritte International Neu A1.1 & A1.2)
  category?: string;
  partOfSpeech: PartOfSpeech;
  nounDetails?: NounDetails;
  verbDetails?: VerbDetails;
  exampleSentences: ClozeSentence[];
  notes?: string;
  mnemonic?: string;
}

export interface SentenceStemExercise {
  id: string;
  verbLemma: string;
  verbStem: string; // e.g. "schlafen", "aufstehen"
  sentenceBefore: string;
  sentenceAfter: string;
  expectedAnswer: string;
  fullEnglish: string;
  separableEnd?: string; // e.g. "auf" if separable
  hint?: string;
  lektion?: number;
  personTarget?: 'ich' | 'du' | 'er/sie/es' | 'wir' | 'ihr' | 'sie/Sie';
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy';

export type FlashcardSubMode = 'learn' | 'practice' | 'review';

export interface FSRSCardRecord {
  wordId: string;
  status: 'unlearned' | 'learned' | 'practiced' | 'review';
  isUnlocked: boolean;
  stability: number; // default: 1.0
  difficulty: number; // default: 5.0
  intervalDays: number; // default: 1
  nextReviewDate: string; // ISO Date string / Timestamp
  lastReviewedAt?: string; // ISO Date string / Timestamp
  repetitionCount?: number;
}

export interface SRSHistoryEntry {
  timestamp: string;
  rating: SRSRating;
  mode: string;
  score: number; // 0 to 100
}

export interface SRSItemState {
  wordId: string;
  stability: number; // 0 to 100%
  intervalDays: number;
  repetitionCount: number;
  easeFactor: number; // typically 1.3 to 3.0
  lastReviewed: string | null;
  nextDue: string; // ISO string
  history: SRSHistoryEntry[];
}

export type ExerciseMode = 'gender' | 'conjugator' | 'cloze' | 'mixed';
export type GrammarMode = 'table_all_persons' | 'sentence_cloze_stem';

// 6 Core Skill Areas + Profile & Settings
export type DuolingoTab =
  | 'vocab'      // Icon 1: Lektion-by-Lektion Wortschatz (Schritte A1 Lektion 1-14)
  | 'grammar'    // Icon 2: Verb Conjugator (Full table ich->sie & Sentence with verbstamm)
  | 'listening'  // Icon 3: Hören (Audio dialogue listening)
  | 'speaking'   // Icon 4: Sprechen (Speech recognition & pronunciation)
  | 'reading'    // Icon 5: Lesen (Stories & Reading comprehension)
  | 'writing'    // Icon 6: Schreiben (Word order & sentence assembler)
  | 'profile'    // Icon 7: Profile (Duolingo stats, league, badges, streak)
  | 'settings';  // Icon 8: Settings (Full settings & audio configurations)


export type EvaluationType = 'exact' | 'partial_slip' | 'umlaut_warning' | 'typo_minor' | 'wrong';

export interface EvaluationResult {
  type: EvaluationType;
  score: number; // 0 to 100
  title: string;
  message: string;
  expected: string;
  userAnswer: string;
  slipType?: 'wrong_article' | 'missing_umlaut' | 'wrong_auxiliary' | 'minor_typo' | 'case_slip';
  suggestedRating: SRSRating;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

export interface UserDuolingoProfile {
  name: string;
  avatar: string;
  nativeLanguage: string;
  streak: number;
  gems: number;
  xp: number;
  hearts: number;
  maxHearts: number;
  league: 'Bronze' | 'Silver' | 'Gold' | 'Sapphire' | 'Ruby' | 'Emerald' | 'Amethyst' | 'Pearl' | 'Obsidian' | 'Diamond';
  achievements: Achievement[];
  completedLektionen: number[];
  conjugationsCompleted: number;
  wordsReviewedCount: number;
}
