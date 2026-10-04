#!/usr/bin/env python3
"""
Every word the book lists in a lesson is in that lesson.

    python3 scripts/addBookWords.py           # check, show what would change
    python3 scripts/addBookWords.py --write   # rewrite the .md (a backup is kept)

The word list taught each word once, at its first lesson, and left it out of
later lessons that list it again ("Already taught earlier and not repeated
here"). Chris wants them back wherever the book has them — and the plural-only
nouns the list never had (die Eltern, die Leute …).

scripts/data/bookWordsAdded.tsv says, per lesson, which word goes in and after
which word (its place in the book's Lernwortschatz, read off the PDFs). A word
"from" another lesson is copied from there, unchanged; a "new" one comes from
scripts/data/bookWordsNew.tsv. scripts/data/bookOrder.tsv is updated to match.

Run scripts/importVocabulary.py afterwards.
"""
import csv
import pathlib
import re
import shutil
import sys
from collections import defaultdict

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
DATA = pathlib.Path(__file__).parent / "data"
ADDED, NEW, ORDER = DATA / "bookWordsAdded.tsv", DATA / "bookWordsNew.tsv", DATA / "bookOrder.tsv"


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def lesson_of(heading):
    m = re.match(r"^## ([AB][12]\.\d) · (Intro|Lesson \d+)\b", heading)
    return (m.group(1), m.group(2)) if m else None


def main(write: bool):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()

    # every row, by lesson, with its table's header
    rows_by_lesson = defaultdict(dict)
    lesson, header = None, None
    for line in lines:
        if line.startswith("## "):
            lesson = lesson_of(line)
        elif lesson and line.startswith("|"):
            c = cells(line)
            if c[0].lower().startswith("german word"):
                header = c
            elif not re.match(r"^:?-+$", c[0]):
                rows_by_lesson[lesson][c[0]] = dict(zip(header, c))

    new_rows = {r["German word (singular)"]: r for r in csv.DictReader(NEW.open(encoding="utf-8"), delimiter="\t")}
    adds = defaultdict(list)
    for r in csv.DictReader(ADDED.open(encoding="utf-8"), delimiter="\t"):
        key = (r["volume"], r["lesson"])
        if r["from"] == "new":
            row = new_rows[r["word"]]
        else:
            src, word = r["from"].split(" ", 1)
            vol, n = src.split("/")
            src_lesson = (vol, "Intro" if n == "0" else f"Lesson {n}")
            if word not in rows_by_lesson[src_lesson]:
                sys.exit(f"{key} {r['word']}: no '{word}' in {src_lesson}")
            row = rows_by_lesson[src_lesson][word]
        if row["German word (singular)"] in rows_by_lesson[key]:
            sys.exit(f"{key}: {row['German word (singular)']} is already there")
        adds[key].append((r["after"], r["book_position"], row))

    out, i, done = [], 0, 0
    while i < len(lines):
        key = lesson_of(lines[i]) if lines[i].startswith("## ") else None
        if key not in adds:
            out.append(lines[i])
            i += 1
            continue
        end = next((j for j in range(i + 1, len(lines)) if re.match(r"^#{1,2} ", lines[j])), len(lines))
        section = lines[i:end]
        tables = [j for j, l in enumerate(section) if l.startswith("| German word")]
        if len(tables) != 1:
            sys.exit(f"{key}: expected one table (run scripts/bookOrder.py first)")
        h = tables[0]
        header = cells(section[h])
        body_start = h + 2
        body_end = next((j for j in range(body_start, len(section)) if not section[j].startswith("|")), len(section))
        body = section[body_start:body_end]
        names = [cells(l)[0] for l in body]

        def place(after):
            if after == "(start)":
                return 0
            if after == "(end)":
                return len(names)
            if after not in names:
                sys.exit(f"{key}: no '{after}' to put a word after")
            return names.index(after) + 1

        # in book order, so words sharing an anchor keep the book's order too
        items = sorted(adds[key], key=lambda a: (place(a[0]), a[1]))
        # backwards, so each insert lands before the ones already placed after the same word
        for after, _, row in reversed([a for a in items if a[0] != "(end)"]):
            at = place(after)
            body.insert(at, "| " + " | ".join(row.get(c, "-") or "-" for c in header) + " |")
            names.insert(at, row["German word (singular)"])
        for _, _, row in [a for a in items if a[0] == "(end)"]:
            body.append("| " + " | ".join(row.get(c, "-") or "-" for c in header) + " |")
            names.append(row["German word (singular)"])

        count = len(body)
        heading = re.sub(r"— \d+$", f"— {count}", section[0])
        group = [re.sub(r"— \d+$", f"— {count}", l) if l.startswith("### ") else l for l in section[1:body_start]]
        tail = [l for l in section[body_end:] if "Already taught earlier" not in l]
        out += [heading] + group + body + tail
        rows_by_lesson[key]["__order__"] = names
        i, done = end, done + 1

    if done != len(adds):
        sys.exit(f"only {done} of {len(adds)} lessons found")

    # bookOrder.tsv: each changed lesson's list becomes its new table order
    order_rows = list(csv.DictReader(ORDER.open(encoding="utf-8"), delimiter="\t"))
    new_order, seen = [], set()
    for r in order_rows:
        key = (r["volume"], r["lesson"])
        if key in adds:
            if key not in seen:
                seen.add(key)
                new_order += [{"volume": key[0], "lesson": key[1], "word": w} for w in rows_by_lesson[key]["__order__"]]
        else:
            new_order.append(r)

    total = sum(len(v) for v in adds.values())
    if not write:
        print(f"OK: {total} words into {done} lessons")
        return
    backup = SOURCE.with_name(SOURCE.name + ".before-book-words")
    if not backup.exists():
        shutil.copy2(SOURCE, backup)
    SOURCE.write_text("\n".join(out).rstrip("\n") + "\n", encoding="utf-8")
    with ORDER.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["volume", "lesson", "word"], delimiter="\t", lineterminator="\n")
        w.writeheader()
        w.writerows(new_order)
    print(f"Written: {total} words into {done} lessons. Backup: {backup.name}")


if __name__ == "__main__":
    main("--write" in sys.argv)
