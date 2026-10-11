#!/usr/bin/env python3
"""
Every word uses the book's own example sentence (Chris, 2026-10-07 and 2026-10-11).

    python3 scripts/bookSentences.py           # show what would change
    python3 scripts/bookSentences.py --write   # rewrite the .md (a backup is kept)

scripts/data/bookSentences.tsv holds, for A1.2 (except Lesson 9, done by
lesson9BookSentences.py), A2.1, A2.2, B1.1 and B1.2, the sentence printed next
to each word in the Kursbuch Lernwortschatz, with its English. It was read off
the PDFs with OCR: each word paired with the sentence on its row, matched to the
word list in book order, misreadings corrected, and pairs whose sentence did not
belong to the word dropped. Words the book gives no sentence keep theirs.

As the App rules say, a book sentence goes in `Example sentence`, `App example`
becomes "-", and its English goes in `App example English`. A table that has no
`Example sentence` column (A1.2 Lesson 8) gets one.

Run scripts/importVocabulary.py afterwards.
"""
import csv
import pathlib
import re
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
DATA = pathlib.Path(__file__).parent / "data" / "bookSentences.tsv"


def load():
    out = {}
    with DATA.open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE):
            key = (r["volume"], int(r["lesson"]), r["german word"], int(r["occurrence"]))
            out[key] = (r["book sentence"], r["english"])
    return out


def cells_of(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def row(cells):
    return "| " + " | ".join(cells) + " |"


def main():
    write = "--write" in sys.argv
    book = load()
    lines = MD.read_text(encoding="utf-8").split("\n")
    out = []
    volume = lesson = header = None
    seen, used = {}, set()
    header_added = None
    for line in lines:
        m = re.match(r"^# ([AB][12]\.\d)\b", line)
        if m:
            volume = m.group(1)
        m = re.match(r"^## [AB][12]\.\d · (Intro|Lesson (\d+))", line)
        if m:
            lesson = 0 if m.group(1) == "Intro" else int(m.group(2))
        if line.startswith("| German word"):
            header = [c.lower() for c in cells_of(line)]
            wants = any(k[0] == volume and k[1] == lesson for k in book)
            if wants and "example sentence" not in header:
                at = header.index("word type") + 1
                header.insert(at, "example sentence")
                c = cells_of(line); c.insert(at, "Example sentence"); line = row(c)
                header_added = at
            else:
                header_added = None
            out.append(line)
            continue
        if line.startswith("|") and header:
            c = cells_of(line)
            changed = header_added is not None
            if changed:
                c.insert(header_added, "---" if re.match(r"^:?-+$", c[0]) else "-")
            if not re.match(r"^:?-+$", c[0]):
                k = (volume, lesson, c[0])
                seen[k] = seen.get(k, 0) + 1
                hit = book.get((volume, lesson, c[0], seen[k]))
                if hit:
                    r = dict(zip(header, c))
                    r["example sentence"], r["app example"], r["app example english"] = hit[0], "-", hit[1]
                    c = [r[h] for h in header]
                    used.add((volume, lesson, c[0], seen[k]))
                    changed = True
            if changed:
                line = row(c) if not re.match(r"^:?-+$", c[0]) else "|" + "|".join(c) + "|"
        elif not line.startswith("|"):
            header_added = None if not line.strip() else header_added
        out.append(line)
    missing = sorted(set(book) - used)
    print(f"{len(used)} words now use the book's sentence; not found: {len(missing)}")
    for k in missing[:20]:
        print("  not found:", k)
    if write:
        backup = MD.with_name(MD.name + ".before-book-sentences")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(out), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
