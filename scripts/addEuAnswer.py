"""Accept "EU" for die Europäische Union (Chris's idea, 2026-10-04)."""
from pathlib import Path

MD = Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
OLD = "| die Europäische Union (EU) | - | European Union |"
NEW = "| die Europäische Union (EU) | - | European Union, EU |"

text = MD.read_text(encoding="utf-8")
if NEW in text:
    print("already done")
else:
    assert text.count(OLD) == 1, text.count(OLD)
    MD.write_text(text.replace(OLD, NEW), encoding="utf-8")
    print("EU added")
