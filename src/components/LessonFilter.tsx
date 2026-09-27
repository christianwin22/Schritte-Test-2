import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CEFRLevel } from '../types';
import { playSound } from '../utils/audioEffects';

/**
 * The one level + lesson filter every exercise uses (Words, the noun drills, the
 * three tenses, Sentence): A1 / A2 / B1, then a lesson picker with Intro, All,
 * lessons 1–7 + A1.1 and 8–14 + A1.2.
 *
 *   amber   waiting to be practised here
 *   grey    done
 *   faded   nothing here for this exercise (can't be picked)
 */
export type LessonPick = number | 'ALL' | 'PART_1' | 'PART_2';

/** Is this lesson inside the pick? A1.1 is Intro–7, A1.2 is 8–14. */
export const inPick = (lektion: number, pick: LessonPick) =>
  pick === 'ALL' ? true : pick === 'PART_1' ? lektion >= 0 && lektion <= 7 : pick === 'PART_2' ? lektion >= 8 && lektion <= 14 : lektion === pick;

export const pickLabel = (pick: LessonPick, level: string, en: boolean) =>
  pick === 'ALL'
    ? en
      ? 'All'
      : 'Alle'
    : pick === 0
    ? 'Intro'
    : pick === 'PART_1'
    ? `${level}.1`
    : pick === 'PART_2'
    ? `${level}.2`
    : `${en ? 'Lesson' : 'Lektion'} ${pick}`;

export const parsePick = (v: string): LessonPick | null =>
  v === 'ALL' || v === 'PART_1' || v === 'PART_2' ? v : Number.isFinite(Number(v)) ? Number(v) : null;

interface LessonFilterProps {
  level: CEFRLevel;
  pick: LessonPick;
  onLevel: (level: CEFRLevel) => void;
  onPick: (pick: LessonPick) => void;
  /** Does this lesson have anything for the exercise that is open? */
  hasItems: (level: string, lektion: number) => boolean;
  isWaiting?: (level: string, lektion: number) => boolean;
  isDone?: (level: string, lektion: number) => boolean;
  /** Shown above the lessons (Sandbox tests). */
  extra?: (close: () => void) => React.ReactNode;
  en: boolean;
}

export const LessonFilter: React.FC<LessonFilterProps> = ({
  level,
  pick,
  onLevel,
  onPick,
  hasItems,
  isWaiting = () => false,
  isDone = () => false,
  extra,
  en,
}) => {
  const [open, setOpen] = useState(false);
  const levelWaiting = (lvl: string) => Array.from({ length: 15 }, (_, l) => l).some((l) => isWaiting(lvl, l));
  const hasIntro = hasItems(level, 0);
  const choose = (p: LessonPick) => {
    playSound('tap');
    onPick(p);
    setOpen(false);
  };

  const lessonButton = (num: number) => {
    const isEmpty = !hasItems(level, num);
    const waiting = isWaiting(level, num);
    const done = isDone(level, num);
    return (
      <button
        key={num}
        type="button"
        disabled={isEmpty}
        onClick={() => !isEmpty && choose(num)}
        title={done ? (en ? `Lesson ${num}: Completed` : `Lektion ${num}: Abgeschlossen`) : en ? `Lesson ${num}` : `Lektion ${num}`}
        className={`py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
          isEmpty
            ? 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
            : pick === num
            ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ${waiting ? 'ring-amber-400' : 'ring-zinc-400/80 dark:ring-zinc-500/80'}`
            : waiting
            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500 shadow-2xs'
            : done
            ? 'bg-zinc-400 hover:bg-zinc-450 text-zinc-950 dark:bg-zinc-500 dark:hover:bg-zinc-450 dark:text-zinc-950 border border-zinc-500/70 dark:border-zinc-400/70 shadow-2xs'
            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        }`}
      >
        {num}
      </button>
    );
  };
  const partButton = (part: 'PART_1' | 'PART_2') => (
    <button
      type="button"
      onClick={() => choose(part)}
      className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
        pick === part
          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-250 dark:hover:bg-zinc-650'
      }`}
    >
      {level}.{part === 'PART_1' ? 1 : 2}
    </button>
  );
  const introWaiting = isWaiting(level, 0);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-1.5 sm:p-2 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs mb-2">
      <div className="flex flex-row items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
          {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                playSound('tap');
                onLevel(lvl);
              }}
              className={`relative px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                level === lvl
                  ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              {lvl}
              {levelWaiting(lvl) && (
                <span
                  aria-label={en ? 'has a lesson to practise' : 'hat eine Lektion zum Üben'}
                  className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-white dark:ring-zinc-900"
                />
              )}
            </button>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            id="lesson-filter-button"
            type="button"
            onClick={() => {
              playSound('tap');
              setOpen((o) => !o);
            }}
            className={`px-2.5 sm:px-3 py-1 active:scale-98 font-black text-xs rounded-xl shadow-xs border flex items-center gap-1.5 transition-all cursor-pointer ${
              typeof pick === 'number' && isWaiting(level, pick)
                ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-500'
                : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <span>{pick === -1 ? (en ? 'Test' : 'Test') : pickLabel(pick, level, en)}</span>
            <ChevronDown className={`w-3 h-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-1.5 z-30 w-80 sm:w-[360px] bg-white dark:bg-zinc-900 rounded-2xl p-3 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 space-y-2.5 animate-fadeIn">
                {extra?.(() => setOpen(false))}
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-[11px] font-black text-zinc-500 dark:text-zinc-400">{en ? 'Lesson Filter:' : 'Lektionsfilter:'}</span>
                  <div className="flex items-center gap-1.5">
                    {hasIntro && (
                      <button
                        type="button"
                        onClick={() => choose(0)}
                        title={en ? 'Intro (before Lesson 1)' : 'Intro (vor Lektion 1)'}
                        className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                          pick === 0
                            ? `bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs ring-2 ${
                                introWaiting ? 'ring-amber-400' : 'ring-zinc-400/80 dark:ring-zinc-500/80'
                              }`
                            : introWaiting
                            ? 'bg-amber-400 hover:bg-amber-300 text-amber-950 border border-amber-500'
                            : isDone(level, 0)
                            ? 'bg-zinc-400 hover:bg-zinc-450 text-zinc-950 dark:bg-zinc-500 dark:text-zinc-950 border border-zinc-500/70'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                        }`}
                      >
                        Intro
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => choose('ALL')}
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                        pick === 'ALL'
                          ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                          : 'text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                      }`}
                    >
                      {en ? 'All' : 'Alle'}
                    </button>
                  </div>
                </div>

                {/* Row 1 = 1 to 7 + Level.1, Row 2 = 8 to 14 + Level.2 */}
                <div className="space-y-1.5 p-0.5">
                  <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.35fr)] gap-1.5">
                    {[1, 2, 3, 4, 5, 6, 7].map(lessonButton)}
                    {partButton('PART_1')}
                  </div>
                  <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,1.35fr)] gap-1.5">
                    {[8, 9, 10, 11, 12, 13, 14].map(lessonButton)}
                    {partButton('PART_2')}
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
