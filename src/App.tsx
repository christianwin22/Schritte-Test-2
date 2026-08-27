import { useState, useEffect } from 'react';
import { WordEntry, DuolingoTab } from './types';
import { INITIAL_VOCABULARY } from './data/vocabulary';
import { DuolingoTopBar } from './components/DuolingoTopBar';
import { HomeGuideView } from './components/HomeGuideView';
import { SchritteVocabView } from './components/SchritteVocabView';
import { SchritteGrammarView } from './components/SchritteGrammarView';
import { SkillsView } from './components/SkillsView';
import { DuolingoProfileView } from './components/DuolingoProfileView';
import { AbandonExerciseModal } from './components/AbandonExerciseModal';
import { OrientationGuard } from './components/OrientationGuard';
import { playSound, setGlobalSoundEnabled } from './utils/audioEffects';
import { AppLanguage, getTranslation } from './utils/translations';

const VOCAB_STORAGE_KEY = 'deutschmeister_custom_vocab_v2';
const STREAK_STORAGE_KEY = 'deutschmeister_streak_v2';
const XP_STORAGE_KEY = 'deutschmeister_xp_v2';
const GEMS_STORAGE_KEY = 'deutschmeister_gems_v2';
const HEARTS_STORAGE_KEY = 'deutschmeister_hearts_v2';
const LANG_STORAGE_KEY = 'deutschmeister_app_lang_v2';

export default function App() {
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
  const [activeExerciseMode, setActiveExerciseMode] = useState<string | null>(null);

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

  // Dark Mode Theme State
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Sound FX State
  const [soundEnabled, setSoundEnabled] = useState(true);

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
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
      localStorage.clear();
    }
  };

  // Safe Navigation with Active Exercise Abandon Protection
  const handleSelectTab = (tab: 'home' | DuolingoTab) => {
    if (tab === currentTab && !activeExerciseMode) return;
    if (activeExerciseMode) {
      setPendingAbandonCallback(() => () => {
        setActiveExerciseMode(null);
        setCurrentTab(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      setIsAbandonModalOpen(true);
      return;
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top Bar Back button handler
  const handleTopBack = () => {
    if (activeExerciseMode) {
      setPendingAbandonCallback(() => () => {
        setActiveExerciseMode(null);
      });
      setIsAbandonModalOpen(true);
      return;
    }
    if (currentTab !== 'home') {
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
    return undefined;
  };

  return (
    <div className={`w-full bg-[#fafafa] dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200 ${
      currentTab === 'profile'
        ? 'min-h-screen overflow-y-auto'
        : 'h-[100dvh] max-h-[100dvh] overflow-hidden select-none'
    }`}>
      {/* Mobile Landscape Orientation Warning */}
      <OrientationGuard appLanguage={appLanguage} />

      {/* Top Bar */}
      <DuolingoTopBar
        onOpenProfile={() => handleSelectTab('profile')}
        canGoBack={currentTab !== 'home' || activeExerciseMode !== null}
        onBack={handleTopBack}
        title={getTopBarTitle()}
        appLanguage={appLanguage}
      />

      {/* Main Content View Container */}
      <div className={`flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 py-2 sm:py-4 flex flex-col justify-center ${
        currentTab === 'profile' ? 'py-5 sm:py-6 overflow-visible' : 'overflow-hidden'
      }`}>
        <main className="w-full h-full flex flex-col justify-center overflow-hidden">
          {/* HOME GUIDE VIEW */}
          {currentTab === 'home' && (
            <HomeGuideView
              onSelectArea={(areaTab) => handleSelectTab(areaTab)}
              streak={streak}
              xp={xp}
              gems={gems}
              vocabCount={vocabulary.length}
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

          {/* PROFIL & SETTINGS */}
          {currentTab === 'profile' && (
            <DuolingoProfileView
              streak={streak}
              gems={gems}
              hearts={hearts}
              maxHearts={maxHearts}
              xp={xp}
              vocabulary={vocabulary}
              onRefillHearts={handleRefillHearts}
              onResetProgress={handleResetProgress}
              isDark={isDark}
              soundEnabled={soundEnabled}
              onToggleTheme={() => setIsDark(!isDark)}
              onToggleSound={() => setSoundEnabled(!soundEnabled)}
              onSelectLanguage={setAppLanguage}
              appLanguage={appLanguage}
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
