import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Volume2, X } from 'lucide-react';
import { FSRSCardRecord, SentenceStemExercise } from '../types';
import { SCHRITTE_SENTENCE_STEM_DRILLS } from '../data/schritteVerbs';
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
import { markExerciseDone, readyKey } from '../utils/exerciseReady';

/**
 * Grammar · Sentence — Practice | Review, built like Plural: the verb on a chip,
 * the sentence with a blank for the conjugated verb, and its English.
 *
 * - Practice: every sentence, in a new order; a wrong one comes back in a redo
 *   round until it is right. Finishing puts them into Review, due tomorrow.
 * - Review: the ones that are due, scheduled like everything else.
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
const ALL = SCHRITTE_SENTENCE_STEM_DRILLS;

const clean = (t: string) => t.toLowerCase().replace(/[.!?,]+$/, '').replace(/\s+/g, ' ').trim();
const whole = (ex: SentenceStemExercise) =>
  `${ex.sentenceBefore} ${ex.expectedAnswer} ${ex.sentenceAfter} ${ex.separableEnd || ''}`.replace(/\s+/g, ' ').trim();
const shuffled = <T,>(items: T[]): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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

  const [records, setRecords] = useState<Record<string, FSRSCardRecord>>(() => loadAllFSRSRecords());
  const updateRecords = (change: (prev: Record<string, FSRSCardRecord>) => Record<string, FSRSCardRecord>) =>
    setRecords((prev) => {
      const next = change({ ...loadAllFSRSRecords(), ...prev }); // never drop anyone else's cards
      saveAllFSRSRecords(next);
      return next;
    });
  const unlocked = useMemo(
    () =>
      ALL.filter((ex) => {
        const r = records[sentenceCardId(ex.id)];
        return !!r?.isUnlocked && r.status === 'review';
      }),
    [records]
  );
  const due = useMemo(() => unlocked.filter((ex) => isCardDueForReview(records[sentenceCardId(ex.id)])), [unlocked, records]);

  const [mode, setMode] = useState<Mode>('practice');
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<SentenceStemExercise[]>([]);
  const [sessionItems, setSessionItems] = useState<SentenceStemExercise[]>([]);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(1);
  const [redo, setRedo] = useState<SentenceStemExercise[]>([]);
  const [firstTryWrong, setFirstTryWrong] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const checkedAt = useRef(0);

  const build = (m: Mode) => {
    const list = m === 'review' ? shuffled(due.length > 0 ? due : unlocked) : shuffled(ALL);
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
  useEffect(() => {
    setStarted(false);
    build(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
    const go = () => {
      playSound('tap');
      setMode(m);
    };
    if (inProgress) onRequestAbandon(go);
    else go();
  };

  // A new sentence plays its verb by itself ("kommen"), as Plural plays its singular.
  const verbAudioKey = started && !done && result === null && current ? `${current.id}|${index}|${round}` : '';
  useEffect(() => {
    if (!verbAudioKey || !current) return;
    return speakGermanSequence([current.verbStem]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verbAudioKey]);

  // A new sentence is ready for typing straight away.
  useEffect(() => {
    if (started && !done && result === null) inputRef.current?.focus();
  }, [started, done, index, round, result]);

  const check = (answer: string) => {
    if (!current || result !== null || !answer.trim()) return;
    checkedAt.current = Date.now();
    const ok = clean(answer) === clean(current.expectedAnswer);
    setResult(ok);
    if (ok) {
      playSound('correct');
      onCorrectAnswer(20);
    } else {
      playSound('wrong');
      onWrongAnswer();
      if (round === 1) setFirstTryWrong((p) => (p.includes(current.id) ? p : [...p, current.id]));
    }
    speakGerman(whole(current));
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
      // Every sentence practised: each of their lessons is done here
      markExerciseDone('sentence', [...new Set(sessionItems.map((x) => readyKey('A1', x.lektion ?? 0)))]);
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
  const pill = (active: boolean) =>
    `py-1.5 px-2 sm:px-3 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
      active
        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
    }`;
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
  const primaryButton =
    'w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all';

  let body: React.ReactNode;
  if (!started) {
    body =
      queue.length === 0 ? (
        <div className="flex-1 flex items-center justify-center font-black text-zinc-900 dark:text-zinc-100">
          {en ? 'Nothing to review yet' : 'Noch nichts zu wiederholen'}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-8 text-center">
          <div className="space-y-3 max-w-xs">
            <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">
              {mode === 'review' ? (en ? 'Review' : 'Wiederholen') : en ? 'Sentence' : 'Satz'}
            </p>
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
        {/* Lesson on the left (the lesson bar is hidden during a session), counter in the middle */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
          <span className="text-[10px] uppercase">A1 · L{ex.lektion}</span>
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

        <div className="flex-1 flex flex-col items-center justify-center gap-4 kb:gap-2 px-1">
          <span className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm font-black text-zinc-600 dark:text-zinc-300">
            {ex.verbStem}
          </span>
          <p className="text-2xl sm:text-3xl kb:text-xl font-black text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">
            {ex.sentenceBefore}
            <span
              className={`inline-block min-w-[2.6em] mx-1 px-1 border-b-4 align-baseline ${
                result === null
                  ? 'border-zinc-300 dark:border-zinc-600 text-transparent'
                  : 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {result === null ? ' ' : ex.expectedAnswer}
            </span>
            {ex.sentenceAfter} {ex.separableEnd || ''}
          </p>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center">({ex.fullEnglish})</p>
          {result !== null && (
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                speakGerman(whole(ex));
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
                  <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100 truncate">{ex.expectedAnswer}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    playSound('tap');
                    speakGerman(whole(ex));
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
        {/* As everywhere: the bar belongs to the Start screen, not to a running session */}
        {!started && modeBar}
        <div className="flex-1 min-h-0 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm">
          {body}
        </div>
      </div>
    </div>
  );
};
