# Finnish UD import

Reusable extraction tooling for enriching the Finnish Learning vocabulary with Finnish Universal Dependencies data.

Inputs:
- `ud-import-2.18/*.conllu`
- `data/common-words.json`

Generated outputs under `data/ud/`:
- `word-analyses.json`
- `examples.json`
- `labels-fa.json`
- `metadata.json`
- `coverage-report.json`

Local command:

```bash
python3 tools/ud-import/extract_ud.py
```

The raw CoNLL-U directory and the temporary workflow will be removed after validation. The extractor will remain for later vocabulary batches and future UD releases.
