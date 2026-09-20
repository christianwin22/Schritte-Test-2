import React from 'react';
import {
  BookOpen,
  Zap,
  Headphones,
  Mic,
  BookMarked,
  FileEdit,
} from 'lucide-react';
import { DuolingoTab } from '../types';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';

interface HomeGuideViewProps {
  onSelectArea: (tab: DuolingoTab) => void;
  streak?: number;
  xp?: number;
  gems?: number;
  vocabCount?: number;
  dueReviewCount?: number;
  appLanguage?: AppLanguage;
}

export const HomeGuideView: React.FC<HomeGuideViewProps> = ({
  onSelectArea,
  dueReviewCount = 0,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

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
    <div className="w-full h-full flex flex-col justify-center py-1 sm:py-3 animate-fadeIn">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-4xl mx-auto">
        {learningAreas.map((area) => (
          <button
            key={area.id}
            id={`home-area-${area.id}`}
            onClick={() => {
              playSound('tap');
              onSelectArea(area.id);
            }}
            className="w-full relative bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-zinc-100 shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3.5 group min-h-[105px] sm:min-h-[130px]"
          >
            {/* Notification Badge on Vocab Card for Pending Due Spaced Repetition Words */}
            {area.id === 'vocab' && dueReviewCount > 0 && (
              <span
                id="vocab-due-badge"
                className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-md animate-pulse z-10"
              >
                {dueReviewCount}
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
  );
};

