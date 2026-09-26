#!/usr/bin/env python3
"""
Add "Simple past" (Präteritum) and "Present perfect" (Perfekt) columns: the six
forms of every verb, ich · du · er/sie/es · wir · ihr · sie/Sie, like "Present tense".

    python3 scripts/addPastTenses.py           # show what would change
    python3 scripts/addPastTenses.py --write   # rewrite the .md

    kommen     kam · kamst · kam · kamen · kamt · kamen
               bin gekommen · bist gekommen · ist gekommen · sind gekommen · seid gekommen · sind gekommen
    anrufen    rief an · riefst an · …          habe angerufen · hast angerufen · …
    sich freuen freute mich · freutest dich · … habe mich gefreut · hast dich gefreut · …

Irregular verbs come from the table below (written by hand); the rest follow the
regular rules. Which verbs take "sein" in the Perfekt is decided by a list too.
Everything unusual is printed to be checked. Filled cells are left alone.
"""
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
import addPresentTense as P  # noqa: E402  (headword parsing, separable/inseparable prefixes)

SOURCE = P.SOURCE
AFTER = "present tense"
COLUMNS = ["Simple past", "Present perfect"]

# Irregular (strong and mixed) verbs: infinitive → (Präteritum stem, Partizip II)
IRREGULAR = {
    "backen": ("backte", "gebacken"), "beginnen": ("begann", "begonnen"), "bieten": ("bot", "geboten"),
    "binden": ("band", "gebunden"), "bitten": ("bat", "gebeten"), "bleiben": ("blieb", "geblieben"),
    "braten": ("briet", "gebraten"), "brechen": ("brach", "gebrochen"), "brennen": ("brannte", "gebrannt"),
    "bringen": ("brachte", "gebracht"), "denken": ("dachte", "gedacht"), "dürfen": ("durfte", "gedurft"),
    "empfangen": ("empfing", "empfangen"), "empfehlen": ("empfahl", "empfohlen"), "essen": ("aß", "gegessen"),
    "fahren": ("fuhr", "gefahren"), "fallen": ("fiel", "gefallen"), "fangen": ("fing", "gefangen"),
    "finden": ("fand", "gefunden"), "fliegen": ("flog", "geflogen"), "fliehen": ("floh", "geflohen"),
    "frieren": ("fror", "gefroren"), "geben": ("gab", "gegeben"), "gehen": ("ging", "gegangen"),
    "gelingen": ("gelang", "gelungen"), "gelten": ("galt", "gegolten"), "genießen": ("genoss", "genossen"),
    "geschehen": ("geschah", "geschehen"), "gewinnen": ("gewann", "gewonnen"), "gießen": ("goss", "gegossen"),
    "gleichen": ("glich", "geglichen"), "greifen": ("griff", "gegriffen"), "haben": ("hatte", "gehabt"),
    "halten": ("hielt", "gehalten"), "hängen": ("hing", "gehangen"), "heben": ("hob", "gehoben"),
    "heißen": ("hieß", "geheißen"), "helfen": ("half", "geholfen"), "kennen": ("kannte", "gekannt"),
    "klingen": ("klang", "geklungen"), "kommen": ("kam", "gekommen"), "können": ("konnte", "gekonnt"),
    "laden": ("lud", "geladen"), "lassen": ("ließ", "gelassen"), "laufen": ("lief", "gelaufen"),
    "leihen": ("lieh", "geliehen"), "lesen": ("las", "gelesen"), "liegen": ("lag", "gelegen"),
    "lügen": ("log", "gelogen"), "meiden": ("mied", "gemieden"), "messen": ("maß", "gemessen"),
    "mögen": ("mochte", "gemocht"), "müssen": ("musste", "gemusst"), "nehmen": ("nahm", "genommen"),
    "nennen": ("nannte", "genannt"), "raten": ("riet", "geraten"), "reiten": ("ritt", "geritten"),
    "rennen": ("rannte", "gerannt"), "riechen": ("roch", "gerochen"), "rufen": ("rief", "gerufen"),
    "scheiden": ("schied", "geschieden"), "scheinen": ("schien", "geschienen"), "schieben": ("schob", "geschoben"),
    "schießen": ("schoss", "geschossen"), "schlafen": ("schlief", "geschlafen"), "schlagen": ("schlug", "geschlagen"),
    "schließen": ("schloss", "geschlossen"), "schneiden": ("schnitt", "geschnitten"), "schreiben": ("schrieb", "geschrieben"),
    "schreien": ("schrie", "geschrien"), "schweigen": ("schwieg", "geschwiegen"), "schwimmen": ("schwamm", "geschwommen"),
    "schwinden": ("schwand", "geschwunden"), "sehen": ("sah", "gesehen"), "sein": ("war", "gewesen"),
    "singen": ("sang", "gesungen"), "sitzen": ("saß", "gesessen"), "sollen": ("sollte", "gesollt"),
    "sprechen": ("sprach", "gesprochen"), "springen": ("sprang", "gesprungen"), "stehen": ("stand", "gestanden"),
    "stehlen": ("stahl", "gestohlen"), "steigen": ("stieg", "gestiegen"), "sterben": ("starb", "gestorben"),
    "stoßen": ("stieß", "gestoßen"), "streichen": ("strich", "gestrichen"), "streiten": ("stritt", "gestritten"),
    "tragen": ("trug", "getragen"), "treffen": ("traf", "getroffen"), "treiben": ("trieb", "getrieben"),
    "treten": ("trat", "getreten"), "trinken": ("trank", "getrunken"), "trügen": ("trog", "getrogen"),
    "tun": ("tat", "getan"), "vergessen": ("vergaß", "vergessen"), "verlieren": ("verlor", "verloren"),
    "wachsen": ("wuchs", "gewachsen"), "waschen": ("wusch", "gewaschen"), "weisen": ("wies", "gewiesen"),
    "werben": ("warb", "geworben"), "werden": ("wurde", "geworden"),
    "werfen": ("warf", "geworfen"), "wiegen": ("wog", "gewogen"), "wissen": ("wusste", "gewusst"),
    "wollen": ("wollte", "gewollt"), "ziehen": ("zog", "gezogen"), "biegen": ("bog", "gebogen"),
    "senden": ("sendete", "gesendet"),
}

# Perfekt with "sein": motion and change of state. Checked on the verb without an
# inseparable prefix (verlassen, bekommen, erfahren take haben) …
SEIN_CORE = {
    "gehen", "kommen", "fahren", "fliegen", "fallen", "laufen", "steigen", "springen", "schwimmen", "bleiben",
    "sterben", "wachsen", "werden", "sein", "reisen", "reiten", "rennen", "fliehen", "wandern", "klettern",
    "joggen", "folgen", "landen", "stürzen", "eilen", "biegen", "wachen", "treten", "passieren",
}
# … and these, whole, whatever their prefix
SEIN_WHOLE = {
    "entstehen", "verschwinden", "gelingen", "geschehen", "begegnen", "erscheinen", "einschlafen", "aufstehen",
    "aufwachen", "umziehen", "einziehen", "ausziehen", "verreisen", "starten",
}
HABEN_WHOLE = {"gefallen", "aufpassen"}
# Not said in these tenses: left as "-"
NO_PAST = {"möchten"}
# Whole headwords the rules can't build
OVERRIDES = {
    "sich gefallen lassen": (
        ["ließ mir gefallen", "ließt dir gefallen", "ließ sich gefallen", "ließen uns gefallen", "ließt euch gefallen", "ließen sich gefallen"],
        ["habe mir gefallen lassen", "hast dir gefallen lassen", "hat sich gefallen lassen", "haben uns gefallen lassen", "habt euch gefallen lassen", "haben sich gefallen lassen"],
    ),
    "geboren werden": (
        ["wurde geboren", "wurdest geboren", "wurde geboren", "wurden geboren", "wurdet geboren", "wurden geboren"],
        ["bin geboren worden", "bist geboren worden", "ist geboren worden", "sind geboren worden", "seid geboren worden", "sind geboren worden"],
    ),
}

HABEN = ["habe", "hast", "hat", "haben", "habt", "haben"]
SEIN = ["bin", "bist", "ist", "sind", "seid", "sind"]
VOWELS = "aeiouäöüy"


def inseparable_head(base: str):
    for q in sorted(P.INSEPARABLE, key=len, reverse=True):
        if base.startswith(q) and len(base) - len(q) >= 4:
            return q, base[len(q):]
    return "", base


# Look irregular but are regular: bereiten is not be + reiten.
REGULAR_ANYWAY = {"bereiten"}


def lookup_irregular(base: str):
    """(präteritum stem, partizip) for base — also behind inseparable prefixes (bekommen, missverstehen)."""
    if base in REGULAR_ANYWAY:
        return None
    if base in IRREGULAR:
        return IRREGULAR[base]
    head, core = inseparable_head(base)
    if head:
        inner = lookup_irregular(core)
        if inner:
            prat, part = inner
            return head + prat, head + (part[2:] if part.startswith("ge") else part)
    return None


def weak_stem(inf: str) -> str:
    if inf.endswith(("eln", "ern")):
        return inf[:-1]
    return inf[:-2] if inf.endswith("en") else inf[:-1]


def weak_parts(inf: str):
    stem = weak_stem(inf)
    e_insert = stem.endswith(("d", "t")) or (
        stem[-1:] in ("m", "n")
        and len(stem) >= 2
        and stem[-2] not in VOWELS + "lrmn"
        and not (stem[-2] == "h" and len(stem) >= 3 and stem[-3] in VOWELS)
    )
    prat = stem + ("ete" if e_insert else "te")
    head, core = inseparable_head(inf)
    no_ge = bool(head) or inf.endswith("ieren")
    part = ("" if no_ge else "ge") + stem + ("et" if e_insert else "t")
    return prat, part


def prat_forms(prat: str):
    if prat.endswith("e"):  # machte, brachte: weak endings
        return [prat, prat + "st", prat, prat + "n", prat + "t", prat + "n"]
    needs_e = prat.endswith(("s", "ß", "z", "t", "d"))
    return [
        prat,
        prat + ("est" if needs_e else "st"),
        prat,
        prat + ("n" if prat.endswith("e") else "en"),
        prat + ("et" if prat.endswith(("t", "d")) else "t"),
        prat + ("n" if prat.endswith("e") else "en"),
    ]


def takes_sein(whole: str, base: str, reflexive: bool, optional_sich: bool = False) -> bool:
    # "(sich) umziehen / ausziehen" is getting dressed: hat sich umgezogen. Moving house is "ist umgezogen".
    if reflexive or optional_sich or whole in HABEN_WHOLE:
        return False
    if whole in SEIN_WHOLE:
        return True
    head, core = inseparable_head(base)
    return not head and core in SEIN_CORE


def conjugate(display: str):
    """→ (präteritum forms, perfekt forms, note) or (None, None, why)"""
    clean = display.strip()
    if clean in OVERRIDES:
        a, b = OVERRIDES[clean]
        return a, b, "by hand"
    text = clean.replace("(he)runter", "runter").replace("(wind)", "")
    m = re.match(r"^los \((\w+)\)$", text)
    if m:
        text = m.group(1)
    reflexive = bool(re.search(r"(^|\s)sich(\s|$)", text))
    text = re.sub(r"\(sich\)", "", text)
    text = re.sub(r"\([^)]*\)", "", text)
    text = re.sub(r"(^|\s)sich(\s|$)", " ", text)
    words = text.split()
    while len(words) > 1 and words[-1] in P.TRAILING_PREPOSITIONS:
        words.pop()
    if not words or len(words) > 2:
        return None, None, "phrase"
    rest = " ".join(words[:-1])
    verb = words[-1]
    prefix, base = P.split_separable(verb, "·" in verb)
    if base in NO_PAST:
        return ["-"] * 6, ["-"] * 6, "no past"
    irregular = lookup_irregular(base)
    prat, part = irregular if irregular else weak_parts(base)
    whole = (prefix or "") + base
    sein = takes_sein(whole, base, reflexive, optional_sich="(sich)" in clean)
    impersonal = base in P.IMPERSONAL or (reflexive and base in P.IMPERSONAL_REFLEXIVE)
    dative = base in P.DATIVE_REFLEXIVE or (prefix and prefix + base in P.DATIVE_REFLEXIVE)
    pronouns = P.DAT if dative else P.ACC

    past, perf = [], []
    for i, f in enumerate(prat_forms(prat)):
        a = [f] + ([pronouns[i]] if reflexive else []) + ([rest] if rest else []) + ([prefix] if prefix else [])
        past.append(" ".join(a))
        aux = (SEIN if sein else HABEN)[i]
        b = [aux] + ([pronouns[i]] if reflexive else []) + ([rest] if rest else []) + [(prefix or "") + part]
        perf.append(" ".join(b))
    if impersonal:
        past = ["-", "-", past[2], "-", "-", "-"]
        perf = ["-", "-", perf[2], "-", "-", "-"]
    note = ("irregular" if irregular else "regular") + (" sein" if sein else "")
    return past, perf, note


def cells(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def main(write=False):
    lines = SOURCE.read_text(encoding="utf-8").splitlines()
    out, header = [], None
    groups: dict[str, list[str]] = {}
    missing = []
    filled = 0
    for line in lines:
        if re.match(r"^## ", line):
            header = None
        if not line.startswith("|"):
            out.append(line)
            continue
        row = cells(line)
        if row[0].lower().startswith("german word"):
            header = [c.lower() for c in row]
            at = header.index(AFTER) + 1
            for name in COLUMNS:
                if name.lower() not in header:
                    row.insert(at, name)
                    header = [c.lower() for c in row]
                at = header.index(name.lower()) + 1
            out.append("| " + " | ".join(row) + " |")
            continue
        if re.match(r"^:?-+:?$", row[0]):
            out.append("|" + "|".join(["---"] * (len(header) if header else len(row))) + "|")
            continue
        if not header:
            out.append(line)
            continue
        for name in COLUMNS:
            if len(row) < len(header):
                row.insert(header.index(name.lower()), "-")
        data = dict(zip(header, row))
        ip, pp = header.index("simple past"), header.index("present perfect")
        if data.get("word type", "").lower() != "verb" or (row[ip] not in ("", "-") and row[pp] not in ("", "-")):
            out.append("| " + " | ".join(row) + " |")
            continue
        display = data["german word (singular)"]
        past, perf, note = conjugate(display)
        if past is None:
            missing.append(f"{display} ({note})")
        else:
            row[ip] = " · ".join(past)
            row[pp] = " · ".join(perf)
            filled += 1
            groups.setdefault(note, []).append(f"{display}: {row[ip]}  ||  {perf[2]}")
        out.append("| " + " | ".join(row) + " |")

    print(f"verbs filled: {filled}")
    for note in sorted(groups):
        print(f"\n== {note} ({len(groups[note])})")
        for g in groups[note]:
            print("  ", g)
    print(f"\n== not filled ({len(missing)})")
    for m in missing:
        print("  ", m)

    if write:
        backup = SOURCE.with_suffix(".md.before-past")
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"backup: {backup.name}")
        SOURCE.write_text("\n".join(out) + "\n", encoding="utf-8")
        print(f"written: {SOURCE.name}")


if __name__ == "__main__":
    main(write="--write" in sys.argv)
