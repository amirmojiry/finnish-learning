# Finnish Learning

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing Finnish vocabulary with Persian translations.

## Current features

- 100 high-frequency written Finnish word forms with Persian translations
- frequency rank, corpus occurrence count, and occurrence percentage
- dictionary with search, alphabetical/frequency sorting, and part-of-speech filters
- word detail pages with meaning, part of speech, lemma, examples, and pronunciation
- three exercise modes: translation, multiple-choice cloze, and typed cloze
- focused exercises for an individual dictionary word
- progressive hints and a compact letter keyboard in typing mode
- two Finnish examples with Persian translations for every entry
- linked dictionary words inside examples
- light and dark themes
- locally saved score, exercise mode, and theme

The vocabulary data is stored in [`data/common-words.json`](data/common-words.json).

## Vocabulary source

The ranking now uses the **Frequency List of Written Finnish Word Forms** provided by Kotus through the Language Bank of Finland. It is based on the Finnish Parole corpus of approximately 17 million written tokens.

Because this is a word-form frequency list, it includes inflected forms such as `suomen`, `vuoden`, `olivat`, and `suomessa`, as well as corpus items such as the abbreviation `mm` and the numeral `1`.

Each entry includes:

- frequency rank
- corpus occurrence count
- occurrence percentage
- Finnish word form
- Persian translation
- part of speech in English and Persian
- dictionary base form (`lemma`)
- two Finnish examples with Persian translations

Source: [Kotus / Kielipankki — Frequency List of Written Finnish Word Forms](https://www.kielipankki.fi/lexical-conceptual-resources/parole-taajuuslista/)

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Rebuild vocabulary data

The source frequency metadata and learning details are stored separately and merged into `data/common-words.json`:

```bash
node scripts/build-parole-vocabulary.mjs
```

## Roadmap

### Phase 1 — smarter review

- [ ] spaced-repetition review queue
- [ ] mastery score and answer history for each word
- [ ] focused practice for weak or frequently missed words
- [ ] filters by frequency range and lemma
- [ ] session length and difficulty settings

### Phase 2 — more exercise types

- [ ] reverse translation from Persian to Finnish
- [ ] listening and dictation exercises
- [ ] sentence-ordering exercises
- [ ] verb conjugation exercises
- [ ] Finnish case-form exercises
- [ ] pronunciation practice with speech recognition

### Phase 3 — personal learning app

- [ ] daily goal, streak, and progress dashboard
- [ ] import and export learning progress
- [ ] bookmarks and custom word lists
- [ ] larger and topic-based decks
- [ ] installable Progressive Web App
- [ ] offline exercises
- [ ] accessibility audit and improved screen-reader support
