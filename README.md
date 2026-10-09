# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.28.1`
- Vocabulary entries: **400**
- Required quality gate: `npm test`
- Production deploys run only after the complete test suite passes.

See [Versioning](docs/VERSIONING.md) and [AI contribution rules](AGENTS.md).
<!-- PROJECT_STATUS_END -->

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing high-frequency Finnish word forms with Persian translations.

## Current features

- 400 high-frequency written Finnish word forms with Persian translations
- exact Parole source rank, corpus occurrence count, and occurrence percentage
- dictionary search and alphabetical or frequency sorting
- part-of-speech filters generated only from categories present in the current vocabulary
- dominant part of speech and morphological analysis derived from Universal Dependencies
- real UD corpus examples with local Persian translations for the displayed examples, plus sentence-level Finnish audio including examples tied to specific morphological values
- word detail pages with meaning, lemma, bilingual examples, per-example Finnish audio, pronunciation, and corpus analysis
- a dedicated Word Practice surface whose Smart Review rotates between translation, multiple-choice cloze, and typed cloze
- complete 40-lesson A1.1 path plus all 40 playable A1.2 lessons and 40 playable A1.3 lessons spanning shopping, transport, daily routines, health, social messages, home, neighborhood, study/work, recent events, and future plans, with always-browsable A1.1/A1.2/A1.3 course switching, section-style jump entry into implemented later sections, preserved cross-level progress, circular lesson maps, Persian-to-Finnish productive recall, Finnish listening and dictation, structured sentence-building, and reviewed morphology practice
- section-scoped focused practice that uses recent consecutive correct answers and immediate lesson-end recovery to resolve weak targets while retaining aggregate accuracy history
- bounded chronological course answer history with stable sequence order, session identity, response timing, productive-vs-recognition evidence, and typed-grading quality for future mastery decisions
- a fully implemented reviewed 40-lesson A1.2 curriculum and a reviewed and playable 40-lesson A1.3 curriculum
- distraction-free active lessons with hidden global navigation, compact integrated progress, and in-viewport answer feedback
- Word Practice spaced-repetition review queue with due-word priority and a ten-new-word daily limit
- clickable reviewed-word history with accuracy and learning state
- per-word review status on dictionary detail pages
- approximate reviewed and mastered token coverage derived from Parole frequency percentages
- persistent local review scheduling, answer counts, lapses, and mastery status for each started word
- four-destination navigation: Course, Dictionary, Word Practice, and Settings; legacy Home/Profile surfaces are removed
- typed grading accepts a/ä and o/ö keyboard substitutions as near-correct while still showing the canonical Finnish spelling
- linked dictionary words inside examples
- Settings shows whether Finnish speech uses an explicitly exposed fi voice or fi-FI browser/OS language routing, plus device-specific TTS guidance alongside light and dark themes
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
- `data/course/a1.2-curriculum.json`: reviewed 40-lesson A1.2 curriculum contract used by the vocabulary-gap analysis
- `data/course/a1.3-curriculum.json`: reviewed 40-lesson A1.3 curriculum contract completing the planned A1 subdivision model
- `data/course/a1.2-vocabulary-gap.json`: generated A1.2 lexical coverage and source-gap report
- `data/parole_frek_3.txt`: original Latin-1 Parole frequency list
- `data/vocabulary-details/`: reviewed detail bundles for source-backed vocabulary ranges, including positions 301–400
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

## Roadmap and documentation

[Browse the documentation hub](docs/README.md) to find the canonical curriculum, engineering and contribution guides.

- **Delivery priorities:** [roadmap in English](docs/ROADMAP.md) / [نسخهٔ فارسی](docs/ROADMAP.fa.md).
- **Content targets through C2:** [master syllabus](docs/MASTER-CURRICULUM.md) / [Persian syllabus](docs/MASTER-CURRICULUM.fa.md); authoritative data: [master curriculum JSON](data/course/master-curriculum.json).
- **Actual current coverage:** [curriculum implementation audit](docs/CURRICULUM-AUDIT.fa.md); regenerate live counts with `npm run curriculum:audit`.
- **Teaching design and research:** [Learning Design](docs/LEARNING-DESIGN.md) / [Persian version](docs/LEARNING-DESIGN.fa.md).

A1.1, A1.2 and A1.3 now each have 40 playable lessons (120 total); A2–C2 remain future design targets. All stages require independent pedagogical assessment; exercise scores are not CEFR/YKI certification. Read the live audit before making a completion claim. The syllabus is a planning framework, not a CEFR/YKI certificate.
