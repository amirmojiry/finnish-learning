# AI contribution rules

These rules apply to every AI-assisted change in this repository. Read this file before editing code, data, workflows, tests, or documentation.

## 1. Required workflow

1. Inspect the current implementation and every file affected by the requested behavior.
2. Make the smallest coherent change that preserves existing functionality.
3. Run `npm run sync` whenever the version, vocabulary data, local assets, or documented counts change.
4. Run `npm test` before declaring the work complete.
5. Do not merge or deploy with failing tests, stale generated files, unsynchronized documentation, or an unexplained data-coverage regression.
6. Update `CHANGELOG.md` and bump the semantic version when a change is user-visible or changes data behavior.
7. For a bug fix, add or strengthen a regression test that fails without the fix.

## 2. Language and code style

- Code identifiers, code comments, docstrings, developer-facing logs, commit messages, and workflow step names must be in English.
- Persian is allowed for user-interface copy, Persian translations, Persian examples, and Persian documentation.
- Do not place Persian text in source-code comments.
- Keep scripts deterministic and idempotent. Running a generator twice with unchanged inputs must produce no diff.
- Prefer standard-library solutions. Introduce a dependency only when its value clearly exceeds its maintenance cost.

## 3. Data-source ownership

Do not mix the responsibilities of the data sources:

- **Parole/Kotus/Kielipankki** owns written-corpus `frequency_rank`, `frequency_count`, `word`, and `frequency_percent`. These four values must match the corresponding line in `data/parole_frek_3.txt` exactly.
- **Universal Dependencies** owns dominant UPOS, corpus-observed lemmas, morphological features, dependency relations, treebank distribution, and corpus examples.
- **Curated application data** owns Persian translations, fallback part-of-speech labels, learner-oriented Finnish/Persian example pairs, and the learner-facing lemma.

Never replace Parole frequency percentages with UD percentages. Never present a manually assigned fallback part of speech when a dominant UD analysis is available.

Frequency-based learning coverage must be calculated only by summing the Parole `frequency_percent` values of matching surface forms. A reviewed form has at least one recorded spaced-repetition answer; a mastered form must satisfy the current spaced-repetition mastery rule. Label these values as approximate written-corpus token coverage. Never describe them as a literal percentage of Finnish understood, known, or communicatively mastered.

## 4. Vocabulary entry contract

Every entry in `data/common-words.json` must contain the following fields:

- `position`: unique sequential application position starting at 1
- `rank`: unique sequential display rank starting at 1
- `frequency_rank`: positive official source rank; tied source ranks are allowed
- `word`: non-empty and unique after Unicode-aware normalization
- `frequency_count`: positive integer copied from the matching Parole source row
- `frequency_percent`: percentage copied from the matching Parole source row
- `translation_fa`: reviewed non-empty Persian translation
- `part_of_speech`: non-empty English fallback category
- `part_of_speech_fa`: non-empty Persian fallback category
- `lemma`: non-empty learner-facing base form
- `example_fi` and `example_fa`: the first non-empty bilingual learner example
- `example_2_fi` and `example_2_fa`: the second non-empty bilingual learner example

The two Finnish examples for newly added entries must contain the target surface form as a separate word or numeric token. Do not replace the four flat example fields with an incompatible nested schema unless the application, generator, tests, documentation, and migration are changed together in a MAJOR release.

Do not manually edit generated files under `data/ud/`. Change their inputs or generators and regenerate them.

## 5. Adding a vocabulary range

When adding entries such as positions 201–300:

1. Add reviewed learning details for every new source form: Persian translation, English and Persian fallback POS, lemma, and two bilingual examples.
2. Build `data/common-words.json` from the original Latin-1 Parole file and curated details; do not manually type source ranks, counts, forms, or percentages into the generated output.
3. Confirm `position` and display `rank` remain unique and sequential while `frequency_rank` preserves source ties.
4. Regenerate all UD analysis and compact browser-summary files.
5. Confirm every vocabulary form has a corresponding UD summary row, including forms with no simple-token UPOS evidence.
6. Confirm dominant UPOS ordering, percentages, feature-specific examples, and source coverage.
7. Confirm the hero count, about-page count, dictionary count, quiz pool, search, sorting, detail view, all practice modes, linked-word behavior, and frequency popover use the enlarged data set.
8. Confirm POS filter options are derived from currently loaded words after dominant UD POS synchronization. Empty categories are forbidden.
9. Run `npm run sync` so `index.html`, `deploy-version.txt`, `README.md`, and `README.fa.md` show the new count and current version.
10. Use a MINOR version bump, update `CHANGELOG.md`, and run `npm test`.

Never hardcode a vocabulary total in application logic, generators, workflows, or tests. Derive it from `data/common-words.json`. A current count may appear only in synchronized user-facing output.

## 6. Tests and regression protection

The required command is:

```bash
npm test
```

The suite must cover at least:

- semantic-version consistency and local-asset cache keys
- exact alignment of all frequency fields with the original Parole file
- vocabulary schema, uniqueness, sequential positions, translations, lemmas, and both bilingual examples
- alignment between vocabulary and the UD browser summary
- dominant-UPOS ordering and the known `ovat` AUX/indicative regression fixture
- dictionary POS option generation, stale-option removal, valid-selection preservation, and invalid-selection reset
- spaced-repetition queue behavior, reviewed-word ordering, per-word status, and reviewed/mastered frequency coverage
- separate Profile and Settings view ownership and primary navigation contracts
- required script order and UI integration contracts
- synchronized English and Persian README status facts
- English-only source-code comments
- deployment blocked behind the complete validation job

Do not weaken an assertion merely to make CI pass. Change a test contract only after confirming the production schema or intended product behavior and documenting that decision.

## 7. UI and accessibility

- Preserve right-to-left Persian layout and left-to-right Finnish text where appropriate.
- Keep mobile behavior, keyboard navigation, focus handling, semantic controls, and ARIA labels working.
- New filters must reflect only values present in the current data.
- Rebuild the POS filter after UD dominant-POS synchronization.
- Escape corpus text before injecting it into HTML.
- Do not load large source-analysis files in the browser when a compact generated summary can provide the required UI data.
- Interactive statistics must use semantic buttons and expose expanded state and controlled regions when they reveal details.
- Profile owns spaced repetition, reviewed-word history, learning coverage, and progress summaries. Settings owns only appearance controls and the link to About. Do not merge these views without an explicit product decision and matching tests and documentation.

## 8. Documentation synchronization

- `README.md` and `README.fa.md` must be updated in the same change and must state the same version, vocabulary count, commands, features, and limitations.
- Keep language-specific prose natural; factual synchronization does not require literal line-by-line translation.
- Update architecture or data-pipeline documentation when schemas, file responsibilities, generators, workflows, or release steps change.
- Update `CHANGELOG.md` for every released user-visible change.
- Run `npm run sync` rather than manually changing generated project-status blocks, visible counts, or cache keys.

## 9. Git and deployment

- Use clear English commit messages.
- Keep generated outputs in the same pull request as their source changes.
- GitHub Pages must depend on the complete validation job.
- Do not bypass CI, remove a quality gate, or deploy an untested state to resolve a workflow failure.
- A green workflow is necessary but not sufficient: inspect the generated diff for unexpected data loss, count changes, or coverage reductions.

## 10. Completion checklist

A change is complete only when:

- requested behavior is implemented
- relevant regression tests exist
- all tests pass
- generated files are current
- version and changelog are correct
- English and Persian documentation are factually synchronized
- no empty POS filter category is possible
- no existing practice mode or dictionary behavior is unintentionally changed
