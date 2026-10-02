#!/usr/bin/env python3
"""
Real plural sentences, and English for every example.

    python3 scripts/addPluralExamples.py           # check and show what would change
    python3 scripts/addPluralExamples.py --write   # rewrite the .md (a backup is kept)

Words shows a plural card its own sentence. Those came from a handful of
frames ("Das sind die Chefs.", "Die Chefinnen sind frei."), so card after card
looked the same. scripts/data/pluralExamples.tsv has a sentence of its own for
each plural (word id, German, English); it fills Plural example and Plural
example English. The Plural drill blanks the plural in the same sentence, so
every one must contain the plural exactly as the list writes it.

scripts/data/exampleEnglish.tsv (word id, English) fills App example English
for the sentences that had none.

Run scripts/importVocabulary.py afterwards.
"""
import json
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
GENERATED = HERE.parent / "src/data/vocabulary.generated.json"


def load(name, width):
    path = HERE / "data" / name
    out = {}
    if not path.exists():
        return out
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        parts = [p.strip() for p in line.split("\t")]
        if len(parts) != width:
            sys.exit(f"{name}:{n}: expected {width} columns")
        if parts[0] in out:
            sys.exit(f"{name}:{n}: {parts[0]} twice")
        out[parts[0]] = parts[1:]
    return out


def main(write: bool):
    plurals = load("pluralExamples.tsv", 3)
    english = load("exampleEnglish.tsv", 2)
    words = json.loads(GENERATED.read_text(encoding="utf-8"))
    ids = [w["id"] for w in words]
    by_id = {w["id"]: w for w in words}

    problems = []
    for word_id, (german, _) in plurals.items():
        word = by_id.get(word_id)
        if not word:
            problems.append(f"{word_id}: no such word")
            continue
        plural = (word.get("nounDetails") or {}).get("pluralAlternatives") or [""]
        bare = re.sub(r"^die\s+", "", plural[0], flags=re.I).strip()
        if not bare or not re.search(rf"(?<!\w){re.escape(bare)}(?!\w)", german, re.I):
            problems.append(f"{word_id}: '{bare}' is not in “{german}”")
    for word_id in english:
        if word_id not in by_id:
            problems.append(f"{word_id}: no such word")
    seen = {}
    for word_id, (german, _) in plurals.items():
        if german in seen:
            problems.append(f"{word_id}: same sentence as {seen[german]}")
        seen[german] = word_id
    if problems:
        sys.exit("\n".join(problems))

    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    header, row_index, changed, out = None, 0, 0, []
    for line in lines:
        if re.match(r"^#{1,3} ", line):
            header = None
        if not line.startswith("|"):
            out.append(line)
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells[0].lower().startswith("german word"):
            header = [c.lower() for c in cells]
            out.append(line)
            continue
        if re.match(r"^:?-+$", cells[0]) or not header:
            out.append(line)
            continue
        word_id = ids[row_index]
        row_index += 1
        before = list(cells)
        if word_id in plurals:
            cells[header.index("plural example")], cells[header.index("plural example english")] = plurals[word_id]
        if word_id in english:
            cells[header.index("app example english")] = english[word_id][0]
        if cells != before:
            changed += 1
            out.append("| " + " | ".join(cells) + " |")
        else:
            out.append(line)

    if row_index != len(ids):
        sys.exit(f"Row count {row_index} does not match the word list ({len(ids)}). Nothing written.")
    print(f"{len(plurals)} plural sentences, {len(english)} English lines — {changed} rows change.")
    if write:
        backup = SOURCE.with_name(SOURCE.name + ".before-plural-sentences")
        if not backup.exists():
            shutil.copy2(SOURCE, backup)
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"Written. Backup: {backup.name}")


if __name__ == "__main__":
    main("--write" in sys.argv)
