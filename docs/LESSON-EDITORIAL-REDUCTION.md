# Curated editorial editions of four long A1 lessons

[فارسی](LESSON-EDITORIAL-REDUCTION.fa.md) · [Parent #189](https://github.com/amirmojiry/finnish-learning/issues/189) · [Implementation #194](https://github.com/amirmojiry/finnish-learning/issues/194) · [Resumable pacing](LESSON-PACING.md)

## Purpose and actual reductions

Version 1.57.0 goes beyond grouping and short sittings: **fresh attempts actually receive fewer independently graded questions**. Unlike presentation-only compaction, these revised lessons do not score or require the removed opportunities.

| Lesson | Original activities | New activities | Original graded | New graded | Original initial slides | New initial slides |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1.1 S3 L5: daily routines | 40 | 36 | 22 | 18 | 30 | 18 |
| A1.1 S2 L10: section checkpoint | 62 | 27 | 62 | 27 | 29 | 20 |
| A1.2 S2 L7: transit timetable | 44 | 34 | 28 | 18 | 27 | 21 |
| A1.3 S4 L10: cumulative checkpoint | 32 | 29 | 32 | 29 | 27 | 24 |
| **Total** | **178** | **126** | **144** | **92** | **113** | **83** |

These are static content and scoring opportunities, not measured minutes, completion rates or learner fatigue. Run `npm run lesson:editorial:report`, `npm run lesson:editorial:json` or `npm run lesson:editorial:check` to regenerate the audit.

## Why these particular questions were removed

- **A1.1 S3 L5:** retains **all 18 first-time teaching cards**, listening, grammar evidence, inflection and contextual Finnish production. Retains independent first-attempt recall for `juon` and `menen`. Removes the redundant standalone `kotiin` spelling drill (already assessed by its required inflection-production exercise) and three prior-review time-word typing repetitions. The reviewed time words remain in the section/earlier lessons. Moves same-category time-phrase and routine cards into teach-then-assess sets so **36 retained activities become 18 screens**; individual answer attribution remains unchanged.
- **A1.1 S2 L10:** preserves **every one of its 15 checkpoint targets**, all five positive grammar evidence examples, one listening response, productive tasks, and nine representative additional contextual and number reviews. Removes 35 ancillary single-word typing responses, including repetitive isolated number drills, which were outside the designated checkpoint target identity list. This checkpoint remains a multi-skill assessment; its passing threshold is unchanged and now uses the revised 27-answer denominator.
- **A1.2 S2 L7:** preserves all **16 introduced teaching targets**, the clock choice, listening, two short timetable readings, both controlled before/after sentence productions and explicit grammar evidence. Removes ten already-reviewed transport/ticket vocabulary typing prompts not central to the timetable objective; the earlier lessons and Word Practice remain available for separate reinforcement.
- **A1.3 S4 L10:** preserves **all 15 checkpoint identities**, the ten explicitly evidenced past-tense morphology checks, seven contextual productions, listening and remaining language functions. Removes a pair of scaffolded first-phase tasks subsequently tested by more productive tasks and one ancillary reviewed typing prompt. Unlike arbitrary pruning, it protects all declared grammar evidence references.

The old source activity arrays, stable curriculum IDs, lessons' original position and all existing completion/answer-history/SRS records remain untouched. The selected original source indices are explicit inside each lesson's `editorial_revision.activity_indices`. An independent validator rejects duplicate/out-of-range indices, missing checkpoint target identities, dropped new-target teaching, lost grammar/listening/production evidence or a revised rendered count over 30 slides.

## Old saved drafts versus new study attempts

A learner who already paused one of the four lessons in **v1.56.0** resumes the original question order and original total assessment, without replaying already-scored activities. The historical local draft fingerprint intentionally retains its original three-field input tuple. Fresh attempts use the shortened editorial edition, explicitly grouped even when fewer than 30 activity objects remain, and write a revision marker and content fingerprint to the locally stored draft. That revision is verified on reload. A changed editorial plan invalidates only its own draft, not a pre-1.57 legacy draft or stored completion/SRS history. The user can explicitly restart a paused attempt to enter the new edition; existing answer-history entries are not erased by that action.

**Limits:** This work is not a complete redesign of all 55 historically long lessons. Only these four are shortened; the remaining long lessons, deliberate review redistribution, and manual mobile/screen-reader usability validation remain tasks under #189. Reducing assessed practice must be checked later against privacy-appropriate error/retention evidence; no positive learning-outcome claim is made.


## Phase 4 — two additional integrated-reading editions (v1.58.0)

The same compatibility contract applies to A1.1 S3 L9 (**روز سادهٔ من**, 48→32 authored activities, 44→28 graded answers, 21 learner-visible screens) and A1.1 S4 L9 (**دنیای آشنای من**, 48→31 authored activities, 44→27 graded answers, 20 screens). Both lessons retain their first teaching cards, contextual reading-comprehension sequence, listening and all explicitly referenced grammar evidence, together with productive writing. The omitted responses were late isolated typing drills of previously taught material; earlier lessons and separate Word Practice remain available, but retention effects are not yet measured.

**Total to date:** six curated A1 editions, **85 fewer graded opportunities** compared with the original authored editions. All original activity arrays remain intact for older drafts. Reproduce with `npm run lesson:editorial:report`.

## Phase 5 — shopping-dialogue lesson (v1.59.0, #201 / PR #202)

A1.2 Section 1 Lesson 9 (**یک گفت‌وگوی کامل خرید**) now gives new learners **22 rather than 31 original activities**, **17 rather than 26 independently graded answers**, and **13 visible slides**. Nine redundant standalone typing drills are omitted, while the shopping dialogue, both reading-comprehension questions, listening, and all **six indexed positive grammar evidence** activities (requests, quantities, method of payment, negation, questions, and *olla*) remain. The concluding five controlled sentence productions are all retained.

As before, original activities and identities remain in the manifest for older saved learner drafts; this is not a rewrite of progress, historical answers, or SRS. **Cumulative total: seven curated lessons / 94 fewer graded opportunities** (including the six A1 lessons / 85 reductions already reported for v1.58.0). There are **133 shipped lessons without an editorial revision**, not necessarily 133 lessons that need shortening. Future batches under #189 should prioritize the strongest remaining graded workload, with independent teaching, grammar, listening, reading, and stored-draft compatibility checks. Fewer questions are not evidence of better learning outcomes.


## Phase 6 — eight coherent health/weather lessons (v1.60.0; #203)

The following **eight A1.2 Section 4 lessons (2–9)** are curated together, not one PR per lesson. Each retained original activity array is unchanged; a validated ordered `editorial_revision.activity_indices` subset is used only for **new starts**. Selection removes **reviewed-form isolated typing** with previously independent correct-answer assessment while preserving BOTH original listening recognition and Finnish dictation, not grammar or first teaching.

| Lesson | Activities, original → new | Graded answers, original → new | New initial screens | Removed reviewed typing |
| --- | ---: | ---: | ---: | ---: |
| A1.2 S4 L2 | 34 → 30 | 21 → 17 | 18 | 4 |
| A1.2 S4 L3 | 35 → 28 | 24 → 17 | 13 | 7 |
| A1.2 S4 L4 | 34 → 29 | 23 → 18 | 15 | 5 |
| A1.2 S4 L5 | 35 → 30 | 23 → 18 | 17 | 5 |
| A1.2 S4 L6 | 36 → 30 | 24 → 18 | 18 | 6 |
| A1.2 S4 L7 | 36 → 30 | 24 → 18 | 17 | 6 |
| A1.2 S4 L8 | 34 → 30 | 22 → 18 | 16 | 4 |
| A1.2 S4 L9 | 38 → 32 | 35 → 29 | 23 | 6 |
| **Eight-lesson total** | **282 → 239** | **196 → 153** | **137** | **43** |

### Explicit review-deferral mapping

Each target below remains part of the unchanged course source and has independently scored evidence in an **earlier edited-effective lesson of this section**, checked by the regression suite. Targets are deferred only within the indicated lesson, not from the course. Lesson 9 deliberately **retains its `a12s4-expr-24` dictation**: although its raw source slot looks like typing, course preparation converts it to required dictated recall. Every one of the 43 removed typed reviews has a prior positive assessment in an earlier *effective* Section 4 lesson.

| Lesson | Fully deferred here: target IDs with earlier graded retrieval | Same-lesson duplicate removed |
| --- | --- | --- |
| S4 L2 | `a12s4-topic-02`, `a12s4-topic-04`, `a12s4-topic-06`, `a12s4-expr-02` | — |
| S4 L3 | `a12s4-topic-03`, `a12s4-topic-05`, `a12s4-expr-01`, `a12s4-expr-03`, `a12s4-hf-04`, `a12s4-topic-10`, `a12s4-expr-07` | — |
| S4 L4 | `a12s4-topic-09`, `a12s4-topic-11`, `a12s4-expr-08`, `a12s4-topic-14`, `a12s4-expr-10` | — |
| S4 L5 | `a12s4-topic-15`, `a12s4-expr-11`, `a12s4-topic-19`, `a12s4-topic-21`, `a12s4-expr-16` | — |
| S4 L6 | `a12s4-topic-18`, `a12s4-topic-20`, `a12s4-expr-15`, `a12s4-topic-23`, `a12s4-topic-25`, `a12s4-expr-18` | — |
| S4 L7 | `a12s4-hf-12`, `a12s4-expr-17`, `a12s4-expr-19`, `a12s4-topic-30`, `a12s4-expr-20`, `a12s4-extra-13` | — |
| S4 L8 | `a12s4-topic-31`, `a12s4-extra-02`, `a12s4-topic-34`, `a12s4-extra-08` | — |
| S4 L9 | `a12s4-extra-10`, `a12s4-extra-11`, `a12s4-extra-12`, `a12s4-extra-13`, `a12s4-topic-35`, `a12s4-topic-38` | — |

The Section 4 Lesson 9 integrated dialogue retains original dialogue ordering, **both passages and all eight independently graded comprehension questions**, Finnish listening, **all eight indexed grammar evidence activities**, and guided writing. In Lessons 2–8, all exact introduced surfaces retain their teaching cards and first scored answers; every positive grammar evidence index, listening and contextual production remain. Lesson 6 also preserves the only original `a12s4-extra-11` graded recall, which has **no earlier positively graded Section 4 retrieval**; it was intentionally excluded from the deletion list.

**Lifetime totals:** 15 editorially revised lessons, **137 fewer independently graded answers** versus legacy (94 through v1.59.0 plus 43 here). The 125 uncurated lessons are **not** an automatic deletion queue; 40 of the original 55 >30-authored-activity cohort remain uncurated. The original 140 lesson IDs, checkpoint thresholds, stored completions, first-attempt history and Word Practice SRS are preserved. Use `npm run lesson:editorial:json`, `npm run lesson:editorial:priority` and `npm test` for reproductions. No claims about measured fatigue or CEFR/YKI outcomes.


## Phase 7 — daily routines, study/work and invitations (v1.61.0, #205)

One **eight-lesson package** curates A1.2 Section 3 Lessons 2–9. Fresh-start learners receive ordered editorial subsets while all original authored activity objects, lesson IDs, progress history, drafts and SRS records remain unchanged. The selection omits only reviewed **standalone Finnish typing** with positive independent assessment in the **effective preceding lesson editions** of this section; it keeps representative later review, all new-target teaching and scored first recall, grammar, listening and production.

| Lesson | Authored activities, old → new | Independent graded answers, old → new | New initial screens | Removed reviewed typing |
| --- | ---: | ---: | ---: | ---: |
| S3 L2 | 30 → 27 | 20 → 17 | 14 | 3 |
| S3 L3 | 31 → 25 | 20 → 14 | 13 | 6 |
| S3 L4 | 36 → 30 | 24 → 18 | 16 | 6 |
| S3 L5 | 33 → 26 | 23 → 16 | 14 | 7 |
| S3 L6 | 39 → 33 | 25 → 19 | 18 | 6 |
| S3 L7 | 35 → 28 | 24 → 17 | 15 | 7 |
| S3 L8 | 33 → 26 | 22 → 15 | 14 | 7 |
| S3 L9 | 40 → 32 | 37 → 29 | 22 | 8 |
| **Total** | **277 → 227** | **195 → 145** | **126** | **50** |

### Explicit deferred reviewed-target inventory

For each dropped target below, a regression test verifies an earlier independently graded positive response in a prior **edited-effective** lesson in this section, not just a declaration that the target was reviewed. The original activity arrays still contain the historical responses. No first positive assessment is deferred.

| Edited lesson | Exact-form targets with the redundant local typing removed |
| --- | --- |
| S3 L2 | `a12s3-hf-01`, `a12s3-topic-03`, `a12s3-expr-02` |
| S3 L3 | `a12s3-hf-03`, `a12s3-topic-02`, `a12s3-expr-01`, `a12s3-expr-03`, `a12s3-topic-04`, `a12s3-expr-05` |
| S3 L4 | `a12s3-hf-04`, `a12s3-topic-05`, `a12s3-expr-06`, `a12s3-hf-08`, `a12s3-topic-08`, `a12s3-topic-10` |
| S3 L5 | `a12s3-hf-09`, `a12s3-topic-06`, `a12s3-expr-09`, `a12s3-hf-11`, `a12s3-topic-11`, `a12s3-topic-15`, `a12s3-expr-13` |
| S3 L6 | `a12s3-hf-13`, `a12s3-topic-14`, `a12s3-expr-12`, `a12s3-hf-16`, `a12s3-topic-17`, `a12s3-expr-18` |
| S3 L7 | `a12s3-hf-15`, `a12s3-topic-16`, `a12s3-expr-17`, `a12s3-hf-17`, `a12s3-hf-19`, `a12s3-topic-20`, `a12s3-expr-21` |
| S3 L8 | `a12s3-hf-18`, `a12s3-hf-20`, `a12s3-topic-21`, `a12s3-expr-22`, `a12s3-expr-32`, `a12s3-topic-25`, `a12s3-expr-26` |
| S3 L9 | `a12s3-hf-17`, `a12s3-topic-19`, `a12s3-topic-22`, `a12s3-topic-24`, `a12s3-expr-25`, `a12s3-hf-25`, `a12s3-topic-27`, `a12s3-expr-31` |

Lesson 9 retains the original dialogue order, both passages, **all eight distinct reading-comprehension questions**, six indexed grammar-evidence productions, listening recognition, its prepared original Finnish dictation and guided four-phrase writing. The section checkpoint (Lesson 10) is unchanged. All eight lessons retain **every prepared original dictation** and explicit grammar evidence. The first introduced assessment still comes after teaching. This is a content-load proxy, **not** measured learner fatigue or a retention/CEFR certification.

**Cumulative**: 23 curated lessons and 187 fewer independently scored answers versus historical editions, with 117 lessons not curated. Of the original 55 lessons with more than 30 authored activities, 33 remain not individually shortened (one 30-activity lesson was included as a coherent section member). No automatic reduction is authorized for the other 117 lessons without pedagogical review. Reproduce counts using the editorial audit and the section-specific regression suite.
