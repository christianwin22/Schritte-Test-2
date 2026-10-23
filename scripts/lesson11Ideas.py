#!/usr/bin/env python3
"""
Chris's Lesson 11 ideas of 2026-10-23 (A1.2 Lesson 11, LWS 41–44).

    python3 scripts/lesson11Ideas.py           # show what would change
    python3 scripts/lesson11Ideas.py --write   # rewrite the .md (a backup is kept)

1. Lesson 11 in the book's order (LWS 41–43, read off the Kursbuch pages).
   The words of the "In der Stadt" picture (LWS 44) that the list is not
   already teaching come after the book's words, in the picture's order —
   der Platz too, which had slipped in after die Tankstelle.
2. English meanings (only that column; word ids do not move): Werkstatt takes
   workshop first, S-Bahn is a (suburban) train, Autobahn is highway first and
   takes road, selbst is self first, fremd is only strange, Bahnhof is train
   station first, Station / Geschäft / ausleihen keep one meaning, achten
   takes notice, Fahrplan is itinerary first. Gleis stays "track, platform"
   (Chris put track first again).
3. unterwegs: the book's sentence "Meine Person ist viel unterwegs." in
   English is "I travel a lot."
4. Every lesson: a job or person word that is the same in English for a man
   and a woman says so in brackets — "customer (male)", "customer (female)".
   (m), (m.), (f), (f.) become (male), (female). Pairs that English already
   tells apart (waiter / waitress) stay as they are.

scripts/data/bookOrder.tsv gets the same Lesson 11 order. Run
scripts/importVocabulary.py afterwards.
"""
import json
import pathlib
import re
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
ROOT = pathlib.Path(__file__).parent
ORDER = ROOT / "data/bookOrder.tsv"
SENTENCES = ROOT / "data/bookSentences.tsv"
GENERATED = ROOT.parent / "src/data/vocabulary.generated.json"
HEADING = "## A1.2 · Lesson 11"

BOOK_ORDER = [
    "In der Stadt unterwegs",
    # LWS 41
    "die Werkstatt", "die Apotheke", "die S-Bahn", "die Autobahn", "die Tankstelle", "die Brücke",
    "die Ampel", "rechts", "geradeaus", "links", "selbst", "zumachen", "der Weg", "schnell",
    "bedeuten", "okay", "der Bahnhof", "die Metzgerei", "die Schule", "der Kindergarten",
    "die Post", "die Nähe", "fremd", "fliegen", "das Flugzeug", "die Straßenbahn", "das Taxi",
    # LWS 42
    "wohin", "weit", "der Hauptbahnhof", "die Station", "der Lkw", "stehen", "der Kiosk",
    "die Buchhandlung", "sitzen", "die Bücherei", "die Bäckerei", "der Baum", "die Bank",
    "an", "auf", "hinter", "über", "unter", "zwischen", "neben", "die Fußgängerzone",
    "holen", "das Geschäft",
    # LWS 43
    "die Konferenz", "das Stadion", "der Kunde", "die Kundin", "kopieren", "die DVD",
    "ausleihen", "(da) vorne", "(da) hinten", "(da) drüben", "die Ecke", "unterwegs",
    "abfahren", "das Gleis", "einsteigen", "die Verspätung", "ankommen", "umsteigen",
    "aussteigen", "direkt", "der Schalter", "der Bahnsteig", "achten", "die Durchsage",
    "der Anschluss", "hin und zurück", "der Fahrplan",
    # LWS 44, the "In der Stadt" picture: the ones not taught above
    "das Museum", "die Straße", "der Fußballplatz", "der Supermarkt", "das Kino", "das Hotel",
    "der Platz",
]

# (German word, old English) → new English, Lesson 11 only
MEANINGS = {
    ("die Werkstatt", "garage, repair shop"): "workshop, garage, repair shop",
    ("die S-Bahn", "suburban train"): "(suburban) train [suburban train]",
    ("die Autobahn", "motorway"): "highway, motorway, road",
    ("selbst", "1. oneself<br>2. personally"): "1. self, oneself<br>2. personally",
    ("fremd", "1. strange<br>2. not from here"): "strange",
    ("der Bahnhof", "railway station"): "train station, railway station",
    ("die Station", "1. stop<br>2. station"): "station",
    ("das Geschäft", "1. shop<br>2. business"): "shop",
    ("ausleihen", "1. to borrow<br>2. to lend out"): "to borrow",
    ("achten", "to pay attention"): "to pay attention, to notice",
    ("der Fahrplan", "timetable"): "itinerary, timetable",
}

# unterwegs: the English of its book sentence (column "App example English")
SENTENCE_ENGLISH = ("unterwegs", "My person is out and about a lot.", "I travel a lot.")

TAG = re.compile(r"\s*\((?:m|m\.|male|f|f\.|female)\)")
MALE_TAG = "(male)"
FEMALE_TAG = "(female)"


def cells_of(line):
    return line.split(" | ")


def german(line):
    return line[2:].split(" | ")[0].strip() if line.startswith("| ") else None


def core(english):
    return TAG.sub("", english).strip()


def tagged(english, tag):
    """Every sense gets the tag: "1. employee<br>2. colleague" → each line ends in (male)."""
    return "<br>".join(f"{part} {tag}" for part in english.split("<br>"))


def gender_pairs():
    """(volume, lesson, der-word, die-word) for each man/woman pair the app has, from the built data."""
    words = json.loads(GENERATED.read_text(encoding="utf-8"))
    plain = str.maketrans("äöüÄÖÜ", "aouAOU")
    pairs = set()
    nouns = {}
    for w in words:
        if w["partOfSpeech"] == "noun":
            nouns.setdefault((w["volume"], w["lektion"]), []).append(w)
    for (volume, lesson), ws in nouns.items():
        for f in ws:
            if not (f["display"].startswith("die ") and f["lemma"].endswith("in")):
                continue
            stem = f["lemma"][:-2].translate(plain).lower()
            for m in ws:
                if not m["display"].startswith("der "):
                    continue
                base = m["lemma"].translate(plain).lower()
                if stem in (base, base[:-1]) or (stem.startswith(base[:-1]) and len(stem) - len(base) <= 1 and base[:3] == stem[:3] and base.endswith("e")):
                    pairs.add((volume, lesson, m["display"], f["display"]))
    return pairs


def lesson_spans(lines):
    """(volume, lesson number) → (first line, end line) of its section."""
    spans, current = {}, None
    for i, l in enumerate(lines):
        m = re.match(r"## (A\d\.\d|B\d\.\d) · (?:Lesson (\d+)|Intro)", l)
        if l.startswith("## "):
            if current:
                spans[current] = (spans[current], i)
            current = (m.group(1), int(m.group(2) or 0)) if m else None
            if current:
                spans[current] = i
    if current:
        spans[current] = (spans[current], len(lines))
    return spans


def main():
    write = "--write" in sys.argv
    lines = MD.read_text(encoding="utf-8").split("\n")
    spans = lesson_spans(lines)
    start, end = spans[("A1.2", 11)]

    # 2. + 3. meanings and the sentence, Lesson 11 only
    done = {k: 0 for k in MEANINGS}
    for i in range(start, end):
        c = cells_of(lines[i])
        if not lines[i].startswith("| ") or len(c) < 16:
            continue
        key = (german(lines[i]), c[2].strip())
        if key in MEANINGS:
            print(f"{key[0]}: {key[1]}  →  {MEANINGS[key]}")
            c[2] = MEANINGS[key]
            done[key] += 1
        # the last cell keeps the row's closing " |"
        if german(lines[i]) == SENTENCE_ENGLISH[0] and c[15].rstrip(" |") == SENTENCE_ENGLISH[1]:
            c[15] = SENTENCE_ENGLISH[2] + " |"
            print(f"unterwegs sentence: {SENTENCE_ENGLISH[1]}  →  {SENTENCE_ENGLISH[2]}")
        lines[i] = " | ".join(c)
    for k, n in done.items():
        if n != 1:
            print(f"found {n}× (already changed?): {k}")

    # 4. man / woman pairs, every lesson
    changed = 0
    for volume, lesson, der, die in sorted(gender_pairs()):
        a, b = spans[(volume, lesson)]
        rows = {german(lines[i]): i for i in range(a, b) if german(lines[i]) in (der, die)}
        if len(rows) != 2:
            continue
        cm, cf = cells_of(lines[rows[der]]), cells_of(lines[rows[die]])
        em, ef = core(cm[2].strip()), core(cf[2].strip())
        # same English for both, or the woman's is the man's cut short (caretaker / caretaker, janitor)
        if em != ef and not em.startswith(ef + ","):
            continue
        new_m, new_f = tagged(em, MALE_TAG), tagged(em, FEMALE_TAG)
        if cm[2].strip() == new_m and cf[2].strip() == new_f:
            continue
        print(f"{volume} L{lesson}: {der} | {cm[2].strip()} → {new_m}   ·   {die} | {cf[2].strip()} → {new_f}")
        cm[2], cf[2] = new_m, new_f
        lines[rows[der]], lines[rows[die]] = " | ".join(cm), " | ".join(cf)
        changed += 1
    print(f"{changed} pairs tagged")

    # 1. Lesson 11 order
    block = lines[start:end]
    rows = [l for l in block if german(l) and not l.startswith("| German word")]
    found = [german(l) for l in rows]
    if sorted(found) != sorted(BOOK_ORDER):
        sys.exit(f"Lesson 11 words differ from the book list: only list {set(found) - set(BOOK_ORDER)}, only book {set(BOOK_ORDER) - set(found)}")
    by_word = {german(l): l for l in rows}
    first = next(i for i, l in enumerate(block) if l in rows)
    last = max(i for i, l in enumerate(block) if l in rows)
    block[first:last + 1] = [by_word[w] for w in BOOK_ORDER]
    lines[start:end] = block
    print("Lesson 11 now in book order")

    order = ORDER.read_text(encoding="utf-8").split("\n")
    lesson = [i for i, l in enumerate(order) if l.startswith("A1.2\tLesson 11\t")]
    order[lesson[0]:lesson[-1] + 1] = [f"A1.2\tLesson 11\t{w}" for w in BOOK_ORDER[1:]]

    sentences = SENTENCES.read_text(encoding="utf-8").replace(
        f"\tunterwegs\t1\tMeine Person ist viel unterwegs.\t{SENTENCE_ENGLISH[1]}",
        f"\tunterwegs\t1\tMeine Person ist viel unterwegs.\t{SENTENCE_ENGLISH[2]}",
    )

    if write:
        backup = MD.with_name(MD.name + ".before-lesson11-ideas")
        if not backup.exists():
            shutil.copy(MD, backup)
        MD.write_text("\n".join(lines), encoding="utf-8")
        ORDER.write_text("\n".join(order), encoding="utf-8")
        SENTENCES.write_text(sentences, encoding="utf-8")
        print("written")


if __name__ == "__main__":
    main()
