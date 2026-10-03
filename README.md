# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.6.0`
- Vocabulary entries: **300**
- Required quality gate: `npm test`
- Production deploys run only after the complete test suite passes.

See [Versioning](docs/VERSIONING.md) and [AI contribution rules](AGENTS.md).
<!-- PROJECT_STATUS_END -->

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing high-frequency Finnish word forms with Persian translations.

## Current features

- 300 high-frequency written Finnish word forms with Persian translations
- exact Parole source rank, corpus occurrence count, and occurrence percentage
- dictionary search and alphabetical or frequency sorting
- part-of-speech filters generated only from categories present in the current vocabulary
- dominant part of speech and morphological analysis derived from Universal Dependencies
- real UD corpus examples, including examples tied to specific morphological values
- word detail pages with meaning, lemma, examples, pronunciation, and corpus analysis
- three exercise modes: translation, multiple-choice cloze, and typed cloze
- a real curriculum-driven A1.1 Section 1 with 10 sequential learner-facing lessons and 15 deterministic activities per lesson
- focused practice for an individual dictionary word
- profile-based spaced-repetition review queue with due-word priority and a ten-new-word daily limit
- clickable reviewed-word history with accuracy and learning state
- per-word review status on dictionary detail pages
- approximate reviewed and mastered token coverage derived from Parole frequency percentages
- persistent local review scheduling, answer counts, lapses, and mastery status for each started word
- separate Profile page for review progress and Settings page for appearance controls and About access
- progressive hints and a compact Finnish letter keyboard
- linked dictionary words inside examples
- light and dark themes
- locally saved score, exercise mode, theme, and review progress

The coverage percentage is an estimate of how much of the written Parole corpus is represented by reviewed surface forms. It is not a literal measurement of complete Finnish comprehension or communicative ability.

## Data ownership

The project keeps three data responsibilities separate:

- **Parole/Kotus/Kielipankki** supplies frequency rank, occurrence count, surface form, and occurrence percentage.
- **Universal Dependencies** supplies dominant UPOS, corpus-observed lemmas, morphology, dependencies, treebank distribution, and corpus examples.
- **Curated learning data** supplies Persian translations, fallback part-of-speech labels, learner-facing lemmas, and two Finnish/Persian example pairs.

The ranking is based on the [Frequency List of Written Finnish Word Forms](https://www.kielipankki.fi/lexical-conceptual-resources/parole-taajuuslista/), which uses the Finnish Parole corpus of approximately 17 million written tokens. Because this is a surface-form list, it includes inflected forms, abbreviations, and numerals. Tied source ranks are preserved in `frequency_rank`, while `position` and `rank` remain unique and sequential inside the app.

## Important data paths

- `data/common-words.json`: generated vocabulary consumed by the app
- `data/course/a1.1-section-1.json`: reviewed manifest for the sample A1.1 section
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

Pull requests and non-main branches run continuous integration. The suite checks semantic-version consistency, vocabulary reproducibility, exact Parole alignment, vocabulary schema, UD coverage, the `ovat → AUX` regression fixture, feature-specific examples, dynamic POS filters, spaced-repetition scheduling, frequency coverage, reviewed-word ordering, per-word status, separate Profile and Settings navigation, script order, documentation parity, English-only source comments, and deployment wiring.

GitHub Pages deployment depends on the complete validation job and cannot publish a revision with failing tests or stale generated files.

## Roadmap

The roadmap is course-first: complete a coherent Finnish learning path before prioritizing convenience or gamification features.

### Phase 1 — complete A1.1

- [x] Define the complete A1.1 curriculum matrix from reviewed CEFR can-do outcomes.
- [ ] Turn the current 10-lesson prototype into a coherent A1.1 path.
- [ ] Ensure every lesson deliberately combines high-frequency vocabulary, topic vocabulary, useful expressions/sentence frames, and a grammar or morphology objective.
- [ ] Add lesson summaries and short explicit grammar explanations where useful.
- [ ] Define prerequisite and recycling relationships between lessons.
- [ ] Add deterministic completeness checks for lesson manifests and accepted answers.

### Phase 2 — richer A1.1 practice

- [ ] Add Persian-to-Finnish production.
- [ ] Add listening and dictation using static or build-time-generated audio where practical.
- [ ] Add sentence ordering, expression completion, and controlled sentence production.
- [ ] Add morphology-aware distractors and introductory inflection exercises.
- [ ] Add focused practice for weak or frequently missed course targets.
- [ ] Record chronological answer history needed for stronger mastery decisions.

### Phase 3 — expand the structured course

- [ ] Build A1.2 and A1.3 with the same reviewed curriculum model.
- [ ] Expand high-frequency vocabulary while preserving curated topic vocabulary.
- [ ] Add practical domains such as shopping, transport, home, work, weather, appointments, and health.
- [ ] Expand grammar in pedagogical order.
- [ ] Add short dialogues, readings, and listening passages that recycle earlier material.
- [ ] Move into A2 only after the A1 path is coherent and validated.

### Phase 4 — scale content safely

- [ ] Formalize topic taxonomy, expression metadata, and lexeme/surface-form links.
- [ ] Add course-level validation for missing vocabulary, grammar, expressions, and recycling targets.
- [ ] Use GitHub Actions only for validation or intentional build-time generation.
- [ ] Keep AI-generated learning content unpublished until reviewed or deterministically validated.
- [ ] Generate compact static lesson bundles and optional audio artifacts.

### Phase 5 — secondary learner features

- [ ] Session length and difficulty settings.
- [ ] Daily goals, streaks, and richer progress dashboards.
- [ ] Bookmarks and custom word lists.
- [ ] Import/export of local progress.
- [ ] Installable PWA and offline study.
- [ ] Accessibility and screen-reader improvements.

See [Learning design and curriculum plan](docs/LEARNING-DESIGN.md) for the detailed rationale and architecture.
