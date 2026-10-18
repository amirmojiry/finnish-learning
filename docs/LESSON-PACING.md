# Resumable study sittings for high-load lessons

[فارسی](LESSON-PACING.fa.md) · [Parent issue #189](https://github.com/amirmojiry/finnish-learning/issues/189) · [Grouped slides](LESSON-SLIDE-COMPACTION.md)

## Why this is pacing, not editorial deletion

The grouped-slide UI introduced in v1.55.0 limits **initial rendered screens**, not the independent answer burden. The four largest remaining sittings retain all original 40–62 authored activities. Altering checkpoint targets or removing previously graded items would jeopardize previously saved user progress and grammar/retrieval evidence. This v1.56.0 delivery therefore sets explicit **optional local, resumable study sittings**, with no more than **15 visible slides and 20 independent graded answers per sitting**. Each original lesson is still a single lesson, and completion/80% checkpoint assessment is awarded only after finishing its full original first-attempt sequence.

## Static content audit (not user telemetry)

| Existing lesson | Original activities | Initial visible slides | Initial graded answers | Pacing sittings (screens / answers) |
| --- | ---: | ---: | ---: | --- |
| A1.1 S3 L5 | 40 | 30 | 22 | 15/8, 15/14 |
| A1.1 S2 L10 checkpoint | 62 | 29 | 62 | 15/17, 6/18, 5/20, 3/7 |
| A1.2 S2 L7 | 44 | 27 | 28 | 15/8, 12/20 |
| A1.3 S4 L10 checkpoint | 32 | 27 | 32 | 15/15, 12/17 |

Reproduce with `npm run lesson:load:report` or `npm run lesson:load:check`. The report additionally distinguishes teaching, productive, listening/dictation and morphology opportunities, distinct assessed targets and activity-family diversity. Calculations are derived from validated authored data and the actual grouped-slide plan, without changing assessment objects or order.

## Learner behavior and data privacy

- At the end of each sitting, the learner can **continue immediately** or **save locally and return to the section map**. From that map, they can resume or explicitly restart at the beginning.
- Per-answer correctness, total graded denominator, per-target attempts/history, wrong-answer retries and original checkpoint score thresholds remain intact, including after resuming across reloads.
- A separate local-only draft record includes the section/lesson IDs, content fingerprint, next screen index, cumulative score, retry activity indices and session identity. A stale/corrupt draft is ignored; an explicit reset or final completion clears its draft. Saved scores/history in the existing key are not rewritten by this feature.
- If local storage is unavailable, the break allows continuing, but does **not** present a misleading save-and-leave action.
- No background sync, analytics or fatigue measurements are added. A whole 62-answer checkpoint remains demanding in total even when spread across four sittings; a later editorial project may split it into actual new lessons with an explicit migration.

## Grouped UI / accessibility QA

The grouped inputs retain their native wrapping `label` text, numbered prompts, Finnish `lang=fi` text spans, Persian RTL labels, minimum 44-pixel hit targets, 16-pixel mobile input text, visible keyboard focus, per-item bilingual correction and accessible feedback focus. These are code-level contracts and tests, not a claim of completed real-device/screen-reader manual testing. Browser checks on narrow mobile and a real screen reader remain open under the parent issue.

**Release gate:** CI tests, static pacing/budget reports for all shipped lessons, Finnish UD workflow, review findings and generated-file synchronization must succeed before merge.
