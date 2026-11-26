"""Drop word pictures that came out empty, and cards whose picture is missing.

Run after scripts/wordPictures.py (same Python, needs pillow):
    python scripts/wordPicturesPrune.py [--write]

A picture that is almost one flat colour (the model drew a blank grid) is worse
than no picture: it is deleted, and its words leave src/data/wordPictures.json,
so the panel shows its empty frame instead. Without --write it only reports.
"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/word-pictures"
MANIFEST = ROOT / "src/data/wordPictures.json"
MIN_SPREAD = 8.0  # blank grid ~1, real drawings 25+ (middle of the picture, blurred to 12 x 12)


def spread(path: Path) -> float:
    with Image.open(path) as im:
        # Blur away the fine grid texture and the frame; a drawing still has big shapes.
        middle = im.convert("L").resize((384, 384)).crop((48, 48, 336, 336))
        return ImageStat.Stat(middle.resize((12, 12), Image.BOX)).stddev[0]


def main() -> None:
    write = "--write" in sys.argv
    blank = sorted(p for p in OUT.glob("*.webp") if spread(p) < MIN_SPREAD)
    manifest: dict[str, str] = json.loads(MANIFEST.read_text())
    gone = {p.stem for p in blank}
    kept = {
        word: key
        for word, key in manifest.items()
        if key not in gone and (OUT / f"{key}.webp").exists()
    }
    print(f"blank pictures: {len(blank)}  {' '.join(p.stem for p in blank[:40])}")
    print(f"cards with a picture: {len(kept)} of {len(manifest)}")
    if write:
        for p in blank:
            p.unlink()
        MANIFEST.write_text(json.dumps(kept, ensure_ascii=False, separators=(",", ":")) + "\n")


if __name__ == "__main__":
    main()
