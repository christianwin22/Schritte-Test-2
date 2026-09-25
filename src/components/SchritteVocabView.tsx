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
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import { BLANK, articleSentence, barePlural, fillBlank, pluralSentence } from '../data/nounDrillSentences';
import { CEFRLevel, Gender, WordEntry, FlashcardSubMode, FSRSCardRecord } from '../types';
import { checkEnglish, checkEnglishPair, checkGerman, englishSenses, meaningLines } from '../utils/answerCheck';
import { highlightWord, stemLabel } from '../utils/sentenceParts';

/** Where a half-finished Review session waits. Synced with the rest of the progress. */
const REVIEW_SESSION_KEY = 'schritte_review_session_v1';
import { speakGerman, listenToGermanSpeech, isSpeechRecognitionSupported } from '../utils/speech';
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
 * What a lesson is about, in its own words: the group headings the word list
 * gives it, most-used first. The "— picture labels (LWS 4)" tails are the
 * book's own cross-references and mean nothing here, so they are cut.
 */
const lessonTopics = (words: WordEntry[], limit = 2): string => {
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
  appLanguage?: AppLanguage;
}

export const SchritteVocabView: React.FC<SchritteVocabViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  activeExerciseMode,
  onSelectExerciseMode,
  onRequestAbandon,
  onQuizActiveChange,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

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
  const [lessonProgress, setLessonProgress] = useState<
    Record<string, { learnCompleted: boolean; practiceCompleted: boolean }>
  >(() => {
    const DEFAULT_LESSON_PROGRESS: Record<string, { learnCompleted: boolean; practiceCompleted: boolean }> = {
      'A1_L1': { learnCompleted: true, practiceCompleted: true },
    };
    try {
      const saved = localStorage.getItem('schritte_lesson_progress_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_LESSON_PROGRESS, ...parsed };
      }
    } catch {}
    return DEFAULT_LESSON_PROGRESS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('schritte_lesson_progress_v2', JSON.stringify(lessonProgress));
    } catch {}
  }, [lessonProgress]);

  const [isLearnComplete, setIsLearnComplete] = useState(false);

  const getLessonKey = (level: string, lektion: number | string) => `${level}_L${lektion}`;

  const isLessonFullyCompleted = (level: string, lektion: number | 'ALL' | 'PART_1' | 'PART_2') => {
    if (typeof lektion === 'number') {
      const prog = lessonProgress[getLessonKey(level, lektion)];
      return Boolean(prog?.learnCompleted && prog?.practiceCompleted);
    }
    if (lektion === 'PART_1') {
      return [1, 2, 3, 4, 5, 6, 7].every((num) => {
        const p = lessonProgress[getLessonKey(level, num)];
        return Boolean(p?.learnCompleted && p?.practiceCompleted);
      });
    }
    if (lektion === 'PART_2') {
      return [8, 9, 10, 11, 12, 13, 14].every((num) => {
        const p = lessonProgress[getLessonKey(level, num)];
        return Boolean(p?.learnCompleted && p?.practiceCompleted);
      });
    }
    return false;
  };

  const isLessonPracticeDone = (level: string, lektion: number) => {
    return Boolean(lessonProgress[getLessonKey(level, lektion)]?.practiceCompleted);
  };

  const isLessonLearnDone = (level: string, lektion: number) => {
    return Boolean(lessonProgress[getLessonKey(level, lektion)]?.learnCompleted);
  };

  const recordLessonLearnCompleted = (level: string, lektion: number) => {
    const key = getLessonKey(level, lektion);
    setLessonProgress((prev) => ({
      ...prev,
      [key]: {
        learnCompleted: true,
        practiceCompleted: prev[key]?.practiceCompleted || false,
      },
    }));
  };

  const recordLessonPracticeCompleted = (level: string, lektion: number) => {
    const key = getLessonKey(level, lektion);
    setLessonProgress((prev) => ({
      ...prev,
      [key]: {
        learnCompleted: prev[key]?.learnCompleted || false,
        practiceCompleted: true,
      },
    }));
  };

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [learnDirection, setLearnDirection] = useState<'DE_TO_EN' | 'EN_TO_DE'>(() => {
    try {
      const saved = localStorage.getItem('schritte_saved_learn_direction');
      if (saved === 'EN_TO_DE' || saved === 'DE_TO_EN') return saved;
    } catch {}
    return 'DE_TO_EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem('schritte_saved_learn_direction', learnDirection);
    } catch {}
  }, [learnDirection]);

  /**
   * Flashcard sub-mode: 'learn' (Flip), 'practice' or 'review'.
   *
   * Always Learn on arrival. Practice and Review are just the card and the
   * keyboard — the three buttons that switch between them live on the Learn
   * screen — so resuming straight into Practice would leave no way back to
   * them. Learn is where you choose, and the back arrow returns here.
   */
  const [flashcardSubMode, setFlashcardSubMode] = useState<FlashcardSubMode>('learn');
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

  // Practice & Review Redo Queue & Mistake Tracking state
  const [practiceQueue, setPracticeQueue] = useState<WordEntry[]>([]);
  const [practiceQueueIndex, setPracticeQueueIndex] = useState(0);
  const [sessionInitialCount, setSessionInitialCount] = useState(0);
  const [initialMistakeWordIds, setInitialMistakeWordIds] = useState<string[]>([]);
  const [currentRedoBatch, setCurrentRedoBatch] = useState<WordEntry[]>([]);
  const [roundNumber, setRoundNumber] = useState(1); // 1 = Initial round, 2 = 1st Redo, 3 = 2nd Redo...
  const [mistakeCounts, setMistakeCounts] = useState<Record<string, number>>({});
  const [mistakeWords, setMistakeWords] = useState<WordEntry[]>([]);
  const [practiceScore, setPracticeScore] = useState(0);
  // A Review session you walked out of, so it can be picked up where you left it.
  const [resumedSession, setResumedSession] = useState(false);
  const [isPracticeComplete, setIsPracticeComplete] = useState(false);
  const [practiceDirection, setPracticeDirection] = useState<'EN_TO_DE' | 'DE_TO_EN'>('EN_TO_DE');
  const [practiceTypeInput, setPracticeTypeInput] = useState('');
  // Words with two numbered meanings are asked for both (DE → EN only).
  const [practiceTypeInput2, setPracticeTypeInput2] = useState('');
  const practiceTypeInputRef = useRef<HTMLInputElement>(null);
  const [isListening, setIsListening] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState<{
    correct: boolean;
    userText?: string;
    expected: string;
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

  // Auto-focus input when in practice or review mode
  useEffect(() => {
    if ((flashcardSubMode === 'practice' || flashcardSubMode === 'review') && !practiceFeedback && !isPracticeComplete) {
      practiceTypeInputRef.current?.focus();
    }
  }, [practiceQueueIndex, flashcardSubMode, practiceFeedback, practiceDirection, isPracticeComplete]);

  // Gender Blitz state
  const [blitzIndex, setBlitzIndex] = useState(0);
  const [blitzFeedback, setBlitzFeedback] = useState<{
    correct: boolean;
    selected: Gender;
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

  // Global due words across all lessons in the app (decoupled from lesson selector!)
  const globalDueWords = useMemo(() => {
    return INITIAL_VOCABULARY.filter((w) => isCardDueForReview(fsrsRecords[w.id]));
  }, [fsrsRecords]);

  const globalDueCount = globalDueWords.length;

  const globalUnlockedWords = useMemo(() => {
    return INITIAL_VOCABULARY.filter(
      (w) => fsrsRecords[w.id]?.isUnlocked && fsrsRecords[w.id]?.status === 'review'
    );
  }, [fsrsRecords]);

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
  const saveReviewSession = (queue: WordEntry[], index: number, score: number, initial: number) => {
    try {
      if (queue.length === 0 || index >= queue.length) {
        localStorage.removeItem(REVIEW_SESSION_KEY);
        return;
      }
      localStorage.setItem(
        REVIEW_SESSION_KEY,
        JSON.stringify({ ids: queue.map((w) => w.id), index, score, initial, at: new Date().toISOString() })
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

  const loadReviewSession = (): { queue: WordEntry[]; index: number; score: number; initial: number } | null => {
    try {
      const raw = localStorage.getItem(REVIEW_SESSION_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw) as { ids?: string[]; index?: number; score?: number; initial?: number };
      const byId = new Map(INITIAL_VOCABULARY.map((w) => [w.id, w]));
      const queue = (saved.ids ?? []).map((id) => byId.get(id)).filter((w): w is WordEntry => !!w);
      const index = Math.min(Math.max(0, saved.index ?? 0), queue.length - 1);
      if (queue.length === 0 || index < 0) return null;
      return { queue, index, score: saved.score ?? 0, initial: saved.initial ?? queue.length };
    } catch {
      return null;
    }
  };

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
      } else if (filteredWords.length > 0) {
        // A new order each time, so a second run through a lesson is not the
        // first one from memory.
        setPracticeQueue(shuffled(filteredWords));
        setSessionInitialCount(filteredWords.length);
      }
    }
  }, [filteredWords, practiceQueue.length, flashcardSubMode, globalDueWords, globalUnlockedWords]);

  // Nouns only for blitz and plural exercises
  const nounWords = useMemo(() => {
    return filteredWords.filter((w) => w.nounDetails && w.nounDetails.gender);
  }, [filteredWords]);

  const currentPracticeWord = (practiceQueue.length > 0 ? practiceQueue : filteredWords)[
    practiceQueueIndex % ((practiceQueue.length > 0 ? practiceQueue : filteredWords).length || 1)
  ];
  const currentFlashcard =
    flashcardSubMode === 'practice' || flashcardSubMode === 'review'
      ? currentPracticeWord
      : filteredWords[flashcardIndex % (filteredWords.length || 1)];
  const currentBlitzNoun = nounWords[blitzIndex % (nounWords.length || 1)];
  const pluralNouns = useMemo(() => nounWords.filter((w) => isDrillable('plural', w)), [nounWords]);
  const currentPluralNoun = pluralNouns[pluralIndex % (pluralNouns.length || 1)];

  // Der/Die/Das and Plural: Practice (the chosen lesson, as before) or Review
  // (nouns from lessons finished in Flashcard Practice, scheduled like Flashcard Review).
  /** Drill practice waits on its Start screen too, like Flashcard's. */
  const [drillStarted, setDrillStarted] = useState(false);
  const [drillSubMode, setDrillSubMode] = useState<'practice' | 'review'>(() => {
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

  const activeDrillSkill: DrillSkill | null =
    activeExerciseMode === 'gender_blitz' ? 'article' : activeExerciseMode === 'plural_drill' ? 'plural' : null;
  const isDrillReview = activeDrillSkill !== null && drillSubMode === 'review';

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

  const drillPracticeList = (skill: DrillSkill) => (skill === 'article' ? nounWords : pluralNouns);

  const startDrillSession = (skill: DrillSkill, mode: 'practice' | 'review') => {
    let list: WordEntry[];
    if (mode === 'review') {
      const pool = skill === 'article' ? articlePool : pluralPool;
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
    if (activeDrillSkill) startDrillSession(activeDrillSkill, drillSubMode);
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
    if (activeExerciseMode === 'plural_drill' && !pluralFeedback) pluralInputRef.current?.focus();
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

  // Does this word ask for two meanings? Only DE → EN, and only the 146 with two.
  const twoMeanings = (card: WordEntry | null | undefined) =>
    !!card && practiceDirection === 'DE_TO_EN' && englishSenses(card).length > 1;

  // Helper to evaluate answer for practice & review
  const evaluateAnswer = (
    inputVal: string,
    card: WordEntry,
    direction: 'EN_TO_DE' | 'DE_TO_EN',
    secondVal = ''
  ) => {
    if (direction === 'EN_TO_DE') {
      const { isCorrect, expected } = checkGerman(inputVal, card);
      return { isCorrect, expectedDisplay: expected };
    }
    const expectedDisplay = meaningLines(card).join(' · ');
    if (englishSenses(card).length > 1) {
      const both = checkEnglishPair([inputVal, secondVal], card);
      return { isCorrect: both.every(Boolean), expectedDisplay };
    }
    return { isCorrect: checkEnglish(inputVal, card), expectedDisplay };
  };

  // Flashcard Practice & Review - Check Handler
  const handlePracticeCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPracticeWord || practiceFeedback || !practiceTypeInput.trim()) return;
    // Both boxes have to be filled before a two-meaning word can be checked.
    if (twoMeanings(currentPracticeWord) && !practiceTypeInput2.trim()) return;

    const { isCorrect, expectedDisplay } = evaluateAnswer(
      practiceTypeInput,
      currentPracticeWord,
      practiceDirection,
      practiceTypeInput2
    );

    if (isCorrect) {
      playSound('correct');
      setPracticeScore((prev) => prev + 1);
      if (onCorrectAnswer) {
        onCorrectAnswer(15, 5);
      }
      if (practiceDirection === 'EN_TO_DE') {
        speakGerman(expectedDisplay);
      }
    } else {
      playSound('wrong');
      if (onWrongAnswer) {
        onWrongAnswer();
      }
      // Record mistake on initial first attempt before redo
      if (roundNumber === 1) {
        setInitialMistakeWordIds((prev) =>
          prev.includes(currentPracticeWord.id) ? prev : [...prev, currentPracticeWord.id]
        );
      }
      setMistakeCounts((prev) => ({
        ...prev,
        [currentPracticeWord.id]: (prev[currentPracticeWord.id] || 0) + 1,
      }));
      setMistakeWords((prev) => {
        if (prev.some((w) => w.id === currentPracticeWord.id)) return prev;
        return [...prev, currentPracticeWord];
      });
      setCurrentRedoBatch((prev) => {
        if (prev.some((w) => w.id === currentPracticeWord.id)) return prev;
        return [...prev, currentPracticeWord];
      });
    }

    // Process FSRS review algorithm if in Review mode
    if (flashcardSubMode === 'review') {
      const existing = fsrsRecords[currentPracticeWord.id] || {
        wordId: currentPracticeWord.id,
        status: 'review' as const,
        isUnlocked: true,
        stability: 1.0,
        difficulty: 5.0,
        intervalDays: 1,
        nextReviewDate: new Date().toISOString(),
      };

      const lastReviewedTime = existing.lastReviewedAt ? new Date(existing.lastReviewedAt).getTime() : Date.now();
      const daysElapsed = Math.max(0, (Date.now() - lastReviewedTime) / (1000 * 60 * 60 * 24));

      const fsrsResult = processFSRSReview(
        isCorrect,
        existing.stability,
        existing.difficulty,
        daysElapsed
      );

      setFsrsRecords((prev) => ({
        ...prev,
        [currentPracticeWord.id]: {
          ...existing,
          status: 'review',
          isUnlocked: true,
          stability: fsrsResult.newStability,
          difficulty: fsrsResult.newDifficulty,
          intervalDays: fsrsResult.nextInterval,
          nextReviewDate: fsrsResult.nextReviewDate,
          lastReviewedAt: new Date().toISOString(),
          repetitionCount: (existing.repetitionCount || 0) + 1,
        },
      }));
    }

    setPracticeFeedback({
      correct: isCorrect,
      userText: twoMeanings(currentPracticeWord)
        ? [practiceTypeInput.trim(), practiceTypeInput2.trim()].filter(Boolean).join(' · ')
        : practiceTypeInput.trim(),
      expected: expectedDisplay,
    });
  };

  // Flashcard Practice & Review - Voice / Speech Recognition Handler
  const handleStartListening = () => {
    if (isListening) {
      activeRecognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!currentPracticeWord || practiceFeedback) return;
    playSound('tap');
    // You are talking, not typing: the keyboard can go.
    practiceTypeInputRef.current?.blur();
    setIsListening(true);

    const lang = practiceDirection === 'EN_TO_DE' ? 'de-DE' : 'en-US';

    const rec = listenToGermanSpeech(
      (transcript) => {
        setIsListening(false);
        const trimmedTranscript = transcript.trim();
        setPracticeTypeInput(trimmedTranscript);

        // A two-meaning word needs the second box as well, so speaking only fills the first.
        if (twoMeanings(currentPracticeWord)) return;

        const { isCorrect, expectedDisplay } = evaluateAnswer(trimmedTranscript, currentPracticeWord, practiceDirection);

        if (isCorrect) {
          playSound('correct');
          setPracticeScore((prev) => prev + 1);
          if (onCorrectAnswer) {
            onCorrectAnswer(15, 5);
          }
          if (practiceDirection === 'EN_TO_DE') {
            speakGerman(expectedDisplay);
          }

          // Process FSRS review algorithm if in Review mode
          if (flashcardSubMode === 'review') {
            const existing = fsrsRecords[currentPracticeWord.id] || {
              wordId: currentPracticeWord.id,
              status: 'review' as const,
              isUnlocked: true,
              stability: 1.0,
              difficulty: 5.0,
              intervalDays: 1,
              nextReviewDate: new Date().toISOString(),
            };

            const lastReviewedTime = existing.lastReviewedAt ? new Date(existing.lastReviewedAt).getTime() : Date.now();
            const daysElapsed = Math.max(0, (Date.now() - lastReviewedTime) / (1000 * 60 * 60 * 24));

            const fsrsResult = processFSRSReview(
              true,
              existing.stability,
              existing.difficulty,
              daysElapsed
            );

            setFsrsRecords((prev) => ({
              ...prev,
              [currentPracticeWord.id]: {
                ...existing,
                status: 'review',
                isUnlocked: true,
                stability: fsrsResult.newStability,
                difficulty: fsrsResult.newDifficulty,
                intervalDays: fsrsResult.nextInterval,
                nextReviewDate: fsrsResult.nextReviewDate,
                lastReviewedAt: new Date().toISOString(),
                repetitionCount: (existing.repetitionCount || 0) + 1,
              },
            }));
          }

          setPracticeFeedback({
            correct: true,
            userText: trimmedTranscript,
            expected: expectedDisplay,
          });
        } else {
          // Focus input so user can edit, backspace, or re-speak
          practiceTypeInputRef.current?.focus();
        }
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

  const handleNextPractice = () => {
    playSound('tap');
    // Inside the tap, so iOS keeps the keyboard up for the next card.
    practiceTypeInputRef.current?.focus();
    const activeQueue = practiceQueue.length > 0 ? practiceQueue : filteredWords;

    if (practiceQueueIndex + 1 < activeQueue.length) {
      // Continue through current queue
      setPracticeFeedback(null);
      setPracticeTypeInput('');
    setPracticeTypeInput2('');
      setIsListening(false);
      setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      setPracticeQueueIndex((prev) => prev + 1);
    } else {
      // Reached the end of the current queue!
      if (currentRedoBatch.length > 0) {
        // Redo mistakes session!
        playSound('tap');
        setPracticeQueue([...currentRedoBatch]);
        setPracticeQueueIndex(0);
        setCurrentRedoBatch([]);
        setRoundNumber((prev) => prev + 1);
        setPracticeFeedback(null);
        setPracticeTypeInput('');
    setPracticeTypeInput2('');
        setIsListening(false);
        setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      } else {
        // All words answered correctly and all mistakes resolved!
        playSound('correct');
        clearReviewSession(); // finished, so there is nothing to come back to
        setResumedSession(false);
        setIsPracticeComplete(true);
        setPracticeFeedback(null);
        setPracticeTypeInput('');
    setPracticeTypeInput2('');
        setIsListening(false);

        // Activation Rule: When a user finishes the "Practice" session for a lesson,
        // set isUnlocked: true and status: 'review' so those words enter Review pool starting the next day.
        if (flashcardSubMode === 'practice') {
          const completedWordIds = filteredWords.map((w) => w.id);
          setFsrsRecords((prev) => unlockWordsAfterPractice(completedWordIds, prev));
          // ...and the lesson is now ready to practise in Der/Die/Das and Plural (one notice per lesson).
          if (typeof selectedLektion === 'number') {
            const level = selectedLevel;
            const lesson = selectedLektion;
            updateDrillPractice((prev) => markLessonReadyForDrills(prev, level, lesson, filteredWords));
          }
          if (typeof selectedLektion === 'number') {
            recordLessonPracticeCompleted(selectedLevel, selectedLektion);
          }
        }
      }
    }
  };

  const restartPracticeSession = () => {
    playSound('tap');
    let freshQueue: WordEntry[] = [];
    if (flashcardSubMode === 'review') {
      freshQueue = globalDueWords.length > 0 ? [...globalDueWords] : [...globalUnlockedWords];
    } else {
      freshQueue = shuffled(filteredWords);
    }

    setPracticeQueue(freshQueue);
    setSessionInitialCount(freshQueue.length);
    setInitialMistakeWordIds([]);
    setPracticeQueueIndex(0);
    setCurrentRedoBatch([]);
    setRoundNumber(1);
    setMistakeCounts({});
    setMistakeWords([]);
    setPracticeScore(0);
    setIsPracticeComplete(false);
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsListening(false);
    setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
  };

  const handleNextFlashcard = () => {
    playSound('tap');
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsCardFlipped(false);
    setIsListening(false);
    if (flashcardIndex + 1 >= (filteredWords.length || 1)) {
      if (typeof selectedLektion === 'number') {
        recordLessonLearnCompleted(selectedLevel, selectedLektion);
      }
      setIsLearnComplete(true);
      playSound('correct');
    } else {
      setFlashcardIndex((prev) => prev + 1);
    }
  };

  const handlePrevFlashcard = () => {
    playSound('tap');
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setPracticeTypeInput2('');
    setIsCardFlipped(false);
    setIsListening(false);
    if (isLearnComplete) {
      setIsLearnComplete(false);
      setFlashcardIndex(Math.max(0, (filteredWords.length || 1) - 1));
      return;
    }
    setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : (filteredWords.length || 1) - 1));
  };

  // Learn: swipe left = next card, swipe right = previous, with a slide. The card slides out
  // as it is (front or back), and the next one slides in already on its front, so neither the
  // back of the current card nor the next card's back is ever revealed.
  const [cardDragX, setCardDragX] = useState(0);
  const [cardSlide, setCardSlide] = useState<{ phase: 'idle' | 'out' | 'in'; dir: 1 | -1 }>({ phase: 'idle', dir: -1 });
  const cardDragStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const cardWasDragged = useRef(false);
  const SWIPE_DISTANCE = 60;
  const SLIDE_MS = 180;

  /** dir -1 = next (card leaves to the left), +1 = previous (leaves to the right). */
  const goToCard = (dir: 1 | -1) => {
    if (cardSlide.phase !== 'idle') return;
    const navigate = dir === -1 ? handleNextFlashcard : handlePrevFlashcard;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setCardDragX(0);
      navigate();
      return;
    }
    setCardSlide({ phase: 'out', dir });
    window.setTimeout(() => {
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

  const cardSlideStyle: React.CSSProperties =
    cardSlide.phase === 'out'
      ? { transform: `translateX(${cardSlide.dir * 110}%)`, opacity: 0, transition: `transform ${SLIDE_MS}ms ease-in, opacity ${SLIDE_MS}ms ease-in` }
      : cardSlide.phase === 'in'
      ? { transform: `translateX(${-cardSlide.dir * 110}%)`, opacity: 0, transition: 'none' }
      : {
          transform: `translateX(${cardDragX}px) rotate(${cardDragX / 40}deg)`,
          transition: cardDragStart.current ? 'none' : `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out`,
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
    setFlashcardSubMode('learn');
    setSessionStarted(false);
    setDrillSubMode('practice');
    setDrillStarted(false);
    // Practice keeps nothing when you walk out, so none of it should be
    // waiting when you come back. The next run starts from the top, shuffled.
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
  const isPracticeInProgress =
    activeExerciseMode === 'explorer' &&
    (flashcardSubMode === 'practice' || flashcardSubMode === 'review') &&
    !isPracticeComplete &&
    (practiceQueueIndex > 0 || practiceFeedback !== null || roundNumber > 1 || Object.keys(mistakeCounts).length > 0);

  useEffect(() => {
    if (onQuizActiveChange) {
      // In Review each answer is scheduled as it is given, so leaving loses
      // nothing — the question asked on the way out says so.
      onQuizActiveChange(isPracticeInProgress, flashcardSubMode === 'review');
    }
  }, [isPracticeInProgress, flashcardSubMode, onQuizActiveChange]);

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
      } else {
        setPracticeQueue(shuffled(list));
        setSessionInitialCount(list.length);
      }

      setInitialMistakeWordIds([]);
      setPracticeQueueIndex(0);
      setCurrentRedoBatch([]);
      setRoundNumber(1);
      setMistakeCounts({});
      setMistakeWords([]);
      setPracticeScore(0);
      setIsPracticeComplete(false);
      setIsLearnComplete(false);
      setPracticeFeedback(null);
      setPracticeTypeInput('');
    setPracticeTypeInput2('');
      setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
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
      setPracticeFeedback(null);
      setPracticeTypeInput('');
    setPracticeTypeInput2('');
      setIsListening(false);

      if (mode === 'learn') {
        setIsCardFlipped(false);
      } else if (mode === 'practice') {
        setPracticeQueue(shuffled(filteredWords));
        setSessionInitialCount(filteredWords.length);
        setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      } else if (mode === 'review') {
        const q = shuffled(globalDueWords.length > 0 ? globalDueWords : globalUnlockedWords);
        setPracticeQueue(q);
        setSessionInitialCount(q.length);
        setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      }
    };

    if (isPracticeInProgress && onRequestAbandon) {
      onRequestAbandon(doSwitch);
    } else {
      doSwitch();
    }
  };

  // Keyboard Hotkey Listener for Flashcards (Learn & Practice)
  useEffect(() => {
    if (activeExerciseMode !== 'explorer' || isHotkeyModalOpen) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement)?.tagName;
      const isInput = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT';

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
          setIsCardFlipped((prev) => !prev);
        } else if (matchesKey(hotkeys.next)) {
          e.preventDefault();
          handleNextFlashcard();
        } else if (matchesKey(hotkeys.prev)) {
          e.preventDefault();
          handlePrevFlashcard();
        } else if (matchesKey(hotkeys.singularAudio)) {
          e.preventDefault();
          playSound('tap');
          if (currentFlashcard) {
            speakGerman(
              currentFlashcard.nounDetails?.gender
                ? `${currentFlashcard.nounDetails.gender} ${currentFlashcard.lemma}`
                : currentFlashcard.lemma
            );
          }
        } else if (matchesKey(hotkeys.pluralAudio)) {
          e.preventDefault();
          const pluralStr = getCleanPluralString(currentFlashcard);
          if (pluralStr) {
            playSound('tap');
            speakGerman(pluralStr);
          }
        } else if (
          matchesKey(hotkeys.exampleAudio) ||
          (hotkeys.exampleAudio === 'Meta' && (e.key === 'Meta' || e.key === 'Control' || e.metaKey || e.ctrlKey))
        ) {
          e.preventDefault();
          if (currentFlashcard) {
            const example = getExampleSentence(currentFlashcard);
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
            if (practiceFeedback.expected) {
              speakGerman(practiceFeedback.expected);
            }
          }
        } else {
          // Unanswered state in practice
          if (matchesKey(hotkeys.practiceAudio) || e.code === 'Space') {
            if (!isInput) {
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
  const handleGenderChoice = (choice: Gender) => {
    if (!activeBlitzNoun || blitzFeedback) return;
    const isCorrect = activeBlitzNoun.nounDetails?.gender === choice;
    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(10);
      speakGerman(fillBlank(articleSentence(activeBlitzNoun), choice));
    } else {
      playSound('wrong');
      onWrongAnswer();
      speakGerman(fillBlank(articleSentence(activeBlitzNoun), activeBlitzNoun.nounDetails?.gender ?? ''));
    }
    recordDrillAnswer('article', activeBlitzNoun, isCorrect);
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
  const isPluralCorrect = (answer: string, word: WordEntry) => {
    const cleanUser = answer.trim().replace(/[.!?,]+$/, '').toLowerCase();
    const cleanExpected = (word.nounDetails?.plural || '').toLowerCase();
    return cleanUser === cleanExpected || cleanUser === cleanExpected.replace(/^die\s+/, '');
  };

  const handlePluralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePluralNoun || pluralFeedback || !pluralInput.trim()) return;
    submitPluralAnswer(pluralInput, activePluralNoun);
  };

  const submitPluralAnswer = (answer: string, noun: WordEntry) => {
    const expected = noun.nounDetails?.plural || '';
    const isCorrect = isPluralCorrect(answer, noun);

    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(15);
      speakGerman(fillBlank(pluralSentence(noun), barePlural(noun)));
    } else {
      playSound('wrong');
      onWrongAnswer();
      speakGerman(fillBlank(pluralSentence(noun), barePlural(noun)));
    }
    recordDrillAnswer('plural', noun, isCorrect);
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
  const availableExercises = [
    {
      id: 'explorer',
      title: 'Flashcard',
    },
    {
      id: 'gender_blitz',
      title: 'Der / Die / Das',
    },
    {
      id: 'plural_drill',
      title: 'Plural',
    },
  ];

  // VIEW 1: VOCABULARY AREA HUB (3 Exercises Only - Clean & Centered)
  if (!activeExerciseMode) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center gap-4 py-2 animate-fadeIn overflow-hidden">
        {/* Available Exercises Grid (Exactly 3 Boxes - 1 Word/Title Each) */}
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-5">
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
                const due = (ex.id === 'gender_blitz' ? articlePool : pluralPool).due.length;
                const waiting = (ex.id === 'gender_blitz' ? articleReadyLessons : pluralReadyLessons).length;
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

  const getNounColorClass = (gender?: Gender) => {
    switch (gender) {
      case 'der':
        return 'text-blue-600 dark:text-blue-400';
      case 'die':
        return 'text-pink-600 dark:text-pink-400';
      case 'das':
        return 'text-[#8B4513] dark:text-[#E0A066]';
      default:
        return 'text-zinc-900 dark:text-zinc-100';
    }
  };

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
  const renderFilterBanner = (waiting: { level: string; lektion: number }[] = []) => {
    const hasIntro = INITIAL_VOCABULARY.some((w) => w.level === selectedLevel && w.lektion === 0);
    const introWaiting = waiting.some((l) => l.level === selectedLevel && l.lektion === 0);
    const introDone = isLessonFullyCompleted(selectedLevel, 0);
    return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2">
        {/* Filter 1: A1 / A2 / B1 Level Selector */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((lvl) => (
            <button
              key={lvl}
              onClick={() => {
                playSound('tap');
                handleFilterChange(lvl);
              }}
              className={`relative px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {lvl}
              {waiting.some((l) => l.level === lvl) && (
                <span
                  aria-label={appLanguage === 'en' ? 'has a lesson to practise' : 'hat eine Lektion zum Üben'}
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-900"
                />
              )}
            </button>
          ))}
        </div>

        {/* Filter 2: Lesson Selector Button / Dropdown */}
        <div className="relative shrink-0">
          <button
            id="lesson-filter-button"
            onClick={() => {
              playSound('tap');
              setIsLessonDropdownOpen(!isLessonDropdownOpen);
            }}
            className={`px-2.5 sm:px-3 py-1 active:scale-98 font-black text-xs rounded-xl shadow-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
              typeof selectedLektion === 'number' && waiting.some((l) => l.level === selectedLevel && l.lektion === selectedLektion)
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-500'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <span>
              {selectedLektion === 'ALL'
                ? (appLanguage === 'en' ? 'All' : 'Alle')
                : selectedLektion === 0
                ? 'Intro'
                : selectedLektion === 'PART_1'
                ? `${selectedLevel}.1`
                : selectedLektion === 'PART_2'
                ? `${selectedLevel}.2`
                : `${appLanguage === 'en' ? 'Lesson' : 'Lektion'} ${selectedLektion}`}
            </span>
            <ChevronDown
              className={`w-3 h-3 text-zinc-500 transition-transform ${
                isLessonDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Popover for Lessons & Ranges */}
          {isLessonDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setIsLessonDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 z-30 w-80 sm:w-[360px] bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 space-y-2.5 animate-fadeIn">
                {/* Header with All Button */}
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">
                    {appLanguage === 'en' ? 'Lesson Filter:' : 'Lektionsfilter:'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Only A1.1 has an Intro (the Vorkurs), so the button shows there */}
                    {hasIntro && (
                      <button
                        onClick={() => {
                          playSound('tap');
                          handleFilterChange(undefined, 0);
                        }}
                        title={appLanguage === 'en' ? 'Intro (before Lesson 1)' : 'Intro (vor Lektion 1)'}
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                          selectedLektion === 0
                            ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ${
                                introWaiting ? 'ring-amber-400' : 'ring-zinc-400/80 dark:ring-zinc-500/80'
                              }`
                            : introWaiting
                            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500'
                            : introDone
                            ? 'bg-zinc-400 hover:bg-zinc-450 text-zinc-950 dark:bg-zinc-500 dark:text-zinc-950 border border-zinc-500/70'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Intro
                      </button>
                    )}

                    <button
                      onClick={() => {
                        playSound('tap');
                        handleFilterChange(undefined, 'ALL');
                      }}
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        selectedLektion === 'ALL'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      {appLanguage === 'en' ? 'All' : 'Alle'}
                    </button>
                  </div>
                </div>

                {/* Grid: Row 1 = 1 to 7 + Level.1, Row 2 = 8 to 14 + Level.2 */}
                <div className="space-y-1.5 p-0.5">
                  <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.35fr)] gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                      const isDone = isLessonFullyCompleted(selectedLevel, num);
                      const isSelected = selectedLektion === num;
                      const isWaiting = waiting.some((l) => l.level === selectedLevel && l.lektion === num);
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            playSound('tap');
                            handleFilterChange(undefined, num);
                          }}
                          title={
                            isDone
                              ? (appLanguage === 'en' ? `Lesson ${num}: Completed` : `Lektion ${num}: Abgeschlossen`)
                              : (appLanguage === 'en' ? `Lesson ${num}` : `Lektion ${num}`)
                          }
                          className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ${isWaiting ? 'ring-amber-400' : 'ring-zinc-400/80 dark:ring-zinc-500/80'}`
                              : isWaiting
                              ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 shadow-2xs'
                              : isDone
                              ? 'bg-zinc-400 hover:bg-zinc-450 text-zinc-950 dark:bg-zinc-500 dark:hover:bg-zinc-450 dark:text-zinc-950 border border-zinc-500/70 dark:border-zinc-400/70 shadow-2xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    {/* Level.1 button e.g. A1.1, A2.1, B1.1 */}
                    <button
                      onClick={() => {
                        playSound('tap');
                        handleFilterChange(undefined, 'PART_1');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        selectedLektion === 'PART_1'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-250 dark:hover:bg-zinc-650'
                      }`}
                    >
                      {selectedLevel}.1
                    </button>
                  </div>

                  <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.35fr)] gap-1.5">
                    {[8, 9, 10, 11, 12, 13, 14].map((num) => {
                      const isDone = isLessonFullyCompleted(selectedLevel, num);
                      const isSelected = selectedLektion === num;
                      const isWaiting = waiting.some((l) => l.level === selectedLevel && l.lektion === num);
                      return (
                        <button
                          key={num}
                          onClick={() => {
                            playSound('tap');
                            handleFilterChange(undefined, num);
                          }}
                          title={
                            isDone
                              ? (appLanguage === 'en' ? `Lesson ${num}: Completed` : `Lektion ${num}: Abgeschlossen`)
                              : (appLanguage === 'en' ? `Lesson ${num}` : `Lektion ${num}`)
                          }
                          className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ${isWaiting ? 'ring-amber-400' : 'ring-zinc-400/80 dark:ring-zinc-500/80'}`
                              : isWaiting
                              ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 shadow-2xs'
                              : isDone
                              ? 'bg-zinc-400 hover:bg-zinc-450 text-zinc-950 dark:bg-zinc-500 dark:hover:bg-zinc-450 dark:text-zinc-950 border border-zinc-500/70 dark:border-zinc-400/70 shadow-2xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    {/* Level.2 button e.g. A1.2, A2.2, B1.2 */}
                    <button
                      onClick={() => {
                        playSound('tap');
                        handleFilterChange(undefined, 'PART_2');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        selectedLektion === 'PART_2'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-250 dark:hover:bg-zinc-650'
                      }`}
                    >
                      {selectedLevel}.2
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
    );
  };

  {/* Banner 2: Flashcard Sub-Mode Selector (Learn, Practice, Review) */}
  const renderModeBanner = () => (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
        {/* Learn Button */}
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
    renderFilterBanner(activeDrillSkill === 'plural' ? pluralReadyLessons : articleReadyLessons);

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

  // Der/Die/Das and Plural: Practice | Review switch, styled like Flashcard's
  const renderDrillModeSwitch = () => {
    const due = (activeDrillSkill === 'plural' ? pluralPool : articlePool).due.length;
    const waiting = (activeDrillSkill === 'plural' ? pluralReadyLessons : articleReadyLessons).length;
    const pill = (active: boolean) =>
      `py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
        active
          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
      }`;
    const choose = (mode: 'practice' | 'review') => {
      if (mode === drillSubMode) return;
      playSound('tap');
      setBlitzFeedback(null);
      setPluralFeedback(null);
      setPluralInput('');
      setDrillSubMode(mode);
    };
    return (
      <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
        <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
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
      {/* SUB-MODE 1: FLASHCARD DRILL */}
      {activeExerciseMode === 'explorer' && (
        <div className="max-w-xl mx-auto w-full h-full flex flex-col justify-between">
          {/* Both bars belong to Learn. Practice and Review are the card, the
              keyboard and the header — there is no room for anything else, and
              nothing here needs changing mid-session. Back arrow to come out. */}
          {/* The bars belong to Learn and to the Start screen. Once the cards
              are up it is the header, the card and the keyboard. */}
          {(flashcardSubMode === 'learn' || !sessionStarted) && (
            <>
              {renderModeBanner()}
              {renderFilterBanner()}
            </>
          )}

          <div className="flex-1 flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
            {flashcardSubMode !== 'learn' && !sessionStarted && !(flashcardSubMode === 'review' && practiceQueue.length === 0) ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
                <div className="space-y-3 max-w-xs">
                  {flashcardSubMode === 'practice' ? (
                    <>
                      <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                        {selectedLevel}
                        {typeof selectedLektion === 'number'
                          ? ` · ${selectedLektion === 0 ? 'Intro' : `${appLanguage === 'en' ? 'Lesson' : 'Lektion'} ${selectedLektion}`}`
                          : ''}
                      </p>
                      <p className="font-black text-base text-zinc-900 dark:text-zinc-100 leading-relaxed">
                        {lessonTopics(filteredWords) || (appLanguage === 'en' ? 'Practice' : 'Üben')}
                      </p>
                    </>
                  ) : (
                    <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
                      {appLanguage === 'en' ? 'Review' : 'Wiederholen'}
                    </p>
                  )}
                  <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                    {flashcardSubMode === 'practice'
                      ? `${filteredWords.length} ${appLanguage === 'en' ? 'words' : 'Wörter'}`
                      : `${practiceQueue.length} ${appLanguage === 'en' ? 'words due' : 'Wörter fällig'}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound('tap');
                    setSessionStarted(true);
                  }}
                  className="w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all"
                >
                  {appLanguage === 'en' ? 'Start' : 'Starten'}
                </button>
              </div>
            ) : flashcardSubMode === 'review' && practiceQueue.length === 0 ? (
              /* Review with nothing unlocked: say so, instead of showing words you have not met */
              <div className="py-6 text-center">
                <p className="font-black text-zinc-900 dark:text-zinc-100">
                  {appLanguage === 'en' ? 'Nothing to review yet' : 'Noch nichts zu wiederholen'}
                </p>
              </div>
            ) : filteredWords.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="font-bold text-zinc-500">
                  {appLanguage === 'en' ? 'No words found for this filter.' : 'Keine Wörter für diesen Filter gefunden.'}
                </p>
                <button
                  onClick={() => {
                    setSelectedLevel('A1');
                    setSelectedLektion('ALL');
                    setFlashcardIndex(0);
                  }}
                  className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer"
                >
                  {appLanguage === 'en' ? 'Reset to A1 (All Lessons)' : 'Auf A1 (Alle Lektionen) zurücksetzen'}
                </button>
              </div>
            ) : flashcardSubMode === 'learn' ? (
              isLearnComplete ? (
                /* LEARN ROUND COMPLETE VIEW */
                <div className="flex-1 flex flex-col justify-between items-center text-center p-3 sm:p-5 animate-fadeIn w-full space-y-3 sm:space-y-4">
                  <div className="text-center space-y-1 pt-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black mb-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>{appLanguage === 'en' ? 'Learn Round Complete' : 'Lernrunde Abgeschlossen'}</span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {selectedLevel} • {typeof selectedLektion === 'number' ? `${appLanguage === 'en' ? 'Lesson' : 'Lektion'} ${selectedLektion}` : (selectedLektion === 'PART_1' ? `${selectedLevel}.1` : selectedLektion === 'PART_2' ? `${selectedLevel}.2` : (appLanguage === 'en' ? 'All Lessons' : 'Alle Lektionen'))}
                    </h3>
                    <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {appLanguage === 'en'
                        ? `You have browsed all ${filteredWords.length} flashcards in this round.`
                        : `Du hast alle ${filteredWords.length} Lernkarten in dieser Runde angesehen.`}
                    </p>
                  </div>

                  {/* Lesson Mastery Card */}
                  {typeof selectedLektion === 'number' && (
                    <div className="w-full max-w-sm bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl p-3.5 border border-zinc-200 dark:border-zinc-700 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        {appLanguage === 'en' ? 'Lesson Mastery Progress' : 'Lektions-Fortschritt'}
                      </span>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                          <span className="font-bold text-emerald-800 dark:text-emerald-300">1. {appLanguage === 'en' ? 'Learn Cards' : 'Lernkarten'}</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> {appLanguage === 'en' ? 'Completed' : 'Erledigt'}
                          </span>
                        </div>
                        <div className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-xl border ${
                          isLessonPracticeDone(selectedLevel, selectedLektion)
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                        }`}>
                          <span className="font-bold">2. {appLanguage === 'en' ? 'Practice Drill' : 'Übungsrunde'}</span>
                          <span className="font-black">
                            {isLessonPracticeDone(selectedLevel, selectedLektion) ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <Check className="w-3.5 h-3.5 stroke-[3]" /> {appLanguage === 'en' ? 'Completed' : 'Erledigt'}
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400">
                                {appLanguage === 'en' ? 'Pending' : 'Ausstehend'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {isLessonFullyCompleted(selectedLevel, selectedLektion) ? (
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 pt-1">
                          🌟 {appLanguage === 'en' ? 'Lesson Mastered! Sign of completion added to filter.' : 'Lektion gemeistert! Abzeichen im Filter freigeschaltet.'}
                        </p>
                      ) : (
                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 pt-1">
                          💡 {appLanguage === 'en' ? 'Complete 1 round of Practice to mark this lesson as completed in the lesson filter!' : 'Schließe 1 Übungsrunde ab, um diese Lektion im Filter als fertig zu markieren!'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="w-full max-w-sm flex flex-col sm:flex-row items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLearnComplete(false);
                        setFlashcardIndex(0);
                      }}
                      className="w-full sm:flex-1 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all"
                    >
                      {appLanguage === 'en' ? 'Review Cards Again' : 'Karten wiederholen'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubModeChange('practice')}
                      className="w-full sm:flex-1 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs border border-transparent shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>{appLanguage === 'en' ? 'Go to Practice' : 'Zu den Übungen'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* LEARN SUB-MODE: Layout adhering to reference card specification */
                <>
                  {/* Top Info Bar: Progress Counter & Direction Toggle (styled matching Practice & Review) */}
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      playSound('tap');
                      setIsCardFlipped(false);
                      setLearnDirection((prev) => (prev === 'DE_TO_EN' ? 'EN_TO_DE' : 'DE_TO_EN'));
                    }}
                    className="px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all"
                    title={
                      learnDirection === 'DE_TO_EN'
                        ? (appLanguage === 'en' ? 'Click to switch to EN → DE' : 'Klicken für EN → DE')
                        : (appLanguage === 'en' ? 'Click to switch to DE → EN' : 'Klicken für DE → EN')
                    }
                  >
                    <span>{learnDirection === 'DE_TO_EN' ? 'DE → EN' : 'EN → DE'}</span>
                  </button>

                  <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
                    {flashcardIndex + 1} / {filteredWords.length}
                  </span>
                </div>

                {/* Interactive Flip Card */}
                {(() => {
                  const cleanPlural = getCleanPluralString(currentFlashcard);
                  const example = currentFlashcard ? getExampleSentence(currentFlashcard) : null;

                  return (
                    <div
                      {...cardSwipeHandlers}
                      onClick={() => {
                        if (cardWasDragged.current) {
                          cardWasDragged.current = false;
                          return; // that was a swipe, not a tap
                        }
                        playSound('tap');
                        setIsCardFlipped(!isCardFlipped);
                      }}
                      style={{ ...cardSlideStyle, touchAction: 'pan-y' }}
                      className="flex-1 min-h-[220px] sm:min-h-[260px] p-5 sm:p-7 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-between cursor-pointer hover:border-zinc-950 dark:hover:border-white select-none group"
                    >
                      {/* Top spacer for optical centering */}
                      <div className="w-full shrink-0" />

                      {/* Card Center: Direction 1 (DE_TO_EN) or Direction 2 (EN_TO_DE) */}
                      <div className="w-full flex flex-col items-center justify-center text-center">
                        {learnDirection === 'DE_TO_EN' ? (
                          !isCardFlipped ? (
                            /* Direction 1 Front: German Singular + Plural directly underneath */
                            <div className="space-y-1.5 w-full">
                              {currentFlashcard?.nounDetails?.gender ? (
                                <>
                                  <h3 className="text-2xl sm:text-3xl tracking-tight flex items-baseline justify-center gap-2">
                                    <span className={`font-normal font-sans ${getNounColorClass(currentFlashcard.nounDetails.gender)}`}>
                                      {currentFlashcard.nounDetails.gender}
                                    </span>
                                    <span className="font-black text-zinc-900 dark:text-zinc-100">
                                      {currentFlashcard.lemma}
                                    </span>
                                  </h3>

                                  {/* Plural directly underneath singular with subtle Pl. indicator */}
                                  {cleanPlural && (
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                      <h4 className="text-xl sm:text-2xl tracking-tight flex items-baseline justify-center gap-2">
                                        <span className="font-normal font-sans text-pink-600 dark:text-pink-400">
                                          die
                                        </span>
                                        <span className="font-black text-zinc-900 dark:text-zinc-100">
                                          {cleanPlural.replace(/^die\s+/i, '')}
                                        </span>
                                      </h4>
                                      <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 bg-zinc-200/70 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md self-center whitespace-nowrap">
                                        Plural
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                  {currentFlashcard?.lemma}
                                </h3>
                              )}
                            </div>
                          ) : (
                            /* Direction 1 Back: English meaning directly without plural */
                            <div className="space-y-1.5 text-center w-full">
                              {(() => {
                                const parts = formatTranslationList(currentFlashcard?.translation);
                                if (parts.length > 1) {
                                  return (
                                    <div className="space-y-1.5 text-center">
                                      {parts.map((p, idx) => (
                                        <div key={idx} className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
                                          <span className="text-zinc-400 font-bold mr-1.5 text-base sm:text-lg">{idx + 1}.</span>
                                          {p}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                                    {parts[0] || currentFlashcard?.translation}
                                  </h3>
                                );
                              })()}
                            </div>
                          )
                        ) : (
                          /* Direction 2 (EN_TO_DE) */
                          !isCardFlipped ? (
                            /* Direction 2 Front: English meaning directly without plural */
                            <div className="space-y-1.5 text-center w-full">
                              {(() => {
                                const parts = formatTranslationList(currentFlashcard?.translation);
                                if (parts.length > 1) {
                                  return (
                                    <div className="space-y-1.5 text-center">
                                      {parts.map((p, idx) => (
                                        <div key={idx} className="text-xl sm:text-2xl font-black text-zinc-950 dark:text-white">
                                          <span className="text-zinc-400 font-bold mr-1.5 text-base sm:text-lg">{idx + 1}.</span>
                                          {p}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return (
                                  <h3 className="text-2xl sm:text-3xl font-black text-zinc-950 dark:text-white tracking-tight">
                                    {parts[0] || currentFlashcard?.translation}
                                  </h3>
                                );
                              })()}
                            </div>
                          ) : (
                            /* Direction 2 Back: German Singular + Plural directly underneath */
                            <div className="space-y-1.5 w-full">
                              {currentFlashcard?.nounDetails?.gender ? (
                                <>
                                  <h3 className="text-2xl sm:text-3xl tracking-tight flex items-baseline justify-center gap-2">
                                    <span className={`font-normal font-sans ${getNounColorClass(currentFlashcard.nounDetails.gender)}`}>
                                      {currentFlashcard.nounDetails.gender}
                                    </span>
                                    <span className="font-black text-zinc-900 dark:text-zinc-100">
                                      {currentFlashcard.lemma}
                                    </span>
                                  </h3>
                                  {cleanPlural && (
                                    <div className="flex items-center justify-center gap-2 mt-1">
                                      <h4 className="text-xl sm:text-2xl tracking-tight flex items-baseline justify-center gap-2">
                                        <span className="font-normal font-sans text-pink-600 dark:text-pink-400">
                                          die
                                        </span>
                                        <span className="font-black text-zinc-900 dark:text-zinc-100">
                                          {cleanPlural.replace(/^die\s+/i, '')}
                                        </span>
                                      </h4>
                                      <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-zinc-400 dark:text-zinc-500 bg-zinc-200/70 dark:bg-zinc-700/60 px-2 py-0.5 rounded-md self-center whitespace-nowrap">
                                        Plural
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                                  {currentFlashcard?.lemma}
                                </h3>
                              )}
                            </div>
                          )
                        )}
                      </div>

                      {/* Bottom of Card: Example sentence as shown in mockup */}
                      {example && (
                        (learnDirection === 'DE_TO_EN' && isCardFlipped) ||
                        (learnDirection === 'EN_TO_DE')
                      ) ? (
                        <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-700/80 w-full max-w-sm mx-auto text-center space-y-1 shrink-0">
                          {learnDirection === 'DE_TO_EN' && isCardFlipped ? (
                            <>
                              <div className="flex items-center justify-center gap-2">
                                <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                                  {currentFlashcard && (
                                    <SentenceWithWord sentence={example.german} word={currentFlashcard} />
                                  )}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSound('tap');
                                    speakGerman(example.german);
                                  }}
                                  title={appLanguage === 'en' ? 'Listen to sentence' : 'Satz anhören'}
                                  className="p-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shrink-0"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {example.english && (
                                <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                  ({example.english})
                                </p>
                              )}
                            </>
                          ) : learnDirection === 'EN_TO_DE' && !isCardFlipped ? (
                            example.english ? (
                              <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                ({example.english})
                              </p>
                            ) : null
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-2">
                                <p className="text-sm sm:text-base font-medium text-zinc-900 dark:text-zinc-100 leading-snug">
                                  {currentFlashcard && (
                                    <SentenceWithWord sentence={example.german} word={currentFlashcard} />
                                  )}
                                </p>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playSound('tap');
                                    speakGerman(example.german);
                                  }}
                                  title={appLanguage === 'en' ? 'Listen to sentence' : 'Satz anhören'}
                                  className="p-1 rounded-lg bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shrink-0"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {example.english && (
                                <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                  ({example.english})
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full shrink-0 h-4" />
                      )}
                    </div>
                  );
                })()}

                {/* Action Buttons: Prev + Audio (1 or 2 buttons) + Next */}
                <div className="flex items-center gap-2 mt-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => goToCard(1)}
                    className="p-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Previous"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  {/* Audio button(s): 2 buttons for noun with plural, 1 button for regular */}
                  {currentFlashcard?.nounDetails?.gender && getCleanPluralString(currentFlashcard) ? (
                    <div className="flex-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          playSound('tap');
                          if (currentFlashcard) {
                            speakGerman(`${currentFlashcard.nounDetails!.gender} ${currentFlashcard.lemma}`);
                          }
                        }}
                        className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate">{appLanguage === 'en' ? 'Singular' : 'Singular'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playSound('tap');
                          if (currentFlashcard) {
                            speakGerman(getCleanPluralString(currentFlashcard)!);
                          }
                        }}
                        className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate">{appLanguage === 'en' ? 'Plural' : 'Plural'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        if (currentFlashcard) {
                          speakGerman(
                            currentFlashcard.nounDetails?.gender
                              ? `${currentFlashcard.nounDetails.gender} ${currentFlashcard.lemma}`
                              : currentFlashcard.lemma
                          );
                        }
                      }}
                      className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>{appLanguage === 'en' ? 'Audio' : 'Aussprache'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => goToCard(-1)}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs border border-transparent cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Next"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )) : (
              /* PRACTICE & REVIEW SUB-MODE: Unified Type & Speak input with Contextual Feedback */
              isPracticeComplete ? (
                /* Practice / Review Session Complete View */
                <div className="flex-1 flex flex-col justify-between items-center text-center p-2.5 sm:p-3.5 animate-fadeIn w-full space-y-2.5 sm:space-y-3">
                  {/* Top Level, Lesson, and Total Words Heading */}
                  <div className="text-center space-y-0.5 pt-1">
                    <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {selectedLevel} • {selectedLektion === 'ALL'
                        ? (appLanguage === 'en' ? 'All Lessons' : 'Alle Lektionen')
                        : selectedLektion === 'PART_1'
                        ? `${selectedLevel}.1`
                        : selectedLektion === 'PART_2'
                        ? `${selectedLevel}.2`
                        : `${appLanguage === 'en' ? 'Lesson' : 'Lektion'} ${selectedLektion}`}
                    </h3>
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {flashcardSubMode === 'review'
                        ? `${practiceQueue.length || filteredWords.length} ${appLanguage === 'en' ? 'reviewed words' : 'wiederholte Wörter'}`
                        : `${filteredWords.length} ${appLanguage === 'en' ? (filteredWords.length === 1 ? 'total word' : 'total words') : 'Wörter insgesamt'}`}
                    </p>
                  </div>

                  {/* Accuracy, Correct Words, Incorrect Words Stats Grid */}
                  {(() => {
                    const totalWords = sessionInitialCount || (flashcardSubMode === 'review' ? (practiceQueue.length || 10) : filteredWords.length) || 1;
                    const initialMistakesCount = initialMistakeWordIds.length;
                    const initialCorrectCount = Math.max(0, totalWords - initialMistakesCount);
                    const accuracy = Math.round((initialCorrectCount / (totalWords || 1)) * 100);
                    const sortedMistakes = [...mistakeWords].sort((a, b) => (mistakeCounts[b.id] || 1) - (mistakeCounts[a.id] || 1));

                    return (
                      <>
                        <div className="grid grid-cols-3 gap-2 w-full">
                          <div className="bg-zinc-50 dark:bg-zinc-800/80 p-2.5 sm:p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                              {appLanguage === 'en' ? 'Accuracy' : 'Genauigkeit'}
                            </span>
                            <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">
                              {accuracy}%
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-800/80 p-2.5 sm:p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                              {appLanguage === 'en' ? 'Correct' : 'Richtig'}
                            </span>
                            <p className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                              {initialCorrectCount}
                            </p>
                          </div>

                          <div className="bg-zinc-50 dark:bg-zinc-800/80 p-2.5 sm:p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                              {appLanguage === 'en' ? 'Incorrect' : 'Falsch'}
                            </span>
                            <p className="text-lg sm:text-xl font-black text-red-600 dark:text-red-400">
                              {initialMistakesCount}
                            </p>
                          </div>
                        </div>

                        {/* Lesson Mastery Banner when in Practice mode */}
                        {flashcardSubMode === 'practice' && typeof selectedLektion === 'number' && (
                          <div className="w-full flex items-center justify-between p-2 sm:p-2.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">
                                ✓
                              </span>
                              <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">
                                {appLanguage === 'en' ? `Lesson ${selectedLektion} Practice Round Complete` : `Lektion ${selectedLektion} Übungsrunde abgeschlossen`}
                              </span>
                            </div>
                            <span className="text-xs font-black">
                              {isLessonFullyCompleted(selectedLevel, selectedLektion) ? (
                                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" /> {appLanguage === 'en' ? 'Mastered ✓' : 'Gemeistert ✓'}
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400">
                                  {appLanguage === 'en' ? 'Learn round pending' : 'Lernrunde noch offen'}
                                </span>
                              )}
                            </span>
                          </div>
                        )}

                        {/* Box Container with Mistakes List Line-by-Line & Mistake Count on the Right */}
                        <div className="w-full flex-1 flex flex-col min-h-0 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-2.5 sm:p-3 space-y-2">
                          <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                              {appLanguage === 'en' ? 'Mistakes' : 'Fehler'}
                            </span>
                            <span className="text-[11px] font-bold text-zinc-400">
                              {sortedMistakes.length > 0
                                ? `${sortedMistakes.length} ${appLanguage === 'en' ? (sortedMistakes.length === 1 ? 'word' : 'words') : 'Wörter'}`
                                : (appLanguage === 'en' ? '0' : '0')}
                            </span>
                          </div>

                          <div className="flex-1 overflow-y-auto max-h-44 sm:max-h-52 space-y-1.5 pr-0.5 custom-scrollbar">
                            {sortedMistakes.length > 0 ? (
                              sortedMistakes.map((word) => {
                                const count = mistakeCounts[word.id] || 1;
                                const displayGerman = word.nounDetails?.gender
                                  ? `${word.nounDetails.gender} ${word.lemma}`
                                  : word.lemma;

                                return (
                                  <div
                                    key={word.id}
                                    className="flex items-center justify-between p-2 sm:p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs gap-2"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          playSound('tap');
                                          speakGerman(displayGerman);
                                        }}
                                        className="p-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shrink-0 active:scale-95"
                                        title={appLanguage === 'en' ? 'Listen' : 'Anhören'}
                                      >
                                        <Volume2 className="w-3.5 h-3.5" />
                                      </button>
                                      <div className="min-w-0 flex-1 text-left">
                                        <p className="font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 truncate">
                                          {displayGerman}
                                        </p>
                                        <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 truncate">
                                          {word.translation}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Right: Mistake count badge (e.g. 2×, 1× without extra text) */}
                                    <div className="shrink-0 px-2 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg text-xs font-black">
                                      <span>{count}×</span>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="py-5 text-center space-y-1">
                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                  {appLanguage === 'en' ? 'Perfect! No mistakes.' : 'Perfekt! Keine Fehler.'}
                                </p>
                                <p className="text-xs font-medium text-zinc-400">
                                  {appLanguage === 'en' ? 'All words were answered correctly on the 1st try!' : 'Alle Wörter im ersten Versuch richtig beantwortet!'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}

                  {/* Actions: Back to Learn & Practice/Review Again */}
                  <div className="w-full flex items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSubModeChange('learn')}
                      className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {appLanguage === 'en' ? 'Back to Learn' : 'Zurück zum Lernen'}
                    </button>
                    <button
                      type="button"
                      onClick={restartPracticeSession}
                      className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      {flashcardSubMode === 'review'
                        ? (appLanguage === 'en' ? 'Review Again' : 'Erneut wiederholen')
                        : (appLanguage === 'en' ? 'Practice Again' : 'Erneut üben')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs font-bold text-zinc-400">
                    {/* Left: which way this card goes — same pill as Learn, but only a label: picked at
                        random per card, and it ignores taps entirely. */}
                    <div
                      aria-label={practiceDirection === 'EN_TO_DE' ? 'English to German' : 'German to English'}
                      className="pointer-events-none select-none justify-self-start px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 shadow-2xs inline-flex items-center gap-1"
                    >
                      <span>{practiceDirection === 'EN_TO_DE' ? 'EN → DE' : 'DE → EN'}</span>
                    </div>
                    {/* Picked up where you left off */}
                    {resumedSession && flashcardSubMode === 'review' && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        {appLanguage === 'en' ? 'Resumed' : 'Fortgesetzt'}
                      </span>
                    )}
                    {/* Review draws from every lesson, so each card says where it
                        is from, in the middle. That used to be a bar of its own. */}
                    <span className="text-center">
                    {flashcardSubMode === 'review' && currentPracticeWord && (
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {currentPracticeWord.level}
                        {typeof currentPracticeWord.lektion === 'number'
                          ? ` · ${currentPracticeWord.lektion === 0 ? 'Intro' : `L${currentPracticeWord.lektion}`}`
                          : ''}
                      </span>
                    )}
                    </span>
                    {/* Right: card counter & redo-round indicator, as in Learn */}
                    <span className="text-right">
                    {roundNumber > 1 ? (
                      <div className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 shadow-2xs flex items-center space-x-2.5">
                        <span>{appLanguage === 'en' ? `Redo ${roundNumber - 1}` : `Wiederholung ${roundNumber - 1}`}</span>
                        <span className="text-amber-500/70 text-[10px] font-bold">•</span>
                        <span>
                          {(practiceQueueIndex % ((practiceQueue.length > 0 ? practiceQueue : filteredWords).length || 1)) + 1} / {(practiceQueue.length > 0 ? practiceQueue : filteredWords).length}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
                        {(practiceQueueIndex % ((practiceQueue.length > 0 ? practiceQueue : filteredWords).length || 1)) + 1} / {(practiceQueue.length > 0 ? practiceQueue : filteredWords).length}
                      </span>
                    )}
                    </span>
                  </div>

                  {/* Question Box (Maintains full height on correct answers, shrinks only slightly for incorrect feedback to fill gap) */}
                  <div className="w-full bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-center flex-1 min-h-[88px] sm:min-h-[160px] p-4 sm:p-6">
                    <h3 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight text-2xl sm:text-3xl">
                      {practiceDirection === 'EN_TO_DE'
                        ? currentPracticeWord && meaningLines(currentPracticeWord).length > 1
                          ? meaningLines(currentPracticeWord).map((line, i) => (
                              <span key={i} className="block">{`${i + 1}. ${line}`}</span>
                            ))
                          : currentPracticeWord && meaningLines(currentPracticeWord)[0]
                        : currentPracticeWord?.nounDetails?.gender
                        ? `${currentPracticeWord.nounDetails.gender} ${currentPracticeWord.lemma}`
                        : currentPracticeWord?.lemma}
                    </h3>
                  </div>

                  {/* Practice Answer & Action Area */}
                  {!practiceFeedback ? (
                    <form onSubmit={handlePracticeCheck} className="w-full space-y-3">
                      {/* Answer Input Box (fits width like question box) */}
                      <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs flex items-center gap-2">
                        {twoMeanings(currentPracticeWord) && (
                          <span className="text-sm font-black text-zinc-400 shrink-0">1.</span>
                        )}
                        <input
                          ref={practiceTypeInputRef}
                          type="text"
                          value={practiceTypeInput}
                          onChange={(e) => setPracticeTypeInput(e.target.value)}
                          placeholder=""
                          autoFocus
                          className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                        />
                      </div>

                      {/* Two meanings, two boxes — either one can go in either box */}
                      {twoMeanings(currentPracticeWord) && (
                        <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs flex items-center gap-2">
                          <span className="text-sm font-black text-zinc-400 shrink-0">2.</span>
                          <input
                            type="text"
                            value={practiceTypeInput2}
                            onChange={(e) => setPracticeTypeInput2(e.target.value)}
                            placeholder=""
                            className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                          />
                        </div>
                      )}

                      {/* 2 Buttons: Speak and Check */}
                      <div className="flex items-center gap-2.5 w-full">
                        <button
                          type="button"
                          onClick={handleStartListening}
                          className={`flex-1 py-3 rounded-xl font-black text-xs cursor-pointer transition-all border border-zinc-200 dark:border-zinc-700 active:scale-95 shadow-2xs ${
                            isListening
                              ? 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-500 dark:text-white animate-pulse border-red-600'
                              : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {isListening
                            ? appLanguage === 'en'
                              ? 'Listening...'
                              : 'Zuhören...'
                            : appLanguage === 'en'
                            ? 'Speak'
                            : 'Sprechen'}
                        </button>

                        <button
                          type="submit"
                          disabled={
                            !practiceTypeInput.trim() ||
                            (twoMeanings(currentPracticeWord) && !practiceTypeInput2.trim())
                          }
                          className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {appLanguage === 'en' ? 'Check' : 'Prüfen'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Answered Feedback Area */
                    <div className="w-full space-y-3 animate-fadeIn">
                      {practiceFeedback.correct ? (
                        /* Correct State: Green answer box with audio button inside */
                        <>
                          <div className="w-full px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs">
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                              <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">
                                {practiceFeedback.expected}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                playSound('tap');
                                speakGerman(practiceFeedback.expected);
                              }}
                              title={appLanguage === 'en' ? 'Listen (Space)' : 'Anhören (Leertaste)'}
                              className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* The word in a sentence, as Learn shows it */}
                          {currentPracticeWord && getExampleSentence(currentPracticeWord).german && (
                            <div className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug text-left">
                                <SentenceWithWord
                                  sentence={getExampleSentence(currentPracticeWord).german}
                                  word={currentPracticeWord}
                                />
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('tap');
                                  speakGerman(getExampleSentence(currentPracticeWord).german);
                                }}
                                title={appLanguage === 'en' ? 'Listen to sentence' : 'Satz anhören'}
                                className="p-2 rounded-xl bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shrink-0"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Continue Button (Green) */}
                          <button
                            type="button"
                            onClick={handleNextPractice}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center"
                          >
                            <span>{appLanguage === 'en' ? 'Continue' : 'Weiter'}</span>
                          </button>
                        </>
                      ) : (
                        /* Incorrect State: Cross inside user input box, followed by clean correct answer box with audio, and red Got It button */
                        <>
                          <div className="space-y-2.5">
                            {/* Box 1: User's incorrect input with cross icon inside (NO audio) */}
                            <div className="w-full px-4 py-3.5 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 rounded-2xl flex items-center gap-2.5 shadow-xs">
                              <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 stroke-[3]" />
                              <span className="font-bold text-base sm:text-lg text-red-900 dark:text-red-100 truncate">
                                {practiceFeedback.userText || practiceTypeInput || (appLanguage === 'en' ? 'No answer' : 'Keine Antwort')}
                              </span>
                            </div>

                            {/* Box 2: the correct answer, in green, with audio */}
                            <div className="w-full px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs">
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                                <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">
                                  {practiceFeedback.expected}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('tap');
                                  speakGerman(practiceFeedback.expected);
                                }}
                                title={appLanguage === 'en' ? 'Listen (Space)' : 'Anhören (Leertaste)'}
                                className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* The word in a sentence, as Learn shows it */}
                          {currentPracticeWord && getExampleSentence(currentPracticeWord).german && (
                            <div className="w-full px-4 py-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug text-left">
                                <SentenceWithWord
                                  sentence={getExampleSentence(currentPracticeWord).german}
                                  word={currentPracticeWord}
                                />
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('tap');
                                  speakGerman(getExampleSentence(currentPracticeWord).german);
                                }}
                                title={appLanguage === 'en' ? 'Listen to sentence' : 'Satz anhören'}
                                className="p-2 rounded-xl bg-zinc-200/80 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 cursor-pointer active:scale-95 transition-all shrink-0"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Got It Button (Red) */}
                          <button
                            type="button"
                            onClick={handleNextPractice}
                            className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all flex items-center justify-center"
                          >
                            <span>{appLanguage === 'en' ? 'Got It' : 'Verstanden'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

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
      {(activeExerciseMode === 'gender_blitz' || activeExerciseMode === 'plural_drill') && (() => {
        const isArticle = activeExerciseMode === 'gender_blitz';
        const noun = isArticle ? activeBlitzNoun : activePluralNoun;
        const practiceList = isArticle ? nounWords : pluralNouns;
        const position = drillQueueIndex + 1;
        const total = drillQueue.length;
        const answered = isArticle ? blitzFeedback : pluralFeedback;
        const correct = !!answered?.correct;

        const sentence = noun ? (isArticle ? articleSentence(noun) : pluralSentence(noun)) : '';
        const [before, after = ''] = sentence.split(BLANK);
        const rightAnswer = noun ? (isArticle ? noun.nounDetails?.gender ?? '' : barePlural(noun)) : '';
        const shown = (text: string) => (before === '' ? text.charAt(0).toUpperCase() + text.slice(1) : text);

        const status = renderDrillReviewStatus();
        const emptyPractice = !isDrillReview && practiceList.length === 0;

        return (
          <div className="max-w-md mx-auto w-full flex-1 min-h-0 flex flex-col">
            {/* The drills have no Learn screen to hold their two buttons, and a
                session starts the moment you arrive — so the Practice/Review
                switch stays, or there would be no way between them. The filter
                goes while a card is up, and comes back on the finished screen. */}
            {renderDrillModeSwitch()}
            {(status || emptyPractice || !drillStarted) && drillSubMode === 'practice' && renderVocabFilterBar()}
            <form
              onSubmit={(e) => {
                if (isArticle) e.preventDefault();
                else handlePluralSubmit(e);
              }}
              className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm"
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
                          (isArticle
                            ? appLanguage === 'en' ? 'Der, die or das' : 'Der, die oder das'
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
                      {isDrillReview && noun
                        ? `${noun.level}${
                            typeof noun.lektion === 'number'
                              ? ` · ${noun.lektion === 0 ? 'Intro' : `L${noun.lektion}`}`
                              : ''
                          }`
                        : ''}
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
                        {noun.nounDetails?.gender} {noun.lemma}
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
                              `${blitzFeedback?.selected} ${noun.lemma}`,
                              `${noun.nounDetails?.gender} ${noun.lemma}`,
                              handleNextBlitz
                            )
                          : renderDrillFeedback(correct, pluralInput.trim(), noun.nounDetails?.plural ?? '', handleNextPlural)}
                      </>
                    ) : isArticle ? (
                      <div className="grid grid-cols-3 gap-2.5">
                        {(['der', 'die', 'das'] as Gender[]).map((gender) => (
                          <button
                            key={gender}
                            type="button"
                            onClick={() => handleGenderChoice(gender)}
                            className="py-4 rounded-2xl text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 font-black text-base uppercase border-2 border-zinc-300 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer shadow-xs"
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
                        {/* 2 Buttons: Speak and Check — the same pair Flashcard uses */}
                        <div className="flex items-center gap-2.5 w-full">
                          <button
                            type="button"
                            onClick={handlePluralSpeak}
                            className={`flex-1 py-3 rounded-xl font-black text-xs cursor-pointer transition-all border border-zinc-200 dark:border-zinc-700 active:scale-95 shadow-2xs ${
                              isPluralListening
                                ? 'bg-red-500 hover:bg-red-600 text-white dark:bg-red-500 dark:text-white animate-pulse border-red-600'
                                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {isPluralListening
                              ? appLanguage === 'en' ? 'Listening...' : 'Zuhören...'
                              : appLanguage === 'en' ? 'Speak' : 'Sprechen'}
                          </button>
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
          </div>
        );
      })()}
    </div>
  );
};
