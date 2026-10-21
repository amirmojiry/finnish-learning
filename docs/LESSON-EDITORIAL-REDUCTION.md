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


## Phase 7 — daily routines, work/study and invitations (v1.61.0, #205)

Eight A1.2 Section 3 lessons (2–9) are curated together for new attempts; the original activity arrays and stable lesson IDs remain unchanged for all saved history, SRS and legacy attempts. The manually selected index lists shorten redundant reviewed-form isolated typing, while preserving first teaching, first independent graded answers, listening/dictation, positive grammar evidence and productive language.

The independent self-review caught a serious coverage regression in the first proposal: **30 of the 79 newly introduced exact targets lost their only later scored retrieval** when their reviewed tail drills were removed. We restored one later positive retrieval per affected target. A regression now checks **all 79** against effective lesson editions rather than only raw authored arrays. Lesson 10 checkpoint remains unchanged.

| Lesson | Original → new activities | Original → new graded answers | Initial screens | Omitted redundant typing |
| --- | ---: | ---: | ---: | ---: |
| S3 L2 | 30 → 29 | 20 → 19 | 14 | 1 |
| S3 L3 | 31 → 30 | 20 → 19 | 14 | 1 |
| S3 L4 | 36 → 35 | 24 → 23 | 17 | 1 |
| S3 L5 | 33 → 30 | 23 → 20 | 15 | 3 |
| S3 L6 | 39 → 37 | 25 → 23 | 19 | 2 |
| S3 L7 | 35 → 30 | 24 → 19 | 15 | 5 |
| S3 L8 | 33 → 30 | 22 → 19 | 15 | 3 |
| S3 L9 | 40 → 36 | 37 → 33 | 23 | 4 |
| **Total** | **277 → 257** | **195 → 175** | **132** | **20** |

### Deferred-review inventory after preservation

For each remaining omitted review below, the regression verifies a previously scored positive response in a preceding effective lesson. **No target loses all later independently scored retrieval following introduction.** Intentional spaced recall remains, rather than maximizing the number of questions removed.

| Lesson | Omitted already-reviewed exact target |
| --- | --- |
| S3 L2 | `a12s3-expr-02` |
| S3 L3 | `a12s3-expr-01` |
| S3 L4 | `a12s3-expr-06` |
| S3 L5 | `a12s3-expr-09`, `a12s3-hf-11`, `a12s3-expr-13` |
| S3 L6 | `a12s3-expr-12`, `a12s3-expr-18` |
| S3 L7 | `a12s3-expr-17`, `a12s3-hf-17`, `a12s3-hf-19`, `a12s3-topic-20`, `a12s3-expr-21` |
| S3 L8 | `a12s3-hf-18`, `a12s3-topic-21`, `a12s3-expr-32` |
| S3 L9 | `a12s3-topic-19`, `a12s3-topic-22`, `a12s3-expr-25`, `a12s3-expr-31` |

The integrated Lesson 9 still presents the dialogue, two authentic passages with **eight distinct graded comprehension questions**, six referenced grammar productions, Finnish recognition and dictated recall, and four-phrase guided writing. All original teaching and scoring IDs are stable. Cumulative: **23 curated lessons / 157 fewer graded opportunities** against historical content; **117 lessons remain individually uncurated**. This is not evidence of improved measured completion time or learning outcomes.



## Phase 8 — correct Section 4 spaced-review regression (v1.62.0, issue #207)

The effective-learner self-review exposed that **28 of the 72 introduced A1.2 Section 4 targets** lost the only subsequent independently graded retrieval in the v1.60.0 short edition. That flaw was invisible to historical/raw activity acceptance. These eight already-curated lessons now restore a necessary *later* answer for every affected target and add an acceptance regression for **all 72** introduced targets in the actual edited-effective lesson sequence.

The eight new edition identities advance from `-v1` to `-v2`. They had no `study_pacing`, so no paused paced-lesson drafts depend on the former edition fingerprints. All original activity objects/positions, 140 course lesson IDs, checkpoint, completion records and Word Practice SRS remain unchanged; this edits only ordered indices for new starts.

| Lesson | Original → corrected activities | Original → corrected graded answers | Fresh-start slides | Still omitted reviewed typing |
| --- | ---: | ---: | ---: | ---: |
| S4 L2 | 34 → 33 | 21 → 20 | 19 | 1 |
| S4 L3 | 35 → 33 | 24 → 22 | 14 | 2 |
| S4 L4 | 34 → 33 | 23 → 22 | 16 | 1 |
| S4 L5 | 35 → 34 | 23 → 22 | 18 | 1 |
| S4 L6 | 36 → 34 | 24 → 22 | 19 | 2 |
| S4 L7 | 36 → 33 | 24 → 21 | 17 | 3 |
| S4 L8 | 34 → 32 | 22 → 20 | 16 | 2 |
| S4 L9 | 38 → 35 | 35 → 32 | 24 | 3 |
| **Eight-lesson total** | **282 → 267** | **196 → 181** | **143** | **15** |

### Consciously deferred reviewed typing

The fifteen remaining omissions each have a scored positive response in a previous **effective** lesson. A separate gate ensures none of the 72 introduced targets loses all *later* positive retrieval; these are not indiscriminate deletions.

| Lesson | Exact reviewed targets still deferred here |
| --- | --- |
| S4 L2 | `a12s4-expr-02` |
| S4 L3 | `a12s4-expr-01`, `a12s4-expr-07` |
| S4 L4 | `a12s4-expr-08` |
| S4 L5 | `a12s4-expr-16` |
| S4 L6 | `a12s4-expr-15`, `a12s4-topic-25` |
| S4 L7 | `a12s4-expr-17`, `a12s4-expr-20`, `a12s4-extra-13` |
| S4 L8 | `a12s4-extra-02`, `a12s4-extra-08` |
| S4 L9 | `a12s4-extra-10`, `a12s4-extra-11`, `a12s4-extra-12` |

Integrated Lesson 9 still includes two passages, eight separate reading-comprehension questions, protected Finnish dictation, contextual grammar/production and guided writing. **Corrected cumulative: 23 curated lessons / 129 fewer scored answers** compared with original historical editions, while 117 other lessons have no separate editorial revision. The v1.60.0 and v1.61.0 figures above are intentionally left as historically accurate release notes. This quality fix is not evidence of measured learning improvement.


## Phase 9 — eight housing and neighborhood lessons (v1.63.0; issue #209)

A1.3 Section 2 Lessons 2–9 are curated together as one coherent editorial batch. Only previously scored reviewed-form Finnish typing is omitted. The original course activities and IDs remain untouched for historical completions and SRS; a strictly increasing `editorial_revision.activity_indices` selection is used for new starts.

Earlier reviews alone are insufficient protection: after the Section 3/4 audit regressions, the latest acceptance gate explicitly enforces *both sides* of spacing. Each of the **20 omitted reviewed exact forms** must already have an independently graded positive response in an **earlier effective Section 2 lesson**, and **all 59 newly introduced Section 2 exact targets** must still have an independently scored retrieval in a **later effective lesson**. The test compares effective learner editions, not only original arrays.

| Lesson | Authored original → new | Graded original → new | Initial learner screens | Omitted reviewed typing |
| --- | ---: | ---: | ---: | ---: |
| A1.3 S2 L2 | 25 → 24 | 16 → 15 | 18 | 1 |
| A1.3 S2 L3 | 30 → 28 | 20 → 18 | 19 | 2 |
| A1.3 S2 L4 | 33 → 30 | 23 → 20 | 20 | 3 |
| A1.3 S2 L5 | 35 → 31 | 24 → 20 | 22 | 4 |
| A1.3 S2 L6 | 34 → 32 | 24 → 22 | 21 | 2 |
| A1.3 S2 L7 | 37 → 34 | 26 → 23 | 24 | 3 |
| A1.3 S2 L8 | 31 → 27 | 21 → 17 | 19 | 4 |
| A1.3 S2 L9 | 34 → 33 | 32 → 31 | 21 | 1 |
| **Eight-lesson total** | **259 → 239** | **186 → 166** | **164** | **20** |

### Exact reviewed target omissions

The table lists each omitted item, not the full review list. Every removed form has independently assessed practice earlier in this section, and none eliminates the later graded practice of an introduced item.

| Edited lesson | Previously assessed reviewed exact target ID(s) |
| --- | --- |
| S2 L2 | `a13s2-e-007` |
| S2 L3 | `a13s2-e-008`, `a13s2-e-015` |
| S2 L4 | `a13s2-e-014`, `a13s2-e-016`, `a13s2-e-024` |
| S2 L5 | `a13s2-e-023`, `a13s2-e-025`, `a13s2-e-033`, `a13s2-e-035` |
| S2 L6 | `a13s2-e-043`, `a13s2-e-076` |
| S2 L7 | `a13s2-e-044`, `a13s2-e-concrete-address`, `a13s2-e-054` |
| S2 L8 | `a13s2-e-053`, `a13s2-e-055`, `a13s2-e-064`, `a13s2-e-066` |
| S2 L9 | `a13s2-e-063` |

First teaching always precedes first graded introduction; referenced grammar evidence, prepared Finnish dictation and listening recognition, contextual production, the opening-hours questions, and the integrated neighborhood scenario's reading/writing all remain. No Section 2 final checkpoint is edited. **Project totals** after this release: 31 curated lessons and 149 fewer independently graded answers compared with historical editions; 109 lessons still have no individual editorial revision, of which 27 belong to the original >30-authored-activity candidate pool. Static authored counts are not fatigue, proficiency or retention measurements.


## Phase 10 — eight A1.3 study, workplace and communication lessons (v1.64.0; issue #211)

A1.3 Section 3 Lessons 2–9 are edited as one coherent bundle. Only previously positively graded and reviewed-form standalone Finnish typing is omitted from new starts. Existing original activity arrays, 140 lesson IDs, old completions/drafts and Word Practice SRS remain unchanged; original objects are selected by ordered `editorial_revision.activity_indices`.

**Safety gate:** every one of the **21 omitted reviewed exact-target drills** must already have positive independently graded practice in an **earlier effective section lesson**. Crucially **all 56 first-introduced Section 3 targets** must still have at least one independently graded positive retrieval in a **later effective section lesson** (not just the authored raw archive). No first teaching/scoring, required grammar evidence, listening or transformed dictation, productive speaking/writing, instructions sequence, two integrated reading passages or guided writing are removed.

| Lesson | Original → new activities | Original → new graded answers | Initial learner screens | Omitted reviewed typing |
| --- | ---: | ---: | ---: | ---: |
| A1.3 S3 L2 | 29 → 26 | 19 → 16 | 19 | 3 |
| A1.3 S3 L3 | 32 → 30 | 23 → 21 | 20 | 2 |
| A1.3 S3 L4 | 29 → 27 | 21 → 19 | 17 | 2 |
| A1.3 S3 L5 | 32 → 29 | 22 → 19 | 20 | 3 |
| A1.3 S3 L6 | 31 → 28 | 20 → 17 | 20 | 3 |
| A1.3 S3 L7 | 32 → 29 | 23 → 20 | 20 | 3 |
| A1.3 S3 L8 | 31 → 27 | 23 → 19 | 18 | 4 |
| A1.3 S3 L9 | 34 → 33 | 32 → 31 | 21 | 1 |
| **Total** | **250 → 229** | **183 → 162** | **155** | **21** |

### Verified omitted reviewed exact-form targets

| Lesson | Exact target IDs with redundant local typing omitted |
| --- | --- |
| S3 L2 | `a13s3-h-003`, `a13s3-e-007`, `a13s3-e-009` |
| S3 L3 | `a13s3-e-present-task`, `a13s3-e-019` |
| S3 L4 | `a13s3-e-016`, `a13s3-e-018` |
| S3 L5 | `a13s3-e-026`, `a13s3-e-028`, `a13s3-e-034` |
| S3 L6 | `a13s3-e-036`, `a13s3-e-045`, `a13s3-e-047` |
| S3 L7 | `a13s3-e-044`, `a13s3-e-055`, `a13s3-e-057` |
| S3 L8 | `a13s3-e-054`, `a13s3-e-056`, `a13s3-e-send-message`, `a13s3-e-063` |
| S3 L9 | `a13s3-e-075` |

Lesson 9 retains both two-question reading passages (four unique comprehension questions), twelve indexed grammar evidence activities, Finnish recognition and dictation, the guided-writing output and contextual production. Lesson 10 checkpoint remains identical. **Project-level after this proposal: 39 curated lessons / 170 fewer independently graded answers** versus historical activities, 101 without individual curations. Static reductions are not evidence of shorter real study time or better outcomes.
