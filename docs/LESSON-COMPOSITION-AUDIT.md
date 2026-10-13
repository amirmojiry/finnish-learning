# P3: Lesson composition and lexical recycling audit

This document describes the live, deterministic reporting and strict future-authoring gate for [issue #138](https://github.com/amirmojiry/finnish-learning/issues/138), tracked by [parent #101](https://github.com/amirmojiry/finnish-learning/issues/101).

Generate the current prioritized report with `npm run lesson:composition:report` and per-lesson machine-readable evidence with `npm run lesson:composition:json`. Run `npm run lesson:composition:check`, which is also included in `npm test`. Optional `npm run lesson:composition:write` saves both formats locally for editorial review.

## Review priorities

The previous committed coverage audit flags substantial legacy gaps: A1.2 Section 4 has 51 unassessed target occurrences and A1.2 Section 3 has 44, before inspecting the current prepared activity evidence. These are **not** evidence that learners failed to learn them. Use the live P3 report to order individual lessons by missing correct-answer assessments and repeated-new labels before proposing remedial content changes. This structural PR does not alter existing lesson content.

## Evidence contract

- Normalize surface forms for indexing, but keep every form's graded evidence separate. Only explicitly reviewed P2 lexeme/sense identifiers may be used for semantic linking.
- A target is positively assessed only when the authored activity design makes that item a correct answer. Teaching cards, readings and distractors never count as assessed mastery.
- Subsequent *authored* correct-answer opportunities are distinguished from learner attempts and Word Practice SRS; recognition and typed/controlled production remain distinct.
- New A2.1 Section 3 lessons, and any lesson declaring `composition_policy: "required"`, must have positively graded evidence for every declared target, prevent a previously introduced surface from being labelled new, retain communicative/lexical/grammar objective evidence, and introduce no new lexical targets at checkpoints.
- Approximately 3–6 new lexical targets and 3–5 reviews are advisory only, not rigid quotas. The 14-, 20- and 25-activity regression fixtures must remain valid.
- The existing 140 lessons stay advisory until human-reviewed revisions. No generated filler, source-rank forgery, data migration, progress changes or SRS inheritance are permitted.

This P3 audit pilot does **not** authorize shipping A2.1 Section 3 while the P4/P5 release gates of #101 remain open.
