#!/usr/bin/env python3
"""
Words the book-order pass (scripts/bookOrder.py) put in the wrong place.

    python3 scripts/bookOrderFixes.py           # show what would change
    python3 scripts/bookOrderFixes.py --write   # rewrite the .md (a backup is kept)

Found on 2026-10-15 by reading every lesson's LWS pages again (all six books)
and comparing them with scripts/data/bookOrder.tsv. Most differences were the
picture-panel boxes at the end of a lesson, which have no reading order of
their own; those stay as they are. These are the real slips — mostly words
the book prints twice (ihr / Ihr-, hell / hell-):

  A1.1 Lesson 2   ihr (you, plural) comes after jetzt, before wir
  A1.1 Lesson 4   hell- / dunkel- (+ Farbe) come after gelb, with the colours
  A1.1 Lesson 5   Europa comes after das Kaufhaus, before der Moment

(A1.2 Lesson 10, sein- / ihr-, is in scripts/lesson10Ideas.py.)
Only the order changes, so no word id moves. The .md and bookOrder.tsv both
change. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
ORDER = pathlib.Path(__file__).parent / "data/bookOrder.tsv"

# (volume, lesson, words to move in this order, the word they go right after)
MOVES = [
    ("A1.1", "Lesson 2", ["ihr"], "jetzt"),
    ("A1.1", "Lesson 4", ["hell- (+ Farbe)", "dunkel- (+ Farbe)"], "gelb"),
    ("A1.1", "Lesson 5", ["Europa"], "das Kaufhaus"),
]


def word(line):
    return line[2:].split(" | ")[0].strip() if line.startswith("| ") else None


def move(items, name, words, after):
    """Move the items whose name is in words to right after the one named after."""
    picked = sorted((x for x in items if name(x) in words), key=lambda x: words.index(name(x)))
    if len(picked) != len(words):
        sys.exit(f"expected {words} once each, found {len(picked)}")
    rest = [x for x in items if name(x) not in words]
    at = next(i for i, x in enumerate(rest) if name(x) == after) + 1
    rest[at:at] = picked
    return rest


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    order = ORDER.read_text(encoding="utf-8").split("\n")

    for volume, lesson, words, after in MOVES:
        heading = f"## {volume} · {lesson} "
        start = next(i for i, l in enumerate(lines) if l.startswith(heading))
        end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
        lines[start:end] = move(lines[start:end], word, words, after)

        rows = [i for i, l in enumerate(order) if l.startswith(f"{volume}\t{lesson}\t")]
        order[rows[0]:rows[-1] + 1] = move(order[rows[0]:rows[-1] + 1], lambda l: l.split("\t")[2], words, after)
        print(f"{volume} {lesson}: {', '.join(words)} → after {after}")

    if write:
        backup = MD.with_name(MD.name + ".before-book-order-fixes")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(lines), encoding="utf-8")
        ORDER.write_text("\n".join(order), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
