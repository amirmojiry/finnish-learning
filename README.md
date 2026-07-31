# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.0.0`
- Vocabulary entries: **200**
- Required quality gate: `npm test`
- Production deploys run only after the complete test suite passes.

See [Versioning](docs/VERSIONING.md) and [AI contribution rules](AGENTS.md).
<!-- PROJECT_STATUS_END -->

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing high-frequency Finnish word forms with Persian translations.

## Current features

- 200 high-frequency written Finnish word forms with Persian translations
- exact Parole source rank, corpus occurrence count, and occurrence percentage
- dictionary search and alphabetical or frequency sorting
- part-of-speech filters generated only from categories present in the current vocabulary
- dominant part of speech and morphological analysis derived from Universal Dependencies
- real UD corpus examples, including examples tied to specific morphological values
- word detail pages with meaning, lemma, examples, pronunciation, and corpus analysis
- three exercise modes: translation, multiple-choice cloze, and typed cloze
- focused practice for an individual dictionary word
- progressive hints and a compact Finnish letter keyboard
- linked dictionary words inside examples
- light and dark themes
- locally saved score, exercise mode, and theme

## Data ownership

The project keeps three data responsibilities separate:

- **Parole/Kotus/Kielipankki** supplies frequency rank, occurrence count, surface form, and occurrence percentage.
- **Universal Dependencies** supplies dominant UPOS, corpus-observed lemmas, morphology, dependencies, treebank distribution, and corpus examples.
- **Curated learning data** supplies Persian translations, fallback part-of-speech labels, learner-facing lemmas, and two Finnish/Persian example pairs.

The ranking is based on the [Frequency List of Written Finnish Word Forms](https://www.kielipankki.fi/lexical-conceptual-resources/parole-taajuuslista/), which uses the Finnish Parole corpus of approximately 17 million written tokens. Because this is a surface-form list, it includes inflected forms, abbreviations, and numerals. Tied source ranks are preserved in `frequency_rank`, while `position` and `rank` remain unique and sequential inside the app.

## Important data paths

- `data/common-words.json`: generated vocabulary consumed by the app
- `data/parole_frek_3.txt`: original Latin-1 Parole frequency list
- `data/vocabulary-details/`: reviewed detail bundles for future vocabulary ranges
- `data/ud/`: generated compact and detailed UD analysis files
- `ud-import-2.18/`: CoNLL-U source treebanks used by the UD pipeline
- `scripts/build-vocabulary.mjs`: reproducible vocabulary builder
- `tools/ud-import/`: UD extraction and browser-summary generators

Generated UD JSON files must not be edited manually.

## Add a vocabulary range

For a range such as positions 201–300:

1. Add a reviewed bundle such as `data/vocabulary-details/201-300.json` using the schema documented in that directory.
2. Run the vocabulary builder; source rank, count, form, and percentage are read directly from the original Parole file.
3. Regenerate the UD outputs.
4. Synchronize visible counts, cache keys, deployment metadata, and both README status blocks.
5. Use a MINOR version bump, update `CHANGELOG.md`, and run the complete test suite.

```bash
npm run build:vocabulary
python3 tools/ud-import/extract_ud.py
python3 tools/ud-import/enrich_multiword_tokens.py
python3 tools/ud-import/enrich_ui_examples.py
python3 tools/ud-import/build_ui_summary.py
python3 tools/ud-import/connect_ui.py
npm run sync
npm test
```

The GitHub UD workflow performs the same generation and validation automatically when its inputs change.

## Development commands

```bash
npm run sync
npm test
npm run test:js
npm run test:data
```

Version commands:

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

`VERSION` is the canonical application version. Version commands synchronize `package.json`, local asset cache keys, deployment metadata, the changelog scaffold, and both README status blocks.

## Run locally

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Quality and deployment

Pull requests and non-main branches run continuous integration. The suite checks semantic-version consistency, vocabulary reproducibility, exact Parole alignment, vocabulary schema, UD coverage, the `ovat → AUX` regression fixture, feature-specific examples, dynamic POS filters, script order, documentation parity, English-only source comments, and deployment wiring.

GitHub Pages deployment depends on the complete validation job and cannot publish a revision with failing tests or stale generated files.

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
