#!/usr/bin/env python3
"""
Card 1 of every lesson is the lesson's title (Chris, 2026-10-11).

    python3 scripts/lessonTitles.py           # show what would change
    python3 scripts/lessonTitles.py --write   # rewrite the .md (a backup is kept)

Adds one row, Word type `Title`, at the top of each lesson's table: the title
as the book prints it (src/data/bookLessonTitles.ts), its English, and a short
sentence of our own that names it. importVocabulary.py gives a Title row the id
"<volume>_<lesson>_title", so it can never take another word's id.

Also Chris's answers of the same day: mieten says what it is not (borrow),
verboten gets its real synonyms, der Einwohner also takes "resident".

Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import re
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
TITLES_TS = pathlib.Path(__file__).parent.parent / "src/data/bookLessonTitles.ts"

ENGLISH = {
    "A1_0": "my words in class",
    "A1_1": "Hello. My name is … [hello my name is]",
    "A1_2": "my family",
    "A1_3": "food and drink",
    "A1_4": "my flat [my apartment]",
    "A1_5": "my day",
    "A1_6": "free time [leisure, leisure time]",
    "A1_7": "lifelong learning (learning – a whole life long) [learning a life long, learning for life]",
    "A1_8": "job and work [work and job, profession and work]",
    "A1_9": "out and about (on the go) [on the go, on the way, on the road]",
    "A1_10": "health and illness [health and sickness]",
    "A1_11": "out and about in town [getting around town, on the go in the city, out and about in the city]",
    "A1_12": "customer service",
    "A1_13": "new clothes",
    "A1_14": "festivals [celebrations, parties]",
    "A2_1": "arriving [arrival]",
    "A2_2": "at home",
    "A2_3": "food and drink",
    "A2_4": "the world of work [world of work, working world, the working world]",
    "A2_5": "sport and fitness [sports and fitness]",
    "A2_6": "training and career [education and career, apprenticeship and career]",
    "A2_7": "festivals and presents [festivals and gifts, celebrations and gifts, celebrations and presents]",
    "A2_8": "at the weekend [on the weekend]",
    "A2_9": "my things [my stuff, my belongings]",
    "A2_10": "communication",
    "A2_11": "out and about (on the go) [on the go, on the way, on the road]",
    "A2_12": "travelling [travel, traveling]",
    "A2_13": "money",
    "A2_14": "stages of life [life stages]",
    "B1_1": "happiness in everyday life [everyday happiness, luck in everyday life]",
    "B1_2": "entertainment",
    "B1_3": "staying healthy [stay healthy]",
    "B1_4": "languages",
    "B1_5": "finding a job [find a job, finding work, find work]",
    "B1_6": "services [service]",
    "B1_7": "all about living (home and housing) [all about housing, all about the home]",
    "B1_8": "among colleagues [between colleagues]",
    "B1_9": "the virtual world [virtual world]",
    "B1_10": "advertising and consumption [advertising and consumerism]",
    "B1_11": "living together [together, togetherness]",
    "B1_12": "social engagement (volunteering) [social commitment, volunteering]",
    "B1_13": "from politics and history [politics and history]",
    "B1_14": "old and new home [old and new homeland, old home and new home]",
}

# Chris's answers of 2026-10-11: (German word, old English) → new English
FIXES = {
    ("mieten", "to rent, to hire"): "to rent, to hire (you pay; to borrow for free = leihen)",
    ("verboten (sein)", "forbidden"): "forbidden, prohibited [banned, not allowed]",
    ("der Einwohner", "inhabitant"): "inhabitant [resident]",
}


def titles():
    out = {}
    for key, title in re.findall(r"(\w+_\d+): '([^']*)'", TITLES_TS.read_text(encoding="utf-8")):
        out[key] = title
    return out


def sentence(key, title, english):
    shown = re.sub(r"\s*[\[(].*$", "", english)
    if key.endswith("_0"):
        return f"Die Seite heißt „{title}“.", f"The page is called “{shown}”."
    return f"Die Lektion heißt „{title}“.", f"The lesson is called “{shown}”."


def main():
    write = "--write" in sys.argv
    book = titles()
    lines = MD.read_text(encoding="utf-8").split("\n")
    out, level, key, added, fixed = [], None, None, 0, 0
    header = None
    for line in lines:
        m = re.match(r"^# ([AB][12])\.\d", line)
        if m:
            level = m.group(1)
        m = re.match(r"^## [AB][12]\.\d · (Intro|Lesson (\d+))", line)
        if m:
            key = f"{level}_{0 if m.group(1) == 'Intro' else int(m.group(2))}"
        if line.startswith("| German word"):
            header = [c.strip().lower() for c in line.strip().strip("|").split("|")]
        if line.startswith("|") and not line.startswith("| German word"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if cells and re.match(r"^:?-+$", cells[0]) and key:
                out.append(line)
                # first row under this lesson's header: the title goes here, once
                if key in book and f"| {book[key]} | - |" not in "\n".join(lines):
                    de, en = sentence(key, book[key], ENGLISH[key])
                    row = {h: "-" for h in header}
                    row.update({
                        "german word (singular)": book[key],
                        "english meaning": ENGLISH[key],
                        "word type": "Title",
                        "app example": de,
                        "app example english": en,
                    })
                    out.append("| " + " | ".join(row[h] for h in header) + " |")
                    added += 1
                key = None  # only the first table of a lesson
                continue
            if len(cells) > 2 and (cells[0], cells[2]) in FIXES:
                cells[2] = FIXES[(cells[0], cells[2])]
                line = "| " + " | ".join(cells) + " |"
                fixed += 1
        out.append(line)
    print(f"{added} title rows, {fixed} fixed rows")
    if write:
        backup = MD.with_name(MD.name + ".before-lesson-titles")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(out), encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
