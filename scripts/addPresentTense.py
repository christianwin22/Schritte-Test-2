#!/usr/bin/env python3
"""
Add a "Present tense" column to the word list: the six forms of every verb.

    python3 scripts/addPresentTense.py           # show what would change
    python3 scripts/addPresentTense.py --write   # rewrite the .md

The column goes right after "Accusative example". A verb row gets its forms in
the order ich · du · er/sie/es · wir · ihr · sie/Sie, without the pronouns:

    kommen          komme · kommst · kommt · kommen · kommt · kommen
    anrufen         rufe an · rufst an · ruft an · rufen an · ruft an · rufen an
    sich freuen     freue mich · freust dich · freut sich · freuen uns · freut euch · freuen sich
    regnen          - · - · regnet · - · - ·  -        (only "es regnet")

Every other row gets "-". Forms already in the column are left alone, so a
hand correction survives the next run. Anything the rules are unsure about is
printed, to be checked by eye.
"""
import pathlib
import re
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
COLUMN = "Present tense"
AFTER = "accusative example"

# ---------------------------------------------------------------------------
# Irregular verbs, whole: ich, du, er, wir, ihr, sie
IRREGULAR = {
    "sein": ["bin", "bist", "ist", "sind", "seid", "sind"],
    "haben": ["habe", "hast", "hat", "haben", "habt", "haben"],
    "werden": ["werde", "wirst", "wird", "werden", "werdet", "werden"],
    "wissen": ["weiß", "weißt", "weiß", "wissen", "wisst", "wissen"],
    "tun": ["tue", "tust", "tut", "tun", "tut", "tun"],
    "können": ["kann", "kannst", "kann", "können", "könnt", "können"],
    "müssen": ["muss", "musst", "muss", "müssen", "müsst", "müssen"],
    "dürfen": ["darf", "darfst", "darf", "dürfen", "dürft", "dürfen"],
    "wollen": ["will", "willst", "will", "wollen", "wollt", "wollen"],
    "sollen": ["soll", "sollst", "soll", "sollen", "sollt", "sollen"],
    "mögen": ["mag", "magst", "mag", "mögen", "mögt", "mögen"],
    "möchten": ["möchte", "möchtest", "möchte", "möchten", "möchtet", "möchten"],
}

# Strong verbs whose vowel changes in du and er/sie/es: (du, er)
STRONG = {
    "fahren": ("fährst", "fährt"), "schlafen": ("schläfst", "schläft"), "tragen": ("trägst", "trägt"),
    "waschen": ("wäschst", "wäscht"), "fallen": ("fällst", "fällt"), "halten": ("hältst", "hält"),
    "lassen": ("lässt", "lässt"), "laufen": ("läufst", "läuft"), "fangen": ("fängst", "fängt"),
    "laden": ("lädst", "lädt"), "raten": ("rätst", "rät"), "schlagen": ("schlägst", "schlägt"),
    "wachsen": ("wächst", "wächst"), "braten": ("brätst", "brät"), "stoßen": ("stößt", "stößt"),
    "graben": ("gräbst", "gräbt"), "saufen": ("säufst", "säuft"),
    "sprechen": ("sprichst", "spricht"), "helfen": ("hilfst", "hilft"), "treffen": ("triffst", "trifft"),
    "nehmen": ("nimmst", "nimmt"), "geben": ("gibst", "gibt"), "essen": ("isst", "isst"),
    "vergessen": ("vergisst", "vergisst"), "messen": ("misst", "misst"), "fressen": ("frisst", "frisst"),
    "werfen": ("wirfst", "wirft"), "sterben": ("stirbst", "stirbt"), "brechen": ("brichst", "bricht"),
    "gelten": ("giltst", "gilt"), "treten": ("trittst", "tritt"), "stechen": ("stichst", "sticht"),
    "erschrecken": ("erschrickst", "erschrickt"), "verderben": ("verdirbst", "verdirbt"),
    "sehen": ("siehst", "sieht"), "lesen": ("liest", "liest"), "empfehlen": ("empfiehlst", "empfiehlt"),
    "stehlen": ("stiehlst", "stiehlt"), "geschehen": ("geschiehst", "geschieht"),
    "werben": ("wirbst", "wirbt"),
}

# Things only "es" does.
IMPERSONAL = {
    "regnen", "schneien", "geschehen", "passieren", "donnern", "blitzen", "gewittern", "hageln",
    "gelingen", "klappen", "dauern",
}
# Reflexive, but only ever "es … sich": der Wunsch erfüllt sich, es lohnt sich, der Preis erhöht sich.
IMPERSONAL_REFLEXIVE = {"erfüllen", "lohnen", "erhöhen"}
# Separable where the rules below would not see it.
SEPARABLE_WORDS = {"wehtun": ("weh", "tun"), "wiederkommen": ("wieder", "kommen"), "wiedersehen": ("wieder", "sehen")}

# Separable prefixes, longest first. Inseparable ones are listed apart.
SEPARABLE = [
    "zusammen", "zurück", "weiter", "vorbei", "herunter", "hinaus", "heraus", "herein", "spazieren",
    "kennen", "runter", "kaputt", "krank", "statt", "fest", "fern", "frei", "teil", "raus", "rein",
    "nach", "weg", "los", "mit", "vor", "hin", "her", "auf", "aus", "bei", "ein", "ab", "an", "zu", "um", "dar",
]
INSEPARABLE = ["miss", "wider", "hinter", "unter", "über", "wieder", "emp", "ent", "zer", "ver", "be", "ge", "er"]
# Look like prefix + verb, but are not separable (or not prefixed at all).
NOT_SEPARABLE = {
    "antworten", "umarmen", "ereignen", "ernähren", "erinnern", "erholen", "erklären", "erzählen",
    "heiraten", "hindern", "herrschen", "vorsichtig", "zeigen", "zahlen", "zählen", "mitteilen_",
    "angeln", "ankern", "umgeben", "umfahren", "wiederholen", "reinigen", "einigen",
}
DATIVE_REFLEXIVE = {"überlegen", "vornehmen", "leisten", "wünschen"}
TRAILING_PREPOSITIONS = {"mit", "an", "auf", "in", "um", "über", "von", "wie", "für", "zu", "bei"}

ACC = ["mich", "dich", "sich", "uns", "euch", "sich"]
DAT = ["mir", "dir", "sich", "uns", "euch", "sich"]
VOWELS = "aeiouäöüy"


def regular(inf: str) -> list[str]:
    if inf.endswith("eln"):
        stem = inf[:-1]  # sammel
        return [stem[:-2] + "le", stem + "st", stem + "t", inf, stem + "t", inf]
    if inf.endswith("ern"):
        stem = inf[:-1]  # änder
        return [stem + "e", stem + "st", stem + "t", inf, stem + "t", inf]
    stem = inf[:-2] if inf.endswith("en") else inf[:-1]
    e_insert = stem.endswith(("d", "t")) or (
        stem[-1:] in ("m", "n")
        and len(stem) >= 2
        and stem[-2] not in VOWELS + "lrmn"
        and not (stem[-2] == "h" and len(stem) >= 3 and stem[-3] in VOWELS)
    )
    s_sound = stem.endswith(("s", "ß", "z", "x")) and not stem.endswith("sch")
    du = stem + ("est" if e_insert else "t" if s_sound else "st")
    er = stem + ("et" if e_insert else "t")
    ihr = er
    return [stem + "e", du, er, inf, ihr, inf]


def strong_lookup(inf: str):
    """fahren, erfahren, gefallen, unterhalten → their (du, er) from STRONG."""
    for key in sorted(STRONG, key=len, reverse=True):
        if inf == key:
            return STRONG[key]
        if inf.endswith(key):
            head = inf[: -len(key)]
            if head in INSEPARABLE:
                du, er = STRONG[key]
                return head + du, head + er
    return None


def conjugate_simple(inf: str):
    if inf in IRREGULAR:
        return list(IRREGULAR[inf]), "irregular"
    for key, forms in IRREGULAR.items():
        head = inf[: -len(key)] if inf.endswith(key) else None
        if head and head in INSEPARABLE:
            return [head + f for f in forms], "irregular"
    forms = regular(inf)
    strong = strong_lookup(inf)
    if strong:
        forms[1], forms[2] = strong
        return forms, "strong"
    return forms, "regular"


def split_separable(inf: str, marked: bool):
    """('an', 'rufen') for anrufen; (None, inf) when not separable."""
    if marked:
        prefix, base = inf.split("·", 1)
        return prefix, base
    if inf in SEPARABLE_WORDS:
        return SEPARABLE_WORDS[inf]
    if inf in NOT_SEPARABLE:
        return None, inf
    for p in SEPARABLE:
        # "hinterlassen" starts with hin-, but hinter- is the (inseparable) prefix
        if any(inf.startswith(q) and len(q) > len(p) for q in INSEPARABLE):
            continue
        if inf.startswith(p) and len(inf) - len(p) >= 4 and (inf[len(p):].endswith("en") or inf[len(p):].endswith("n")):
            return p, inf[len(p):]
    return None, inf


def conjugate(display: str):
    """→ (forms or None, note)"""
    text = display.strip()
    text = text.replace("(he)runter", "runter").replace("(wind)", "")
    m = re.match(r"^los \((\w+)\)$", text)
    if m:
        text = m.group(1)
    reflexive = bool(re.search(r"(^|\s)sich(\s|$)", text))  # "(sich)" is optional: plain verb
    text = re.sub(r"\(sich\)", "", text)
    text = re.sub(r"\([^)]*\)", "", text)  # (im Internet), (über), (wie)
    text = re.sub(r"(^|\s)sich(\s|$)", " ", text)
    words = text.split()
    while len(words) > 1 and words[-1] in TRAILING_PREPOSITIONS:
        words.pop()  # denken an, träumen von
    if not words:
        return None, "empty"
    if len(words) > 2:
        return None, "phrase"
    rest = " ".join(words[:-1])  # "Rad" fahren, "spazieren" gehen, "geboren" werden
    verb = words[-1]
    marked = "·" in verb
    prefix, base = split_separable(verb, marked)
    if not re.fullmatch(r"[a-zäöüß]+", base):
        return None, "odd spelling"
    forms, kind = conjugate_simple(base)
    impersonal = base in IMPERSONAL or (reflexive and base in IMPERSONAL_REFLEXIVE)
    dative = base in DATIVE_REFLEXIVE or (prefix and prefix + base in DATIVE_REFLEXIVE) or rest == "gefallen"
    pronouns = DAT if dative else ACC
    out = []
    for i, f in enumerate(forms):
        parts = [f]
        if reflexive:
            parts.append(pronouns[i])
        if rest:
            parts.append(rest)
        if prefix:
            parts.append(prefix)
        out.append(" ".join(parts))
    if impersonal:
        out = ["-", "-", out[2], "-", "-", "-"]
    note = kind + (" separable" if prefix else "") + (" reflexive" if reflexive else "") + (" impersonal" if impersonal else "")
    return out, note


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write=False):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, header = [], None
    filled, notes = 0, {}
    unsure = []

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
        if row[at] not in ("", "-") or data.get("word type", "").lower() != "verb":
            out.append("| " + " | ".join(row) + " |")
            continue
        display = data["german word (singular)"]
        forms, note = conjugate(display)
        if forms is None:
            unsure.append(f"{display}  ({note}) → left as -")
        else:
            row[at] = " · ".join(forms)
            filled += 1
            key = note.split(" ", 1)[1] if " " in note else note
            notes.setdefault(note, []).append(f"{display}: {row[at]}")
        out.append("| " + " | ".join(row) + " |")

    print(f"verbs filled: {filled}")
    for note in sorted(notes):
        if note == "regular":
            continue
        print(f"\n== {note} ({len(notes[note])})")
        for s in notes[note]:
            print("  ", s)
    print(f"\n== regular ({len(notes.get('regular', []))})")
    for s in notes.get("regular", []):
        print("  ", s)
    print(f"\n== not filled ({len(unsure)})")
    for s in unsure:
        print("  ", s)

    if write:
        backup = SOURCE.with_suffix(".md.before-present")
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"backup: {backup.name}")
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"written: {SOURCE.name}")


main(write="--write" in sys.argv)
