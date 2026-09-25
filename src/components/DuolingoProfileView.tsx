import React from 'react';
import { Flame, ShieldCheck, Settings } from 'lucide-react';
import { AppLanguage, getTranslation } from '../utils/translations';
import { playSound } from '../utils/audioEffects';
import { currentStreak, thisWeek } from '../utils/streak';
import { learntWordCount } from '../utils/srsEngine';
import { SwitchAccountButton } from './SwitchAccountButton';
import { useAuth } from './AuthGate';
import { initialsFor, loadProfile, nameFor } from '../lib/profile';

interface DuolingoProfileViewProps {
  /** The lowest level you are actually working in, e.g. "A1". */
  workingLevel?: string;
  appLanguage?: AppLanguage;
  onNavigateToSettings?: () => void;
}

export const DuolingoProfileView: React.FC<DuolingoProfileViewProps> = ({
  workingLevel,
  appLanguage = 'en',
  onNavigateToSettings,
}) => {
  const t = getTranslation(appLanguage);
  const auth = useAuth();
  const profile = loadProfile();
  const name = nameFor(profile, auth?.email ?? null);
  const streak = currentStreak();
  const learnt = learntWordCount();
  const week = thisWeek();
  const dayNames =
    appLanguage === 'en'
      ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      : ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Profile Header Banner */}
      <div className="relative bg-white dark:bg-[#252a35] rounded-3xl p-6 sm:p-8 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Settings: top-right corner of the profile card */}
        {onNavigateToSettings && (
          <button
            id="profile-settings-button"
            type="button"
            onClick={() => {
              playSound('tap');
              onNavigateToSettings();
            }}
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-700/80 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 active:scale-95 transition-all flex items-center justify-center cursor-pointer group z-10"
            title={t.settingsTitle}
            aria-label={t.settingsTitle}
          >
            <Settings className="w-4.5 h-4.5 stroke-[2.2] group-hover:rotate-45 transition-transform duration-300 text-zinc-700 dark:text-zinc-300" />
          </button>
        )}

        {/* Avatar */}
        <div className="relative shrink-0">
          {profile.photo ? (
            <img
              src={profile.photo}
              alt=""
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-zinc-100 dark:border-zinc-700 shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-4 border-zinc-100 dark:border-zinc-700 shadow-sm flex items-center justify-center font-black text-2xl sm:text-3xl tracking-tighter">
              {initialsFor(name)}
            </div>
          )}
          {workingLevel && (
            <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-lg bg-zinc-900 text-white font-black text-[10px] uppercase tracking-wider border-2 border-white dark:border-zinc-800 shadow-xs">
              {workingLevel}
            </span>
          )}
        </div>

        {/* User Info & Action Buttons */}
        <div className="flex-1 text-center sm:text-left space-y-3 w-full sm:pr-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                {name}
              </h2>
            </div>

          </div>

          {/* Two numbers, both real */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <Flame className="w-4 h-4 fill-zinc-900 dark:fill-white" />
                <span className="font-black text-base">
                  {streak} {t.days}
                </span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">{t.streak}</p>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
              <div className="flex items-center justify-center gap-1 text-zinc-900 dark:text-white">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-black text-base">{learnt}</span>
              </div>
              <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                {appLanguage === 'en' ? 'Words learnt' : 'Gelernte Wörter'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* This week, Duolingo-style: the calendar week, today ringed, the days
          still to come left plain rather than looking like misses. */}
      <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
            {appLanguage === 'en' ? 'This week' : 'Diese Woche'}
          </h3>
          <span className="flex items-center gap-1 text-sm font-black text-zinc-900 dark:text-zinc-100">
            <Flame className="w-4 h-4 fill-zinc-900 dark:fill-white" />
            {streak}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {week.map(({ date, active, isToday, future }) => (
            <div key={date.toISOString()} className="flex flex-col items-center gap-2">
              <span className={`text-[11px] font-black ${isToday ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`}>
                {dayNames[date.getDay()]}
              </span>
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  active
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                    : isToday
                    ? 'border-2 border-dashed border-zinc-400 text-zinc-400'
                    : future
                    ? 'bg-zinc-50 dark:bg-zinc-800/50 text-zinc-300 dark:text-zinc-600'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600'
                }`}
              >
                {active ? <Flame className="w-4 h-4 fill-current" /> : <span className="text-[11px] font-black">{date.getDate()}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Moving between accounts. Logging out for good lives in Settings. */}
      <SwitchAccountButton appLanguage={appLanguage} />
    </div>
  );
};
