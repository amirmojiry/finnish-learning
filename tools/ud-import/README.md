# Finnish Universal Dependencies import: current pipeline

**Status: implemented and reproducible.** This is the current technical source of truth for the Finnish UD importer, not a proposed design. The initial July 2026 proposal has been [archived](../../docs/archive/ud-integration-plan-2026-07.md). See the [documentation hub](../../docs/README.md) for the distinction between current guidance and historical plans.

## Data ownership and provenance

- **Parole** owns the ranking, occurrence count and written-corpus percentage of each curated surface form in `data/common-words.json`; UD frequencies must never overwrite those fields.
- **Universal Dependencies (UD 2.18)** supplies corpus-observed lemmas, UPOS, morphological features, dependency relations, examples and treebank provenance. UD analysis can be ambiguous: do not pretend that a surface form has only one grammatical interpretation.
- **Curated Finnish/Persian content** supplies learner-facing translations, reviewed bilingual examples and Persian renderings of actual corpus sentences.
- Source CoNLL-U files from Finnish-TDT, Finnish-FTB, Finnish-OOD and Finnish-PUD are currently **checked in** under [`ud-import-2.18/`](../../ud-import-2.18/README.md). They are not disposable temporary uploads in the current repository.
- [`data/ud/metadata.json`](../../data/ud/metadata.json) records the treebank sources, individual licenses, checksums and input counts; [`coverage-report.json`](../../data/ud/coverage-report.json) gives actual form coverage. Counts must be read from those generated reports, not copied from the archived 200-word proposal.

## Reproducible extraction

Reusable extraction tooling enriches the Finnish Learning vocabulary with Finnish UD data. [`extract-ud-data.yml`](../../.github/workflows/extract-ud-data.yml) is a current **path-scoped or manually dispatched validation workflow**: it checks deterministic regeneration and uploads a review artifact; it does **not** auto-commit generated data. Any intentional regeneration must be reviewed and committed in the same issue branch/PR.



Inputs:
- `ud-import-2.18/*.conllu`
- `data/common-words.json`

Generated outputs under `data/ud/`:
- `word-analyses.json`
- `examples.json`
- `word-summary.json`
- `labels-fa.json`
- `metadata.json`
- `coverage-report.json`

The pull-request workflow runs the full deterministic pipeline in this order:

```bash
python3 tools/ud-import/extract_ud.py
python3 tools/ud-import/enrich_multiword_tokens.py
python3 tools/ud-import/enrich_ui_examples.py
python3 tools/ud-import/build_ui_summary.py
python3 tools/ud-import/connect_ui.py
python3 scripts/sync_project.py
python3 tools/ud-import/stabilize_generated_at.py
```

## After adding vocabulary or regenerating UD data

Regenerating `data/ud/word-summary.json` can introduce new real corpus sentences in either of the two UI locations that render UD examples:

- top-level corpus examples: `words[].examples[].sentence_id`
- morphology-feature examples: `words[].features[].values[].example.sentence_id`

The required Persian translation set in `data/corpus-example-translations-fa.json` is the exact union of those non-empty sentence IDs. After each vocabulary or UD-data update:

1. Preserve the existing Persian translation for every unchanged sentence ID.
2. Add a non-empty Persian translation for every newly rendered sentence ID.
3. Remove translation entries for sentence IDs that are no longer rendered.
4. Set the top-level `example_count` to the exact number of keys in the final `translations` map.
5. Commit the resulting `data/corpus-example-translations-fa.json` file with the same vocabulary/UD pull request.

Persian translation is development-time curated application data. It may be produced with tooling and then reviewed, but the shipped browser application must not depend on a runtime translation API.

Sentence audio does not require a separate dataset or audio files. Both top-level corpus examples and morphology-feature examples use the shared `renderUdExample()` renderer in `ud-analysis.js`; any Finnish sentence rendered through that component automatically receives the existing Finnish TTS button. Keep future displayed UD-example surfaces on the shared renderer unless the same audio and translation behavior is implemented explicitly.

Run the complete regression suite before merge:

```bash
npm test
```

The data-integrity tests enforce exact Persian translation coverage for all rendered sentence IDs from both example locations, so a vocabulary batch with missing or stale corpus translations must fail CI.

The checked-in CoNLL-U inputs and current extraction workflow remain part of the reproducible build. If a future maintenance issue proposes shrinking these large inputs, first design a documented alternative for regeneration, attribution, data integrity and CI; do not remove them based on the archived proposal.
