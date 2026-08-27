import { CEFRLevel } from '../types';

export interface LektionInfo {
  number: number;
  level: CEFRLevel;
  book: 'A1.1' | 'A1.2' | 'A2.1' | 'A2.2' | 'B1.1' | 'B1.2';
  title: string;
  subtitle: string;
  theme: string;
  icon: string;
  grammarFocus: string[];
  keyVerbs: string[];
}

export const SCHRITTE_LEKTIONEN: LektionInfo[] = [
  // ==========================================
  // --- Schritte international Neu A1 (1-14) ---
  // ==========================================
  {
    number: 1,
    level: 'A1',
    book: 'A1.1',
    title: 'Guten Tag. Mein Name ist ...',
    subtitle: 'Folge 1: Das bin ich.',
    theme: 'Begrüßung, Alphabet, Herkunft, Sprachen, Buchstabieren',
    icon: '👋',
    grammarFocus: [
      'Aussage & W-Frage (Position 2)',
      'Personalpronomen: ich, du, Sie',
      'Verbkonjugation: heißen, kommen, sprechen, sein',
      'Präposition: aus'
    ],
    keyVerbs: ['heißen', 'kommen', 'sprechen', 'sein', 'wohnen']
  },
  {
    number: 2,
    level: 'A1',
    book: 'A1.1',
    title: 'Meine Familie',
    subtitle: 'Folge 2: Pause ist super.',
    theme: 'Familie, Zahlen 0-20, Personalien, Wohnort',
    icon: '👨‍👩‍👧',
    grammarFocus: [
      'Possessivartikel: mein/e, dein/e, Ihr/e',
      'Personalpronomen: er, es, sie (Sg./Pl.), wir, ihr',
      'Verbkonjugation: leben, haben, sein',
      'Präposition: in'
    ],
    keyVerbs: ['leben', 'haben', 'sein', 'lernen', 'arbeiten']
  },
  {
    number: 3,
    level: 'A1',
    book: 'A1.1',
    title: 'Essen und Trinken',
    subtitle: 'Folge 3: Bananenpfannkuchen',
    theme: 'Lebensmittel, Mengen, Preise, Einkaufen, Rezepte',
    icon: '🍎',
    grammarFocus: [
      'Indefiniter Artikel (ein/eine/ein)',
      'Negativartikel (kein/keine/kein)',
      'Plural der Nomen (-/¨, -(e)n, -e/¨e, -er/¨er, -s)',
      'Ja-/Nein-Frage, Verbkonjugation: essen, möchten, brauchen'
    ],
    keyVerbs: ['essen', 'trinken', 'brauchen', 'kaufen', 'möchten', 'kosten']
  },
  {
    number: 4,
    level: 'A1',
    book: 'A1.1',
    title: 'Meine Wohnung',
    subtitle: 'Folge 4: Ach so!',
    theme: 'Zimmer, Möbel, Elektrogeräte, Farben, Wohnungsanzeigen',
    icon: '🏠',
    grammarFocus: [
      'Definiter Artikel: der, das, die',
      'Personalpronomen: er, es, sie als Nomen-Ersatz',
      'Negation: nicht vs. kein',
      'Wortbildung: Komposita (der Schrank -> der Kühlschrank)'
    ],
    keyVerbs: ['wohnen', 'gefallen', 'finden', 'kosten', 'suchen', 'vermieten']
  },
  {
    number: 5,
    level: 'A1',
    book: 'A1.1',
    title: 'Mein Tag',
    subtitle: 'Folge 5: Von früh bis spät',
    theme: 'Uhrzeit, Tagesablauf, Wochentage, Termine',
    icon: '⏰',
    grammarFocus: [
      'Trennbare Verben im Satz (Satzklammer)',
      'Temporale Präpositionen: am, um, von ... bis',
      'Verbkonjugation: fernsehen, arbeiten, anfangen, schlafen',
      'Verbposition im Hauptsatz (Position 2 bei Zeitangabe)'
    ],
    keyVerbs: ['aufstehen', 'aufräumen', 'einkaufen', 'anrufen', 'fernsehen', 'frühstücken', 'anfangen', 'schlafen']
  },
  {
    number: 6,
    level: 'A1',
    book: 'A1.1',
    title: 'Freizeit',
    subtitle: 'Folge 6: Der Käsemann',
    theme: 'Wetter, Himmelsrichtungen, Hobbys, Picknick',
    icon: '🚴',
    grammarFocus: [
      'Akkusativ (den Salat, ein/keinen Käse, das, die)',
      'Ja- / Nein- / Doch-Antworten',
      'Verbkonjugation: nehmen, lesen, treffen, fahren, mögen',
      'Vokalwechsel (e -> i/ie, a -> ä)'
    ],
    keyVerbs: ['nehmen', 'lesen', 'treffen', 'fahren', 'wandern', 'schwimmen', 'spielen', 'grillen']
  },
  {
    number: 7,
    level: 'A1',
    book: 'A1.1',
    title: 'Lernen – ein Leben lang',
    subtitle: 'Folge 7: Fernunterricht',
    theme: 'Fähigkeiten, Wünsche, Sprachlerntipps, Vergangenes',
    icon: '🎓',
    grammarFocus: [
      'Modalverben: können & wollen (Satzklammer)',
      'Perfekt mit haben (ge...t / ge...en)',
      'Perfekt mit sein (Bewegung: gehen, fahren, kommen)',
      'Perfekt im Satz (Hilfsverb Pos. 2 + Partizip II am Ende)'
    ],
    keyVerbs: ['können', 'wollen', 'lernen', 'üben', 'machen', 'gehen', 'fahren', 'kommen', 'schreiben', 'finden']
  },
  {
    number: 8,
    level: 'A1',
    book: 'A1.2',
    title: 'Beruf und Arbeit',
    subtitle: 'Folge 8: Total fotogen',
    theme: 'Berufe m/w (-in), Lebenslauf, Bewerbung, Praktikum',
    icon: '💼',
    grammarFocus: [
      'Wortbildung Nomen: der Arzt -> die Ärztin',
      'Lokale Präposition: bei + Dativ / modale Präposition: als',
      'Temporale Präpositionen: vor, seit + Dativ, für + Akkusativ',
      'Präteritum von sein und haben (war, hatte)'
    ],
    keyVerbs: ['arbeiten', 'studieren', 'dauern', 'verdienen', 'bewerben', 'sein', 'haben']
  },
  {
    number: 9,
    level: 'A1',
    book: 'A1.2',
    title: 'Unterwegs',
    subtitle: 'Folge 9: Na los, komm mit!',
    theme: 'Reisen, Verkehrsmittel, Regeln, Anweisungen, Hotel',
    icon: '🧳',
    grammarFocus: [
      'Modalverben: müssen & dürfen',
      'Pronomen man',
      'Imperativ: du (Komm!), ihr (Hört!), Sie (Warten Sie!)',
      'Verbkonjugation: helfen'
    ],
    keyVerbs: ['müssen', 'dürfen', 'mitbringen', 'ausfüllen', 'helfen', 'warten', 'zeigen']
  },
  {
    number: 10,
    level: 'A1',
    book: 'A1.2',
    title: 'Gesundheit und Krankheit',
    subtitle: 'Folge 10: Unsere Augen sind so blau.',
    theme: 'Körperteile, Krankheiten, Arztbesuch, Ratschläge, Notfall',
    icon: '🩺',
    grammarFocus: [
      'Possessivartikel: sein/ihr/unser/euer/ihr/Ihr',
      'Modalverb: sollen (Ratschläge & ärztliche Anweisungen)',
      'Modalverb im Satz (Satzklammer: soll ... nehmen)'
    ],
    keyVerbs: ['sollen', 'wehtun', 'fehlen', 'bleiben', 'einnehmen', 'untersuchen', 'verschreiben']
  },
  {
    number: 11,
    level: 'A1',
    book: 'A1.2',
    title: 'In der Stadt unterwegs',
    subtitle: 'Folge 11: Alles im grünen Bereich',
    theme: 'Orte in der Stadt, Wegbeschreibung, Verkehrsmittel, Bahnhof',
    icon: '🚉',
    grammarFocus: [
      'Modale Präposition: mit + Dativ (dem Bus, der Bahn)',
      'Lokale Wechselpräpositionen mit Dativ (Wo? an, auf, in, vor, hinter)',
      'Lokale Präpositionen Wohin? (zu + Dativ, nach + Stadt, in + Akk.)'
    ],
    keyVerbs: ['abfahren', 'ankommen', 'umsteigen', 'einsteigen', 'aussteigen', 'finden', 'abholen']
  },
  {
    number: 12,
    level: 'A1',
    book: 'A1.2',
    title: 'Kundenservice',
    subtitle: 'Folge 12: Super Service!',
    theme: 'Dienstleistungen, Reparaturen, Reklamation, Telefongespräche',
    icon: '🔧',
    grammarFocus: [
      'Temporale Präpositionen: vor, nach, bei, in + Dativ (Wann?)',
      'Temporale Präpositionen: bis, ab (Wie lange? Ab wann?)',
      'Höfliche Bitte: Konjunktiv II (Könnten / Würden Sie bitte ...?)',
      'Verben mit Präfixen: an-, aus-, auf-, zumachen'
    ],
    keyVerbs: ['könnten', 'würden', 'reparieren', 'funktionieren', 'aufmachen', 'zumachen', 'anmachen', 'ausmachen']
  },
  {
    number: 13,
    level: 'A1',
    book: 'A1.2',
    title: 'Neue Kleider',
    subtitle: 'Folge 13: Ist das kalt heute!',
    theme: 'Kleidung, Farben, Kaufhaus, Größen, Mode',
    icon: '👗',
    grammarFocus: [
      'Demonstrativpronomen: der/das/die/dieser/dieses/diese',
      'Frageartikel: welcher/welches/welche',
      'Personalpronomen im Dativ: mir, dir, ihm, ihr, uns, euch, ihnen, Ihnen',
      'Verben mit Dativ: gefallen, gehören, passen, stehen, schmecken',
      'Komparation: gern/lieber/am liebsten, gut/besser/am besten'
    ],
    keyVerbs: ['mögen', 'gefallen', 'passen', 'stehen', 'gehören', 'tragen', 'anprobieren', 'anziehen']
  },
  {
    number: 14,
    level: 'A1',
    book: 'A1.2',
    title: 'Feste und Feiertage',
    subtitle: 'Folge 14: Ende gut, alles gut',
    theme: 'Feste, Glückwünsche, Datum, Kalender, Einladungen',
    icon: '🎉',
    grammarFocus: [
      'Ordinalzahlen & Datum (am ersten Januar ...)',
      'Personalpronomen im Akkusativ: mich, dich, ihn, sie, es, uns, euch',
      'Konjunktion: denn (Satzverbindung mit Hauptsatz-Wortstellung)',
      'Verbkonjugation: werden'
    ],
    keyVerbs: ['werden', 'feiern', 'einladen', 'gratulieren', 'wünschen', 'schenken', 'organisieren']
  },

  // ==========================================
  // --- Schritte international Neu A2 (1-14) ---
  // ==========================================
  {
    number: 1,
    level: 'A2',
    book: 'A2.1',
    title: 'Kennenzulernen & Kontakte',
    subtitle: 'A2 Lektion 1: Neue Nachbarn & Freunde',
    theme: 'Kontakte knüpfen, Biografie, Vergangenes berichten',
    icon: '🤝',
    grammarFocus: [
      'Perfekt unregelmäßiger Verben & gemischte Formen',
      'Präteritum von Modalverben (konnte, musste, wollte)',
      'Nebensätze mit "weil" (Kausalsatz, Verb am Ende)'
    ],
    keyVerbs: ['kennenlernen', 'erzählen', 'erinnern', 'treffen', 'verbringen']
  },
  {
    number: 2,
    level: 'A2',
    book: 'A2.1',
    title: 'Zu Hause in der Welt',
    subtitle: 'A2 Lektion 2: Wohnen & Einrichten',
    theme: 'Wohnungssuche, Mietvertrag, Möbel platzieren',
    icon: '🏡',
    grammarFocus: [
      'Wechselpräpositionen: Dativ (Wo?) vs. Akkusativ (Wohin?)',
      'Verben: stellen/stehen, legen/liegen, hängen/hängen',
      'Adjektivdeklination nach unbestimmtem Artikel'
    ],
    keyVerbs: ['stellen', 'stehen', 'legen', 'liegen', 'hängen', 'einrichten']
  },
  {
    number: 3,
    level: 'A2',
    book: 'A2.1',
    title: 'Guten Appetit!',
    subtitle: 'A2 Lektion 3: Ernährung & Restaurant',
    theme: 'Restaurantbesuch, Vorlieben, Lebensmittelqualität',
    icon: '🍽️',
    grammarFocus: [
      'Adjektivdeklination nach bestimmtem Artikel (der/die/das)',
      'Indefinitpronomen (jemand, niemand, etwas, nichts)',
      'Verben mit Präpositionalergänzung (bitten um, sich freuen auf)'
    ],
    keyVerbs: ['bestellen', 'schmecken', 'empfehlen', 'bezahlen', 'genießen']
  },
  {
    number: 4,
    level: 'A2',
    book: 'A2.1',
    title: 'Arbeitswelt & Beruf',
    subtitle: 'A2 Lektion 4: Büroalltag & Karriere',
    theme: 'Stellenanzeigen, Vorstellungsgespräch, Arbeitszeiten',
    icon: '💻',
    grammarFocus: [
      'Nebensätze mit "dass" (Objektsatz)',
      'Indirekte Fragesätze (ob, wie, wo, wann)',
      'Genitiv (des Chefs, der Firma) & Präposition "trotz"'
    ],
    keyVerbs: ['bewerben', 'kündigen', 'vereinbaren', 'übernehmen', 'leiten']
  },
  {
    number: 5,
    level: 'A2',
    book: 'A2.1',
    title: 'Sport und Gesundheit',
    subtitle: 'A2 Lektion 5: Fitness & Wohlbefinden',
    theme: 'Sportarten, Bewegung, Ernährung, Unfallmeldung',
    icon: '🏃',
    grammarFocus: [
      'Reflexive Verben mit Akkusativ & Dativ (sich bewegen, sich verletzen)',
      'Nebensätze mit "wenn" (Konditionalsatz / Temporalsatz)',
      'Komparativ und Superlativ von Adjektiven'
    ],
    keyVerbs: ['bewegen', 'verletzen', 'erholen', 'ausruhen', 'trainieren']
  },
  {
    number: 6,
    level: 'A2',
    book: 'A2.1',
    title: 'Unterwegs in der Natur',
    subtitle: 'A2 Lektion 6: Ausflüge & Landschaften',
    theme: 'Reiseziele, Umwelt, Wetterphänomene, Wandern',
    icon: '🌲',
    grammarFocus: [
      'Lokale Präpositionen (an, auf, in, nach, zu, durch, um)',
      'Relativsätze im Nominativ und Akkusativ',
      'Präpositionen mit Genitiv (während, wegen)'
    ],
    keyVerbs: ['wandern', 'entdecken', 'schützen', 'übernachten', 'erleben']
  },
  {
    number: 7,
    level: 'A2',
    book: 'A2.2',
    title: 'Medien & Kommunikation',
    subtitle: 'A2 Lektion 7: Digitale Welt & Nachrichten',
    theme: 'Internet, soziale Medien, Technik, Zeitung',
    icon: '📱',
    grammarFocus: [
      'Passiv Präsens (werden + Partizip II)',
      'Infinitiv mit "zu" (Ich habe vor, zu lernen)',
      'Adjektivdeklination ohne Artikel (Nullartikel)'
    ],
    keyVerbs: ['nutzen', 'speichern', 'veröffentlichen', 'recherchieren', 'vernetzen']
  },

  // ==========================================
  // --- Schritte international Neu B1 (1-7+) ---
  // ==========================================
  {
    number: 1,
    level: 'B1',
    book: 'B1.1',
    title: 'Zeit und Lebenswege',
    subtitle: 'B1 Lektion 1: Stationen des Lebens',
    theme: 'Lebenslauf, Zeitmanagement, Entscheidungen & Meilensteine',
    icon: '⏳',
    grammarFocus: [
      'Plusquamperfekt (hatte/war + Partizip II)',
      'Temporale Nebensätze: nachdem, während, bevor',
      'N-Deklination der maskulinen Nomen (der Kollege -> den Kollegen)'
    ],
    keyVerbs: ['entscheiden', 'verändern', 'erreichen', 'zurückblicken', 'planen']
  },
  {
    number: 2,
    level: 'B1',
    book: 'B1.1',
    title: 'Gesellschaft & Zusammenleben',
    subtitle: 'B1 Lektion 2: Engagement & Gemeinschaft',
    theme: 'Freiwilligenarbeit, Umweltprojekte, Nachbarschaftshilfe',
    icon: '🌍',
    grammarFocus: [
      'Konjunktiv II der Gegenwart (hätte, wäre, würde + Infinitiv)',
      'Wünsche, irreale Bedingungen (Wenn ich Zeit hätte, ...)',
      'Präpositionaladverbien (darauf, worüber, wofür)'
    ],
    keyVerbs: ['engagieren', 'unterstützen', 'beitragen', 'mitwirken', 'gestalten']
  },
  {
    number: 3,
    level: 'B1',
    book: 'B1.1',
    title: 'Wirtschaft & Finanzen',
    subtitle: 'B1 Lektion 3: Konsum, Sparen & Banken',
    theme: 'Geldanlage, Kontoeröffnung, Verbraucherschutz',
    icon: '💳',
    grammarFocus: [
      'Passiv Präteritum & Perfekt (wurde repariert / ist repariert worden)',
      'Zweiteilige Konnektoren (sowohl ... als auch, weder ... noch)',
      'Relativsätze mit Präpositionen (das Haus, in dem ...)'
    ],
    keyVerbs: ['überweisen', 'sparen', 'investieren', 'beantragen', 'abschließen']
  },
  {
    number: 4,
    level: 'B1',
    book: 'B1.1',
    title: 'Kultur, Kunst & Musik',
    subtitle: 'B1 Lektion 4: Theater, Kino & Literatur',
    theme: 'Kritiken, Kulturveranstaltungen, Festivals',
    icon: '🎭',
    grammarFocus: [
      'Partizip I & II als Adjektive (das lachende Kind, das gelesene Buch)',
      'Finalsätze: um ... zu + Infinitiv vs. damit',
      'Konzessivsätze mit "obwohl" und "trotzdem"'
    ],
    keyVerbs: ['aufführen', 'begeistern', 'kritisieren', 'darstellen', 'schaffen']
  },
  {
    number: 5,
    level: 'B1',
    book: 'B1.2',
    title: 'Zukunft & Innovation',
    subtitle: 'B1 Lektion 5: Wissenschaft & Visionen',
    theme: 'Technischer Fortschritt, KI, Mobilität der Zukunft',
    icon: '🚀',
    grammarFocus: [
      'Futur I (werden + Infinitiv) für Vorhersagen & Pläne',
      'Modalitätsverben (scheinen zu, brauchen nicht zu)',
      'Konditionalsätze mit "falls" und "sofern"'
    ],
    keyVerbs: ['erfinden', 'entwickeln', 'prognostizieren', 'verändern', 'revolutionieren']
  }
];
