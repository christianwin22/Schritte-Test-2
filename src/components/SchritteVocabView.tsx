import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Volume2,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Sparkles,
  Zap,
  Layers,
  Check,
  X,
  Mic,
  MicOff,
  Keyboard,
  RotateCcw,
  ArrowRightLeft,
} from 'lucide-react';
import { LeaveSessionModal } from './LeaveSessionModal';
import { BOOK_LESSON_TITLES } from '../data/bookLessonTitles';
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import {
  BLANK,
  accusativeArticle,
  accusativeSentence,
  articleSentence,
  weakAnswer,
  weakForm,
  weakSentence,
  barePlural,
  fillBlank,
  pluralSentence,
} from '../data/nounDrillSentences';
import { NounChangeLearn } from './NounChangeLearn';
import { LessonFilter } from './LessonFilter';
import { markReadyAfterWords } from '../utils/exerciseReady';
import { CEFRLevel, Gender, WordEntry, FlashcardSubMode, FSRSCardRecord } from '../types';
import { checkEnglish, checkEnglishPair, checkGerman, englishSenses, meaningLines } from '../utils/answerCheck';
import { highlightWord, stemLabel } from '../utils/sentenceParts';
import { genderButton, genderText, accusativeGender } from '../utils/genderColors';
import {
  WordCard,
  cardsFor,
  germanOf,
  exampleOf,
  pluralOf,
  genderMark,
  hasNumberSwitch,
  checkCardGerman,
  checkCardEnglish,
  asListedEnglish,
  GenderChoice,
  NumberChoice,
  numberTag,
  asksPlural,
  cardMeaningLines,
  germanShown,
} from '../utils/wordCards';
import {
  PracticeDone,
  dirOf,
  firstPracticeDone,
  loadPracticeDone,
  savePracticeDone,
  loadLearnPlace,
  saveLearnPlace,
} from '../utils/practiceProgress';
import { speakGerman, speakGermanSequence, listenToGermanSpeech, isSpeechRecognitionSupported } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';
import {
  loadAllFSRSRecords,
  saveAllFSRSRecords,
  processFSRSReview,
  isCardDueForReview,
  unlockWordsAfterPractice,
  unlockDrillsAfterPractice,
  drillCardId,
  drillReviewPool,
  reviewCard,
  isDrillable,
  DrillSkill,
  loadDrillPracticeState,
  saveDrillPracticeState,
  markLessonReadyForDrills,
  markLessonsDoneForDrill,
  readyLessons,
  DrillPracticeState,
  loadSpecialLearned,
  markSpecialLearned,
} from '../utils/srsEngine';

export interface FlashcardHotkeys {
  next: string;
  prev: string;
  flip: string;
  singularAudio: string;
  pluralAudio: string;
  exampleAudio: string;
  practiceCheck: string;
  practiceAudio: string;
}

const DEFAULT_HOTKEYS: FlashcardHotkeys = {
  next: 'ArrowRight',
  prev: 'ArrowLeft',
  flip: ' ',
  singularAudio: 'ArrowDown',
  pluralAudio: 'ArrowUp',
  exampleAudio: 'Meta',
  practiceCheck: 'Enter',
  practiceAudio: ' ',
};

type Direction = 'DE_TO_EN' | 'EN_TO_DE';

/** A lesson's progress. The four direction stops are new; the two old flags are kept in step. */
interface LessonProgress {
  learnCompleted: boolean;
  practiceCompleted: boolean;
  learnDe?: boolean;
  learnEn?: boolean;
  practiceDe?: boolean;
  practiceEn?: boolean;
}

/** The sentence with the word in bold, and a stem like "besonder-" named above it. */
const SentenceWithWord: React.FC<{ sentence: string; word: WordEntry; className?: string }> = ({
  sentence,
  word,
  className = '',
}) => {
  const label = stemLabel(word);
  return (
    <span className={className}>
      {label && (
        <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-0.5">{label}</span>
      )}
      {highlightWord(sentence, word).map((part, i) =>
        part.hit ? (
          <strong key={i} className="font-black">
            {part.text}
          </strong>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </span>
  );
};

/**
 * What a lesson is called: its title as the book prints it ("Beruf und
 * Arbeit"). Words from several lessons fall back to the word list's group
 * headings, most-used first — without the "— picture labels (LWS 4)" tails,
 * which are the book's own cross-references and mean nothing here.
 */
export const lessonTopics = (words: WordEntry[], limit = 2): string => {
  const lessons = new Set(words.map((w) => `${w.level}_${w.lektion}`));
  const [only] = lessons;
  if (lessons.size === 1 && BOOK_LESSON_TITLES[only]) return BOOK_LESSON_TITLES[only];
  const counts = new Map<string, number>();
  for (const word of words) {
    const group = word.category?.split('—')[0].trim();
    if (group) counts.set(group, (counts.get(group) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([group]) => group)
    .join(' · ');
};

/** A fresh order every time a session begins. */
const shuffled = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const getExampleSentence = (word: WordEntry): { german: string; english: string } => {
  if (word.exampleSentences && word.exampleSentences.length > 0) {
    const ex = word.exampleSentences[0];
    const g = ex.german.replace(/\{\{blank\}\}/g, word.lemma);
    const e = ex.english || (ex as any).translation || '';
    return { german: g, english: e };
  }

  return {
    german: `Ich lerne das Wort "${word.lemma}".`,
    english: `I am learning the word "${word.translation}".`,
  };
};

interface SchritteVocabViewProps {
  onCorrectAnswer: (xpEarned?: number, gemsEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  onQuizActiveChange?: (isActive: boolean, progressIsSaved?: boolean) => void;
  /**
   * The top bar's back arrow asks here first. Inside a running Practice or
   * Review it goes back to that exercise's Start screen and returns true;
   * anywhere else it returns false and the top bar does its usual thing.
   */
  backHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
  appLanguage?: AppLanguage;
  /**
   * Speaking: the same Words Practice and Review, answered out loud only — no
   * typing, no Learn. It keeps its own schedule and progress ("speak:" cards).
   */
  speakOnly?: boolean;
}

export const SchritteVocabView: React.FC<SchritteVocabViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  activeExerciseMode,
  onSelectExerciseMode,
  onRequestAbandon,
  onQuizActiveChange,
  backHandlerRef,
  appLanguage = 'en',
  speakOnly = false,
}) => {
  const t = getTranslation(appLanguage);
  // Speaking keeps everything apart from Words: its cards, its sessions, its progress.
  const CARD_PREFIX = speakOnly ? 'speak:' : '';
  /** Where a half-finished Review / Practice waits. Synced with the rest of the progress. */
  const REVIEW_SESSION_KEY = speakOnly ? 'schritte_speak_review_session_v1' : 'schritte_review_session_v1';
  const PRACTICE_SESSION_KEY = speakOnly ? 'schritte_speak_practice_session_v1' : 'schritte_practice_session_v1';
  const LESSON_PROGRESS_KEY = speakOnly ? 'schritte_speak_lesson_progress_v1' : 'schritte_lesson_progress_v2';
  /** Which cards each direction's Practice has had right at least once. */
  const PRACTICE_DONE_KEY = speakOnly ? 'schritte_speak_practice_done_v1' : 'schritte_practice_done_v1';

  // Filter 1: CEFR Level (A1, A2, B1) - Persisted
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>(() => {
    try {
      const saved = localStorage.getItem('schritte_saved_level');
      if (saved === 'A1' || saved === 'A2' || saved === 'B1') return saved as CEFRLevel;
    } catch {}
    return 'A1';
  });

  // Filter 2: Lesson 1 to 14, PART_1 (1-7), PART_2 (8-14), or ALL - Persisted
  const [selectedLektion, setSelectedLektion] = useState<number | 'ALL' | 'PART_1' | 'PART_2'>(() => {
    try {
      const saved = localStorage.getItem('schritte_saved_lektion');
      if (saved) {
        if (saved === 'ALL' || saved === 'PART_1' || saved === 'PART_2') return saved;
        const num = Number(saved);
        if (!isNaN(num) && num >= 1 && num <= 14) return num;
      }
    } catch {}
    return 1;
  });
  const [isLessonDropdownOpen, setIsLessonDropdownOpen] = useState(false);

  // Lesson Completion Tracking (requires completing at least 1 round of Learn AND 1 round of Practice)
  // Pre-seeded with Lesson 1 (A1_L1) completed for immediate testing and verification
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgress>>(() => {
    const DEFAULT_LESSON_PROGRESS: Record<string, LessonProgress> = speakOnly
      ? {}
      : { 'A1_L1': { learnCompleted: true, practiceCompleted: true } };
    try {
      const saved = localStorage.getItem(LESSON_PROGRESS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_LESSON_PROGRESS, ...parsed };
      }
    } catch {}
    return DEFAULT_LESSON_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LESSON_PROGRESS_KEY, JSON.stringify(lessonProgress));
    } catch {}
  }, [lessonProgress]);

  const [isLearnComplete, setIsLearnComplete] = useState(false);

  const getLessonKey = (level: string, lektion: number | string) => `${level}_L${lektion}`;

  /**
   * The four stops of a lesson: Learn and Practice, each DE → EN and EN → DE.
   * A lesson finished before the directions were split counts both.
   */
  const lessonStops = (level: string, lektion: number) => {
    const p = lessonProgress[getLessonKey(level, lektion)];
    // Practice is done in a direction when nothing in the lesson waits there any more.
    const waiting = pendingByLesson.get(getLessonKey(level, lektion));
    return {
      learnDe: Boolean(p?.learnDe ?? p?.learnCompleted),
      learnEn: Boolean(p?.learnEn ?? p?.learnCompleted),
      practiceDe: waiting ? waiting.de === 0 : Boolean(p?.practiceDe ?? p?.practiceCompleted),
      practiceEn: waiting ? waiting.en === 0 : Boolean(p?.practiceEn ?? p?.practiceCompleted),
    };
  };

  const isOneLessonDone = (level: string, lektion: number) => {
    const s = lessonStops(level, lektion);
    // Speaking has no Learn
    return (speakOnly || (s.learnDe && s.learnEn)) && s.practiceDe && s.practiceEn;
  };

  const isLessonFullyCompleted = (level: string, lektion: number | 'ALL' | 'PART_1' | 'PART_2') => {
    if (typeof lektion === 'number') return isOneLessonDone(level, lektion);
    if (lektion === 'PART_1') return [1, 2, 3, 4, 5, 6, 7].every((num) => isOneLessonDone(level, num));
    if (lektion === 'PART_2') return [8, 9, 10, 11, 12, 13, 14].every((num) => isOneLessonDone(level, num));
    return false;
  };

  const recordLessonStop = (level: string, lektion: number, stop: 'learn' | 'practice', dir: Direction) => {
    const key = getLessonKey(level, lektion);
    setLessonProgress((prev) => {
      const old = prev[key] ?? { learnCompleted: false, practiceCompleted: false };
      // Carry an old "done" over into both directions before adding this one.
      const next: LessonProgress = {
        ...old,
        learnDe: old.learnDe ?? old.learnCompleted,
        learnEn: old.learnEn ?? old.learnCompleted,
        practiceDe: old.practiceDe ?? old.practiceCompleted,
        practiceEn: old.practiceEn ?? old.practiceCompleted,
      };
      if (stop === 'learn') next[dir === 'DE_TO_EN' ? 'learnDe' : 'learnEn'] = true;
      else next[dir === 'DE_TO_EN' ? 'practiceDe' : 'practiceEn'] = true;
      next.learnCompleted = !!(next.learnDe && next.learnEn);
      next.practiceCompleted = !!(next.practiceDe && next.practiceEn);
      return { ...prev, [key]: next };
    });
  };

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  /**
   * One direction at a time, chosen with the button: DE → EN unless you pick
   * otherwise. Learn, Practice and Review all go through every card that way —
   * no mixing — and each direction is its own stop in the lesson's progress.
   */
  const DIRECTION_KEY = speakOnly ? 'schritte_speak_direction' : 'schritte_saved_learn_direction';
  const [learnDirection, setLearnDirection] = useState<Direction>(() => {
    try {
      const saved = localStorage.getItem(DIRECTION_KEY);
      if (saved === 'EN_TO_DE' || saved === 'DE_TO_EN') return saved;
    } catch {}
    return 'DE_TO_EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem(DIRECTION_KEY, learnDirection);
    } catch {}
  }, [learnDirection, DIRECTION_KEY]);

  /**
   * Flashcard sub-mode: 'learn' (Flip), 'practice' or 'review'.
   *
   * Always Learn on arrival. Practice and Review are just the card and the
   * keyboard — the three buttons that switch between them live on the Learn
   * screen — so resuming straight into Practice would leave no way back to
   * them. Learn is where you choose, and the back arrow returns here.
   */
  const [flashcardSubMode, setFlashcardSubMode] = useState<FlashcardSubMode>(speakOnly ? 'practice' : 'learn');
  /**
   * Whether the cards are showing yet.
   *
   * Practice and Review open on a short screen saying what is waiting, with a
   * Start button. Nothing begins until it is tapped, so picking a mode by
   * accident costs nothing, and the level and lesson can still be changed
   * first — once the cards are up, those controls are gone.
   */
  const [sessionStarted, setSessionStarted] = useState(false);

  // FSRS Records State
  const [fsrsRecords, setFsrsRecords] = useState<Record<string, FSRSCardRecord>>(() => loadAllFSRSRecords());

  // Save FSRS records whenever updated
  useEffect(() => {
    saveAllFSRSRecords(fsrsRecords);
  }, [fsrsRecords]);

  // Practice & Review Redo Queue & Mistake Tracking state (all by card key)
  const [practiceQueue, setPracticeQueue] = useState<WordCard[]>([]);
  const [practiceQueueIndex, setPracticeQueueIndex] = useState(0);
  const [sessionInitialCount, setSessionInitialCount] = useState(0);
  const [initialMistakeWordIds, setInitialMistakeWordIds] = useState<string[]>([]);
  const [currentRedoBatch, setCurrentRedoBatch] = useState<WordCard[]>([]);
  const [roundNumber, setRoundNumber] = useState(1); // 1 = Initial round, 2 = 1st Redo, 3 = 2nd Redo...
  const [mistakeCounts, setMistakeCounts] = useState<Record<string, number>>({});
  const [mistakeWords, setMistakeWords] = useState<WordCard[]>([]);
  const [practiceScore, setPracticeScore] = useState(0);
  // A Practice or Review you walked out of, picked up where you left it.
  const [resumedSession, setResumedSession] = useState(false);
  const [isPracticeComplete, setIsPracticeComplete] = useState(false);
  // Practice goes the way the direction button says. Review is always DE → EN:
  // a card reaches Review from either direction's Practice, and is asked one way there.
  const practiceDirection: Direction = flashcardSubMode === 'review' ? 'DE_TO_EN' : learnDirection;
  // DE → EN: the two little switches beside the answer box (M / F and S / P).
  const [genderPick, setGenderPick] = useState<GenderChoice>('M');
  const [numberPick, setNumberPick] = useState<NumberChoice>('S');
  const [practiceTypeInput, setPracticeTypeInput] = useState('');
  // Words with two numbered meanings are asked for both (DE → EN only).
  const [practiceTypeInput2, setPracticeTypeInput2] = useState('');
  const practiceTypeInputRef = useRef<HTMLInputElement>(null);
  const practiceTypeInput2Ref = useRef<HTMLInputElement>(null);
  /** The answer box the M / F and S / P switches give the keyboard back to. */
  const lastAnswerBoxRef = useRef<HTMLInputElement | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState<{
    correct: boolean;
    userText?: string;
    expected: string;
    /** DE → EN: the switches the card wanted (e.g. F, P) and the ones you set. */
    marks?: string[];
    userMarks?: string[];
  } | null>(null);
  const activeRecognitionRef = useRef<{ stop: () => void } | null>(null);

  // Save selected filters & sub-mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('schritte_saved_level', selectedLevel);
    } catch {}
  }, [selectedLevel]);

  useEffect(() => {
    try {
      localStorage.setItem('schritte_saved_lektion', String(selectedLektion));
    } catch {}
  }, [selectedLektion]);

  useEffect(() => {
    try {
      localStorage.setItem('schritte_saved_submode', flashcardSubMode); // kept for the drills' own memory
    } catch {}
  }, [flashcardSubMode]);

  // Auto-focus input when in practice or review mode (Speaking has no box)
  useEffect(() => {
    if (speakOnly) return;
    if ((flashcardSubMode === 'practice' || flashcardSubMode === 'review') && !practiceFeedback && !isPracticeComplete) {
      practiceTypeInputRef.current?.focus();
    }
  }, [practiceQueueIndex, flashcardSubMode, practiceFeedback, practiceDirection, isPracticeComplete, speakOnly]);

  // Gender Blitz state
  const [blitzIndex, setBlitzIndex] = useState(0);
  const [blitzFeedback, setBlitzFeedback] = useState<{
    correct: boolean;
    selected: string; // der/die/das, or den/die/das in Accusative
    word: WordEntry;
  } | null>(null);

  // Plural Drill state
  const [pluralIndex, setPluralIndex] = useState(0);
  const [pluralInput, setPluralInput] = useState('');
  const [pluralFeedback, setPluralFeedback] = useState<{
    correct: boolean;
    expected: string;
  } | null>(null);

  // Hotkeys state
  const [hotkeys, setHotkeys] = useState<FlashcardHotkeys>(() => {
    try {
      const saved = localStorage.getItem('schritte_flashcard_hotkeys');
      if (saved) {
        return { ...DEFAULT_HOTKEYS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_HOTKEYS;
  });
  const [isHotkeyModalOpen, setIsHotkeyModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<keyof FlashcardHotkeys | null>(null);

  // Filter words by Level and Lektion
  const filteredWords = useMemo(() => {
    let list = INITIAL_VOCABULARY;
    // Level filter
    list = list.filter((w) => w.level === selectedLevel);
    // Lektion filter (Intro = 0, 1 to 14, PART_1 (Intro-7), PART_2 (8-14), or ALL)
    if (selectedLektion === 'PART_1') {
      list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 0 && w.lektion <= 7);
    } else if (selectedLektion === 'PART_2') {
      list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 8 && w.lektion <= 14);
    } else if (typeof selectedLektion === 'number') {
      list = list.filter((w) => w.lektion === selectedLektion);
    }
    return list;
  }, [selectedLevel, selectedLektion]);

  // One card per thing to learn: a noun with a plural is two ("der Student", "die Studenten").
  const filteredCards = useMemo(() => cardsFor(filteredWords, CARD_PREFIX), [filteredWords, CARD_PREFIX]);
  const allCards = useMemo(() => cardsFor(INITIAL_VOCABULARY, CARD_PREFIX), [CARD_PREFIX]);
  const cardByKey = useMemo(() => new Map(allCards.map((c) => [c.key, c])), [allCards]);

  // --- What is still waiting to be practised, per direction -------------------
  const [practiceDone, setPracticeDone] = useState<PracticeDone>(() => {
    const saved = loadPracticeDone(PRACTICE_DONE_KEY);
    if (saved) return saved;
    // First time: carry over finished lessons and the half-done Practice.
    let progress = {};
    let session = null;
    try {
      progress = JSON.parse(localStorage.getItem(LESSON_PROGRESS_KEY) || '{}');
      session = JSON.parse(localStorage.getItem(PRACTICE_SESSION_KEY) || 'null');
    } catch {
      // start with nothing done
    }
    return firstPracticeDone(INITIAL_VOCABULARY, CARD_PREFIX, progress, session);
  });
  useEffect(() => {
    savePracticeDone(PRACTICE_DONE_KEY, practiceDone);
  }, [practiceDone, PRACTICE_DONE_KEY]);

  const markPracticeDone = (card: WordCard, dir: Direction) => {
    const d = dirOf(dir);
    setPracticeDone((prev) => (prev[d][card.key] ? prev : { ...prev, [d]: { ...prev[d], [card.key]: new Date().toISOString() } }));
  };

  /** A list's cards not yet answered right in this direction's Practice. */
  const pendingIn = (cards: WordCard[], dir: Direction) => {
    const done = practiceDone[dirOf(dir)];
    return cards.filter((c) => !done[c.key]);
  };
  const pendingDe = useMemo(() => pendingIn(filteredCards, 'DE_TO_EN').length, [filteredCards, practiceDone]);
  const pendingEn = useMemo(() => pendingIn(filteredCards, 'EN_TO_DE').length, [filteredCards, practiceDone]);
  /** Per lesson, for the progress stops: "A1_L8" → how many wait in each direction. */
  const pendingByLesson = useMemo(() => {
    const out = new Map<string, { de: number; en: number }>();
    for (const c of allCards) {
      const k = `${c.word.level}_L${c.word.lektion}`;
      const entry = out.get(k) ?? { de: 0, en: 0 };
      if (!practiceDone.de[c.key]) entry.de++;
      if (!practiceDone.en[c.key]) entry.en++;
      out.set(k, entry);
    }
    return out;
  }, [allCards, practiceDone]);

  // Global due cards across all lessons in the app (decoupled from lesson selector!)
  const globalDueWords = useMemo(() => {
    return allCards.filter((c) => isCardDueForReview(fsrsRecords[c.key]));
  }, [allCards, fsrsRecords]);

  const globalDueCount = globalDueWords.length;

  const globalUnlockedWords = useMemo(() => {
    return allCards.filter((c) => fsrsRecords[c.key]?.isUnlocked && fsrsRecords[c.key]?.status === 'review');
  }, [allCards, fsrsRecords]);

  // Due review words count (globally driven)
  const dueReviewCount = globalDueCount;

  // Keep the saved session in step with where you actually are.
  useEffect(() => {
    if (flashcardSubMode !== 'review') return;
    saveReviewSession(practiceQueue, practiceQueueIndex, practiceScore, sessionInitialCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardSubMode, practiceQueue, practiceQueueIndex, practiceScore, sessionInitialCount]);

  /**
   * Leaving in the middle of Review does not lose your place. Each answer is
   * already scheduled the moment you give it, so the saved session is only the
   * queue and where you were in it — coming back cannot bend the algorithm.
   */
  const saveReviewSession = (queue: WordCard[], index: number, score: number, initial: number) => {
    try {
      if (queue.length === 0 || index >= queue.length) {
        localStorage.removeItem(REVIEW_SESSION_KEY);
        return;
      }
      localStorage.setItem(
        REVIEW_SESSION_KEY,
        JSON.stringify({ ids: queue.map((c) => c.key), index, score, initial, at: new Date().toISOString() })
      );
    } catch {
      // out of space: the session just won't be resumable
    }
  };

  const clearReviewSession = () => {
    try {
      localStorage.removeItem(REVIEW_SESSION_KEY);
    } catch {
      // nothing to do
    }
  };

  const loadReviewSession = (): { queue: WordCard[]; index: number; score: number; initial: number } | null => {
    try {
      const raw = localStorage.getItem(REVIEW_SESSION_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as { ids?: string[]; index?: number; score?: number; initial?: number };
      // Older sessions saved word ids, which are the singular cards' keys.
      const queue = (saved.ids ?? []).map((id) => cardByKey.get(id)).filter((c): c is WordCard => !!c);
      const index = Math.min(Math.max(0, saved.index ?? 0), queue.length - 1);
      if (queue.length === 0 || index < 0) return null;
      // What is left is exactly what is due, so the count matches the Review
      // badge: cards ahead that are no longer due drop out, and every due card
      // not ahead (one that fell due since) joins at the end.
      const dueKeys = new Set(globalDueWords.map((c) => c.key));
      const ahead = queue.slice(index).filter((c) => dueKeys.has(c.key));
      const aheadKeys = new Set(ahead.map((c) => c.key));
      const added = shuffled(globalDueWords.filter((c) => !aheadKeys.has(c.key)));
      const left = [...ahead, ...added];
      if (left.length === 0) return null;
      return { queue: [...queue.slice(0, index), ...left], index, score: saved.score ?? 0, initial: index + left.length };
    } catch {
      return null;
    }
  };

  /**
   * Practice keeps its place too: walk out halfway and the next visit carries
   * on from the same card, mistakes and redo round included. One saved Practice
   * at a time, for one lesson and one direction.
   */
  interface SavedPractice {
    level: string;
    lektion: number | string;
    dir: Direction;
    keys: string[];
    index: number;
    redo: string[];
    round: number;
    score: number;
    mistakes: Record<string, number>;
    firstMistakes: string[];
    initial: number;
  }
  const savePracticeSession = (data: SavedPractice | null) => {
    try {
      if (!data) localStorage.removeItem(PRACTICE_SESSION_KEY);
      else localStorage.setItem(PRACTICE_SESSION_KEY, JSON.stringify({ ...data, at: new Date().toISOString() }));
    } catch {
      // out of space: the session just won't be resumable
    }
  };
  const loadPracticeSession = (level: string, lektion: number | string, dir: Direction): SavedPractice | null => {
    try {
      const raw = localStorage.getItem(PRACTICE_SESSION_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as SavedPractice;
      if (saved.level !== level || String(saved.lektion) !== String(lektion) || saved.dir !== dir) return null;
      return saved;
    } catch {
      return null;
    }
  };

  /**
   * A fresh run, or the saved one for this lesson and direction. Practice only.
   * A fresh run asks only the cards still waiting in that direction — all of
   * them once nothing waits. Resuming adds any card that started waiting since
   * (a word added to the lesson), so nothing is left out.
   */
  const startPracticeRun = (cards: WordCard[], level: string, lektion: number | string, dir: Direction) => {
    const saved = loadPracticeSession(level, lektion, dir);
    const toCards = (keys: string[]) => keys.map((k) => cardByKey.get(k)).filter((c): c is WordCard => !!c);
    const queue = saved ? toCards(saved.keys) : [];
    const waiting = pendingIn(cards, dir);
    if (saved && queue.length > 0 && saved.index < queue.length) {
      const redo = toCards(saved.redo);
      const ahead = new Set([...queue.slice(saved.index), ...redo].map((c) => c.key));
      const added = shuffled(waiting.filter((c) => !ahead.has(c.key)));
      setPracticeQueue([...queue, ...added]);
      setPracticeQueueIndex(saved.index);
      setCurrentRedoBatch(redo);
      setRoundNumber(saved.round);
      setPracticeScore(saved.score);
      setMistakeCounts(saved.mistakes);
      setMistakeWords(toCards(Object.keys(saved.mistakes)));
      setInitialMistakeWordIds(saved.firstMistakes);
      setSessionInitialCount(saved.initial + added.length);
      setResumedSession(true);
      return;
    }
    // A new order each time, so a second run through a lesson is not the first one from memory.
    const run = waiting.length > 0 ? waiting : cards;
    setPracticeQueue(shuffled(run));
    setSessionInitialCount(run.length);
    setPracticeQueueIndex(0);
    setCurrentRedoBatch([]);
    setRoundNumber(1);
    setPracticeScore(0);
    setMistakeCounts({});
    setMistakeWords([]);
    setInitialMistakeWordIds([]);
    setResumedSession(false);
  };

  // Keep the saved Practice in step with where you are, once it has begun.
  useEffect(() => {
    if (flashcardSubMode !== 'practice' || !sessionStarted || isPracticeComplete || practiceQueue.length === 0) return;
    // An answered card counts as done: coming back starts on the next one —
    // or on the redo round, when that card ended the round.
    const atEnd = practiceFeedback !== null && practiceQueueIndex + 1 >= practiceQueue.length;
    const intoRedo = atEnd && currentRedoBatch.length > 0;
    savePracticeSession({
      level: selectedLevel,
      lektion: selectedLektion,
      dir: practiceDirection,
      keys: (intoRedo ? currentRedoBatch : practiceQueue).map((c) => c.key),
      index: intoRedo ? 0 : practiceFeedback && !atEnd ? practiceQueueIndex + 1 : practiceQueueIndex,
      redo: intoRedo ? [] : currentRedoBatch.map((c) => c.key),
      round: intoRedo ? roundNumber + 1 : roundNumber,
      score: practiceScore,
      mistakes: mistakeCounts,
      firstMistakes: initialMistakeWordIds,
      initial: sessionInitialCount,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardSubMode, sessionStarted, isPracticeComplete, practiceQueue, practiceQueueIndex, practiceFeedback, currentRedoBatch, roundNumber, practiceScore, mistakeCounts, initialMistakeWordIds]);

  // Sync practiceQueue when filteredWords changes or when queue is empty
  useEffect(() => {
    if (practiceQueue.length === 0) {
      if (flashcardSubMode === 'review') {
        const saved = loadReviewSession();
        if (saved) {
          setPracticeQueue(saved.queue);
          setPracticeQueueIndex(saved.index);
          setPracticeScore(saved.score);
          setSessionInitialCount(saved.initial);
          setResumedSession(true);
          return;
        }
        const targetQueue = globalDueWords.length > 0 ? globalDueWords : globalUnlockedWords;
        setPracticeQueue(shuffled(targetQueue));
        setSessionInitialCount(targetQueue.length);
      } else if (filteredCards.length > 0) {
        startPracticeRun(filteredCards, selectedLevel, selectedLektion, practiceDirection);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredCards, practiceQueue.length, flashcardSubMode, globalDueWords, globalUnlockedWords]);

  // Nouns only for blitz and plural exercises
  const nounWords = useMemo(() => {
    return filteredWords.filter((w) => w.nounDetails && w.nounDetails.gender);
  }, [filteredWords]);

  const currentPracticeCard: WordCard | undefined = (practiceQueue.length > 0 ? practiceQueue : filteredCards)[
    practiceQueueIndex % ((practiceQueue.length > 0 ? practiceQueue : filteredCards).length || 1)
  ];
  const currentPracticeWord = currentPracticeCard?.word;
  const currentLearnCard: WordCard | undefined = filteredCards[flashcardIndex % (filteredCards.length || 1)];
  const currentCard = flashcardSubMode === 'practice' || flashcardSubMode === 'review' ? currentPracticeCard : currentLearnCard;
  const currentFlashcard = currentCard?.word;
  const currentBlitzNoun = nounWords[blitzIndex % (nounWords.length || 1)];
  const pluralNouns = useMemo(() => nounWords.filter((w) => isDrillable('plural', w)), [nounWords]);
  const currentPluralNoun = pluralNouns[pluralIndex % (pluralNouns.length || 1)];

  // Der/Die/Das and Plural: Practice (the chosen lesson, as before) or Review
  // (nouns from lessons finished in Flashcard Practice, scheduled like Flashcard Review).
  /** Drill practice waits on its Start screen too, like Flashcard's. */
  const [drillStarted, setDrillStarted] = useState(false);
  // Accusative and Special Article also have Learn: the nouns that change (den Kollegen).
  const [drillSubMode, setDrillSubMode] = useState<'learn' | 'practice' | 'review'>(() => {
    try {
      return localStorage.getItem('schritte_saved_drill_submode') === 'review' ? 'review' : 'practice';
    } catch {
      return 'practice';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('schritte_saved_drill_submode', drillSubMode);
    } catch {
      // ignore
    }
  }, [drillSubMode]);

  const articlePool = useMemo(() => drillReviewPool('article', INITIAL_VOCABULARY, fsrsRecords), [fsrsRecords]);
  const pluralPool = useMemo(() => drillReviewPool('plural', INITIAL_VOCABULARY, fsrsRecords), [fsrsRecords]);
  const accusativePool = useMemo(() => drillReviewPool('accusative', INITIAL_VOCABULARY, fsrsRecords), [fsrsRecords]);
  const weakPool = useMemo(() => drillReviewPool('weak', INITIAL_VOCABULARY, fsrsRecords), [fsrsRecords]);
  const poolFor = (skill: DrillSkill) =>
    skill === 'article' ? articlePool : skill === 'plural' ? pluralPool : skill === 'accusative' ? accusativePool : weakPool;

  const activeDrillSkill: DrillSkill | null =
    activeExerciseMode === 'gender_blitz'
      ? 'article'
      : activeExerciseMode === 'plural_drill'
      ? 'plural'
      : activeExerciseMode === 'accusative_drill'
      ? 'accusative'
      : activeExerciseMode === 'weak_nouns'
      ? 'weak'
      : null;
  const isDrillReview = activeDrillSkill !== null && drillSubMode === 'review';
  // Only Special Case has Learn (the nouns that change) — and it is Learn only.
  const drillHasLearn = activeDrillSkill === 'weak';
  // Special Case nouns learned once: Accusative then asks them typed ("den Kollegen").
  const [specialLearned, setSpecialLearned] = useState(() => new Set(loadSpecialLearned().accusative));
  const isWeakDrill = activeDrillSkill === 'weak';
  /** A card asked typed, article and noun together: Special Case itself, or a learned Special Case noun in Accusative. */
  const isWeakCard = (word?: WordEntry | null) =>
    !!word && (isWeakDrill || (activeDrillSkill === 'accusative' && !!weakForm(word) && specialLearned.has(word.id)));
  useEffect(() => {
    if (drillHasLearn) setDrillSubMode('learn');
    else setDrillSubMode((m) => (m === 'learn' ? 'practice' : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrillSkill]);

  // One session engine for both modes, a fixed list picked when the session starts:
  // - Practice: every noun of the chosen lesson; mistakes come back until they're right. Finishing
  //   it puts those nouns into this drill's Review (due tomorrow) and marks the lesson done.
  // - Review: up to 10 due nouns (or unlocked ones when nothing is due), scheduled by the engine.
  const [drillQueue, setDrillQueue] = useState<WordEntry[]>([]);
  const [drillSessionWords, setDrillSessionWords] = useState<WordEntry[]>([]);
  const [drillQueueIndex, setDrillQueueIndex] = useState(0);
  const [drillRedo, setDrillRedo] = useState<WordEntry[]>([]);
  const [drillRound, setDrillRound] = useState(1);
  const [drillCorrectCount, setDrillCorrectCount] = useState(0);
  const [drillSessionDone, setDrillSessionDone] = useState(false);

  // Lessons waiting to be practised here (after their Flashcard Practice), and ones already done.
  const [drillPractice, setDrillPractice] = useState<DrillPracticeState>(loadDrillPracticeState);
  const updateDrillPractice = (change: (prev: DrillPracticeState) => DrillPracticeState) =>
    setDrillPractice((prev) => {
      const next = change(prev);
      saveDrillPracticeState(next);
      return next;
    });
  const articleReadyLessons = useMemo(() => readyLessons(drillPractice, 'article'), [drillPractice]);
  const pluralReadyLessons = useMemo(() => readyLessons(drillPractice, 'plural'), [drillPractice]);
  const accusativeReadyLessons = useMemo(() => readyLessons(drillPractice, 'accusative'), [drillPractice]);
  const weakReadyLessons = useMemo(() => readyLessons(drillPractice, 'weak'), [drillPractice]);
  const readyFor = (skill: DrillSkill) =>
    skill === 'article'
      ? articleReadyLessons
      : skill === 'plural'
      ? pluralReadyLessons
      : skill === 'accusative'
      ? accusativeReadyLessons
      : weakReadyLessons;

  const accusativeNouns = useMemo(() => nounWords.filter((w) => isDrillable('accusative', w)), [nounWords]);
  const weakNouns = useMemo(() => nounWords.filter((w) => isDrillable('weak', w)), [nounWords]);
  const drillPracticeList = (skill: DrillSkill) =>
    skill === 'article' ? nounWords : skill === 'plural' ? pluralNouns : skill === 'accusative' ? accusativeNouns : weakNouns;

  const startDrillSession = (skill: DrillSkill, mode: 'practice' | 'review') => {
    let list: WordEntry[];
    if (mode === 'review') {
      const pool = poolFor(skill);
      list = [...(pool.due.length > 0 ? pool.due : pool.unlocked)]; // like Flashcard: everything due
    } else {
      list = [...drillPracticeList(skill)];
    }
    setDrillQueue(list);
    setDrillSessionWords(list);
    setDrillQueueIndex(0);
    setDrillRedo([]);
    setDrillRound(1);
    setDrillCorrectCount(0);
    setDrillSessionDone(false);
    setBlitzFeedback(null);
    setPluralFeedback(null);
    setPluralInput('');
  };

  // New session when the drill, the mode, or (in Practice) the chosen lesson changes — not on every answer.
  const practiceListKey = activeDrillSkill ? drillPracticeList(activeDrillSkill).map((w) => w.id).join(',') : '';
  useEffect(() => {
    if (activeDrillSkill) startDrillSession(activeDrillSkill, drillSubMode === 'review' ? 'review' : 'practice');
    setDrillStarted(false); // back to the Start screen whenever the session is rebuilt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDrillSkill, drillSubMode, practiceListKey]);

  const drillSessionNoun = activeDrillSkill ? drillQueue[drillQueueIndex] : undefined;
  const drillReviewNoun = isDrillReview ? drillSessionNoun : undefined;
  const activeBlitzNoun = drillSessionNoun;
  const activePluralNoun = drillSessionNoun;

  // Plural: the answer box is focused whenever a new card appears, so you can just type.
  const pluralInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const typedCard =
      activeExerciseMode === 'plural_drill' ||
      activeExerciseMode === 'weak_nouns' ||
      (activeExerciseMode === 'accusative_drill' && isWeakCard(activePluralNoun));
    if (typedCard && !pluralFeedback)
      pluralInputRef.current?.focus();
  }, [activeExerciseMode, activePluralNoun?.id, pluralFeedback, drillSubMode]);

  const recordDrillAnswer = (skill: DrillSkill, word: WordEntry, passed: boolean) => {
    if (passed) setDrillCorrectCount((n) => n + 1);
    if (isDrillReview) {
      const id = drillCardId(skill, word.id);
      setFsrsRecords((prev) => ({ ...prev, [id]: reviewCard(id, passed, prev[id]) }));
    } else if (!passed) {
      setDrillRedo((prev) => (prev.some((w) => w.id === word.id) ? prev : [...prev, word]));
    }
  };

  const advanceDrillSession = () => {
    if (drillQueueIndex + 1 < drillQueue.length) {
      setDrillQueueIndex((i) => i + 1);
      return;
    }
    if (!isDrillReview && drillRedo.length > 0) {
      // Practice: go again over the ones you missed
      setDrillQueue(drillRedo);
      setDrillRedo([]);
      setDrillQueueIndex(0);
      setDrillRound((r) => r + 1);
      return;
    }
    setDrillSessionDone(true);
    if (!isDrillReview && activeDrillSkill) {
      const practised = drillSessionWords;
      const skill = activeDrillSkill;
      setFsrsRecords((prev) => unlockDrillsAfterPractice(practised, prev, [skill]));
      updateDrillPractice((prev) => markLessonsDoneForDrill(prev, skill, practised, INITIAL_VOCABULARY));
    }
  };

  // Does this word ask for two meanings? Only typed DE → EN, and only the 146 with two.
  // Speaking takes one spoken meaning.
  const twoMeanings = (card: WordEntry | null | undefined) =>
    !speakOnly && !!card && practiceDirection === 'DE_TO_EN' && englishSenses(card).length > 1;

  /** The switches a typed DE → EN card asks for: M / F for a person word, S / P for a noun. */
  const wantedMarks = (card?: WordCard | null): { gender: GenderChoice | null; number: NumberChoice | null } => {
    if (!card || speakOnly || practiceDirection !== 'DE_TO_EN') return { gender: null, number: null };
    return {
      gender: genderMark(card.word, INITIAL_VOCABULARY),
      number: hasNumberSwitch(card) ? (asksPlural(card) ? 'P' : 'S') : null,
    };
  };

  // Helper to evaluate answer for practice & review
  const evaluateAnswer = (inputVal: string, card: WordCard, direction: Direction, secondVal = '') => {
    if (direction === 'EN_TO_DE') {
      const { isCorrect, expected } = checkCardGerman(inputVal, card);
      return { isCorrect, expectedDisplay: expected, marks: [] as string[], userMarks: [] as string[] };
    }
    const word = card.word;
    const expectedDisplay = cardMeaningLines(card).join(' · ');
    const textRight = twoMeanings(word)
      ? checkEnglishPair([asListedEnglish(inputVal, card), asListedEnglish(secondVal, card)], word).every(Boolean)
      : checkCardEnglish(inputVal, card);
    const want = wantedMarks(card);
    const marks = [want.gender, want.number].filter((m): m is GenderChoice | NumberChoice => !!m);
    const userMarks = [want.gender ? genderPick : null, want.number ? numberPick : null].filter(
      (m): m is GenderChoice | NumberChoice => !!m
    );
    const marksRight = marks.every((m, i) => userMarks[i] === m);
    return { isCorrect: textRight && marksRight, expectedDisplay, marks, userMarks };
  };

  /** One answer into the review schedule, on that card's own key. */
  const scheduleReview = (card: WordCard, passed: boolean) =>
    setFsrsRecords((prev) => ({ ...prev, [card.key]: reviewCard(card.key, passed, prev[card.key]) }));

  /** Right or wrong, the same bookkeeping whether the answer was typed or spoken. */
  const recordPracticeAnswer = (card: WordCard, isCorrect: boolean) => {
    if (isCorrect) {
      playSound('correct');
      setPracticeScore((prev) => prev + 1);
      onCorrectAnswer?.(15, 5);
      if (flashcardSubMode === 'practice') {
        // Into Review the moment it is right — due a day from now, whenever the rest gets done.
        setFsrsRecords((prev) => unlockWordsAfterPractice([card.key], prev));
        markPracticeDone(card, practiceDirection);
      }
    } else {
      playSound('wrong');
      onWrongAnswer?.();
      // Record mistake on initial first attempt before redo
      if (roundNumber === 1) {
        setInitialMistakeWordIds((prev) => (prev.includes(card.key) ? prev : [...prev, card.key]));
      }
      setMistakeCounts((prev) => ({ ...prev, [card.key]: (prev[card.key] || 0) + 1 }));
      setMistakeWords((prev) => (prev.some((c) => c.key === card.key) ? prev : [...prev, card]));
      setCurrentRedoBatch((prev) => (prev.some((c) => c.key === card.key) ? prev : [...prev, card]));
    }
    if (flashcardSubMode === 'review') scheduleReview(card, isCorrect);
  };

  // Flashcard Practice & Review - Check Handler
  const handlePracticeCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const card = currentPracticeCard;
    if (!card || practiceFeedback || !practiceTypeInput.trim()) return;
    // Both boxes have to be filled before a two-meaning word can be checked.
    if (twoMeanings(card.word) && !practiceTypeInput2.trim()) return;

    const { isCorrect, expectedDisplay, marks, userMarks } = evaluateAnswer(
      practiceTypeInput,
      card,
      practiceDirection,
      practiceTypeInput2
    );
    recordPracticeAnswer(card, isCorrect);
    setPracticeFeedback({
      correct: isCorrect,
      userText: twoMeanings(card.word)
        ? [practiceTypeInput.trim(), practiceTypeInput2.trim()].filter(Boolean).join(' · ')
        : practiceTypeInput.trim(),
      expected: expectedDisplay,
      marks,
      userMarks,
    });
  };

  /**
   * Speaking: tap Speak and say it. What was heard is checked at once, right or
   * wrong. Nothing heard for ten seconds and the button comes back by itself.
   */
  const handleStartListening = () => {
    if (isListening) {
      activeRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const card = currentPracticeCard;
    if (!card || practiceFeedback) return;
    setIsListening(true);

    const lang = practiceDirection === 'EN_TO_DE' ? 'de-DE' : 'en-US';

    const rec = listenToGermanSpeech(
      (transcript) => {
        setIsListening(false);
        const said = transcript.trim().replace(/[.!?,]+$/, '');
        if (!said) return;
        setPracticeTypeInput(said);
        const { isCorrect, expectedDisplay } = evaluateAnswer(said, card, practiceDirection);
        recordPracticeAnswer(card, isCorrect);
        setPracticeFeedback({ correct: isCorrect, userText: said, expected: expectedDisplay });
      },
      (err) => {
        setIsListening(false);
        console.warn('Voice recognition error:', err);
      },
      () => {
        setIsListening(false);
      },
      lang
    );

    activeRecognitionRef.current = rec;
  };

  /** Clears the answer area for the next card. */
  const clearAnswer = () => {
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setGenderPick('M');
    setNumberPick('S');
    activeRecognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleNextPractice = () => {
    playSound('tap');
    // Inside the tap, so iOS keeps the keyboard up for the next card.
    if (!speakOnly) practiceTypeInputRef.current?.focus();
    const activeQueue = practiceQueue.length > 0 ? practiceQueue : filteredCards;

    if (practiceQueueIndex + 1 < activeQueue.length) {
      // Continue through current queue
      clearAnswer();
      setPracticeQueueIndex((prev) => prev + 1);
    } else if (currentRedoBatch.length > 0) {
      // Redo mistakes session!
      setPracticeQueue([...currentRedoBatch]);
      setPracticeQueueIndex(0);
      setCurrentRedoBatch([]);
      setRoundNumber((prev) => prev + 1);
      clearAnswer();
    } else {
      // All cards answered correctly and all mistakes resolved!
      playSound('correct');
      if (flashcardSubMode === 'review') clearReviewSession(); // finished, so there is nothing to come back to
      else savePracticeSession(null);
      setResumedSession(false);
      setIsPracticeComplete(true);
      clearAnswer();

      // Each card went into Review when it was answered right; finishing marks the lesson's stop.
      if (flashcardSubMode === 'practice') {
        if (typeof selectedLektion === 'number') {
          recordLessonStop(selectedLevel, selectedLektion, 'practice', practiceDirection);
          if (!speakOnly) {
            const level = selectedLevel;
            const lesson = selectedLektion;
            // ...and the lesson is now ready to practise in Der/Die/Das and Plural (one notice per lesson).
            updateDrillPractice((prev) => markLessonReadyForDrills(prev, level, lesson, filteredWords));
            // …and in the three tenses that have something for it (Sentence waits for those)
            markReadyAfterWords(level, lesson, filteredWords);
          }
        }
      }
    }
  };

  const restartPracticeSession = () => {
    playSound('tap');
    buildFreshPracticeRun();
  };

  const buildFreshPracticeRun = () => {
    if (flashcardSubMode === 'review') {
      const freshQueue = shuffled(globalDueWords.length > 0 ? globalDueWords : globalUnlockedWords);
      setPracticeQueue(freshQueue);
      setSessionInitialCount(freshQueue.length);
      setInitialMistakeWordIds([]);
      setPracticeQueueIndex(0);
      setCurrentRedoBatch([]);
      setRoundNumber(1);
      setMistakeCounts({});
      setMistakeWords([]);
      setPracticeScore(0);
    } else {
      savePracticeSession(null); // a deliberate fresh start
      startPracticeRun(filteredCards, selectedLevel, selectedLektion, practiceDirection);
    }
    setIsPracticeComplete(false);
    clearAnswer();
  };

  // Learn keeps its place per lesson and direction — the word itself, not the
  // page number: walk out and the next visit offers Resume at the same word.
  // Finishing the lesson, or ending the session, forgets it.
  useEffect(() => {
    if (speakOnly) return;
    const saved = loadLearnPlace(selectedLevel, selectedLektion, learnDirection);
    const index = typeof saved === 'string' ? filteredCards.findIndex((c) => c.key === saved) : saved ?? 0;
    setFlashcardIndex(index > 0 && index < filteredCards.length ? index : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevel, selectedLektion, learnDirection, filteredCards.length]);
  useEffect(() => {
    if (speakOnly || flashcardSubMode !== 'learn' || !sessionStarted) return;
    const key = isLearnComplete || flashcardIndex === 0 ? null : filteredCards[flashcardIndex]?.key ?? null;
    saveLearnPlace(selectedLevel, selectedLektion, learnDirection, key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcardIndex, isLearnComplete, sessionStarted, flashcardSubMode]);

  /** Learn: is the English side of the card showing? It has nothing to hear, so only the arrows. */
  const englishSideUp = (learnDirection === 'DE_TO_EN') === isCardFlipped;

  const handleNextFlashcard = () => {
    playSound('tap');
    cancelFlip();
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsCardFlipped(false);
    setIsListening(false);
    if (flashcardIndex + 1 >= (filteredCards.length || 1)) {
      if (typeof selectedLektion === 'number') {
        recordLessonStop(selectedLevel, selectedLektion, 'learn', learnDirection);
      }
      setIsLearnComplete(true);
      playSound('correct');
    } else {
      setFlashcardIndex((prev) => prev + 1);
    }
  };

  const handlePrevFlashcard = () => {
    playSound('tap');
    cancelFlip();
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsCardFlipped(false);
    setIsListening(false);
    if (isLearnComplete) {
      setIsLearnComplete(false);
      setFlashcardIndex(Math.max(0, (filteredCards.length || 1) - 1));
      return;
    }
    setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : (filteredCards.length || 1) - 1));
  };

  // Learn: swipe left = next card, swipe right = previous, with a slide. The card slides out
  // as it is (front or back), and the next one slides in already on its front, so neither the
  // back of the current card nor the next card's back is ever revealed.
  const [cardDragX, setCardDragX] = useState(0);
  const [cardSlide, setCardSlide] = useState<{ phase: 'idle' | 'out' | 'in'; dir: 1 | -1 }>({ phase: 'idle', dir: -1 });
  const cardDragStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const cardWasDragged = useRef(false);
  const SWIPE_DISTANCE = 60;
  // Slow enough to see the card go — at 180 ms it looked like it just changed.
  const SLIDE_MS = 260;

  /** dir -1 = next (card leaves to the left), +1 = previous (leaves to the right). */
  const slideTimer = useRef<number | null>(null);
  const pendingNavigate = useRef<(() => void) | null>(null);

  const goToCard = (dir: 1 | -1) => {
    const navigate = dir === -1 ? handleNextFlashcard : handlePrevFlashcard;
    // A tap while a card is still sliding is not ignored: that move finishes at
    // once and this one happens straight away, so fast tapping never waits.
    if (cardSlide.phase !== 'idle' || slideTimer.current !== null) {
      if (slideTimer.current !== null) {
        window.clearTimeout(slideTimer.current);
        slideTimer.current = null;
        pendingNavigate.current?.();
        pendingNavigate.current = null;
      }
      navigate();
      setCardDragX(0);
      setCardSlide({ phase: 'idle', dir });
      return;
    }
    setCardSlide({ phase: 'out', dir });
    pendingNavigate.current = navigate;
    slideTimer.current = window.setTimeout(() => {
      slideTimer.current = null;
      pendingNavigate.current = null;
      navigate(); // new index, front side — in the same render
      setCardDragX(0);
      setCardSlide({ phase: 'in', dir }); // parked off-screen on the other side, no transition
      requestAnimationFrame(() => requestAnimationFrame(() => setCardSlide({ phase: 'idle', dir })));
    }, SLIDE_MS);
  };

  const cardSwipeHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if (cardSlide.phase !== 'idle') return;
      cardDragStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      cardWasDragged.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const start = cardDragStart.current;
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        cardWasDragged.current = true;
        setCardDragX(dx);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      const start = cardDragStart.current;
      cardDragStart.current = null;
      if (!start || start.id !== e.pointerId) return;
      const dx = e.clientX - start.x;
      if (cardWasDragged.current && Math.abs(dx) >= SWIPE_DISTANCE) goToCard(dx < 0 ? -1 : 1);
      else setCardDragX(0); // not far enough: spring back
    },
    onPointerCancel: () => {
      cardDragStart.current = null;
      setCardDragX(0);
    },
  };

  // Learn: the card turns over like a real one. It rotates edge-on (90°), the
  // other side is put in while nobody can see it, and it comes round from -90°
  // to face you — so no side is ever shown mirrored. A tap mid-turn finishes
  // that turn at once and starts the next, so fast tapping never waits.
  const FLIP_MS = 220;
  const [flip, setFlip] = useState<{ deg: number; animate: boolean }>({ deg: 0, animate: false });
  const flipTimer = useRef<number | null>(null);
  const cancelFlip = () => {
    if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
    flipTimer.current = null;
    setFlip({ deg: 0, animate: false });
  };
  // The turn always shows, even with the phone's Reduce Motion on: it is how
  // you see the card has two sides.
  const flipCard = () => {
    if (flipTimer.current !== null) {
      // Mid-turn: land that turn now, then do this one.
      window.clearTimeout(flipTimer.current);
      flipTimer.current = null;
      setIsCardFlipped((f) => !f);
    }
    setFlip({ deg: 90, animate: true });
    flipTimer.current = window.setTimeout(() => {
      flipTimer.current = null;
      setIsCardFlipped((f) => !f);
      setFlip({ deg: -90, animate: false });
      requestAnimationFrame(() => requestAnimationFrame(() => setFlip({ deg: 0, animate: true })));
    }, FLIP_MS);
  };
  const flipTransform = `perspective(900px) rotateY(${flip.deg}deg)`;

  const cardSlideStyle: React.CSSProperties =
    cardSlide.phase === 'out'
      ? { transform: `translateX(${cardSlide.dir * 110}%)`, opacity: 0, transition: `transform ${SLIDE_MS}ms ease-in, opacity ${SLIDE_MS}ms ease-in` }
      : cardSlide.phase === 'in'
      ? { transform: `translateX(${-cardSlide.dir * 110}%)`, opacity: 0, transition: 'none' }
      : {
          transform: `translateX(${cardDragX}px) rotate(${cardDragX / 40}deg) ${flipTransform}`,
          transition: cardDragStart.current
            ? 'none'
            : flip.deg !== 0 || flip.animate
            ? flip.animate
              ? `transform ${FLIP_MS}ms ${flip.deg === 0 ? 'ease-out' : 'ease-in'}`
              : 'none'
            : `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out`,
        };

  /**
   * Coming out of an exercise leaves it where it started.
   *
   * Without this, walking out of a Review and back in dropped you straight
   * into Review again — the mode lives on this component, which stays mounted
   * while the exercise list is showing. Flashcard opens on Learn, the drills
   * on Practice, and both wait on their Start screen.
   */
  useEffect(() => {
    if (activeExerciseMode) return;
    // Leaving while Speak is listening: stop it, or the microphone keeps
    // running and the page holds on to a session you have walked out of.
    activeRecognitionRef.current?.stop();
    activeRecognitionRef.current = null;
    setIsListening(false);
    setFlashcardSubMode(speakOnly ? 'practice' : 'learn');
    setSessionStarted(false);
    setDrillSubMode('practice');
    setDrillStarted(false);
    // Practice saves its place on the device; the screen itself starts clean
    // and picks the saved run up again on the way back in.
    setPracticeQueue([]);
    setPracticeQueueIndex(0);
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsPracticeComplete(false);
    setPracticeScore(0);
    setRoundNumber(1);
    setMistakeWords([]);
    setMistakeCounts({});
    setInitialMistakeWordIds([]);
    setCurrentRedoBatch([]);
  }, [activeExerciseMode]);

  // Check if practice or review is actively in progress (not completed, and user has made progress)
  // Only once the cards are up: the Start screen has nothing to lose.
  const isPracticeInProgress =
    activeExerciseMode === 'explorer' &&
    (flashcardSubMode === 'practice' || flashcardSubMode === 'review') &&
    sessionStarted &&
    !isPracticeComplete &&
    (practiceQueueIndex > 0 || practiceFeedback !== null || roundNumber > 1 || Object.keys(mistakeCounts).length > 0);

  // The same for Der/Die/Das and Plural: started, not finished, at least one answered.
  const isDrillInProgress =
    activeDrillSkill !== null &&
    drillStarted &&
    !drillSessionDone &&
    (drillQueueIndex > 0 || drillRound > 1 || blitzFeedback !== null || pluralFeedback !== null);

  useEffect(() => {
    if (onQuizActiveChange) {
      // In Review each answer is scheduled as it is given, so leaving loses
      // nothing — the question asked on the way out says so.
      onQuizActiveChange(
        isPracticeInProgress || isDrillInProgress,
        // Words Practice and Review both save their place now
        isDrillInProgress ? isDrillReview : true
      );
    }
  }, [isPracticeInProgress, isDrillInProgress, isDrillReview, flashcardSubMode, onQuizActiveChange]);

  /** Out of a running Practice or Review, back to its Start screen. Both keep their place. */
  const leaveFlashcardSession = () => {
    const answered = practiceFeedback !== null;
    clearAnswer();
    if (isPracticeComplete) buildFreshPracticeRun();
    // The answered card is done: the Start screen offers the next one.
    else if (answered) {
      const activeQueue = practiceQueue.length > 0 ? practiceQueue : filteredCards;
      if (practiceQueueIndex + 1 < activeQueue.length) setPracticeQueueIndex((i) => i + 1);
      else if (currentRedoBatch.length > 0) {
        setPracticeQueue([...currentRedoBatch]);
        setPracticeQueueIndex(0);
        setCurrentRedoBatch([]);
        setRoundNumber((r) => r + 1);
      }
    }
    setResumedSession(true);
    setSessionStarted(false);
  };

  const leaveDrillSession = () => {
    pluralRecognitionRef.current?.stop();
    setIsPluralListening(false);
    if (activeDrillSkill) startDrillSession(activeDrillSkill, drillSubMode === 'review' ? 'review' : 'practice');
    setDrillStarted(false);
  };

  /**
   * Leaving Words (Learn, Practice or Review) mid-way asks Save or End session.
   * Save keeps your place, so the Start page offers Resume or Start over;
   * End session forgets it. Nothing done yet: it just leaves.
   */
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const wordsSessionHasPlace = () =>
    flashcardSubMode === 'learn'
      ? flashcardIndex > 0 && !isLearnComplete
      : !isPracticeComplete && (practiceQueueIndex > 0 || roundNumber > 1 || practiceFeedback !== null);

  const saveAndLeaveWordsSession = () => {
    setLeavePromptOpen(false);
    if (flashcardSubMode === 'learn') {
      cancelFlip();
      setIsCardFlipped(false);
      setSessionStarted(false);
    } else leaveFlashcardSession();
  };

  const endWordsSession = () => {
    setLeavePromptOpen(false);
    setSessionStarted(false);
    if (flashcardSubMode === 'learn') {
      cancelFlip();
      setIsCardFlipped(false);
      saveLearnPlace(selectedLevel, selectedLektion, learnDirection, null);
      setIsLearnComplete(false);
      setFlashcardIndex(0);
      return;
    }
    clearAnswer();
    if (flashcardSubMode === 'review') clearReviewSession();
    buildFreshPracticeRun();
    setResumedSession(false);
  };

  /** Start page: begin again from the first card, forgetting the saved place. */
  const startWordsSessionOver = () => {
    endWordsSession();
    setSessionStarted(true);
  };

  // The top bar's back arrow and the ✕: inside a session, back to this exercise's
  // Start screen — Words asks Save or End session first when there is a place to keep.
  const handleBackInExercise = (): boolean => {
    if (activeExerciseMode === 'explorer' && sessionStarted) {
      if (wordsSessionHasPlace()) setLeavePromptOpen(true);
      else saveAndLeaveWordsSession();
      return true;
    }
    if (activeDrillSkill && drillStarted) {
      if (isDrillInProgress) onRequestAbandon(leaveDrillSession);
      else leaveDrillSession();
      return true;
    }
    return false;
  };
  // --- Audio that plays by itself (German only — never the English) -----------------
  // Each card plays only itself: "der Service" on the singular card, "die
  // Services" on the plural one — then, once turned over or answered, its sentence.
  const germanWordLines = (card?: WordCard | null): string[] => (card ? [germanOf(card)] : []);
  const germanSentenceLines = (card?: WordCard | null): string[] => {
    const sentence = card ? exampleOf(card)?.german : '';
    return sentence ? [sentence] : [];
  };

  // Words · Learn — DE → EN: the German side plays the word; turned over, the
  // German sentence. EN → DE: the English side is silent; turned over, the word,
  // then the sentence.
  const learnAudioKey =
    activeExerciseMode === 'explorer' && flashcardSubMode === 'learn' && sessionStarted && !isLearnComplete && currentLearnCard
      ? `${currentLearnCard.key}|${learnDirection}|${isCardFlipped}`
      : '';
  useEffect(() => {
    if (!learnAudioKey) return;
    const card = currentLearnCard;
    const lines =
      learnDirection === 'DE_TO_EN'
        ? isCardFlipped
          ? germanSentenceLines(card)
          : germanWordLines(card)
        : isCardFlipped
        ? [...germanWordLines(card), ...germanSentenceLines(card)]
        : [];
    return lines.length ? speakGermanSequence(lines) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnAudioKey]);

  // Words · Practice and Review — DE → EN: the question (German) plays the word;
  // once answered, the sentence. EN → DE: silent until answered, then the word
  // and the sentence.
  const practiceAudioKey =
    activeExerciseMode === 'explorer' &&
    flashcardSubMode !== 'learn' &&
    sessionStarted &&
    !isPracticeComplete &&
    currentPracticeCard
      ? `${currentPracticeCard.key}|${practiceQueueIndex}|${roundNumber}|${practiceDirection}|${practiceFeedback !== null}`
      : '';
  useEffect(() => {
    if (!practiceAudioKey) return;
    const card = currentPracticeCard;
    const answered = practiceFeedback !== null;
    const lines =
      practiceDirection === 'DE_TO_EN'
        ? answered
          ? germanSentenceLines(card)
          : germanWordLines(card)
        : answered
        ? [...germanWordLines(card), ...germanSentenceLines(card)]
        : [];
    return lines.length ? speakGermanSequence(lines) : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceAudioKey]);

  // Plural and Special Case: the singular plays when a noun comes up ("der Name").
  const drillAudioKey =
    (activeDrillSkill === 'plural' || activeDrillSkill === 'weak' || (activeDrillSkill === 'accusative' && isWeakCard(drillSessionNoun))) &&
    drillSubMode !== 'learn' &&
    drillStarted &&
    !drillSessionDone &&
    !pluralFeedback &&
    drillSessionNoun
      ? `${drillSessionNoun.id}|${drillQueueIndex}|${drillRound}`
      : '';
  useEffect(() => {
    if (!drillAudioKey || !drillSessionNoun?.nounDetails?.gender) return;
    return speakGermanSequence([`${drillSessionNoun.nounDetails.gender} ${drillSessionNoun.lemma}`]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drillAudioKey]);

  useEffect(() => {
    if (!backHandlerRef) return;
    backHandlerRef.current = handleBackInExercise;
  });
  useEffect(
    () => () => {
      if (backHandlerRef) backHandlerRef.current = null;
    },
    [backHandlerRef]
  );

  // Protected Filter and Submode Handlers with Abandon Confirmation
  const handleFilterChange = (newLevel?: CEFRLevel, newLektion?: number | 'ALL' | 'PART_1' | 'PART_2') => {
    const doApply = () => {
      const updatedLevel = newLevel || selectedLevel;
      const updatedLektion = newLektion !== undefined ? newLektion : selectedLektion;

      if (newLevel) setSelectedLevel(newLevel);
      if (newLektion !== undefined) setSelectedLektion(newLektion);

      // Compute new filtered list for fresh queue
      let list = INITIAL_VOCABULARY.filter((w) => w.level === updatedLevel);
      if (updatedLektion === 'PART_1') {
        list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 0 && w.lektion <= 7);
      } else if (updatedLektion === 'PART_2') {
        list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 8 && w.lektion <= 14);
      } else if (typeof updatedLektion === 'number') {
        list = list.filter((w) => w.lektion === updatedLektion);
      }

      setFlashcardIndex(0);

      if (flashcardSubMode === 'review') {
        const q = shuffled(globalDueWords.length > 0 ? globalDueWords : globalUnlockedWords);
        setPracticeQueue(q);
        setSessionInitialCount(q.length);
        setInitialMistakeWordIds([]);
        setPracticeQueueIndex(0);
        setCurrentRedoBatch([]);
        setRoundNumber(1);
        setMistakeCounts({});
        setMistakeWords([]);
        setPracticeScore(0);
      } else {
        startPracticeRun(cardsFor(list, CARD_PREFIX), updatedLevel, updatedLektion, practiceDirection);
      }

      setIsPracticeComplete(false);
      setIsLearnComplete(false);
      clearAnswer();
      setBlitzIndex(0);
      setPluralIndex(0);
      setBlitzFeedback(null);
      setPluralFeedback(null);
      setIsLessonDropdownOpen(false);
    };

    if (isPracticeInProgress && onRequestAbandon) {
      onRequestAbandon(doApply);
    } else {
      doApply();
    }
  };

  const handleSubModeChange = (mode: FlashcardSubMode) => {
    if (mode === flashcardSubMode) return;

    const doSwitch = () => {
      playSound('tap');
      setFlashcardSubMode(mode);
      setSessionStarted(false); // Practice and Review wait on their Start screen
      setIsPracticeComplete(false);
      setIsLearnComplete(false);
      setPracticeQueueIndex(0);
      setCurrentRedoBatch([]);
      setRoundNumber(1);
      setMistakeCounts({});
      setMistakeWords([]);
      setInitialMistakeWordIds([]);
      setPracticeScore(0);
      setResumedSession(false);
      clearAnswer();

      if (mode === 'learn') {
        setIsCardFlipped(false);
      } else if (mode === 'practice') {
        startPracticeRun(filteredCards, selectedLevel, selectedLektion, practiceDirection);
      } else if (mode === 'review') {
        const saved = loadReviewSession();
        if (saved) {
          setPracticeQueue(saved.queue);
          setPracticeQueueIndex(saved.index);
          setPracticeScore(saved.score);
          setSessionInitialCount(saved.initial);
          setResumedSession(true);
        } else {
          const q = shuffled(globalDueWords.length > 0 ? globalDueWords : globalUnlockedWords);
          setPracticeQueue(q);
          setSessionInitialCount(q.length);
        }
      }
    };

    // Practice and Review keep their place, so switching away loses nothing.
    doSwitch();
  };

  /** The direction button: DE → EN or EN → DE. Practice picks up that direction's own saved run. */
  const changeDirection = (dir: Direction) => {
    if (dir === learnDirection) return;
    playSound('tap');
    setLearnDirection(dir);
    setIsCardFlipped(false);
    setIsLearnComplete(false);
    setFlashcardIndex(0);
    clearAnswer();
    setIsPracticeComplete(false);
    if (flashcardSubMode === 'practice') startPracticeRun(filteredCards, selectedLevel, selectedLektion, dir);
  };

  // Keyboard Hotkey Listener for Flashcards (Learn & Practice)
  useEffect(() => {
    if (activeExerciseMode !== 'explorer' || isHotkeyModalOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Typing a note: none of this is for the cards.
      if ((e.target as HTMLElement)?.closest?.('[data-note-dialog]')) return;
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';
      if (targetTag === 'TEXTAREA') return;

      const matchesKey = (configKey: string) => {
        if (!configKey) return false;
        if (configKey === ' ' || configKey === 'Space') {
          return e.code === 'Space' || e.key === ' ';
        }
        return e.key.toLowerCase() === configKey.toLowerCase() || e.code.toLowerCase() === configKey.toLowerCase();
      };

      if (flashcardSubMode === 'learn') {
        if (isInput) return;

        if (matchesKey(hotkeys.flip)) {
          e.preventDefault();
          playSound('tap');
          flipCard();
        } else if (matchesKey(hotkeys.next)) {
          e.preventDefault();
          handleNextFlashcard();
        } else if (matchesKey(hotkeys.prev)) {
          e.preventDefault();
          handlePrevFlashcard();
        } else if (matchesKey(hotkeys.singularAudio)) {
          e.preventDefault();
          playSound('tap');
          if (currentLearnCard) speakGerman(germanOf(currentLearnCard));
        } else if (matchesKey(hotkeys.pluralAudio)) {
          e.preventDefault();
          const pluralStr = currentFlashcard ? pluralOf(currentFlashcard) : null;
          if (pluralStr) {
            playSound('tap');
            speakGerman(pluralStr);
          }
        } else if (
          matchesKey(hotkeys.exampleAudio) ||
          (hotkeys.exampleAudio === 'Meta' && (e.key === 'Meta' || e.key === 'Control' || e.metaKey || e.ctrlKey))
        ) {
          e.preventDefault();
          const example = currentLearnCard ? exampleOf(currentLearnCard) : null;
          if (example) {
            playSound('tap');
            speakGerman(example.german);
          }
        }
      } else if (flashcardSubMode === 'practice' || flashcardSubMode === 'review') {
        if (isPracticeComplete) {
          if (matchesKey(hotkeys.practiceCheck) || e.key === 'Enter' || matchesKey(hotkeys.practiceAudio) || e.code === 'Space') {
            e.preventDefault();
            restartPracticeSession();
          }
          return;
        }

        if (practiceFeedback) {
          if (matchesKey(hotkeys.practiceCheck) || e.key === 'Enter') {
            e.preventDefault();
            handleNextPractice();
          } else if (matchesKey(hotkeys.practiceAudio) || e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            playSound('tap');
            if (currentPracticeCard) speakGerman(germanOf(currentPracticeCard));
          }
        } else {
          // Unanswered state in practice: Space speaks in Speaking; typing has its box
          if (matchesKey(hotkeys.practiceAudio) || e.code === 'Space') {
            if (!isInput && speakOnly) {
              e.preventDefault();
              handleStartListening();
            }
          } else if (matchesKey(hotkeys.practiceCheck)) {
            if (!isInput && practiceTypeInput.trim()) {
              e.preventDefault();
              handlePracticeCheck();
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeExerciseMode,
    flashcardSubMode,
    isHotkeyModalOpen,
    hotkeys,
    currentFlashcard,
    filteredWords.length,
    practiceQueue.length,
    practiceFeedback,
    isPracticeComplete,
    practiceQueueIndex,
    practiceTypeInput,
    practiceTypeInput2,
    genderPick,
    numberPick,
    currentPracticeCard,
  ]);

  // Hotkey recording listener when user clicks to change a hotkey in modal
  useEffect(() => {
    if (!editingAction) return;

    const handleRecordKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let newKey = e.key;
      if (e.code === 'Space' || e.key === ' ') {
        newKey = ' ';
      }
      const updated = { ...hotkeys, [editingAction]: newKey };
      setHotkeys(updated);
      try {
        localStorage.setItem('schritte_flashcard_hotkeys', JSON.stringify(updated));
      } catch {}
      setEditingAction(null);
      playSound('tap');
    };

    window.addEventListener('keydown', handleRecordKey, { once: true });
    return () => window.removeEventListener('keydown', handleRecordKey);
  }, [editingAction, hotkeys]);

  const formatKeyDisplay = (key: string) => {
    if (key === ' ' || key === 'Space') return '␣ Space';
    if (key === 'ArrowRight') return '→ Arrow Right';
    if (key === 'ArrowLeft') return '← Arrow Left';
    if (key === 'ArrowDown') return '↓ Arrow Down';
    if (key === 'ArrowUp') return '↑ Arrow Up';
    if (key === 'Meta') return '⌘ Command';
    if (key === 'Control') return 'Ctrl';
    if (key === 'Alt') return 'Alt';
    if (key === 'Shift') return 'Shift';
    if (key === 'Enter') return 'Enter';
    if (key === 'Escape') return 'Esc';
    return key.length === 1 ? key.toUpperCase() : key;
  };

  // Back button handler with abandon guard
  const handleBackToHub = () => {
    if (activeExerciseMode) {
      onRequestAbandon(() => {
        onSelectExerciseMode(null);
        setBlitzFeedback(null);
        setPluralFeedback(null);
      });
    } else {
      onSelectExerciseMode(null);
    }
  };

  // Handlers for Gender Blitz
  // Der/Die/Das (Nominative) and Accusative: pick the article. Accusative asks den / die / das.
  const isAccusative = activeDrillSkill === 'accusative';
  const choiceAnswer = (word: WordEntry) => {
    const gender = word.nounDetails?.gender ?? '';
    return isAccusative ? accusativeArticle(gender) : gender;
  };
  const choiceSentence = (word: WordEntry) => (isAccusative ? accusativeSentence(word) : articleSentence(word));

  const handleGenderChoice = (choice: string) => {
    if (!activeBlitzNoun || blitzFeedback) return;
    const isCorrect = choiceAnswer(activeBlitzNoun) === choice;
    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(10);
    } else {
      playSound('wrong');
      onWrongAnswer();
    }
    speakGerman(fillBlank(choiceSentence(activeBlitzNoun), choiceAnswer(activeBlitzNoun)));
    recordDrillAnswer(isAccusative ? 'accusative' : 'article', activeBlitzNoun, isCorrect);
    setBlitzFeedback({
      correct: isCorrect,
      selected: choice,
      word: activeBlitzNoun,
    });
  };

  const handleNextBlitz = () => {
    playSound('tap');
    setBlitzFeedback(null);
    advanceDrillSession();
  };

  // Handlers for Plural Drill
  /** Either the full 'die Häuser' or just 'Häuser' counts. Trailing punctuation (from speech) is ignored. */
  // Typed answers:
  //   Plural:                      "die Häuser" or "Häuser"
  //   a Special Case noun, once
  //   learned, in Accusative:      "den Kollegen" — article and noun, since both change
  const typedExpected = (word: WordEntry) => (isWeakCard(word) ? weakAnswer(word) : word.nounDetails?.plural || '');
  const typedBlankAnswer = (word: WordEntry) => (isWeakCard(word) ? weakAnswer(word) : barePlural(word));
  const typedSentence = (word: WordEntry) => (isWeakCard(word) ? weakSentence(word) : pluralSentence(word));

  const isPluralCorrect = (answer: string, word: WordEntry) => {
    const cleanUser = answer.trim().replace(/[.!?,]+$/, '').toLowerCase();
    const cleanExpected = typedExpected(word).toLowerCase().replace(/\s+/g, ' ');
    const given = cleanUser.replace(/\s+/g, ' ');
    if (isWeakCard(word)) return given === cleanExpected; // the article is part of the answer here
    return given === cleanExpected || given === cleanExpected.replace(/^die\s+/, '');
  };

  const handlePluralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePluralNoun || pluralFeedback || !pluralInput.trim()) return;
    submitPluralAnswer(pluralInput, activePluralNoun);
  };

  const submitPluralAnswer = (answer: string, noun: WordEntry) => {
    const expected = typedExpected(noun);
    const isCorrect = isPluralCorrect(answer, noun);

    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(15);
    } else {
      playSound('wrong');
      onWrongAnswer();
    }
    speakGerman(fillBlank(typedSentence(noun), typedBlankAnswer(noun)));
    recordDrillAnswer(activeDrillSkill === 'accusative' ? 'accusative' : isWeakDrill ? 'weak' : 'plural', noun, isCorrect);
    setPluralFeedback({
      correct: isCorrect,
      expected,
    });
  };

  const [isPluralListening, setIsPluralListening] = useState(false);
  const pluralRecognitionRef = useRef<{ stop: () => void } | null>(null);

  const handlePluralSpeak = () => {
    if (isPluralListening) {
      pluralRecognitionRef.current?.stop();
      setIsPluralListening(false);
      return;
    }
    const noun = activePluralNoun;
    if (!noun || pluralFeedback) return;
    playSound('tap');
    setIsPluralListening(true);
    pluralRecognitionRef.current = listenToGermanSpeech(
      (transcript) => {
        setIsPluralListening(false);
        const said = transcript.trim().replace(/[.!?,]+$/, '');
        setPluralInput(said);
        if (isPluralCorrect(said, noun)) submitPluralAnswer(said, noun);
        else pluralInputRef.current?.focus();
      },
      (err) => {
        setIsPluralListening(false);
        console.warn('Voice recognition error:', err);
      },
      () => setIsPluralListening(false),
      'de-DE'
    );
  };

  const handleNextPlural = () => {
    playSound('tap');
    setPluralFeedback(null);
    setPluralInput('');
    pluralRecognitionRef.current?.stop();
    setIsPluralListening(false);
    advanceDrillSession();
  };

  const getGenderBadge = (gender?: Gender) => {
    switch (gender) {
      case 'der':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border border-zinc-900">
            DER (m)
          </span>
        );
      case 'die':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700">
            DIE (f)
          </span>
        );
      case 'das':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-black bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            DAS (n)
          </span>
        );
      default:
        return null;
    }
  };

  // 3 exercises (only 1 word / title)
  const availableExercises = speakOnly
    ? [{ id: 'explorer', title: 'Words' }]
    : [
        {
          id: 'explorer',
          title: 'Words',
        },
        {
          id: 'plural_drill',
          title: 'Plural',
        },
      ];

  // VIEW 1: VOCABULARY AREA HUB (3 Exercises Only - Clean & Centered)
  // Before the menu's early return: a hook must run on every render.
  /** Lessons (level-lektion) that have something for the exercise that is open; the rest are greyed. */
  const lessonsWithItems = useMemo(() => {
    const keys = new Set<string>();
    for (const w of INITIAL_VOCABULARY) {
      if (activeDrillSkill && !isDrillable(activeDrillSkill, w)) continue;
      keys.add(`${w.level}-${w.lektion ?? 0}`);
    }
    return keys;
  }, [activeDrillSkill]);
  if (!activeExerciseMode) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center gap-4 py-2 animate-fadeIn overflow-hidden">
        {/* Available Exercises Grid (Exactly 3 Boxes - 1 Word/Title Each) */}
        {/* Der / Die / Das lives in Grammar now, as Article · Nominative */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
          {availableExercises.map((ex) => (
            <button
              key={ex.id}
              id={`vocab-mode-${ex.id}`}
              onClick={() => {
                playSound('tap');
                onSelectExerciseMode(ex.id);
              }}
              className="relative bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-white shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 sm:hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center text-center min-h-[72px] sm:min-h-[150px] group"
            >
              {/* Red notification badge on Flashcards card if Spaced Repetition words are due */}
              {ex.id !== 'explorer' && (() => {
                const skill: DrillSkill = ex.id === 'weak_nouns' ? 'weak' : 'plural';
                const due = poolFor(skill).due.length;
                const waiting = readyFor(skill).length;
                if (!due && !waiting) return null;
                return (
                  <span className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-1 z-10">
                    {waiting > 0 && (
                      <span
                        title="Lessons ready to practise"
                        className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black flex items-center justify-center shadow-md"
                      >
                        {waiting}
                      </span>
                    )}
                    {due > 0 && (
                      <span
                        title="Words due for review"
                        className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse"
                      >
                        {due}
                      </span>
                    )}
                  </span>
                );
              })()}
              {ex.id === 'explorer' && globalDueCount > 0 && (
                <span
                  id="vocab-flashcard-due-badge"
                  className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse z-10"
                >
                  {globalDueCount}
                </span>
              )}
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base sm:text-xl tracking-tight group-hover:scale-105 transition-transform">
                {ex.title}
              </h4>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const getNounColorClass = (gender?: Gender) => genderText(gender);

  const getCleanPluralString = (word?: WordEntry | null) => {
    if (!word?.nounDetails?.plural) return null;
    const raw = word.nounDetails.plural.trim();
    if (raw.toLowerCase().startsWith('die ')) {
      return raw;
    }
    return `die ${raw}`;
  };

  const formatTranslationList = (raw?: string) => {
    if (!raw) return [];
    return raw
      .split(/;|\n|\s\/\s/)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  // Banner 1: Filter Selector (Level & Lesson)
  // `waiting`: lessons ready to practise in Der/Die/Das or Plural, highlighted in amber.
  // Flashcard passes nothing, so its filter looks as before.
  const lessonHasItems = (level: string, lektion: number) => lessonsWithItems.has(`${level}-${lektion}`);

  const renderFilterBanner = (waiting: { level: string; lektion: number }[] = []) => (
    <LessonFilter
      level={selectedLevel}
      pick={selectedLektion}
      onLevel={(lvl) => handleFilterChange(lvl)}
      onPick={(p) => handleFilterChange(undefined, p)}
      hasItems={lessonHasItems}
      isWaiting={(lvl, l) => waiting.some((x) => x.level === lvl && x.lektion === l)}
      isDone={(lvl, l) => isLessonFullyCompleted(lvl, l)}
      en={appLanguage === 'en'}
    />
  );

  {/* Banner 2: Flashcard Sub-Mode Selector (Learn, Practice, Review) */}
  const renderModeBanner = () => (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className={`grid ${speakOnly ? 'grid-cols-2' : 'grid-cols-3'} gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs`}>
        {/* Learn Button (Speaking has none) */}
        {!speakOnly && (
        <button
          type="button"
          onClick={() => handleSubModeChange('learn')}
          className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            flashcardSubMode === 'learn'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <span>{appLanguage === 'en' ? 'Learn' : 'Lernen'}</span>
        </button>
        )}

        {/* Practice Button */}
        <button
          type="button"
          onClick={() => handleSubModeChange('practice')}
          className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            flashcardSubMode === 'practice'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <span>{appLanguage === 'en' ? 'Practice' : 'Üben'}</span>
        </button>

        {/* Review Button with Red Notification Badge & matching UX styling */}
        <button
          type="button"
          onClick={() => handleSubModeChange('review')}
          className={`py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            flashcardSubMode === 'review'
              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
          }`}
        >
          <span>{appLanguage === 'en' ? 'Review' : 'Wiederholen'}</span>
          {globalDueCount > 0 ? (
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-rose-500 text-white shadow-2xs animate-pulse"
            >
              {globalDueCount}
            </span>
          ) : (
            <span
              className="px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 opacity-60"
            >
              0
            </span>
          )}
        </button>
      </div>
    </div>
  );

  // Filter Bar Component inside other Vocab Exercises
  const renderVocabFilterBar = () =>
    renderFilterBanner(activeDrillSkill ? readyFor(activeDrillSkill) : []);

  // Review mixes words from every lesson, so the filter can't apply there. This is the
  // same bar, read-only: it shows the current word's level and lesson, and nothing is tappable.
  const renderReviewWordBanner = (word?: WordEntry) => (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((lvl) => (
            <span
              key={lvl}
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-black ${
                word?.level === lvl ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs' : 'text-zinc-400 dark:text-zinc-500'
              }`}
            >
              {lvl}
            </span>
          ))}
        </div>
        <span className="px-2.5 sm:px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          {appLanguage === 'en' ? 'Lesson' : 'Lektion'} {word?.lektion ?? '–'}
        </span>
      </div>
    </div>
  );

  /** Special Case: Accusative | Dative | Genitive, styled like the mode switch. Only Accusative has its nouns yet. */
  const renderSpecialCaseBar = () => (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
        <span className="py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs">
          {appLanguage === 'en' ? 'Accusative' : 'Akkusativ'}
        </span>
        {[appLanguage === 'en' ? 'Dative' : 'Dativ', appLanguage === 'en' ? 'Genitive' : 'Genitiv'].map((name) => (
          <span
            key={name}
            aria-disabled="true"
            title={appLanguage === 'en' ? 'Soon' : 'Bald'}
            className="py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );

  // Der/Die/Das and Plural: Practice | Review switch, styled like Flashcard's
  const renderDrillModeSwitch = () => {
    const due = activeDrillSkill ? poolFor(activeDrillSkill).due.length : 0;
    const waiting = activeDrillSkill ? readyFor(activeDrillSkill).length : 0;
    const pill = (active: boolean) =>
      `py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    const choose = (mode: 'learn' | 'practice' | 'review') => {
      if (mode === drillSubMode) return;
      playSound('tap');
      setBlitzFeedback(null);
      setPluralFeedback(null);
      setPluralInput('');
      setDrillSubMode(mode);
    };
    return (
      <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
        <div
          className={`grid ${drillHasLearn ? 'grid-cols-3' : 'grid-cols-2'} gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs`}
        >
          {drillHasLearn && (
            <button type="button" onClick={() => choose('learn')} className={pill(drillSubMode === 'learn')}>
              <span>{appLanguage === 'en' ? 'Learn' : 'Lernen'}</span>
            </button>
          )}
          <button type="button" onClick={() => choose('practice')} className={pill(drillSubMode === 'practice')}>
            <span>{appLanguage === 'en' ? 'Practice' : 'Üben'}</span>
            {waiting > 0 && (
              <span
                title={appLanguage === 'en' ? 'Lessons ready to practise' : 'Lektionen zum Üben'}
                className="px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-amber-400 text-amber-950 shadow-2xs"
              >
                {waiting}
              </span>
            )}
          </button>
          <button type="button" onClick={() => choose('review')} className={pill(drillSubMode === 'review')}>
            <span>{appLanguage === 'en' ? 'Review' : 'Wiederholen'}</span>
            <span
              className={
                due > 0
                  ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-rose-500 text-white shadow-2xs animate-pulse'
                  : 'px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 opacity-60'
              }
            >
              {due}
            </span>
          </button>
        </div>
      </div>
    );
  };

  /** After answering Der/Die/Das or Plural: the same boxes and buttons Flashcard uses. */
  const renderDrillFeedback = (correct: boolean, userText: string, expected: string, onNext: () => void) => (
    <div className="w-full space-y-3 animate-fadeIn">
      {!correct && (
        <div className="w-full px-4 py-3.5 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 rounded-2xl flex items-center gap-2.5 shadow-xs">
          <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 stroke-[3]" />
          <span className="font-bold text-base sm:text-lg text-red-900 dark:text-red-100 truncate">{userText}</span>
        </div>
      )}
      <div className="w-full px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
          <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">{expected}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            playSound('tap');
            speakGerman(expected);
          }}
          title={appLanguage === 'en' ? 'Listen' : 'Anhören'}
          className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={onNext}
        className={`w-full py-3.5 ${
          correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
        } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center`}
      >
        <span>{correct ? (appLanguage === 'en' ? 'Continue' : 'Weiter') : appLanguage === 'en' ? 'Got It' : 'Verstanden'}</span>
      </button>
    </div>
  );

  /** Review with nothing unlocked yet, or a finished session (either mode). Null while a session is running. */
  const renderDrillReviewStatus = () => {
    if (!isDrillReview && drillSessionDone) {
      const lesson = typeof selectedLektion === 'number' ? selectedLektion : null;
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
          <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
            {appLanguage === 'en' ? 'Practice complete' : 'Übung abgeschlossen'}
          </p>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
            {appLanguage === 'en'
              ? `${drillSessionWords.length} nouns, all right. ${lesson ? `Lesson ${lesson}` : 'They'} ${lesson ? 'goes' : 'go'} into Review tomorrow.`
              : `${drillSessionWords.length} Nomen, alle richtig. Ab morgen in der Wiederholung.`}
          </p>
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              if (activeDrillSkill) startDrillSession(activeDrillSkill, 'practice');
            }}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer active:scale-98 transition-all"
          >
            {appLanguage === 'en' ? 'Practice again' : 'Nochmal üben'}
          </button>
        </div>
      );
    }
    if (!isDrillReview) return null;
    if (drillQueue.length === 0) {
      return (
        <div className="py-6 text-center">
          <p className="font-black text-zinc-900 dark:text-zinc-100">
            {appLanguage === 'en' ? 'Nothing to review yet' : 'Noch nichts zu wiederholen'}
          </p>
        </div>
      );
    }
    if (drillSessionDone) {
      return (
        <div className="py-5 text-center space-y-3">
          <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
            {appLanguage === 'en' ? 'Review done' : 'Wiederholung fertig'}
          </p>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
            {drillCorrectCount} {appLanguage === 'en' ? 'of' : 'von'} {drillQueue.length}{' '}
            {appLanguage === 'en' ? 'right' : 'richtig'}
          </p>
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              if (activeDrillSkill) startDrillSession(activeDrillSkill, 'review');
            }}
            className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer active:scale-98 transition-all"
          >
            {appLanguage === 'en' ? 'Review again' : 'Nochmal wiederholen'}
          </button>
        </div>
      );
    }
    return null;
  };

  // VIEW 2: ACTIVE EXERCISE SCREEN (With Filter Bar inside each exercise)
  return (
    <div className="w-full h-full flex flex-col justify-start pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-hidden">
      {/* SUB-MODE 1: WORDS — Learn, Practice, Review (Speaking: Practice and Review, spoken) */}
      {activeExerciseMode === 'explorer' && (() => {
        const en = appLanguage === 'en';
        const lessonName =
          typeof selectedLektion === 'number'
            ? selectedLektion === 0
              ? 'Intro'
              : `${en ? 'Lesson' : 'Lektion'} ${selectedLektion}`
            : selectedLektion === 'PART_1'
            ? `${selectedLevel}.1`
            : selectedLektion === 'PART_2'
            ? `${selectedLevel}.2`
            : en
            ? 'All Lessons'
            : 'Alle Lektionen';

        /**
         * DE → EN | EN → DE, the button that sets the way every card goes. In
         * Practice each side also says how many cards still wait that way.
         */
        /**
         * Learn: how many cards are still ahead of you in each direction — all of
         * them until you start, none once that direction's Learn is finished.
         */
        const learnLeft = (dir: Direction) => {
          const total = filteredCards.length;
          if (typeof selectedLektion !== 'number') return total;
          const place = loadLearnPlace(selectedLevel, selectedLektion, dir);
          const index = typeof place === 'string' ? filteredCards.findIndex((c) => c.key === place) : place ?? -1;
          if (index > 0 && index < total) return total - index;
          const stops = lessonStops(selectedLevel, selectedLektion);
          return (dir === 'DE_TO_EN' ? stops.learnDe : stops.learnEn) ? 0 : total;
        };

        const directionSwitch = (pending: { de: number; en: number } | null) => (
          <div className="inline-grid grid-cols-2 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-200 dark:border-zinc-700">
            {(['DE_TO_EN', 'EN_TO_DE'] as Direction[]).map((dir) => {
              const left = dir === 'DE_TO_EN' ? pending?.de : pending?.en;
              const on = learnDirection === dir;
              return (
                <button
                  key={dir}
                  type="button"
                  onClick={() => changeDirection(dir)}
                  className={`px-6 py-2.5 rounded-xl font-black transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    on
                      ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  <span className="text-sm">{dir === 'DE_TO_EN' ? 'DE → EN' : 'EN → DE'}</span>
                  {left !== undefined && (
                    <span
                      className={`text-[11px] font-semibold flex items-center gap-0.5 ${
                        left === 0
                          ? on
                            ? 'text-emerald-300 dark:text-emerald-600'
                            : 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {left === 0 ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          {en ? 'done' : 'fertig'}
                        </>
                      ) : (
                        `${left} ${en ? 'left' : 'offen'}`
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        );

        const pluralChip = (
          <span className="inline-block text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 bg-zinc-200/70 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md">
            Plural
          </span>
        );

        /**
         * "der Student" / "die Studenten": the article in its gender's colour, the
         * noun in black. The plural "die" belongs to no gender, so it stays grey.
         */
        const germanWord = (card: WordCard, size = 'text-3xl sm:text-4xl', showPlural = true) => {
          const gender = card.word.nounDetails?.gender;
          const articleTone = asksPlural(card) ? 'text-zinc-500 dark:text-zinc-400' : genderText(gender);
          const text = germanShown(card);
          const tag = numberTag(card);
          const article = gender ? text.match(/^(der|die|das)\s+/i)?.[1] : undefined;
          return (
            <div className="flex flex-col items-center gap-1.5">
              <h3 className={`${size} tracking-tight leading-tight`}>
                {article ? (
                  <>
                    <span className={`font-normal ${articleTone}`}>{article}</span>{' '}
                    <span className="font-black text-zinc-900 dark:text-zinc-100">{text.slice(article.length).trim()}</span>
                  </>
                ) : (
                  <span className="font-black text-zinc-900 dark:text-zinc-100">{text}</span>
                )}
                {/* The book's mark: Sg. = no plural, Pl. = only a plural */}
                {tag && <span className="ml-1.5 text-[0.45em] font-bold text-zinc-400 dark:text-zinc-500 align-middle">({tag})</span>}
              </h3>
              {card.plural && showPlural && pluralChip}
            </div>
          );
        };

        /** The English: one line, or "1." and "2." each on its own line. */
        const englishWord = (card: WordCard, size = 'text-2xl sm:text-3xl', showPlural = true) => {
          const lines = cardMeaningLines(card);
          return (
            <div className="flex flex-col items-center gap-1.5">
              {lines.length > 1 ? (
                <div className="space-y-1">
                  {lines.map((line, i) => (
                    <div key={i} className={`${size} font-black text-zinc-950 dark:text-white leading-tight`}>
                      <span className="text-zinc-400 font-bold mr-1">{i + 1}.</span>
                      {line}
                    </div>
                  ))}
                </div>
              ) : (
                <h3 className={`${size} font-black text-zinc-950 dark:text-white tracking-tight leading-tight`}>{lines[0]}</h3>
              )}
              {card.plural && showPlural && pluralChip}
            </div>
          );
        };

        /** The lower half of a card: the example, the same size as the word above it, its English under it. */
        const exampleHalf = (card: WordCard) => {
          const example = exampleOf(card);
          if (!example) return null;
          const shownWord = card.plural ? { ...card.word, lemma: (pluralOf(card.word) ?? card.word.lemma).replace(/^die\s+/i, '') } : card.word;
          return (
            <div className="flex-1 w-full flex flex-col items-center justify-center gap-1.5 px-1">
              <div className="flex items-center justify-center gap-2">
                <p className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
                  <SentenceWithWord sentence={example.german} word={shownWord} />
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSound('tap');
                    speakGerman(example.german);
                  }}
                  title={en ? 'Listen to sentence' : 'Satz anhören'}
                  className="p-1.5 rounded-lg bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shrink-0"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              {example.english && (
                <p className="text-sm sm:text-base font-medium text-zinc-500 dark:text-zinc-400">{example.english}</p>
              )}
            </div>
          );
        };

        /** A card face: the word fills it, or — once the example shows — the top half, a line, the example below. */
        const cardFace = (top: React.ReactNode, card: WordCard | undefined, withExample: boolean) => {
          const bottom = withExample && card ? exampleHalf(card) : null;
          return bottom ? (
            <div className="flex-1 w-full flex flex-col">
              <div className="flex-1 flex flex-col items-center justify-center">{top}</div>
              <div className="w-full border-t-2 border-zinc-200 dark:border-zinc-700 my-2" />
              {bottom}
            </div>
          ) : (
            <div className="flex-1 w-full flex flex-col items-center justify-center">{top}</div>
          );
        };

        /** A small switch beside the answer box. */
        const answerSwitch = (label: string, onTap: () => void, tone: string, title: string) => (
          <button
            type="button"
            // Keeps the answer box focused, so the phone keyboard stays up
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onTouchEnd={(e) => {
              // iPhone: handle the tap here and keep the focus where it was, so the keyboard never drops
              e.preventDefault();
              playSound('tap');
              onTap();
              (lastAnswerBoxRef.current?.isConnected ? lastAnswerBoxRef.current : practiceTypeInputRef.current)?.focus();
            }}
            onClick={() => {
              playSound('tap');
              onTap();
              (lastAnswerBoxRef.current?.isConnected ? lastAnswerBoxRef.current : practiceTypeInputRef.current)?.focus();
            }}
            title={title}
            aria-label={title}
            className={`w-9 h-9 shrink-0 rounded-xl border-2 text-sm font-black flex items-center justify-center cursor-pointer active:scale-95 transition-all ${tone}`}
          >
            {label}
          </button>
        );
        const markTone = (mark: string) =>
          mark === 'M'
            ? genderButton('der')
            : mark === 'F'
            ? genderButton('die')
            : 'bg-zinc-100 border-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-100';
        const markChips = (marks?: string[]) =>
          marks && marks.length > 0 ? (
            <span className="flex items-center gap-1 shrink-0">
              {marks.map((m, i) => (
                <span key={i} className={`w-7 h-7 rounded-lg border-2 text-xs font-black flex items-center justify-center ${markTone(m)}`}>
                  {m}
                </span>
              ))}
            </span>
          ) : null;

        /** Learn, Practice and Review: three lines, each with its stops. */
        const renderLessonProgress = () => {
          if (typeof selectedLektion !== 'number') return null;
          const stops = lessonStops(selectedLevel, selectedLektion);
          // Review: where this lesson's cards sit in the schedule — not yet in it, then each gap in days.
          const gaps = new Map<number, number>();
          let notYet = 0;
          for (const card of filteredCards) {
            const r = fsrsRecords[card.key];
            if (!r?.isUnlocked) notYet++;
            else {
              const days = Math.max(1, Math.round(r.intervalDays || 1));
              gaps.set(days, (gaps.get(days) ?? 0) + 1);
            }
          }
          const reviewStations = [
            { label: '0', done: notYet < filteredCards.length, count: notYet },
            ...[...gaps.entries()].sort((a, b) => a[0] - b[0]).map(([days, count]) => ({
              label: `${en ? 'Day' : 'Tag'} ${days}`,
              done: true,
              count,
            })),
          ];
          const line = (title: string, stations: { label: string; done: boolean; count?: number }[]) => (
            <div className="space-y-1.5">
              <p className="text-xs font-black text-zinc-700 dark:text-zinc-300 text-left">{title}</p>
              <div className="flex items-start">
                {stations.map((st, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div
                        className={`flex-1 h-1 mt-[11px] rounded-full ${
                          st.done ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}
                      />
                    )}
                    <div className="flex flex-col items-center gap-1 min-w-[44px]">
                      <span
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${
                          st.done
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 text-zinc-400'
                        }`}
                      >
                        {st.count !== undefined ? st.count : st.done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : ''}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{st.label}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          );
          return (
            <div className="w-full bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl p-3 sm:p-3.5 border border-zinc-200 dark:border-zinc-700 space-y-3">
              {!speakOnly &&
                line(en ? 'Learn' : 'Lernen', [
                  { label: 'DE → EN', done: stops.learnDe },
                  { label: 'EN → DE', done: stops.learnEn },
                ])}
              {line(en ? 'Practice' : 'Üben', [
                { label: 'DE → EN', done: stops.practiceDe },
                { label: 'EN → DE', done: stops.practiceEn },
              ])}
              {line(en ? 'Review' : 'Wiederholen', reviewStations)}
            </div>
          );
        };

        const activeQueue = practiceQueue.length > 0 ? practiceQueue : filteredCards;
        const position = (practiceQueueIndex % (activeQueue.length || 1)) + 1;
        const want = wantedMarks(currentPracticeCard);
        const canResume = flashcardSubMode !== 'learn' && resumedSession && (practiceQueueIndex > 0 || roundNumber > 1);
        const canResumeLearn = flashcardSubMode === 'learn' && flashcardIndex > 0 && !isLearnComplete;

        const startButton = (
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setSessionStarted(true);
            }}
            className="w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all"
          >
            {canResume || canResumeLearn ? (en ? 'Resume' : 'Weiter') : en ? 'Start' : 'Starten'}
          </button>
        );
        const startOverButton = (canResume || canResumeLearn) && (
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              startWordsSessionOver();
            }}
            className="w-full max-w-xs py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-black text-sm rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-[0.98] transition-all"
          >
            {en ? 'Start over' : 'Neu beginnen'}
          </button>
        );

        // Review's Start page: the cards still waiting, grouped by lesson in course order.
        const reviewWaiting = canResume ? activeQueue.slice(practiceQueueIndex) : practiceQueue;
        const reviewByLesson = (() => {
          const groups = new Map<string, { key: string; label: string; title: string; order: number; cards: WordCard[] }>();
          for (const card of reviewWaiting) {
            const { level, lektion } = card.word;
            const key = `${level}_${lektion}`;
            if (!groups.has(key)) {
              groups.set(key, {
                key,
                label: `${level} · ${lektion === 0 ? 'Intro' : `L${lektion}`}`,
                title: BOOK_LESSON_TITLES[key] ?? '',
                order: ['A1', 'A2', 'B1', 'B2'].indexOf(level) * 100 + (lektion ?? 0),
                cards: [],
              });
            }
            groups.get(key)!.cards.push(card);
          }
          return [...groups.values()].sort((a, b) => a.order - b.order);
        })();

        return (
          <div className="max-w-xl mx-auto w-full h-full flex flex-col justify-between">
            <LeaveSessionModal
              isOpen={leavePromptOpen}
              onStay={() => setLeavePromptOpen(false)}
              onSave={saveAndLeaveWordsSession}
              onEnd={endWordsSession}
              appLanguage={appLanguage}
            />
            {/* The bars belong to Learn and to the Start screen. Once the cards
                are up it is the header, the card and the answer. */}
            {(flashcardSubMode === 'learn' || !sessionStarted) && (
              <>
                {renderModeBanner()}
                {/* Review draws from every lesson, so there is nothing to filter */}
                {flashcardSubMode !== 'review' && renderFilterBanner()}
              </>
            )}

            <div className="flex-1 min-h-0 flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
              {/* Learn, Practice and Review all wait on a Start page, so their audio never starts on its own */}
              {!sessionStarted && !(flashcardSubMode === 'review' && practiceQueue.length === 0) ? (
                <div className="flex-1 min-h-0 flex flex-col items-center gap-4 pt-1 pb-2">
                  {flashcardSubMode === 'review' ? (
                    /* Review: how many wait in each lesson, in a box that scrolls —
                       the buttons stay put however many thousand words there are. */
                    <>
                      <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 shrink-0">
                        {reviewWaiting.length} {en ? (canResume ? 'cards left' : 'cards due') : canResume ? 'Karten offen' : 'Karten fällig'}
                      </p>
                      <div className="flex-1 min-h-0 w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700 text-left">
                        {reviewByLesson.map((group) => (
                          <div key={group.key} className="flex items-center gap-3 px-4 py-3">
                            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 w-14 shrink-0">{group.label}</span>
                            <span className="flex-1 min-w-0 truncate font-black text-sm text-zinc-900 dark:text-zinc-100">{group.title}</span>
                            <span className="text-sm font-black text-zinc-500 dark:text-zinc-400">{group.cards.length}</span>
                          </div>
                        ))}
                      </div>
                      <div className="w-full max-w-xs flex flex-col gap-2 shrink-0">
                        {startButton}
                        {startOverButton}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Which lesson, pinned to the top of the card */}
                      <div className="space-y-1 max-w-xs">
                        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                          {selectedLevel}
                          {typeof selectedLektion === 'number' ? ` · ${lessonName}` : ''}
                        </p>
                        <p className="font-black text-base text-zinc-900 dark:text-zinc-100 leading-relaxed">
                          {lessonTopics(filteredWords) || (en ? 'Practice' : 'Üben')}
                        </p>
                      </div>
                      {/* Not begun: one area, Start. Begun and left: two equal areas — Resume, then Start over. */}
                      <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">
                        {(canResume || canResumeLearn) && (
                          <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
                            {flashcardSubMode === 'learn'
                              ? `${flashcardIndex + 1} / ${filteredCards.length}`
                              : `${position} / ${activeQueue.length}`}
                          </p>
                        )}
                        {directionSwitch(
                          flashcardSubMode === 'practice'
                            ? { de: pendingDe, en: pendingEn }
                            : speakOnly
                            ? null
                            : { de: learnLeft('DE_TO_EN'), en: learnLeft('EN_TO_DE') }
                        )}
                        {startButton}
                      </div>
                      {(canResume || canResumeLearn) && (
                        <div className="flex-1 w-full flex items-center justify-center">{startOverButton}</div>
                      )}
                    </>
                  )}
                </div>
              ) : flashcardSubMode === 'review' && practiceQueue.length === 0 ? (
                /* Review with nothing unlocked: say so, instead of showing words you have not met */
                <div className="py-6 text-center">
                  <p className="font-black text-zinc-900 dark:text-zinc-100">
                    {en ? 'Nothing to review yet' : 'Noch nichts zu wiederholen'}
                  </p>
                </div>
              ) : filteredCards.length === 0 && flashcardSubMode !== 'review' ? (
                <div className="py-6 text-center space-y-3">
                  <p className="font-bold text-zinc-500">
                    {en ? 'No words found for this filter.' : 'Keine Wörter für diesen Filter gefunden.'}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedLevel('A1');
                      setSelectedLektion('ALL');
                      setFlashcardIndex(0);
                    }}
                    className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    {en ? 'Reset to A1 (All Lessons)' : 'Auf A1 (Alle Lektionen) zurücksetzen'}
                  </button>
                </div>
              ) : flashcardSubMode === 'learn' ? (
                isLearnComplete ? (
                  /* LEARN ROUND COMPLETE */
                  <div className="flex-1 flex flex-col justify-between items-center text-center p-2 sm:p-4 animate-fadeIn w-full gap-3 sm:gap-4">
                    <div className="text-center space-y-1 pt-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black mb-1">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{en ? 'Learn Round Complete' : 'Lernrunde Abgeschlossen'}</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {selectedLevel} • {lessonName}
                      </h3>
                    </div>

                    {renderLessonProgress()}

                    <div className="w-full max-w-sm flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLearnComplete(false);
                          setFlashcardIndex(0);
                        }}
                        className="w-full sm:flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all"
                      >
                        {en ? 'Review Cards Again' : 'Karten wiederholen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubModeChange('practice')}
                        className="w-full sm:flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs border border-transparent shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>{en ? 'Go to Practice' : 'Zu den Übungen'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* LEARN: the card turns over; swipe or the arrows for the next one */
                  <>
                    {/* Direction on the left, the counter in the middle (the lesson bar above says which lesson) */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs font-bold text-zinc-400 mb-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => changeDirection(learnDirection === 'DE_TO_EN' ? 'EN_TO_DE' : 'DE_TO_EN')}
                        className="justify-self-start px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all"
                      >
                        <span>{learnDirection === 'DE_TO_EN' ? 'DE → EN' : 'EN → DE'}</span>
                      </button>
                      <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
                        {flashcardIndex + 1} / {filteredCards.length}
                      </span>
                      <button
                        type="button"
                        aria-label={en ? 'Close' : 'Schließen'}
                        onClick={() => {
                          playSound('tap');
                          handleBackInExercise();
                        }}
                        className="justify-self-end p-1.5 -m-1 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>

                    {currentLearnCard && (
                      <div
                        {...cardSwipeHandlers}
                        onClick={() => {
                          if (cardWasDragged.current) {
                            cardWasDragged.current = false;
                            return; // that was a swipe, not a tap
                          }
                          playSound('tap');
                          flipCard();
                        }}
                        style={{ ...cardSlideStyle, touchAction: 'pan-y' }}
                        className="flex-1 min-h-[240px] sm:min-h-[280px] p-4 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col cursor-pointer hover:border-zinc-950 dark:hover:border-white select-none"
                      >
                        {cardFace(
                          // DE → EN shows German first; EN → DE shows English first. Turned over, the other.
                          (learnDirection === 'DE_TO_EN') !== isCardFlipped
                            ? germanWord(currentLearnCard, isCardFlipped ? 'text-2xl sm:text-3xl' : undefined)
                            : englishWord(currentLearnCard),
                          currentLearnCard,
                          isCardFlipped
                        )}
                      </div>
                    )}

                    {/* Prev, the word's sound, Next. On the English side there is
                        nothing to hear, so the arrows grow into its room. */}
                    <div className="flex items-center mt-3 shrink-0">
                      <button
                        type="button"
                        onClick={() => goToCard(1)}
                        style={{ flexGrow: englishSideUp ? 1 : 0, transition: 'flex-grow 180ms ease-out', touchAction: 'manipulation' }}
                        className="p-3 mr-2 basis-auto shrink-0 flex justify-center bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95"
                        title="Previous"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div
                        inert={englishSideUp}
                        aria-hidden={englishSideUp}
                        style={{
                          flexGrow: englishSideUp ? 0 : 1,
                          opacity: englishSideUp ? 0 : 1,
                          transition: 'flex-grow 180ms ease-out, opacity 150ms ease-out',
                        }}
                        className="basis-0 min-w-0 overflow-hidden"
                      >
                        <div className="flex items-center mr-2">
                          <button
                            type="button"
                            onClick={() => {
                              playSound('tap');
                              if (currentLearnCard) speakGerman(germanOf(currentLearnCard));
                            }}
                            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                          >
                            <Volume2 className="w-4 h-4" />
                            <span>{en ? 'Audio' : 'Aussprache'}</span>
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => goToCard(-1)}
                        style={{ flexGrow: englishSideUp ? 1 : 0, transition: 'flex-grow 180ms ease-out', touchAction: 'manipulation' }}
                        className="p-3 basis-auto shrink-0 flex justify-center bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs border border-transparent cursor-pointer active:scale-95"
                        title="Next"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )
              ) : isPracticeComplete ? (
                /* PRACTICE / REVIEW COMPLETE */
                <div className="flex-1 min-h-0 flex flex-col justify-between items-center text-center p-1.5 sm:p-3 animate-fadeIn w-full gap-2.5 sm:gap-3">
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight pt-1">
                    {flashcardSubMode === 'review' ? (en ? 'Review' : 'Wiederholen') : `${selectedLevel} • ${lessonName}`}
                  </h3>

                  {(() => {
                    const totalWords = sessionInitialCount || activeQueue.length || 1;
                    const initialMistakesCount = initialMistakeWordIds.length;
                    const initialCorrectCount = Math.max(0, totalWords - initialMistakesCount);
                    const accuracy = Math.round((initialCorrectCount / (totalWords || 1)) * 100);
                    const sortedMistakes = [...mistakeWords].sort((a, b) => (mistakeCounts[b.key] || 1) - (mistakeCounts[a.key] || 1));
                    const stat = (label: string, value: React.ReactNode, tone: string) => (
                      <div className="bg-zinc-50 dark:bg-zinc-800/80 p-2.5 sm:p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{label}</span>
                        <p className={`text-lg sm:text-xl font-black ${tone}`}>{value}</p>
                      </div>
                    );
                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2 w-full">
                          {stat(en ? 'Accuracy' : 'Genauigkeit', `${accuracy}%`, 'text-emerald-600 dark:text-emerald-400')}
                          {stat(en ? 'Correct' : 'Richtig', initialCorrectCount, 'text-zinc-900 dark:text-zinc-100')}
                          {stat(en ? 'Incorrect' : 'Falsch', initialMistakesCount, 'text-red-600 dark:text-red-400')}
                        </div>

                        {flashcardSubMode === 'practice' && renderLessonProgress()}

                        {sortedMistakes.length > 0 && (
                          <div className="w-full flex-1 min-h-0 flex flex-col bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-2.5 sm:p-3 gap-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">{en ? 'Mistakes' : 'Fehler'}</span>
                              <span className="text-[11px] font-bold text-zinc-400">{sortedMistakes.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto max-h-40 sm:max-h-52 space-y-1.5 pr-0.5 custom-scrollbar">
                              {sortedMistakes.map((card) => (
                                <div
                                  key={card.key}
                                  className="flex items-center justify-between p-2 sm:p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        playSound('tap');
                                        speakGerman(germanOf(card));
                                      }}
                                      className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shrink-0 active:scale-95"
                                      title={en ? 'Listen' : 'Anhören'}
                                    >
                                      <Volume2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="min-w-0 flex-1 text-left">
                                      <p className="font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">{germanShown(card)}</p>
                                      <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                        {cardMeaningLines(card).join(' · ')}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="shrink-0 px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-xs font-black">
                                    {mistakeCounts[card.key] || 1}×
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="w-full flex items-center gap-2.5 pt-1">
                    {!speakOnly && (
                      <button
                        type="button"
                        onClick={() => handleSubModeChange('learn')}
                        className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        {en ? 'Back to Learn' : 'Zurück zum Lernen'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={restartPracticeSession}
                      className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {flashcardSubMode === 'review'
                        ? en ? 'Review Again' : 'Erneut wiederholen'
                        : en ? 'Practice Again' : 'Erneut üben'}
                    </button>
                  </div>
                </div>
              ) : (
                /* PRACTICE & REVIEW: the card, then the answer — typed in Words, spoken in Speaking */
                <div className="flex-1 min-h-0 flex flex-col justify-between gap-3">
                  {/* Where the card is from · which way · how far. Nothing touches. */}
                  <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-400">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
                      {currentPracticeWord
                        ? `${currentPracticeWord.level}${
                            typeof currentPracticeWord.lektion === 'number'
                              ? ` · ${currentPracticeWord.lektion === 0 ? 'Intro' : `L${currentPracticeWord.lektion}`}`
                              : ''
                          }`
                        : ''}
                    </span>
                    <span className="pointer-events-none select-none px-2 py-1 rounded-xl text-[11px] font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                      {practiceDirection === 'EN_TO_DE' ? 'EN → DE' : 'DE → EN'}
                    </span>
                    <span className="flex items-center gap-2">
                      {roundNumber > 1 ? (
                        <span className="px-2 py-1 rounded-xl text-[11px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 whitespace-nowrap">
                          {en ? `Redo ${roundNumber - 1}` : `Wdh. ${roundNumber - 1}`} · {position}/{activeQueue.length}
                        </span>
                      ) : (
                        <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider whitespace-nowrap">
                          {position} / {activeQueue.length}
                        </span>
                      )}
                      <button
                          type="button"
                          aria-label={en ? 'Close' : 'Schließen'}
                          onClick={() => {
                            playSound('tap');
                            handleBackInExercise();
                          }}
                          className="p-1.5 -m-1 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                        </button>
                    </span>
                  </div>

                  {/* The question; once answered, a line across the middle and the example below it */}
                  {currentPracticeCard && (
                    <div className="w-full bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col text-center flex-1 min-h-[120px] sm:min-h-[180px] p-3 sm:p-5">
                      {cardFace(
                        practiceDirection === 'EN_TO_DE' ? (
                          englishWord(currentPracticeCard, practiceFeedback ? 'text-xl sm:text-2xl' : undefined, practiceFeedback !== null)
                        ) : (
                          <div className="flex items-center justify-center gap-2.5">
                            {germanWord(currentPracticeCard, practiceFeedback ? 'text-2xl sm:text-3xl' : undefined, practiceFeedback !== null)}
                            <button
                              type="button"
                              onClick={() => {
                                playSound('tap');
                                speakGerman(germanOf(currentPracticeCard));
                              }}
                              title={en ? 'Listen' : 'Anhören'}
                              aria-label={en ? 'Listen' : 'Anhören'}
                              className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer active:scale-95 self-start"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                        ),
                        currentPracticeCard,
                        practiceFeedback !== null
                      )}
                    </div>
                  )}

                  {!practiceFeedback ? (
                    speakOnly ? (
                      /* Speaking: one button. Tap, say it; it is checked as soon as it is heard. */
                      <div className="w-full space-y-2">
                        <button
                          type="button"
                          onClick={handleStartListening}
                          disabled={!isSpeechRecognitionSupported()}
                          className={`w-full py-4 rounded-2xl font-black text-sm cursor-pointer transition-all border-2 active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${
                            isListening
                              ? 'bg-red-500 hover:bg-red-600 text-white border-red-600 animate-pulse'
                              : 'bg-zinc-950 hover:bg-zinc-800 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white'
                          }`}
                        >
                          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                          <span>{isListening ? (en ? 'Listening…' : 'Zuhören…') : en ? 'Speak' : 'Sprechen'}</span>
                        </button>
                        {!isSpeechRecognitionSupported() && (
                          <p className="text-xs font-bold text-zinc-500">
                            {en ? 'This browser cannot listen. Try Chrome or Safari.' : 'Dieser Browser kann nicht zuhören.'}
                          </p>
                        )}
                      </div>
                    ) : (
                      <form onSubmit={handlePracticeCheck} className="w-full space-y-2.5">
                        {/* The answer box; DE → EN has its switches on the right (M / F, S / P) */}
                        <div className="w-full pl-4 pr-2 py-2 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs flex items-center gap-1.5">
                          {twoMeanings(currentPracticeWord) && <span className="text-sm font-black text-zinc-400 shrink-0">1.</span>}
                          <input
                            ref={practiceTypeInputRef}
                            type="text"
                            value={practiceTypeInput}
                            onChange={(e) => setPracticeTypeInput(e.target.value)}
                            onFocus={(e) => (lastAnswerBoxRef.current = e.currentTarget)}
                            onKeyDown={(e) => {
                              // Two boxes: Enter in the first goes on to the second, like Tab
                              if (e.key === 'Enter' && twoMeanings(currentPracticeWord) && !practiceTypeInput2.trim()) {
                                e.preventDefault();
                                practiceTypeInput2Ref.current?.focus();
                              }
                            }}
                            autoFocus
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint={twoMeanings(currentPracticeWord) ? 'next' : 'done'}
                            className="flex-1 min-w-0 py-1 bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                          />
                          {want.gender &&
                            answerSwitch(
                              genderPick,
                              () => setGenderPick((g) => (g === 'M' ? 'F' : 'M')),
                              markTone(genderPick),
                              en ? 'Male or female — tap to change' : 'Männlich oder weiblich — tippen zum Wechseln'
                            )}
                          {want.number &&
                            answerSwitch(
                              numberPick,
                              () => setNumberPick((n) => (n === 'S' ? 'P' : 'S')),
                              markTone(numberPick),
                              en ? 'Singular or plural — tap to change' : 'Singular oder Plural — tippen zum Wechseln'
                            )}
                        </div>

                        {/* Two meanings, two boxes — either one can go in either box */}
                        {twoMeanings(currentPracticeWord) && (
                          <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs flex items-center gap-1.5">
                            <span className="text-sm font-black text-zinc-400 shrink-0">2.</span>
                            <input
                              ref={practiceTypeInput2Ref}
                              type="text"
                              value={practiceTypeInput2}
                              onChange={(e) => setPracticeTypeInput2(e.target.value)}
                              onFocus={(e) => (lastAnswerBoxRef.current = e.currentTarget)}
                              onKeyDown={(e) => {
                                // Enter with the first box still empty goes back to it
                                if (e.key === 'Enter' && !practiceTypeInput.trim()) {
                                  e.preventDefault();
                                  practiceTypeInputRef.current?.focus();
                                }
                              }}
                              enterKeyHint="done"
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck={false}
                              className="flex-1 min-w-0 bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                            />
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={!practiceTypeInput.trim() || (twoMeanings(currentPracticeWord) && !practiceTypeInput2.trim())}
                          className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {en ? 'Check' : 'Prüfen'}
                        </button>
                      </form>
                    )
                  ) : (
                    /* Answered: what you gave (if wrong), the right answer, then on */
                    <div className="w-full space-y-2.5 animate-fadeIn">
                      {!practiceFeedback.correct && (
                        <div className="w-full px-4 py-3 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 rounded-2xl flex items-center gap-2.5 shadow-xs">
                          <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 stroke-[3]" />
                          <span className="flex-1 min-w-0 text-left font-bold text-base sm:text-lg text-red-900 dark:text-red-100 truncate">
                            {practiceFeedback.userText || (en ? 'No answer' : 'Keine Antwort')}
                          </span>
                          {markChips(practiceFeedback.userMarks)}
                        </div>
                      )}
                      <div className="w-full px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center gap-2.5 shadow-xs">
                        <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                        <span className="flex-1 min-w-0 text-left font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">
                          {practiceFeedback.expected}
                        </span>
                        {markChips(practiceFeedback.marks)}
                        {practiceDirection === 'EN_TO_DE' && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('tap');
                              if (currentPracticeCard) speakGerman(germanOf(currentPracticeCard));
                            }}
                            title={en ? 'Listen (Space)' : 'Anhören (Leertaste)'}
                            className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all cursor-pointer shrink-0 active:scale-95"
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleNextPractice}
                        className={`w-full py-3.5 ${
                          practiceFeedback.correct ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                        } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center`}
                      >
                        <span>{practiceFeedback.correct ? (en ? 'Continue' : 'Weiter') : en ? 'Got It' : 'Verstanden'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Floating Hotkey Action Button (Desktop & Tablet only, stuck to bottom right) */}
      {activeExerciseMode === 'explorer' && (
        <button
          type="button"
          onClick={() => {
            playSound('tap');
            setIsHotkeyModalOpen(true);
          }}
          title={appLanguage === 'en' ? 'Keyboard Hotkeys' : 'Tastenkombinationen'}
          className="hidden sm:flex fixed bottom-2.5 right-3 sm:bottom-3 sm:right-4 z-40 p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800 active:scale-95 transition-all shadow-md items-center justify-center cursor-pointer"
        >
          <Keyboard className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-900 dark:text-zinc-100 stroke-[2.5]" />
          <span className="sr-only">Keyboard Hotkeys</span>
        </button>
      )}

      {/* Hotkey Customization Modal */}
      {isHotkeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="fixed inset-0"
            onClick={() => {
              setEditingAction(null);
              setIsHotkeyModalOpen(false);
            }}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 text-zinc-900 dark:text-zinc-100 z-10 animate-scaleUp">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
                <h3 className="font-black text-base">
                  {appLanguage === 'en' ? 'Keyboard Hotkeys' : 'Tastenkombinationen'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setEditingAction(null);
                  setIsHotkeyModalOpen(false);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Hotkey List Container */}
            <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-200 dark:divide-zinc-700/80 overflow-hidden shadow-2xs">
              {(flashcardSubMode === 'learn'
                ? [
                    { id: 'flip' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Flip Card' : 'Karte umdrehen' },
                    { id: 'next' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Next Card' : 'Nächste Karte', icon: ArrowRight },
                    { id: 'prev' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Previous Card' : 'Vorherige Karte', icon: ArrowLeft },
                    { id: 'singularAudio' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Singular Audio' : 'Singular Audio' },
                    { id: 'pluralAudio' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Plural Audio' : 'Plural Audio' },
                    { id: 'exampleAudio' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Example Sentence Audio' : 'Beispielsatz Audio' },
                  ]
                : [
                    { id: 'practiceCheck' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Check / Continue' : 'Prüfen / Weiter' },
                    { id: 'practiceAudio' as keyof FlashcardHotkeys, label: appLanguage === 'en' ? 'Speak / Audio' : 'Sprechen / Audio' },
                  ]
              ).map(({ id, label, icon: IconComp }) => {
                const keyId = id;
                const isRecording = editingAction === keyId;

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {IconComp && <IconComp className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />}
                      <span>{label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        setEditingAction(isRecording ? null : keyId);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer border ${
                        isRecording
                          ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                          : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700 shadow-2xs hover:border-zinc-950 dark:hover:border-white'
                      }`}
                    >
                      {isRecording ? (appLanguage === 'en' ? 'Press key...' : 'Taste drücken...') : formatKeyDisplay(hotkeys[keyId])}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  setHotkeys(DEFAULT_HOTKEYS);
                  try {
                    localStorage.setItem('schritte_flashcard_hotkeys', JSON.stringify(DEFAULT_HOTKEYS));
                  } catch {}
                  setEditingAction(null);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Reset Defaults' : 'Zurücksetzen'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  setEditingAction(null);
                  setIsHotkeyModalOpen(false);
                }}
                className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl shadow-xs cursor-pointer hover:bg-zinc-800 transition-all"
              >
                {appLanguage === 'en' ? 'Done' : 'Fertig'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODE 2: GENDER BLITZ */}
      {/* SUB-MODE 2 & 3: DER/DIE/DAS and PLURAL — a sentence with one blank, answers at the bottom */}
      {activeDrillSkill && (() => {
        // "Article" = pick the article with buttons: Der/Die/Das (Nominative) and Accusative.
        const noun = drillSessionNoun;
        // Buttons for der/die/das (and den/die/das) — except a Special Case noun already
        // learned, which Accusative asks typed, article and noun together.
        const isArticle = (activeDrillSkill === 'article' || activeDrillSkill === 'accusative') && !isWeakCard(noun);
        const practiceList = drillPracticeList(activeDrillSkill);
        const position = drillQueueIndex + 1;
        const total = drillQueue.length;
        const answered = isArticle ? blitzFeedback : pluralFeedback;
        const correct = !!answered?.correct;

        const sentence = noun ? (isArticle ? choiceSentence(noun) : typedSentence(noun)) : '';
        const [before, after = ''] = sentence.split(BLANK);
        const rightAnswer = noun ? (isArticle ? choiceAnswer(noun) : typedBlankAnswer(noun)) : '';
        // The noun as the sentence has it: Accusative can change it ("den Kollegen").
        const nounAsWritten = (isAccusative && isArticle && after.trim().match(/^[\p{L}-]+/u)?.[0]) || noun?.lemma || '';
        const shown = (text: string) => (before === '' ? text.charAt(0).toUpperCase() + text.slice(1) : text);

        const status = renderDrillReviewStatus();
        const emptyPractice = !isDrillReview && practiceList.length === 0;

        return (
          <div className="max-w-xl mx-auto w-full flex-1 min-h-0 flex flex-col">
            {/* As in Flashcard: the bars belong to the Start screen. Once the
                cards are up it is the header, the card and the answers — the
                back arrow takes you out to the Start screen again. Review with
                nothing to review never starts, so it keeps its bars. */}
            {(drillSubMode === 'learn' || !drillStarted || emptyPractice || (isDrillReview && drillQueue.length === 0)) && (
              <>
                {/* Special Case: the bar picks the case, not the mode — it is Learn only */}
                {activeDrillSkill === 'weak' ? renderSpecialCaseBar() : renderDrillModeSwitch()}
                {drillSubMode !== 'review' && renderVocabFilterBar()}
              </>
            )}
            {drillSubMode === 'learn' ? (
              <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm">
                <NounChangeLearn
                  nouns={weakNouns}
                  where=""
                  onLearned={(nouns) => {
                    setSpecialLearned(new Set(markSpecialLearned('accusative', nouns.map((n) => n.id)).accusative));
                    // Learned here = done here: the lesson's amber notice goes
                    updateDrillPractice((prev) => markLessonsDoneForDrill(prev, 'weak', nouns, INITIAL_VOCABULARY));
                  }}
                  appLanguage={appLanguage}
                />
              </div>
            ) : (
            <form
              onSubmit={(e) => {
                if (isArticle) e.preventDefault();
                else handlePluralSubmit(e);
              }}
              className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              {status ?? (!drillStarted && !emptyPractice ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8 text-center">
                  <div className="space-y-3 max-w-xs">
                    {/* Review draws from every lesson, so there is none to name */}
                    {!isDrillReview && (
                      <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                        {selectedLevel}
                        {typeof selectedLektion === 'number'
                          ? ` · ${selectedLektion === 0 ? 'Intro' : `${appLanguage === 'en' ? 'Lesson' : 'Lektion'} ${selectedLektion}`}`
                          : ''}
                      </p>
                    )}
                    <p className="font-black text-base text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {isDrillReview
                        ? appLanguage === 'en' ? 'Review' : 'Wiederholen'
                        : lessonTopics(drillQueue) ||
                          (isAccusative
                            ? appLanguage === 'en' ? 'Den, die or das' : 'Den, die oder das'
                            : isArticle
                            ? appLanguage === 'en' ? 'Der, die or das' : 'Der, die oder das'
                            : isWeakDrill
                            ? appLanguage === 'en' ? 'Special case' : 'Sonderfall'
                            : appLanguage === 'en' ? 'Plurals' : 'Pluralformen')}
                    </p>
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                      {drillQueue.length}{' '}
                      {isDrillReview
                        ? appLanguage === 'en' ? 'nouns due' : 'Nomen fällig'
                        : appLanguage === 'en' ? 'nouns' : 'Nomen'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playSound('tap');
                      setDrillStarted(true);
                    }}
                    className="w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all"
                  >
                    {appLanguage === 'en' ? 'Start' : 'Starten'}
                  </button>
                </div>
              ) : emptyPractice ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3">
                  <p className="font-bold text-zinc-500">
                    {appLanguage === 'en' ? 'No nouns found in this selection.' : 'Keine Nomen in dieser Auswahl gefunden.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLevel('A1');
                      setSelectedLektion('ALL');
                      setBlitzIndex(0);
                      setPluralIndex(0);
                    }}
                    className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer"
                  >
                    {appLanguage === 'en' ? 'Load all A1 nouns' : 'Alle A1 Nomen laden'}
                  </button>
                </div>
              ) : (
                <>
                  {/* Where this noun is from on the left, how far through on the
                      right — Review pulls from every lesson, so the card has to
                      say which one it came from. */}
                  <div className="flex items-center justify-between text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
                    <span className="text-[10px] uppercase">
                      {isDrillReview
                        ? noun
                          ? `${noun.level}${
                              typeof noun.lektion === 'number'
                                ? ` · ${noun.lektion === 0 ? 'Intro' : `L${noun.lektion}`}`
                                : ''
                            }`
                          : ''
                        : `${selectedLevel}${
                            typeof selectedLektion === 'number'
                              ? ` · ${selectedLektion === 0 ? 'Intro' : `L${selectedLektion}`}`
                              : ''
                          }`}
                    </span>
                    {drillRound > 1 ? (
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80">
                        {appLanguage === 'en' ? `Redo ${drillRound - 1}` : `Wiederholung ${drillRound - 1}`} • {position} / {total}
                      </span>
                    ) : (
                      <>{position} / {total}</>
                    )}
                  </div>

                  {/* The sentence, with the blank to fill. Plural shows which noun, as "der Name". */}
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 px-1">
                    {!isArticle && noun && (
                      <span className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-black text-zinc-600 dark:text-zinc-300">
                        <span className={genderText(noun.nounDetails?.gender)}>{noun.nounDetails?.gender}</span> {noun.lemma}
                      </span>
                    )}
                    <p className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">
                      {before}
                      <span
                        className={`inline-block min-w-[2.6em] mx-1 px-1 border-b-4 align-baseline ${
                          // Once answered, the blank always holds the right word in green, so the sentence
                          // you read is correct; the boxes below show what you picked.
                          !answered
                            ? 'border-zinc-300 dark:border-zinc-600 text-transparent'
                            : 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {answered ? shown(rightAnswer) : '\u00a0'}
                      </span>
                      {after}
                    </p>
                    {/* The sentence's English, as Sentence shows it (Plural, Nominative, Accusative) */}
                    {(() => {
                      const english =
                        activeDrillSkill === 'plural'
                          ? noun?.pluralSentenceEnglish
                          : activeDrillSkill === 'article'
                          ? noun?.articleSentenceEnglish
                          : activeDrillSkill === 'accusative'
                          ? noun?.accusativeSentenceEnglish
                          : undefined;
                      // Only when the drill shows the word list's own sentence, which is what was translated
                      const own =
                        activeDrillSkill === 'article'
                          ? !!noun?.articleSentenceBlank && sentence === noun.articleSentenceBlank
                          : true;
                      return english && own ? (
                        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center">({english})</p>
                      ) : null;
                    })()}
                    {answered && noun && (
                      <button
                        type="button"
                        onClick={() => {
                          playSound('tap');
                          speakGerman(fillBlank(sentence, rightAnswer));
                        }}
                        title={appLanguage === 'en' ? 'Listen to the sentence' : 'Satz anhören'}
                        aria-label={appLanguage === 'en' ? 'Listen to the sentence' : 'Satz anhören'}
                        className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer active:scale-95"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Bottom of the screen: the answers, then the result */}
                  <div className="pt-4 space-y-2.5">
                    {answered && noun ? (
                      <>
                        {isArticle
                          ? renderDrillFeedback(
                              correct,
                              `${blitzFeedback?.selected} ${nounAsWritten}`,
                              `${rightAnswer} ${nounAsWritten}`,
                              handleNextBlitz
                            )
                          : renderDrillFeedback(correct, pluralInput.trim(), typedExpected(noun), handleNextPlural)}
                      </>
                    ) : isArticle ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {(isAccusative ? ['den', 'die', 'das'] : ['der', 'die', 'das']).map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => handleGenderChoice(gender)}
                            className={`py-4 rounded-2xl hover:brightness-95 dark:hover:brightness-125 font-black text-base uppercase border-2 active:scale-95 transition-all cursor-pointer shadow-xs ${
                              isAccusative
                                ? genderButton(accusativeGender(gender), 'accusative')
                                : genderButton(gender, 'nominative')
                            }`}
                          >
                            {gender}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* Answer box above Check — the same box Flashcard uses */}
                        <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs">
                          <input
                            ref={pluralInputRef}
                            type="text"
                            autoFocus
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            aria-label="Plural"
                            value={pluralInput}
                            onChange={(e) => setPluralInput(e.target.value)}
                            onKeyDown={(e) => {
                              // Enter (or the phone keyboard's done key) checks the answer
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.currentTarget.form?.requestSubmit();
                              }
                            }}
                            className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                          />
                        </div>
                        {/* Check — typing only; speaking lives in Speaking */}
                        <div className="flex items-center gap-2.5 w-full">
                          <button
                            type="submit"
                            disabled={!pluralInput.trim()}
                            className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {appLanguage === 'en' ? 'Check' : 'Prüfen'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ))}
            </form>
            )}
          </div>
        );
      })()}
    </div>
  );
};
