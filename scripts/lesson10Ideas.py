#!/usr/bin/env python3
"""
Chris's Lesson 10 ideas of 2026-10-15 (A1.2 Lesson 10, LWS 37–40).

    python3 scripts/lesson10Ideas.py           # show what would change
    python3 scripts/lesson10Ideas.py --write   # rewrite the .md (a backup is kept)

1. sein- and ihr- go back to where the book prints them: after der Mund, before
   der Zahn (LWS 38, A2). The book prints ihr- a second time after die
   Nachricht (B2, "their"); the list keeps one card with both meanings.
2. English meanings (only that column; word ids do not move):
   sein- and ihr- ask for both meanings, Schnupfen is only "runny nose",
   Empfänger also takes "receiver", vereinbaren has one answer, der Zug is
   the normal train.

scripts/data/bookOrder.tsv gets the same order. Run
scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
ORDER = pathlib.Path(__file__).parent / "data/bookOrder.tsv"
HEADING = "## A1.2 · Lesson 10"

# (German word, old English) → new English
CHANGES = {
    ("sein-", "his, its"): "1. his<br>2. its",
    ("ihr-", "her, their"): "1. her<br>2. their",
    ("der Schnupfen", "1. head cold<br>2. runny nose"): "runny nose",
    ("der Empfänger", "recipient"): "recipient, receiver",
    ("vereinbaren", "1. to arrange<br>2. to agree on"): "to arrange, to make (an appointment) [to make an appointment]",
    ("der Zug", "train"): "train (normal)",
}

MOVE = ["sein-", "ihr-"]   # in this order, right after AFTER
AFTER = "der Mund"


def word(line):
    return line[2:].split(" | ")[0].strip() if line.startswith("| ") else None


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")

    done = {k: 0 for k in CHANGES}
    for i, line in enumerate(lines):
        cells = line.split(" | ")
        if not line.startswith("| ") or len(cells) < 4:
            continue
        key = (cells[0][2:].strip(), cells[2].strip())
        if key in CHANGES:
            cells[2] = CHANGES[key]
            lines[i] = " | ".join(cells)
            done[key] += 1
            print(f"{key[0]}: {key[1]}  →  {CHANGES[key]}")
    for k, n in done.items():
        if n != 1:
            print(f"found {n}× (already changed?): {k}")

    # Move inside Lesson 10 only.
    start = next(i for i, l in enumerate(lines) if l.startswith(HEADING))
    end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
    block = lines[start:end]
    rows = [l for l in block if word(l) in MOVE]
    if len(rows) != len(MOVE):
        sys.exit(f"expected {MOVE} once each in Lesson 10, found {len(rows)}")
    rows.sort(key=lambda l: MOVE.index(word(l)))
    block = [l for l in block if word(l) not in MOVE]
    at = next(i for i, l in enumerate(block) if word(l) == AFTER) + 1
    block[at:at] = rows
    lines[start:end] = block
    print(f"moved {MOVE} after {AFTER}")

    order = ORDER.read_text(encoding="utf-8").split("\n")
    lesson = [i for i, l in enumerate(order) if l.startswith("A1.2\tLesson 10\t")]
    moved = [order[i] for i in lesson if order[i].split("\t")[2] in MOVE]
    kept = [order[i] for i in lesson if order[i].split("\t")[2] not in MOVE]
    at = next(i for i, l in enumerate(kept) if l.split("\t")[2] == AFTER) + 1
    kept[at:at] = sorted(moved, key=lambda l: MOVE.index(l.split("\t")[2]))
    order[lesson[0]:lesson[-1] + 1] = kept

    if write:
        backup = MD.with_name(MD.name + ".before-lesson10-ideas")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(lines), encoding="utf-8")
        ORDER.write_text("\n".join(order), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
