# P5: safe Course → Word Practice contextual review (v1.73.0)

[Child issue #229](https://github.com/amirmojiry/finnish-learning/issues/229) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [فارسی](P5-CONTEXTUAL-REVIEW-BRIDGE.fa.md)

## Safeguarded bridge

The existing read-only `fiCourseProgressV1` first-attempt history is mapped to **exact Parole dictionary surface `form_id` values only**, never to inferred lemma/sense mastery. The regenerated deterministic course-review manifest contains **239** eligible section/item mappings; **224** have an authored Finnish example and Persian counterpart with the exact independent form visibly present, and **31** mappings carry previously reviewed P2 `lexeme_id/sense_id`. The five globally ambiguous written forms in the reviewed contextual map (including `voi` and `pitää`) remain **excluded**, even when a particular Course item has a reviewed contextual sense. Where a map lacks a safe example, the existing Word Practice dictionary example is used.

Only a valid **first graded attempt** enters this advisory bridge, deduplicated by session/section/target and bounded to the last 30 days. Repeated clicks, retries, malformed legacy records, unscored teaching/distractors, ambiguous forms and future timestamps are ignored. It records correct and incorrect answers separately and counts modes separately: receptive meaning choice, Finnish listening choice, dictation, typed answers, guided production and independent production. This is **not a shared mastery score**; correct four-option recognition never grants independent production, and old scores or SRS states are not copied between case forms.

## Scheduling and context

**Due-at Word Practice reviews always go first**, with their original times, ease factors, intervals, lapses, ranks and mastery determination unchanged. Course first-attempt errors affect only the order and suggested exercise format of **unseen exact words**. Receptive mistakes suggest translation choice, listening mistakes a Finnish-context cloze choice (not a simulated listening proficiency test), and typed/dictated/guided/independent mistakes a Finnish-context cloze input. A safely sourced lesson example may replace the default dictionary example for that word. If the source example is not validated, is sense-ambiguous, or cannot load offline, use the dictionary example.

## Learner-controlled limits, recovery and rollback

A labeled pair of Word Practice controls lets the learner set **0–30 new words/day** (default 10) and **1–50 words/session** (default 20), persisted independently in `fiSrsPreferencesV1`. Zero new words still allows due review. Cross-tab changes refresh the controls. Invalid schema, corrupt JSON, impossible numbers or missing/blocked browser storage fall back safely. The existing `fiSrsProgressV1` schema **stays at v1** and is never migrated, rewritten by Course, or cleared by preferences. Failed SRS storage writes keep the answer **in memory for the open page** and show a warning; genuine persistence depends on browser storage availability. A wrong answer still sets a **10-minute retry due time**; changing limits does not change those due dates. A rollback may ignore/remove only the optional preferences key; it must retain the original SRS and Course keys.

## Boundaries and follow-up

This release adds a **functional, mode-aware advisory context bridge**, not a shared lexeme/sense SRS, complete reading/listening production tracking, or CEFR/YKI proficiency estimates. The broader **five P5 checkboxes in parent #101 remain open** pending editorial verification of contextual homographs, reliable skill-appropriate audio/device UX and full manual RTL/screen-reader QA. The new A2.1 Section 3 release gate is separate. Run `npm test`, `npm run course:review:check`, and `npm run sync`; the generated manifest must be committed together with its builder.
