"""Write one picture prompt per word for the desktop picture panel.

Reads  src/data/vocabulary.generated.json
Writes scripts/data/wordPicturePrompts.tsv   (key, prompt)  — one row per picture
       src/data/wordPictures.json            {word id: key} — which picture each card shows

Words with the same lemma + meaning share one picture.
Each picture is drawn from a short hand-written description in
scripts/data/wordPictureDescriptions.tsv (key, description): the bare word
("a photo") or a long example sentence gives the model too little or too much,
and it draws circles or clutter. "-" there = nothing drawable, no picture.
Prefixes, lesson titles and small grammar words are never listed; the panel
shows its empty frame for any word without a picture.
Make the pictures afterwards with scripts/wordPictures.py.
"""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB = ROOT / "src/data/vocabulary.generated.json"
PROMPTS = ROOT / "scripts/data/wordPicturePrompts.tsv"
DESCRIPTIONS = ROOT / "scripts/data/wordPictureDescriptions.tsv"
MANIFEST = ROOT / "src/data/wordPictures.json"

# Small grammar words cannot be drawn; a wrong picture is worse than none.
SKIP_TYPES = {"Prefix", "Title", "Conjunction", "Preposition", "der-word"}


def slug(text: str) -> str:
    s = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:40] or "word"


def first_sense(translation: str) -> str:
    # "1. to hear<br>2. to listen" -> the first sense only
    t = re.split(r"<br\s*/?>", translation)[0]
    t = re.sub(r"^\s*\d+\.\s*", "", t)
    t = re.sub(r"\[[^\]]*\]", "", t)
    gender = ""
    m = re.search(r"\((male|female)\)", t)
    if m:
        gender = m.group(1)
    t = re.sub(r"\([^)]*\)", "", t)
    t = re.split(r"[,;/]", t)[0].strip()
    return f"{gender} {t}".strip() if gender else t


def clean_sentence(s: str) -> str:
    s = s.replace("…", "").replace("“", "").replace("”", "").replace('"', "")
    return re.sub(r"\s+", " ", s).strip()


def load_descriptions() -> dict:
    if not DESCRIPTIONS.exists():
        return {}
    rows = (l.split("\t", 1) for l in DESCRIPTIONS.read_text(encoding="utf-8").splitlines() if "\t" in l)
    return {k.strip(): v.strip() for k, v in rows}


def main() -> None:
    words = json.loads(VOCAB.read_text())
    described = load_descriptions()
    keys: dict[tuple[str, str], str] = {}
    prompts: dict[str, str] = {}
    manifest: dict[str, str] = {}
    for w in words:
        if w["wordType"] in SKIP_TYPES:
            continue
        ident = (w["lemma"], w["translation"])
        if ident not in keys:
            h = hashlib.sha1("|".join(ident).encode()).hexdigest()[:6]
            key = f"{slug(w['lemma'])}-{h}"
            prompt = described.get(key, "-")
            if prompt == "-":
                continue
            keys[ident] = key
            prompts[key] = prompt
        if ident in keys:
            manifest[w["id"]] = keys[ident]

    nouns = {keys[(w["lemma"], w["translation"])] for w in words
             if w["wordType"] in ("Noun", "Proper noun") and (w["lemma"], w["translation"]) in keys}
    order = [k for k in prompts if k in nouns] + [k for k in prompts if k not in nouns]
    PROMPTS.write_text("".join(f"{k}\t{prompts[k]}\n" for k in order), encoding="utf-8")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"{len(prompts)} pictures, {len(manifest)} cards")


if __name__ == "__main__":
    main()
