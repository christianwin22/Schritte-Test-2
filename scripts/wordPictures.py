"""Make the word pictures on this Mac, for free (SD-Turbo, runs offline).

Usage:
    uv run --no-project --python 3.12 --with torch --with diffusers --with transformers \\
        --with accelerate --with pillow python scripts/wordPictures.py [--only key1,key2] [--redo]

Reads  scripts/data/wordPicturePrompts.tsv
Writes public/word-pictures/<key>.webp  (384 px, ~20 KB each)

Skips pictures already made from the same prompt (scripts/data/wordPicturesMade.tsv),
so it can be stopped and started again, and a changed description is redrawn.
A picture you don't like: delete its .webp (or use --only key --redo) and run again;
change the seed in SEEDS below to get a different picture for that key.
"""
import argparse
import sys
import time
from pathlib import Path

import torch
from diffusers import AutoPipelineForText2Image

ROOT = Path(__file__).resolve().parent.parent
PROMPTS = ROOT / "scripts/data/wordPicturePrompts.tsv"
OUT = ROOT / "public/word-pictures"
MADE = ROOT / "scripts/data/wordPicturesMade.tsv"  # key, prompt it was drawn from

STYLE = ", simple flat cartoon illustration, clean lines, soft colors, plain white background"
NEGATIVE = "text, letters, words, watermark, signature, blurry"
SEEDS: dict[str, int] = {"boden-323b4a": 11, "braunrot-011dea": 11, "kompliziert-f14f38": 11}  # key -> seed, for re-rolling single pictures
SIZE = 384
HANDMADE = {"erste-9bb5e8", "zweite-de6599", "dritte-509375"}  # scripts/wordPicturesOrdinals.py


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--redo", action="store_true")
    # scripts/data/sentencePicturePrompts.tsv for the example-sentence pictures
    ap.add_argument("--prompts", default=str(PROMPTS))
    args = ap.parse_args()

    rows = [l.rstrip("\n").split("\t", 1) for l in Path(args.prompts).read_text().splitlines() if l]
    only = set(filter(None, args.only.split(",")))
    if only:
        rows = [r for r in rows if r[0] in only]
    OUT.mkdir(parents=True, exist_ok=True)
    made = dict(l.split("\t", 1) for l in MADE.read_text().splitlines() if "\t" in l) if MADE.exists() else {}
    rows = [r for r in rows if r[0] not in HANDMADE]
    todo = [r for r in rows if args.redo or made.get(r[0]) != r[1] or not (OUT / f"{r[0]}.webp").exists()]
    print(f"{len(rows) - len(todo)} done, {len(todo)} to make", flush=True)
    if not todo:
        return

    pipe = AutoPipelineForText2Image.from_pretrained(
        "stabilityai/sd-turbo", torch_dtype=torch.float16, variant="fp16"
    ).to("mps")
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()  # less memory: this Mac has only 8 GB

    start = time.time()
    for i, (key, prompt) in enumerate(todo, 1):
        g = torch.Generator("cpu").manual_seed(SEEDS.get(key, 7))
        img = pipe(
            prompt + STYLE,
            num_inference_steps=4,
            guidance_scale=0.0,
            generator=g,
            width=512,
            height=512,
        ).images[0]
        img.resize((SIZE, SIZE)).save(OUT / f"{key}.webp", quality=72, method=6)
        with MADE.open("a", encoding="utf-8") as f:
            f.write(f"{key}\t{prompt}\n")
        if i % 25 == 0 or i == len(todo):
            rate = (time.time() - start) / i
            left = (len(todo) - i) * rate / 60
            print(f"{i}/{len(todo)}  {rate:.1f}s each  ~{left:.0f} min left", flush=True)


if __name__ == "__main__":
    sys.exit(main())
