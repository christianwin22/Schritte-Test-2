#!/usr/bin/env python3
"""Add das Meldeformular to A1.2 Lesson 9, after die Anmeldung (Chris, 2026-10-11).

The book's word lists do not have it; Chris asked for it with his list of
look-alike words (Anmeldung, Antrag, Formular, Meldeformular). The sentences are
our own. Run scripts/importVocabulary.py afterwards.
"""
import pathlib
import shutil

MD = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"
AFTER = "| die Anmeldung | die Anmeldungen |"
ROW = ("| das Meldeformular | die Meldeformulare | registration form (check-in form) | Noun | - "
       "| Das Meldeformular liegt an der Rezeption. | The registration form is at reception. "
       "| Die Meldeformulare gibt es auf Deutsch und Englisch. | The registration forms are available in German and English. "
       "| Füllen Sie bitte das Meldeformular aus. | Please fill in the registration form. "
       "| - | - | - | Im Hotel füllt man ein Meldeformular aus. | At the hotel you fill in a registration form. |")

lines = MD.read_text(encoding="utf-8").split("\n")
if any(l.startswith("| das Meldeformular |") for l in lines):
    print("already there")
else:
    at = next(i for i, l in enumerate(lines) if l.startswith(AFTER))
    shutil.copy(MD, MD.with_name(MD.name + ".before-meldeformular"))
    lines.insert(at + 1, ROW)
    MD.write_text("\n".join(lines), encoding="utf-8")
    print("added after line", at + 1)
