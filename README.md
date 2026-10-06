# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.19.0`
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
- a dedicated Word Practice surface whose Smart Review rotates between translation, multiple-choice cloze, and typed cloze
- complete 40-lesson A1.1 path with circular lesson maps, per-section progress, jump entry points at the first lesson of every section, quick navigation back to the current learnable lesson, Persian-to-Finnish productive recall, Finnish-voice-gated listening and dictation, structured sentence-building, and reviewed introductory morphology practice
- distraction-free active lessons with hidden global navigation, compact integrated progress, and in-viewport answer feedback
- Word Practice spaced-repetition review queue with due-word priority and a ten-new-word daily limit
- clickable reviewed-word history with accuracy and learning state
- per-word review status on dictionary detail pages
- approximate reviewed and mastered token coverage derived from Parole frequency percentages
- persistent local review scheduling, answer counts, lapses, and mastery status for each started word
- four-destination navigation: Course, Dictionary, Word Practice, and Settings; legacy Home/Profile surfaces are removed
- typed grading accepts a/ä and o/ö keyboard substitutions as near-correct while still showing the canonical Finnish spelling
- linked dictionary words inside examples
- Settings shows live Finnish speech-voice availability and device-specific installation guidance alongside light and dark themes
- locally saved course progress, theme, review scheduling, answer history, and mastery state

The coverage percentage is an estimate of how much of the written Parole corpus is represented by reviewed surface forms. It is not a literal measurement of complete Finnish comprehension or communicative ability.

## Data ownership

The project keeps three data responsibilities separate:

- **Parole/Kotus/Kielipankki** supplies frequency rank, occurrence count, surface form, and occurrence percentage.
- **Universal Dependencies** supplies dominant UPOS, corpus-observed lemmas, morphology, dependencies, treebank distribution, and corpus examples.
- **Curated learning data** supplies Persian translations, fallback part-of-speech labels, learner-facing lemmas, and two Finnish/Persian example pairs.

The ranking is based on the [Frequency List of Written Finnish Word Forms](https://www.kielipankki.fi/lexical-conceptual-resources/parole-taajuuslista/), which uses the Finnish Parole corpus of approximately 17 million written tokens. Because this is a surface-form list, it includes inflected forms, abbreviations, and numerals. Tied source ranks are preserved in `frequency_rank`, while `position` and `rank` remain unique and sequential inside the app.

## Important data paths

- `data/common-words.json`: generated vocabulary consumed by the app
- `data/course/a1.1-section-1.json` through `data/course/a1.1-section-4.json`: reviewed manifests for the complete A1.1 path
- `data/course/a1.2-curriculum.json`: reviewed A1.2 curriculum targets used by the vocabulary-gap analysis
- `data/course/a1.2-vocabulary-gap.json`: generated A1.2 lexical coverage and source-gap report
- `data/parole_frek_3.txt`: original Latin-1 Parole frequency list
- `data/vocabulary-details/`: reviewed detail bundles for future vocabulary ranges
- `data/ud/`: generated compact and detailed UD analysis files
- `ud-import-2.18/`: CoNLL-U source treebanks used by the UD pipeline
- `scripts/build-vocabulary.mjs`: reproducible vocabulary builder
- `scripts/analyze-a1-2-vocabulary.mjs`: deterministic A1.2 gap analyzer
- `tools/ud-import/`: UD extraction and browser-summary generators

Generated UD JSON files and `data/course/a1.2-vocabulary-gap.json` must not be edited manually.

## Regenerate the A1.2 vocabulary-gap report

The A1.2 gap report compares the lexical targets in `data/course/a1.2-curriculum.json` with the current generated vocabulary in `data/common-words.json` and the original Parole source file referenced by the vocabulary metadata.

```bash
node scripts/analyze-a1-2-vocabulary.mjs
node scripts/analyze-a1-2-vocabulary.mjs --check
```

Run the first command after A1.2 curriculum targets, the current vocabulary, or the underlying Parole source changes. The `--check` form is the reproducibility guard used by tests and fails when the committed report is stale.

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
- [x] Turn the current 10-lesson prototype into a coherent A1.1 path.
- [x] Ensure every lesson deliberately combines high-frequency vocabulary, topic vocabulary, useful expressions/sentence frames, and a grammar or morphology objective.
- [x] Add lesson summaries and short explicit grammar explanations where useful.
- [x] Define prerequisite and recycling relationships between lessons.
- [x] Add deterministic completeness checks for lesson manifests and accepted answers.

### Phase 2 — richer A1.1 practice

- [x] Add Persian-to-Finnish production.
- [x] Add listening and dictation using an explicitly detected installed Finnish browser speech voice, with a no-penalty fallback when Finnish TTS is unavailable and a course contract ready for future static or build-time-generated audio.
- [x] Add sentence ordering, expression completion, and controlled sentence production.
- [x] Add morphology-aware distractors and introductory inflection exercises from explicit reviewed forms.
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
