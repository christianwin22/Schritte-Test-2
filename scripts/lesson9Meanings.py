#!/usr/bin/env python3
"""
Chris's English meanings from his Lesson 9 run (ideas of 2026-10-06/07).

    python3 scripts/lesson9Meanings.py           # show what would change
    python3 scripts/lesson9Meanings.py --write   # rewrite the .md (a backup is kept)

Only the English meaning column changes, so no word id moves. Each row is found
by its German word and its old English, so a row already changed is left alone.

Two marks in the English column (see the App rules in the .md):
  [church]          also accepted as an answer, never shown
  <br>Pl.: …        what the plural card says, when it is not just the plural
                    of the singular (die Einkäufe = purchases)

Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"

# (German word, old English) → new English
CHANGES = {
    # Lesson 9
    ("die Altstadt", "old town"): "old town, old city",
    ("inklusive", "included"): "included, inclusive",
    ("der Dom", "cathedral"): "cathedral (major church) [church]",
    ("den Pass mitbringen", "to bring your passport"): "to bring the passport [to bring your passport]",
    ("den Ausweis mitbringen", "to bring your ID"): "to bring the ID card [to bring your ID card, to bring the ID, to bring your ID]",
    ("der Antrag", "application (form)"): "official application (authority request - licence, visa, permit) [application, application form, form]",
    ("einen Antrag ausfüllen", "to fill in an application"): "to fill in an application form [to fill in an application]",
    ("einen Antrag abgeben", "to hand in an application"): "to hand in an application form [to hand in an application]",
    ("die Klimaanlage", "air conditioning"): "air conditioning, air con [air condition, air conditioner]",
    ("das Eis", "ice"): "ice, ice cream",
    ("der Automat", "machine, ticket machine"): "ticket / vending machine (self-service device - tickets, parking, snacks) [ticket machine, machine]",
    ("der Unterricht", "lessons, class"): "class, lessons, training",
    ("die Fahrkarte", "ticket (travel)"): "travel ticket, travel card [ticket]",
    ("die Fahrt", "journey, trip"): "ride (transit - train, car, bus) [drive]",
    ("die Anmeldung", "1. registration<br>2. reception desk"): "registration (enrolling - address, course, hotel) [reception desk]",
    ("das Ziel", "1. destination<br>2. goal"): "1. destination (travel)<br>2. goal (life, career)",
    ("wählen", "to choose, to select"): "to select / to dial (general choice) [to choose]",
    ("auswählen", "to select"): "to pick out / to choose (selecting from options) [to select]",
    ("die Übung", "exercise"): "exercise (homework)",
    ("ausmachen", "to switch off"): "to switch off / to turn off (light, TV, radio)",
    ("schließen", "to close, to shut"): "to close / to shut (door, window, shop)",
    ("die Gebühr", "fee"): "fee (class, training)",
    ("beantragen", "to apply for"): "to apply for (visa, licence, passport)",
    ("dürfen", "to be allowed to"): "may, to be allowed to",
    ("der Parkplatz", "parking space, car park"): "car park, parking space",
    ("erlaubt (sein)", "(to be) allowed"): "allowed",
    ("verboten (sein)", "(to be) forbidden"): "forbidden",
    ("das Gepäck", "luggage"): "luggage, baggage",
    ("der Einkauf", "1. purchase<br>2. shopping"): "1. shopping<br>2. purchase (business procurement)<br>Pl.: purchases (items bought)",
    ("besichtigen", "to view, to tour"): "to sightsee / to tour / to visit (famous places) [to view]",
    ("die Führung", "guided tour"): "1. guided tour<br>2. leadership",
    ("paar (ein paar)", "a few"): "a few, some",
    ("der Eintritt", "admission, entry"): "entrance / admission (entrance fee, entry, admission ticket) [entry]",
    ("die Auskunft", "information"): "information / info desk (tourist info, help desk, inquiry)",
    ("kostenlos", "free of charge"): "free of charge, FOC [free]",
    ("das WC", "toilet"): "restroom / toilet (public restroom sign, station toilet)",
    ("die Lage", "location"): "location, place",
    ("langsam", "slow, slowly"): "1. slow<br>2. slowly",
    ("zentral", "central, centrally"): "1. central<br>2. centrally",
    ("historisch", "historic"): "historic, historical",
    ("die Haltestelle", "(bus) stop"): "1. bus stop<br>2. tram stop",
    ("wiederholen", "to repeat"): "to repeat, to revise",
    ("die Vollpension", "full board"): "full board (room and 3 meals: breakfast, lunch and dinner)",
    ("die Halbpension", "half board"): "half board (room and 2 meals: breakfast and dinner)",
    # The same family of words in earlier lessons (Chris's list of 2026-10-07)
    ("der Urlaub", "holiday, vacation"): "vacation (time off - holidays) [holiday, holidays]",
    ("die Reise", "journey, trip"): "trip (long travel - abroad) [journey]",
    ("der Ausflug", "trip, excursion"): "day trip (short outing) [trip, excursion]",
    ("die Tour", "tour"): "tour (planned route - sightseeing)",
    ("die Bewerbung", "application"): "career application (competing - job, university) [application, job application]",
    ("das Formular", "form"): "blank form (paperwork) [form]",
    ("die Toilette", "toilet"): "restroom / toilet (spoken word, bathroom)",
}

RULES_ANCHOR = "- A headword that is already a whole sentence"
RULES = (
    "- In `English meaning`, words in square brackets are also accepted as answers but never shown "
    "(`cathedral (major church) [church]`). Round brackets are a note: shown on their own line, never needed in an answer.\n"
    "- A noun whose plural means something else ends its `English meaning` with `<br>Pl.: …` "
    "(`1. shopping<br>2. purchase<br>Pl.: purchases (items bought)`); the plural card shows and asks that instead.\n"
)


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    done = {k: 0 for k in CHANGES}
    for i, line in enumerate(lines):
        if not line.startswith("| "):
            continue
        cells = line.split(" | ")
        if len(cells) < 4:
            continue
        key = (cells[0][2:].strip(), cells[2].strip())
        if key in CHANGES:
            cells[2] = CHANGES[key]
            lines[i] = " | ".join(cells)
            done[key] += 1
            print(f"{key[0]}: {key[1]}  →  {CHANGES[key]}")
    missing = [k for k, n in done.items() if not n]
    for k in missing:
        print(f"NOT FOUND (already changed?): {k}")
    text = "\n".join(lines)
    if RULES_ANCHOR in text and "words in square brackets are also accepted" not in text:
        text = text.replace(RULES_ANCHOR, RULES + RULES_ANCHOR, 1)
    print(f"{sum(done.values())} rows")
    if write:
        backup = MD.with_name(MD.name + ".before-lesson9-meanings")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text(text, encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
