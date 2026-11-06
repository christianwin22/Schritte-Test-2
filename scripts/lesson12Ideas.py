#!/usr/bin/env python3
"""
Chris's Lesson 12 ideas of 2026-11-05 (A1.2 Lesson 12).

    python3 scripts/lesson12Ideas.py           # show what would change
    python3 scripts/lesson12Ideas.py --write   # rewrite the .md (a backup is kept)

English meanings only (word ids do not move): Lager is storeroom, Zeugnis is
report or transcript, Mitarbeiter is employee, Reinigung is cleaning or dry
cleaner (plural: dry cleaners, no apostrophe), putzen is to scrub,
vorbeibringen is to drop off, anmachen takes turn on too. The sentences that
used the old meanings follow. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
HEADING = "## A1.2 · Lesson 12"
ZEUGNIS_BOOK = "A friend needs transcripts and documents in German for the university."

# display → {column index: new text}
CHANGES = {
    "das Lager": {2: "storeroom", 6: "I like the storeroom.", 10: "I like the storeroom."},
    "das Zeugnis": {2: "report, transcript", 6: "Where is the report?", 10: "Do you see the report?", 15: ZEUGNIS_BOOK},
    "das Dokument": {15: ZEUGNIS_BOOK},
    "der Mitarbeiter": {2: "employee (male)"},
    "die Reinigung": {2: "1. cleaning<br>2. dry cleaner", 8: "The dry cleaners are only open until 1 pm on Saturday."},
    "putzen": {2: "to scrub", 15: "We scrub everything made of glass, including skylights and conservatories."},
    "vorbeibringen": {2: "to drop off", 15: "Then please drop off the device."},
    "anmachen": {2: "to switch on, turn on"},
}


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    start = next(i for i, l in enumerate(lines) if l.startswith(HEADING))
    end = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")), len(lines))
    done = set()
    for i in range(start, end):
        if not lines[i].startswith("| "):
            continue
        cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
        if cells[0] not in CHANGES or cells[0] in done:
            continue
        for col, text in CHANGES[cells[0]].items():
            print(f"{cells[0]:18} [{col}] {cells[col]!r} → {text!r}")
            cells[col] = text
        lines[i] = "| " + " | ".join(cells) + " |"
        done.add(cells[0])
    missing = set(CHANGES) - done
    if missing:
        sys.exit(f"not found in {HEADING}: {missing}")
    if write:
        shutil.copy(MD, MD.with_name(MD.name + ".before-lesson12-ideas"))
        MD.write_text("\n".join(lines), encoding="utf-8")
        print("written")


main()
