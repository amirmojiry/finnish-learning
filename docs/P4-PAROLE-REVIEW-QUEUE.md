# P4: Source-grounded Parole vocabulary review queue

[Parent tracking issue #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [P4 selection issue #140](https://github.com/amirmojiry/finnish-learning/issues/140)

## Priority from actual shipped lessons

Use `npm run parole:plan:markdown` for a live top-candidate table and `npm run parole:plan:json` for machine-readable form IDs, exact original source positions, original frequency ranks and authored target placements. `npm run parole:plan:check` validates the source-backed gap model and is part of `npm test`.

The current course coverage audit identifies 334 source-backed forms outside the 400-form curated dictionary and six unranked gap forms, but those counts are dated, not CEFR vocabulary targets. The source-backed queue prioritizes forms referenced in multiple shipped lessons, then original Parole order; suggestions require independent pedagogical review. Do **not** interpret repeated occurrences as learning or grant mastery from them.

The existing `scripts/build-vocabulary.mjs` is consecutive-source-only. To expand the app by a 25-form first reviewable tranche, an editor must provide **complete entries for original Parole positions 401–425**, including forms that are not present on the high-utility course-gap shortlist. A selective list such as `äiti`, `nimi`, `työ`, `kello` is a **prioritization signal**, not a drop-in bundle (several forms lie beyond that consecutive window). Expanding by only chosen forms would require a separately approved backward-compatible builder contract.

## Required before any actual dictionary release

1. Curate each original-source form in that contiguous window: reviewed Finnish lemma/POS, learner-appropriate Persian gloss, and **two Finnish examples with correct Persian translations** containing the exact surface form. Record unresolved senses explicitly rather than guessing a lemma/sense link.
2. Add a small reviewable `data/vocabulary-details/` bundle. **Never manually fabricate/copy** ranks, occurrence counts or percentages: rebuild them from the Latin-1 original source with `npm run build:vocabulary`.
3. Rebuild all UD-derived summaries and generate exact Persian translations for every new rendered top-level or feature example ID in `data/corpus-example-translations-fa.json`, keeping old translations and dropping no required IDs.
4. Run `npm run sync`, `npm test`, curriculum/coverage checks, the UD workflow and CI, and inspect the diffs for content loss. Increase the MINOR release version for the first real vocabulary batch.
5. Keep P4's first-batch gate in #101 **open** until the curated vocabulary and generated data are actually merged. This selection-only PR does not claim the first batch was delivered.

The longer-term P4 plan may favor a different review strategy if a future compatible builder supports sparse forms without redefining existing source position, rank or learner progress. 
