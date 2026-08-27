export interface ListeningItem {
  id: string;
  lektion: number;
  title: string;
  situation: string;
  speakerA: string;
  speakerB: string;
  dialogueLines: { speaker: string; text: string }[];
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SpeakingItem {
  id: string;
  lektion: number;
  title: string;
  prompt?: string;
  situation: string;
  targetGerman: string;
  english: string;
  keyPhonemes?: string;
  hint: string;
}

export interface ReadingStory {
  id: string;
  lektion: number;
  title: string;
  character: string;
  passage: string[];
  vocabularyHighlights: { word: string; meaning: string }[];
  questions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

export interface WritingExercise {
  id: string;
  lektion: number;
  instruction: string;
  grammarRule: string;
  englishPrompt: string;
  scrambledWords: string[];
  correctSentence: string;
  hint: string;
}

// 1. Hören (Listening Comprehension)
export const SCHRITTE_LISTENING_EXERCISES: ListeningItem[] = [
  {
    id: 'listen_1',
    lektion: 1,
    title: 'Am Empfang der Sprachschule',
    situation: 'Lara kommt zur Sprachschule und stellt sich vor.',
    speakerA: 'Empfangsdame',
    speakerB: 'Lara',
    dialogueLines: [
      { speaker: 'Empfangsdame', text: 'Guten Tag! Wie heißen Sie, bitte?' },
      { speaker: 'Lara', text: 'Guten Tag. Ich heiße Lara Nowak.' },
      { speaker: 'Empfangsdame', text: 'Woher kommen Sie, Frau Nowak?' },
      { speaker: 'Lara', text: 'Ich komme aus Polen, aus Lublin. Jetzt lebe ich in München.' }
    ],
    question: 'Woher kommt Lara Nowak?',
    options: ['Aus Deutschland', 'Aus Polen', 'Aus der Schweiz', 'Aus Kanada'],
    correctIndex: 1,
    explanation: 'Lara sagt deutlich: "Ich komme aus Polen, aus Lublin."'
  },
  {
    id: 'listen_2',
    lektion: 3,
    title: 'Im Supermarkt beim Einkaufen',
    situation: 'Sofia und Lara kaufen Zutaten für Bananenpfannkuchen.',
    speakerA: 'Sofia',
    speakerB: 'Verkäuferin',
    dialogueLines: [
      { speaker: 'Sofia', text: 'Entschuldigung, haben Sie Eier?' },
      { speaker: 'Verkäuferin', text: 'Ja natürlich, hier im Korb. Wie viele brauchen Sie?' },
      { speaker: 'Sofia', text: 'Wir brauchen zehn Eier und ein Kilo Äpfel.' },
      { speaker: 'Verkäuferin', text: 'Das macht zusammen vier Euro fünfzig.' }
    ],
    question: 'Wie viele Eier braucht Sofia?',
    options: ['Zwei Eier', 'Fünf Eier', 'Zehn Eier', 'Keine Eier'],
    correctIndex: 2,
    explanation: 'Sofia sagt: "Wir brauchen zehn Eier und ein Kilo Äpfel."'
  },
  {
    id: 'listen_3',
    lektion: 9,
    title: 'An der Hotelrezeption in Salzburg',
    situation: 'Moritz Burger checkt im Easy Tourist Hotel ein.',
    speakerA: 'Rezeptionist',
    speakerB: 'Moritz',
    dialogueLines: [
      { speaker: 'Moritz', text: 'Guten Tag. Mein Name ist Moritz Burger. Ich habe ein Doppelzimmer reserviert.' },
      { speaker: 'Rezeptionist', text: 'Herzlich willkommen! Ihr Zimmer ist Nummer 234. Hier ist Ihr Schlüssel.' },
      { speaker: 'Moritz', text: 'Vielen Dank. Wann gibt es Frühstück?' },
      { speaker: 'Rezeptionist', text: 'Das Frühstück ist von 7 bis 10 Uhr im Restaurant.' }
    ],
    question: 'Welche Zimmernummer hat Moritz Burger?',
    options: ['Zimmer 100', 'Zimmer 234', 'Zimmer 324', 'Zimmer 243'],
    correctIndex: 1,
    explanation: 'Der Rezeptionist sagt: "Ihr Zimmer ist Nummer 234."'
  },
  {
    id: 'listen_4',
    lektion: 11,
    title: 'Wegbeschreibung am Bahnhof',
    situation: 'Ein Reisender fragt nach dem Weg zum Museum.',
    speakerA: 'Tourist',
    speakerB: 'Passantin',
    dialogueLines: [
      { speaker: 'Tourist', text: 'Entschuldigung, ich suche das Stadtmuseum. Wie komme ich da hin?' },
      { speaker: 'Passantin', text: 'Gehen Sie zuerst geradeaus. An der Ampel biegen Sie rechts ab.' },
      { speaker: 'Tourist', text: 'Rechts an der Ampel, und dann?' },
      { speaker: 'Passantin', text: 'Dann nach 200 Metern links. Das Museum ist neben der Post.' }
    ],
    question: 'Wo liegt das Museum?',
    options: ['Hinter dem Bahnhof', 'Neben der Post', 'Gegenüber vom Kino', 'Auf der Autobahn'],
    correctIndex: 1,
    explanation: 'Die Passantin erklärt: "Das Museum ist neben der Post."'
  }
];

// 2. Sprechen (Speaking & Pronunciation Drills)
export const SCHRITTE_SPEAKING_EXERCISES: SpeakingItem[] = [
  {
    id: 'speak_1',
    lektion: 1,
    title: 'Sich vorstellen',
    situation: 'Introduce yourself in German with your name, origin, and city.',
    targetGerman: 'Guten Tag, ich heiße Maria und ich komme aus Spanien.',
    english: 'Good day, my name is Maria and I come from Spain.',
    hint: 'Pay attention to soft "ch" in "ich" and "ei" diphthong in "heiße".',
    keyPhonemes: 'ich [ɪç], heiße [ˈhaɪsə]'
  },
  {
    id: 'speak_2',
    lektion: 3,
    title: 'Im Restaurant bestellen',
    situation: 'Politely order food in a café or restaurant.',
    targetGerman: 'Ich möchte bitte einen Apfelsaft und einen Kuchen.',
    english: 'I would like an apple juice and a cake, please.',
    hint: 'Remember the masculine Akkusativ: "einen Apfelsaft" and "einen Kuchen".',
    keyPhonemes: 'möchte [ˈmœçtə], einen [ˈaɪnən]'
  },
  {
    id: 'speak_3',
    lektion: 5,
    title: 'Über den Tag sprechen',
    situation: 'Describe your morning wake-up routine.',
    targetGerman: 'Ich stehe jeden Morgen um sieben Uhr auf.',
    english: 'I get up at seven o\'clock every morning.',
    hint: 'Separable verb "aufstehen": "stehe" at position 2, "auf" at the very end.',
    keyPhonemes: 'stehe ... auf [ˈʃteːə ... aʊf]'
  },
  {
    id: 'speak_4',
    lektion: 10,
    title: 'Beim Arzt Befinden äußern',
    situation: 'Explain to the doctor what hurts.',
    targetGerman: 'Mein Kopf tut weh und ich habe seit zwei Tagen Fieber.',
    english: 'My head hurts and I have had a fever for two days.',
    hint: '"wehtun" expression: "Mein Kopf tut weh".',
    keyPhonemes: 'Fieber [ˈfiːbɐ], weh [veː]'
  },
  {
    id: 'speak_5',
    lektion: 12,
    title: 'Höfliche Bitte formulieren',
    situation: 'Ask politely with Konjunktiv II for assistance.',
    targetGerman: 'Könnten Sie mir bitte helfen?',
    english: 'Could you please help me?',
    hint: 'Polite request with "Könnten Sie ... helfen?"',
    keyPhonemes: 'Könnten [ˈkœntn̩]'
  }
];

// 3. Lesen (Reading Comprehension & Photo Stories)
export const SCHRITTE_READING_STORIES: ReadingStory[] = [
  {
    id: 'read_1',
    lektion: 2,
    title: 'Laras Familie in München und Poznań',
    character: 'Lara Nowak',
    passage: [
      'Lara Nowak ist zwanzig Jahre alt und kommt aus Polen. Im Moment lebt sie in München und lernt Deutsch.',
      'In München wohnt sie bei Sofia und der kleinen Lili. Sofia ist Physiotherapeutin von Beruf.',
      'Laras Eltern leben nicht zusammen, sie sind geschieden. Ihr Vater lebt in Poznań und arbeitet als Ingenieur.',
      'Am Wochenende telefoniert Lara oft mit ihrer Familie und kocht polnische Spezialitäten.'
    ],
    vocabularyHighlights: [
      { word: 'geschieden', meaning: 'divorced' },
      { word: 'Physiotherapeutin', meaning: 'female physical therapist' },
      { word: 'wohnt bei', meaning: 'lives at / stays with' }
    ],
    questions: [
      {
        question: 'Wo arbeitet Laras Vater?',
        options: ['In München als Arzt', 'In Poznań als Ingenieur', 'In Berlin als Lehrer', 'In Warschau'],
        correctIndex: 1,
        explanation: 'Im Text steht: "Ihr Vater lebt in Poznań und arbeitet als Ingenieur."'
      },
      {
        question: 'Bei wem wohnt Lara in München?',
        options: ['Bei ihrem Vater', 'Bei Tim', 'Bei Sofia und Lili', 'Allein im Hotel'],
        correctIndex: 2,
        explanation: 'Lara wohnt bei Sofia und der kleinen Lili.'
      }
    ]
  },
  {
    id: 'read_2',
    lektion: 6,
    title: 'Folge 6: Der Käsemann und der Ausflug',
    character: 'Familie Baumann & Lara',
    passage: [
      'Heute ist Sonntag. Das Wetter ist nicht so schön, aber Familie Baumann und Lara machen trotzdem einen Ausflug in die Berge.',
      'Sofia vergisst die gelbe Dose mit dem Käsebrot. Doch Tim bringt die Mundharmonika und eine Dose mit Würstchen mit.',
      'Walter spielt Gitarre und singt mit Lili. Alle finden: Der Ausflug ist wirklich interessant und macht viel Spaß!'
    ],
    vocabularyHighlights: [
      { word: 'der Ausflug', meaning: 'day trip / excursion' },
      { word: 'die Mundharmonika', meaning: 'harmonica' },
      { word: 'trotzdem', meaning: 'nevertheless / anyway' }
    ],
    questions: [
      {
        question: 'Was vergisst Sofia zu Hause?',
        options: ['Die Gitarre', 'Die gelbe Dose mit Käsebrot', 'Die Wanderschuhe', 'Die Kamera'],
        correctIndex: 1,
        explanation: 'Sofia vergisst die gelbe Dose mit dem Käsebrot.'
      },
      {
        question: 'Welches Musikinstrument spielt Walter?',
        options: ['Klavier', 'Gitarre', 'Flöte', 'Schlagzeug'],
        correctIndex: 1,
        explanation: 'Walter spielt Gitarre auf der Picknickdecke.'
      }
    ]
  }
];

// 4. Schreiben (Writing & Sentence Word Order Assembler)
export const SCHRITTE_WRITING_EXERCISES: WritingExercise[] = [
  {
    id: 'write_1',
    lektion: 1,
    instruction: 'Arrange the word blocks to form a correct German declarative sentence (Verb at Position 2).',
    grammarRule: 'Position 2 Rule: In main clauses, the conjugated verb is always in the 2nd position.',
    englishPrompt: 'I come from Germany and live in Munich.',
    scrambledWords: ['aus', 'Deutschland', 'Ich', 'komme', 'wohne', 'in', 'München.', 'und'],
    correctSentence: 'Ich komme aus Deutschland und wohne in München.',
    hint: 'Start with Subject "Ich", followed by verb "komme".'
  },
  {
    id: 'write_2',
    lektion: 5,
    instruction: 'Build a sentence with a temporal expression at the start (inversion rule).',
    grammarRule: 'Inversion: When a time expression starts the sentence, the verb remains at Position 2 followed by the subject.',
    englishPrompt: 'In the morning Robert listens to music.',
    scrambledWords: ['hört', 'Musik.', 'Morgen', 'Robert', 'Am'],
    correctSentence: 'Am Morgen hört Robert Musik.',
    hint: 'Am Morgen (Pos 1) -> hört (Pos 2) -> Robert (Subject).'
  },
  {
    id: 'write_3',
    lektion: 5,
    instruction: 'Construct a sentence with the separable verb "aufräumen" (Satzklammer).',
    grammarRule: 'Separable Verb Bracket: Conjugated stem at Position 2, prefix at the very end of the sentence.',
    englishPrompt: 'Lara cleans up the kitchen in the morning.',
    scrambledWords: ['die', 'Lara', 'Küche', 'räumt', 'auf.', 'am', 'Morgen'],
    correctSentence: 'Lara räumt am Morgen die Küche auf.',
    hint: 'Prefix "auf." must be the last element.'
  },
  {
    id: 'write_4',
    lektion: 7,
    instruction: 'Form a sentence with the modal verb "können" and an infinitive.',
    grammarRule: 'Modal Verb Bracket: Modal verb at Position 2, main infinitive at the end.',
    englishPrompt: 'Walter can play the guitar really well.',
    scrambledWords: ['spielen.', 'Gitarre', 'kann', 'gut', 'Walter', 'wirklich'],
    correctSentence: 'Walter kann wirklich gut Gitarre spielen.',
    hint: 'Infinitive "spielen." goes to the end.'
  },
  {
    id: 'write_5',
    lektion: 12,
    instruction: 'Form a polite request using Konjunktiv II.',
    grammarRule: 'Polite Request: "Könnten Sie" or "Würden Sie" + infinitive at the end.',
    englishPrompt: 'Could you please explain that to me?',
    scrambledWords: ['erklären?', 'mir', 'bitte', 'Sie', 'Könnten', 'das'],
    correctSentence: 'Könnten Sie mir das bitte erklären?',
    hint: 'Könnten Sie (Pos 1-2) ... erklären? (End).'
  }
];
