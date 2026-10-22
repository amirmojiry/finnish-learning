# Finnish Learning

<!-- PROJECT_STATUS_START -->
## Project status

- Version: `1.65.0`
- Vocabulary entries: **425**
- Required quality gate: `npm test`
- Production deploys run only after the complete test suite passes.

See [Versioning](docs/VERSIONING.md) and [AI contribution rules](AGENTS.md).
<!-- PROJECT_STATUS_END -->

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing high-frequency Finnish word forms with Persian translations.

## Current features

**v1.65.0: eight A1.3 Section 4 recent-past and end-of-A1 lessons.** Eight coherent fresh-start lessons about earlier events, places, plans, choices and short written narratives now have **233 rather than 252 authored activities** and **165 rather than 184 graded answers**. All 19 omitted reviews were independently graded earlier, and all **54 introduced targets** retain later independently graded retrieval in effective lesson editions. Past grammar, Finnish listening and dictation, event ordering, two integrated passages and writing tasks stay intact. The already-curated **final A1.3 Lesson 10 checkpoint (80% required)** and historic lesson progress/SRS remain untouched. Course-wide **47 curated lessons / 189 fewer graded opportunities** against original authored editions. [Editorial details](docs/LESSON-EDITORIAL-REDUCTION.md) · [Parent #189](https://github.com/amirmojiry/finnish-learning/issues/189).

**v1.64.0: eight A1.3 Section 3 study/work and communication lessons** (clarification, instructions, needs, people, messages, deadlines, absence and an integrated workday). For fresh starts, the eight lessons have **229 instead of 250 authored activities** and **162 instead of 183 independent graded responses**, retaining grammar, Finnish recognition/dictation, productive speaking/writing, integrated reading and **later graded practice for all 56 newly introduced exact targets** in effective lesson editions. Archived originals, user progress and SRS are unchanged. Overall **39 curated lessons / 170 fewer graded opportunities** than original. [Editorial audit](docs/LESSON-EDITORIAL-REDUCTION.md) · [Parent #189](https://github.com/amirmojiry/finnish-learning/issues/189).

**v1.63.0: eight A1.3 Section 2 housing and neighborhood lessons** (household objects, chores, home repairs, local services, opening hours and community notices). New starts use **239 rather than 259 authored activities**, with **166 rather than 186 independently graded answers** and 18–24 initial screens per lesson. Crucially, **all 59 newly introduced exact targets retain subsequent graded retrieval in later effective lessons**; earlier scoring for each omitted reviewed item, introductory teaching/assessment, Finnish listening and prepared dictation, grammar, comprehension and writing are preserved. Original arrays, learner histories and SRS are unchanged. Overall **31 curated lessons / 149 fewer graded opportunities** than historical editions. [Bilingual editorial rationale](docs/LESSON-EDITORIAL-REDUCTION.md) · [#189](https://github.com/amirmojiry/finnish-learning/issues/189).

**v1.62.0: restore spaced-review integrity in eight A1.2 Section 4 lessons.** The original v1.60.0 editorial edit inadvertently removed every *later* scored retrieval of 28 of 72 introduced targets. Revision `v2` restores the necessary reviews and adds a gate for **all 72** targets. The eight health/weather lessons now have **267 instead of 282 activities and 181 instead of 196 graded answers**, preserving original histories, SRS, dictation, grammar and integrated comprehension. Project-wide **23 curated lessons / 129 fewer graded opportunities** than original (the v1.61.0 total of 157 is historical, before the repair). [Editorial audit](docs/LESSON-EDITORIAL-REDUCTION.md) · [Issue #207](https://github.com/amirmojiry/finnish-learning/issues/207).

**v1.61.0: eight curated A1.2 Section 3 lessons** (frequency, study/work, interests, weekly arrangements, invitations and messages). New starts use **257 instead of 277 authored activities** and **175 instead of 195 independently graded opportunities**. The selection was revised after self-review to **retain a later independently graded retrieval for every one of the section's 79 introduced exact-form targets**. All first teaching, grammar, listening and prepared Finnish dictation, integrated week comprehension and guided writing remain; older local progress and SRS are preserved. Overall **23 curated lessons / 157 fewer graded opportunities**, versus the historical **15 lessons / 137** in v1.60.0. [Editorial reasoning](docs/LESSON-EDITORIAL-REDUCTION.md) · [Parent #189](https://github.com/amirmojiry/finnish-learning/issues/189).

**v1.60.0, eight-lesson health/weather editorial batch:** A1.2 Section 4 Lessons 2–9 now have shorter fresh-start editions (282→239 activities; 196→153 independently graded responses; 13–23 initial screens per lesson). All new-target teaching and correct-answer retrieval, the indexed grammar assessments, Finnish listening/production, and Lesson 9's full two-passage comprehension and guided writing remain. Original activities and historical progress/SRS are preserved. **15 curated lessons / 137 fewer graded opportunities** in total; historical v1.59.0 introduced seven editions / 94 fewer. [English rationale and per-target deferral QA](docs/LESSON-EDITORIAL-REDUCTION.md) · [فارسی](docs/LESSON-EDITORIAL-REDUCTION.fa.md) · [Tracking #189](https://github.com/amirmojiry/finnish-learning/issues/189).

In **v1.59.0**, the A1.2 Section 1 Lesson 9 shopping dialogue has a reviewed 13-slide, 22-activity edition for fresh learners (26→17 independently graded responses, removing nine redundant typing drills). Its contextual dialogue, two reading questions, listening, six grammar-evidence activities and productive sentences remain; prior lesson histories and archived original activities are preserved. Across **seven curated lessons**, there are now **94 fewer graded opportunities** than in the original editions. Earlier v1.58.0 covered only the **six edited A1 lessons** (85 fewer). [Detailed English/Persian editorial audit](docs/LESSON-EDITORIAL-REDUCTION.md) · [Parent issue #189](https://github.com/amirmojiry/finnish-learning/issues/189).

Two additional A1.1 integrated-reading lessons (S3 L9 and S4 L9) now offer curated 21/20-slide fresh-attempt editions, with 28 and 27 graded answers instead of 44 each. Across the six edited A1 lessons, 85 graded answers are removed compared with the legacy editions; older saved drafts retain their original questions. See [editorial QA](docs/LESSON-EDITORIAL-REDUCTION.md) and `npm run lesson:editorial:report`.

Four prioritized A1 lessons now have **genuinely shorter** fresh-attempt editions: 52 fewer independently graded answers across those lessons and 18–24 initial visible screens per lesson, without weakening stated checkpoint target identities or grammar evidence. Paused v1.56 attempts resume the original version without losing their saved cursor. [English rationale and limitations](docs/LESSON-EDITORIAL-REDUCTION.md) · [فارسی](docs/LESSON-EDITORIAL-REDUCTION.fa.md) · `npm run lesson:editorial:report`. Other long lessons still need editorial work under #189.

Four high-load lessons support optional, locally saved study sittings of at most 15 visible slides and 20 graded responses per sitting, with resume/restart controls and unchanged checkpoint pass thresholds. **The original question count and sequence apply only when resuming a saved v1.56 legacy attempt**; fresh attempts use the shorter v1.57 editorial edition described above. [Read the pacing and accessibility limitations](docs/LESSON-PACING.md) · Run `npm run lesson:load:report` for the original-version pacing audit.

Grouped-slide presentation alone compresses originally long lessons to at most 30 initial screens **without changing scored answers**. This display-only behavior is distinct from the **four v1.57 editorial revisions above**, which intentionally remove 52 graded answers for fresh attempts while preserving v1.56 legacy drafts. [English grouping policy](docs/LESSON-SLIDE-COMPACTION.md) · [فارسی](docs/LESSON-SLIDE-COMPACTION.fa.md) · Run `npm run lesson:slides:report` for the historical content audit. Further editorial work remains in [issue #189](https://github.com/amirmojiry/finnish-learning/issues/189).

R2 enforces a 30-visible-slide ceiling for new authored lessons while preserving shipped lesson IDs; [learner-fatigue policy](docs/R2-LESSON-SLIDE-BUDGET.md). Existing long lessons are queued for editorial reduction under #189.

R3 supports curriculum-aligned **variable lesson counts per shipped section** (7/10/13 regression fixtures), with the last authored lesson as checkpoint. [English design](docs/VARIABLE-SECTION-LENGTHS.md) · [shipped/planned report](docs/SECTION-STRUCTURE-AUDIT.md). A2.1 Section 3 remains outline-only.

P2 contextual sense batch 2 maps five ambiguous forms to **15 reviewed course items / 24 lesson references** without globally merging homographs or transferring SRS mastery: [method](docs/P2-CONTEXTUAL-IDENTITY-BATCH2.md), [report](docs/P2-CONTEXTUAL-IDENTITY-BATCH2-REPORT.md).

P2 lexical identity batch 1 adds 40 explicitly reviewed noun/pronoun surface identities (47 total) with no learner mastery transfer: [review method](docs/P2-LEXICAL-IDENTITIES-BATCH1.md) and [reproducible report](docs/P2-IDENTITY-BATCH1-REPORT.md). Further P2/P5/R3 acceptance remains open.

Both shipped A2.1 sections now have scoped exact-form assessment and later-retrieval gates: [travel/past](docs/A21-SECTION1-ACCEPTANCE.md) and [healthcare/public services](docs/A21-SECTION2-ACCEPTANCE.md). This is not CEFR/YKI certification; P2/P5/R3 integration gates remain open.


- 425 high-frequency written Finnish word forms with Persian translations
- exact Parole source rank, corpus occurrence count, and occurrence percentage
- dictionary search and alphabetical or frequency sorting
- part-of-speech filters generated only from categories present in the current vocabulary
- dominant part of speech and morphological analysis derived from Universal Dependencies
- real UD corpus examples with local Persian translations for the displayed examples, plus sentence-level Finnish audio including examples tied to specific morphological values
- word detail pages with meaning, lemma, bilingual examples, per-example Finnish audio, pronunciation, and corpus analysis
- a dedicated Word Practice surface whose Smart Review rotates between translation, multiple-choice cloze, and typed cloze
- 140 playable lessons: A1.1 (40), A1.2 (40), A1.3 (40), and A2.1 Sections 1–2 (20 travel/past and healthcare/public-service lessons), with always-browsable A1.1/A1.2/A1.3/A2.1 course switching, section-style jump entry into implemented later sections, preserved cross-level progress, circular lesson maps, Persian-to-Finnish productive recall, Finnish listening and dictation, structured sentence-building, and reviewed morphology practice
- section-scoped focused practice that uses recent consecutive correct answers and immediate lesson-end recovery to resolve weak targets while retaining aggregate accuracy history
- bounded chronological course answer history with stable sequence order, session identity, response timing, productive-vs-recognition evidence, and typed-grading quality for future mastery decisions
- a fully implemented reviewed 40-lesson A1.2 curriculum, a reviewed and playable 40-lesson A1.3 curriculum, and an A2.1 40-lesson curriculum outline with Sections 1–2 playable and Sections 3–4 outline-only
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

A1.1, A1.2 and A1.3 each have 40 playable lessons; the first twenty A2.1 travel/past and healthcare/public-service lessons are also playable (140 total). A2.1 Sections 3–4 and A2.2–C2 remain future design targets. All stages require independent pedagogical assessment; exercise scores are not CEFR/YKI certification. Read the live audit before making a completion claim. The syllabus is a planning framework, not a CEFR/YKI certificate.

A2.1 travel lessons now pair plural-partitive recognition with supported typed production and later contextual review of `valokuvia`. These guided activities do not establish independent grammar mastery; see the [delivery roadmap](docs/ROADMAP.md).

A1.1 now links `minä olen` / `sinä olet` to explicit grammar choices, supported typing and later contextual review in introduction lesson 2 and dialogue lesson 9. This is a limited guided contrast, not full conjugation mastery. See the [delivery roadmap](docs/ROADMAP.md).

A1.1 also assesses `kuka` for person identity versus `mikä` for an object's name/type, with supported question-word typing, later contextual review and a checkpoint that reuses its existing targets. See the [delivery roadmap](docs/ROADMAP.md).

A1.1 Section 1 now has canonical overviews for all ten lessons and a reproducible acceptance check: every declared target has positive-answer coverage, introduced forms are not relabelled as new, and later lexical/grammar review is traced. Greetings and politeness remain honestly formulaic. Run `npm run section:a11:check`; see the [acceptance report](docs/A11-SECTION1-ACCEPTANCE.md). Lesson lengths vary with outcomes; learner scores and the original checkpoint target set are preserved.

A1.1 Section 2 also has complete ten-lesson overviews and a scoped acceptance gate: all 77 introduced surfaces/expressions have later positive retrieval, all numbers 0–20 are assessed, and profile review combines four reading facts with supported writing. Original checkpoint targets and saved scores remain intact; the section has 270 activities. Run `npm run section:a11:s2:check`; see the [Section 2 report](docs/A11-SECTION2-ACCEPTANCE.md). These opportunities do not certify grammar mastery or CEFR level.

A1.1 Section 3 now has complete ten-lesson overviews and acceptance checks for weekdays, whole hours, routine and all five explicit first-person negative mappings. All 80 introduced surfaces/expressions have later positive retrieval; the section has 282 activities and preserves original checkpoint targets and scores. Wrong forms such as `En syön` are rejected in negative transformations and explicitly marked grammatical answer tasks, while Finnish keyboard tolerance is retained. Run `npm run section:a11:s3:check`; see the [Section 3 report](docs/A11-SECTION3-ACCEPTANCE.md). Routine reading/writing remains supported practice, not CEFR certification.

A1.1 Section 4 completes canonical overviews and scoped acceptance gates for all forty lessons of the four-section A1.1 path (1,030 activities). Section 4 has 245 activities; all 65 introduced surfaces/expressions have later retrieval, including all ten animal names. Cafe ordering remains formulaic, and familiar-world reading/writing is supported. The final checkpoint retains its original answer scope and 80% threshold. Run `npm run section:a11:s4:check`; see the [Section 4 report](docs/A11-SECTION4-ACCEPTANCE.md). Content acceptance does not certify learner proficiency or complete the wider identity/review backlog.

A1.2 Section 1 now has canonical overviews for all ten shopping/services lessons (291 activities). All 71 introduced exact surfaces/expressions have later positive retrieval; six bounded grammar concepts have later review, with prerequisite context from all four A1.1 sections. Polite requests remain fixed phrases. The original fifteen checkpoint targets and 80% threshold are retained. Run `npm run section:a12:s1:check`; see the [acceptance report](docs/A12-SECTION1-ACCEPTANCE.md).

Dialogue and sequence ordering use a selected-answer box: choose phrases/items, click a selection to return it to the pool, or reset before explicitly submitting. Finnish dialogue turns stay in a left-to-right vertical sequence.

A1.2 Section 2 completes all ten transport/directions lesson overviews with 309 activities, later positive retrieval for 80 introduced exact surfaces/expressions and later review of five bounded grammar concepts. Timetable reading and three-sentence trip writing remain supported practice. Original item records, lesson IDs, fifteen checkpoint targets and the 80% threshold are preserved. Run `npm run section:a12:s2:check`; see the [acceptance report](docs/A12-SECTION2-ACCEPTANCE.md). These checks do not certify full paradigms or CEFR proficiency.

A1.2 Section 3 completes all ten routine, study/work, interests and arrangements overviews with 329 activities. All 79 introduced exact surfaces/expressions have later positive retrieval and six bounded grammar concepts have later review. Both existing passages assess four facts each; routine and week writing each use four taught sentences. All seven temporal weekdays are assessed and retrieved later. Original records, core lesson mappings, fifteen checkpoint targets and the 80% threshold remain intact. Run `npm run section:a12:s3:check`; see [the acceptance report](docs/A12-SECTION3-ACCEPTANCE.md). Invitations/cancellation remain fixed phrases; these tasks do not establish full paradigms or independent CEFR proficiency.

A1.2 Section 4 completes all forty lesson overviews and four scoped acceptance gates in the A1.2 path (1,267 activities). Section 4 has 338 activities; all 72 introduced exact surfaces/expressions have later retrieval and eight bounded grammar concepts have later review. Two original passages now assess four facts each, with supported four-sentence appointment writing. Every original record, core mapping, cumulative checkpoint target and the 80% threshold is preserved. Run `npm run section:a12:s4:check`; see [the acceptance report](docs/A12-SECTION4-ACCEPTANCE.md). Health content teaches language communication; fixed pain/polite requests do not establish full paradigms or independent CEFR proficiency.

A1.3 Section 1 now has canonical overviews for all ten messages/invitations/social lessons (300 activities). All 60 introduced exact surfaces/expressions have later retrieval and seven bounded grammar concepts have later review, with prerequisites from all eight A1.1/A1.2 sections. The A1.3 registry follows the existing master spine. Both original passages assess two facts each; four-sentence message writing is supported. Original records/core mappings, fifteen checkpoint targets and 80% threshold are retained. Run `npm run section:a13:s1:check`; see [the acceptance report](docs/A13-SECTION1-ACCEPTANCE.md). Tulen/Tulet is a two-person contrast; fixed suggestions do not establish full passive/conditional paradigms or CEFR proficiency.

A1.3 Section 2 completes all ten home/neighbourhood lesson overviews (305 activities). All 59 introduced exact surfaces/expressions have later positive retrieval; nine bounded grammar concepts have later review. Opening-hours reading and four-sentence repair writing are supported practice. The address ellipsis stays in recognition; a concrete address supports strict productive recall. Original records/core mappings, fifteen checkpoint targets and the 80% threshold are preserved. Run `npm run section:a13:s2:check`; see [the acceptance report](docs/A13-SECTION2-ACCEPTANCE.md). These checks do not certify full paradigms or CEFR proficiency.

A1.3 Section 3 completes all ten study/work lesson overviews (303 activities). All 56 introduced exact surfaces/expressions have later positive retrieval; twelve bounded grammar concepts have later review. Selected tehdä/Teen and lähettää/Lähetän pairs assess stems and one tt/t alternation; olin is past recognition, not free imperfect production. Three-step instructions, four reading facts and four-sentence message writing are supported practice. Original records/core mappings, fifteen checkpoint targets and the 80% threshold are preserved. Run `npm run section:a13:s3:check`; see [the acceptance report](docs/A13-SECTION3-ACCEPTANCE.md). These checks do not certify full paradigms or CEFR proficiency.

A1.3 Section 4 completes all ten recent-event/plan lesson overviews (307 activities). All 54 introduced exact surfaces/expressions have later retrieval; eight bounded grammar concepts have later review. Ten selected past forms have explicit recognition and checkpoint recognition; comparatives stay fixed phrases. Event ordering, four original reading facts and two four-sentence writing tasks are supported practice. Every original item/core mapping, fifteen cumulative checkpoint targets and the 80% threshold are preserved. All 120 A1 lessons now have canonical overviews and twelve scoped section gates (3,512 activities; A1.3: 1,215). Run `npm run section:a13:s4:check`; see [the acceptance report](docs/A13-SECTION4-ACCEPTANCE.md). Full paradigms, independent CEFR proficiency and wider parent-issue gates remain outside this acceptance.
