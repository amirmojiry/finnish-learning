# P2 — 25 reviewed noun forms and sense-safe shared exact-form IDs (v1.71.0)

[فارسی](P2-REVIEWED-NOUNS-AND-SHARED-FORM-IDS.fa.md) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Child #225](https://github.com/amirmojiry/finnish-learning/issues/225) · [Unresolved review queue](P2-UNRESOLVED-REVIEW-QUEUE.md)

## What changed

This is one **bounded editorial delivery**, not the completion of all P2 lexical meanings. We added **25 manually selected, cross-checked noun surface readings** to the previous 47. The resulting stable global `form_id` and reviewed `lexeme_id`/`sense_id` mapping covers **72 of 1,264** exact surface/expression records; **1,192 remain unreviewed**, including **440 multiword expressions**. There are still 15 explicitly reviewed **course item contexts** for `aika`, `ajan`, `voi`, `pitää`, `tuli` (24 lesson occurrences), and none is converted to a globally valid sense merely because the spelling matches.

**Review status:** these 25 decisions were checked against actual authored examples and source glosses using AI-assisted editorial analysis, not independent human linguistic peer review. A Finnish-language expert should confirm nuanced case and sense choices before final pedagogical sign-off. No uncertain cases were automatically approved.

Each new editorial row in `data/course/reviewed-lexical-identities-batch3.json` carries the **exact section/item ID and authored Finnish example plus Persian item gloss**, or, for dictionary-only `työtä`, its checked dictionary witness. Original authored items (including older lemma-field inaccuracies), Parole source rank/count/percentage, dictionary schema and all Course/Word Practice progress are unchanged. The read-only overlay documents the interpretation, not a student achievement.

## Reviewed forms and grammatical readings

Every case below is **singular** and belongs only to the attested form; no other forms are synthesized.

| Review scope | Exact surface forms | Case / sense |
| --- | --- | --- |
| Everyday people | `ystävä`, `lapsi`, `perhe`, `lääkäri` | nominative, friend / child / family / doctor |
| Spaces and services | `kirjasto`, `pankki`, `huone`, `sänky` | nominative, library / bank / room / bed |
| Shopping and travel | `takki`, `juna`, `euro`, `musiikki`, `harrastus` | nominative, jacket / train / euro / music / hobby |
| Food and other items | `ruoka`, `kahvi`, `apu`, `ilta`, `työ` | nominative, food / coffee / help / evening / work |
| Exact partitive forms | `kahvia`, `vettä`, `työtä`, `lippua` | partitive singular, coffee / water / work / **travel ticket** |
| Exact governed/local cases | `lääkärille`, `asemalle`, `kaupasta` | allative doctor / station, elative shop |

The surface-specific forms `kahvi/kahvia`, `työ/työtä`, `lääkäri/lääkärille`, `vesi/vettä`, `lippu/lippua`, `asema/asemalle` and `kauppa/kaupasta` now have reviewed shared **lexeme/sense identity**, but **distinct form IDs and distinct practice evidence**. Example: a correct choice for `kahvi` does not mark `kahvia` mastered. The authored item `kaupasta` stores the legacy inflected lemma as source metadata; the review explicitly links the attested elative back to `kauppa` without rewriting learner content.

## Cross-app integration and the homograph boundary

- `data/course/course-review-form-map.json` is generated from currently authored Course item refs and currently available **425 dictionary forms**, with **239 valid exact form occurrences**. Its new `excluded_ambiguous_form_ids` contains five known unsensed global homographs.
- The Course first-attempt failure bridge now validates the stable Unicode/NFC `form_id`, handles conflicting/invalid mappings fail-closed, and provides **read-only per-form review priorities** rather than performing a lemma-/sense-wide SRS merge.
- Word Practice now accepts canonical per-form priorities to sort only **not-yet-reviewed** words; **overdue words always come first**, and original daily-new limits, exact written-word storage keys, scores, repeat intervals and history remain unchanged. When Course or its map is unavailable, regular SRS still works locally without fabricated progress.
- **Five context-sensitive global homographs** `aika`, `ajan`, `pitää`, `voi`, `tuli` are not transferred as unsensed Word Practice hints. Their existing *course item-specific* interpretations remain available in `data/course/contextual-lexical-identity-map.json`, including `Minun pitää lähteä.` (necessity) versus alternative uses of `pitää`, and `Hän voi auttaa` (ability) versus `En voi hyvin` (wellbeing). This decision avoids teaching a different sense in the dictionary than the learner missed in the Course.

## What this does **not** establish

No learner-level lexeme mastery model, no automatic transfer of Course scores to Word Practice schedules, no inflection generation, no CEFR/YKI claim and no certainty for the other **1,192** identities. The explicit queue `data/course/p2-unresolved-review-queue.json` ranks those records but labels **all as pending human review**. Its five context-sensitive written forms come first; it does not assign senses.

The older `P2-IDENTITY-BATCH1-REPORT.md` stays as a **historical 47-form snapshot**. `audit-reviewed-lexical-identities.cjs` projects later reviewed decisions as unresolved only when reproducing that historical report; the live sidecar and new coverage audit still count all **72** actual reviewed global forms. Next batches should review nouns, verbs, cases and phrases in explicit attested context, not use one global `lemma` string for ambiguous written words.

## Reproducibility

- `npm run lexical:identity:check` / `node scripts/audit-p2-noun-batch.cjs --check`: approved exact forms, witnesses and merged review.
- `npm run course:review:check` and `npm run p2:queue:check`: safe canonical Course→Word Practice form mapping and complete unresolved-identity queue.
- `npm test`: includes matching case/lemma evidence, review queue, legacy P2 batches, context-sensitive homographs, stale/forged IDs, review ordering, saved SRS isolation and doc/release integrity.
- `npm run sync`: version and generated metadata, with no Parole source edits.

P2 parent #101 stays **open** until its full lexeme/sense/expression requirements and cross-app evidence acceptance are complete.
