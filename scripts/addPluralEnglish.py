#!/usr/bin/env python3
"""
Add a "Plural example English" column: the English of every Plural example.

    python3 scripts/addPluralEnglish.py           # show what would change
    python3 scripts/addPluralEnglish.py --write   # rewrite the .md

The Plural examples all follow five patterns, so their English does too:

    Die Bilder sind neu.     → The pictures are new.
    Das sind die Bilder.     → These are the pictures.
    Hier sind die Bilder.    → Here are the pictures.
    Wo sind die Bilder?      → Where are the pictures?
    Die Bilder gefallen mir. → I like the pictures.

The English noun is the first meaning in "English meaning", made plural.
Anything unusual (irregular plurals, words that are plural already, uncountable
words) is printed so it can be checked. A sentence already in the column is
left alone, so hand corrections survive the next run.
"""
import pathlib
import re
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
COLUMN = "Plural example English"
AFTER = "plural example"

ADJECTIVES = {
    "schön": "beautiful", "gut": "good", "neu": "new", "wichtig": "important", "interessant": "interesting",
    "frei": "free", "kurz": "short", "sauber": "clean", "fertig": "ready", "perfekt": "perfect",
    "beliebt": "popular", "praktisch": "practical", "teuer": "expensive", "bequem": "comfortable",
    "tief": "deep", "prima": "great", "typisch": "typical", "ruhig": "quiet", "falsch": "wrong",
    "richtig": "right", "billig": "cheap", "toll": "great", "leicht": "easy", "alt": "old", "super": "great",
    "modern": "modern", "dunkel": "dark", "nett": "nice", "klein": "small", "kalt": "cold", "groß": "big",
    "lang": "long", "hell": "bright", "warm": "warm", "einfach": "simple", "schwer": "heavy", "bekannt": "well-known",
}
FRAMES = [
    (r"^Die (.+) sind (\w+)\.$", lambda p, a: f"The {p} are {ADJECTIVES.get(a, a)}."),
    (r"^Das sind die (.+)\.$", lambda p, a: f"These are the {p}."),
    (r"^Hier sind die (.+)\.$", lambda p, a: f"Here are the {p}."),
    (r"^Wo sind die (.+)\?$", lambda p, a: f"Where are the {p}?"),
    (r"^Die (.+) gefallen mir\.$", lambda p, a: f"I like the {p}."),
]

IRREGULAR = {
    "child": "children", "person": "people", "man": "men", "woman": "women", "foot": "feet", "tooth": "teeth",
    "mouse": "mice", "goose": "geese", "knife": "knives", "wife": "wives", "life": "lives", "leaf": "leaves",
    "half": "halves", "shelf": "shelves", "thief": "thieves", "wolf": "wolves", "loaf": "loaves", "scarf": "scarves",
    "potato": "potatoes", "tomato": "tomatoes", "hero": "heroes", "echo": "echoes", "fish": "fish", "sheep": "sheep",
    "deer": "deer", "series": "series", "species": "species", "crisis": "crises", "analysis": "analyses",
    "thesis": "theses", "phenomenon": "phenomena", "criterion": "criteria", "cactus": "cacti", "euro": "euros",
    "photo": "photos", "piano": "pianos", "radio": "radios", "video": "videos", "zoo": "zoos", "kilo": "kilos",
    "logo": "logos", "auto": "autos", "roof": "roofs", "chief": "chiefs", "belief": "beliefs", "safe": "safes",
    "stomach": "stomachs", "basis": "bases", "salesperson": "salespeople",
}
# These also change at the end of a longer word: housewife, grandchild.
IRREGULAR_ENDINGS = ["wife", "knife", "child", "tooth", "foot", "mouse", "leaf", "shelf", "thief"]
# Already plural in English, or no plural: left as it is.
UNCHANGED = {
    "people", "parents", "siblings", "grandparents", "clothes", "trousers", "jeans", "glasses", "scissors",
    "police", "news", "information", "advice", "furniture", "luggage", "baggage", "homework", "money",
    "weather", "music", "equipment", "knowledge", "research", "traffic", "hair", "rice", "bread", "milk",
    "cattle", "leggings", "shorts", "pyjamas", "tights", "earnings", "savings", "goods", "groceries",
    "stairs", "outskirts", "contents", "surroundings", "belongings", "premises", "holidays", "vacation",
    "studies", "winnings", "instructions", "congratulations", "statistics", "crossroads", "roadworks", "means",
    "customs",
}
# Whole English plurals chosen by hand, by German noun: where the rules can't know
# (an uncountable English word, a meaning that reads oddly in the plural).
GERMAN_OVERRIDES = {
    "Beratung": "consultations", "Hilfe": "forms of help", "Rest": "leftovers", "Arbeit": "jobs",
    "Rind": "cattle", "Brot": "loaves of bread", "Hausaufgabe": "homework assignments",
    "Forschung": "research projects", "Auskunft": "pieces of information", "Klimaanlage": "air conditioners",
    "Software": "software programs", "Weiterbildung": "training courses", "Training": "training sessions",
    "Besteck": "sets of cutlery", "Treppe": "staircases", "Schere": "pairs of scissors",
    "Hose": "pairs of trousers", "Jeans": "pairs of jeans", "Prozent": "percentages", "Planung": "plans",
    "Zeitpunkt": "points in time", "Baustelle": "construction sites", "Verkäufer": "salespeople",
    "Verkäuferin": "salespeople", "Zahl": "numbers", "Nummer": "numbers",
}

notes = []


def plural_word(word: str) -> str:
    low = word.lower()
    if low in UNCHANGED:
        notes.append(f"unchanged: {word}")
        return word
    if low in IRREGULAR:
        form = IRREGULAR[low]
        if form != low + "s":
            notes.append(f"irregular: {word} → {form}")
        return word[0] + form[1:] if word[0].isupper() else form
    for end in IRREGULAR_ENDINGS:
        if low.endswith(end) and low != end:
            notes.append(f"irregular ending: {word} → {word[: -len(end)] + IRREGULAR[end]}")
            return word[: -len(end)] + IRREGULAR[end]
    if re.search(r"(s|x|z|ch|sh)$", low):
        return word + "es"
    if re.search(r"[^aeiou]y$", low):
        return word[:-1] + "ies"
    if low.endswith("man") and not low.endswith(("human", "german", "roman")):
        notes.append(f"-man: {word} → {word[:-3]}men")
        return word[:-3] + "men"
    return word + "s"


def english_plural(meaning: str, plural_only: bool) -> str:
    first = re.split(r"<br>", meaning)[0]
    first = re.sub(r"^\s*\d+\.\s*", "", first)
    first = re.sub(r"\([^)]*\)", "", first)  # notes in brackets go first — they can hold commas
    first = first.split(",")[0].split(";")[0].split("/")[0].strip()
    first = re.sub(r"^(the|a|an)\s+", "", first, flags=re.I)
    if not first:
        return ""
    if plural_only:
        notes.append(f"plural-only: {first}")
        return first
    if first.endswith("-in-law"):
        return plural_word(first[: -len("-in-law")]) + "-in-law"  # fathers-in-law
    words = first.split()
    joint = next((w for w in ("of", "in") if w in words[1:]), None)
    if joint:
        i = words.index(joint)
        words[i - 1] = plural_word(words[i - 1])  # cup of coffee → cups of coffee, point in time
    else:
        words[-1] = plural_word(words[-1])
    return " ".join(words)


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write=False):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, header = [], None
    filled, missing = 0, []
    samples = []
    for line in lines:
        if re.match(r"^## ", line):
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
            out.append("|" + "|".join(["---"] * (len(header) if header else len(row))) + "|")
            continue
        if not header:
            out.append(line)
            continue
        at = header.index(COLUMN.lower())
        if len(row) < len(header):
            row.insert(at, "-")
        data = dict(zip(header, row))
        german = data.get("plural example", "-")
        if row[at] not in ("", "-") or german in ("", "-"):
            out.append("| " + " | ".join(row) + " |")
            continue
        plural_only = "(pl" in data.get("german word (singular)", "").lower()
        headword = re.sub(r"^((der|die|das)\s*/?\s*)+", "", data.get("german word (singular)", "")).strip()
        headword = re.sub(r"\([^)]*\)", "", headword).strip()
        noun = GERMAN_OVERRIDES.get(headword) or english_plural(data.get("english meaning", ""), plural_only)
        english = ""
        for pattern, make in FRAMES:
            m = re.match(pattern, german)
            if m and noun:
                adj = m.group(2) if m.lastindex and m.lastindex >= 2 else ""
                english = make(noun, adj)
                break
        if english:
            row[at] = english
            filled += 1
            if len(samples) < 12:
                samples.append(f"{german:34} {english}")
        else:
            missing.append(f"{data.get('german word (singular)')}: {german}")
        out.append("| " + " | ".join(row) + " |")

    print(f"filled: {filled}")
    print("samples:")
    for s in samples:
        print("  ", s)
    print(f"\nto check ({len(notes)}):")
    for n in sorted(set(notes)):
        print("  ", n)
    print(f"\nnot filled ({len(missing)}):")
    for m in missing:
        print("  ", m)

    if write:
        backup = SOURCE.with_suffix(".md.before-plural-english")
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"backup: {backup.name}")
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"written: {SOURCE.name}")


main(write="--write" in sys.argv)
