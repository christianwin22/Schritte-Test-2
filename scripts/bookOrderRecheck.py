#!/usr/bin/env python3
"""
The book-order recheck Chris asked for on 2026-10-23.

    python3 scripts/bookOrderRecheck.py           # show what would change
    python3 scripts/bookOrderRecheck.py --write   # rewrite the .md (a backup is kept)

Every LWS page of the six Kursbücher was read again (Vision OCR) and each
lesson's words compared with the book's word list. The lists were right
except for these, checked on the page:

  A1.1 Lesson 1 (LWS 2–3): "was" and "sprechen" are C4, after "nur" — not at
      the start; (das) Deutschland and (das) Österreich are C1, after "von".
  B1.2 Lesson 13 (LWS 49–50): "folgend-" is after "national"; "wählen",
      der Präsident and die Präsidentin are only in the "Politik" picture,
      so they come after the book's list (like Lesson 11's picture words).

The other differences the scan found were inside picture boxes, which have no
one reading order, and are left as they are. A1.2 Lesson 11 was done by
scripts/lesson11Ideas.py.

scripts/data/bookOrder.tsv gets the same order. Run
scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
ORDER = pathlib.Path(__file__).parent / "data/bookOrder.tsv"

# (heading, volume, lesson in bookOrder.tsv): [(words to move, in order), the word they go after; None = the end]
MOVES = {
    ("## A1.1 · Lesson 1", "A1.1", "Lesson 1"): [
        (["was", "sprechen"], "nur"),
        (["Deutschland", "Österreich"], "von"),
    ],
    ("## B1.2 · Lesson 13", "B1.2", "Lesson 13"): [
        (["folgend"], "national"),
        (["wählen", "der Präsident", "die Präsidentin"], None),
    ],
}


def german(line):
    return line[2:].split(" | ")[0].strip() if line.startswith("| ") and not line.startswith("| German word") else None


def apply(seq, moves, name=lambda x: x):
    """Moves each group, in order, right after its word (or to the end)."""
    seq = list(seq)
    for group, after in moves:
        rows = [next(x for x in seq if name(x) == g) for g in group]
        seq = [x for x in seq if x not in rows]
        at = len(seq) if after is None else next(i for i, x in enumerate(seq) if name(x) == after) + 1
        seq[at:at] = rows
    return seq


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    order = ORDER.read_text(encoding="utf-8").split("\n")
    for (heading, volume, lesson), moves in MOVES.items():
        if not moves:
            continue
        start = next(i for i, l in enumerate(lines) if l.startswith(heading + " ") or l == heading)
        end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("## "))
        idx = [i for i in range(start, end) if german(lines[i])]
        rows = [lines[i] for i in idx]
        new = apply(rows, moves, german)
        for i, l in zip(idx, new):
            lines[i] = l
        before = [german(r) for r in rows]
        after = [german(r) for r in new]
        moved = [w for g, _ in moves for w in g]
        print(f"{volume} {lesson}: " + "; ".join(
            f"{w} now after {after[after.index(w) - 1]} (was after {before[before.index(w) - 1]})" for w in moved))

        pick = [i for i, l in enumerate(order) if l.startswith(f"{volume}\t{lesson}\t")]
        words = [order[i].split("\t")[2] for i in pick]
        for i, w in zip(pick, apply(words, moves)):
            order[i] = f"{volume}\t{lesson}\t{w}"

    if write:
        backup = MD.with_name(MD.name + ".before-order-recheck")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(lines), encoding="utf-8")
        ORDER.write_text("\n".join(order), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
