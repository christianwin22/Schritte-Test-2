#!/usr/bin/env python3
"""
Give every noun its own drill sentence, instead of one sentence for all of them.

    python3 scripts/varyDrillSentences.py           # show what would change
    python3 scripts/varyDrillSentences.py --write   # rewrite the .md

The word list arrived with 1,456 of 1,458 singular examples reading
"… ist wichtig", and the plurals to match. This rewrites the Singular example
and Plural example columns of Deutsche_Meister_Vocabulary.md.

Two rules keep the results honest:

  * Only adjectives that fit any noun are used. A lesson's own words are
    preferred, so the sentence sounds like the lesson — but "verheiratet" and
    "geboren" describe people, and "Die Suppe ist verheiratet" would be worse
    than the repetition it replaced. Anything outside the safe list is skipped.
  * Every frame is nominative. An accusative one would change the article the
    drill is asking for.

Sentences already written by hand (anything that is not the stock one) are
left alone.
"""
import pathlib
import random
import re
import sys

SOURCE = pathlib.Path.home() / "Documents/Claude/Projects/Chris/Deutsche (Zero to B2)/Deutsche_Meister_Vocabulary.md"

# Adjectives that can follow any noun without saying something untrue or odd.
SAFE_ADJECTIVES = {
    'neu', 'alt', 'gut', 'schön', 'wichtig', 'klein', 'groß', 'teuer', 'billig',
    'interessant', 'toll', 'schwer', 'leicht', 'praktisch', 'modern', 'bekannt',
    'beliebt', 'bequem', 'sauber', 'ruhig', 'perfekt', 'super', 'prima', 'nett',
    'hell', 'dunkel', 'warm', 'kalt', 'frei', 'fertig', 'richtig', 'falsch',
    'einfach', 'typisch', 'lang', 'kurz', 'breit', 'schmal', 'hoch', 'tief',
}

SINGULAR_FRAMES = [
    '{art} {noun} ist {adj}.',
    'Das ist {art} {noun}.',
    'Hier ist {art} {noun}.',
    'Wo ist {art} {noun}?',
    '{art} {noun} gefällt mir.',
]
PLURAL_FRAMES = [
    'Die {plural} sind {adj}.',
    'Das sind die {plural}.',
    'Hier sind die {plural}.',
    'Wo sind die {plural}?',
    'Die {plural} gefallen mir.',
]

STOCK = re.compile(r'\b(ist|sind)\s+wichtig\.?$')


def cells(line):
    return [c.strip() for c in line.strip().strip('|').split('|')]


def main(write=False):
    lines = SOURCE.read_text(encoding='utf-8').splitlines()

    # First pass: which adjectives does each lesson have?
    lesson, header, adjectives = None, None, {}
    for line in lines:
        m = re.match(r'^## ([AB][12]\.\d) · (Intro|Lesson (\d+))', line)
        if m:
            lesson = (m.group(1), m.group(2))
            header = None
            continue
        if not line.startswith('|'):
            continue
        row = cells(line)
        if row[0].lower().startswith('german word'):
            header = [c.lower() for c in row]
            continue
        if re.match(r'^:?-+$', row[0]) or not header:
            continue
        data = dict(zip(header, row))
        if data.get('word type', '').lower().startswith('adj'):
            word = data['german word (singular)'].split('(')[0].strip().rstrip('-')
            if word.lower() in SAFE_ADJECTIVES:
                adjectives.setdefault(lesson, []).append(word.lower())

    # Second pass: write the sentences.
    out, header, lesson = [], None, None
    changed = 0
    samples = []
    for line in lines:
        m = re.match(r'^## ([AB][12]\.\d) · (Intro|Lesson (\d+))', line)
        if m:
            lesson = (m.group(1), m.group(2))
            header = None
        if not line.startswith('|'):
            out.append(line)
            continue
        row = cells(line)
        if row[0].lower().startswith('german word'):
            header = [c.lower() for c in row]
            out.append(line)
            continue
        if re.match(r'^:?-+$', row[0]) or not header:
            out.append(line)
            continue

        data = dict(zip(header, row))
        if data.get('word type', '').lower() != 'noun':
            out.append(line)
            continue

        display = data['german word (singular)']
        m2 = re.match(r'^((?:der|die|das)(?:\s*/\s*(?:der|die|das))*)\s+(.*)$', display)
        if not m2:
            out.append(line)
            continue
        article = m2.group(1).split('/')[0].strip()
        noun = re.sub(r'\s*\([^)]*\)', '', m2.group(2)).replace('(', '').replace(')', '').strip()

        # Same word, same sentence, every run.
        rng = random.Random(f'{lesson}-{display}')
        # A lesson's own adjectives sound like the lesson. With none of its own,
        # fall back to the few that sit comfortably on anything at all — "Die
        # Frage ist groß" is grammatical and still wrong-sounding.
        pool = adjectives.get(lesson) or ['neu', 'gut', 'schön', 'wichtig', 'interessant']
        adj = rng.choice(pool)

        singular = data.get('singular example', '-')
        # Rewrite the stock sentence — and any sentence that prints the very
        # article it is asking for, whoever wrote it.
        reveals = bool(
            singular
            and singular != '-'
            and re.search(rf'(?<!\w){article}(?!\w)', re.sub(rf'(?<!\w){article}\s+{re.escape(noun)}', '', singular, count=1, flags=re.IGNORECASE), re.IGNORECASE)
        )
        if singular and singular != '-' and (STOCK.search(singular) or reveals):
            # "Das ist das Ei." would print the answer as its own first word,
            # so a frame whose fixed words include this article is not used.
            usable = [
                f for f in SINGULAR_FRAMES
                if not re.search(rf'(?<!\w){article}(?!\w)', f.replace('{art}', ''), re.IGNORECASE)
            ] or SINGULAR_FRAMES
            frame = usable[rng.randrange(len(usable))]
            new_singular = frame.format(art=article, noun=noun, adj=adj)
            new_singular = new_singular[0].upper() + new_singular[1:]
            row[header.index('singular example')] = new_singular
            changed += 1
            if len(samples) < 8:
                samples.append(new_singular)

        plural_display = data.get('plural', '-')
        plural_example = data.get('plural example', '-')
        if plural_example and plural_example != '-' and STOCK.search(plural_example):
            bare = re.sub(r'^die\s+', '', plural_display.split('/')[0].strip(), flags=re.I)
            if bare and bare != '-':
                frame = PLURAL_FRAMES[rng.randrange(len(PLURAL_FRAMES))]
                row[header.index('plural example')] = frame.format(plural=bare, adj=adj)
                changed += 1

        out.append('| ' + ' | '.join(row) + ' |')

    print(f'sentences rewritten: {changed}')
    print('samples:')
    for s in samples:
        print('  ', s)

    if write:
        backup = SOURCE.with_suffix('.md.before-sentences')
        if not backup.exists():
            backup.write_text(SOURCE.read_text(encoding='utf-8'), encoding='utf-8')
            print(f'backup: {backup.name}')
        SOURCE.write_text('\n'.join(out) + '\n', encoding='utf-8')
        print(f'written: {SOURCE.name}')


main(write='--write' in sys.argv)
