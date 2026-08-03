# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.4.1`
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
- a complete prototype A1.1 section with 10 sequential lessons and 15 deterministic activities per lesson
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

### Phase 1 — smarter review

- [x] **Spaced-repetition review queue.** It prioritizes overdue words and introduces at most ten new words per local day. Correct and incorrect answers automatically schedule the next review and persist the schedule in local storage.
- [ ] **Mastery score and answer history for each word.** Aggregate accuracy and current review state are now visible, but a chronological event history is still pending. The completed feature will show when every answer occurred and how it changed the word schedule.
- [ ] **Focused practice for weak or frequently missed words.** A dedicated session will select words with low accuracy, repeated lapses, or short review intervals. Learners will be able to practice this weak set without mixing it with already stable vocabulary.
- [ ] **Filters by frequency range and lemma.** The dictionary and practice pool will support selecting source-rank ranges and grouping inflected forms by their lemma. These filters will make it easier to study a defined frequency band or all forms of the same base word.
- [ ] **Session length and difficulty settings.** Learners will choose how many questions a session contains and how many new words may appear. Difficulty controls will adjust distractor similarity, hint availability, and the balance of exercise modes.

### Phase 2 — more exercise types

- [ ] **Reverse translation from Persian to Finnish.** The prompt will show a Persian meaning and require selecting or typing the matching Finnish form. Accepted alternatives will be handled explicitly so ambiguous translations do not produce unfair errors.
- [ ] **Listening and dictation exercises.** The app will play a Finnish word or sentence without initially showing its written form. Learners will type what they hear and receive feedback on spelling and the intended vocabulary item.
- [ ] **Sentence-ordering exercises.** Sentence tokens will be shuffled and presented as movable or selectable pieces. The completed order will be checked against a real or curated Finnish sentence while preserving punctuation.
- [ ] **Verb conjugation exercises.** A lemma, person, tense, and mood will define the requested verb form. Answers will be validated against reviewed conjugation data rather than generated guesses.
- [ ] **Finnish case-form exercises.** Learners will produce or identify noun, adjective, and pronoun forms for a specified grammatical case. Examples and UD features will provide context for why each case is used.
- [ ] **Pronunciation practice with speech recognition.** The app will record a spoken Finnish word or short sentence and compare it with the target. Feedback will focus on intelligibility and likely mismatches without presenting the score as a clinical pronunciation assessment.

### Phase 3 — personal learning app

- [ ] **Daily goal, streak, and progress dashboard.** Learners will set a realistic daily target based on answered questions or completed reviews. The dashboard will visualize consistency, vocabulary growth, due workload, and longer-term trends.
- [ ] **Import and export learning progress.** Review history and personal settings will be downloadable in a documented portable format. The importer will validate versions and preserve existing data unless the learner explicitly approves replacement.
- [ ] **Bookmarks and custom word lists.** Any dictionary entry will be addable to named personal lists such as work, travel, or difficult words. These lists will be available as filters and dedicated practice pools.
- [ ] **Larger and topic-based decks.** The vocabulary system will support additional frequency ranges and curated thematic collections. Deck metadata will identify source, level, coverage, and compatibility with the available exercises.
- [ ] **Installable Progressive Web App.** A web app manifest and service worker will allow installation from supported browsers. Updates will be version-aware so cached files cannot silently mix incompatible releases.
- [ ] **Offline exercises.** Core vocabulary, selected examples, and practice logic will remain usable without a network connection. Progress recorded offline will be stored locally and reconciled safely when online features become available.
- [ ] **Accessibility audit and improved screen-reader support.** The interface will be tested for keyboard use, focus order, contrast, motion preferences, and semantic announcements. Findings will become regression checks so later UI changes do not reintroduce known barriers.
