#!/usr/bin/env python3
"""
Lesson 9 (A1.2) uses the book's own example sentences (Chris, 2026-10-07).

    python3 scripts/lesson9BookSentences.py           # show what would change
    python3 scripts/lesson9BookSentences.py --write   # rewrite the .md (a backup is kept)

The sentences are the right-hand column of the Lernwortschatz, LWS 31–37
(A1.2 PDF pages 179–185), read off the page; words split over two lines are
joined again. As the App rules say, a book sentence goes in `Example sentence`,
`App example` becomes "-", and its English goes in `App example English`.
Words the book gives no sentence (the "Auf dem Amt" phrases) keep theirs.

Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
SECTION = "## A1.2 · Lesson 9 "

BOOK = {
    "mitkommen": ("Na los, kommt mit!", "Come on, come along!"),
    "der Führerschein": ("Haben Sie einen Führerschein?", "Do you have a driving licence?"),
    "das Ticket": ("Sie wollen ein Busticket kaufen.", "They want to buy a bus ticket."),
    "das Amt": ("Sie sind auf einem Amt.", "They are at a public office."),
    "gültig": ("Ist der Führerschein gültig?", "Is the driving licence valid?"),
    "mieten": ("Sie wollen ein Auto mieten.", "They want to rent a car."),
    "ausländisch": ("Mit einem ausländischen Führerschein kann man nur acht Monate in Deutschland fahren.", "With a foreign driving licence you can only drive in Germany for eight months."),
    "europäisch": ("Lara kommt aus der Europäischen Union.", "Lara comes from the European Union."),
    "die Europäische Union (EU)": ("Lara kommt aus der EU.", "Lara comes from the EU."),
    "jung": ("Sie ist zu jung.", "She is too young."),
    "die Fahrkarte": ("Sie kaufen Fahrkarten im ZOB.", "They buy tickets at the central bus station."),
    "die Fahrt": ("Die Fahrt dauert nur zwei Stunden.", "The ride only takes two hours."),
    "der Antrag": ("Tim muss einen Antrag ausfüllen.", "Tim has to fill in an application form."),
    "müssen": ("Sie müssen einen Antrag ausfüllen.", "You have to fill in an application form."),
    "ausfüllen": ("Tim muss einen Antrag ausfüllen.", "Tim has to fill in an application form."),
    "der Ausweis": ("Er muss den Ausweis mitbringen.", "He has to bring his ID card."),
    "mitbringen": ("Er muss den Ausweis mitbringen.", "He has to bring his ID card."),
    "der Pass": ("Man muss einen Reisepass mitbringen.", "You have to bring a passport."),
    "die Kreditkarte": ("Man muss eine Kreditkarte haben.", "You have to have a credit card."),
    "verstehen": ("Der Mann versteht den Automaten nicht.", "The man doesn't understand the machine."),
    "der Automat": ("Der Mann versteht den Automaten nicht.", "The man doesn't understand the machine."),
    "auswählen": ("Sie müssen „Erwachsener“ oder „Kind“ auswählen.", "You have to choose “adult” or “child”."),
    "das Ziel": ("Sie müssen das Ziel wählen.", "You have to select the destination."),
    "wählen": ("Sie müssen das Ziel wählen.", "You have to select the destination."),
    "man": ("Man muss das Ziel wählen.", "You have to select the destination."),
    "zuerst": ("Zuerst müssen Sie das Ziel wählen.", "First you have to select the destination."),
    "danach": ("Und danach müssen Sie bezahlen.", "And after that you have to pay."),
    "dann": ("Und dann muss ich noch einkaufen.", "And then I still have to do some shopping."),
    "der Schluss": ("Zum Schluss müssen Sie die Fahrkarte stempeln.", "At the end you have to stamp the ticket."),
    "vorne": ("Da vorne ist eine Autovermietung.", "There is a car rental up ahead."),
    "der Laden": ("Ich will noch schnell in den Laden.", "I just want to pop into the shop."),
    "abholen": ("Tim soll Lili abholen.", "Tim is supposed to pick Lili up."),
    "leise": ("Sei leise!", "Be quiet!"),
    "die Übung": ("Tim soll Lili die Matheübung erklären.", "Tim is supposed to explain the maths exercise to Lili."),
    "erklären": ("Erklär Lili die Matheübung!", "Explain the maths exercise to Lili!"),
    "laut": ("Seid bitte nicht so laut!", "Please don't be so loud!"),
    "ausmachen": ("Macht doch die Handys aus!", "Switch off your mobile phones!"),
    "schließen": ("Schließt bitte die Bücher!", "Please close your books!"),
    "öffnen": ("Öffnet bitte die Bücher!", "Please open your books!"),
    "zuhören": ("Hört doch bitte zu!", "Please listen!"),
    "der Text": ("Lest bitte den Text.", "Please read the text."),
    "aufstehen": ("Steht bitte nicht auf!", "Please don't get up!"),
    "pünktlich": ("Kommt doch bitte pünktlich!", "Please be on time!"),
    "warten": ("Warten Sie bitte im Wartebereich.", "Please wait in the waiting area."),
    "die Anmeldung": ("Bringen Sie Ihren Ausweis zur Anmeldung mit.", "Bring your ID card to the registration."),
    "die Gebühr": ("Bezahlen Sie die Kursgebühren an der Kasse.", "Pay the course fees at the cash desk."),
    "die Kasse": ("Bezahlen Sie die Kursgebühren an der Kasse.", "Pay the course fees at the cash desk."),
    "ander-": ("Die anderen haben Unterricht.", "The others have class."),
    "der Unterricht": ("Die anderen haben Unterricht.", "The others have class."),
    "lachen": ("Lachen Sie viel!", "Laugh a lot!"),
    "beantragen": ("Tim muss einen internationalen Führerschein beantragen.", "Tim has to apply for an international driving licence."),
    "dürfen": ("Lara darf in der EU Auto fahren.", "Lara is allowed to drive in the EU."),
    "die Zigarette": ("Ihr müsst die Zigaretten ausmachen.", "You have to put out your cigarettes."),
    "rauchen": ("Hier darf man nicht rauchen.", "You may not smoke here."),
    "langsam": ("Du musst langsam fahren.", "You have to drive slowly."),
    "der Parkplatz": ("Wir müssen einen Parkplatz suchen.", "We have to look for a parking space."),
    "parken": ("Hier darf man nicht parken.", "You may not park here."),
    "Achtung": ("Achtung! Du musst das Handy ausmachen.", "Attention! You have to switch off your mobile."),
    "warum": ("Warum muss ich das Handy ausmachen?", "Why do I have to switch off my mobile?"),
    "erlaubt (sein)": ("Was ist erlaubt?", "What is allowed?"),
    "verboten (sein)": ("Was ist verboten?", "What is forbidden?"),
    "mitnehmen": ("Aber man darf sein Fahrrad mitnehmen.", "But you may take your bike along."),
    "das Eis": ("Man darf im Bus kein Eis essen.", "You may not eat ice cream on the bus."),
    "das Gepäck": ("Man muss das Gepäck abgeben.", "You have to hand in your luggage."),
    "abgeben": ("Man muss das Gepäck abgeben.", "You have to hand in your luggage."),
    "benutzen": ("Man darf einen Laptop benutzen.", "You may use a laptop."),
    "das Hotel": ("In Salzburg gibt es viele Hotels.", "There are many hotels in Salzburg."),
    "die Minute": ("Besichtigen Sie Salzburg in nur 100 Minuten.", "See Salzburg in only 100 minutes."),
    "der Rundgang": ("Auf dem Stadtrundgang lernen Sie die Sehenswürdigkeiten kennen.", "On the city walking tour you get to know the sights."),
    "die Sehenswürdigkeit": ("Sie lernen die wichtigsten Sehenswürdigkeiten kennen.", "You get to know the most important sights."),
    "beginnen": ("Beginnen Sie den Rundgang an der Getreidegasse.", "Begin the walking tour at the Getreidegasse."),
    "der Einkauf": ("Die Getreidegasse ist die Einkaufsstraße in Salzburg.", "The Getreidegasse is the shopping street in Salzburg."),
    "berühmt": ("Hier ist der berühmte Komponist geboren.", "The famous composer was born here."),
    "der Einwohner": ("Salzburg hat fast 150.000 Einwohner.", "Salzburg has almost 150,000 inhabitants."),
    "der Stadtplan": ("Stadtpläne gibt es an der Tourist-Info.", "City maps are available at the tourist info."),
    "besuchen": ("Besuchen Sie das Museum in Mozarts Geburtshaus.", "Visit the museum in the house where Mozart was born."),
    "die Geburt": ("Besuchen Sie das Museum in Mozarts Geburtshaus.", "Visit the museum in the house where Mozart was born."),
    "die Ermäßigung": ("Es gibt eine Ermäßigung für Gruppen.", "There is a discount for groups."),
    "die Senioren (Pl.)": ("Es gibt eine Ermäßigung für Senioren.", "There is a discount for senior citizens."),
    "die Oper": ("Das ganze Jahr finden hier Opernaufführungen statt.", "Operas are performed here all year round."),
    "besichtigen": ("Besichtigen Sie die Festspielhäuser bei einer Führung.", "Tour the festival halls on a guided tour."),
    "die Führung": ("Besichtigen Sie die Festspielhäuser bei einer Führung.", "Tour the festival halls on a guided tour."),
    "der Dom": ("Nun kommen Sie zum Dom.", "Now you come to the cathedral."),
    "paar (ein paar)": ("Vom Dom sind es nur ein paar Schritte zum Residenzplatz.", "From the cathedral it is only a few steps to the Residenzplatz."),
    "der Schritt": ("Vom Dom sind es nur ein paar Schritte zum Residenzplatz.", "From the cathedral it is only a few steps to the Residenzplatz."),
    "das Gebäude": ("Am Residenzplatz gibt es viele schöne Gebäude.", "There are many beautiful buildings on the Residenzplatz."),
    "der Eintritt": ("Wie viel kostet der Eintritt für Erwachsene?", "How much is admission for adults?"),
    "die Auskunft": ("Entschuldigung. Ich brauche eine Auskunft.", "Excuse me. I need some information."),
    "das Zentrum": ("Das Hotel liegt im Zentrum.", "The hotel is in the centre."),
    "inklusive": ("Das Frühstück ist inklusive.", "Breakfast is included."),
    "kostenlos": ("Man kann das Internet kostenlos benutzen.", "You can use the internet free of charge."),
    "das Ergebnis": ("Es gibt viele Suchergebnisse.", "There are lots of search results."),
    "die Altstadt": ("Man braucht nur 30 Minuten zur Altstadt.", "It only takes 30 minutes to the old town."),
    "der See": ("Man braucht nur 30 Minuten zum See.", "It only takes 30 minutes to the lake."),
    "das WC": ("Im Zimmer gibt es eine Dusche und ein WC.", "There is a shower and a toilet in the room."),
    "die Klimaanlage": ("Das Hotelzimmer hat eine Klimaanlage.", "The hotel room has air conditioning."),
    "das Frühstück": ("Das Frühstück ist extra.", "Breakfast is extra."),
    "die Lage": ("Lage: Das Hotel liegt im Zentrum.", "Location: the hotel is in the centre."),
    "zentral": ("Lage: zentral gelegen in der Altstadt", "Location: centrally located in the old town"),
    "der Blick": ("Wir möchten ein Zimmer mit Seeblick.", "We would like a room with a lake view."),
    "die Terrasse": ("Das Hotel hat ein Restaurant mit Terrasse.", "The hotel has a restaurant with a terrace."),
    "historisch": ("Das Hotel hat ein historisches Flair.", "The hotel has a historic feel."),
    "das Schwimmbad": ("Das Hotel hat ein Schwimmbad.", "The hotel has a swimming pool."),
    "die Haltestelle": ("Die Bushaltestelle ist vor dem Hotel.", "The bus stop is in front of the hotel."),
    "buchen": ("Sie buchen ein Doppelzimmer.", "They book a double room."),
    "das Doppelzimmer": ("Sie buchen ein Doppelzimmer.", "They book a double room."),
    "das Einzelzimmer": ("Das Hotel hat Doppelzimmer und Einzelzimmer.", "The hotel has double rooms and single rooms."),
    "der Gast": ("Der Gast bucht das Zimmer.", "The guest books the room."),
    "der Wunsch": ("Haben Sie Wünsche an das Hotel?", "Do you have any requests for the hotel?"),
    "der Nichtraucher": ("Er möchte ein Nichtraucherzimmer.", "He would like a non-smoking room."),
    "die Ankunft": ("Die Ankunft ist um 14:00 Uhr.", "Arrival is at 2 pm."),
    "die Rezeption": ("Füllen Sie das Formular an der Hotelrezeption aus.", "Fill in the form at the hotel reception."),
    "fertig (sein)": ("Das Zimmer ist leider noch nicht ganz fertig.", "Sorry, the room isn't quite ready yet."),
    "wiederholen": ("Können Sie das bitte wiederholen?", "Can you repeat that, please?"),
    "der Rahm": ("Das ist ein Kaffee mit Rahm, äh, mit Sahne.", "That is a coffee with cream — er, with cream (Sahne)."),
    "die Vollpension": ("Möchten Sie Vollpension oder Halbpension?", "Would you like full board or half board?"),
    "die Halbpension": ("Möchten Sie Vollpension oder Halbpension?", "Would you like full board or half board?"),
    "reservieren": ("Wir haben ein Doppelzimmer reserviert.", "We have reserved a double room."),
    "der Schlüssel": ("Hier ist Ihr Schlüssel.", "Here is your key."),
    "der Lift": ("Der Lift ist dort.", "The lift is over there."),
}


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith(SECTION))
    end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
    seen = set()
    for i in range(start, end):
        line = lines[i]
        if not line.startswith("| "):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) != 16 or cells[0] not in BOOK:
            continue
        de, en = BOOK[cells[0]]
        cells[4], cells[14], cells[15] = de, "-", en
        lines[i] = "| " + " | ".join(cells) + " |"
        seen.add(cells[0])
    missing = sorted(set(BOOK) - seen)
    print(f"{len(seen)} words now use the book's sentence; not found: {missing or 'none'}")
    if write:
        backup = MD.with_name(MD.name + ".before-lesson9-book-sentences")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(lines), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
