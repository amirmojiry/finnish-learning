# Grouped lessons and learner-fatigue slide budget

[Persian version](LESSON-SLIDE-COMPACTION.fa.md) · [Short resumable sittings](LESSON-PACING.md) · [Issue #189](https://github.com/amirmojiry/finnish-learning/issues/189) · [R2 contract](R2-LESSON-SLIDE-BUDGET.md)

## Shipped baseline and observed limits

The 140 authored lessons across 14 shipped sections include **55 lessons with more than 30 activity entries** and **four with more than 40**, reaching 62 in A1.1 Section 2 Lesson 10. These are **authored opportunities**, not 55 observed long sessions or evidence of measured fatigue. The on-demand audit separates authored activities, initial **visible slides**, and independently **graded answers**:

- `npm run lesson:slides:report`: reproducible Markdown table for all 55 original outliers.
- `npm run lesson:slides:json`: machine-readable audit of all 140 lessons.
- `npm run lesson:slides:check`: fails if any shipped lesson still needs more than 30 initial screens or changes authored question order.

## Implemented grouped UI, not deletion

Only an initially over-budget lesson is compacted. Adjacent blocks of **up to four** similar activities become one slide. Supported kinds: reviewed vocabulary teaching cards, Persian-to-Finnish typed recall, reviewed meaning/Finnish multiple-choice matching rows, and **controlled sentence production**. The original subactivity objects remain in the original order; no source manifest, lesson ID, checkpoint target list, audio/dictation/morphology task or review history is silently modified.

- One teaching slide can list several words and manual pronunciation buttons; it awards **zero** graded answers.
- Matching uses a keyboard-accessible choice field per independent item, preserving the **original four-choice distractor set** and assessment direction. It is not a free-response or speaking mastery test.
- Typed/controlled production uses a separate labelled Finnish input per target. The accepted forms, cues and original morphology-sensitive grading policy are preserved.
- A single submit records **one attempt per subactivity** through the existing target/history ledger, maintaining distinct recognition/production, lesson score denominator, first-attempt information and target-specific incorrect-answer recovery. Do not infer per-row reaction time from the shared screen duration.
- Existing saved completions remain. No data migration or changes to the original 140 authored manifests are required.

The target for later **editorial** re-authoring is generally 12–20 screens, with 21–25 for intensive lessons and a maximum of 30 for new authored content. Grouping is not a substitute for spaced retrieval, genuine Finnish use or independent grammar evidence. A separate editorial pass may split coherent learning objectives using variable section lengths, with explicit migrations if saved lesson IDs would change.

## Accessibility and release gates

The grouped forms use native keyboard-operable input/select controls with labelled fields, individual feedback, Persian right-to-left prompts and `lang=fi` on Finnish text. Mobile cards scroll when needed; font scaling and screen readers must be verified in browser review. Existing teaching audio remains user-initiated in groups to avoid simultaneous autoplay.

Tests verify all 140 manifest lessons, preservation of the flattened ordered assessment sequence, deterministic grouping, separate graded target evidence, and a hard upper bound of 30 **initial visible slides**. Optional retries of missed questions happen after initial slides and may add remediation screens; they are not included in the static initial-slide audit. Live duration, abandonment and fatigue telemetry are **not** implemented or claimed.
