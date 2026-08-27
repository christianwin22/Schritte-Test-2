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
  appLanguage?: AppLanguage;
}

export const HomeGuideView: React.FC<HomeGuideViewProps> = ({
  onSelectArea,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

  const learningAreas = [
    {
      id: 'vocab' as DuolingoTab,
      label: t.vocab,
      icon: <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
    },
    {
      id: 'grammar' as DuolingoTab,
      label: t.grammar,
      icon: <Zap className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
    },
    {
      id: 'listening' as DuolingoTab,
      label: t.listening,
      icon: <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
    },
    {
      id: 'speaking' as DuolingoTab,
      label: t.speaking,
      icon: <Mic className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
    },
    {
      id: 'reading' as DuolingoTab,
      label: t.reading,
      icon: <BookMarked className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
    },
    {
      id: 'writing' as DuolingoTab,
      label: t.writing,
      icon: <FileEdit className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-900 dark:text-zinc-100" />,
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
            className="w-full bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-zinc-100 shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.98] flex flex-col items-center justify-center text-center gap-2.5 sm:gap-3.5 group min-h-[105px] sm:min-h-[130px]"
          >
            <div className="p-2.5 sm:p-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl group-hover:bg-zinc-950 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-zinc-950 transition-colors">
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

