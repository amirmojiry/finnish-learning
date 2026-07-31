# AI contribution rules

These rules apply to every AI-assisted change in this repository. Read this file before editing code, data, workflows, tests, or documentation.

## 1. Required workflow

1. Inspect the current implementation and all files affected by the requested behavior.
2. Make the smallest coherent change that preserves existing functionality.
3. Run `npm run sync` whenever version, vocabulary data, assets, or documented counts change.
4. Run `npm test` before declaring the work complete.
5. Do not merge or deploy with failing tests, stale generated files, unsynchronized documentation, or an unexplained data-coverage regression.
6. Update `CHANGELOG.md` and bump the semantic version when the change is user-visible or changes data behavior.

## 2. Language and code style

- Code identifiers, code comments, docstrings, log messages intended for developers, commit messages, and workflow step names must be in English.
- Persian is allowed for user-interface copy, Persian translations, Persian examples, and Persian documentation.
- Do not place Persian text in source-code comments.
- Keep scripts deterministic and idempotent. Running a generator twice with unchanged inputs must produce no diff.
- Prefer standard-library solutions. Introduce a dependency only when its value clearly exceeds its maintenance cost.

## 3. Data-source ownership

Do not mix the responsibilities of the data sources:

- **Parole/Kotus/Kielipankki** owns written-corpus frequency rank, frequency count, and frequency percentage.
- **Universal Dependencies** owns dominant UPOS, lemmas observed in the treebanks, morphological features, dependency relations, treebank distribution, and corpus examples.
- **Curated application data** owns Persian translations and learner-oriented Finnish/Persian example pairs.

A derived field must identify or preserve its source semantics. Never replace Parole frequency percentages with UD percentages, or use a manually assigned part of speech when a dominant UD analysis is available.

## 4. Vocabulary entry contract

Every entry in `data/common-words.json` must contain:

- `position`: unique sequential application position starting at 1
- `rank`: unique sequential display rank starting at 1
- `frequency_rank`: positive official source rank; ties are allowed
- `word`: non-empty and unique after Unicode-aware normalization
- `frequency_count`: positive integer from the original Parole frequency file
- `frequency_percent`: percentage derived from `frequency_count / token_total * 100`
- `translation_fa`: reviewed non-empty Persian translation
- `part_of_speech` and `part_of_speech_fa`: valid fallback values; the running app replaces them with the dominant UD UPOS when available
- `lemma`: non-empty base form
- `examples`: exactly two learner-oriented examples, each with non-empty `fi` and `fa` values

Do not manually edit generated UD JSON files. Change their inputs or generators and regenerate them.

## 5. Adding a vocabulary range

When adding entries such as positions 201–300:

1. Import frequency form, source rank, count, and percentage from the original Parole source.
2. Add reviewed Persian translation, fallback POS, lemma, and exactly two bilingual examples for every entry.
3. Regenerate `data/common-words.json` through the build script rather than hand-editing the final generated file.
4. Regenerate all UD analysis and browser-summary files.
5. Confirm that every vocabulary form has a corresponding summary row, even when the treebanks contain no simple-token UPOS analysis.
6. Confirm dominant UPOS ordering, percentages, feature-specific examples, and source coverage.
7. Ensure the dictionary count, hero count, quiz pool, search, sort, POS filters, detail view, all practice modes, and linked-word behavior use the enlarged data set.
8. Ensure POS filter options are derived from currently loaded words after dominant UD POS synchronization. Empty categories are forbidden.
9. Run synchronization so `index.html`, the deployment marker, and both README status blocks show the new count.
10. Use a MINOR version bump, update `CHANGELOG.md`, and run the complete test suite.

Never hardcode a vocabulary total in application logic, generators, workflows, or tests. Derive it from `data/common-words.json`. A human-facing current count may appear only in generated/synchronized output.

## 6. Tests and regression protection

The required command is:

```bash
npm test
```

The suite must cover at least:

- semantic-version consistency and asset cache keys
- vocabulary schema, uniqueness, sequential positions, frequency arithmetic, translations, lemmas, and examples
- alignment between vocabulary and UD browser summary
- dominant-UPOS ordering and the known `ovat` AUX/indicative regression fixture
- dictionary POS option generation, stale-option removal, valid-selection preservation, and invalid-selection reset
- required asset order and UI integration contracts
- synchronized English and Persian README status facts
- English-only source-code comments
- deployment blocked behind the validation job

When fixing a bug, add or strengthen a test that fails without the fix. Do not weaken an assertion merely to make CI pass unless the underlying product contract has deliberately changed and is documented.

## 7. UI and accessibility

- Preserve right-to-left Persian layout and left-to-right Finnish text where appropriate.
- Keep mobile behavior, keyboard navigation, focus handling, semantic controls, and ARIA labels working.
- New filters must reflect only values present in the current data.
- Escape corpus text before injecting it into HTML.
- Do not load large source-analysis files in the browser when a compact generated summary can provide the required UI data.

## 8. Documentation synchronization

- `README.md` and `README.fa.md` must be updated in the same change and must state the same version, vocabulary count, commands, features, and limitations.
- Keep language-specific prose natural; synchronization means factual parity, not line-by-line literal translation.
- Update architecture or data-pipeline documentation when file responsibilities, schemas, generators, workflows, or release steps change.
- Update `CHANGELOG.md` for every released user-visible change.
- Run `npm run sync` rather than manually changing generated project-status blocks or cache keys.

## 9. Git and deployment

- Use clear English commit messages.
- Keep generated outputs in the same pull request as their source changes.
- GitHub Pages must depend on the full validation job.
- Do not bypass CI, remove a quality gate, or deploy an untested state to resolve a workflow failure.
- Treat a green workflow as necessary but still inspect the generated diff for unexpected data loss or count changes.

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
