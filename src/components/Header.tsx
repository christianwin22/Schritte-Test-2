import React from 'react';
import {
  Flame,
  Award,
  Clock,
  BookOpen,
  Sun,
  Moon,
  Library,
  Dumbbell,
  GraduationCap,
} from 'lucide-react';
import { CEFRLevel } from '../types';

interface HeaderProps {
  activeTab: 'drill' | 'library';
  onSelectTab: (tab: 'drill' | 'library') => void;
  cefrFilter: CEFRLevel | 'ALL';
  onChangeCefr: (level: CEFRLevel | 'ALL') => void;
  totalWords: number;
  dueCount: number;
  masteryPercentage: number;
  streakDays: number;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  cefrFilter,
  onChangeCefr,
  totalWords,
  dueCount,
  masteryPercentage,
  streakDays,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="w-full border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 space-y-3">
        {/* Top bar: Brand & Stats */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 border border-indigo-400/30 flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-blue-500/20 relative overflow-hidden">
              D
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  DeutschFlow
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  A1-B1 SRS
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Precision German Grammar & Spaced Repetition Engine
              </p>
            </div>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Streak */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold backdrop-blur-md"
              title="Daily study streak"
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
              <span>{streakDays}d Streak</span>
            </div>

            {/* Due Reviews */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border backdrop-blur-md ${
                dueCount > 0
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
              title="Words due for spaced repetition review"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{dueCount} Due</span>
            </div>

            {/* Mastery Score */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-bold backdrop-blur-md"
              title="Average SRS Stability Score"
            >
              <Award className="w-3.5 h-3.5 text-blue-400" />
              <span>{masteryPercentage}% Mastery</span>
            </div>

            {/* Theme Switcher */}
            <button
              type="button"
              id="btn-toggle-theme"
              onClick={onToggleTheme}
              className="p-2 rounded-xl border border-slate-700/60 bg-slate-800/50 backdrop-blur-md text-slate-300 hover:text-blue-400 hover:border-blue-500/50 transition-all cursor-pointer shadow-xs"
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs & CEFR Filter Row */}
        <div className="flex items-center justify-between gap-4 flex-wrap pt-1 border-t border-slate-700/40">
          {/* Main Tab Switch: Practice vs Library */}
          <nav className="flex items-center gap-1 bg-slate-900/60 backdrop-blur-md p-1 rounded-xl border border-slate-700/50">
            <button
              type="button"
              id="tab-drill-arena"
              onClick={() => onSelectTab('drill')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'drill'
                  ? 'bg-slate-800/90 text-white border border-slate-600/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
              <span>Drill Arena</span>
            </button>

            <button
              type="button"
              id="tab-vocab-library"
              onClick={() => onSelectTab('library')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'library'
                  ? 'bg-slate-800/90 text-white border border-slate-600/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Library className="w-3.5 h-3.5 text-emerald-400" />
              <span>Vocabulary Library ({totalWords})</span>
            </button>
          </nav>

          {/* CEFR Level Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold hidden md:inline-block">
              CEFR Filter:
            </span>
            <div className="flex items-center bg-slate-900/60 backdrop-blur-md p-1 rounded-xl border border-slate-700/50">
              {(['ALL', 'A1', 'A2', 'B1'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  id={`header-filter-cefr-${lvl}`}
                  onClick={() => onChangeCefr(lvl)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    cefrFilter === lvl
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
