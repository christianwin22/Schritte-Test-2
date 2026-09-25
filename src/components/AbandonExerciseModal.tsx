import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';

interface AbandonExerciseModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
  appLanguage?: AppLanguage;
}

export const AbandonExerciseModal: React.FC<AbandonExerciseModalProps> = ({
  isOpen,
  onStay,
  onLeave,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        playSound('tap');
        onStay();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="abandon-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border-2 border-zinc-200 dark:border-zinc-800 text-center space-y-4 animate-scaleUp cursor-default"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
          <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
        </div>

        <h3
          id="abandon-dialog-title"
          className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight"
        >
          {t.abandonTitle}
        </h3>

        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              playSound('tap');
              onStay();
            }}
            className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xs transition-all cursor-pointer dark:bg-white dark:text-zinc-950"
          >
            {t.keepLearning}
          </button>
          <button
            onClick={() => {
              playSound('tap');
              onLeave();
            }}
            className="w-full py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-2xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            {t.leaveExercise}
          </button>
        </div>
      </div>
    </div>
  );
};
