# Curated editorial editions of four long A1 lessons

[فارسی](LESSON-EDITORIAL-REDUCTION.fa.md) · [Parent #189](https://github.com/amirmojiry/finnish-learning/issues/189) · [Implementation #194](https://github.com/amirmojiry/finnish-learning/issues/194) · [Resumable pacing](LESSON-PACING.md)

## Purpose and actual reductions

Version 1.57.0 goes beyond grouping and short sittings: **fresh attempts actually receive fewer independently graded questions**. Unlike presentation-only compaction, these revised lessons do not score or require the removed opportunities.

| Lesson | Original activities | New activities | Original graded | New graded | Original initial slides | New initial slides |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1.1 S3 L5: daily routines | 40 | 35 | 22 | 17 | 30 | 19 |
| A1.1 S2 L10: section checkpoint | 62 | 28 | 62 | 28 | 29 | 20 |
| A1.2 S2 L7: transit timetable | 44 | 34 | 28 | 18 | 27 | 24 |
| A1.3 S4 L10: cumulative checkpoint | 32 | 29 | 32 | 29 | 27 | 24 |
| **Total** | **178** | **126** | **144** | **92** | **113** | **98** |

These are static content and scoring opportunities, not measured minutes, completion rates or learner fatigue. Run `npm run lesson:editorial:report`, `npm run lesson:editorial:json` or `npm run lesson:editorial:check` to regenerate the audit.

## Why these particular questions were removed

- **A1.1 S3 L5:** retains **all 18 first-time teaching cards**, listening, grammar evidence, inflection and contextual Finnish production. Removes two isolated `juon` / `menen` repetitions already expressed in the contextual `Minä juon kahvia` / `Menen kotiin` tasks and three prior-review time-word typing repetitions. The reviewed time words remain in the section/earlier lessons. Moves same-category time-phrase and routine cards into teach-then-assess sets so **35 retained activities become 19 screens**; individual answer attribution remains unchanged.
- **A1.1 S2 L10:** preserves **every one of its 15 checkpoint targets**, all five positive grammar evidence examples, one listening response, productive tasks, and nine representative additional contextual and number reviews. Removes 34 ancillary single-word typing responses, including repetitive isolated number drills, which were outside the designated checkpoint target identity list. This checkpoint remains a multi-skill assessment; its passing threshold is unchanged and now uses the revised 28-answer denominator.
- **A1.2 S2 L7:** preserves all **16 introduced teaching targets**, the clock choice, listening, two short timetable readings, both controlled before/after sentence productions and explicit grammar evidence. Removes ten already-reviewed transport/ticket vocabulary typing prompts not central to the timetable objective; the earlier lessons and Word Practice remain available for separate reinforcement.
- **A1.3 S4 L10:** preserves **all 15 checkpoint identities**, the ten explicitly evidenced past-tense morphology checks, seven contextual productions, listening and remaining language functions. Removes a pair of scaffolded first-phase tasks subsequently tested by more productive tasks and one ancillary reviewed typing prompt. Unlike arbitrary pruning, it protects all declared grammar evidence references.

The old source activity arrays, stable curriculum IDs, lessons' original position and all existing completion/answer-history/SRS records remain untouched. The selected original source indices are explicit inside each lesson's `editorial_revision.activity_indices`. An independent validator rejects duplicate/out-of-range indices, missing checkpoint target identities, dropped new-target teaching, lost grammar/listening/production evidence or a revised rendered count over 30 slides.

## Old saved drafts versus new study attempts

A learner who already paused one of the four lessons in **v1.56.0** resumes the original question order and original total assessment, without replaying already-scored activities. The historical local draft fingerprint intentionally retains its original three-field input tuple. Fresh attempts use the shortened editorial edition, explicitly grouped even when fewer than 30 activity objects remain, and write a revision marker and content fingerprint to the locally stored draft. That revision is verified on reload. A changed editorial plan invalidates only its own draft, not a pre-1.57 legacy draft or stored completion/SRS history. The user can explicitly restart a paused attempt to enter the new edition; existing answer-history entries are not erased by that action.

**Limits:** This work is not a complete redesign of all 55 historically long lessons. Only these four are shortened; the remaining long lessons, deliberate review redistribution, and manual mobile/screen-reader usability validation remain tasks under #189. Reducing assessed practice must be checked later against privacy-appropriate error/retention evidence; no positive learning-outcome claim is made.
