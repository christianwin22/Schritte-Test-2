import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, LayoutGrid, Volume2, X } from 'lucide-react';
import { CEFRLevel, FSRSCardRecord, WordEntry } from '../types';
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import {
  isCardDueForReview,
  loadAllFSRSRecords,
  reviewCard,
  saveAllFSRSRecords,
  unlockWordsAfterPractice,
} from '../utils/srsEngine';
import { speakGerman, speakGermanSequence } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage } from '../utils/translations';
import { lessonTopics } from './SchritteVocabView';
import { LearnPager } from './LearnPager';

/**
 * Grammar · Conjugation — Learn | Practice | Review, lesson by lesson, like Flashcard.
 *
 * - Learn: one card per verb of the lesson. Front: the verb. Back: its six
 *   present-tense forms, by person (1st / 2nd / 3rd) and number.
 * - Practice: type all six forms. A verb with a mistake comes back in a redo
 *   round until it is right. Finishing puts the lesson's verbs into Review,
 *   due tomorrow.
 * - Review: the verbs that are due, scheduled by the same engine as Flashcard.
 *
 * The forms come from the word list's own "Present tense" column.
 */

type Mode = 'learn' | 'practice' | 'review';
type LearnView = 'table' | 'rows' | 'cards';
const LEARN_VIEWS: LearnView[] = ['table', 'rows', 'cards'];

interface ConjugationViewProps {
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  onQuizActiveChange?: (isActive: boolean, progressIsSaved?: boolean) => void;
  backHandlerRef?: React.MutableRefObject<(() => boolean) | null>;
  appLanguage?: AppLanguage;
}

// ich · du · er/sie/es · wir · ihr · sie/Sie — the order of the word list's column
const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
const SPOKEN_PRONOUNS = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];
// On screen: one row per person, singular on the left, plural on the right.
const ROWS: { person: string; personDe: string; singular: number; plural: number }[] = [
  { person: '1st person', personDe: '1. Person', singular: 0, plural: 3 },
  { person: '2nd person', personDe: '2. Person', singular: 1, plural: 4 },
  { person: '3rd person', personDe: '3. Person', singular: 2, plural: 5 },
];
const TYPING_ORDER = [0, 1, 2, 3, 4, 5]; // ich, du, er — then wir, ihr, sie (as Tab goes)

export const conjCardId = (wordId: string) => `conj:${wordId}`;

const VERBS = INITIAL_VOCABULARY.filter((w) => w.presentTense?.length === 6);

/**
 * The six forms: Singular | Plural across, 1st / 2nd / 3rd down the side. The
 * top-left corner is left open — no lines above "1st" or left of "Singular".
 * Cells come in column order (ich, du, er, then wir, ihr, sie), so Tab on a
 * keyboard goes down Singular, then down Plural.
 */
const LINE = 'border-zinc-200 dark:border-zinc-700';
const ConjTable: React.FC<{
  en: boolean;
  cell: (slot: number) => React.ReactNode;
  tint?: (slot: number) => string;
  pad?: string;
}> = ({ en, cell, tint = () => 'bg-white dark:bg-zinc-900', pad = 'px-3 py-3' }) => (
  <div className="w-full grid grid-cols-[3rem_1fr_1fr]">
    <span style={{ gridRow: 1, gridColumn: 1 }} />
    <span
      style={{ gridRow: 1, gridColumn: 2 }}
      className={`py-2 text-center text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-t-2 border-l-2 border-b-2 border-r ${LINE} rounded-tl-2xl`}
    >
      Singular
    </span>
    <span
      style={{ gridRow: 1, gridColumn: 3 }}
      className={`py-2 text-center text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-t-2 border-r-2 border-b-2 ${LINE} rounded-tr-2xl`}
    >
      Plural
    </span>
    {[0, 1, 2].map((i) => (
      <span
        key={`p${i}`}
        style={{ gridRow: i + 2, gridColumn: 1 }}
        className={`flex items-center justify-center text-xs font-black text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/60 border-l-2 border-r-2 ${LINE} ${
          i === 0 ? 'border-t-2 rounded-tl-2xl' : ''
        } ${i === 2 ? 'border-b-2 rounded-bl-2xl' : 'border-b'}`}
      >
        {en ? ['1st', '2nd', '3rd'][i] : ['1.', '2.', '3.'][i]}
      </span>
    ))}
    {[0, 1, 2, 3, 4, 5].map((slot) => {
      const plural = slot >= 3;
      const i = slot % 3;
      return (
        <div
          key={slot}
          style={{ gridRow: i + 2, gridColumn: plural ? 3 : 2 }}
          className={`${pad} min-w-0 text-left ${LINE} ${tint(slot)} ${plural ? 'border-r-2' : 'border-r'} ${
            i === 2 ? 'border-b-2' : 'border-b'
          } ${plural && i === 2 ? 'rounded-br-2xl' : ''}`}
        >
          {cell(slot)}
        </div>
      );
    })}
  </div>
);


/** Capitals and extra spaces don't count, nor a pronoun typed in front ("ich komme"). */
const normalise = (text: string) =>
  text
    .toLowerCase()
    .replace(/[.!?,]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const isFormCorrect = (answer: string, expected: string, slot: number) => {
  const given = normalise(answer);
  const want = normalise(expected);
  if (given === want) return true;
  const pronouns = slot === 2 ? ['er', 'sie', 'es'] : slot === 5 ? ['sie'] : [SPOKEN_PRONOUNS[slot]];
  return pronouns.some((p) => given === `${p} ${want}`);
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

export const ConjugationView: React.FC<ConjugationViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  onRequestAbandon,
  onQuizActiveChange,
  backHandlerRef,
  appLanguage = 'en',
}) => {
  const en = appLanguage === 'en';

  // --- Filter: level and lesson, kept for next time ---------------------------------
  const [level, setLevel] = useState<CEFRLevel>(() =>
    readStored<CEFRLevel>('schritte_conj_level', 'A1', (v) => (['A1', 'A2', 'B1'].includes(v) ? (v as CEFRLevel) : null))
  );
  const lessonsOfLevel = useMemo(
    () => [...new Set(VERBS.filter((v) => v.level === level).map((v) => v.lektion ?? 0))].sort((a, b) => a - b),
    [level]
  );
  const [lesson, setLesson] = useState<number>(() =>
    readStored<number>('schritte_conj_lesson', 1, (v) => (Number.isFinite(Number(v)) ? Number(v) : null))
  );
  const activeLesson = lessonsOfLevel.includes(lesson) ? lesson : lessonsOfLevel.find((l) => l > 0) ?? lessonsOfLevel[0] ?? 1;
  useEffect(() => {
    try {
      localStorage.setItem('schritte_conj_level', level);
      localStorage.setItem('schritte_conj_lesson', String(activeLesson));
    } catch {
      // ignore
    }
  }, [level, activeLesson]);
  const [isLessonOpen, setIsLessonOpen] = useState(false);

  const lessonVerbs = useMemo(
    () => VERBS.filter((v) => v.level === level && (v.lektion ?? 0) === activeLesson),
    [level, activeLesson]
  );

  // --- Review records ----------------------------------------------------------------
  const [records, setRecords] = useState<Record<string, FSRSCardRecord>>(() => loadAllFSRSRecords());
  const updateRecords = (change: (prev: Record<string, FSRSCardRecord>) => Record<string, FSRSCardRecord>) =>
    setRecords((prev) => {
      // Start from what is stored, so Flashcard's and the drills' cards are never overwritten.
      const next = change({ ...loadAllFSRSRecords(), ...prev });
      saveAllFSRSRecords(next);
      return next;
    });
  const unlocked = useMemo(
    () =>
      VERBS.filter((v) => {
        const r = records[conjCardId(v.id)];
        return !!r?.isUnlocked && r.status === 'review';
      }),
    [records]
  );
  const due = useMemo(() => unlocked.filter((v) => isCardDueForReview(records[conjCardId(v.id)])), [unlocked, records]);

  // --- Mode and session --------------------------------------------------------------
  const [mode, setMode] = useState<Mode>('learn');
  const [started, setStarted] = useState(false);

  // Learn — three layouts to choose from, remembered for next time
  const [learnView, setLearnView] = useState<LearnView>(() =>
    readStored<LearnView>('schritte_conj_learn_view', 'table', (v) => ((LEARN_VIEWS as string[]).includes(v) ? (v as LearnView) : null))
  );
  const learnViewLabel: Record<LearnView, string> = en
    ? { table: 'Table', rows: 'Rows', cards: 'Cards' }
    : { table: 'Tabelle', rows: 'Zeilen', cards: 'Karten' };
  const [learnIndex, setLearnIndex] = useState(0);
  const [learnDone, setLearnDone] = useState(false);

  // Practice / Review
  const [queue, setQueue] = useState<WordEntry[]>([]);
  const [sessionVerbs, setSessionVerbs] = useState<WordEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [redo, setRedo] = useState<WordEntry[]>([]);
  const [inputs, setInputs] = useState<string[]>(['', '', '', '', '', '']);
  const [results, setResults] = useState<boolean[] | null>(null);
  const [firstTryWrong, setFirstTryWrong] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const checkedAt = useRef(0);

  const buildSession = (m: Mode) => {
    const list = m === 'review' ? shuffled(due.length > 0 ? due : unlocked) : shuffled(lessonVerbs);
    setQueue(list);
    setSessionVerbs(list);
    setIndex(0);
    setRound(1);
    setRedo([]);
    setInputs(['', '', '', '', '', '']);
    setResults(null);
    setFirstTryWrong([]);
    setDone(false);
  };

  const resetLearn = () => {
    setLearnIndex(0);
    setLearnDone(false);
  };

  // A new lesson, or a new mode: back to the start of it.
  useEffect(() => {
    setStarted(false);
    resetLearn();
    buildSession(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level, activeLesson]);

  const current = queue[index];
  const answeredAny = index > 0 || round > 1 || results !== null;
  const inSession = mode !== 'learn' && started && !done;
  const inProgress = inSession && answeredAny;

  useEffect(() => {
    onQuizActiveChange?.(inProgress, mode === 'review');
  }, [inProgress, mode, onQuizActiveChange]);
  useEffect(() => () => onQuizActiveChange?.(false), [onQuizActiveChange]);

  // Back arrow / title: out of a running Practice or Review to its Start screen.
  const leaveSession = () => {
    buildSession(mode);
    setStarted(false);
  };
  const handleBack = (): boolean => {
    if (mode === 'learn' || !started) return false;
    if (inProgress) onRequestAbandon(leaveSession);
    else leaveSession();
    return true;
  };
  useEffect(() => {
    if (backHandlerRef) backHandlerRef.current = handleBack;
  });
  useEffect(
    () => () => {
      if (backHandlerRef) backHandlerRef.current = null;
    },
    [backHandlerRef]
  );

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    const go = () => {
      playSound('tap');
      setMode(m);
    };
    if (inProgress) onRequestAbandon(go);
    else go();
  };

  // --- Typing ------------------------------------------------------------------------
  const expected = current?.presentTense ?? [];
  const asked = (slot: number) => expected[slot] && expected[slot] !== '-';

  // The first box is ready for typing whenever a new verb comes up.
  useEffect(() => {
    if (!inSession || results) return;
    const first = TYPING_ORDER.find((s) => asked(s));
    if (first !== undefined) inputRefs.current[first]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inSession, index, round, results]);

  const allFilled = TYPING_ORDER.every((s) => !asked(s) || inputs[s].trim());

  const check = () => {
    if (!current || results || !allFilled) return;
    checkedAt.current = Date.now();
    const res = expected.map((form, slot) => !asked(slot) || isFormCorrect(inputs[slot], form, slot));
    const allRight = res.every(Boolean);
    setResults(res);
    if (allRight) {
      playSound('correct');
      onCorrectAnswer(20);
    } else {
      playSound('wrong');
      onWrongAnswer();
      if (round === 1) setFirstTryWrong((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
    }
    if (mode === 'review') {
      const id = conjCardId(current.id);
      updateRecords((prev) => ({ ...prev, [id]: reviewCard(id, allRight, prev[id]) }));
    } else if (!allRight) {
      setRedo((prev) => (prev.some((w) => w.id === current.id) ? prev : [...prev, current]));
    }
  };

  const next = () => {
    playSound('tap');
    setInputs(['', '', '', '', '', '']);
    setResults(null);
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
      const ids = sessionVerbs.map((v) => conjCardId(v.id));
      updateRecords((prev) => unlockWordsAfterPractice(ids, prev));
    }
  };

  // Enter moves to the next box; on the last one it checks — and after checking it goes on.
  const onKeyDown = (slot: number) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const order = TYPING_ORDER.filter((s) => asked(s));
    const at = order.indexOf(slot);
    // The screen keyboard's Enter / Next goes box by box: ich → du → er → wir → ihr → sie.
    if (at < order.length - 1) {
      inputRefs.current[order[at + 1]]?.focus();
      return;
    }
    // On the last box it checks — once every box has something in it; otherwise back to the first empty one.
    if (allFilled) {
      check();
      return;
    }
    const empty = order.find((s) => !inputs[s].trim());
    if (empty !== undefined) inputRefs.current[empty]?.focus();
  };
  useEffect(() => {
    if (!results) return;
    const onKey = (e: KeyboardEvent) => {
      // The Enter that did the checking must not also go on: the answer has to be seen.
      if (e.key !== 'Enter' || Date.now() - checkedAt.current < 400) return;
      e.preventDefault();
      next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const speakAll = (verb: WordEntry) => {
    const forms = verb.presentTense ?? [];
    const lines = forms
      .map((f, i) => (f === '-' ? '' : i === 2 && forms[0] === '-' ? `es ${f}` : `${SPOKEN_PRONOUNS[i]} ${f}`))
      .filter(Boolean);
    speakGerman(lines.join('. '));
  };

  // Learn: when a verb comes up it is read out — the verb, then ich …, du …, er …,
  // wir …, ihr …, sie … — one by one. Turning the page or tapping a speaker stops it.
  const autoplayVerb = mode === 'learn' && !learnDone ? lessonVerbs[learnIndex] : undefined;
  useEffect(() => {
    if (!autoplayVerb) return;
    const forms = autoplayVerb.presentTense ?? [];
    const lines = [
      autoplayVerb.lemma,
      ...forms.map((f, i) => (f === '-' ? '' : i === 2 && forms[0] === '-' ? `es ${f}` : `${SPOKEN_PRONOUNS[i]} ${f}`)),
    ].filter(Boolean);
    return speakGermanSequence(lines);
  }, [autoplayVerb]);

  // --- Pieces ------------------------------------------------------------------------
  const lessonLabel = (l: number) => (l === 0 ? 'Intro' : `${en ? 'Lesson' : 'Lektion'} ${l}`);
  const pill = (active: boolean) =>
    `py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
      active
        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
    }`;

  const modeBar = (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2.5">
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-2xs">
        <button type="button" onClick={() => switchMode('learn')} className={pill(mode === 'learn')}>
          {en ? 'Learn' : 'Lernen'}
        </button>
        <button type="button" onClick={() => switchMode('practice')} className={pill(mode === 'practice')}>
          {en ? 'Practice' : 'Üben'}
        </button>
        <button type="button" onClick={() => switchMode('review')} className={`${pill(mode === 'review')} relative`}>
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
              className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                level === lvl
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {lvl}
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
            className="px-2.5 sm:px-3 py-1 font-black text-xs rounded-xl shadow-xs border flex items-center gap-1.5 transition-all cursor-pointer bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700"
          >
            <span>{lessonLabel(activeLesson)}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${isLessonOpen ? 'rotate-180' : ''}`} />
          </button>
          {isLessonOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setIsLessonOpen(false)} />
              <div className="absolute right-0 mt-1.5 z-30 w-72 bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 animate-fadeIn">
                <div className="grid grid-cols-7 gap-1.5">
                  {lessonsOfLevel.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        setLesson(l);
                        setIsLessonOpen(false);
                      }}
                      className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        l === 0 ? 'col-span-2' : ''
                      } ${
                        l === activeLesson
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {l === 0 ? 'Intro' : l}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /** The six forms by person: singular | plural. */
  const table = (verb: WordEntry) => (
    <div className="w-full grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 text-left">
      <span />
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{en ? 'Singular' : 'Singular'}</span>
      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{en ? 'Plural' : 'Plural'}</span>
      {ROWS.map((row) => (
        <React.Fragment key={row.person}>
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 self-center whitespace-nowrap">
            {en ? row.person : row.personDe}
          </span>
          {[row.singular, row.plural].map((slot) => (
            <span key={slot} className="text-sm sm:text-base leading-snug">
              <span className="block text-[11px] font-bold text-zinc-400">{PRONOUNS[slot]}</span>
              <span className="font-black text-zinc-900 dark:text-zinc-100">{verb.presentTense?.[slot] === '-' ? '–' : verb.presentTense?.[slot]}</span>
            </span>
          ))}
        </React.Fragment>
      ))}
    </div>
  );

  const card = 'flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm text-center';
  const primaryButton =
    'w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all';

  // --- Screens -----------------------------------------------------------------------
  const showBars = mode === 'learn' || !started;
  let body: React.ReactNode;

  if (mode === 'learn') {
    const verb = lessonVerbs[learnIndex];
    const speaker = (text: string, label: string, big = false) => (
      <button
        type="button"
        onClick={() => {
          playSound('tap');
          speakGerman(text);
        }}
        title={en ? `Listen: ${label}` : `Anhören: ${label}`}
        aria-label={en ? `Listen: ${label}` : `Anhören: ${label}`}
        className={`${big ? 'p-2.5' : 'p-1.5'} rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0`}
      >
        <Volume2 className={big ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
      </button>
    );
    body = lessonVerbs.length === 0 ? (
      <div className="flex-1 flex items-center justify-center font-bold text-zinc-500">
        {en ? 'No verbs in this lesson.' : 'Keine Verben in dieser Lektion.'}
      </div>
    ) : learnDone ? (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">{en ? 'Learn round complete' : 'Lernrunde abgeschlossen'}</p>
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {lessonVerbs.length} {en ? 'verbs' : 'Verben'}
        </p>
        <div className="w-full max-w-xs flex gap-2">
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              resetLearn();
            }}
            className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-black text-xs border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95"
          >
            {en ? 'Again' : 'Nochmal'}
          </button>
          <button
            type="button"
            onClick={() => switchMode('practice')}
            className="flex-1 py-3 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
          >
            {en ? 'Go to Practice' : 'Zu den Übungen'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    ) : (
      /* One page per verb. Mac: ← →. iPad / iPhone: tap left or right, or swipe. */
      <LearnPager
        index={learnIndex}
        count={lessonVerbs.length}
        onChange={setLearnIndex}
        onFinish={() => setLearnDone(true)}
        className="flex-1 flex flex-col cursor-pointer"
      >
        {/* The lesson bar above already says which lesson; the counter sits in the middle */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center mb-2">
          <span />
          <span className="text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
            {learnIndex + 1} / {lessonVerbs.length}
          </span>
          <span className="justify-self-end">
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                const next = LEARN_VIEWS[(LEARN_VIEWS.indexOf(learnView) + 1) % LEARN_VIEWS.length];
                setLearnView(next);
                try {
                  localStorage.setItem('schritte_conj_learn_view', next);
                } catch {
                  // ignore
                }
              }}
              title={en ? 'Change the layout' : 'Ansicht wechseln'}
              className="px-2.5 py-1 rounded-xl text-xs font-black bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer active:scale-95 transition-all"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {learnViewLabel[learnView]}
            </button>
          </span>
        </div>
        <div key={verb.id} className="flex-1 flex flex-col justify-center gap-4 animate-fadeIn">
          {/* The verb, in its own box */}
          <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-4 py-4 flex items-center justify-between gap-3">
            <div className="min-w-0 text-left">
              <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{verb.lemma}</h3>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">({verb.translation.replace(/<br>/g, ' · ')})</p>
            </div>
            {speaker(verb.lemma, verb.lemma, true)}
          </div>

          {(() => {
            const formOf = (slot: number) => verb.presentTense?.[slot] ?? '-';
            const spokenOf = (slot: number) =>
              `${slot === 2 && verb.presentTense?.[0] === '-' ? 'es' : SPOKEN_PRONOUNS[slot]} ${formOf(slot)}`;
            /** "ich" in plain black, "heiße" in bold black — with room between them. */
            const pair = (slot: number, inline = false) => (
              <span className={`min-w-0 text-left ${inline ? 'flex items-baseline gap-2' : 'block space-y-1'}`}>
                <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">{PRONOUNS[slot]}</span>
                <span className="block font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 break-words">
                  {formOf(slot) === '-' ? '–' : formOf(slot)}
                </span>
              </span>
            );
            const say = (slot: number) => formOf(slot) !== '-' && speaker(spokenOf(slot), spokenOf(slot));
            const person = (i: number) => (en ? ['1st', '2nd', '3rd'][i] : ['1.', '2.', '3.'][i]);

            if (learnView === 'rows') {
              // Same places for the words as the table, but each person on a card of its own
              return (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-[3rem_1fr_1fr] text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <span />
                    <span className="text-center">Singular</span>
                    <span className="text-center">Plural</span>
                  </div>
                  {ROWS.map((row, i) => (
                    <div key={row.person} className="grid grid-cols-[3rem_1fr] items-center">
                      {/* The person label sits outside the box, like Singular / Plural above */}
                      <span className="text-center text-[10px] font-black uppercase tracking-wider text-zinc-400">{person(i)}</span>
                      <div className="grid grid-cols-2 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xs overflow-hidden">
                        {[row.singular, row.plural].map((slot, k) => (
                          <div
                            key={slot}
                            className={`px-3 py-4 flex items-center justify-between gap-2 min-w-0 ${k > 0 ? 'border-l border-zinc-200 dark:border-zinc-700' : ''}`}
                          >
                            {pair(slot)}
                            {say(slot)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            if (learnView === 'cards') {
              // Two cards side by side: Singular | Plural
              return (
                <div className="grid grid-cols-2 gap-3">
                  {(['singular', 'plural'] as const).map((side) => (
                    <div key={side} className="rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden">
                      <div className="py-2 text-center bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {side === 'singular' ? 'Singular' : 'Plural'}
                      </div>
                      {ROWS.map((row, i) => {
                        const slot = side === 'singular' ? row.singular : row.plural;
                        return (
                          <div
                            key={slot}
                            className={`px-2.5 sm:px-3 py-3.5 flex items-center justify-between gap-1.5 ${i > 0 ? 'border-t border-zinc-200 dark:border-zinc-700' : ''}`}
                          >
                            {/* "1st ich" on one line, the form under it — narrow enough for a phone */}
                            <span className="min-w-0 text-left space-y-1">
                              <span className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-[10px] font-black text-zinc-500 dark:text-zinc-400 shrink-0">
                                  {person(i)}
                                </span>
                                <span className="text-xs sm:text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{PRONOUNS[slot]}</span>
                              </span>
                              <span className="block font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                                {formOf(slot) === '-' ? '–' : formOf(slot)}
                              </span>
                            </span>
                            {say(slot)}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              );
            }

            // Table: 1st / 2nd / 3rd down the side, Singular | Plural across
            return (
              <ConjTable
                en={en}
                pad="px-3 py-4"
                cell={(slot) => (
                  <div className="flex items-center justify-between gap-2">
                    {pair(slot)}
                    {say(slot)}
                  </div>
                )}
              />
            );
          })()}
        </div>
      </LearnPager>
    );
  } else if (!started) {
    const nothing = mode === 'review' ? queue.length === 0 : lessonVerbs.length === 0;
    body = nothing ? (
      <div className="flex-1 flex items-center justify-center font-black text-zinc-900 dark:text-zinc-100">
        {mode === 'review' ? (en ? 'Nothing to review yet' : 'Noch nichts zu wiederholen') : en ? 'No verbs in this lesson.' : 'Keine Verben in dieser Lektion.'}
      </div>
    ) : (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8">
        <div className="space-y-3 max-w-xs">
          {mode === 'practice' ? (
            <>
              <p className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                {level} · {lessonLabel(activeLesson)}
              </p>
              <p className="font-black text-base text-zinc-900 dark:text-zinc-100 leading-relaxed">
                {lessonTopics(lessonVerbs) || (en ? 'Conjugation' : 'Konjugation')}
              </p>
            </>
          ) : (
            <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">{en ? 'Review' : 'Wiederholen'}</p>
          )}
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
            {queue.length} {mode === 'review' ? (en ? 'verbs due' : 'Verben fällig') : en ? 'verbs' : 'Verben'}
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
    const total = sessionVerbs.length || 1;
    const right = Math.max(0, total - firstTryWrong.length);
    body = (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
          {mode === 'review' ? (en ? 'Review done' : 'Wiederholung fertig') : en ? 'Practice complete' : 'Übung abgeschlossen'}
        </p>
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
          {right} {en ? 'of' : 'von'} {total} {en ? 'right the first time' : 'beim ersten Mal richtig'}
          {mode === 'practice' && (en ? ' · into Review tomorrow' : ' · ab morgen in der Wiederholung')}
        </p>
        <button
          type="button"
          onClick={() => {
            playSound('tap');
            buildSession(mode);
          }}
          className={primaryButton}
        >
          {mode === 'review' ? (en ? 'Review again' : 'Nochmal wiederholen') : en ? 'Practice again' : 'Nochmal üben'}
        </button>
      </div>
    );
  } else if (current) {
    const allRight = !!results?.every(Boolean);
    body = (
      <div className="flex-1 flex flex-col justify-between gap-4 kb:gap-2.5 text-left">
        {/* Lesson on the left (the lesson bar is hidden during a session), counter in the middle */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
          <span className="text-[10px] uppercase">
            {current.level} · {current.lektion === 0 ? 'Intro' : `L${current.lektion}`}
          </span>
          {round > 1 ? (
            <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80">
              {en ? `Redo ${round - 1}` : `Wiederholung ${round - 1}`} • {index + 1} / {queue.length}
            </span>
          ) : (
            <span>
              {index + 1} / {queue.length}
            </span>
          )}
        </div>

        {/* The verb */}
        {/* The verb, as on the Learn page: the word and its speaker. Its English only
            after checking, so it can't prompt the answer. Slim when a screen keyboard is up. */}
        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 px-4 py-4 kb:py-2 flex items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <h3 className="text-2xl sm:text-3xl kb:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">{current.lemma}</h3>
            {results && (
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 animate-fadeIn">
                ({current.translation.replace(/<br>/g, ' · ')})
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              playSound('tap');
              speakGerman(current.lemma);
            }}
            title={en ? 'Listen' : 'Anhören'}
            aria-label={en ? `Listen: ${current.lemma}` : `Anhören: ${current.lemma}`}
            className="p-2.5 kb:p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0"
          >
            <Volume2 className="w-5 h-5 kb:w-4 kb:h-4" />
          </button>
        </div>

        {(() => {
          const pronoun = (slot: number) => (
            <span className="block text-[11px] sm:text-xs font-medium text-zinc-500 dark:text-zinc-400">{PRONOUNS[slot]}</span>
          );
          const dash = <span className="block font-black text-zinc-300 dark:text-zinc-600">–</span>;
          const spoken = (slot: number) =>
            `${slot === 2 && expected[0] === '-' ? 'es' : SPOKEN_PRONOUNS[slot]} ${expected[slot]}`;
          const smallSpeaker = (slot: number) => (
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                speakGerman(spoken(slot));
              }}
              title={en ? 'Listen' : 'Anhören'}
              aria-label={en ? `Listen: ${spoken(slot)}` : `Anhören: ${spoken(slot)}`}
              className="p-1.5 rounded-lg bg-white/70 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-all shrink-0"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          );

          if (!results) {
            // Before checking: a box to type in, in every cell
            return (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  check();
                }}
              >
                <ConjTable
                  en={en}
                  pad="px-3 py-3 kb:py-1.5"
                  tint={(slot) =>
                    asked(slot)
                      ? 'bg-white dark:bg-zinc-900 focus-within:bg-zinc-50 dark:focus-within:bg-zinc-800 focus-within:ring-2 focus-within:ring-inset focus-within:ring-zinc-950 dark:focus-within:ring-white'
                      : 'bg-zinc-50/60 dark:bg-zinc-800/40'
                  }
                  cell={(slot) =>
                    !asked(slot) ? (
                      <>
                        {pronoun(slot)}
                        {dash}
                      </>
                    ) : (
                      <label className="block cursor-text">
                        {pronoun(slot)}
                        <input
                          ref={(el) => {
                            inputRefs.current[slot] = el;
                          }}
                          type="text"
                          value={inputs[slot]}
                          onChange={(e) => setInputs((prev) => prev.map((v, k) => (k === slot ? e.target.value : v)))}
                          onKeyDown={onKeyDown(slot)}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          enterKeyHint={slot === TYPING_ORDER.filter((x) => asked(x)).slice(-1)[0] ? 'done' : 'next'}
                          aria-label={PRONOUNS[slot]}
                          className="w-full min-w-0 bg-transparent text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
                        />
                      </label>
                    )
                  }
                />
                {/* invisible submit so the phone's Go key checks */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
              </form>
            );
          }

          // After checking: what you typed, marked right or wrong
          const anyWrong = results.some((r) => !r);
          return (
            <div className="space-y-3 animate-fadeIn">
              <ConjTable
                en={en}
                tint={(slot) =>
                  !asked(slot)
                    ? 'bg-zinc-50/60 dark:bg-zinc-800/40'
                    : results[slot]
                    ? 'bg-emerald-50 dark:bg-emerald-950/40'
                    : 'bg-red-50 dark:bg-red-950/40'
                }
                cell={(slot) =>
                  !asked(slot) ? (
                    <>
                      {pronoun(slot)}
                      {dash}
                    </>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0">
                        {pronoun(slot)}
                        <span
                          className={`flex items-center gap-1.5 font-black text-base sm:text-lg ${
                            results[slot] ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-700 dark:text-red-300'
                          }`}
                        >
                          {results[slot] ? (
                            <Check className="w-4 h-4 shrink-0 stroke-[3]" />
                          ) : (
                            <X className="w-4 h-4 shrink-0 stroke-[3]" />
                          )}
                          <span className="truncate">{inputs[slot].trim()}</span>
                        </span>
                      </span>
                      {/* All right: each form can be heard straight from here */}
                      {!anyWrong && smallSpeaker(slot)}
                    </div>
                  )
                }
              />
              {/* Something wrong: the right forms in a second table, each with its speaker */}
              {anyWrong && (
                <ConjTable
                  en={en}
                  tint={(slot) => (asked(slot) ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'bg-zinc-50/60 dark:bg-zinc-800/40')}
                  cell={(slot) =>
                    !asked(slot) ? (
                      <>
                        {pronoun(slot)}
                        {dash}
                      </>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0">
                          {pronoun(slot)}
                          <span className="block font-black text-base sm:text-lg text-emerald-800 dark:text-emerald-200 truncate">
                            {expected[slot]}
                          </span>
                        </span>
                        {smallSpeaker(slot)}
                      </div>
                    )
                  }
                />
              )}
            </div>
          );
        })()}

        <div>
          {!results ? (
            <button
              type="button"
              onClick={check}
              disabled={!allFilled}
              className="w-full py-3.5 kb:py-3 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 rounded-xl font-black text-xs shadow-xs cursor-pointer active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {en ? 'Check' : 'Prüfen'}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className={`w-full py-3.5 ${
                allRight ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all`}
            >
              {allRight ? (en ? 'Continue' : 'Weiter') : en ? 'Got It' : 'Verstanden'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-start pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-y-auto">
      <div className="max-w-xl mx-auto w-full flex-1 flex flex-col">
        {showBars && (
          <>
            {modeBar}
            {mode !== 'review' && filterBar}
          </>
        )}
        <div className={card}>{body}</div>
      </div>
    </div>
  );
};
