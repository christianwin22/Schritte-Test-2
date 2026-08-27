import React, { useState, useEffect } from 'react';
import {
  Headphones,
  Mic,
  BookMarked,
  FileEdit,
  Volume2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import {
  SCHRITTE_LISTENING_EXERCISES,
  SCHRITTE_SPEAKING_EXERCISES,
  SCHRITTE_READING_STORIES,
  SCHRITTE_WRITING_EXERCISES,
} from '../data/schritteSkills';
import { speakGerman } from '../utils/speech';
import { playSound } from '../utils/audioEffects';
import { AppLanguage, getTranslation } from '../utils/translations';

interface SkillsViewProps {
  skillType: 'listening' | 'speaking' | 'reading' | 'writing';
  onCorrectAnswer: (xpEarned?: number) => void;
  onWrongAnswer: () => void;
  activeExerciseMode: string | null;
  onSelectExerciseMode: (mode: string | null) => void;
  onRequestAbandon: (onConfirmLeave: () => void) => void;
  appLanguage?: AppLanguage;
}

export const SkillsView: React.FC<SkillsViewProps> = ({
  skillType,
  onCorrectAnswer,
  onWrongAnswer,
  activeExerciseMode,
  onSelectExerciseMode,
  onRequestAbandon,
  appLanguage = 'en',
}) => {
  const t = getTranslation(appLanguage);

  // Shared state
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);

  // Writing word order state
  const [assembledWords, setAssembledWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);

  // Speaking state
  const [isSpeakingRecorded, setIsSpeakingRecorded] = useState(false);

  // Reset when skill changes or next
  useEffect(() => {
    setSelectedChoice(null);
    setIsAnswerChecked(false);
    setIsSpeakingRecorded(false);
    if (skillType === 'writing') {
      const current =
        SCHRITTE_WRITING_EXERCISES[
          exerciseIndex % SCHRITTE_WRITING_EXERCISES.length
        ];
      if (current) {
        const shuffled = [...current.scrambledWords].sort(
          () => Math.random() - 0.5
        );
        setAvailableWords(shuffled);
        setAssembledWords([]);
      }
    }
  }, [skillType, exerciseIndex, activeExerciseMode]);

  const handleBackToHub = () => {
    if (activeExerciseMode) {
      onRequestAbandon(() => {
        onSelectExerciseMode(null);
      });
    } else {
      onSelectExerciseMode(null);
    }
  };

  // Skill Configuration (Black/White/Grey)
  const skillMeta = {
    listening: {
      title: appLanguage === 'en' ? 'Listening Comprehension' : 'Hörverstehen',
      subtitle: appLanguage === 'en' ? 'Authentic dialogues from Schritte International Neu A1–B1' : 'Authentische Alltagsdialoge aus Schritte International Neu A1–B1',
      icon: <Headphones className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      itemsCount: SCHRITTE_LISTENING_EXERCISES.length,
    },
    speaking: {
      title: appLanguage === 'en' ? 'Speaking & Pronunciation' : 'Sprechtraining & Aussprache',
      subtitle: appLanguage === 'en' ? 'Everyday phrases & rhythm for German-speaking countries' : 'Redemittel & Aussprache für den Alltag in D-A-CH',
      icon: <Mic className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      itemsCount: SCHRITTE_SPEAKING_EXERCISES.length,
    },
    reading: {
      title: appLanguage === 'en' ? 'Reading & Photo Stories' : 'Leseverstehen & Fotogeschichten',
      subtitle: appLanguage === 'en' ? 'Short stories, messages, emails, and photo dialogues' : 'Echte Kurztexte, Nachrichten, E-Mails und Fotogeschichten',
      icon: <BookMarked className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      itemsCount: SCHRITTE_READING_STORIES.length,
    },
    writing: {
      title: appLanguage === 'en' ? 'Writing & Sentence Builder' : 'Satzbau & Schreibtrainer',
      subtitle: appLanguage === 'en' ? 'Master verb placement, Word Order (Position 2), and sentence brackets' : 'Deutsche Satzklammer, Verb an Position 2 und Satzordnung',
      icon: <FileEdit className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />,
      itemsCount: SCHRITTE_WRITING_EXERCISES.length,
    },
  }[skillType];

  // VIEW 1: SKILL AREA HUB
  if (!activeExerciseMode) {
    return (
      <div className="w-full h-full flex flex-col justify-center gap-3 sm:gap-5 py-1 animate-fadeIn overflow-hidden">
        {/* Banner */}
        <div className="bg-zinc-950 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white border border-zinc-900 shadow-xs relative overflow-hidden">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 sm:p-3 bg-zinc-900 rounded-xl sm:rounded-2xl border border-zinc-800 text-white shrink-0">
              {skillMeta.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-700">
                  Schritte Neu A1–B1
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black mt-0.5 sm:mt-1 tracking-tight text-white">
                {skillMeta.title}
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
                {skillMeta.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Exercises Card */}
        <div>
          <div
            onClick={() => {
              playSound('tap');
              onSelectExerciseMode('standard');
            }}
            className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-950 dark:hover:border-white shadow-xs hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5 active:scale-[0.99] flex items-center justify-between group"
          >
            <div className="space-y-1 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-700">
                  {appLanguage === 'en' ? 'Interactive Unit' : 'Interaktive Einheit'}
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  {skillMeta.itemsCount} {appLanguage === 'en' ? 'exercises ready' : 'Übungen verfügbar'}
                </span>
              </div>
              <h4 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                {skillType === 'listening' && (appLanguage === 'en' ? 'Start Listening & Dialogue Quiz' : 'Hörverstehen & Dialog-Quiz starten')}
                {skillType === 'speaking' && (appLanguage === 'en' ? 'Start Speaking & Pronunciation Practice' : 'Redemittel & Lautsprecher-Training starten')}
                {skillType === 'reading' && (appLanguage === 'en' ? 'Start Photo Stories & Reading Comprehension' : 'Fotogeschichten & Leseverständnis starten')}
                {skillType === 'writing' && (appLanguage === 'en' ? 'Start Sentence Builder & Word Order' : 'Satzbau & Satzklammer-Baukasten starten')}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed hidden sm:block">
                {appLanguage === 'en'
                  ? 'Step-by-step drills with audio pronunciation, instant feedback, and XP scoring.'
                  : 'Schritt-für-Schritt Übungen mit nativer Aussprache, direktem Feedback und XP Punkten.'}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl sm:rounded-2xl text-zinc-900 dark:text-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors shrink-0 ml-3">
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: ACTIVE EXERCISE SCREEN (Fits fixed in viewport)
  return (
    <div className="w-full h-full flex flex-col justify-center py-1 sm:py-2 animate-fadeIn">
      {/* 1. LISTENING VIEW */}
      {skillType === 'listening' && (
        <div className="max-w-lg mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          {(() => {
            const ex =
              SCHRITTE_LISTENING_EXERCISES[
                exerciseIndex % SCHRITTE_LISTENING_EXERCISES.length
              ];
            return (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    Audio {(exerciseIndex % SCHRITTE_LISTENING_EXERCISES.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {SCHRITTE_LISTENING_EXERCISES.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2.5 py-0.5 rounded-md text-xs font-bold border border-zinc-200 dark:border-zinc-700">
                    {appLanguage === 'en' ? 'Lesson' : 'Lektion'} {ex.lektion}
                  </span>
                </div>

                {/* Audio Player Card */}
                <div className="p-5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 text-center space-y-3">
                  <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {ex.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    Situation: {ex.situation}
                  </p>
                  <button
                    onClick={() => {
                      playSound('tap');
                      ex.dialogueLines.forEach((line, idx) => {
                        setTimeout(() => {
                          speakGerman(`${line.speaker} sagt: ${line.text}`);
                        }, idx * 2800);
                      });
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3.5 bg-zinc-950 hover:bg-zinc-800 active:scale-95 text-white font-black rounded-2xl shadow-xs transition-all cursor-pointer"
                  >
                    <Volume2 className="w-5 h-5" />
                    <span>{appLanguage === 'en' ? 'Listen to Dialogue' : 'Dialog anhören'} 🎧</span>
                  </button>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <h4 className="font-black text-base text-zinc-900 dark:text-zinc-100">
                    {ex.question}
                  </h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    {ex.options.map((opt, idx) => {
                      const isSelected = selectedChoice === idx;
                      const isCorrectChoice = idx === ex.correctIndex;
                      return (
                        <button
                          key={opt}
                          disabled={isAnswerChecked}
                          onClick={() => {
                            playSound('tap');
                            setSelectedChoice(idx);
                          }}
                          className={`p-3.5 rounded-2xl text-left font-bold text-sm border-2 transition-all cursor-pointer ${
                            isAnswerChecked
                              ? isCorrectChoice
                                ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-950 dark:border-white text-zinc-950 dark:text-white font-black'
                                : isSelected
                                ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 text-zinc-500'
                                : 'opacity-40 border-zinc-200'
                              : isSelected
                              ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                              : 'bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 hover:border-zinc-900 text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Verification Bar */}
                {!isAnswerChecked ? (
                  <button
                    disabled={selectedChoice === null}
                    onClick={() => {
                      if (selectedChoice === null) return;
                      const isCorrect = selectedChoice === ex.correctIndex;
                      setIsAnswerChecked(true);
                      if (isCorrect) {
                        playSound('correct');
                        onCorrectAnswer(20);
                      } else {
                        playSound('wrong');
                        onWrongAnswer();
                      }
                    }}
                    className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {t.checkAnswer}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-2xl text-xs space-y-2 border border-zinc-200 dark:border-zinc-700">
                      <p className="font-black text-zinc-900 dark:text-zinc-100">
                        {appLanguage === 'en' ? 'Dialogue Transcript:' : 'Dialog-Transkript:'}
                      </p>
                      <div className="space-y-1 text-zinc-700 dark:text-zinc-300 italic">
                        {ex.dialogueLines.map((line, i) => (
                          <p key={i}>
                            <strong>{line.speaker}:</strong> "{line.text}"
                          </p>
                        ))}
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400 font-semibold pt-1">
                        💡 {ex.explanation}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        playSound('tap');
                        setExerciseIndex((p) => p + 1);
                      }}
                      className="w-full py-3.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <span>{appLanguage === 'en' ? 'Next Audio Exercise' : 'Nächste Audio-Übung'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 2. SPEAKING VIEW */}
      {skillType === 'speaking' && (
        <div className="max-w-lg mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4 text-center">
          {(() => {
            const spk =
              SCHRITTE_SPEAKING_EXERCISES[
                exerciseIndex % SCHRITTE_SPEAKING_EXERCISES.length
              ];
            return (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    {appLanguage === 'en' ? 'Phrase' : 'Redemittel'}{' '}
                    {(exerciseIndex % SCHRITTE_SPEAKING_EXERCISES.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {SCHRITTE_SPEAKING_EXERCISES.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-bold border border-zinc-200 dark:border-zinc-700">
                    {appLanguage === 'en' ? 'Lek' : 'Lek'} {spk.lektion}
                  </span>
                </div>

                <div className="space-y-1.5 py-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                    {spk.situation}
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
                    "{spk.targetGerman}"
                  </h3>
                  <p className="text-sm font-semibold text-zinc-500">
                    👉 {spk.english}
                  </p>
                </div>

                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-left text-xs space-y-0.5">
                  <p className="font-bold text-zinc-900 dark:text-zinc-200">
                    🗣️ {appLanguage === 'en' ? 'Pronunciation:' : 'Aussprache:'}
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
                    {spk.hint}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
                  <button
                    onClick={() => {
                      playSound('tap');
                      speakGerman(spk.targetGerman);
                    }}
                    className="flex-1 py-2.5 px-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 text-zinc-900 dark:text-white font-black text-xs flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-700 shadow-xs transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{appLanguage === 'en' ? 'Listen' : 'Anhören'} 🔊</span>
                  </button>

                  <button
                    onClick={() => {
                      playSound('correct');
                      setIsSpeakingRecorded(true);
                      onCorrectAnswer(15);
                    }}
                    className="flex-1 py-2.5 px-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 active:scale-95 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                  >
                    <Mic className="w-4 h-4" />
                    <span>{appLanguage === 'en' ? 'Spoken (+15 XP)' : 'Gesprochen (+15 XP)'}</span>
                  </button>
                </div>

                {isSpeakingRecorded && (
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        playSound('tap');
                        setExerciseIndex((p) => p + 1);
                      }}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <span>{appLanguage === 'en' ? 'Next Phrase' : 'Nächstes Redemittel'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 3. READING VIEW */}
      {skillType === 'reading' && (
        <div className="max-w-lg mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          {(() => {
            const rd =
              SCHRITTE_READING_STORIES[
                exerciseIndex % SCHRITTE_READING_STORIES.length
              ];
            const currentQ = rd.questions[0];
            return (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    {appLanguage === 'en' ? 'Text' : 'Text'}{' '}
                    {(exerciseIndex % SCHRITTE_READING_STORIES.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {SCHRITTE_READING_STORIES.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-bold border border-zinc-200 dark:border-zinc-700">
                    {appLanguage === 'en' ? 'Lek' : 'Lek'} {rd.lektion} • {rd.character}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 space-y-1.5">
                  <h3 className="font-black text-base text-zinc-950 dark:text-white tracking-tight">
                    {rd.title}
                  </h3>
                  <div className="space-y-1 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium max-h-28 overflow-y-auto">
                    {rd.passage.map((p, idx) => (
                      <p key={idx}>{p}</p>
                    ))}
                  </div>
                </div>

                {currentQ && (
                  <div className="space-y-1.5">
                    <h4 className="font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                      ❓ {currentQ.question}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {currentQ.options.map((opt, idx) => {
                        const isSelected = selectedChoice === idx;
                        const isCorrectChoice = idx === currentQ.correctIndex;
                        return (
                          <button
                            key={opt}
                            disabled={isAnswerChecked}
                            onClick={() => {
                              playSound('tap');
                              setSelectedChoice(idx);
                            }}
                            className={`p-2.5 rounded-xl text-left font-bold text-xs border-2 transition-all cursor-pointer ${
                              isAnswerChecked
                                ? isCorrectChoice
                                  ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-950 dark:border-white text-zinc-950 dark:text-white font-black'
                                  : isSelected
                                  ? 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 text-zinc-500'
                                  : 'opacity-40 border-zinc-200'
                                : isSelected
                                ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 border-zinc-950 dark:border-white'
                                : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-950 text-zinc-900 dark:text-zinc-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isAnswerChecked ? (
                  <button
                    disabled={selectedChoice === null}
                    onClick={() => {
                      if (selectedChoice === null || !currentQ) return;
                      const isCorrect = selectedChoice === currentQ.correctIndex;
                      setIsAnswerChecked(true);
                      if (isCorrect) {
                        playSound('correct');
                        onCorrectAnswer(20);
                      } else {
                        playSound('wrong');
                        onWrongAnswer();
                      }
                    }}
                    className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {t.checkAnswer}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        playSound('tap');
                        setExerciseIndex((p) => p + 1);
                      }}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <span>{appLanguage === 'en' ? 'Next Reading Passage' : 'Nächster Lesetext'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* 4. WRITING / WORD ORDER VIEW (Schreiben) */}
      {skillType === 'writing' && (
        <div className="max-w-lg mx-auto w-full bg-white dark:bg-zinc-900 rounded-3xl p-4 sm:p-6 border-2 border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          {(() => {
            const wr =
              SCHRITTE_WRITING_EXERCISES[
                exerciseIndex % SCHRITTE_WRITING_EXERCISES.length
              ];
            const isCorrect =
              assembledWords.join(' ') === wr.correctSentence;
            return (
              <>
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                  <span>
                    {appLanguage === 'en' ? 'Sentence' : 'Satzbau'}{' '}
                    {(exerciseIndex % SCHRITTE_WRITING_EXERCISES.length) + 1}{' '}
                    {appLanguage === 'en' ? 'of' : 'von'} {SCHRITTE_WRITING_EXERCISES.length}
                  </span>
                  <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded-md text-[11px] font-bold border border-zinc-200 dark:border-zinc-700">
                    {appLanguage === 'en' ? 'Lek' : 'Lek'} {wr.lektion}
                  </span>
                </div>

                <div className="text-center space-y-0.5">
                  <span className="text-[11px] font-black uppercase text-zinc-500">
                    {appLanguage === 'en' ? 'Arrange the words into the correct order:' : 'Bringe die Wörter in die richtige Reihenfolge:'}
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 italic">
                    "{wr.englishPrompt}"
                  </p>
                </div>

                <div className="min-h-[56px] p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-wrap items-center gap-1.5">
                  {assembledWords.map((word, idx) => (
                    <button
                      key={idx}
                      disabled={isAnswerChecked}
                      onClick={() => {
                        playSound('tap');
                        setAssembledWords((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                        setAvailableWords((prev) => [...prev, word]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-950 text-white font-black text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      {word}
                    </button>
                  ))}
                  {assembledWords.length === 0 && (
                    <span className="text-xs font-bold text-zinc-400">
                      {appLanguage === 'en'
                        ? 'Tap the words below to build the sentence...'
                        : 'Tippe auf die Wörter unten, um den Satz zu bauen...'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center py-1">
                  {availableWords.map((word, idx) => (
                    <button
                      key={idx}
                      disabled={isAnswerChecked}
                      onClick={() => {
                        playSound('tap');
                        setAssembledWords((prev) => [...prev, word]);
                        setAvailableWords((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                      }}
                      className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-bold text-xs text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 active:scale-95 shadow-xs transition-all cursor-pointer"
                    >
                      {word}
                    </button>
                  ))}
                </div>

                {!isAnswerChecked ? (
                  <button
                    disabled={availableWords.length > 0}
                    onClick={() => {
                      setIsAnswerChecked(true);
                      if (isCorrect) {
                        playSound('correct');
                        onCorrectAnswer(25);
                        speakGerman(wr.correctSentence);
                      } else {
                        playSound('wrong');
                        onWrongAnswer();
                      }
                    }}
                    className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 active:scale-98 text-white font-black text-xs rounded-xl shadow-xs disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {t.checkSentence}
                  </button>
                ) : (
                  <div
                    className={`p-3 rounded-2xl border-2 space-y-2 ${
                      isCorrect
                        ? 'bg-zinc-50 dark:bg-zinc-800 border-zinc-950 dark:border-white text-zinc-950 dark:text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-400 text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isCorrect ? (
                        <div className="w-5 h-5 rounded-full bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center text-xs font-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-zinc-400 text-white flex items-center justify-center text-xs font-black">
                          <X className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <p className="font-black text-center text-xs sm:text-sm">
                        {isCorrect
                          ? appLanguage === 'en'
                            ? 'Sentence built perfectly! +25 XP'
                            : 'Satz perfekt gebaut! +25 XP'
                          : appLanguage === 'en'
                          ? `Incorrect: ${wr.correctSentence}`
                          : `Falsch: ${wr.correctSentence}`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        playSound('tap');
                        setExerciseIndex((p) => p + 1);
                      }}
                      className="w-full py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                    >
                      <span>{appLanguage === 'en' ? 'Next Writing Exercise' : 'Nächste Schreibübung'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};
