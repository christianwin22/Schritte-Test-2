import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  SCHRITTE_VERBS,
  SCHRITTE_SENTENCE_STEM_DRILLS,
  VerbGrammarEntry,
} from '../data/schritteVerbs';
import { CEFRLevel } from '../types';
import { speakGerman } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { UmlautHelper } from './UmlautHelper';
import { AppLanguage, getTranslation } from '../utils/translations';

interface SchritteGrammarViewProps {
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  appLanguage?: AppLanguage;
}

type VerbCategoryFilter =
  | 'ALL'
  | 'regular'
  | 'vowel_change'
  | 'separable'
  | 'modal'
  | 'auxiliary';

type PronounKey = 'ich' | 'du' | 'er_sie_es' | 'wir' | 'ihr' | 'sie_Sie';

const PRONOUN_LIST: { key: PronounKey; label: string; en: string }[] = [
  { key: 'ich', label: 'ich', en: 'I' },
  { key: 'du', label: 'du', en: 'you (sg.)' },
  { key: 'er_sie_es', label: 'er / sie / es', en: 'he / she / it' },
  { key: 'wir', label: 'wir', en: 'we' },
  { key: 'ihr', label: 'ihr', en: 'you (pl.)' },
  { key: 'sie_Sie', label: 'sie / Sie', en: 'they / you (formal)' },
];

export const SchritteGrammarView: React.FC<SchritteGrammarViewProps> = ({
  onCorrectAnswer,
  onWrongAnswer,
  activeExerciseMode,
  onSelectExerciseMode,
  onRequestAbandon,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  const [selectedCategory, setSelectedCategory] = useState<VerbCategoryFilter>('ALL');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [selectedVerbIndex, setSelectedVerbIndex] = useState(0);
  const [activeInputFocus, setActiveInputFocus] = useState<string>('ich');

  // Single Pronoun Drill state
  const [singlePronounIndex, setSinglePronounIndex] = useState(0);
  const [singlePronounKey, setSinglePronounKey] = useState<PronounKey>('du');
  const [singlePronounInput, setSinglePronounInput] = useState('');
  const [singlePronounChecked, setSinglePronounChecked] = useState(false);

  // Filtered verbs list
  const filteredVerbs = useMemo(() => {
    let list = SCHRITTE_VERBS.filter((v) => v.level === selectedLevel);
    if (list.length === 0) list = SCHRITTE_VERBS;
    if (selectedCategory === 'ALL') return list;
    return list.filter((v) => v.type === selectedCategory);
  }, [selectedCategory, selectedLevel]);

  const currentVerb: VerbGrammarEntry =
    filteredVerbs[selectedVerbIndex % (filteredVerbs.length || 1)] ||
    SCHRITTE_VERBS[0];

  const currentSingleVerb: VerbGrammarEntry =
    filteredVerbs[singlePronounIndex % (filteredVerbs.length || 1)] ||
    SCHRITTE_VERBS[0];

  // Table form state
  const [tableInputs, setTableInputs] = useState<{
    ich: string;
    du: string;
    er_sie_es: string;
    wir: string;
    ihr: string;
    sie_Sie: string;
  }>({
    ich: '',
    du: '',
    er_sie_es: '',
    wir: '',
    ihr: '',
    sie_Sie: '',
  });
  const [tableChecked, setTableChecked] = useState(false);
  const [tableScore, setTableScore] = useState<number | null>(null);

  // Sentence Stem state
  const [stemIndex, setStemIndex] = useState(0);
  const [stemInput, setStemInput] = useState('');
  const [stemChecked, setStemChecked] = useState(false);

  const currentStemExercise =
    SCHRITTE_SENTENCE_STEM_DRILLS[
      stemIndex % SCHRITTE_SENTENCE_STEM_DRILLS.length
    ];

  // Back button handler with abandon guard
  const handleBackToHub = () => {
    if (activeExerciseMode) {
      onRequestAbandon(() => {
        onSelectExerciseMode(null);
        setTableChecked(false);
        setStemChecked(false);
        setSinglePronounChecked(false);
      });
    } else {
      onSelectExerciseMode(null);
    }
  };

  // Full Table submit
  const handleTableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVerb || tableChecked) return;
    const expected = currentVerb.presentTable;
    let correctCount = 0;
    if (tableInputs.ich.trim().toLowerCase() === expected.ich.toLowerCase()) correctCount++;
    if (tableInputs.du.trim().toLowerCase() === expected.du.toLowerCase()) correctCount++;
    if (tableInputs.er_sie_es.trim().toLowerCase() === expected.er_sie_es.toLowerCase()) correctCount++;
    if (tableInputs.wir.trim().toLowerCase() === expected.wir.toLowerCase()) correctCount++;
    if (tableInputs.ihr.trim().toLowerCase() === expected.ihr.toLowerCase()) correctCount++;
    if (tableInputs.sie_Sie.trim().toLowerCase() === expected.sie_Sie.toLowerCase()) correctCount++;

    setTableScore(correctCount);
    setTableChecked(true);

    if (correctCount === 6) {
      playSound('correct');
      onCorrectAnswer(30);
    } else if (correctCount >= 4) {
      playSound('correct');
      onCorrectAnswer(15);
    } else {
      playSound('wrong');
      onWrongAnswer();
    }
  };

  const handleNextVerb = () => {
    playSound('tap');
    setTableChecked(false);
    setTableScore(null);
    setTableInputs({
      ich: '',
      du: '',
      er_sie_es: '',
      wir: '',
      ihr: '',
      sie_Sie: '',
    });
    setSelectedVerbIndex((prev) => (prev + 1) % filteredVerbs.length);
  };

  // Single Pronoun submit
  const handleSinglePronounSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSingleVerb || singlePronounChecked || !singlePronounInput.trim()) return;
    const expected = currentSingleVerb.presentTable[singlePronounKey];
    const isCorrect =
      singlePronounInput.trim().toLowerCase() === expected.toLowerCase();

    setSinglePronounChecked(true);

    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(10);
      const pronounObj = PRONOUN_LIST.find((p) => p.key === singlePronounKey);
      speakGerman(`${pronounObj?.label.split('/')[0].trim()} ${expected}`);
    } else {
      playSound('wrong');
      onWrongAnswer();
      const pronounObj = PRONOUN_LIST.find((p) => p.key === singlePronounKey);
      speakGerman(`${pronounObj?.label.split('/')[0].trim()} ${expected}`);
    }
  };

  const handleNextSinglePronoun = () => {
    playSound('tap');
    setSinglePronounChecked(false);
    setSinglePronounInput('');
    // Pick random next pronoun and next verb
    const nextPronouns: PronounKey[] = ['ich', 'du', 'er_sie_es', 'wir', 'ihr', 'sie_Sie'];
    const randomPronoun = nextPronouns[Math.floor(Math.random() * nextPronouns.length)];
    setSinglePronounKey(randomPronoun);
    setSinglePronounIndex((prev) => (prev + 1) % filteredVerbs.length);
  };

  // Sentence stem submit
  const handleStemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStemExercise || stemChecked || !stemInput.trim()) return;
    const isCorrect =
      stemInput.trim().toLowerCase() ===
      currentStemExercise.expectedAnswer.toLowerCase();
    setStemChecked(true);

    if (isCorrect) {
      playSound('correct');
      onCorrectAnswer(20);
      speakGerman(
        `${currentStemExercise.sentenceBefore} ${currentStemExercise.expectedAnswer} ${currentStemExercise.sentenceAfter} ${currentStemExercise.separableEnd || ''}`
      );
    } else {
      playSound('wrong');
      onWrongAnswer();
    }
  };

  const handleNextStem = () => {
    playSound('tap');
    setStemChecked(false);
    setStemInput('');
    setStemIndex((prev) => (prev + 1) % SCHRITTE_SENTENCE_STEM_DRILLS.length);
  };

  const categoryLabels: Record<VerbCategoryFilter, { en: string; de: string }> = {
    ALL: { en: 'All Categories', de: 'Alle Kategorien' },
    regular: { en: 'Regular Verbs', de: 'Regelmäßige Verben' },
    vowel_change: { en: 'Vowel Change (e->i, a->ä)', de: 'Vokalwechsel (e->i, a->ä)' },
    separable: { en: 'Separable (trennbare)', de: 'Trennbare Verben' },
    modal: { en: 'Modal Verbs (können, müssen)', de: 'Modalverben' },
    auxiliary: { en: 'Auxiliary (sein, haben)', de: 'Hilfsverben' },
  };

  const availableExercises = [
    {
      id: 'table',
      title: 'Full Conjugation',
    },
    {
      id: 'single_pronoun',
      title: 'Single Conjugation',
    },
    {
      id: 'sentence_stem',
      title: 'Sentence with Verb Stem',
    },
  ];

  // VIEW 1: GRAMMAR AREA HUB (Filter Banner with Level & Category Selector + 3 Minimal Cards)
  if (!activeExerciseMode) {
    return (
      <div className="w-full h-full flex flex-col justify-center gap-3 sm:gap-5 py-1 animate-fadeIn overflow-hidden">
        {/* Filter Banner matching Vocab */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-xs">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
            {/* Filter 1: A1 / A2 / B1 Level Selector */}
            <div className="flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5">
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-700">
                {(['A1', 'A2', 'B1'] as CEFRLevel[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      playSound('tap');
                      setSelectedLevel(lvl);
                    }}
                    className={`px-3 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedLevel === lvl
                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs scale-100'
                        : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter 2: Category Selector Dropdown */}
            <div className="relative">
              <button
                id="grammar-category-filter-button"
                onClick={() => {
                  playSound('tap');
                  setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                }}
                className="w-full sm:w-auto px-3 sm:px-4 py-1.5 sm:py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-98 text-zinc-900 dark:text-zinc-100 font-black text-xs rounded-xl sm:rounded-2xl shadow-xs border border-zinc-200 dark:border-zinc-700 flex items-center justify-between sm:justify-start gap-2 sm:gap-2.5 transition-all cursor-pointer"
              >
                <span>
                  {categoryLabels[selectedCategory][appLanguage === 'en' ? 'en' : 'de']}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Popover */}
              {isCategoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setIsCategoryDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 z-30 w-72 sm:w-80 bg-white dark:bg-zinc-900 rounded-3xl p-4 shadow-xl border-2 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 space-y-2 animate-fadeIn">
                    <div className="text-xs font-black text-zinc-500 dark:text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                      {appLanguage === 'en' ? 'Verb Type / Rule:' : 'Verbgruppe / Regel:'}
                    </div>
                    <div className="space-y-1 max-h-60 overflow-y-auto p-1">
                      {(
                        [
                          'ALL',
                          'regular',
                          'vowel_change',
                          'separable',
                          'modal',
                          'auxiliary',
                        ] as VerbCategoryFilter[]
                      ).map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            playSound('tap');
                            setSelectedCategory(cat);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                            selectedCategory === cat
                              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {categoryLabels[cat][appLanguage === 'en' ? 'en' : 'de']}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Available Exercises Grid (Exactly 3 Boxes - 1 Phrase/Title Each) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-5">
          {availableExercises.map((ex) => (
            <button
              key={ex.id}
              id={`grammar-mode-${ex.id}`}
              onClick={() => {
                playSound('tap');
                onSelectExerciseMode(ex.id);
              }}
              className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-8 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-white shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 sm:hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center text-center min-h-[64px] sm:min-h-[140px] group"
            >
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-base sm:text-xl tracking-tight group-hover:scale-105 transition-transform">
                {ex.title}
              </h4>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // VIEW 2: ACTIVE EXERCISE SCREEN (No extra banner, fits fixed on screen)
  return (
    <div className="w-full h-full flex flex-col justify-center py-1 sm:py-2 animate-fadeIn">
      {/* MODE 1: FULL TABLE CONJUGATION */}
      {activeExerciseMode === 'table' && (
        <div className="max-w-xl mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-5 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
            <span>
              {appLanguage === 'en' ? 'Verb' : 'Verb'}{' '}
              {(selectedVerbIndex % filteredVerbs.length) + 1}{' '}
              {appLanguage === 'en' ? 'of' : 'von'} {filteredVerbs.length}
            </span>
            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md uppercase text-[10px] font-bold border border-zinc-200 dark:border-zinc-700">
              {currentVerb.level} • {currentVerb.type}
            </span>
          </div>

          <div className="text-center space-y-0.5">
            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
              {currentVerb.lemma}
            </h3>
            <p className="text-xs font-semibold text-zinc-500">
              👉 {currentVerb.english}
            </p>
            {currentVerb.vowelChangeNote && (
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-semibold">
                ⚠️ {currentVerb.vowelChangeNote}
              </p>
            )}
          </div>

          <form onSubmit={handleTableSubmit} className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: 'ich', label: 'ich (I)', expected: currentVerb.presentTable.ich },
                  { key: 'du', label: 'du (you sg.)', expected: currentVerb.presentTable.du },
                  { key: 'er_sie_es', label: 'er/sie/es (he/she/it)', expected: currentVerb.presentTable.er_sie_es },
                  { key: 'wir', label: 'wir (we)', expected: currentVerb.presentTable.wir },
                  { key: 'ihr', label: 'ihr (you pl.)', expected: currentVerb.presentTable.ihr },
                  { key: 'sie_Sie', label: 'sie/Sie (they/formal)', expected: currentVerb.presentTable.sie_Sie },
                ] as const
              ).map((p) => {
                const val = tableInputs[p.key];
                const isCorrect =
                  tableChecked &&
                  val.trim().toLowerCase() === p.expected.toLowerCase();
                const isWrong = tableChecked && !isCorrect;
                return (
                  <div key={p.key} className="space-y-0.5">
                    <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                      {p.label}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={val}
                        disabled={tableChecked}
                        onFocus={() => setActiveInputFocus(p.key)}
                        onChange={(e) =>
                          setTableInputs((prev) => ({
                            ...prev,
                            [p.key]: e.target.value,
                          }))
                        }
                        placeholder={p.expected[0] + '...'}
                        className={`w-full px-3 py-1.5 sm:py-2 rounded-xl border-2 text-xs sm:text-sm font-bold outline-none transition-all text-zinc-900 dark:text-white ${
                          isCorrect
                            ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-950 dark:border-white text-zinc-950 dark:text-white'
                            : isWrong
                            ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                            : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus:border-zinc-950 dark:focus:border-white'
                        }`}
                      />
                      {tableChecked && (
                        <span className="absolute right-2.5 top-1.5 sm:top-2 text-[11px] font-bold text-zinc-900 dark:text-zinc-100">
                          {isCorrect ? '✓' : `✕ ${p.expected}`}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <UmlautHelper
              onInsert={(char) =>
                setTableInputs((prev) => ({
                  ...prev,
                  [activeInputFocus]: (prev as any)[activeInputFocus] + char,
                }))
              }
            />

            {!tableChecked ? (
              <button
                type="submit"
                className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-2xl shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                {t.checkTable}
              </button>
            ) : (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl space-y-2 border border-zinc-200 dark:border-zinc-700">
                <p className="text-center font-black text-xs text-zinc-900 dark:text-white">
                  {appLanguage === 'en' ? 'Result' : 'Ergebnis'}: {tableScore} / 6{' '}
                  {appLanguage === 'en' ? 'correct' : 'richtig'}
                </p>
                <button
                  type="button"
                  onClick={handleNextVerb}
                  className="w-full py-2 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>{t.nextVerb}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* MODE 2: SINGLE PRONOUN CONJUGATION DRILL (1 at a time, random pronoun) */}
      {activeExerciseMode === 'single_pronoun' && (
        <div className="max-w-md mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
            <span>
              {appLanguage === 'en' ? 'Verb' : 'Verb'}{' '}
              {(singlePronounIndex % filteredVerbs.length) + 1}{' '}
              {appLanguage === 'en' ? 'of' : 'von'} {filteredVerbs.length}
            </span>
            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md uppercase text-[10px] font-bold border border-zinc-200 dark:border-zinc-700">
              {currentSingleVerb.level} • {currentSingleVerb.type}
            </span>
          </div>

          <div className="py-1 space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
              {appLanguage === 'en' ? 'Conjugate for the given pronoun:' : 'Konjugiere für das Pronomen:'}
            </span>
            <div className="p-3 bg-zinc-50 dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700 inline-block px-6">
              <span className="text-xs font-bold text-zinc-500 block">
                {currentSingleVerb.lemma} ({currentSingleVerb.english})
              </span>
              <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 mt-0.5 block">
                {PRONOUN_LIST.find((p) => p.key === singlePronounKey)?.label}
              </span>
            </div>
          </div>

          <form onSubmit={handleSinglePronounSubmit} className="space-y-3.5">
            <input
              type="text"
              value={singlePronounInput}
              disabled={singlePronounChecked}
              onChange={(e) => setSinglePronounInput(e.target.value)}
              placeholder={appLanguage === 'en' ? 'Type conjugated verb...' : 'Verbform eingeben...'}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 text-center font-bold text-sm focus:border-zinc-950 dark:focus:border-white outline-none text-zinc-900 dark:text-white"
            />

            <UmlautHelper onInsert={(char) => setSinglePronounInput((prev) => prev + char)} />

            {!singlePronounChecked ? (
              <button
                type="submit"
                disabled={!singlePronounInput.trim()}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {t.checkSentence}
              </button>
            ) : (
              <div
                className={`p-3.5 rounded-2xl border-2 space-y-2.5 ${
                  singlePronounInput.trim().toLowerCase() ===
                  currentSingleVerb.presentTable[singlePronounKey].toLowerCase()
                    ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100'
                    : 'bg-zinc-100 dark:bg-zinc-800/80 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {singlePronounInput.trim().toLowerCase() ===
                  currentSingleVerb.presentTable[singlePronounKey].toLowerCase() ? (
                    <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs font-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-black">
                      <X className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <p className="font-black text-sm">
                    {singlePronounInput.trim().toLowerCase() ===
                    currentSingleVerb.presentTable[singlePronounKey].toLowerCase()
                      ? appLanguage === 'en'
                        ? `Correct! "${PRONOUN_LIST.find((p) => p.key === singlePronounKey)?.label.split('/')[0].trim()} ${currentSingleVerb.presentTable[singlePronounKey]}"`
                        : `Richtig! ${PRONOUN_LIST.find((p) => p.key === singlePronounKey)?.label.split('/')[0].trim()} ${currentSingleVerb.presentTable[singlePronounKey]}`
                      : appLanguage === 'en'
                      ? `Incorrect. Correct: "${PRONOUN_LIST.find((p) => p.key === singlePronounKey)?.label.split('/')[0].trim()} ${currentSingleVerb.presentTable[singlePronounKey]}"`
                      : `Falsch! Richtig: ${PRONOUN_LIST.find((p) => p.key === singlePronounKey)?.label.split('/')[0].trim()} ${currentSingleVerb.presentTable[singlePronounKey]}`}
                  </p>
                </div>

                {currentSingleVerb.vowelChangeNote && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold">
                    💡 {currentSingleVerb.vowelChangeNote}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleNextSinglePronoun}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <span>{appLanguage === 'en' ? 'Next Drill' : 'Nächste Übung'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* MODE 3: SENTENCE WITH STEM */}
      {activeExerciseMode === 'sentence_stem' && (
        <div className="max-w-lg mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-5 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
          <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
            <span>
              {appLanguage === 'en' ? 'Sentence' : 'Satz'}{' '}
              {(stemIndex % SCHRITTE_SENTENCE_STEM_DRILLS.length) + 1}{' '}
              {appLanguage === 'en' ? 'of' : 'von'} {SCHRITTE_SENTENCE_STEM_DRILLS.length}
            </span>
            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-bold border border-zinc-200 dark:border-zinc-700">
              {appLanguage === 'en' ? 'Lesson' : 'Lektion'} {currentStemExercise.lektion}
            </span>
          </div>

          <div className="py-2 space-y-1">
            <span className="text-[11px] font-black uppercase text-zinc-500 dark:text-zinc-400">
              {appLanguage === 'en'
                ? 'Conjugate the verb in brackets:'
                : 'Konjugiere das Verb in Klammern:'}
            </span>
            <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100 leading-relaxed tracking-tight">
              {currentStemExercise.sentenceBefore} (<strong>{currentStemExercise.verbStem}</strong>){' '}
              {currentStemExercise.sentenceAfter} {currentStemExercise.separableEnd || ''}
            </h3>
            <p className="text-xs font-semibold text-zinc-500">
              👉 "{currentStemExercise.fullEnglish}"
            </p>
          </div>

          <form onSubmit={handleStemSubmit} className="space-y-3.5">
            <input
              type="text"
              value={stemInput}
              disabled={stemChecked}
              onChange={(e) => setStemInput(e.target.value)}
              placeholder={
                appLanguage === 'en'
                  ? 'Type conjugated verb...'
                  : 'Richtig konjugiertes Verb eingeben...'
              }
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 text-center font-bold text-sm focus:border-zinc-950 dark:focus:border-white outline-none text-zinc-900 dark:text-white"
            />

            <UmlautHelper onInsert={(char) => setStemInput((prev) => prev + char)} />

            {!stemChecked ? (
              <button
                type="submit"
                disabled={!stemInput.trim()}
                className="w-full py-3 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-xs rounded-2xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
              >
                {t.checkSentence}
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl border-2 space-y-2.5 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-center gap-2">
                  {stemInput.trim().toLowerCase() === currentStemExercise.expectedAnswer.toLowerCase() ? (
                    <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs font-black">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-black">
                      <X className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                  <p className="font-black text-sm text-zinc-900 dark:text-white">
                    {stemInput.trim().toLowerCase() === currentStemExercise.expectedAnswer.toLowerCase()
                      ? appLanguage === 'en'
                        ? 'Correct conjugation!'
                        : 'Richtig konjugiert!'
                      : appLanguage === 'en'
                      ? `Incorrect. Correct: ${currentStemExercise.expectedAnswer}`
                      : `Falsch! Richtig: ${currentStemExercise.expectedAnswer}`}
                  </p>
                </div>
                {currentStemExercise.hint && (
                  <p className="text-[11px] text-zinc-500 font-semibold">
                    💡 {appLanguage === 'en' ? 'Hint:' : 'Hinweis:'} {currentStemExercise.hint}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleNextStem}
                  className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                >
                  <span>{t.nextSentence}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </form>
        </div>
      )}
    </div>
  );
};

