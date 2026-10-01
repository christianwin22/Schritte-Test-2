#!/usr/bin/env python3
"""
Give every word its own example sentence in Words, with its English.

    python3 scripts/addWordExamples.py           # show what would change
    python3 scripts/addWordExamples.py --write   # rewrite the .md (a backup is kept)

1,184 nouns had no sentence of their own, so Words showed them the drill
sentence — and the drill sentences come from a handful of frames ("Hier ist
der …", "Wo ist der …?", "… gefällt mir."). Seen one after another, every word
looked the same. scripts/data/wordExamples.tsv has a sentence written for each
of them that shows how the word is really used, and its English.

This fills the App example column for those rows and adds an
"App example English" column to every table. Rows that already had a textbook
or app sentence are left as they were.

Run scripts/importVocabulary.py afterwards.
"""
import json
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).resolve().parent
SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
DATA = HERE / "data/wordExamples.tsv"
GENERATED = HERE.parent / "src/data/vocabulary.generated.json"
NEW_COLUMN = "App example English"


def load_sentences():
    out = {}
    for line in DATA.read_text(encoding="utf-8").splitlines():
        if line.strip():
            word_id, german, english = line.split("\t")
            out[word_id] = (german.strip(), english.strip())
    return out


def main(write: bool):
    sentences = load_sentences()
    # The word list's rows come out of the importer in file order, so row n is word n.
    ids = [w["id"] for w in json.loads(GENERATED.read_text(encoding="utf-8"))]
    lines = SOURCE.read_text(encoding="utf-8").splitlines()

    header = None
    row_index = 0
    changed = 0
    out = []
    for line in lines:
        if re.match(r"^#{1,3} ", line):
            header = None
        if not line.startswith("|"):
            out.append(line)
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells[0].lower().startswith("german word"):
            header = [c.lower() for c in cells]
            if NEW_COLUMN.lower() not in header:
                at = header.index("app example") + 1
                cells.insert(at, NEW_COLUMN)
                header = [c.lower() for c in cells]
            out.append("| " + " | ".join(cells) + " |")
            continue
        if re.match(r"^:?-+$", cells[0]):
            if header and len(cells) < len(header):
                cells.insert(header.index(NEW_COLUMN.lower()), "---")
            out.append("|" + "|".join(cells) + "|")
            continue
        if not header:
            out.append(line)
            continue
        app_at = header.index("app example")
        eng_at = header.index(NEW_COLUMN.lower())
        if len(cells) < len(header):
            cells.insert(eng_at, "-")
        word_id = ids[row_index]
        row_index += 1
        if word_id in sentences:
            german, english = sentences[word_id]
            if cells[app_at] != german or cells[eng_at] != english:
                changed += 1
                if not write and changed <= 5:
                    print(f"{word_id}: {german}  —  {english}")
            cells[app_at] = german
            cells[eng_at] = english
        out.append("| " + " | ".join(cells) + " |")

    if row_index != len(ids):
        sys.exit(f"Row count {row_index} does not match the word list ({len(ids)}). Nothing written.")
    print(f"{changed} rows get their own sentence.")
    if write:
        backup = SOURCE.with_name(SOURCE.name + ".before-word-examples")
        if not backup.exists():
            shutil.copy2(SOURCE, backup)
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"Written. Backup: {backup.name}")


if __name__ == "__main__":
    main("--write" in sys.argv)
