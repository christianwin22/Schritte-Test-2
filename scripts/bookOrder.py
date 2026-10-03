#!/usr/bin/env python3
"""
Every lesson in the order of the book's Lernwortschatz.

    python3 scripts/bookOrder.py           # check, show what would change
    python3 scripts/bookOrder.py --write   # rewrite the .md (a backup is kept)

The word list grouped each lesson into topic tables. scripts/data/bookOrder.tsv
lists every lesson's words in the order the book prints them (read off the
LWS pages of the Kursbuch PDFs). This merges each lesson's tables into one
table in that order. Words the list added from "Basic" are not in the book
and stay at the end of their lesson. A1.2 Lesson 8 is left alone
(scripts/lesson8BookOrder.py already did it).

The group name of the merged table is the lesson's two biggest topics, so
the lesson subtitle in the app stays the same. Word ids do not depend on
order, so nobody's progress changes.

Run scripts/importVocabulary.py afterwards.
"""
import csv
import pathlib
import re
import shutil
import sys
from collections import Counter

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
ORDER = pathlib.Path(__file__).parent / "data/bookOrder.tsv"

COLUMNS = [
    "German word (singular)", "Plural", "English meaning", "Word type", "Example sentence",
    "Singular example", "Singular example English", "Plural example", "Plural example English",
    "Accusative example", "Accusative example English", "Present tense", "Simple past",
    "Present perfect", "App example", "App example English",
]


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write: bool):
    order = {}
    with ORDER.open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            order.setdefault((r["volume"], r["lesson"]), []).append(r["word"])

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, i, done = [], 0, 0
    while i < len(lines):
        m = re.match(r"^## ([AB][12]\.\d) · (Intro|Lesson \d+)\b", lines[i])
        key = (m.group(1), m.group(2)) if m else None
        if key not in order:
            out.append(lines[i])
            i += 1
            continue
        end = next((j for j in range(i + 1, len(lines)) if re.match(r"^#{1,2} ", lines[j])), len(lines))

        rows, groups, notes, header, group = {}, Counter(), [], None, None
        for line in lines[i + 1:end]:
            g = re.match(r"^### (.*?)(?:\s*—\s*\d+)?\s*$", line)
            if g:
                group = g.group(1).split("—")[0].strip()
            elif line.startswith("|"):
                c = cells(line)
                if c[0].lower().startswith("german word"):
                    header = c
                elif not re.match(r"^:?-+$", c[0]):
                    if c[0] in rows:
                        sys.exit(f"{key}: {c[0]} twice")
                    rows[c[0]] = dict(zip(header, c))
                    groups[group] += 1
            elif line.strip():
                notes.append(line)

        want = order[key]
        if sorted(want) != sorted(rows):
            sys.exit(f"{key}: order list and lesson differ\n"
                     f"  not in lesson: {[w for w in want if w not in rows]}\n"
                     f"  not in order:  {[w for w in rows if w not in want]}")
        if any(h not in COLUMNS for r in rows.values() for h in r):
            sys.exit(f"{key}: unknown column")

        name = " · ".join(g for g, _ in groups.most_common(2) if g)
        out += [lines[i], "", "*In the order of the book's Lernwortschatz.*", ""]
        out += [f"### {name} — {len(want)}", ""] if name else []
        out += ["| " + " | ".join(COLUMNS) + " |", "|" + "|".join(["---"] * len(COLUMNS)) + "|"]
        out += ["| " + " | ".join(rows[w].get(c, "-") for c in COLUMNS) + " |" for w in want]
        out += [""] + [n for n in notes if n != "*In the order of the book's Lernwortschatz.*"] + [""]
        i, done = end, done + 1

    if done != len(order):
        sys.exit(f"only {done} of {len(order)} lessons found")
    if not write:
        print(f"OK: {done} lessons, {sum(map(len, order.values()))} words would be put in book order")
        return
    backup = SOURCE.with_name(SOURCE.name + ".before-book-order")
    if not backup.exists():
        shutil.copy2(SOURCE, backup)
    SOURCE.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")
    print(f"Written ({done} lessons). Backup: {backup.name}")


if __name__ == "__main__":
    main("--write" in sys.argv)
