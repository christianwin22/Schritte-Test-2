#!/usr/bin/env python3
"""
Turn Chris's Deutsche_Meister_Vocabulary.md into the app's word list.

    python3 scripts/importVocabulary.py

Re-run it whenever the .md changes; src/data/vocabulary.generated.json is
overwritten and nothing is hand-edited. Word ids stay stable (volume + lesson
+ word), so review schedules survive a re-run.
"""
import json
import pathlib
import re
import sys
import unicodedata

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
OUT = pathlib.Path(__file__).resolve().parent.parent / "src/data/vocabulary.generated.json"

# A1.1 → level A1, lessons 1–7; A1.2 → level A1, lessons 8–14; same for A2, B1.
VOLUMES = {
    "A1.1": ("A1", "a11"), "A1.2": ("A1", "a12"),
    "A2.1": ("A2", "a21"), "A2.2": ("A2", "a22"),
    "B1.1": ("B1", "b11"), "B1.2": ("B1", "b12"),
}
ARTICLES = ("der", "die", "das")

# The app's PartOfSpeech only has these; everything else maps to the closest one.
POS = {
    "noun": "noun", "proper noun": "noun",
    "verb": "verb",
    "adjective": "adjective", "adj/adv": "adjective",
    "adverb": "adverb", "question word": "adverb",
    "preposition": "preposition",
}


def slug(text: str) -> str:
    text = text.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def read_rows():
    """Every table row, with its volume, lesson and group, read by each table's own header."""
    volume = lesson = group = header = None
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^# ([AB][12]\.\d)\b", line)
        if m:
            volume, header = m.group(1), None
            continue
        m = re.match(r"^## [AB][12]\.\d · (Intro|Lesson (\d+))", line)
        if m:
            lesson = 0 if m.group(1) == "Intro" else int(m.group(2))  # Intro is lesson 0
            group, header = None, None
            continue
        m = re.match(r"^### (.*?)(?:\s*—\s*\d+)?\s*$", line)
        if m:
            group, header = m.group(1).strip(), None
            continue
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if cells[0].lower().startswith("german word"):
            header = [c.lower() for c in cells]
            continue
        if re.match(r"^:?-+$", cells[0]) or not header:
            continue
        row = dict(zip(header, cells))
        row.update(volume=volume, lesson=lesson, group=group)
        yield row


def cell(row, key):
    value = (row.get(key) or "-").strip()
    return "" if value == "-" else value


def split_senses(english: str):
    """'1. woman<br>2. Mrs (title)' → [['woman'], ['Mrs (title)']]; commas stay inside a sense."""
    parts = [p.strip() for p in re.split(r"<br\s*/?>", english) if p.strip()]
    if len(parts) > 1 or re.match(r"^\s*1\.\s", english):
        parts = [re.sub(r"^\s*\d+\.\s*", "", p).strip() for p in parts]
    return [[w.strip() for w in re.split(r",", sense) if w.strip()] for sense in parts]


def bracket_forms(text: str):
    """
    Two kinds of brackets:
      "Kilo(gramm)"  — optional letters glued to the word → Kilo and Kilogramm
      "Kilo (kg)"    — a note after a space → dropped
    """
    without_notes = re.sub(r"\s+\([^)]*\)", "", text).strip()
    short = re.sub(r"\([^)]*\)", "", without_notes).strip()          # Kilo
    long = without_notes.replace("(", "").replace(")", "").strip()    # Kilogramm
    return [f for f in dict.fromkeys([short, long, without_notes]) if f]


def german_forms(display: str, pos: str):
    """What counts as a correct German answer, and the clean lemma to show."""
    word = display.replace("·", "")               # hin·fallen → hinfallen
    variants = []

    if pos == "noun":
        m = re.match(r"^((?:der|die|das)(?:\s*/\s*(?:der|die|das))*)\s+(.*)$", word)
        genders = [g.strip() for g in re.split(r"/", m.group(1))] if m else []
        rest = m.group(2) if m else word
        # brackets are optional when typing: "das Kilo(gramm) (kg)" → Kilo / Kilogramm
        lemmas = bracket_forms(rest)
        for g in genders or [""]:
            for lemma in lemmas:
                variants.append(f"{g} {lemma}".strip())
        return (lemmas[0] if lemmas else rest), genders, sorted(v for v in variants if v)

    forms = bracket_forms(word)
    variants.extend(forms)
    return (forms[0] if forms else word), [], sorted(set(variants))


BLANK = "{{blank}}"
ACCUSATIVE = {"der": "den", "die": "die", "das": "das"}


def blank_out_article(sentence: str, article: str, noun: str) -> str:
    """Blank the article that belongs to this noun, wherever it sits."""
    if not sentence or not article or not noun:
        return ""
    pattern = re.compile(
        rf"(?<!\w){re.escape(article)}(?=\s+{re.escape(noun)}(?!\w))", re.IGNORECASE
    )
    blanked, count = pattern.subn(BLANK, sentence, count=1)
    if count:
        return blanked
    # No noun directly after it (a compound, a bracketed form): fall back.
    return blank_out(sentence, article)


def blank_out(sentence: str, target: str) -> str:
    """Replace the first standalone `target` in `sentence` with the blank marker."""
    if not sentence or not target:
        return ""
    pattern = re.compile(rf"(?<!\w){re.escape(target)}(?!\w)", re.IGNORECASE)
    blanked, count = pattern.subn(BLANK, sentence, count=1)
    return blanked if count else ""


def main():
    if not SOURCE.exists():
        sys.exit(f"source not found: {SOURCE}")

    words, seen_ids, skipped = [], set(), 0
    for row in read_rows():
        display = cell(row, "german word (singular)")
        english = cell(row, "english meaning")
        if not display or not english:
            skipped += 1
            continue
        volume = row["volume"]
        level, vol_slug = VOLUMES[volume]
        lesson = row["lesson"]
        # A1.2 lessons are already numbered 8–14 in the file, so the number is used as-is.
        word_type = cell(row, "word type").lower()
        pos = POS.get(word_type, "phrase")
        lemma, genders, answers = german_forms(display, pos)

        base_id = f"{vol_slug}_{'intro' if lesson == 0 else f'l{lesson}'}_{slug(lemma) or slug(display)}"
        word_id = base_id
        n = 2
        while word_id in seen_ids:
            word_id, n = f"{base_id}_{n}", n + 1
        seen_ids.add(word_id)

        plural_display = cell(row, "plural")
        plural_variants = [p.strip() for p in plural_display.split("/") if p.strip()]
        # what Learn shows: the textbook sentence, else the app example, else (nouns) the singular example
        sentence = cell(row, "example sentence") or cell(row, "app example") or cell(row, "singular example")

        entry = {
            "id": word_id,
            "display": display,                      # exactly as written in the .md
            "lemma": lemma,
            "translation": english,                  # full text, shown after answering
            "senses": split_senses(english),         # for the two answer boxes
            "level": level,
            "volume": volume,
            "lektion": lesson,
            "category": row.get("group") or None,
            "partOfSpeech": pos,
            "wordType": cell(row, "word type"),
            "isStem": display.rstrip().endswith("-"),
            "answers": answers,                      # accepted German answers (EN → DE)
            "exampleSentences": [{"id": f"{word_id}_ex", "german": sentence, "english": ""}] if sentence else [],
        }
        if sentence:
            entry["sentence"] = sentence
        if genders:
            entry["nounDetails"] = {
                "gender": genders[0],
                "genderAlternatives": genders,
                "plural": plural_display,
                "pluralAlternatives": plural_variants,
            }
            singular_example = cell(row, "singular example")
            plural_example = cell(row, "plural example")
            if singular_example:
                entry["articleSentence"] = singular_example
                # the article becomes the blank: "Der Tisch ist aus Holz." → "___ Tisch ist aus Holz."
                # The article in front of the noun, not the first article in
                # the sentence: "Das ist das Ei." must blank the second "das",
                # or the drill shows the answer it is asking for.
                blanked = ""
                for g in genders:
                    blanked = blank_out_article(singular_example, g, lemma)
                    if blanked:
                        break
                if blanked:
                    entry["articleSentenceBlank"] = blanked
            accusative_example = cell(row, "accusative example")
            if accusative_example:
                entry["accusativeSentence"] = accusative_example
                # "Ich mag den Tisch." → "Ich mag {{blank}} Tisch." (den / die / das)
                blanked = ""
                for g in genders:
                    blanked = blank_out_article(accusative_example, ACCUSATIVE.get(g.lower(), g), lemma)
                    if blanked:
                        break
                if blanked:
                    entry["accusativeSentenceBlank"] = blanked
            if plural_example:
                entry["pluralSentence"] = plural_example
                bare = re.sub(r"^die\s+", "", plural_variants[0] if plural_variants else "", flags=re.I).strip()
                blanked = blank_out(plural_example, bare)
                if blanked:
                    entry["pluralSentenceBlank"] = blanked
        words.append(entry)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(words, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    nouns = [w for w in words if w.get("nounDetails")]
    print(f"words:        {len(words)} (skipped {skipped} incomplete rows)")
    print(f"nouns:        {len(nouns)}")
    print(f"with article sentence: {sum(1 for w in nouns if w.get('articleSentence'))}")
    print(f"with plural sentence:  {sum(1 for w in nouns if w.get('pluralSentence'))}")
    print(f"with any sentence:     {sum(1 for w in words if w.get('sentence'))}")
    print(f"two-sense words:       {sum(1 for w in words if len(w['senses']) > 1)}")
    print(f"stems:                 {sum(1 for w in words if w['isStem'])}")
    print(f"article drill ready:   {sum(1 for w in nouns if w.get('articleSentenceBlank'))}")
    print(f"plural drill ready:    {sum(1 for w in nouns if w.get('pluralSentenceBlank'))}")
    print(f"accusative ready:      {sum(1 for w in nouns if w.get('accusativeSentenceBlank'))}")
    print(f"Intro words:           {sum(1 for w in words if w['lektion'] == 0)}")
    print(f"written to {OUT.relative_to(OUT.parent.parent.parent)}  ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
