"""Pictures for the example sentences (Chris, 2026-11-27: "find the picture that
reflects the example sentences ... as much as you can", plural cards too).

Reads  src/data/vocabulary.generated.json
       scripts/data/sentencePictureDescriptions.tsv  (key, description; "-" = none)
Writes scripts/data/sentencePicturePrompts.tsv       (key, prompt) for wordPictures.py
       src/data/sentencePictures.json                {card key: picture key}

A sentence picture's key is "s-" + the first 8 hex of sha1(German sentence), so a
changed sentence gets a new picture. The card key is the word id, or "wpl:<id>"
for the plural card. Only pictures already drawn go into the manifest; any card
without one keeps showing its word picture.

    python3 scripts/sentencePicturePrompts.py
    uv run ... python scripts/wordPictures.py --prompts scripts/data/sentencePicturePrompts.tsv
    python3 scripts/sentencePicturePrompts.py     # again, to list the new pictures
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB = ROOT / "src/data/vocabulary.generated.json"
DESCRIPTIONS = ROOT / "scripts/data/sentencePictureDescriptions.tsv"
PROMPTS = ROOT / "scripts/data/sentencePicturePrompts.tsv"
MANIFEST = ROOT / "src/data/sentencePictures.json"
PICTURES = ROOT / "public/word-pictures"


def key_of(sentence: str) -> str:
    return "s-" + hashlib.sha1(sentence.encode()).hexdigest()[:8]


def main() -> None:
    words = json.loads(VOCAB.read_text())
    desc = dict(l.split("\t", 1) for l in DESCRIPTIONS.read_text().splitlines() if "\t" in l)
    cards: dict[str, str] = {}
    for w in words:
        if w.get("wordType") == "Title":
            continue
        ex = (w.get("exampleSentences") or [{}])[0]
        singular = (ex.get("german") or "").replace("{{blank}}", w["lemma"])
        if singular:
            cards[w["id"]] = key_of(singular)
        if w.get("pluralSentence"):
            cards[f"wpl:{w['id']}"] = key_of(w["pluralSentence"])
    wanted = sorted({k for k in cards.values() if desc.get(k, "-").strip() not in ("", "-")})
    PROMPTS.write_text("".join(f"{k}\t{desc[k].strip()}\n" for k in wanted))
    drawn = {c: k for c, k in cards.items() if k in wanted and (PICTURES / f"{k}.webp").exists()}
    MANIFEST.write_text(json.dumps(dict(sorted(drawn.items())), indent=0) + "\n")
    missing = [k for k in set(cards.values()) if k not in desc]
    print(f"{len(cards)} cards, {len(wanted)} pictures wanted, {len(drawn)} cards have one"
          + (f", {len(missing)} sentences with no description yet" if missing else ""))


if __name__ == "__main__":
    main()
