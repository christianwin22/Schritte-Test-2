import React, { useEffect } from 'react';
import { Volume2, CheckCircle2, AlertTriangle, XCircle, Sparkles, ArrowRight } from 'lucide-react';
import { EvaluationResult, SRSRating, SRSItemState, WordEntry } from '../types';
import { getIntervalPreview } from '../utils/srsEngine';
import { speakGerman } from '../utils/speech';

interface FeedbackSRSBarProps {
  evaluation: EvaluationResult;
  word: WordEntry;
  srsState: SRSItemState;
  onRate: (rating: SRSRating) => void;
  onNext?: () => void;
}

export const FeedbackSRSBar: React.FC<FeedbackSRSBarProps> = ({
  evaluation,
  word,
  srsState,
  onRate,
}) => {
  const suggested = evaluation.suggestedRating;

  // Keyboard shortcut listener for rating (1: Again, 2: Hard, 3: Good, 4: Easy, Space/Enter: suggested)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an active input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === '1') {
        e.preventDefault();
        onRate('again');
      } else if (e.key === '2') {
        e.preventDefault();
        onRate('hard');
      } else if (e.key === '3') {
        e.preventDefault();
        onRate('good');
      } else if (e.key === '4') {
        e.preventDefault();
        onRate('easy');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onRate(suggested);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onRate, suggested]);

  // Determine monochrome styles based on evaluation type
  const getVerdictStyle = () => {
    switch (evaluation.type) {
      case 'exact':
        return {
          bg: 'bg-zinc-100 dark:bg-zinc-800 border-zinc-900 dark:border-white',
          text: 'text-zinc-900 dark:text-zinc-100',
          icon: <CheckCircle2 className="w-5 h-5 text-zinc-950 dark:text-white shrink-0" />,
          badge: 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white',
        };
      case 'partial_slip':
      case 'umlaut_warning':
      case 'typo_minor':
        return {
          bg: 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600',
          text: 'text-zinc-800 dark:text-zinc-200',
          icon: <AlertTriangle className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" />,
          badge: 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-400',
        };
      case 'wrong':
      default:
        return {
          bg: 'bg-zinc-100 dark:bg-zinc-800/90 border-zinc-300 dark:border-zinc-700',
          text: 'text-zinc-800 dark:text-zinc-200',
          icon: <XCircle className="w-5 h-5 text-zinc-600 dark:text-zinc-400 shrink-0" />,
          badge: 'bg-zinc-300 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-400',
        };
    }
  };

  const style = getVerdictStyle();

  return (
    <div className="w-full space-y-3 animate-fadeIn" id="srs-feedback-container">
      {/* Linguistic Feedback Card */}
      <div className={`p-4 sm:p-5 rounded-2xl border-2 ${style.bg} ${style.text} transition-all shadow-xs`}>
        <div className="flex items-start gap-3">
          {style.icon}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="font-black text-base tracking-tight text-zinc-900 dark:text-white">{evaluation.title}</h4>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${style.badge}`}>
                Score: {evaluation.score}%
              </span>
            </div>
            <p className="text-sm leading-relaxed opacity-95 font-medium">{evaluation.message}</p>

            {/* Answer breakdown info */}
            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-500 dark:text-zinc-400">Correct form:</span>
                <p className="font-mono text-sm font-black tracking-wide text-zinc-900 dark:text-white">
                  {evaluation.expected}
                </p>
              </div>

              <button
                type="button"
                id="btn-speak-feedback"
                onClick={() => speakGerman(evaluation.expected || word.lemma)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 shadow-xs transition-transform active:scale-95 font-bold cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Hear Pronunciation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SRS Rating Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
            <span>How hard was this for you?</span>
          </div>
          <span className="text-[11px] text-zinc-400 hidden sm:inline-block font-medium">
            Keys: 1, 2, 3, 4 or Space to confirm
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Again */}
          <button
            type="button"
            id="srs-btn-again"
            onClick={() => onRate('again')}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
              suggested === 'again'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            <span className="text-xs font-black">
              Again <span className="opacity-60 text-[10px] font-normal">[1]</span>
            </span>
            <span className="text-[10px] opacity-75 mt-0.5 font-medium">
              {getIntervalPreview(srsState, 'again')}
            </span>
            {suggested === 'again' && (
              <span className="absolute -top-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider border border-zinc-200">
                Suggested
              </span>
            )}
          </button>

          {/* Hard */}
          <button
            type="button"
            id="srs-btn-hard"
            onClick={() => onRate('hard')}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
              suggested === 'hard'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            <span className="text-xs font-black">
              Hard <span className="opacity-60 text-[10px] font-normal">[2]</span>
            </span>
            <span className="text-[10px] opacity-75 mt-0.5 font-medium">
              {getIntervalPreview(srsState, 'hard')}
            </span>
            {suggested === 'hard' && (
              <span className="absolute -top-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider border border-zinc-200">
                Suggested
              </span>
            )}
          </button>

          {/* Good */}
          <button
            type="button"
            id="srs-btn-good"
            onClick={() => onRate('good')}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
              suggested === 'good'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            <span className="text-xs font-black">
              Good <span className="opacity-60 text-[10px] font-normal">[3]</span>
            </span>
            <span className="text-[10px] opacity-75 mt-0.5 font-medium">
              {getIntervalPreview(srsState, 'good')}
            </span>
            {suggested === 'good' && (
              <span className="absolute -top-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider border border-zinc-200">
                Suggested
              </span>
            )}
          </button>

          {/* Easy */}
          <button
            type="button"
            id="srs-btn-easy"
            onClick={() => onRate('easy')}
            className={`group relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
              suggested === 'easy'
                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white shadow-xs'
                : 'bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100'
            }`}
          >
            <span className="text-xs font-black">
              Easy <span className="opacity-60 text-[10px] font-normal">[4]</span>
            </span>
            <span className="text-[10px] opacity-75 mt-0.5 font-medium">
              {getIntervalPreview(srsState, 'easy')}
            </span>
            {suggested === 'easy' && (
              <span className="absolute -top-2 bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider border border-zinc-200">
                Suggested
              </span>
            )}
          </button>
        </div>

        {/* Quick Continue Action Button */}
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            id="btn-confirm-next"
            onClick={() => onRate(suggested)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-black text-xs tracking-wide transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <span>Continue with {suggested.toUpperCase()}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
