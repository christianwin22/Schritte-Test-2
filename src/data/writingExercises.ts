/**
 * Writing: two exercises, answered by typing or speaking.
 *
 * - Translate: an English sentence, written in German. Every accepted German
 *   version is listed; the check ignores capitals, punctuation and extra spaces,
 *   and nothing else (umlauts and word order count).
 * - Answer: a question in German, answered in German. A free answer cannot be
 *   marked right or wrong by the app, so it shows an example answer to compare.
 *
 * All sentences are original, written for A1 — none are copied from the book.
 */

export interface TranslateItem {
  id: string;
  english: string;
  german: string[]; // first one is shown as the answer
}

export interface QuestionItem {
  id: string;
  question: string;
  english: string;
  example: string;
}

export const TRANSLATE_ITEMS: TranslateItem[] = [
  { id: 't1', english: 'My name is Anna.', german: ['Mein Name ist Anna.', 'Ich heiße Anna.'] },
  { id: 't2', english: 'I come from Italy.', german: ['Ich komme aus Italien.'] },
  { id: 't3', english: 'I live in Berlin.', german: ['Ich wohne in Berlin.', 'Ich lebe in Berlin.'] },
  { id: 't4', english: 'How are you?', german: ['Wie geht es dir?', 'Wie geht es Ihnen?', "Wie geht's?"] },
  { id: 't5', english: 'I am fine, thank you.', german: ['Mir geht es gut, danke.', 'Es geht mir gut, danke.', 'Gut, danke.'] },
  { id: 't6', english: 'I speak a little German.', german: ['Ich spreche ein bisschen Deutsch.', 'Ich spreche ein wenig Deutsch.'] },
  { id: 't7', english: 'Where do you live?', german: ['Wo wohnst du?', 'Wo wohnen Sie?'] },
  { id: 't8', english: 'I am 30 years old.', german: ['Ich bin 30 Jahre alt.', 'Ich bin dreißig Jahre alt.'] },
  { id: 't9', english: 'I have two children.', german: ['Ich habe zwei Kinder.'] },
  { id: 't10', english: 'My brother is a teacher.', german: ['Mein Bruder ist Lehrer.'] },
  { id: 't11', english: 'The coffee is very good.', german: ['Der Kaffee ist sehr gut.'] },
  { id: 't12', english: 'I would like a tea, please.', german: ['Ich möchte einen Tee, bitte.', 'Ich hätte gern einen Tee, bitte.', 'Einen Tee, bitte.'] },
  { id: 't13', english: 'How much does the bread cost?', german: ['Wie viel kostet das Brot?', 'Was kostet das Brot?'] },
  { id: 't14', english: 'We need milk and eggs.', german: ['Wir brauchen Milch und Eier.'] },
  { id: 't15', english: 'The apartment is small but nice.', german: ['Die Wohnung ist klein, aber schön.', 'Die Wohnung ist klein aber schön.', 'Die Wohnung ist klein, aber nett.'] },
  { id: 't16', english: 'Where is the station?', german: ['Wo ist der Bahnhof?'] },
  { id: 't17', english: 'The train leaves at eight.', german: ['Der Zug fährt um acht.', 'Der Zug fährt um acht Uhr ab.', 'Der Zug fährt um acht ab.', 'Der Zug fährt um acht Uhr.'] },
  { id: 't18', english: 'I get up at seven.', german: ['Ich stehe um sieben auf.', 'Ich stehe um sieben Uhr auf.'] },
  { id: 't19', english: 'On Monday I work.', german: ['Am Montag arbeite ich.'] },
  { id: 't20', english: 'I do not have time today.', german: ['Ich habe heute keine Zeit.', 'Heute habe ich keine Zeit.'] },
  { id: 't21', english: 'Do you have a pen?', german: ['Hast du einen Stift?', 'Haben Sie einen Stift?', 'Hast du einen Kugelschreiber?', 'Haben Sie einen Kugelschreiber?'] },
  { id: 't22', english: 'I like to play football.', german: ['Ich spiele gern Fußball.', 'Ich spiele gerne Fußball.'] },
  { id: 't23', english: 'The weather is nice today.', german: ['Das Wetter ist heute schön.', 'Heute ist das Wetter schön.'] },
  { id: 't24', english: 'I can not come tomorrow.', german: ['Ich kann morgen nicht kommen.', 'Morgen kann ich nicht kommen.'] },
  { id: 't25', english: 'We are going to the cinema.', german: ['Wir gehen ins Kino.'] },
  { id: 't26', english: 'My head hurts.', german: ['Mein Kopf tut weh.', 'Ich habe Kopfschmerzen.'] },
  { id: 't27', english: 'The doctor is not here.', german: ['Der Arzt ist nicht hier.', 'Die Ärztin ist nicht hier.', 'Der Arzt ist nicht da.', 'Die Ärztin ist nicht da.'] },
  { id: 't28', english: 'I am looking for a flat.', german: ['Ich suche eine Wohnung.'] },
  { id: 't29', english: 'The shop opens at nine.', german: ['Das Geschäft öffnet um neun.', 'Das Geschäft öffnet um neun Uhr.', 'Der Laden öffnet um neun.', 'Der Laden öffnet um neun Uhr.'] },
  { id: 't30', english: 'Thank you very much!', german: ['Vielen Dank!', 'Danke schön!', 'Danke sehr!'] },
];

export const QUESTION_ITEMS: QuestionItem[] = [
  { id: 'q1', question: 'Wie heißen Sie?', english: 'What is your name?', example: 'Ich heiße Maria.' },
  { id: 'q2', question: 'Woher kommen Sie?', english: 'Where are you from?', example: 'Ich komme aus Spanien.' },
  { id: 'q3', question: 'Wo wohnen Sie?', english: 'Where do you live?', example: 'Ich wohne in München.' },
  { id: 'q4', question: 'Wie alt sind Sie?', english: 'How old are you?', example: 'Ich bin 28 Jahre alt.' },
  { id: 'q5', question: 'Welche Sprachen sprechen Sie?', english: 'Which languages do you speak?', example: 'Ich spreche Englisch und ein bisschen Deutsch.' },
  { id: 'q6', question: 'Was sind Sie von Beruf?', english: 'What is your job?', example: 'Ich bin Krankenpfleger.' },
  { id: 'q7', question: 'Haben Sie Kinder?', english: 'Do you have children?', example: 'Ja, ich habe eine Tochter.' },
  { id: 'q8', question: 'Wie ist Ihre Telefonnummer?', english: 'What is your phone number?', example: 'Meine Nummer ist 0176 1234567.' },
  { id: 'q9', question: 'Was trinken Sie gern?', english: 'What do you like to drink?', example: 'Ich trinke gern Tee.' },
  { id: 'q10', question: 'Was essen Sie zum Frühstück?', english: 'What do you eat for breakfast?', example: 'Ich esse Brot mit Käse.' },
  { id: 'q11', question: 'Was kaufen Sie im Supermarkt?', english: 'What do you buy at the supermarket?', example: 'Ich kaufe Obst, Milch und Brot.' },
  { id: 'q12', question: 'Wie ist Ihre Wohnung?', english: 'What is your flat like?', example: 'Meine Wohnung ist klein, aber hell.' },
  { id: 'q13', question: 'Wann stehen Sie auf?', english: 'When do you get up?', example: 'Ich stehe um sechs Uhr auf.' },
  { id: 'q14', question: 'Was machen Sie am Wochenende?', english: 'What do you do at the weekend?', example: 'Am Wochenende treffe ich Freunde.' },
  { id: 'q15', question: 'Was ist Ihr Hobby?', english: 'What is your hobby?', example: 'Mein Hobby ist Lesen.' },
  { id: 'q16', question: 'Wie kommen Sie zur Arbeit?', english: 'How do you get to work?', example: 'Ich fahre mit dem Bus.' },
  { id: 'q17', question: 'Wie spät ist es?', english: 'What time is it?', example: 'Es ist halb neun.' },
  { id: 'q18', question: 'Welcher Tag ist heute?', english: 'What day is it today?', example: 'Heute ist Dienstag.' },
  { id: 'q19', question: 'Wie ist das Wetter heute?', english: 'What is the weather like today?', example: 'Es ist sonnig und warm.' },
  { id: 'q20', question: 'Was möchten Sie trinken?', english: 'What would you like to drink?', example: 'Ich möchte ein Wasser, bitte.' },
  { id: 'q21', question: 'Wo ist hier die Toilette?', english: 'Where is the toilet here?', example: 'Die Toilette ist dort links.' },
  { id: 'q22', question: 'Was tut Ihnen weh?', english: 'What hurts?', example: 'Mein Bauch tut weh.' },
  { id: 'q23', question: 'Wann haben Sie Geburtstag?', english: 'When is your birthday?', example: 'Ich habe im Mai Geburtstag.' },
  { id: 'q24', question: 'Was haben Sie gestern gemacht?', english: 'What did you do yesterday?', example: 'Ich habe gestern gearbeitet.' },
  { id: 'q25', question: 'Warum lernen Sie Deutsch?', english: 'Why are you learning German?', example: 'Ich lerne Deutsch, weil ich in Deutschland arbeite.' },
];

/** Capitals, punctuation and spacing do not count; everything else does. */
export function normaliseSentence(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:"„“”‚‘'’«»()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isTranslationCorrect(answer: string, item: TranslateItem): boolean {
  const given = normaliseSentence(answer);
  return item.german.some((g) => normaliseSentence(g) === given);
}
