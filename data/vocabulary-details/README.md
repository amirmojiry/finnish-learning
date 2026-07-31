# Curated vocabulary detail bundles

Add new learner-content bundles to this directory when extending the Parole range. A bundle may be a JSON array or an object with a `words` array.

Do not copy Parole rank, count, percentage, or position into a bundle. `scripts/build-vocabulary.mjs` reads those fields directly from `data/parole_frek_3.txt`.

Each entry must use this schema:

```json
{
  "word": "source surface form",
  "translation_fa": "reviewed Persian translation",
  "example_fi": "First Finnish example containing the surface form.",
  "example_fa": "Persian translation of the first example.",
  "part_of_speech": "English fallback category",
  "part_of_speech_fa": "Persian fallback category",
  "lemma": "learner-facing base form",
  "example_2_fi": "Second Finnish example containing the surface form.",
  "example_2_fa": "Persian translation of the second example."
}
```

For positions 201–300, use a descriptive file such as `201-300.json`. The builder locates each form in the original Parole file, rejects missing or duplicate forms, and requires a complete consecutive range.

After adding a bundle, run:

```bash
npm run build:vocabulary
npm run sync
npm test
```

The vocabulary total is derived from the available consecutive source forms and must not be hardcoded in application logic or tests.
