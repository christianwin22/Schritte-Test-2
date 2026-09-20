import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  Volume2,
  Play,
  CheckCircle2,
  Calendar,
  Sparkles,
  BookMarked,
  X,
} from 'lucide-react';
import { WordEntry, CEFRLevel, PartOfSpeech, Gender, SRSItemState, ExerciseMode } from '../types';
import { speakGerman } from '../utils/speech';

interface VocabularyLibraryProps {
  vocabulary: WordEntry[];
  srsStates: Record<string, SRSItemState>;
  onStartWordDrill: (word: WordEntry, mode?: ExerciseMode) => void;
  onAddCustomWord: (newWord: WordEntry) => void;
}

export const VocabularyLibrary: React.FC<VocabularyLibraryProps> = ({
  vocabulary,
  srsStates,
  onStartWordDrill,
  onAddCustomWord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<CEFRLevel | 'ALL'>('ALL');
  const [selectedPOS, setSelectedPOS] = useState<PartOfSpeech | 'ALL'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for new custom word
  const [newLemma, setNewLemma] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [newLevel, setNewLevel] = useState<CEFRLevel>('A1');
  const [newPOS, setNewPOS] = useState<PartOfSpeech>('noun');
  const [newGender, setNewGender] = useState<Gender>('das');
  const [newPlural, setNewPlural] = useState('');
  const [newParticiple, setNewParticiple] = useState('');
  const [newAuxiliary, setNewAuxiliary] = useState<'haben' | 'sein'>('haben');
  const [newIsSeparable, setNewIsSeparable] = useState(false);
  const [newSeparablePrefix, setNewSeparablePrefix] = useState('');
  const [newSentenceGerman, setNewSentenceGerman] = useState('');
  const [newSentenceEnglish, setNewSentenceEnglish] = useState('');

  // Filter items
  const filteredWords = vocabulary.filter((w) => {
    const matchesSearch =
      w.lemma.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (w.nounDetails?.plural && w.nounDetails.plural.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesLevel = selectedLevel === 'ALL' || w.level === selectedLevel;
    const matchesPOS = selectedPOS === 'ALL' || w.partOfSpeech === selectedPOS;

    return matchesSearch && matchesLevel && matchesPOS;
  });

  const handleCreateWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLemma.trim() || !newTranslation.trim()) return;

    const id = `custom_${Date.now()}`;
    const wordObj: WordEntry = {
      id,
      lemma: newLemma.trim(),
      translation: newTranslation.trim(),
      level: newLevel,
      partOfSpeech: newPOS,
      exampleSentences: [],
    };

    if (newPOS === 'noun') {
      wordObj.nounDetails = {
        gender: newGender,
        plural: newPlural.trim() || `die ${newLemma}`,
      };
    } else if (newPOS === 'verb') {
      wordObj.verbDetails = {
        pastParticiple: newParticiple.trim() || `ge${newLemma}t`,
        auxiliary: newAuxiliary,
        isSeparable: newIsSeparable,
        separablePrefix: newSeparablePrefix.trim() || undefined,
      };
    }

    if (newSentenceGerman.trim()) {
      wordObj.exampleSentences.push({
        id: `s_${id}`,
        german: newSentenceGerman.includes('{{blank}}')
          ? newSentenceGerman.trim()
          : `${newSentenceGerman.trim()} {{blank}}`,
        english: newSentenceEnglish.trim() || 'Example sentence.',
        targetWord: newLemma.trim(),
      });
    }

    onAddCustomWord(wordObj);

    // Reset and close
    setNewLemma('');
    setNewTranslation('');
    setNewPlural('');
    setNewParticiple('');
    setNewSentenceGerman('');
    setNewSentenceEnglish('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6" id="vocab-library-section">
      {/* Search & Filter Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 shadow-lg shadow-black/20">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-vocab-search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search German lemma, English meaning, plural form..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-700/80 bg-slate-800/60 text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Level Filter */}
          <div className="flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {(['ALL', 'A1', 'A2', 'B1'] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                id={`filter-lvl-${lvl}`}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  selectedLevel === lvl
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Part of Speech Filter */}
          <div className="flex items-center bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            {(['ALL', 'noun', 'verb'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                id={`filter-pos-${pos}`}
                onClick={() => setSelectedPOS(pos)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                  selectedPOS === pos
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {pos === 'ALL' ? 'All Types' : `${pos}s`}
              </button>
            ))}
          </div>

          {/* Add Word Button */}
          <button
            type="button"
            id="btn-open-add-vocab-modal"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Word</span>
          </button>
        </div>
      </div>

      {/* Grid of Vocabulary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="vocab-cards-grid">
        {filteredWords.map((word) => {
          const srs = srsStates[word.id] || { stability: 20, intervalDays: 0, repetitionCount: 0 };
          const noun = word.nounDetails;
          const verb = word.verbDetails;

          return (
            <div
              key={word.id}
              id={`vocab-card-${word.id}`}
              className="flex flex-col justify-between rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 p-5 shadow-xl shadow-black/20 hover:border-slate-500/60 transition-all group"
            >
              <div className="space-y-3">
                {/* Header line with level & POS */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700">
                      {word.level}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 capitalize">
                      {word.partOfSpeech}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => speakGerman(word.nounDetails ? `${noun?.gender} ${word.lemma}` : word.lemma)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-blue-400 hover:bg-slate-800/80 cursor-pointer"
                    title="Pronounce"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Lemma Display with Gender Code */}
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {noun && (
                      <span
                        className={`text-sm font-black uppercase px-2 py-0.5 rounded-md ${
                          noun.gender === 'der'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : noun.gender === 'die'
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {noun.gender}
                      </span>
                    )}
                    <h3 className="text-xl font-bold tracking-tight text-white">
                      {word.lemma}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-300 mt-1 font-medium">
                    "{word.translation}"
                  </p>
                </div>

                {/* Specifics (Plural for Nouns, Forms for Verbs) */}
                {noun && (
                  <div className="text-xs bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Plural:</span>
                      <span className="font-bold text-slate-200">{noun.plural}</span>
                    </div>
                    {noun.genderRuleHint && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        Rule: {noun.genderRuleHint}
                      </p>
                    )}
                  </div>
                )}

                {verb && (
                  <div className="text-xs bg-slate-800/40 p-2.5 rounded-xl border border-slate-700/60 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Perfekt:</span>
                      <span className="font-bold text-slate-200">
                        {verb.auxiliary} {verb.pastParticiple}
                      </span>
                    </div>
                    {verb.isSeparable && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-purple-400 font-semibold">Trennbar:</span>
                        <span className="text-slate-300">Prefix "{verb.separablePrefix}-"</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Example sentence excerpt */}
                {word.exampleSentences?.[0] && (
                  <p className="text-xs text-slate-400 italic line-clamp-1">
                    "{word.exampleSentences[0].german.replace(/\{\{blank\}\}/g, word.exampleSentences[0].targetWord)}"
                  </p>
                )}
              </div>

              {/* SRS Stability Bar & Action Trigger */}
              <div className="mt-4 pt-3 border-t border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Memory Stability</span>
                  <span className="font-bold text-slate-300">
                    {srs.stability || 20}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      srs.stability >= 75
                        ? 'bg-emerald-500'
                        : srs.stability >= 45
                        ? 'bg-blue-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(5, srs.stability || 20)}%` }}
                  />
                </div>

                {/* Drill Trigger Buttons */}
                <div className="pt-2 flex items-center gap-1.5">
                  {word.nounDetails && (
                    <button
                      type="button"
                      id={`drill-gender-${word.id}`}
                      onClick={() => onStartWordDrill(word, 'gender')}
                      className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition-all text-center cursor-pointer"
                    >
                      Article Test
                    </button>
                  )}

                  {word.verbDetails && (
                    <button
                      type="button"
                      id={`drill-verb-${word.id}`}
                      onClick={() => onStartWordDrill(word, 'conjugator')}
                      className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition-all text-center cursor-pointer"
                    >
                      Conjugate
                    </button>
                  )}

                  <button
                    type="button"
                    id={`drill-cloze-${word.id}`}
                    onClick={() => onStartWordDrill(word, 'cloze')}
                    className="flex-1 py-1.5 px-2 text-[11px] font-bold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all text-center cursor-pointer"
                  >
                    Cloze Drill
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredWords.length === 0 && (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 space-y-2">
          <BookMarked className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-white">
            No vocabulary matches found
          </h3>
          <p className="text-xs text-slate-400">
            Try adjusting your search keywords or level filters.
          </p>
        </div>
      )}

      {/* Add Custom Word Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-2xl rounded-3xl max-w-lg w-full p-6 border border-slate-700/80 shadow-2xl shadow-black/50 space-y-5 animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span>Add Custom German Word</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWord} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    German Lemma:
                  </label>
                  <input
                    type="text"
                    required
                    value={newLemma}
                    onChange={(e) => setNewLemma(e.target.value)}
                    placeholder="e.g. Brücke, reisen"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    English Meaning:
                  </label>
                  <input
                    type="text"
                    required
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="e.g. bridge, to travel"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    CEFR Level:
                  </label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value as CEFRLevel)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="A1">A1 (Beginner)</option>
                    <option value="A2">A2 (Elementary)</option>
                    <option value="B1">B1 (Intermediate)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Part of Speech:
                  </label>
                  <select
                    value={newPOS}
                    onChange={(e) => setNewPOS(e.target.value as PartOfSpeech)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white focus:outline-hidden focus:border-blue-500"
                  >
                    <option value="noun">Noun (Nomen)</option>
                    <option value="verb">Verb</option>
                    <option value="adjective">Adjective</option>
                  </select>
                </div>
              </div>

              {/* Noun Details */}
              {newPOS === 'noun' && (
                <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Definite Article:
                      </label>
                      <select
                        value={newGender}
                        onChange={(e) => setNewGender(e.target.value as Gender)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white"
                      >
                        <option value="der">der (Masculine)</option>
                        <option value="die">die (Feminine)</option>
                        <option value="das">das (Neuter)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Plural Form:
                      </label>
                      <input
                        type="text"
                        value={newPlural}
                        onChange={(e) => setNewPlural(e.target.value)}
                        placeholder="e.g. die Brücken"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Verb Details */}
              {newPOS === 'verb' && (
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Partizip II:
                      </label>
                      <input
                        type="text"
                        value={newParticiple}
                        onChange={(e) => setNewParticiple(e.target.value)}
                        placeholder="e.g. gereist"
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-200 mb-1">
                        Auxiliary (Hilfsverb):
                      </label>
                      <select
                        value={newAuxiliary}
                        onChange={(e) => setNewAuxiliary(e.target.value as 'haben' | 'sein')}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white"
                      >
                        <option value="haben">haben</option>
                        <option value="sein">sein</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newIsSeparable}
                        onChange={(e) => setNewIsSeparable(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Is Separable (Trennbar)?</span>
                    </label>

                    {newIsSeparable && (
                      <input
                        type="text"
                        value={newSeparablePrefix}
                        onChange={(e) => setNewSeparablePrefix(e.target.value)}
                        placeholder="Prefix (e.g. ab, an, auf)"
                        className="flex-1 px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Example Sentence */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Example Sentence with <code className="text-blue-400 font-bold">{'{{blank}}'}</code>:
                </label>
                <input
                  type="text"
                  value={newSentenceGerman}
                  onChange={(e) => setNewSentenceGerman(e.target.value)}
                  placeholder="e.g. Ich gehe über die {{blank}}."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 text-xs"
                />
                <input
                  type="text"
                  value={newSentenceEnglish}
                  onChange={(e) => setNewSentenceEnglish(e.target.value)}
                  placeholder="English translation: e.g. I walk across the bridge."
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800/80 text-white placeholder:text-slate-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
