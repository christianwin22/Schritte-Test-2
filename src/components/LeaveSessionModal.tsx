import React from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '../utils/audioEffects';
import { AppLanguage } from '../utils/translations';

interface LeaveSessionModalProps {
  isOpen: boolean;
  /** Tapped outside: stay in the session. */
  onStay: () => void;
  /** Keep the place, so the Start page offers Resume or Start over. */
  onSave: () => void;
  /** Forget the place: next time starts from the first card. */
  onEnd: () => void;
  appLanguage?: AppLanguage;
}

/** Leaving a Words session mid-way: Save or End session. */
export const LeaveSessionModal: React.FC<LeaveSessionModalProps> = ({ isOpen, onStay, onSave, onEnd, appLanguage = 'en' }) => {
  if (!isOpen) return null;
  const en = appLanguage === 'en';

  // On document.body, so no card (its 3D flip makes its own layer) can show through.
  return createPortal(
    <div
      onClick={() => {
        playSound('tap');
        onStay();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leave-session-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xl border-2 border-zinc-200 dark:border-zinc-800 text-center space-y-4 animate-scaleUp cursor-default"
      >
        <h3 id="leave-session-title" className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
          {en ? 'Leave this session?' : 'Diese Sitzung verlassen?'}
        </h3>
        <div className="space-y-2 pt-2">
          <button
            onClick={() => {
              playSound('tap');
              onSave();
            }}
            className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xs transition-all cursor-pointer dark:bg-white dark:text-zinc-950"
          >
            {en ? 'Save' : 'Speichern'}
          </button>
          <button
            onClick={() => {
              playSound('tap');
              onEnd();
            }}
            className="w-full py-3.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 text-zinc-900 dark:text-zinc-100 font-black text-sm rounded-2xl transition-all cursor-pointer border border-zinc-200 dark:border-zinc-700"
          >
            {en ? 'End session' : 'Sitzung beenden'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
