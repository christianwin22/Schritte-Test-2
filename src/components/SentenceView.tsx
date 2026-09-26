import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Volume2, X } from 'lucide-react';
import { CEFRLevel, FSRSCardRecord } from '../types';
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import { SENTENCES, SentenceItem, SentenceTense, sentenceAnswer, sentenceText } from '../data/sentenceExercises';
import {
  isCardDueForReview,
  loadAllFSRSRecords,
  reviewCard,
  saveAllFSRSRecords,
  unlockWordsAfterPractice,
} from '../utils/srsEngine';
import { listenToGermanSpeech, speakGerman, speakGermanSequence } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage } from '../utils/translations';
import { lessonTopics } from './SchritteVocabView';
import { useAuth } from './AuthGate';
import { loadExerciseReady, markExerciseDone, readyKey, readyLessonKeys, SENTENCE_READY } from '../utils/exerciseReady';

/**
 * Grammar · Sentence — every verb of every lesson in a sentence, in Present,
 * Simple Past or Present Perfect. Practice | Review, built like Plural: the verb
 * on a chip, the sentence with its gaps, and its English.
 *
 *   Ich [____] das Foto [____].   → type "habe angesehen"
 *
 * - Practice: a lesson's sentences in one tense; a wrong one comes back in a redo
 *   round until it is right. Finishing puts them into Review, due tomorrow.
 * - Review: the ones that are due, tense by tense.
 * - A lesson turns amber here once its Practice in that tense is finished.
 */
interface SentenceViewProps {
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  onQuizActiveChange?: (isActive: boolean, progressIsSaved?: boolean) => void;
  backHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
  appLanguage?: AppLanguage;
}

type Mode = 'practice' | 'review';
export const sentenceCardId = (id: string) => `sentence:${id}`;

const TENSES: { id: SentenceTense; en: string; de: string }[] = [
  { id: 'present', en: 'Present', de: 'Präsens' },
  { id: 'past', en: 'Simple Past', de: 'Präteritum' },
  { id: 'perfect', en: 'Present Perfect', de: 'Perfekt' },
];

const REFLEXIVE = ['mich', 'dich', 'sich', 'uns', 'euch', 'mir', 'dir'];
const clean = (t: string) => t.toLowerCase().replace(/[.!?,]+$/, '').replace(/\s+/g, ' ').trim();
/** Capitals and spaces don't count; nor the subject or the reflexive typed along ("ich habe mich gefreut"). */
const isRight = (answer: string, s: SentenceItem) => {
  const want = clean(sentenceAnswer(s));
  let given = clean(answer);
  const subject = clean(s.subject);
  if (given.startsWith(`${subject} `)) given = given.slice(subject.length + 1);
  if (given === want) return true;
  return given.split(' ').filter((w) => !REFLEXIVE.includes(w)).join(' ') === want;
};
const shuffled = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const readStored = <T,>(key: string, fallback: T, parse: (v: string) => T | null): T => {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? null : parse(raw);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

export const SentenceView: React.FC<SentenceViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  onRequestAbandon,
  onQuizActiveChange,
  backHandlerRef,
  appLanguage = 'en',
}) => {
  const en = appLanguage === 'en';
  const isSandbox = useAuth()?.isSandbox ?? false;

  // --- Tense, level and lesson, kept for next time ------------------------------------
  const [tense, setTense] = useState<SentenceTense>(() =>
    readStored<SentenceTense>('schritte_sentence_tense', 'present', (v) =>
      ['present', 'past', 'perfect'].includes(v) ? (v as SentenceTense) : null
    )
  );
  const [level, setLevel] = useState<CEFRLevel>(() =>
    readStored<CEFRLevel>('schritte_sentence_level', 'A1', (v) => (['A1', 'A2', 'B1'].includes(v) ? (v as CEFRLevel) : null))
  );
  const [lesson, setLesson] = useState<number>(() =>
    readStored<number>('schritte_sentence_lesson', 1, (v) => (Number.isFinite(Number(v)) ? Number(v) : null))
  );
  const TENSE_SENTENCES = useMemo(() => SENTENCES.filter((s) => s.tense === tense), [tense]);
  // Every lesson of the level is listed; the ones without verbs are greyed and can't be picked.
  const allLessonsOfLevel = useMemo(
    () => [...new Set(INITIAL_VOCABULARY.filter((w) => w.level === level).map((w) => w.lektion ?? 0))].sort((a, b) => a - b),
    [level]
  );
  const lessonsOfLevel = useMemo(
    () => [...new Set(TENSE_SENTENCES.filter((s) => s.level === level).map((s) => s.lektion))].sort((a, b) => a - b),
    [level, TENSE_SENTENCES]
  );
  const activeLesson = lessonsOfLevel.includes(lesson) ? lesson : lessonsOfLevel.find((l) => l > 0) ?? lessonsOfLevel[0] ?? 1;
  useEffect(() => {
    try {
      localStorage.setItem('schritte_sentence_tense', tense);
      localStorage.setItem('schritte_sentence_level', level);
      localStorage.setItem('schritte_sentence_lesson', String(activeLesson));
    } catch {
      // ignore
    }
  }, [tense, level, activeLesson]);
  const [isLessonOpen, setIsLessonOpen] = useState(false);
  const lessonSentences = useMemo(
    () => TENSE_SENTENCES.filter((s) => s.level === level && s.lektion === activeLesson),
    [TENSE_SENTENCES, level, activeLesson]
  );

  // Lessons waiting here, per tense, since that tense's Practice (amber)
  const [ready, setReady] = useState(() => loadExerciseReady());
  const readyKeysOf = (t: SentenceTense) => new Set(readyLessonKeys(ready, SENTENCE_READY[t]));
  const readyKeys = useMemo(() => readyKeysOf(tense), [ready, tense]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Review records ----------------------------------------------------------------
  const [records, setRecords] = useState<Record<string, FSRSCardRecord>>(() => loadAllFSRSRecords());
  const updateRecords = (change: (prev: Record<string, FSRSCardRecord>) => Record<string, FSRSCardRecord>) =>
    setRecords((prev) => {
      const next = change({ ...loadAllFSRSRecords(), ...prev }); // never drop anyone else's cards
      saveAllFSRSRecords(next);
      return next;
    });
  const isUnlocked = (s: SentenceItem) => {
    const r = records[sentenceCardId(s.id)];
    return !!r?.isUnlocked && r.status === 'review';
  };
  const unlocked = useMemo(() => TENSE_SENTENCES.filter(isUnlocked), [records, TENSE_SENTENCES]); // eslint-disable-line react-hooks/exhaustive-deps
  const due = useMemo(() => unlocked.filter((s) => isCardDueForReview(records[sentenceCardId(s.id)])), [unlocked, records]);
  const dueOf = (t: SentenceTense) =>
    SENTENCES.filter((s) => s.tense === t && isUnlocked(s) && isCardDueForReview(records[sentenceCardId(s.id)])).length;

  // Sandbox only: an empty Review gets five test sentences, due now, so Review can be
  // tried today instead of after a lesson's Practice and a day's wait.
  useEffect(() => {
    if (!isSandbox || unlocked.length > 0) return;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const five = TENSE_SENTENCES.filter((s) => s.level === 'A1').slice(0, 5);
    updateRecords((prev) => {
      const next = { ...prev };
      for (const s of five) {
        const id = sentenceCardId(s.id);
        if (next[id]) continue;
        next[id] = {
          wordId: id,
          status: 'review',
          isUnlocked: true,
          stability: 1,
          difficulty: 5,
          intervalDays: 1,
          nextReviewDate: yesterday,
          lastReviewedAt: yesterday,
          repetitionCount: 1,
        };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSandbox, tense]);

  // --- Session -----------------------------------------------------------------------
  const [mode, setMode] = useState<Mode>('practice');
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<SentenceItem[]>([]);
  const [sessionItems, setSessionItems] = useState<SentenceItem[]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [redo, setRedo] = useState<SentenceItem[]>([]);
  const [firstTryWrong, setFirstTryWrong] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkedAt = useRef(0);

  const build = (m: Mode) => {
    const list = m === 'review' ? shuffled(due.length > 0 ? due : unlocked) : shuffled(lessonSentences);
    setQueue(list);
    setSessionItems(list);
    setIndex(0);
    setRound(1);
    setRedo([]);
    setFirstTryWrong([]);
    setInput('');
    setResult(null);
    setDone(false);
  };
  // A new tense, lesson or mode: back to its Start screen.
  useEffect(() => {
    setStarted(false);
    build(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tense, level, activeLesson]);

  const current = queue[index];
  const inProgress = started && !done && (index > 0 || round > 1 || result !== null);

  useEffect(() => {
    onQuizActiveChange?.(inProgress, mode === 'review');
  }, [inProgress, mode, onQuizActiveChange]);
  useEffect(() => () => onQuizActiveChange?.(false), [onQuizActiveChange]);

  // Back arrow / title: out of a running session to the Start screen, asking first once answered.
  const leave = () => {
    build(mode);
    setStarted(false);
  };
  useEffect(() => {
    if (!backHandlerRef) return;
    backHandlerRef.current = () => {
      if (!started) return false;
      if (inProgress) onRequestAbandon(leave);
      else leave();
      return true;
    };
  });
  useEffect(
    () => () => {
      if (backHandlerRef) backHandlerRef.current = null;
    },
    [backHandlerRef]
  );

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    playSound('tap');
    setMode(m);
  };

  // A new sentence plays its verb by itself ("ansehen"), as Plural plays its singular.
  const verbAudioKey = started && !done && result === null && current ? `${current.id}|${index}|${round}` : '';
  useEffect(() => {
    if (!verbAudioKey || !current) return;
    return speakGermanSequence([current.lemma]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verbAudioKey]);

  // A new sentence is ready for typing straight away.
  useEffect(() => {
    if (started && !done && result === null) inputRef.current?.focus();
  }, [started, done, index, round, result]);

  const check = (answer: string) => {
    if (!current || result !== null || !answer.trim()) return;
    checkedAt.current = Date.now();
    const ok = isRight(answer, current);
    setResult(ok);
    if (ok) {
      playSound('correct');
      onCorrectAnswer(20);
    } else {
      playSound('wrong');
      onWrongAnswer();
      if (round === 1) setFirstTryWrong((p) => (p.includes(current.id) ? p : [...p, current.id]));
    }
    speakGerman(sentenceText(current));
    if (mode === 'review') {
      const id = sentenceCardId(current.id);
      updateRecords((prev) => ({ ...prev, [id]: reviewCard(id, ok, prev[id]) }));
    } else if (!ok) {
      setRedo((p) => (p.some((x) => x.id === current.id) ? p : [...p, current]));
    }
  };

  const next = () => {
    playSound('tap');
    inputRef.current?.focus(); // inside the tap, so iOS keeps the keyboard up
    setInput('');
    setResult(null);
    if (index + 1 < queue.length) {
      setIndex((i) => i + 1);
      return;
    }
    if (mode === 'practice' && redo.length > 0) {
      setQueue(shuffled(redo));
      setRedo([]);
      setIndex(0);
      setRound((r) => r + 1);
      return;
    }
    setDone(true);
    playSound('correct');
    if (mode === 'practice') {
      const ids = sessionItems.map((x) => sentenceCardId(x.id));
      updateRecords((prev) => unlockWordsAfterPractice(ids, prev));
      // The lesson practised in this tense is done here: its amber notice goes.
      setReady(markExerciseDone(SENTENCE_READY[tense], [readyKey(level, activeLesson)]));
    }
  };

  // After checking, Enter goes on.
  useEffect(() => {
    if (result === null) return;
    const onKey = (e: KeyboardEvent) => {
      // The Enter that did the checking must not also go on: the answer has to be seen.
      if (e.key !== 'Enter' || Date.now() - checkedAt.current < 400) return;
      e.preventDefault();
      next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const speak = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (result !== null) return;
    playSound('tap');
    setIsListening(true);
    recognitionRef.current = listenToGermanSpeech(
      (t) => {
        setIsListening(false);
        setInput(t.trim().replace(/[.!?,]+$/, ''));
        inputRef.current?.focus();
      },
      () => setIsListening(false),
      () => setIsListening(false),
      'de-DE'
    );
  };
  useEffect(() => () => recognitionRef.current?.stop(), []);

  // --- Pieces ------------------------------------------------------------------------
  const tenseName = (t: SentenceTense) => {
    const x = TENSES.find((y) => y.id === t)!;
    return en ? x.en : x.de;
  };
  const lessonLabel = (l: number) => (l === 0 ? 'Intro' : `${en ? 'Lesson' : 'Lektion'} ${l}`);
  const pill = (active: boolean) =>
    `py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
      active
        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
    }`;
  const dot = <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-900" />;

  const tenseBar = (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
        {TENSES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              if (t.id === tense) return;
              playSound('tap');
              setTense(t.id);
            }}
            className={`${pill(tense === t.id)} relative whitespace-nowrap`}
          >
            {en ? t.en : t.de}
            {/* Red: due in Review there. Amber: a lesson waiting there. In the corner, so the name keeps one line. */}
            {dueOf(t.id) > 0 ? (
              <span className="absolute -top-1.5 -right-1 min-w-[16px] px-1 rounded-full text-[9px] font-black leading-4 text-center bg-rose-500 text-white ring-2 ring-white dark:ring-zinc-900">
                {dueOf(t.id)}
              </span>
            ) : (
              readyKeysOf(t.id).size > 0 && dot
            )}
          </button>
        ))}
      </div>
    </div>
  );

  const modeBar = (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className="grid grid-cols-2 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
        <button type="button" onClick={() => switchMode('practice')} className={pill(mode === 'practice')}>
          {en ? 'Practice' : 'Üben'}
        </button>
        <button type="button" onClick={() => switchMode('review')} className={pill(mode === 'review')}>
          <span>{en ? 'Review' : 'Wiederholen'}</span>
          <span
            className={
              due.length > 0
                ? 'px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-rose-500 text-white shadow-2xs animate-pulse'
                : 'px-1.5 py-0.2 rounded-full text-[10px] font-black leading-tight bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 opacity-60'
            }
          >
            {due.length}
          </span>
        </button>
      </div>
    </div>
  );

  const filterBar = (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                playSound('tap');
                setLevel(lvl);
              }}
              className={`relative px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                level === lvl
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {lvl}
              {[...readyKeys].some((k) => k.startsWith(`${lvl}-`)) && dot}
            </button>
          ))}
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setIsLessonOpen((o) => !o);
            }}
            className={`px-2.5 sm:px-3 py-1 font-black text-xs rounded-xl shadow-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
              readyKeys.has(readyKey(level, activeLesson))
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-500'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <span>{lessonLabel(activeLesson)}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isLessonOpen ? 'rotate-180' : ''}`} />
          </button>
          {isLessonOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsLessonOpen(false)} />
              <div className="absolute right-0 mt-1.5 z-30 w-72 bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 animate-fadeIn">
                <div className="grid grid-cols-7 gap-1.5">
                  {allLessonsOfLevel.map((l) => {
                    // No verbs in this lesson: greyed, and it can't be picked
                    const has = lessonsOfLevel.includes(l);
                    const waiting = readyKeys.has(readyKey(level, l));
                    return (
                      <button
                        key={l}
                        type="button"
                        disabled={!has}
                        onClick={() => {
                          playSound('tap');
                          setLesson(l);
                          setIsLessonOpen(false);
                        }}
                        className={`py-1.5 rounded-lg text-xs font-black transition-all ${l === 0 ? 'col-span-2' : ''} ${
                          !has
                            ? 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                            : l === activeLesson
                            ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs cursor-pointer ${waiting ? 'ring-2 ring-amber-400' : ''}`
                            : waiting
                            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 cursor-pointer'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer'
                        }`}
                      >
                        {l === 0 ? 'Intro' : l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const primaryButton =
    'w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all';

  /** A gap: empty lines until checked, then the answer in green. */
  const gap = (text: string, last = false) => (
    <span
      className={`inline-block min-w-[2.6em] ${last ? 'ml-1' : 'mx-1'} px-1 border-b-4 align-baseline ${
        result === null ? 'border-zinc-300 dark:border-zinc-600 text-transparent' : 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {result === null ? ' ' : text}
    </span>
  );

  let body: React.ReactNode;
  if (!started) {
    const lessonWords = INITIAL_VOCABULARY.filter((w) => lessonSentences.some((s) => s.verbId === w.id));
    body =
      queue.length === 0 ? (
        <div className="flex-1 flex items-center justify-center font-black text-zinc-900 dark:text-zinc-100">
          {mode === 'review' ? (en ? 'Nothing to review yet' : 'Noch nichts zu wiederholen') : en ? 'No verbs in this lesson.' : 'Keine Verben in dieser Lektion.'}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8 text-center">
          <div className="space-y-3 max-w-xs">
            {mode === 'practice' ? (
              <>
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  {level} · {lessonLabel(activeLesson)} · {tenseName(tense)}
                </p>
                <p className="font-black text-base text-zinc-900 dark:text-zinc-100 leading-relaxed">
                  {lessonTopics(lessonWords) || (en ? 'Sentence' : 'Satz')}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">{tenseName(tense)}</p>
                <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">{en ? 'Review' : 'Wiederholen'}</p>
              </>
            )}
            <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
              {queue.length}{' '}
              {mode === 'review' ? (en ? 'sentences due' : 'Sätze fällig') : en ? 'sentences' : 'Sätze'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              setStarted(true);
            }}
            className={primaryButton}
          >
            {en ? 'Start' : 'Starten'}
          </button>
        </div>
      );
  } else if (done) {
    const total = sessionItems.length || 1;
    body = (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
          {mode === 'review' ? (en ? 'Review done' : 'Wiederholung fertig') : en ? 'Practice complete' : 'Übung abgeschlossen'}
        </p>
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {Math.max(0, total - firstTryWrong.length)} {en ? 'of' : 'von'} {total}{' '}
          {en ? 'right the first time' : 'beim ersten Mal richtig'}
          {mode === 'practice' && (en ? ' · into Review tomorrow' : ' · ab morgen in der Wiederholung')}
        </p>
        <button
          type="button"
          onClick={() => {
            playSound('tap');
            build(mode);
          }}
          className={primaryButton}
        >
          {mode === 'review' ? (en ? 'Review again' : 'Nochmal wiederholen') : en ? 'Practice again' : 'Nochmal üben'}
        </button>
      </div>
    );
  } else if (current) {
    const ex = current;
    body = (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check(input);
        }}
        className="flex-1 min-h-0 flex flex-col"
      >
        {/* Lesson on the left, the tense in the middle, counter top right */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
          <span className="text-[10px] uppercase">
            {ex.level} · {ex.lektion === 0 ? 'Intro' : `L${ex.lektion}`}
          </span>
          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            {tenseName(ex.tense)}
          </span>
          {round > 1 ? (
            <span className="justify-self-end px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80">
              {en ? `Redo ${round - 1}` : `Wiederholung ${round - 1}`} • {index + 1} / {queue.length}
            </span>
          ) : (
            <span className="justify-self-end">
              {index + 1} / {queue.length}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 kb:gap-2 px-1">
          <span className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-black text-zinc-600 dark:text-zinc-300">
            {ex.verb}
          </span>
          <p className="text-2xl sm:text-3xl kb:text-xl font-black text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">
            {ex.subject}
            {gap(ex.finite)}
            {[ex.reflexive, ex.middle].filter(Boolean).join(' ')}
            {ex.end ? gap(ex.end, true) : ''}.
          </p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center">({ex.english})</p>
          {result !== null && (
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                speakGerman(sentenceText(ex));
              }}
              title={en ? 'Listen to the sentence' : 'Satz anhören'}
              aria-label={en ? 'Listen to the sentence' : 'Satz anhören'}
              className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer active:scale-95"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="pt-4 kb:pt-2 space-y-2.5">
          {result === null ? (
            <>
              <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  aria-label={en ? 'Your answer' : 'Deine Antwort'}
                  className="w-full bg-transparent text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={speak}
                  className={`flex-1 py-3 rounded-xl font-black text-xs cursor-pointer transition-all border border-zinc-200 dark:border-zinc-700 active:scale-95 shadow-2xs ${
                    isListening
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse border-red-600'
                      : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100'
                  }`}
                >
                  {isListening ? (en ? 'Listening...' : 'Zuhören...') : en ? 'Speak' : 'Sprechen'}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="flex-1 py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {en ? 'Check' : 'Prüfen'}
                </button>
              </div>
            </>
          ) : (
            <div className="w-full space-y-3 animate-fadeIn">
              {!result && (
                <div className="w-full px-4 py-3.5 bg-red-50 dark:bg-red-950/40 border-2 border-red-500 dark:border-red-600 rounded-2xl flex items-center gap-2.5 shadow-xs">
                  <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 stroke-[3]" />
                  <span className="font-bold text-base sm:text-lg text-red-900 dark:text-red-100 truncate">{input.trim()}</span>
                </div>
              )}
              <div className="w-full px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                  <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">{sentenceAnswer(ex)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound('tap');
                    speakGerman(sentenceText(ex));
                  }}
                  title={en ? 'Listen' : 'Anhören'}
                  className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 hover:bg-emerald-200 dark:hover:bg-emerald-800 text-emerald-800 dark:text-emerald-200 transition-all cursor-pointer shrink-0 ml-1 active:scale-95"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={next}
                className={`w-full py-3.5 ${
                  result ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all`}
              >
                {result ? (en ? 'Continue' : 'Weiter') : en ? 'Got It' : 'Verstanden'}
              </button>
            </div>
          )}
        </div>
      </form>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-start pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-hidden">
      <div className="max-w-xl mx-auto w-full flex-1 min-h-0 flex flex-col">
        {/* As everywhere: the bars belong to the Start screen, not to a running session */}
        {!started && (
          <>
            {tenseBar}
            {modeBar}
            {mode === 'practice' && filterBar}
          </>
        )}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm">
          {body}
        </div>
      </div>
    </div>
  );
};
