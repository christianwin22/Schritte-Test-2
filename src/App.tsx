import { useState, useEffect, useMemo } from 'react';
import { WordEntry, DuolingoTab } from './types';
import { INITIAL_VOCABULARY } from './data/vocabulary';
import { DuolingoTopBar } from './components/DuolingoTopBar';
import { HomeGuideView } from './components/HomeGuideView';
import { SchritteVocabView } from './components/SchritteVocabView';
import { SchritteGrammarView } from './components/SchritteGrammarView';
import { SkillsView } from './components/SkillsView';
import { DuolingoProfileView } from './components/DuolingoProfileView';
import { SettingsView } from './components/SettingsView';
import { ThemeMode } from './components/SettingsModal';
import { AbandonExerciseModal } from './components/AbandonExerciseModal';
import { OrientationGuard } from './components/OrientationGuard';
import { playSound, setGlobalSoundEnabled, setGlobalMusicEnabled } from './utils/audioEffects';
import { AppLanguage, getTranslation } from './utils/translations';
import { clearAppData } from './lib/progressSync';
import { loadAllFSRSRecords, isCardDueForReview, loadDrillPracticeState, readyLessons } from './utils/srsEngine';
import { isTabLocked } from './config/features';
import { useAuth } from './components/AuthGate';

const VOCAB_STORAGE_KEY = 'deutschmeister_custom_vocab_v2';
const STREAK_STORAGE_KEY = 'deutschmeister_streak_v2';
const XP_STORAGE_KEY = 'deutschmeister_xp_v2';
const GEMS_STORAGE_KEY = 'deutschmeister_gems_v2';
const HEARTS_STORAGE_KEY = 'deutschmeister_hearts_v2';
const LANG_STORAGE_KEY = 'deutschmeister_app_lang_v2';
const THEME_MODE_STORAGE_KEY = 'deutschmeister_theme_mode_v2';
const MUSIC_STORAGE_KEY = 'deutschmeister_music_enabled_v2';
const NOTIF_STORAGE_KEY = 'deutschmeister_notif_enabled_v2';

export default function App() {
  // In the Sandbox every area stays open; in the real app only Vocabulary is.
  const isSandbox = useAuth()?.isSandbox ?? false;

  // App UI Language (English default)
  const [appLanguage, setAppLanguage] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'de' || saved === 'en') return saved;
      return 'en';
    } catch {
      return 'en';
    }
  });

  const t = getTranslation(appLanguage);

  // Navigation State (defaults to 'home' Langey Guide Dashboard)
  const [currentTab, setCurrentTab] = useState<'home' | DuolingoTab>('home');
  const [previousTab, setPreviousTab] = useState<'home' | DuolingoTab>('home');
  const [activeExerciseMode, setActiveExerciseMode] = useState<string | null>(null);
  const [isQuizActive, setIsQuizActive] = useState(false);

  // Abandon Confirmation Modal State
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [pendingAbandonCallback, setPendingAbandonCallback] = useState<(() => void) | null>(null);

  // Gamification State
  const [streak, setStreak] = useState<number>(() => {
    try {
      const s = localStorage.getItem(STREAK_STORAGE_KEY);
      return s ? parseInt(s, 10) : 5;
    } catch {
      return 5;
    }
  });

  const [xp, setXp] = useState<number>(() => {
    try {
      const x = localStorage.getItem(XP_STORAGE_KEY);
      return x ? parseInt(x, 10) : 320;
    } catch {
      return 320;
    }
  });

  const [gems, setGems] = useState<number>(() => {
    try {
      const g = localStorage.getItem(GEMS_STORAGE_KEY);
      return g ? parseInt(g, 10) : 450;
    } catch {
      return 450;
    }
  });

  const [hearts, setHearts] = useState<number>(() => {
    try {
      const h = localStorage.getItem(HEARTS_STORAGE_KEY);
      return h ? parseInt(h, 10) : 5;
    } catch {
      return 5;
    }
  });

  const maxHearts = 5;

  // Custom Vocabulary State
  const [vocabulary, setVocabulary] = useState<WordEntry[]>(() => {
    try {
      const stored = localStorage.getItem(VOCAB_STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_VOCABULARY;
    } catch {
      return INITIAL_VOCABULARY;
    }
  });

  // 3-Way Theme Mode: 'light' | 'dark' | 'system'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {}
    return 'system';
  });

  // Dark Mode active flag
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(THEME_MODE_STORAGE_KEY);
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Sound FX State
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Study Music / Ambient Lo-Fi State
  const [musicEnabled, setMusicEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MUSIC_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Notifications State
  const [notificationEnabled, setNotificationEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(NOTIF_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });

  // FSRS Records for global due badge on Vocabulary button
  const [fsrsRecords, setFsrsRecords] = useState(() => loadAllFSRSRecords());
  // Lessons waiting in Der/Die/Das and Plural Practice, for the amber badge
  const [drillPractice, setDrillPractice] = useState(() => loadDrillPracticeState());

  // Listen to FSRS storage changes to keep global due count synchronized
  useEffect(() => {
    const syncFsrs = () => {
      setFsrsRecords(loadAllFSRSRecords());
      setDrillPractice(loadDrillPracticeState());
    };
    window.addEventListener('storage', syncFsrs);
    const interval = setInterval(syncFsrs, 3000);
    return () => {
      window.removeEventListener('storage', syncFsrs);
      clearInterval(interval);
    };
  }, []);

  // Everything due in Vocabulary: Flashcard reviews plus Der/Die/Das and Plural reviews.
  const globalDueCount = useMemo(() => {
    const flashcards = INITIAL_VOCABULARY.filter((w) => isCardDueForReview(fsrsRecords[w.id])).length;
    const drills = Object.keys(fsrsRecords).filter(
      (id) => /^(article|plural):/.test(id) && isCardDueForReview(fsrsRecords[id])
    ).length;
    return flashcards + drills;
  }, [fsrsRecords]);

  // Persist State Changes
  useEffect(() => {
    try {
      localStorage.setItem(VOCAB_STORAGE_KEY, JSON.stringify(vocabulary));
    } catch (e) {
      console.warn('Failed to save vocabulary', e);
    }
  }, [vocabulary]);

  useEffect(() => {
    try {
      localStorage.setItem(STREAK_STORAGE_KEY, streak.toString());
    } catch (e) {
      console.warn('Failed to save streak', e);
    }
  }, [streak]);

  useEffect(() => {
    try {
      localStorage.setItem(XP_STORAGE_KEY, xp.toString());
    } catch (e) {
      console.warn('Failed to save xp', e);
    }
  }, [xp]);

  useEffect(() => {
    try {
      localStorage.setItem(GEMS_STORAGE_KEY, gems.toString());
    } catch (e) {
      console.warn('Failed to save gems', e);
    }
  }, [gems]);

  useEffect(() => {
    try {
      localStorage.setItem(HEARTS_STORAGE_KEY, hearts.toString());
    } catch (e) {
      console.warn('Failed to save hearts', e);
    }
  }, [hearts]);

  useEffect(() => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, appLanguage);
    } catch (e) {
      console.warn('Failed to save language', e);
    }
  }, [appLanguage]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
    } catch {}
  }, [themeMode]);

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_STORAGE_KEY, String(musicEnabled));
    } catch {}
    setGlobalMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, String(notificationEnabled));
    } catch {}
  }, [notificationEnabled]);

  // Handle Theme Mode changes (Light / Dark / System)
  useEffect(() => {
    const updateDarkState = () => {
      if (themeMode === 'dark') {
        setIsDark(true);
      } else if (themeMode === 'light') {
        setIsDark(false);
      } else {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      }
    };

    updateDarkState();

    if (themeMode === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
      };
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    }
  }, [themeMode]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }

    const themeHex = isDark ? '#2b303a' : '#f8f9fa';
    document.documentElement.style.backgroundColor = themeHex;
    document.body.style.backgroundColor = themeHex;

    const themeMetas = document.querySelectorAll('meta[name="theme-color"]');
    themeMetas.forEach((meta) => meta.setAttribute('content', themeHex));

    const appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusMeta) {
      appleStatusMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }, [isDark]);

  useEffect(() => {
    setGlobalSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Gamification Handlers
  const handleCorrectAnswer = (xpGained: number = 10, gemsGained: number = 5) => {
    playSound('correct');
    setXp((prev) => prev + xpGained);
    setGems((prev) => prev + gemsGained);
  };

  const handleWrongAnswer = () => {
    playSound('wrong');
    setHearts((prev) => Math.max(0, prev - 1));
  };

  const handleRefillHearts = () => {
    playSound('correct');
    setHearts(maxHearts);
  };

  const handleResetProgress = () => {
    if (
      window.confirm(
        appLanguage === 'en'
          ? 'Are you sure you want to reset all your learning progress?'
          : 'Möchtest du deinen gesamten Lernfortschritt wirklich zurücksetzen?'
      )
    ) {
      playSound('wrong');
      setStreak(1);
      setXp(0);
      setGems(100);
      setHearts(5);
      setVocabulary(INITIAL_VOCABULARY);
      // Only the app's progress keys; localStorage.clear() would also sign you out.
      clearAppData();
    }
  };

  // Safe Navigation with Active Exercise Abandon Protection
  const handleSelectTab = (tab: 'home' | DuolingoTab) => {
    // Locked areas are unreachable in the real app, whatever asks for them. The Sandbox is exempt.
    if (isTabLocked(tab, isSandbox)) return;
    if (tab === currentTab && !activeExerciseMode) return;
    if (isQuizActive) {
      setPendingAbandonCallback(() => () => {
        setIsQuizActive(false);
        setActiveExerciseMode(null);
        setPreviousTab(currentTab);
        setCurrentTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      setIsAbandonModalOpen(true);
      return;
    }
    setPreviousTab(currentTab);
    setActiveExerciseMode(null);
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Home Logo handler (always jumps to Home)
  const handleGoHome = () => {
    if (currentTab === 'home' && !activeExerciseMode) return;
    if (isQuizActive) {
      setPendingAbandonCallback(() => () => {
        setIsQuizActive(false);
        setActiveExerciseMode(null);
        setPreviousTab(currentTab);
        setCurrentTab('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      setIsAbandonModalOpen(true);
      return;
    }
    setPreviousTab(currentTab);
    setActiveExerciseMode(null);
    setCurrentTab('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top Bar Back button handler
  const handleTopBack = () => {
    if (isQuizActive) {
      setPendingAbandonCallback(() => () => {
        setIsQuizActive(false);
        setActiveExerciseMode(null);
      });
      setIsAbandonModalOpen(true);
      return;
    }
    if (activeExerciseMode) {
      setActiveExerciseMode(null);
      return;
    }
    if (currentTab === 'settings') {
      const target = previousTab === 'profile' ? 'profile' : 'home';
      setPreviousTab(currentTab);
      setCurrentTab(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentTab !== 'home') {
      setPreviousTab(currentTab);
      setCurrentTab('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleRequestAbandon = (onConfirmLeave: () => void) => {
    setPendingAbandonCallback(() => onConfirmLeave);
    setIsAbandonModalOpen(true);
  };

  const handleConfirmAbandon = () => {
    setIsAbandonModalOpen(false);
    setIsQuizActive(false);
    if (pendingAbandonCallback) {
      pendingAbandonCallback();
      setPendingAbandonCallback(null);
    }
  };

  const handleStayInExercise = () => {
    setIsAbandonModalOpen(false);
    setPendingAbandonCallback(null);
  };

  const getTopBarTitle = () => {
    if (activeExerciseMode) {
      if (currentTab === 'vocab') {
        if (activeExerciseMode === 'explorer') return 'Vocabulary • Flashcard';
        if (activeExerciseMode === 'gender_blitz') return 'Vocabulary • Der / Die / Das';
        if (activeExerciseMode === 'plural_drill') return 'Vocabulary • Plural';
        return 'Vocabulary';
      }
      if (currentTab === 'grammar') {
        if (activeExerciseMode === 'table') return 'Grammar • Full Conjugation';
        if (activeExerciseMode === 'single_pronoun') return 'Grammar • Single Conjugation';
        if (activeExerciseMode === 'sentence_stem') return 'Grammar • Sentence with Verb Stem';
        return 'Grammar';
      }
      if (currentTab === 'listening') return 'Listening • Audio Practice';
      if (currentTab === 'speaking') return 'Speaking • Pronunciation';
      if (currentTab === 'reading') return 'Reading • Story & Quiz';
      if (currentTab === 'writing') return 'Writing • Sentence Builder';
      return appLanguage === 'en' ? 'Active Exercise' : 'Aktive Übung';
    }
    if (currentTab === 'home') return undefined;
    if (currentTab === 'vocab') return 'Vocabulary';
    if (currentTab === 'grammar') return 'Grammar';
    if (currentTab === 'listening') return 'Listening';
    if (currentTab === 'speaking') return 'Speaking';
    if (currentTab === 'reading') return 'Reading';
    if (currentTab === 'writing') return 'Writing';
    if (currentTab === 'profile') return t.myProfileTitle;
    if (currentTab === 'settings') return t.settingsTitle;
    return undefined;
  };

  const isScrollableTab = currentTab === 'profile' || currentTab === 'settings';

  return (
    <div
      className={`w-full bg-[#f8f9fa] dark:bg-[#2b303a] text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 ${
        isScrollableTab
          ? 'h-[100dvh] overflow-y-auto custom-scrollbar' // fixed height, so the page scrolls inside it
          : 'h-[100dvh] max-h-[100dvh] overflow-hidden select-none'
      }`}
    >
      {/* Mobile Landscape Orientation Warning */}
      <OrientationGuard appLanguage={appLanguage} />

      {/* Top Bar */}
      <DuolingoTopBar
        onOpenProfile={() => handleSelectTab('profile')}
        onOpenSettings={() => handleSelectTab('settings')}
        canGoBack={currentTab !== 'home' || activeExerciseMode !== null}
        onBack={handleTopBack}
        onGoHome={handleGoHome}
        title={getTopBarTitle()}
        appLanguage={appLanguage}
        currentTab={currentTab}
      />

      {/* Main Content View Container */}
      <div
        className={`flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 flex flex-col ${
          isScrollableTab ? 'py-5 sm:py-6 overflow-visible' : 'py-2 sm:py-4 justify-center overflow-hidden'
        }`}
      >
        <main
          className={`w-full flex flex-col ${
            isScrollableTab
              ? 'flex-1 justify-start overflow-visible min-h-0'
              : 'h-full justify-center overflow-hidden'
          }`}
        >
          {/* HOME GUIDE VIEW */}
          {currentTab === 'home' && (
            <HomeGuideView
              onSelectArea={(areaTab) => handleSelectTab(areaTab)}
              streak={streak}
              xp={xp}
              gems={gems}
              vocabCount={vocabulary.length}
              dueReviewCount={globalDueCount}
              lessonsToPractiseCount={readyLessons(drillPractice, 'article').length + readyLessons(drillPractice, 'plural').length}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 1: WORTSCHATZ / VOCABULARY */}
          {currentTab === 'vocab' && (
            <SchritteVocabView
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              onQuizActiveChange={setIsQuizActive}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 2: GRAMMATIK / GRAMMAR & VERBS */}
          {currentTab === 'grammar' && (
            <SchritteGrammarView
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              onQuizActiveChange={setIsQuizActive}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 3: HÖREN / LISTENING */}
          {currentTab === 'listening' && (
            <SkillsView
              skillType="listening"
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 4: SPRECHEN / SPEAKING */}
          {currentTab === 'speaking' && (
            <SkillsView
              skillType="speaking"
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 5: LESEN / READING */}
          {currentTab === 'reading' && (
            <SkillsView
              skillType="reading"
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              appLanguage={appLanguage}
            />
          )}

          {/* TAB 6: SCHREIBEN / WRITING */}
          {currentTab === 'writing' && (
            <SkillsView
              skillType="writing"
              onCorrectAnswer={handleCorrectAnswer}
              onWrongAnswer={handleWrongAnswer}
              activeExerciseMode={activeExerciseMode}
              onSelectExerciseMode={setActiveExerciseMode}
              onRequestAbandon={handleRequestAbandon}
              appLanguage={appLanguage}
            />
          )}

          {/* PROFIL TAB (FULL PAGE) */}
          {currentTab === 'profile' && (
            <DuolingoProfileView
              streak={streak}
              gems={gems}
              hearts={hearts}
              maxHearts={maxHearts}
              xp={xp}
              vocabulary={vocabulary}
              onRefillHearts={handleRefillHearts}
              appLanguage={appLanguage}
              onNavigateToSettings={() => handleSelectTab('settings')}
            />
          )}

          {/* SETTINGS TAB (FULL PAGE) */}
          {currentTab === 'settings' && (
            <SettingsView
              isDark={isDark}
              themeMode={themeMode}
              onSetThemeMode={setThemeMode}
              soundEnabled={soundEnabled}
              musicEnabled={musicEnabled}
              notificationEnabled={notificationEnabled}
              onToggleTheme={() => {
                const nextMode = themeMode === 'light' ? 'dark' : themeMode === 'dark' ? 'system' : 'light';
                setThemeMode(nextMode);
              }}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onToggleMusic={() => setMusicEnabled(!musicEnabled)}
              onToggleNotification={() => setNotificationEnabled(!notificationEnabled)}
              onResetProgress={handleResetProgress}
              appLanguage={appLanguage}
              onSelectLanguage={setAppLanguage}
              onBackToHome={() => handleSelectTab('home')}
              onBackToProfile={previousTab === 'profile' ? () => handleSelectTab('profile') : undefined}
              totalWordsCount={vocabulary.length}
            />
          )}
        </main>
      </div>

      {/* Abandon Exercise Confirmation Pop-up Dialog */}
      <AbandonExerciseModal
        isOpen={isAbandonModalOpen}
        onStay={handleStayInExercise}
        onLeave={handleConfirmAbandon}
        appLanguage={appLanguage}
      />
    </div>
  );
}
