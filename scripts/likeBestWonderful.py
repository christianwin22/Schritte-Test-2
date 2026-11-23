"""
Ideas of 2026-11-22:
- am liebsten: the meaning shown now starts with "like best", so EN -> DE hints at "like".
  "most liked" is a right answer too.
- wunderschön: "wonderful" was added, then taken out on 2026-11-23 (wunderbar is "wonderful").
Word ids do not move. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
MEANING = 2
CHANGES = {
    "am liebsten": (
        "most of all, by preference [the most like, like the most, like most, like best]",
        "like best, most of all, by preference [the most like, like the most, like most, most liked]",
    ),
}


def main():
    lines = MD.read_text(encoding="utf-8").split("\n")
    hits = 0
    for i, line in enumerate(lines):
        if not line.startswith("| "):
            continue
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        old_new = CHANGES.get(c[0])
        if old_new and c[MEANING] == old_new[0]:
            c[MEANING] = old_new[1]
            lines[i] = "| " + " | ".join(c) + " |"
            hits += 1
    print(f"rows changed: {hits}")
    if hits != len(CHANGES):
        sys.exit("expected one row per word")
    if "--write" in sys.argv:
        shutil.copy(MD, MD.with_name(MD.name + ".before-like-best"))
        MD.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
