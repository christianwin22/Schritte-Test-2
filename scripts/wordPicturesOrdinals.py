"""Draw erste / zweite / dritte as gold, silver and bronze medals with a big 1, 2, 3.

The picture model cannot draw numbers, so these three are drawn by hand
(Chris, 2026-11-26: "ersten zweiten dritten don't have a clear picture").
wordPictures.py leaves them alone because they are listed in HANDMADE there.

    uv run --no-project --python 3.12 --with pillow python scripts/wordPicturesOrdinals.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public/word-pictures"
SIZE = 768  # drawn big, saved at 384 so the edges stay smooth
FONT = "/System/Library/Fonts/SFNSRounded.ttf"

MEDALS = {
    "erste-9bb5e8": ("1", (242, 190, 40), (196, 140, 10)),
    "zweite-de6599": ("2", (206, 212, 220), (140, 148, 160)),
    "dritte-509375": ("3", (214, 140, 80), (160, 92, 44)),
}


def draw(number: str, fill: tuple, edge: tuple) -> Image.Image:
    im = Image.new("RGB", (SIZE, SIZE), "white")
    d = ImageDraw.Draw(im)
    # ribbon
    d.polygon([(250, 40), (360, 40), (420, 330), (310, 330)], fill=(70, 120, 210))
    d.polygon([(518, 40), (408, 40), (348, 330), (458, 330)], fill=(220, 70, 80))
    # medal
    c, r = (SIZE // 2, 470), 230
    d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=edge)
    r2 = r - 28
    d.ellipse([c[0] - r2, c[1] - r2, c[0] + r2, c[1] + r2], fill=fill)
    font = ImageFont.truetype(FONT, 300)
    try:
        font.set_variation_by_axes([800])
    except Exception:
        pass
    d.text(c, number, font=font, fill="white", anchor="mm", stroke_width=10, stroke_fill=edge)
    return im.resize((384, 384), Image.LANCZOS)


def main() -> None:
    for key, (number, fill, edge) in MEDALS.items():
        draw(number, fill, edge).save(OUT / f"{key}.webp", quality=80)
        print("drew", key)


if __name__ == "__main__":
    main()
