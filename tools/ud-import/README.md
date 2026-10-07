# Finnish UD import

Reusable extraction tooling for enriching the Finnish Learning vocabulary with Finnish Universal Dependencies data.

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
4. Commit the resulting `data/corpus-example-translations-fa.json` file with the same vocabulary/UD pull request.

Persian translation is development-time curated application data. It may be produced with tooling and then reviewed, but the shipped browser application must not depend on a runtime translation API.

Sentence audio does not require a separate dataset or audio files. Both top-level corpus examples and morphology-feature examples use the shared `renderUdExample()` renderer in `ud-analysis.js`; any Finnish sentence rendered through that component automatically receives the existing Finnish TTS button. Keep future displayed UD-example surfaces on the shared renderer unless the same audio and translation behavior is implemented explicitly.

Run the complete regression suite before merge:

```bash
npm test
```

The data-integrity tests enforce exact Persian translation coverage for all rendered sentence IDs from both example locations, so a vocabulary batch with missing or stale corpus translations must fail CI.

The raw CoNLL-U directory and the temporary workflow will be removed after validation. The extraction tools remain reusable for later vocabulary batches and future UD releases.
