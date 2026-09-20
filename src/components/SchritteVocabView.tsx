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
} from 'lucide-react';
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import { CEFRLevel, Gender, WordEntry, FlashcardSubMode, FSRSCardRecord } from '../types';
import { speakGerman, listenToGermanSpeech, isSpeechRecognitionSupported } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';
import {
  loadAllFSRSRecords,
  saveAllFSRSRecords,
  processFSRSReview,
  isCardDueForReview,
  unlockWordsAfterPractice,
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
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  onQuizActiveChange?: (isActive: boolean) => void;
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
    return 'ALL';
  });
  const [isLessonDropdownOpen, setIsLessonDropdownOpen] = useState(false);

  // Flashcard state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Flashcard Sub-Mode: 'learn' (Flip) vs 'practice' vs 'review' - Persisted
  const [flashcardSubMode, setFlashcardSubMode] = useState<FlashcardSubMode>(() => {
    try {
      const saved = localStorage.getItem('schritte_saved_submode');
      if (saved === 'learn' || saved === 'practice' || saved === 'review') return saved as FlashcardSubMode;
    } catch {}
    return 'learn';
  });

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
  const [isPracticeComplete, setIsPracticeComplete] = useState(false);
  const [practiceDirection, setPracticeDirection] = useState<'EN_TO_DE' | 'DE_TO_EN'>('EN_TO_DE');
  const [practiceTypeInput, setPracticeTypeInput] = useState('');
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
      localStorage.setItem('schritte_saved_submode', flashcardSubMode);
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
    // Lektion filter (1 to 14, PART_1 (1-7), PART_2 (8-14), or ALL)
    if (selectedLektion === 'PART_1') {
      list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 1 && w.lektion <= 7);
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

  // Sync practiceQueue when filteredWords changes or when queue is empty
  useEffect(() => {
    if (practiceQueue.length === 0) {
      if (flashcardSubMode === 'review') {
        const targetQueue =
          globalDueWords.length > 0
            ? globalDueWords.slice(0, 10)
            : globalUnlockedWords.length > 0
            ? globalUnlockedWords.slice(0, 10)
            : INITIAL_VOCABULARY.slice(0, 10);
        setPracticeQueue([...targetQueue]);
        setSessionInitialCount(targetQueue.length);
      } else if (filteredWords.length > 0) {
        setPracticeQueue([...filteredWords]);
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
  const currentPluralNoun = nounWords[pluralIndex % (nounWords.length || 1)];

  // Helper to evaluate answer for practice & review
  const evaluateAnswer = (inputVal: string, card: WordEntry, direction: 'EN_TO_DE' | 'DE_TO_EN') => {
    const rawUser = inputVal.trim().toLowerCase();
    if (!rawUser) return { isCorrect: false, expectedDisplay: '' };

    if (direction === 'EN_TO_DE') {
      const rawLemma = card.lemma.toLowerCase();
      const gender = card.nounDetails?.gender?.toLowerCase();
      const rawWithArticle = gender ? `${gender} ${rawLemma}` : rawLemma;

      const cleanUser = rawUser.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      const cleanLemma = rawLemma.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      const cleanWithArticle = rawWithArticle.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      const cleanNoArticle = rawLemma.replace(/^(der|die|das)\s+/, '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();

      const isCorrect =
        cleanUser === cleanLemma ||
        cleanUser === cleanWithArticle ||
        cleanUser === cleanNoArticle ||
        rawUser === rawLemma ||
        rawUser === rawWithArticle ||
        rawUser === rawLemma.replace(/^(der|die|das)\s+/, '');

      const expectedDisplay = card.nounDetails?.gender
        ? `${card.nounDetails.gender} ${card.lemma}`
        : card.lemma;

      return { isCorrect, expectedDisplay };
    } else {
      // DE_TO_EN
      const userClean = rawUser.replace(/^(the|a|an)\s+/, '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim();
      const translationClean = card.translation.toLowerCase();
      const translationParts = translationClean
        .split(/[,/;\n]/)
        .map((p) => p.trim().replace(/^(the|a|an)\s+/, '').replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '').trim())
        .filter(Boolean);

      const isCorrect =
        rawUser === translationClean ||
        userClean === translationClean.replace(/^(the|a|an)\s+/, '').trim() ||
        translationParts.includes(rawUser) ||
        translationParts.includes(userClean) ||
        translationParts.some((part) => part.length > 2 && (userClean.includes(part) || part.includes(userClean)));

      const expectedDisplay = card.translation;
      return { isCorrect, expectedDisplay };
    }
  };

  // Flashcard Practice & Review - Check Handler
  const handlePracticeCheck = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPracticeWord || practiceFeedback || !practiceTypeInput.trim()) return;

    const { isCorrect, expectedDisplay } = evaluateAnswer(practiceTypeInput, currentPracticeWord, practiceDirection);

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
      userText: practiceTypeInput.trim(),
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
    setIsListening(true);

    const lang = practiceDirection === 'EN_TO_DE' ? 'de-DE' : 'en-US';

    const rec = listenToGermanSpeech(
      (transcript) => {
        setIsListening(false);
        const trimmedTranscript = transcript.trim();
        setPracticeTypeInput(trimmedTranscript);

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
    const activeQueue = practiceQueue.length > 0 ? practiceQueue : filteredWords;

    if (practiceQueueIndex + 1 < activeQueue.length) {
      // Continue through current queue
      setPracticeFeedback(null);
      setPracticeTypeInput('');
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
        setIsListening(false);
        setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      } else {
        // All words answered correctly and all mistakes resolved!
        playSound('correct');
        setIsPracticeComplete(true);
        setPracticeFeedback(null);
        setPracticeTypeInput('');
        setIsListening(false);

        // Activation Rule: When a user finishes the "Practice" session for a lesson,
        // set isUnlocked: true and status: 'review' so those words enter Review pool starting the next day.
        if (flashcardSubMode === 'practice') {
          const completedWordIds = filteredWords.map((w) => w.id);
          setFsrsRecords((prev) => unlockWordsAfterPractice(completedWordIds, prev));
        }
      }
    }
  };

  const restartPracticeSession = () => {
    playSound('tap');
    let freshQueue: WordEntry[] = [];
    if (flashcardSubMode === 'review') {
      const source =
        globalDueWords.length > 0
          ? globalDueWords
          : globalUnlockedWords.length > 0
          ? globalUnlockedWords
          : INITIAL_VOCABULARY;
      freshQueue = source.slice(0, 10);
    } else {
      freshQueue = filteredWords.length > 0 ? [...filteredWords] : [];
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
    setIsListening(false);
    setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
  };

  const handleNextFlashcard = () => {
    playSound('tap');
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setIsCardFlipped(false);
    setIsListening(false);
    setFlashcardIndex((prev) => (prev + 1) % (filteredWords.length || 1));
  };

  const handlePrevFlashcard = () => {
    playSound('tap');
    setPracticeFeedback(null);
    setPracticeTypeInput('');
    setIsCardFlipped(false);
    setIsListening(false);
    setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : (filteredWords.length || 1) - 1));
  };

  // Check if practice or review is actively in progress (not completed, and user has made progress)
  const isPracticeInProgress =
    activeExerciseMode === 'explorer' &&
    (flashcardSubMode === 'practice' || flashcardSubMode === 'review') &&
    !isPracticeComplete &&
    (practiceQueueIndex > 0 || practiceFeedback !== null || roundNumber > 1 || Object.keys(mistakeCounts).length > 0);

  useEffect(() => {
    if (onQuizActiveChange) {
      onQuizActiveChange(isPracticeInProgress);
    }
  }, [isPracticeInProgress, onQuizActiveChange]);

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
        list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 1 && w.lektion <= 7);
      } else if (updatedLektion === 'PART_2') {
        list = list.filter((w) => typeof w.lektion === 'number' && w.lektion >= 8 && w.lektion <= 14);
      } else if (typeof updatedLektion === 'number') {
        list = list.filter((w) => w.lektion === updatedLektion);
      }

      setFlashcardIndex(0);

      if (flashcardSubMode === 'review') {
        const source =
          globalDueWords.length > 0
            ? globalDueWords
            : globalUnlockedWords.length > 0
            ? globalUnlockedWords
            : INITIAL_VOCABULARY;
        const q = source.slice(0, 10);
        setPracticeQueue(q);
        setSessionInitialCount(q.length);
      } else {
        setPracticeQueue(list);
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
      setPracticeFeedback(null);
      setPracticeTypeInput('');
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
      setIsPracticeComplete(false);
      setPracticeQueueIndex(0);
      setCurrentRedoBatch([]);
      setRoundNumber(1);
      setMistakeCounts({});
      setMistakeWords([]);
      setInitialMistakeWordIds([]);
      setPracticeScore(0);
      setPracticeFeedback(null);
      setPracticeTypeInput('');
      setIsListening(false);

      if (mode === 'learn') {
        setIsCardFlipped(false);
      } else if (mode === 'practice') {
        setPracticeQueue([...filteredWords]);
        setSessionInitialCount(filteredWords.length);
        setPracticeDirection(Math.random() < 0.5 ? 'EN_TO_DE' : 'DE_TO_EN');
      } else if (mode === 'review') {
        const source =
          globalDueWords.length > 0
            ? globalDueWords
            : globalUnlockedWords.length > 0
            ? globalUnlockedWords
            : INITIAL_VOCABULARY;
        const q = source.slice(0, 10);
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
    if (!currentBlitzNoun || blitzFeedback) return;
    const isCorrect = currentBlitzNoun.nounDetails?.gender === choice;
    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(10);
      speakGerman(`${choice} ${currentBlitzNoun.lemma}`);
    } else {
      playSound('wrong');
      onWrongAnswer();
      speakGerman(`${currentBlitzNoun.nounDetails?.gender} ${currentBlitzNoun.lemma}`);
    }
    setBlitzFeedback({
      correct: isCorrect,
      selected: choice,
      word: currentBlitzNoun,
    });
  };

  const handleNextBlitz = () => {
    playSound('tap');
    setBlitzFeedback(null);
    setBlitzIndex((prev) => (prev + 1) % nounWords.length);
  };

  // Handlers for Plural Drill
  const handlePluralSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPluralNoun || pluralFeedback || !pluralInput.trim()) return;
    const expected = currentPluralNoun.nounDetails?.plural || '';
    const cleanUser = pluralInput.trim().toLowerCase();
    const cleanExpected = expected.toLowerCase();

    // Check either full 'die Häuser' or just 'Häuser'
    const isCorrect =
      cleanUser === cleanExpected ||
      cleanUser === cleanExpected.replace(/^die\s+/, '');

    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(15);
      speakGerman(expected);
    } else {
      playSound('wrong');
      onWrongAnswer();
      speakGerman(expected);
    }
    setPluralFeedback({
      correct: isCorrect,
      expected,
    });
  };

  const handleNextPlural = () => {
    playSound('tap');
    setPluralFeedback(null);
    setPluralInput('');
    setPluralIndex((prev) => (prev + 1) % nounWords.length);
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
  const renderFilterBanner = () => (
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
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedLevel === lvl
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {lvl}
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
            className="px-2.5 sm:px-3 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl shadow-xs border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>
              {selectedLektion === 'ALL'
                ? (appLanguage === 'en' ? 'All' : 'Alle')
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
              <div className="absolute right-0 mt-1.5 z-30 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 space-y-2 animate-fadeIn">
                {/* Header with All Button */}
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800 gap-1">
                  <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">
                    {appLanguage === 'en' ? 'Lesson Filter:' : 'Lektionsfilter:'}
                  </span>
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

                {/* 8-Column Grid: Row 1 = 1 to 7 + Level.1, Row 2 = 8 to 14 + Level.2 */}
                <div className="space-y-1 p-0.5">
                  <div className="grid grid-cols-8 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          playSound('tap');
                          handleFilterChange(undefined, num);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          selectedLektion === num
                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    {/* Level.1 button e.g. A1.1, A2.1, B1.1 */}
                    <button
                      onClick={() => {
                        playSound('tap');
                        handleFilterChange(undefined, 'PART_1');
                      }}
                      className={`py-1.5 px-0.5 rounded-lg text-[10.5px] sm:text-xs font-black transition-all cursor-pointer ${
                        selectedLektion === 'PART_1'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'
                      }`}
                    >
                      {selectedLevel}.1
                    </button>
                  </div>

                  <div className="grid grid-cols-8 gap-1">
                    {[8, 9, 10, 11, 12, 13, 14].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          playSound('tap');
                          handleFilterChange(undefined, num);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                          selectedLektion === num
                            ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    {/* Level.2 button e.g. A1.2, A2.2, B1.2 */}
                    <button
                      onClick={() => {
                        playSound('tap');
                        handleFilterChange(undefined, 'PART_2');
                      }}
                      className={`py-1.5 px-0.5 rounded-lg text-[10.5px] sm:text-xs font-black transition-all cursor-pointer ${
                        selectedLektion === 'PART_2'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600'
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
  const renderVocabFilterBar = () => renderFilterBanner();

  // VIEW 2: ACTIVE EXERCISE SCREEN (With Filter Bar inside each exercise)
  return (
    <div className="w-full h-full flex flex-col justify-start pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-hidden">
      {/* SUB-MODE 1: FLASHCARD DRILL */}
      {activeExerciseMode === 'explorer' && (
        <div className="max-w-xl mx-auto w-full h-full flex flex-col justify-between">
          {/* Banner 1: Level & Lesson Filters */}
          {renderFilterBanner()}
          {/* Banner 2: Learn, Practice, Review Modes */}
          {renderModeBanner()}

          <div className="flex-1 flex flex-col justify-between bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm text-center">
            {filteredWords.length === 0 ? (
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
              /* LEARN SUB-MODE: Classic interactive flip card */
              <>
                {/* Interactive Flip Card */}
                <div
                  onClick={() => {
                    playSound('tap');
                    setIsCardFlipped(!isCardFlipped);
                  }}
                  className="flex-1 min-h-[170px] sm:min-h-[200px] p-5 sm:p-7 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center cursor-pointer hover:border-zinc-950 dark:hover:border-white transition-all select-none group"
                >
                  {!isCardFlipped ? (
                    <div className="flex flex-col items-center justify-center space-y-1.5 w-full">
                      {currentFlashcard?.nounDetails?.gender ? (
                        <>
                          {/* Singular Noun Line: Article only colored & not bold; Word in bold black/white */}
                          <h3 className="text-2xl sm:text-3xl tracking-tight flex items-baseline justify-center gap-2">
                            <span className={`font-normal font-sans ${getNounColorClass(currentFlashcard.nounDetails.gender)}`}>
                              {currentFlashcard.nounDetails.gender}
                            </span>
                            <span className="font-black text-zinc-900 dark:text-zinc-100">
                              {currentFlashcard.lemma}
                            </span>
                          </h3>

                          {/* Plural Divider & Plural Noun Line */}
                          {getCleanPluralString(currentFlashcard) && (
                            <>
                              <div className="w-24 sm:w-28 border-t border-zinc-200 dark:border-zinc-700 my-1.5 relative flex items-center justify-center">
                                <span className="bg-zinc-50 dark:bg-zinc-800/90 px-2 text-[10px] sm:text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                  Plural
                                </span>
                              </div>
                              <h3 className="text-2xl sm:text-3xl tracking-tight flex items-baseline justify-center gap-2">
                                <span className="font-normal font-sans text-pink-600 dark:text-pink-400">
                                  die
                                </span>
                                <span className="font-black text-zinc-900 dark:text-zinc-100">
                                  {getCleanPluralString(currentFlashcard)!.replace(/^die\s+/i, '')}
                                </span>
                              </h3>
                            </>
                          )}
                        </>
                      ) : (
                        <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                          {currentFlashcard?.lemma}
                        </h3>
                      )}
                    </div>
                  ) : (
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
                  )}
                </div>

                {/* Action Buttons: Prev + Audio (1 or 2 buttons) + Next */}
                <div className="flex items-center gap-2 mt-3 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrevFlashcard}
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
                    onClick={handleNextFlashcard}
                    className="p-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs border border-transparent cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Next"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
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
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                    {/* Left: Random Direction Badge */}
                    <div className="px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 shadow-2xs flex items-center gap-1">
                      <span>{practiceDirection === 'EN_TO_DE' ? 'EN → DE' : 'DE → EN'}</span>
                    </div>

                    {/* Right: Card Counter & Redo Round Indicator with pleasant spacing */}
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
                  </div>

                  {/* Question Box (Maintains full height on correct answers, shrinks only slightly for incorrect feedback to fill gap) */}
                  <div
                    className={`w-full bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center text-center transition-all duration-300 ${
                      !practiceFeedback || practiceFeedback.correct
                        ? 'flex-1 min-h-[140px] sm:min-h-[160px] p-5 sm:p-6'
                        : 'flex-1 min-h-[100px] sm:min-h-[110px] p-4 py-3 sm:py-3.5'
                    }`}
                  >
                    <h3
                      className={`font-black text-zinc-900 dark:text-zinc-100 tracking-tight transition-all duration-300 ${
                        !practiceFeedback || practiceFeedback.correct
                          ? 'text-2xl sm:text-3xl'
                          : 'text-xl sm:text-2xl'
                      }`}
                    >
                      {practiceDirection === 'EN_TO_DE'
                        ? currentPracticeWord?.translation
                        : currentPracticeWord?.nounDetails?.gender
                        ? `${currentPracticeWord.nounDetails.gender} ${currentPracticeWord.lemma}`
                        : currentPracticeWord?.lemma}
                    </h3>
                  </div>

                  {/* Practice Answer & Action Area */}
                  {!practiceFeedback ? (
                    <form onSubmit={handlePracticeCheck} className="w-full space-y-3">
                      {/* Answer Input Box (fits width like question box) */}
                      <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs">
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
                          disabled={!practiceTypeInput.trim()}
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

                            {/* Box 2: Correct answer in clean natural grey/zinc box with audio button */}
                            <div className="w-full px-4 py-3 bg-zinc-100/90 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-between shadow-xs">
                              <span className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 truncate pr-2">
                                {practiceFeedback.expected}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  playSound('tap');
                                  speakGerman(practiceFeedback.expected);
                                }}
                                title={appLanguage === 'en' ? 'Listen (Space)' : 'Anhören (Leertaste)'}
                                className="p-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-800 dark:text-zinc-200 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
                              >
                                <Volume2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

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

          {/* Example Sentence Banner (Stuck to bottom in Learn Mode) */}
          {flashcardSubMode === 'learn' && currentFlashcard && (
            <div className="mt-2.5 sm:mt-3 bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs animate-fadeIn shrink-0">
              {(() => {
                const example = getExampleSentence(currentFlashcard);

                return (
                  <div className="flex items-center justify-between gap-3">
                    {/* Centered German sentence (bold) and English translation */}
                    <div className="flex-1 text-center space-y-0.5 min-w-0 pl-1">
                      <p className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                        {example.german}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {example.english}
                      </p>
                    </div>

                    {/* Small Audio Button on farthest right, centered vertically in the middle */}
                    <button
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        speakGerman(example.german);
                      }}
                      title={appLanguage === 'en' ? 'Listen to example sentence (Command key)' : 'Beispielsatz anhören (Command-Taste)'}
                      className="p-2 sm:p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer flex items-center justify-center shrink-0 self-center shadow-2xs"
                    >
                      <Volume2 className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-zinc-800 dark:text-zinc-200" />
                    </button>
                  </div>
                );
              })()}
            </div>
          )}
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
      {activeExerciseMode === 'gender_blitz' && (
        <div className="max-w-md mx-auto w-full">
          {renderVocabFilterBar()}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
            {nounWords.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="font-bold text-zinc-500">
                  {appLanguage === 'en' ? 'No nouns found in this selection.' : 'Keine Nomen in dieser Auswahl gefunden.'}
                </p>
                <button
                  onClick={() => {
                    setSelectedLevel('A1');
                    setSelectedLektion('ALL');
                    setBlitzIndex(0);
                  }}
                  className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer"
                >
                  {appLanguage === 'en' ? 'Load all A1 nouns' : 'Alle A1 Nomen laden'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    {appLanguage === 'en' ? 'Noun' : 'Nomen'} {(blitzIndex % nounWords.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {nounWords.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md font-bold text-[11px] border border-zinc-200 dark:border-zinc-700">
                    {selectedLevel} • {appLanguage === 'en' ? 'Lek' : 'Lek'} {currentBlitzNoun?.lektion || 1}
                  </span>
                </div>

                {/* Word Display */}
                <div className="py-2.5 space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                    {appLanguage === 'en' ? 'Which article is correct?' : 'Welcher Artikel ist richtig?'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    ___ {currentBlitzNoun?.lemma}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-zinc-500">
                    {currentBlitzNoun?.translation}
                  </p>
                </div>

                {/* 3 Large Article Buttons */}
                <div className="grid grid-cols-3 gap-2.5">
                  {(['der', 'die', 'das'] as Gender[]).map((gender) => (
                    <button
                      key={gender}
                      disabled={!!blitzFeedback}
                      onClick={() => handleGenderChoice(gender)}
                      className="py-3.5 rounded-2xl text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-950 hover:text-white dark:hover:bg-white dark:hover:text-zinc-950 font-black text-base uppercase border-2 border-zinc-300 dark:border-zinc-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {gender}
                    </button>
                  ))}
                </div>

                {/* Feedback & Next */}
                {blitzFeedback && (
                  <div
                    className={`p-4 rounded-2xl border-2 space-y-2.5 ${
                      blitzFeedback.correct
                        ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                        : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {blitzFeedback.correct ? (
                        <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs font-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-black">
                          <X className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <p className="font-black text-sm">
                        {blitzFeedback.correct
                          ? appLanguage === 'en'
                            ? `Correct! "${blitzFeedback.word.nounDetails?.gender} ${blitzFeedback.word.lemma}"`
                            : `Richtig! ${blitzFeedback.word.nounDetails?.gender} ${blitzFeedback.word.lemma}`
                          : appLanguage === 'en'
                          ? `Incorrect. Correct: "${blitzFeedback.word.nounDetails?.gender} ${blitzFeedback.word.lemma}"`
                          : `Falsch! Richtig: ${blitzFeedback.word.nounDetails?.gender} ${blitzFeedback.word.lemma}`}
                      </p>
                    </div>

                    {blitzFeedback.word.nounDetails?.genderRuleHint && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                        💡 {appLanguage === 'en' ? 'Tip:' : 'Tipp:'} {blitzFeedback.word.nounDetails.genderRuleHint}
                      </p>
                    )}

                    <button
                      onClick={handleNextBlitz}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                    >
                      <span>{appLanguage === 'en' ? 'Next Word' : 'Nächstes Wort'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* SUB-MODE 3: PLURAL DRILL */}
      {activeExerciseMode === 'plural_drill' && (
        <div className="max-w-md mx-auto w-full">
          {renderVocabFilterBar()}
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
            {nounWords.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="font-bold text-zinc-500">
                  {appLanguage === 'en' ? 'No nouns found in this selection.' : 'Keine Nomen in dieser Auswahl gefunden.'}
                </p>
                <button
                  onClick={() => {
                    setSelectedLevel('A1');
                    setSelectedLektion('ALL');
                    setPluralIndex(0);
                  }}
                  className="px-4 py-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl cursor-pointer"
                >
                  {appLanguage === 'en' ? 'Load all A1 nouns' : 'Alle A1 Nomen laden'}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    {appLanguage === 'en' ? 'Plural' : 'Plural'} {(pluralIndex % nounWords.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {nounWords.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md font-bold text-[11px] border border-zinc-200 dark:border-zinc-700">
                    {selectedLevel} • {appLanguage === 'en' ? 'Lek' : 'Lek'} {currentPluralNoun?.lektion || 1}
                  </span>
                </div>

                <div className="py-2 space-y-1.5">
                  <span className="text-[11px] font-black uppercase text-zinc-400">
                    {appLanguage === 'en' ? 'What is the plural form?' : 'Wie lautet der Plural?'}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {currentPluralNoun?.nounDetails?.gender} {currentPluralNoun?.lemma}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold text-zinc-500">
                    {currentPluralNoun?.translation}
                  </p>
                </div>

                {/* Plural Input Form */}
                <form onSubmit={handlePluralSubmit} className="space-y-3.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={pluralInput}
                      disabled={!!pluralFeedback}
                      onChange={(e) => setPluralInput(e.target.value)}
                      placeholder={appLanguage === 'en' ? 'e.g. die Bücher or Bücher' : 'z.B. die Bücher / Bücher'}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 text-center font-bold text-sm focus:border-zinc-950 dark:focus:border-white outline-none text-zinc-900 dark:text-white"
                    />
                  </div>

                  {!pluralFeedback ? (
                    <button
                      type="submit"
                      disabled={!pluralInput.trim()}
                      className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {t.checkSentence}
                    </button>
                  ) : (
                    <div
                      className={`p-3.5 rounded-2xl border-2 space-y-2.5 ${
                        pluralFeedback.correct
                          ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                          : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {pluralFeedback.correct ? (
                          <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs font-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-black">
                            <X className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                        <p className="font-black text-sm">
                          {pluralFeedback.correct
                            ? appLanguage === 'en'
                              ? `Correct! Plural: ${pluralFeedback.expected}`
                              : `Richtig! Der Plural lautet: ${pluralFeedback.expected}`
                            : appLanguage === 'en'
                            ? `Incorrect. Correct: ${pluralFeedback.expected}`
                            : `Falsch! Richtig: ${pluralFeedback.expected}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleNextPlural}
                        className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                      >
                        <span>{appLanguage === 'en' ? 'Next Word' : 'Nächstes Wort'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
