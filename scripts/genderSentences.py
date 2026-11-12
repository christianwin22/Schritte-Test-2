#!/usr/bin/env python3
"""
Chris's ideas of 2026-11-12.

    python3 scripts/genderSentences.py           # show what would change
    python3 scripts/genderSentences.py --write   # rewrite the .md (a backup is kept)

1. A male word must not use the book's sentence about the woman (der Steward ←
   "Ich bin Stewardess von Beruf."). In all 11 such pairs the book sentence moves
   to the female word, and the male word gets a new sentence of its own.
2. Drogerie: the English sentences say "drugstore", not "chemist's", and
   "pharmacy" is accepted too.
3. die Uhr: sense 1 is "clock, watch".
Word ids do not move. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"

# male word → (female word, new male sentence, its English)
PAIRS = {
    "der Arzt": ("die Ärztin", "Der Arzt untersucht das Kind.", "The doctor examines the child."),
    "der Polizist": ("die Polizistin", "Der Polizist kontrolliert die Autos.", "The police officer is checking the cars."),
    "der Babysitter": ("die Babysitterin", "Heute Abend kommt der Babysitter.", "The babysitter is coming this evening."),
    "der Architekt": ("die Architektin", "Der Architekt zeigt uns die Pläne.", "The architect shows us the plans."),
    "der Steward": ("die Stewardess", "Der Steward erklärt die Notausgänge.", "The flight attendant explains the emergency exits."),
    "der Moderator": ("die Moderatorin", "Der Moderator der Sendung ist sehr lustig.", "The host of the show is very funny."),
    "der Friseur": ("die Friseurin", "Der Friseur schneidet mir die Haare.", "The hairdresser cuts my hair."),
    "der Experte": ("die Expertin", "Er ist Experte für Computer.", "He is a computer expert."),
    "der Sänger": ("die Sängerin", "Der Sänger ist in ganz Europa bekannt.", "The singer is famous all over Europe."),
    "der Autor": ("die Autorin", "Der Autor schreibt Krimis.", "The author writes crime novels."),
    "der Bürgermeister": ("die Bürgermeisterin", "Der Bürgermeister spricht mit den Bürgern.", "The mayor talks to the citizens."),
}
EXAMPLE, APP, APP_EN, MEANING = 4, 14, 15, 2


def cells_of(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    rows = {i: cells_of(l) for i, l in enumerate(lines) if l.startswith("| ") and not l.startswith("| German")}
    changed = {}

    def put(i, col, text):
        c = changed.setdefault(i, list(rows[i]))
        if c[col] != text:
            print(f"{c[0]:22} [{col}] {c[col]!r} → {text!r}")
            c[col] = text

    females_done = set()
    for i, c in rows.items():
        if c[0] not in PAIRS:
            continue
        female, sentence, english = PAIRS[c[0]]
        # Only the row whose book sentence is about the woman (a word can be in two lessons)
        if female.split(" ", 1)[1] not in c[EXAMPLE]:
            continue
        j = next(k for k in (i - 1, i + 1, i + 2) if k in rows and rows[k][0] == female)
        book, book_en = c[EXAMPLE], c[APP_EN]
        assert book != "-" and rows[j][EXAMPLE] == "-", (c[0], female)
        put(j, EXAMPLE, book)
        put(j, APP, "-")
        put(j, APP_EN, book_en)
        put(i, EXAMPLE, "-")
        put(i, APP, sentence)
        put(i, APP_EN, english)
        females_done.add(c[0])

    for i, c in rows.items():
        if c[0] == "die Drogerie":
            put(i, MEANING, "drugstore [pharmacy]")
        if "Drogerie" in c[EXAMPLE] and "chemist's" in c[APP_EN]:
            put(i, APP_EN, c[APP_EN].replace("chemist's", "drugstore"))
        if c[0] == "die Uhr" and c[MEANING] == "1. clock<br>2. o'clock":
            put(i, MEANING, "1. clock, watch<br>2. o'clock")

    missing = set(PAIRS) - females_done
    if missing:
        sys.exit(f"not found: {missing}")
    for i, c in changed.items():
        lines[i] = "| " + " | ".join(c) + " |"
    if write:
        shutil.copy(MD, MD.with_name(MD.name + ".before-gender-sentences"))
        MD.write_text("\n".join(lines), encoding="utf-8")
        print("written")


main()
