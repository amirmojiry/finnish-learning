# P3: Lesson composition and lexical recycling audit

This document describes the live, deterministic reporting and strict future-authoring gate for [issue #138](https://github.com/amirmojiry/finnish-learning/issues/138), tracked by [parent #101](https://github.com/amirmojiry/finnish-learning/issues/101).

Generate the current prioritized report with `npm run lesson:composition:report` and per-lesson machine-readable evidence with `npm run lesson:composition:json`. Run `npm run lesson:composition:check`, which is also included in `npm test`. Optional `npm run lesson:composition:write` saves JSON to `data/course/lesson-composition-audit.json` and Markdown to `data/course/lesson-composition-audit.generated.md`; it never overwrites this authored guide.

## Learner-effective P3 follow-up (v1.72.0)

This authored-oriented P3 report remains available as a historical/advisory audit. For new learners the 80 shortened lessons use an editorial selection; the source activity inventory must not be mistaken for *graded learner-effective retrieval*. The complementary [P3 learner-effective audit](P3-LEARNER-EFFECTIVE-RECYCLING.md) handles all 140 shipped lessons, counts exact-form introductions and reviewed lexeme/sense family variants without fabricated identity, and separates later independent positives by receptive/listening/dictation/typed/guided/independent skill and genuinely different Finnish contexts. Run `npm run p3:recycling:check`, `npm run p3:recycling:report` or `npm run p3:recycling:json`. The proposed 2+2+1 / 3–5 guideline is **not an enforced quota**, and no legacy lesson has been silently reauthored.

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
