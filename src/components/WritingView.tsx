import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Volume2, X } from 'lucide-react';
import {
  QUESTION_ITEMS,
  TRANSLATE_ITEMS,
  isTranslationCorrect,
} from '../data/writingExercises';
import { listenToGermanSpeech, speakGerman } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage } from '../utils/translations';

type WritingMode = 'writing_translate' | 'writing_answer';

interface WritingViewProps {
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  appLanguage?: AppLanguage;
}

const shuffled = <T,>(list: T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Writing: Translate (English → German) and Answer (a German question, answered
 * in German). Both take a typed or a spoken answer. The same card, boxes and
 * buttons as Vocabulary Practice.
 */
export const WritingView: React.FC<WritingViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  activeExerciseMode,
  onSelectExerciseMode,
  appLanguage = 'en',
}) => {
  const en = appLanguage === 'en';
  const mode = (activeExerciseMode === 'writing_translate' || activeExerciseMode === 'writing_answer'
    ? activeExerciseMode
    : null) as WritingMode | null;

  const [order, setOrder] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [feedback, setFeedback] = useState<{ correct: boolean | null; given: string } | null>(null);
  const [done, setDone] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(
    () => (mode === 'writing_translate' ? TRANSLATE_ITEMS : mode === 'writing_answer' ? QUESTION_ITEMS : []),
    [mode]
  );

  // A new order each time an exercise is opened.
  const startRound = () => {
    setOrder(shuffled(items.map((i) => i.id)));
    setIndex(0);
    setInput('');
    setFeedback(null);
    setDone(false);
  };
  useEffect(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    startRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const current = items.find((i) => i.id === order[index]);
  const translate = mode === 'writing_translate' ? TRANSLATE_ITEMS.find((i) => i.id === order[index]) : undefined;
  const question = mode === 'writing_answer' ? QUESTION_ITEMS.find((i) => i.id === order[index]) : undefined;

  useEffect(() => {
    if (!feedback) inputRef.current?.focus();
  }, [index, feedback]);

  const submit = (answer: string) => {
    const given = answer.trim();
    if (!given || feedback || !current) return;
    if (translate) {
      const correct = isTranslationCorrect(given, translate);
      if (correct) {
        playSound('correct');
        onCorrectAnswer(20);
      } else {
        playSound('wrong');
        onWrongAnswer();
      }
      speakGerman(translate.german[0]);
      setFeedback({ correct, given });
    } else {
      // A free answer: nothing to mark, only an example to compare with.
      playSound('tap');
      onCorrectAnswer(10);
      setFeedback({ correct: null, given });
    }
  };

  const next = () => {
    playSound('tap');
    inputRef.current?.focus();
    setInput('');
    setFeedback(null);
    if (index + 1 < order.length) setIndex((i) => i + 1);
    else setDone(true);
  };

  const speak = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (feedback) return;
    playSound('tap');
    inputRef.current?.blur();
    setIsListening(true);
    recognitionRef.current = listenToGermanSpeech(
      (transcript) => {
        setIsListening(false);
        setInput(transcript.trim());
        inputRef.current?.focus(); // check it, or fix it first
      },
      () => setIsListening(false),
      () => setIsListening(false),
      'de-DE'
    );
  };

  // HUB: the two exercises
  if (!mode) {
    const exercises: { id: WritingMode; title: string }[] = [
      { id: 'writing_translate', title: en ? 'Translate' : 'Übersetzen' },
      { id: 'writing_answer', title: en ? 'Answer' : 'Antworten' },
    ];
    return (
      <div className="w-full h-full flex flex-col justify-start gap-2.5 pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-y-auto">
        <div className="max-w-xl mx-auto w-full bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xs p-3 space-y-2">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              id={`writing-mode-${ex.id}`}
              onClick={() => {
                playSound('tap');
                onSelectExerciseMode(ex.id);
              }}
              className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-white text-left font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
            >
              <span>{ex.title}</span>
              <ArrowRight className="w-4 h-4 text-zinc-400 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  const germanShown = translate ? translate.german[0] : question?.example ?? '';

  return (
    <div className="w-full h-full flex flex-col justify-start pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-hidden">
      <div className="max-w-xl mx-auto w-full h-full flex flex-col">
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm">
          {done ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
              <p className="font-black text-lg text-zinc-900 dark:text-zinc-100">{en ? 'All done' : 'Fertig'}</p>
              <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
                {order.length} {translate || mode === 'writing_translate' ? (en ? 'sentences' : 'Sätze') : en ? 'questions' : 'Fragen'}
              </p>
              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  startRound();
                }}
                className="w-full max-w-xs py-3.5 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm rounded-2xl shadow-xs cursor-pointer active:scale-[0.98] transition-all"
              >
                {en ? 'Again' : 'Nochmal'}
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between text-xs font-black text-zinc-400 dark:text-zinc-500 tracking-wider">
                <span className="text-[10px] uppercase">
                  {mode === 'writing_translate' ? 'EN → DE' : en ? 'Answer in German' : 'Auf Deutsch antworten'}
                </span>
                <span>
                  {index + 1} / {order.length}
                </span>
              </div>

              {/* The prompt, in the middle */}
              <div className="w-full bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex flex-col items-center justify-center gap-3 text-center flex-1 min-h-[120px] p-4 sm:p-6">
                <h3 className="font-black text-zinc-900 dark:text-zinc-100 tracking-tight text-xl sm:text-2xl leading-snug">
                  {translate ? translate.english : question?.question}
                </h3>
                {question && (
                  <>
                    <p className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400">({question.english})</p>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        speakGerman(question.question);
                      }}
                      title={en ? 'Listen' : 'Anhören'}
                      aria-label={en ? 'Listen' : 'Anhören'}
                      className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 transition-all cursor-pointer active:scale-95"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {!feedback ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit(input);
                  }}
                  className="w-full space-y-3"
                >
                  <div className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 focus-within:border-zinc-950 dark:focus-within:border-white rounded-2xl transition-all shadow-xs">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      autoFocus
                      autoComplete="off"
                      autoCorrect="off"
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
                </form>
              ) : (
                <div className="w-full space-y-3 animate-fadeIn">
                  {feedback.correct !== true && (
                    <div
                      className={`w-full px-4 py-3.5 rounded-2xl flex items-center gap-2.5 shadow-xs border-2 ${
                        feedback.correct === false
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-500 dark:border-red-600'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600'
                      }`}
                    >
                      {feedback.correct === false && <X className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 stroke-[3]" />}
                      <span
                        className={`font-bold text-base sm:text-lg ${
                          feedback.correct === false ? 'text-red-900 dark:text-red-100' : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {feedback.given}
                      </span>
                    </div>
                  )}
                  {/* The right answer (Translate) or an example answer (Answer) */}
                  <div className="w-full px-4 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 dark:border-emerald-600 rounded-2xl flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 stroke-[3]" />
                      <span className="font-black text-base sm:text-lg text-emerald-900 dark:text-emerald-100">
                        {question && (
                          <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
                            {en ? 'Example answer' : 'Beispielantwort'}
                          </span>
                        )}
                        {germanShown}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        playSound('tap');
                        speakGerman(germanShown);
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
                      feedback.correct === false ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    } active:scale-95 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all`}
                  >
                    {feedback.correct === false ? (en ? 'Got It' : 'Verstanden') : en ? 'Continue' : 'Weiter'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
