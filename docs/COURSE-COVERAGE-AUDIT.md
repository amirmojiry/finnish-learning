# Course lexical and grammar audit

Reproducible audit: `npm run curriculum:coverage:report`. Data: `data/course/coverage-audit.json`.
**Static teaching opportunities only.** Not learner mastery, speaking proficiency, or CEFR/YKI certification.

## Key findings

- 140 shipped lessons / 14 sections; 2977 graded slots after real runtime injection.
- 670 lexical target placements and 464 distinct surface forms; 431 lemma-field values (unverified) and 0 explicit sense IDs.
- 427 expression surfaces; 102 lexical surfaces appear in multiple target placements. 934 forms receive a correct-answer opportunity in later lessons (NOT an actual learner SRS event).
- 425 dictionary entries; 126 authored lexical target forms found in the curated dictionary; 338 missing, of which 332 exist in original Parole and 6 were not found.
- 27 planned grammar concepts in shipped stages; 26 with explicit lesson concept IDs. 6 lessons lack these links even though 675 structural/grammar slots exist (105 morphology slots).
- 0 lessons declare at least one form without a positive correct-answer activity in the same lesson; some could be intentional and need review.

## Per-section coverage

| Level | Section | Lessons | Graded slots | Unassessed form occurrences | Missing grammar-ID lessons |
| --- | --- | ---: | ---: | ---: | ---: |
| A1.1 | a1.1-section-1 | 10 | 178 | 0 | 2 |
| A1.1 | a1.1-section-2 | 10 | 213 | 0 | 0 |
| A1.1 | a1.1-section-3 | 10 | 210 | 0 | 0 |
| A1.1 | a1.1-section-4 | 10 | 178 | 0 | 1 |
| A1.2 | a1.2-section-1 | 10 | 205 | 0 | 0 |
| A1.2 | a1.2-section-2 | 10 | 213 | 0 | 0 |
| A1.2 | a1.2-section-3 | 10 | 237 | 0 | 1 |
| A1.2 | a1.2-section-4 | 10 | 238 | 0 | 0 |
| A1.3 | a1.3-section-1 | 10 | 219 | 0 | 1 |
| A1.3 | a1.3-section-2 | 10 | 225 | 0 | 0 |
| A1.3 | a1.3-section-3 | 10 | 226 | 0 | 0 |
| A1.3 | a1.3-section-4 | 10 | 230 | 0 | 1 |
| A2.1 | a2.1-section-1 | 10 | 197 | 0 | 0 |
| A2.1 | a2.1-section-2 | 10 | 208 | 0 | 0 |

## Lexical candidates outside the installed dictionary

First 50 shipped single-word targets by original Parole position (full list in JSON). No ranks are assigned to unranked expressions.

| Form | Parole position | Status | Placements |
| --- | ---: | --- | ---: |
| äiti | 433 | parole_source_outside_curated_dictionary | 1 |
| viikolla | 435 | parole_source_outside_curated_dictionary | 1 |
| helsinki | 436 | parole_source_outside_curated_dictionary | 1 |
| hyvää | 462 | parole_source_outside_curated_dictionary | 1 |
| kello | 478 | parole_source_outside_curated_dictionary | 1 |
| isä | 485 | parole_source_outside_curated_dictionary | 1 |
| mihin | 494 | parole_source_outside_curated_dictionary | 1 |
| kaupunki | 515 | parole_source_outside_curated_dictionary | 1 |
| kauan | 518 | parole_source_outside_curated_dictionary | 1 |
| lähellä | 523 | parole_source_outside_curated_dictionary | 1 |
| tampereella | 536 | parole_source_outside_curated_dictionary | 1 |
| puoli | 544 | parole_source_outside_curated_dictionary | 1 |
| kuusi | 551 | parole_source_outside_curated_dictionary | 1 |
| seitsemän | 591 | parole_source_outside_curated_dictionary | 1 |
| tehtävä | 592 | parole_source_outside_curated_dictionary | 1 |
| sisällä | 619 | parole_source_outside_curated_dictionary | 1 |
| nimi | 623 | parole_source_outside_curated_dictionary | 2 |
| toimi | 635 | parole_source_outside_curated_dictionary | 1 |
| työ | 666 | parole_source_outside_curated_dictionary | 1 |
| kotiin | 670 | parole_source_outside_curated_dictionary | 1 |
| kahdeksan | 688 | parole_source_outside_curated_dictionary | 1 |
| hinta | 690 | parole_source_outside_curated_dictionary | 1 |
| lähtee | 698 | parole_source_outside_curated_dictionary | 1 |
| parempi | 718 | parole_source_outside_curated_dictionary | 1 |
| ongelma | 739 | parole_source_outside_curated_dictionary | 1 |
| auki | 740 | parole_source_outside_curated_dictionary | 1 |
| kauppa | 754 | parole_source_outside_curated_dictionary | 2 |
| tarkoittaa | 756 | parole_source_outside_curated_dictionary | 1 |
| milloin | 765 | parole_source_outside_curated_dictionary | 2 |
| tuntia | 779 | parole_source_outside_curated_dictionary | 1 |
| te | 787 | parole_source_outside_curated_dictionary | 1 |
| iso | 815 | parole_source_outside_curated_dictionary | 2 |
| eilen | 867 | parole_source_outside_curated_dictionary | 3 |
| kirkon | 872 | parole_source_outside_curated_dictionary | 1 |
| sopimus | 895 | parole_source_outside_curated_dictionary | 1 |
| sinun | 912 | parole_source_outside_curated_dictionary | 1 |
| lapsi | 987 | parole_source_outside_curated_dictionary | 1 |
| kotona | 1004 | parole_source_outside_curated_dictionary | 1 |
| sata | 1041 | parole_source_outside_curated_dictionary | 1 |
| kirja | 1048 | parole_source_outside_curated_dictionary | 1 |
| ryhmä | 1055 | parole_source_outside_curated_dictionary | 1 |
| asema | 1088 | parole_source_outside_curated_dictionary | 1 |
| sopii | 1106 | parole_source_outside_curated_dictionary | 1 |
| auttaa | 1116 | parole_source_outside_curated_dictionary | 1 |
| yhdeksän | 1121 | parole_source_outside_curated_dictionary | 1 |
| selittää | 1126 | parole_source_outside_curated_dictionary | 1 |
| pankki | 1131 | parole_source_outside_curated_dictionary | 1 |
| aamulla | 1207 | parole_source_outside_curated_dictionary | 2 |
| vesi | 1227 | parole_source_outside_curated_dictionary | 1 |
| illalla | 1262 | parole_source_outside_curated_dictionary | 2 |

## Planned grammar concepts without lesson-ID mapping

Grammar notes and individual morphology exercises do not establish concept traceability. This is a P1 gap, not proof that all grammar is absent.

| Grammar ID | Stage | Prerequisites |
| --- | --- | --- |
| `a11-sounds` | A1.1 | — |

## Next work according to issue #101

1. P1: add explicit grammar IDs/prerequisites and assess them positively, without changing taught Finnish forms blindly.
2. P2: review lexeme/meaning/form identities; the stored lemma fields are not certified identities.
3. P3: ensure positive coverage of authored forms in multiple relevant contexts, not distractors alone.
4. P4: source-based corpus gaps should be curated in small batches with Parole and UD validation.

Use `node scripts/audit-course-coverage.cjs --json` for per-lesson rows or `--check` to validate snapshots.
No learner progress, local storage, SRS schedule, dictionary or lesson file is modified.

