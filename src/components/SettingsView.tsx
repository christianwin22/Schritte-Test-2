import React, { useState } from 'react';
import {
  Settings,
  Sun,
  Moon,
  Laptop,
  Volume2,
  VolumeX,
  Music,
  Bell,
  BellOff,
  Globe,
  RotateCcw,
  Volume1,
  Check,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  LogIn,
  LogOut,
  UserCircle2,
} from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { speakGerman } from '../utils/speech';
import { AppLanguage, getTranslation } from '../utils/translations';
import { ThemeMode } from './SettingsModal';
import { useAuth } from './AuthGate';

interface SettingsViewProps {
  isDark: boolean;
  themeMode: ThemeMode;
  onSetThemeMode: (mode: ThemeMode) => void;
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationEnabled: boolean;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onToggleNotification: () => void;
  onResetProgress: () => void;
  appLanguage: AppLanguage;
  onSelectLanguage: (lang: AppLanguage) => void;
  onBackToHome?: () => void;
  onBackToProfile?: () => void;
  totalWordsCount?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isDark,
  themeMode,
  onSetThemeMode,
  soundEnabled,
  musicEnabled,
  notificationEnabled,
  onToggleTheme,
  onToggleSound,
  onToggleMusic,
  onToggleNotification,
  onResetProgress,
  appLanguage,
  onSelectLanguage,
  onBackToHome,
  onBackToProfile,
  totalWordsCount = 70,
}) => {
  const t = getTranslation(appLanguage);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const auth = useAuth();
  const [signOutState, setSignOutState] = useState<'idle' | 'working' | 'failed'>('idle');
  const [ttsFeedback, setTtsFeedback] = useState(false);

  const handleThemeChange = (mode: ThemeMode) => {
    playSound('tap');
    if (onSetThemeMode) {
      onSetThemeMode(mode);
    } else {
      onToggleTheme();
    }
  };

  const handleTestTTS = () => {
    playSound('tap');
    setTtsFeedback(true);
    speakGerman('Willkommen bei Schritte International Neu! Viel Erfolg beim Deutschlernen.');
    setTimeout(() => setTtsFeedback(false), 2500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Main Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ==================================================================== */}
        {/* SECTION 1: LANGUAGE & APPEARANCE */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          {/* Card: Interface Language */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  {t.appLanguage}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {appLanguage === 'en' ? 'Select interface display language' : 'Sprache der Benutzeroberfläche'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  onSelectLanguage('en');
                }}
                className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all border-2 flex items-center justify-between cursor-pointer ${
                  appLanguage === 'en'
                    ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇬🇧</span>
                  <span>English</span>
                </div>
                {appLanguage === 'en' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  onSelectLanguage('de');
                }}
                className={`p-3.5 rounded-2xl font-black text-xs sm:text-sm transition-all border-2 flex items-center justify-between cursor-pointer ${
                  appLanguage === 'de'
                    ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white shadow-xs'
                    : 'bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🇩🇪</span>
                  <span>Deutsch</span>
                </div>
                {appLanguage === 'de' && <Check className="w-4 h-4 stroke-[3]" />}
              </button>
            </div>
          </div>

          {/* Card: Theme & Appearance */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                {themeMode === 'system' ? (
                  <Laptop className="w-5 h-5" />
                ) : isDark ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  {t.appearance}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {themeMode === 'system'
                    ? (appLanguage === 'en' ? 'Synchronized with OS theme' : 'Automatisch nach Betriebssystem')
                    : isDark
                    ? (appLanguage === 'en' ? 'Refined Slate Graphite Dark Mode' : 'Dunkelmodus aktiv')
                    : t.lightMode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-800/90 p-1.5 rounded-2xl border border-zinc-200/80 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`py-2.5 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>{appLanguage === 'en' ? 'Light' : 'Hell'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`py-2.5 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{appLanguage === 'en' ? 'Dark' : 'Dunkel'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`py-2.5 px-2 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  themeMode === 'system'
                    ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>{appLanguage === 'en' ? 'System (Auto)' : 'Auto'}</span>
              </button>
            </div>
          </div>

          {/* Card: Notifications & Daily Review Reminders */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  {notificationEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {appLanguage === 'en' ? 'Daily Review Alerts' : 'Tägliche Wiederholungs-Erinnerungen'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {notificationEnabled
                      ? (appLanguage === 'en' ? 'Alerts active for spaced repetition words' : 'Erinnerungen für fällige Vokabeln aktiv')
                      : (appLanguage === 'en' ? 'Review reminders muted' : 'Stummgeschaltet')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  onToggleNotification();
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  notificationEnabled
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                }`}
              >
                {notificationEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* SECTION 2: AUDIO, VOICE SYNTHESIS & RESET */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          {/* Card: Sound Effects & Lo-Fi Music */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-5">
            {/* Sound FX Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {t.soundEffects}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {soundEnabled ? t.soundOn : t.soundMuted}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onToggleSound();
                  if (!soundEnabled) playSound('correct');
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  soundEnabled
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                }`}
              >
                {soundEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="border-t border-zinc-100 dark:border-zinc-700/60 pt-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {appLanguage === 'en' ? 'Lo-Fi Ambient Study Drone' : 'Hintergrund-Lernmusik'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {musicEnabled
                      ? (appLanguage === 'en' ? 'Calm focus binaural tone active' : 'Fokusklang aktiv')
                      : (appLanguage === 'en' ? 'Muted' : 'Ausgeschaltet')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  playSound('tap');
                  onToggleMusic();
                }}
                className={`px-4 py-2 rounded-xl font-black text-xs transition-all border cursor-pointer ${
                  musicEnabled
                    ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs dark:bg-white dark:text-zinc-950 dark:border-white'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 border-zinc-300 dark:border-zinc-600'
                }`}
              >
                {musicEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Card: German Native Speech Engine Voice Test */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center font-black text-xs shrink-0">
                de-DE
              </div>
              <div className="flex-1">
                <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                  {t.germanTts}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                  {t.nativeVoice}
                </p>
              </div>
            </div>

            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/70 rounded-2xl border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 italic">
                „Willkommen bei Schritte International Neu!“
              </span>
              <button
                type="button"
                onClick={handleTestTTS}
                className={`px-4 py-2 font-black text-xs rounded-xl border cursor-pointer shadow-2xs flex items-center gap-1.5 transition-all shrink-0 ${
                  ttsFeedback
                    ? 'bg-emerald-600 text-white border-emerald-600 scale-105'
                    : 'bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-600'
                }`}
              >
                <Volume1 className="w-4 h-4" />
                <span>{ttsFeedback ? (appLanguage === 'en' ? 'Playing...' : 'Spielt...') : t.testVoice}</span>
              </button>
            </div>
          </div>

          {/* Card: Reset Progress Danger Zone */}
          <div className="bg-rose-50/70 dark:bg-rose-950/20 rounded-3xl p-6 border-2 border-rose-200 dark:border-rose-900/60 shadow-xs space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  <span>{t.resetProgress}</span>
                </h2>
                <p className="text-xs text-rose-700/90 dark:text-rose-300/80 font-medium mt-1">
                  {t.resetProgressDesc}
                </p>
              </div>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t.resetBtn}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    {appLanguage === 'en' ? 'Cancel' : 'Abbrechen'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onResetProgress();
                      setShowResetConfirm(false);
                    }}
                    className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-black rounded-xl shadow-xs cursor-pointer active:scale-95"
                  >
                    {appLanguage === 'en' ? 'Yes, Reset All' : 'Ja, Zurücksetzen'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account */}
      {auth && (
        <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <UserCircle2 className="w-6 h-6 text-zinc-500 shrink-0" />
              <div className="min-w-0">
                {auth.isGuest ? (
                  <>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
                      {appLanguage === 'en' ? 'Guest' : 'Gast'}
                    </p>
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {appLanguage === 'en'
                        ? 'Progress is saved on this device only'
                        : 'Fortschritt wird nur auf diesem Gerät gespeichert'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      {appLanguage === 'en' ? 'Signed in as' : 'Angemeldet als'}
                    </p>
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 truncate">{auth.email}</p>
                  </>
                )}
              </div>
            </div>
            {auth.isGuest ? (
              <button
                type="button"
                onClick={auth.logInInstead}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 transition-all"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Log in' : 'Anmelden'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={signOutState === 'working'}
                onClick={async () => {
                  setSignOutState('working');
                  const ok = await auth.signOut();
                  if (!ok) setSignOutState('failed');
                }}
                className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 active:scale-95 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{appLanguage === 'en' ? 'Sign out' : 'Abmelden'}</span>
              </button>
            )}
          </div>
          {signOutState === 'failed' && (
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              {appLanguage === 'en'
                ? "Couldn't save your latest progress — you're probably offline. You're still signed in; try again once you're connected."
                : 'Dein Fortschritt konnte nicht gespeichert werden – vermutlich bist du offline. Du bist weiterhin angemeldet.'}
            </p>
          )}
        </div>
      )}

      {/* App Architecture & Schritte Course Info Banner */}
      <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-3">
          <BookOpen className="w-4 h-4 text-zinc-400" />
          <span>
            {appLanguage === 'en'
              ? `Schritte International Neu A1–B1 Curriculum • ${totalWordsCount} Mastered Vocabulary Items`
              : `Schritte International Neu A1–B1 Lehrplan • ${totalWordsCount} Vokabeln aktiv`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{appLanguage === 'en' ? 'FSRS SRS Engine Active' : 'FSRS Algorithmus aktiv'}</span>
        </div>
      </div>
    </div>
  );
};
