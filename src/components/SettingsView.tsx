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
  Check,
  ShieldCheck,
  ArrowLeft,
  BookOpen,
  LogIn,
  LogOut,
  UserCircle2,
  ChevronRight,
} from 'lucide-react';
import { playSound } from '../utils/audioEffects';
import { AccountDialog } from './AccountDialog';
import { useAuth } from './AuthGate';
import { seedDueForTesting } from '../utils/srsEngine';
import { INITIAL_VOCABULARY } from '../data/vocabulary';
import { FlaskConical } from 'lucide-react';
import { testGermanVoice, type VoiceCheck } from '../utils/speech';
import { AppLanguage, getTranslation } from '../utils/translations';
import { ThemeMode } from './SettingsModal';

interface SettingsViewProps {
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationEnabled: boolean;
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
  soundEnabled,
  musicEnabled,
  notificationEnabled,
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const isSandbox = useAuth()?.isSandbox ?? false;
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12 animate-fadeIn">
      {/* Who you are: one row, opening the dialog */}
      <button
        type="button"
        onClick={() => {
          playSound('tap');
          setAccountOpen(true);
        }}
        className="w-full bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs flex items-center justify-between gap-3 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
      >
        <span className="flex items-center space-x-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
            <UserCircle2 className="w-5 h-5" />
          </span>
          <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
            {appLanguage === 'en' ? 'My account' : 'Mein Konto'}
          </span>
        </span>
        <ChevronRight className="w-5 h-5 text-zinc-400 shrink-0" />
      </button>

      {accountOpen && <AccountDialog appLanguage={appLanguage} onClose={() => setAccountOpen(false)} />}

      {/* Sandbox only: fills the review schedule so it can be tried out today */}
      {isSandbox && (
        <button
          type="button"
          onClick={() => {
            playSound('tap');
            seedDueForTesting(INITIAL_VOCABULARY.filter((w) => w.level === 'A1' && w.lektion === 1));
            setSeeded(true);
            window.setTimeout(() => window.location.reload(), 600);
          }}
          className="w-full bg-amber-50 dark:bg-amber-950/40 rounded-3xl p-6 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-between gap-3 cursor-pointer"
        >
          <span className="text-base font-black text-amber-900 dark:text-amber-200">
            {seeded ? 'Filling…' : 'Make 15 words due now'}
          </span>
          <FlaskConical className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" />
        </button>
      )}

      {/* Main Settings Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ==================================================================== */}
        {/* SECTION 1: LANGUAGE & APPEARANCE */}
        {/* ==================================================================== */}
        <div className="space-y-6">
          {/* Language: the flag stands in for the value, the way the ON/OFF
              switches do. Tapping opens the two, like My account's rows. */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-3">
            <button
              type="button"
              onClick={() => {
                playSound('tap');
                setLanguageOpen(!languageOpen);
              }}
              className="w-full flex items-center justify-between gap-3 cursor-pointer"
            >
              <span className="flex items-center space-x-3 min-w-0">
                <span className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </span>
                <span className="text-base font-black text-zinc-900 dark:text-zinc-100">{t.appLanguage}</span>
              </span>
              <span className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 flex items-center gap-2 shrink-0">
                <span className="text-base leading-none">{appLanguage === 'en' ? '🇬🇧' : '🇩🇪'}</span>
                <span className="font-black text-xs text-zinc-900 dark:text-zinc-100">
                  {appLanguage === 'en' ? 'English' : 'Deutsch'}
                </span>
              </span>
            </button>

            {languageOpen && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {([
                  { code: 'en' as const, flag: '🇬🇧', label: 'English' },
                  { code: 'de' as const, flag: '🇩🇪', label: 'Deutsch' },
                ]).map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => {
                      playSound('tap');
                      onSelectLanguage(option.code);
                      setLanguageOpen(false);
                    }}
                    className={`p-3.5 rounded-2xl font-black text-sm transition-all border-2 flex items-center justify-between cursor-pointer ${
                      appLanguage === option.code
                        ? 'bg-zinc-950 text-white border-zinc-950 dark:bg-white dark:text-zinc-950 dark:border-white'
                        : 'bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-base">{option.flag}</span>
                      <span>{option.label}</span>
                    </span>
                    {appLanguage === option.code && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Card: Notifications, of every kind the app sends */}
          <div className="bg-white dark:bg-[#252a35] rounded-3xl p-6 border-2 border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 flex items-center justify-center shrink-0">
                  {notificationEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-black text-zinc-900 dark:text-zinc-100">
                    {appLanguage === 'en' ? 'Notifications' : 'Mitteilungen'}
                  </h2>
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

          </div>

        </div>
      </div>

    </div>
  );
};
