#!/usr/bin/env python3
"""
Add English for the Nominative and Accusative example sentences.

    python3 scripts/addSentenceEnglish.py           # show what would change
    python3 scripts/addSentenceEnglish.py --write   # rewrite the .md

Two new columns, each right after the sentence it translates:

  Singular example English     Der Tisch ist neu.      → The table is new.
                               Das ist der Tisch.      → This is the table.
                               Hier ist der Tisch.     → Here is the table.
                               Wo ist der Tisch?       → Where is the table?
                               Der Tisch gefällt mir.  → I like the table.

  Accusative example English   Ich mag den Tisch.      → I like the table.
                               Siehst du den Tisch?    → Do you see the table?
                               Kennst du den Tisch?    → Do you know the table?
                               Ich finde den Tisch gut.→ I think the table is good.

The English noun is the first meaning in "English meaning". Names (countries,
months, languages) take no "the": Switzerland is beautiful. Anything the rules
are unsure of is printed. Filled cells are left alone, so hand fixes survive.
"""
import pathlib
import re
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"

ADJECTIVES = {
    "schön": "beautiful", "gut": "good", "neu": "new", "wichtig": "important", "interessant": "interesting",
    "frei": "free", "kurz": "short", "sauber": "clean", "fertig": "ready", "perfekt": "perfect",
    "beliebt": "popular", "praktisch": "practical", "teuer": "expensive", "bequem": "comfortable",
    "tief": "deep", "prima": "great", "typisch": "typical", "ruhig": "quiet", "falsch": "wrong",
    "richtig": "right", "billig": "cheap", "toll": "great", "leicht": "easy", "alt": "old", "super": "great",
    "modern": "modern", "dunkel": "dark", "nett": "nice", "klein": "small", "kalt": "cold", "groß": "big",
    "lang": "long", "hell": "bright", "warm": "warm", "einfach": "simple", "schwer": "heavy", "bekannt": "well-known",
}
NOMINATIVE = [
    (r"^(Der|Die|Das) (.+) ist (\w+)\.$", lambda n, a: f"{cap(the(n))} is {ADJECTIVES.get(a, a)}."),
    (r"^Das ist (der|die|das) (.+)\.$", lambda n, a: f"This is {the(n)}."),
    (r"^Hier ist (der|die|das) (.+)\.$", lambda n, a: f"Here is {the(n)}."),
    (r"^Wo ist (der|die|das) (.+)\?$", lambda n, a: f"Where is {the(n)}?"),
    (r"^(Der|Die|Das) (.+) gefällt mir\.$", lambda n, a: f"I like {the(n)}."),
]
ACCUSATIVE = [
    (r"^Ich mag (den|die|das) (.+)\.$", lambda n, a: f"I like {the(n)}."),
    (r"^Siehst du (den|die|das) (.+)\?$", lambda n, a: f"Do you see {the(n)}?"),
    (r"^Kennst du (den|die|das) (.+)\?$", lambda n, a: f"Do you know {the(n)}?"),
    (r"^Ich finde (den|die|das) (.+) (\w+)\.$", lambda n, a: f"I think {the(n)} is {ADJECTIVES.get(a, a)}."),
]
COLUMNS = [
    ("singular example", "Singular example English", NOMINATIVE),
    ("accusative example", "Accusative example English", ACCUSATIVE),
]
# By German noun, where the first English meaning reads badly in a sentence.
GERMAN_OVERRIDES = {"Herr": "gentleman", "Frau": "woman", "Dame": "lady"}

notes = []


def cap(s: str) -> str:
    return s[0].upper() + s[1:] if s else s


# People named after their country are still "the": the Austrian, the Swiss person.
PEOPLE = {"Österreicher", "Österreicherin", "Schweizer", "Schweizerin", "Deutsche", "Deutscher"}
current_headword = ""


def the(noun: str) -> str:
    # Names take no article: Switzerland, January, Italian, Christmas. Abbreviations (TV),
    # things (ID card, T-shirt) and people (the German man) do.
    is_name = (
        noun[:1].isupper()
        and not noun.isupper()
        and current_headword not in PEOPLE
        and not re.search(r"\b(man|woman|person|card)\b|-", noun)
    )
    return noun if is_name else f"the {noun}"


def english_noun(meaning: str) -> str:
    first = re.split(r"<br>", meaning)[0]
    first = re.sub(r"^\s*\d+\.\s*", "", first)
    first = re.sub(r"\([^)]*\)", "", first)
    first = first.split(",")[0].split(";")[0].split("/")[0].strip()
    first = re.sub(r"^(the|a|an)\s+", "", first, flags=re.I)
    if re.search(r"[.!?]|^to ", first):
        notes.append(f"odd meaning: {first}")
    return first


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write=False):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, header = [], None
    filled = {c[1]: 0 for c in COLUMNS}
    missing = []
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
            for after, name, _ in COLUMNS:
                if name.lower() not in header:
                    row.insert(header.index(after) + 1, name)
                    header = [c.lower() for c in row]
            out.append("| " + " | ".join(row) + " |")
            continue
        if re.match(r"^:?-+:?$", row[0]):
            out.append("|" + "|".join(["---"] * (len(header) if header else len(row))) + "|")
            continue
        if not header:
            out.append(line)
            continue
        # insert the new cells where the header grew
        for after, name, _ in COLUMNS:
            at = header.index(name.lower())
            if len(row) < len(header):
                row.insert(at, "-")
        data = dict(zip(header, row))
        headword = re.sub(r"^((der|die|das)\s*/?\s*)+", "", data.get("german word (singular)", "")).strip()
        headword = re.sub(r"\([^)]*\)", "", headword).strip()
        global current_headword
        current_headword = headword
        noun = GERMAN_OVERRIDES.get(headword) or english_noun(data.get("english meaning", ""))
        for after, name, frames in COLUMNS:
            at = header.index(name.lower())
            german = data.get(after, "-")
            if row[at] not in ("", "-") or german in ("", "-"):
                continue
            english = ""
            for pattern, make in frames:
                m = re.match(pattern, german)
                if m and noun:
                    adj = m.group(3) if (m.lastindex or 0) >= 3 else ""
                    english = make(noun, adj)
                    break
            if english:
                row[at] = english
                filled[name] += 1
                if len(samples) < 14:
                    samples.append(f"{german:32} {english}")
            else:
                missing.append(f"{name}: {german}")
        out.append("| " + " | ".join(row) + " |")

    print("filled:", filled)
    for s in samples:
        print("  ", s)
    print(f"\nto check ({len(set(notes))}):")
    for n in sorted(set(notes)):
        print("  ", n)
    print(f"\nnot filled ({len(missing)}):")
    for m in missing:
        print("  ", m)

    if write:
        backup = SOURCE.with_suffix(".md.before-sentence-english")
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"backup: {backup.name}")
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"written: {SOURCE.name}")


main(write="--write" in sys.argv)
