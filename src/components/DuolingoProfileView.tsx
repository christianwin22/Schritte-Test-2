import React, { useState } from 'react';
import {
  Flame,
  Gem,
  Heart,
  Award,
  Trophy,
  Calendar,
  ShieldCheck,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { SCHRITTE_LEKTIONEN } from '../data/schritteLektionen';
import { WordEntry } from '../types';
import { AppLanguage, getTranslation } from '../utils/translations';
import { playSound } from '../utils/audioEffects';
import { SettingsModal } from './SettingsModal';

interface DuolingoProfileViewProps {
  streak: number;
  gems: number;
  hearts: number;
  maxHearts: number;
  xp: number;
  vocabulary: WordEntry[];
  onRefillHearts: () => void;
  onResetProgress: () => void;
  isDark?: boolean;
  soundEnabled?: boolean;
  onToggleTheme?: () => void;
  onToggleSound?: () => void;
  onSelectLanguage?: (lang: AppLanguage) => void;
  appLanguage?: AppLanguage;
}

export const DuolingoProfileView: React.FC<DuolingoProfileViewProps> = ({
  streak,
  gems,
  hearts,
  maxHearts,
  xp,
  vocabulary,
  onRefillHearts,
  onResetProgress,
  isDark = false,
  soundEnabled = true,
  onToggleTheme = () => {},
  onToggleSound = () => {},
  onSelectLanguage = () => {},
  appLanguage = 'en',
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const t = getTranslation(appLanguage);

  const leaderboard = [
    { rank: 1, name: 'Lukas M.', xp: xp + 140, isUser: false },
    { rank: 2, name: appLanguage === 'en' ? 'You (Lara)' : 'Du (Lara)', xp: xp, isUser: true },
    { rank: 3, name: 'Elena V.', xp: Math.max(0, xp - 45), isUser: false },
    { rank: 4, name: 'Mateo R.', xp: Math.max(0, xp - 90), isUser: false },
    { rank: 5, name: 'Sophie B.', xp: Math.max(0, xp - 150), isUser: false },
  ];

  const daysOfWeek =
    appLanguage === 'en'
      ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-6 animate-fadeIn">
      {/* Profile Header Banner */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-4 border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-center font-black text-3xl tracking-tighter">
            SCHRITTE
          </div>
          <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-lg bg-zinc-900 text-white font-black text-[10px] uppercase tracking-wider border-2 border-white shadow-xs">
            A1–B1 PRO
          </span>
        </div>

        {/* User Info & Action Buttons */}
        <div className="flex-1 text-center sm:text-left space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {appLanguage === 'en' ? 'German Learner' : 'Deutsch-Lernende(r)'}
              </h2>
              <p className="text-xs font-bold text-zinc-400">
                {appLanguage === 'en' ? 'Schritte International Neu A1–B1 • Active Learner' : 'Schritte International Neu A1–B1 • Aktives Training'}
              </p>
            </div>

            {/* Actions: Settings Button & Quick Heart Refill Button */}
            <div className="flex items-center justify-center sm:justify-end gap-2 self-center sm:self-auto">
              <button
                id="profile-settings-button"
                onClick={() => {
                  playSound('tap');
                  setIsSettingsOpen(true);
                }}
                className="px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title={t.settingsTitle}
              >
                <Settings className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>{t.settingsTitle}</span>
              </button>

              <button
                onClick={onRefillHearts}
                className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 active:scale-95 text-white font-black text-xs rounded-2xl shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title={t.refillHearts}
              >
                <Heart className="w-4 h-4 fill-white" />
                <span>{hearts}/{maxHearts}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <Flame className="w-4 h-4 fill-zinc-900 dark:fill-white" />
                <span className="font-black text-base">{streak} {t.days}</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500">
                {t.streak}
              </p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <Award className="w-4 h-4" />
                <span className="font-black text-base">{xp} XP</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500">
                {t.xpPoints}
              </p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <Gem className="w-4 h-4 fill-zinc-900 dark:fill-white" />
                <span className="font-black text-base">{gems}</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500">
                {t.gems}
              </p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-black text-base">
                  {vocabulary.length} {appLanguage === 'en' ? 'Words' : 'Wörter'}
                </span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500">
                {appLanguage === 'en' ? 'Vocabulary Box' : 'Wortschatzkiste'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Leaderboard & Streak Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leaderboard Card */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                {appLanguage === 'en' ? 'Top Learners (Leaderboard)' : 'Top Lerner (Rangliste)'}
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-700">
              {t.topLeague}
            </span>
          </div>

          <div className="space-y-2">
            {leaderboard.map((user) => (
              <div
                key={user.rank}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                  user.isUser
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white font-black'
                    : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 font-bold text-zinc-800 dark:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 text-center font-black text-sm ${
                      user.isUser ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'
                    }`}
                  >
                    #{user.rank}
                  </span>
                  <span className="text-sm">
                    {user.name}
                  </span>
                </div>
                <span className="text-xs font-black">
                  {user.xp} XP
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Flame Streak Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-900 dark:text-white" />
              <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                {appLanguage === 'en' ? 'Weekly Activity' : 'Wochen-Aktivität'}
              </h3>
            </div>
            <span className="text-xs font-bold text-zinc-400">
              {appLanguage === 'en' ? 'Streak active 🔥' : 'Streak aktiv 🔥'}
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 py-4">
            {daysOfWeek.map((day, idx) => {
              const isPastActive = idx <= 3;
              return (
                <div key={day} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-zinc-400">{day}</span>
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${
                      isPastActive
                        ? 'bg-zinc-950 border-zinc-950 text-white dark:bg-white dark:border-white dark:text-zinc-950'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {isPastActive ? (
                      <Flame className="w-4 h-4 fill-current text-current" />
                    ) : (
                      <span className="text-xs font-bold">•</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            {appLanguage === 'en'
              ? '🎯 Daily goal of 50 XP reached today! Keep it up!'
              : '🎯 Du hast dein Tagesziel von 50 XP heute bereits erreicht!'}
          </div>
        </div>
      </div>

      {/* Schritte International Neu Lektion Badges */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4">
        <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
          {appLanguage === 'en' ? 'Schritte Lessons Mastery' : 'Schritte Lektions-Erfolge'}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {SCHRITTE_LEKTIONEN.map((lek) => (
            <div
              key={`${lek.level}-${lek.book}-${lek.number}`}
              className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 flex items-center space-x-3"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-black shrink-0 text-zinc-900 dark:text-white">
                {lek.number}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-black text-zinc-900 dark:text-zinc-100 truncate">
                  {lek.title}
                </p>
                <p className="text-[10px] font-bold text-zinc-500">
                  {lek.book} • {appLanguage === 'en' ? 'Active' : 'Aktiv'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset progress & Quick Settings link at bottom */}
      <div className="flex items-center justify-center gap-6 pt-2">
        <button
          onClick={() => {
            playSound('tap');
            setIsSettingsOpen(true);
          }}
          className="text-xs font-bold text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>{t.settingsTitle}</span>
        </button>
        <button
          onClick={onResetProgress}
          className="text-xs font-bold text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t.resetProgress}</span>
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDark={isDark}
        soundEnabled={soundEnabled}
        onToggleTheme={onToggleTheme}
        onToggleSound={onToggleSound}
        onResetProgress={onResetProgress}
        appLanguage={appLanguage}
        onSelectLanguage={onSelectLanguage}
      />
    </div>
  );
};
