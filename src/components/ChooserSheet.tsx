import React from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';

export interface ChooserOption {
  value: string;
  label: string;
  hint?: string;
  /** Shown greyed out with a "soon" note; can't be picked. */
  comingSoon?: boolean;
  /** Replaces that note, e.g. "not in this course". */
  soonLabel?: string;
}

interface ChooserSheetProps {
  title: string;
  options: ChooserOption[];
  /** A list turns the sheet into a multiple choice; picking then toggles. */
  selected: string | string[];
  onPick: (value: string) => void;
  onClose: () => void;
  soonLabel?: string;
  doneLabel?: string;
}

/** A small sheet for picking the course or the levels. */
export const ChooserSheet: React.FC<ChooserSheetProps> = ({
  title,
  options,
  selected,
  onPick,
  onClose,
  soonLabel = 'Soon',
  doneLabel = 'Done',
}) => {
  const multi = Array.isArray(selected);
  const isPicked = (value: string) => (Array.isArray(selected) ? selected.includes(value) : selected === value);
  // At least one has to stay picked, or there is nothing to study.
  const isLastOne = (value: string) => Array.isArray(selected) && selected.length === 1 && selected[0] === value;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-3 pb-3 sm:pb-0" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xl p-5 space-y-3 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = isPicked(option.value);
            return (
              <button
                key={option.value}
                type="button"
                disabled={option.comingSoon || isLastOne(option.value)}
                onClick={() => {
                  onPick(option.value);
                  if (!multi) onClose();
                }}
                className={`w-full px-4 py-3 rounded-2xl border-2 flex items-center justify-between gap-3 text-left transition-all ${
                  option.comingSoon
                    ? 'border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed'
                    : isSelected
                    ? 'border-zinc-950 dark:border-white bg-zinc-50 dark:bg-zinc-800 cursor-pointer'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer'
                }`}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 leading-tight">{option.label}</span>
                  {option.hint && (
                    <span className="block text-[11px] font-bold text-zinc-400 leading-tight mt-0.5">{option.hint}</span>
                  )}
                </span>
                {option.comingSoon ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 shrink-0 text-right">
                    {option.soonLabel ?? soonLabel}
                  </span>
                ) : (
                  isSelected && <Check className="w-4 h-4 text-zinc-900 dark:text-white shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {multi && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 rounded-2xl bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 font-black text-sm cursor-pointer active:scale-[0.98] transition-all"
          >
            {doneLabel}
          </button>
        )}
      </div>
    </div>,
    document.body
  );
};
