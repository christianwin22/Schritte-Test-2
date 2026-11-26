#!/usr/bin/env python3
"""
Chris's A1 Lesson 14 meaning fixes (ideas of 2026-11-26).

    python3 scripts/ideasNov26.py           # show what would change
    python3 scripts/ideasNov26.py --write   # rewrite the .md (a backup is kept)

Each fix names the row by its headword and its book sentence, and swaps
cells by column: 2 = English meaning, others = example English cells.
Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"

# (headword, book sentence) -> {old cell text: new cell text}
FIXES = {
    ("die Jahreszeit", "Es gibt vier Jahreszeiten."): {
        "season of the year": "season [season of the year]",
        "Where is the season of the year?": "Where is the season?",
        "Do you know the season of the year?": "Do you know the season?",
    },
    ("die (Gruß-)Karte", "Ich schreibe (Gruß-)Karten an meine Freunde."): {
        "greetings card": "(greeting) card [greeting card, greetings card]",
        "Where is the greetings card?": "Where is the (greeting) card?",
        "I like the greetings card.": "I like the (greeting) card.",
    },
    ("erzählen", "Was erzählt Tim?"): {
        "to tell, narrate": "to narrate [to tell]",
    },
    ("vorlesen", "Der Nikolaus liest aus seinem Buch vor."): {
        "to read aloud": "to read aloud, read out loud",
    },
    ("vorher", "Bei mir zu Hause kommt der Nikolaus schon vorher."): {
        "beforehand, before": "1. beforehand, before<br>2. earlier",
    },
    ("lieb", "Ich habe dich sehr lieb, Opa."): {
        "dear, kind": "1. dear<br>2. kind",
    },
}


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    seen = set()
    for i, line in enumerate(lines):
        if not line.startswith("|"):
            continue
        cells = line.split("|")
        # cells[0] is "" before the first bar
        key = (cells[1].strip(), cells[5].strip()) if len(cells) > 6 else None
        if key not in FIXES:
            continue
        seen.add(key)
        for j, cell in enumerate(cells):
            new = FIXES[key].get(cell.strip())
            if new is not None:
                cells[j] = f" {new} "
        new_line = "|".join(cells)
        if new_line != line:
            print(f"{i + 1}: {key[0]}\n  - {line[:160]}\n  + {new_line[:160]}")
            lines[i] = new_line
    missing = set(FIXES) - seen
    if missing:
        sys.exit(f"rows not found: {missing}")
    if write:
        shutil.copy(MD, MD.with_name(MD.name + ".before-ideasNov26"))
        MD.write_text("\n".join(lines), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
