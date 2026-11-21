"""
Idea of 2026-11-20: "am liebsten" also takes "like most" answers.
The meaning shown stays "most of all, by preference"; the extra answers are in [ ].
Word ids do not move. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil
import sys

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
OLD = "most of all, by preference"
NEW = "most of all, by preference [the most like, like the most, like most, like best]"
MEANING = 2


def main():
    lines = MD.read_text(encoding="utf-8").split("\n")
    hits = 0
    for i, line in enumerate(lines):
        c = [x.strip() for x in line.strip().strip("|").split("|")]
        if line.startswith("| am liebsten |") and c[MEANING] == OLD:
            c[MEANING] = NEW
            lines[i] = "| " + " | ".join(c) + " |"
            hits += 1
    print(f"am liebsten rows changed: {hits}")
    if not hits:
        sys.exit("nothing to change")
    if "--write" in sys.argv:
        shutil.copy(MD, MD.with_name(MD.name + ".before-am-liebsten"))
        MD.write_text("\n".join(lines), encoding="utf-8")
        print("written")


main()
