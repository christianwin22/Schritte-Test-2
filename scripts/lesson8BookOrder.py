#!/usr/bin/env python3
"""
A1.2 Lesson 8 in the order of the book's Lernwortschatz (LWS 27–31).

    python3 scripts/lesson8BookOrder.py           # show the new order
    python3 scripts/lesson8BookOrder.py --write   # rewrite the .md (a backup is kept)

The word list had Lesson 8 sorted into topic groups, and four words the book
lists here were left out because an earlier lesson already had them (der Arzt,
die Frage, die Abteilung, zeigen). Two plural-only nouns were missing too
(die Kenntnisse, die Unterlagen). This puts the lesson back in book order as
one table, adds the six, and spells a few headwords the way the book does:
die Uni(versität), (an)bieten.

Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import re
import shutil
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
HEADING = "## A1.2 · Lesson 8"
GROUP = "Jobs, work & job applications"

COLUMNS = [
    "German word (singular)", "Plural", "English meaning", "Word type",
    "Singular example", "Singular example English", "Plural example", "Plural example English",
    "Accusative example", "Accusative example English", "Present tense", "Simple past",
    "Present perfect", "App example", "App example English",
]

# Book order. A name in the list is an existing row; a dict is a new one.
NEW = {
    "der Arzt": ["der Arzt", "die Ärzte", "doctor", "Noun", "Hier ist der Arzt.", "Here is the doctor.",
                 "Wo sind die Ärzte?", "Where are the doctors?", "Ich finde den Arzt toll.", "I think the doctor is great.",
                 "-", "-", "-", "Der Arzt untersucht meinen Hals.", "The doctor examines my throat."],
    "die Frage": ["die Frage", "die Fragen", "question", "Noun", "Die Frage ist gut.", "The question is good.",
                  "Die Fragen sind gut.", "The questions are good.", "Kennst du die Frage?", "Do you know the question?",
                  "-", "-", "-", "Darf ich eine Frage stellen?", "May I ask a question?"],
    "die Abteilung": ["die Abteilung", "die Abteilungen", "department", "Noun", "Die Abteilung ist groß.", "The department is big.",
                      "Wo sind die Abteilungen?", "Where are the departments?", "Ich finde die Abteilung interessant.",
                      "I think the department is interesting.", "-", "-", "-",
                      "Ich möchte in Ihrer Abteilung ein Praktikum machen.", "I would like to do an internship in your department."],
    "zeigen": ["zeigen", "-", "to show", "Verb", "-", "-", "-", "-", "-", "-",
               "zeige · zeigst · zeigt · zeigen · zeigt · zeigen",
               "zeigte · zeigtest · zeigte · zeigten · zeigtet · zeigten",
               "habe gezeigt · hast gezeigt · hat gezeigt · haben gezeigt · habt gezeigt · haben gezeigt",
               "Wir zeigen den Touristen die Stadt.", "We show the tourists the city."],
    "die Kenntnisse (Pl.)": ["die Kenntnisse (Pl.)", "-", "knowledge, skills", "Noun", "-", "-", "-", "-", "-", "-",
                             "-", "-", "-", "Ihre Kenntnisse in Deutsch sind sehr gut.", "Your knowledge of German is very good."],
    "die Unterlagen (Pl.)": ["die Unterlagen (Pl.)", "-", "documents, papers", "Noun", "-", "-", "-", "-", "-", "-",
                             "-", "-", "-", "Bitte schicken Sie Ihre Unterlagen per E-Mail.", "Please send your documents by email."],
}

ORDER = [
    # Foto-Hörgeschichte
    "die Geschichte", "das Krankenhaus", "das Interview", "die Ausbildung", "der Beruf",
    "der Chef", "die Chefin", "der Patient", "die Patientin", "der Journalist", "die Journalistin",
    "der Hausmeister", "die Hausmeisterin", "das Thema", "eigen-",
    # A
    "als", "der Arzt", "die Ärztin", "der Ingenieur", "die Ingenieurin", "der Hausmann", "die Hausfrau",
    "der Polizist", "die Polizistin", "der Krankenpfleger", "die Krankenschwester", "beruflich",
    "der Schüler", "die Schülerin", "der Student", "die Studentin", "der Job", "die (Arbeits-)Stelle",
    "selbstständig", "berufstätig", "arbeitslos", "der Babysitter", "die Babysitterin",
    # B
    "dauern", "seit", "die Bewerbung", "das Praktikum", "der Leiter", "die Leiterin", "die Frage", "geehrt",
    "die Abteilung", "die Wirtschaft", "gerade", "das Diplom", "das Büro", "die Information", "der Gruß",
    "heiraten", "eigentlich", "später", "der Reiseführer", "die Reiseführerin", "der Tourist", "die Touristin", "zeigen",
    # C
    "die (Berufs-)Erfahrung", "manchmal", "der Kellner", "die Kellnerin", "der Architekt", "die Architektin",
    "der Arbeiter", "die Arbeiterin", "wenig", "der Kollege", "die Kollegin",
    # D
    "der Koch", "die Köchin", "die Universität (die Uni)", "leider", "das Semester", "bekommen", "bald",
    "das Konzert", "die Agentur", "danach", "das Studium", "letzt-", "der Service", "der Tourismus", "der Kontakt",
    "die Kenntnisse (Pl.)", "das Team", "anbieten", "der Auszubildende", "die Auszubildende", "die Unterlagen (Pl.)",
    # E
    "der Handel", "der Traum", "der Bereich", "die Mode", "jed-",
    "montags", "dienstags", "mittwochs", "donnerstags", "freitags", "samstags", "sonntags",
    "vormittags", "nachmittags", "morgens", "mittags", "abends",
    "der Praktikant", "die Praktikantin", "schriftlich", "die Dauer", "frei", "normalerweise", "das Geld",
    "zahlen", "pro", "die Stunde",
]

# Spelled as the book spells them, and meanings Chris asked for.
CHANGES = {
    "die Universität (die Uni)": {"German word (singular)": "die Uni(versität)"},
    "anbieten": {"German word (singular)": "(an)bieten"},
    "die Geschichte": {"English meaning": "history, story"},
    "danach": {"English meaning": "then, after that, afterwards"},
    "montags": {"English meaning": "every Monday, on Mondays"},
    "dienstags": {"English meaning": "every Tuesday, on Tuesdays"},
    "mittwochs": {"English meaning": "every Wednesday, on Wednesdays"},
    "donnerstags": {"English meaning": "every Thursday, on Thursdays"},
    "freitags": {"English meaning": "every Friday, on Fridays"},
    "samstags": {"English meaning": "every Saturday, on Saturdays"},
    "sonntags": {"English meaning": "every Sunday, on Sundays"},
    "vormittags": {"English meaning": "every morning (before noon), in the mornings"},
    "nachmittags": {"English meaning": "every afternoon, in the afternoons"},
    "morgens": {"English meaning": "every morning, in the morning"},
    "mittags": {"English meaning": "every midday, at midday"},
    "abends": {"English meaning": "every evening, in the evening"},
}


def main(write: bool):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    start = next(i for i, l in enumerate(lines) if l.startswith(HEADING))
    end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))

    rows, notes = {}, []
    for line in lines[start + 1:end]:
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if cells[0].lower().startswith("german word") or re.match(r"^:?-+$", cells[0]):
                continue
            if len(cells) != len(COLUMNS):
                sys.exit(f"Unexpected row width: {line[:80]}")
            rows[cells[0]] = cells
        elif line.startswith("*") and "Already taught earlier" not in line:
            notes.append(line)

    missing = [w for w in ORDER if w not in rows and w not in NEW]
    unused = [w for w in rows if w not in ORDER]
    if missing or unused:
        sys.exit(f"missing: {missing}\nnot placed: {unused}")

    table = []
    for word in ORDER:
        cells = list(NEW[word]) if word in NEW else list(rows[word])
        for column, value in CHANGES.get(word, {}).items():
            cells[COLUMNS.index(column)] = value
        table.append("| " + " | ".join(cells) + " |")

    section = [
        f"{HEADING} — Jobs & work (LWS 27–31) — {len(table)}",
        "",
        "*In the order of the book's Lernwortschatz. Four words an earlier lesson already taught are listed here again, "
        "as the book does: `der Arzt`, `die Frage`, `die Abteilung`, `zeigen`.*",
        "",
        f"### {GROUP} — {len(table)}",
        "",
        "| " + " | ".join(COLUMNS) + " |",
        "|" + "|".join(["---"] * len(COLUMNS)) + "|",
        *table,
        "",
        *[n for n in notes if "Berufe" in n],
        "",
    ]
    if not write:
        print("\n".join(section[:12]))
        print(f"... {len(table)} rows")
        return
    backup = SOURCE.with_name(SOURCE.name + ".before-lesson8-order")
    if not backup.exists():
        shutil.copy2(SOURCE, backup)
    SOURCE.write_text("\n".join(lines[:start] + section + lines[end:]) + "\n", encoding="utf-8")
    print(f"Written ({len(table)} rows). Backup: {backup.name}")


if __name__ == "__main__":
    main("--write" in sys.argv)
