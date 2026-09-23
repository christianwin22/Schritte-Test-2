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
  Lightbulb,
  Trash2,
  Copy,
} from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { speakGerman } from '../utils/speech';
import { AppLanguage, getTranslation } from '../utils/translations';
import { ThemeMode } from './SettingsModal';
import { listSuggestions, removeSuggestion, suggestionsAsText, clearSuggestions } from '../lib/suggestions';

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
  const [notes, setNotes] = useState(listSuggestions);
  const [copied, setCopied] = useState(false);
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
        </div>
      </div>


      {/* Ideas you noted while using the app */}
      {notes.length > 0 && (
        <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-black text-zinc-900 dark:text-zinc-100">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              {appLanguage === 'en' ? `My ideas (${notes.length})` : `Meine Ideen (${notes.length})`}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(suggestionsAsText());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  } catch {
                    // clipboard blocked; the notes are still listed below
                  }
                }}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? (appLanguage === 'en' ? 'Copied' : 'Kopiert') : appLanguage === 'en' ? 'Copy all' : 'Alle kopieren'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  clearSuggestions();
                  setNotes([]);
                }}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-black text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 cursor-pointer"
              >
                {appLanguage === 'en' ? 'Clear' : 'Leeren'}
              </button>
            </div>
          </div>

          <ul className="space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex items-start gap-2 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">{note.text}</p>
                  <p className="text-[11px] font-bold text-zinc-400 mt-1">
                    {new Date(note.at).toLocaleString()} · {note.where}
                  </p>
                  {note.onScreen && <p className="text-[11px] font-medium text-zinc-400 truncate">{note.onScreen}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    removeSuggestion(note.id);
                    setNotes(listSuggestions());
                  }}
                  aria-label={appLanguage === 'en' ? 'Delete idea' : 'Idee löschen'}
                  className="p-2 rounded-xl text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
};
