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
import { AppLanguage, getTranslation } from '../utils/translations';

interface SchritteGrammarViewProps {
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  onQuizActiveChange?: (isActive: boolean) => void;
  /** Badges on Nominative and Accusative: lessons ready to practise, nouns due. */
  drillBadges?: Record<'article' | 'accusative', { waiting: number; due: number }>;
  appLanguage?: AppLanguage;
}

type GrammarSection = 'verb' | 'article' | 'preposition';

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
  onQuizActiveChange,
  drillBadges,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);
  const en = appLanguage === 'en';

  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel>('A1');
  // Every part starts open, so every exercise is in view; close one by hand.
  const [openSections, setOpenSections] = useState<Record<GrammarSection, boolean>>({
    verb: true,
    article: true,
    preposition: true,
  });
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
    return list;
  }, [selectedLevel]);

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

  const verbExercises = [
    {
      id: 'table',
      title: 'Conjugation',
    },
    {
      id: 'sentence_stem',
      title: 'Sentence with Verb Stem',
    },
  ];

  // The four cases Schritte teaches from A1 to B1. Nominative is the Vocabulary
  // Der/Die/Das exercise itself (App opens that same screen), so any change there
  // shows up here too. Accusative is its twin with den / die / das. Dative and Genitive have no exercise yet.
  const articleExercises: { id: string; title: string; drill?: 'article' | 'accusative'; soon?: boolean }[] = [
    { id: 'article_nominative', title: en ? 'Nominative (Subject)' : 'Nominativ (Subjekt)', drill: 'article' },
    { id: 'article_accusative', title: en ? 'Accusative (Direct object)' : 'Akkusativ (direktes Objekt)', drill: 'accusative' },
    { id: 'article_dative', title: en ? 'Dative (Indirect object)' : 'Dativ (indirektes Objekt)', soon: true },
    { id: 'article_genitive', title: en ? 'Genitive (Possession)' : 'Genitiv (Besitz)', soon: true },
  ];

  // VIEW 1: GRAMMAR AREA HUB — the parts, each folding open to its exercises.
  // No level bar for now: the verbs are A1.
  if (!activeExerciseMode) {
    const sections: { id: GrammarSection; title: string; exercises: { id: string; title: string; drill?: 'article' | 'accusative'; soon?: boolean }[] }[] = [
      { id: 'verb', title: appLanguage === 'en' ? 'Verb' : 'Verben', exercises: verbExercises },
      { id: 'article', title: appLanguage === 'en' ? 'Article' : 'Artikel', exercises: articleExercises },
      { id: 'preposition', title: appLanguage === 'en' ? 'Preposition' : 'Präpositionen', exercises: [] },
    ];
    return (
      <div className="w-full h-full flex flex-col justify-start gap-2.5 pt-0.5 sm:pt-1 pb-2 animate-fadeIn overflow-y-auto">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-2.5">
          {sections.map((section) => {
            const isOpen = openSections[section.id];
            return (
              <div
                key={section.id}
                className="w-full bg-white dark:bg-zinc-900 rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    playSound('tap');
                    setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }));
                  }}
                  className="w-full px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all"
                >
                  <span className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {section.title}
                  </span>
                  <span className="flex items-center gap-1.5">
                  {/* The part's own total, like the Grammar tile on Home, so it shows even when closed */}
                  {(() => {
                    const drills = section.exercises.map((e) => e.drill).filter(Boolean) as ('article' | 'accusative')[];
                    const waiting = drills.reduce((n, d) => n + (drillBadges?.[d]?.waiting ?? 0), 0);
                    const due = drills.reduce((n, d) => n + (drillBadges?.[d]?.due ?? 0), 0);
                    return (
                      <>
                        {waiting > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black flex items-center justify-center shadow-xs">
                            {waiting}
                          </span>
                        )}
                        {due > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs animate-pulse">
                            {due}
                          </span>
                        )}
                      </>
                    );
                  })()}
                  <ChevronDown
                    className={`w-4 h-4 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2">
                    {section.exercises.length > 0 ? (
                      section.exercises.map((ex) => (
                        ex.soon ? (
                          <div
                            key={ex.id}
                            aria-disabled="true"
                            className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-left font-black text-sm text-zinc-400 dark:text-zinc-500 flex items-center justify-between opacity-60 cursor-not-allowed"
                          >
                            <span>{ex.title}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              {appLanguage === 'en' ? 'Soon' : 'Bald'}
                            </span>
                          </div>
                        ) : (
                        <button
                          key={ex.id}
                          id={`grammar-mode-${ex.id}`}
                          onClick={() => {
                            playSound('tap');
                            onSelectExerciseMode(ex.id);
                          }}
                          className="w-full px-4 py-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-950 dark:hover:border-white text-left font-black text-sm text-zinc-900 dark:text-zinc-100 flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
                        >
                          <span>{ex.title}</span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            {/* Amber = lessons ready to practise, red = nouns due — as in Vocabulary */}
                            {ex.drill && drillBadges?.[ex.drill]?.waiting ? (
                              <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-amber-400 text-amber-950 text-[11px] font-black flex items-center justify-center shadow-xs">
                                {drillBadges[ex.drill].waiting}
                              </span>
                            ) : null}
                            {ex.drill && drillBadges?.[ex.drill]?.due ? (
                              <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center shadow-xs animate-pulse">
                                {drillBadges[ex.drill].due}
                              </span>
                            ) : null}
                            <ArrowRight className="w-4 h-4 text-zinc-400" />
                          </span>
                        </button>
                        )
                      ))
                    ) : (
                      <p className="px-1 py-2 text-sm font-bold text-zinc-400 dark:text-zinc-500">
                        {appLanguage === 'en' ? 'No exercises yet' : 'Noch keine Übungen'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
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

