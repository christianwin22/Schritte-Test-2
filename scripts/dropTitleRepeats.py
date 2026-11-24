#!/usr/bin/env python3
"""
A lesson's title card goes when the same word is a card later in that lesson
(Chris, 2026-11-23: "Feste" is just the plural of das Fest, which comes later).

    python3 scripts/dropTitleRepeats.py           # show what would go
    python3 scripts/dropTitleRepeats.py --write   # rewrite the .md (a backup is kept)

A title repeats a word when it equals that word's singular or plural (article
dropped, case ignored), e.g. Freizeit = die Freizeit, Feste = die Feste.
Titles that only match a word of another lesson stay.

Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import re
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"


def norm(s):
    return re.sub(r"^(der|die|das)\s+", "", s.strip().lower())


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")

    # group row indexes by lesson
    lessons, level, key = {}, None, None
    for i, line in enumerate(lines):
        m = re.match(r"^# ([AB][12])\.\d", line)
        if m:
            level = m.group(1)
        m = re.match(r"^## [AB][12]\.\d · (Intro|Lesson (\d+))", line)
        if m:
            key = f"{level}_{0 if m.group(1) == 'Intro' else int(m.group(2))}"
        if key and line.startswith("|") and not line.startswith("| German word"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) > 3 and not re.match(r"^:?-+$", cells[0]):
                lessons.setdefault(key, []).append((i, cells))

    drop = []
    for key, rows in lessons.items():
        forms = set()
        for _, cells in rows:
            if cells[3] != "Title":
                forms.add(norm(cells[0]))
                if cells[1] not in ("-", ""):
                    forms.add(norm(cells[1]))
        for i, cells in rows:
            if cells[3] == "Title" and norm(cells[0]) in forms:
                drop.append(i)
                print(f"{key}: drop title card „{cells[0]}“")

    print(f"{len(drop)} title cards dropped")
    if write and drop:
        backup = MD.with_name(MD.name + ".before-title-repeats")
        if not backup.exists():
            shutil.copy(MD, backup)
        out = [l for i, l in enumerate(lines) if i not in set(drop)]
        MD.write_text("\n".join(out), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
