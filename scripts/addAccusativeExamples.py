#!/usr/bin/env python3
"""
Add an "Accusative example" column to the word list, one sentence per noun.

    python3 scripts/addAccusativeExamples.py           # show what would change
    python3 scripts/addAccusativeExamples.py --write   # rewrite the .md

The column goes right after "Plural example" in every table. Each noun gets a
short sentence whose verb takes the accusative, with the accusative article in
front of the noun: den (der), die (die), das (das).

    der Tisch  → Ich mag den Tisch.
    die Frage  → Kennst du die Frage?
    das Bild   → Siehst du das Bild?

Masculine "weak" nouns change their own ending in the accusative too
(der Kollege → den Kollegen, der Herr → den Herrn). The script knows the usual
patterns and prints every one it changed, so they can be checked by eye.

Non-nouns get "-". Sentences already in the column are left alone, so the
script can be run again after hand edits.
"""
import pathlib
import random
import re
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
COLUMN = "Accusative example"
AFTER = "plural example"

ACCUSATIVE = {"der": "den", "die": "die", "das": "das"}

# Every verb here takes the accusative and fits almost any noun. No frame has
# a second article in it, so the blank is always the one in front of the noun.
FRAMES = [
    "Ich mag {art} {noun}.",
    "Siehst du {art} {noun}?",
    "Kennst du {art} {noun}?",
    "Ich finde {art} {noun} {adj}.",
]
FINDE_ADJECTIVES = ["gut", "schön", "interessant", "toll"]

# Masculine nouns that take -(e)n in the accusative, by what they end in.
WEAK_WORDS = {
    "herr": "Herrn", "mensch": "Menschen", "nachbar": "Nachbarn", "bauer": "Bauern",
    "held": "Helden", "prinz": "Prinzen", "bär": "Bären", "christ": "Christen",
    "fotograf": "Fotografen", "architekt": "Architekten", "pilot": "Piloten",
    "planet": "Planeten", "soldat": "Soldaten", "kandidat": "Kandidaten",
    "automat": "Automaten", "diplomat": "Diplomaten", "idiot": "Idioten",
    "demokrat": "Demokraten", "bürokrat": "Bürokraten", "astronaut": "Astronauten",
    "kamerad": "Kameraden", "graf": "Grafen", "paragraf": "Paragrafen",
}
NOT_WEAK = {"käse", "charme", "service", "cafe", "café", "moment", "kontinent", "akzent", "advent", "zement", "proviant", "twist", "mist"}


def accusative_noun(noun: str) -> str:
    low = noun.lower()
    # der Kaffee, der Tee, der See; ICE and other abbreviations; der Schafskäse
    if low in NOT_WEAK or low.endswith(("käse", "ee")) or noun.isupper():
        return noun
    for ending, form in WEAK_WORDS.items():
        if low.endswith(ending):
            return noun[: len(noun) - len(ending)] + (form if len(noun) == len(ending) else form.lower())
    if low.endswith("e"):
        return noun + "n"
    if len(low) >= 6 and low.endswith(("ist", "ant", "ent")):
        return noun + "en"
    return noun


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write=False):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, header, lesson = [], None, None
    added, weak = 0, []
    samples = []

    for line in lines:
        m = re.match(r"^## ([AB][12]\.\d) · (Intro|Lesson (\d+))", line)
        if m:
            lesson = (m.group(1), m.group(2))
            header = None
        if not line.startswith("|"):
            out.append(line)
            continue
        row = cells(line)

        if row[0].lower().startswith("german word"):
            header = [c.lower() for c in row]
            if COLUMN.lower() not in header:
                row.insert(header.index(AFTER) + 1, COLUMN)
                header = [c.lower() for c in row]
            out.append("| " + " | ".join(row) + " |")
            continue
        if re.match(r"^:?-+:?$", row[0]):
            # separator: one more "---" if the header grew
            want = len(header) if header else len(row)
            out.append("|" + "|".join(["---"] * want) + "|")
            continue
        if not header:
            out.append(line)
            continue

        at = header.index(COLUMN.lower())
        if len(row) < len(header):
            row.insert(at, "-")  # the column was just added
        data = dict(zip(header, row))

        if row[at] not in ("", "-"):
            out.append("| " + " | ".join(row) + " |")
            continue

        sentence = "-"
        display = data.get("german word (singular)", "")
        m2 = re.match(r"^((?:der|die|das)(?:\s*/\s*(?:der|die|das))*)\s+(.*)$", display)
        if data.get("word type", "").lower() == "noun" and m2:
            article = m2.group(1).split("/")[0].strip().lower()
            # "die Eltern (Pl.)" → "Eltern"; brackets are notes, not part of the word
            noun = re.sub(r"\s*\([^)]*\)", "", m2.group(2)).replace("(", "").replace(")", "").strip()
            noun = noun.split("/")[0].strip()
            if noun and not noun.endswith("-"):
                form = accusative_noun(noun) if article == "der" else noun
                if form != noun:
                    weak.append(f"der {noun} → den {form}")
                rng = random.Random(f"acc-{lesson}-{display}")
                frame = FRAMES[rng.randrange(len(FRAMES))]
                sentence = frame.format(art=ACCUSATIVE[article], noun=form, adj=rng.choice(FINDE_ADJECTIVES))
                added += 1
                if len(samples) < 10:
                    samples.append(f"{display:28} {sentence}")
        row[at] = sentence
        out.append("| " + " | ".join(row) + " |")

    print(f"accusative sentences: {added}")
    print("samples:")
    for s in samples:
        print("  ", s)
    print(f"weak nouns ({len(weak)}):")
    for w in sorted(set(weak)):
        print("  ", w)

    if write:
        backup = SOURCE.with_suffix(".md.before-accusative")
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"backup: {backup.name}")
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"written: {SOURCE.name}")


main(write="--write" in sys.argv)
