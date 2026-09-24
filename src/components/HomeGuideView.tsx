import React from 'react';
import {
  BookOpen,
  ChevronDown,
  Zap,
  Headphones,
  Mic,
  BookMarked,
  FileEdit,
  Lock,
} from 'lucide-react';
import { DuolingoTab } from '../types';
import { isTabLocked } from '../config/features';
import { CEFRLevel } from '../types';
import { useAuth } from './AuthGate';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';

interface HomeGuideViewProps {
  onSelectArea: (tab: DuolingoTab) => void;
  /** Which book series the app is using, and which levels of it. */
  series?: string;
  levelRange?: string;
  onChangeSeries?: () => void;
  onChangeLevelRange?: () => void;
  streak?: number;
  xp?: number;
  gems?: number;
  vocabCount?: number;
  dueReviewCount?: number;
  /** Lessons waiting in Der/Die/Das + Plural Practice (amber) */
  lessonsToPractiseCount?: number;
  appLanguage?: AppLanguage;
}

export const HomeGuideView: React.FC<HomeGuideViewProps> = ({
  onSelectArea,
  series = 'Schritte International Neu',
  levelRange = 'A1–B1',
  onChangeSeries,
  onChangeLevelRange,
  dueReviewCount = 0,
  lessonsToPractiseCount = 0,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);
  // Everything stays open in the Sandbox; in the real app only Vocabulary is open for now.
  const isSandbox = useAuth()?.isSandbox ?? false;

  const learningAreas = [
    {
      id: 'vocab' as DuolingoTab,
      label: t.vocab,
      icon: <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
    {
      id: 'grammar' as DuolingoTab,
      label: t.grammar,
      icon: <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
    {
      id: 'listening' as DuolingoTab,
      label: t.listening,
      icon: <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
    {
      id: 'speaking' as DuolingoTab,
      label: t.speaking,
      icon: <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
    {
      id: 'reading' as DuolingoTab,
      label: t.reading,
      icon: <BookMarked className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
    {
      id: 'writing' as DuolingoTab,
      label: t.writing,
      icon: <FileEdit className="w-8 h-8 sm:w-10 sm:h-10 text-current" />,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col py-1 sm:py-3 animate-fadeIn">
      {/* Which book series, and which levels of it — straight under the header */}
      <div className="w-full max-w-4xl mx-auto flex items-stretch gap-2.5 sm:gap-4 shrink-0">
        <button
          type="button"
          id="home-series-button"
          onClick={() => {
            playSound('tap');
            onChangeSeries?.();
          }}
          className="flex-1 min-w-0 px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-zinc-100 shadow-xs transition-all cursor-pointer text-left flex items-center justify-between gap-2"
        >
          <span className="min-w-0">
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {appLanguage === 'en' ? 'Course' : 'Kurs'}
            </span>
            <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100 leading-tight">{series}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>

        <button
          type="button"
          id="home-level-button"
          onClick={() => {
            playSound('tap');
            onChangeLevelRange?.();
          }}
          className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-zinc-100 shadow-xs transition-all cursor-pointer text-left flex items-center gap-2 shrink-0"
        >
          <span>
            <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {appLanguage === 'en' ? 'Levels' : 'Stufen'}
            </span>
            <span className="block text-sm font-black text-zinc-900 dark:text-zinc-100">{levelRange}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center pt-3 sm:pt-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-4xl mx-auto">
        {learningAreas.map((area) => (
          <button
            key={area.id}
            id={`home-area-${area.id}`}
            disabled={isTabLocked(area.id, isSandbox)}
            aria-disabled={isTabLocked(area.id, isSandbox)}
            title={isTabLocked(area.id, isSandbox) ? (appLanguage === 'en' ? 'Coming soon' : 'Kommt bald') : undefined}
            onClick={() => {
              if (isTabLocked(area.id, isSandbox)) return;
              playSound('tap');
              onSelectArea(area.id);
            }}
            className={`w-full relative bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3.5 group min-h-[105px] sm:min-h-[130px] ${
              isTabLocked(area.id, isSandbox)
                ? 'opacity-40 grayscale cursor-not-allowed'
                : 'hover:border-zinc-950 dark:hover:border-zinc-100 hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.98]'
            }`}
          >
            {isTabLocked(area.id, isSandbox) && (
              <span className="absolute top-2 left-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                <Lock className="w-2.5 h-2.5" />
                {appLanguage === 'en' ? 'Soon' : 'Bald'}
              </span>
            )}
            {/* Notification Badge on Vocab Card for Pending Due Spaced Repetition Words */}
            {/* Amber = lessons waiting to practise, red = words due for review */}
            {area.id === 'vocab' && (dueReviewCount > 0 || lessonsToPractiseCount > 0) && (
              <span className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-1 z-10">
                {lessonsToPractiseCount > 0 && (
                  <span
                    id="vocab-practice-badge"
                    title="Lessons ready to practise"
                    className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black flex items-center justify-center shadow-md"
                  >
                    {lessonsToPractiseCount}
                  </span>
                )}
                {dueReviewCount > 0 && (
                  <span
                    id="vocab-due-badge"
                    title="Words due for review"
                    className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse"
                  >
                    {dueReviewCount}
                  </span>
                )}
              </span>
            )}

            <div className="p-2.5 sm:p-3.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl sm:rounded-2xl group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700/90 group-hover:scale-105 group-active:scale-95 transition-all duration-200">
              {area.icon}
            </div>

            <h3 className="font-black text-zinc-900 dark:text-zinc-100 text-sm sm:text-base tracking-tight">
              {area.label}
            </h3>
          </button>
        ))}
      </div>
      </div>
    </div>
  );
};

