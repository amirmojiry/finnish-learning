# P3: later graded retrieval with archived lessons preserved (v1.76.0)

[Child issue #239](https://github.com/amirmojiry/finnish-learning/issues/239) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Persian](P3-AUTHORED-RETRIEVAL-REMEDIATION.fa.md)

## What changed, and what did not

The previously verified learner-effective audit of 140 shipped lessons found **62 of 931 first-introduced exact forms/expressions with no later independently graded retrieval** (concentrated in A1.1 Sections 2–4 and A1.2 Sections 1–2). This change uses `scripts/build-p3-reviewed-retrievals.cjs` to assign a bounded later scored activity for each gap, after at least one intervening lesson. It selects **only pre-existing authored bilingual Finnish/Persian source material**; it never synthesizes sentences, lemma/sense identities, official corpus ranks or CEFR abilities.

The source lessons retain their exact `activities` arrays, checkpoint content, IDs and original stored grades. Each eligible *non-paced, non-checkpoint* target lesson adds at most two `p3_review_activities`, exposed only to new course starts through the `p3` learner edition. The original `legacy` and previously selected `editorial` revisions remain intact. No existing `fiCourseProgressV1`, `fiCoursePacedLessonDraftsV1` or Word Practice SRS schema is migrated. Original completed lessons stay completed; a new review opportunity is not retroactive proof of learner knowledge.

An activity is a whole-form typed recall in Persian-to-Finnish mode unless a source-reviewed Finnish/Persian sentence contains the exact word token, in which case a cloze uses the previously authored sentence. **Only the visible new Finnish context counts as distinct-context generalization.** A translation-only typed question is scored retrieval but never counted as an observed new Finnish sentence. Source provenance records the originating section/item/lesson and optionally the authored dictionary or course example selected for the cloze.

## Reproduction and validation

Run `npm run p3:reviews:write` to generate the same reviewed lesson additions deterministically; `npm run p3:reviews:check` checks the committed files and `npm run p3:reviews:json` reports assigned source/target lesson IDs, review mode and example provenance. The CI generator rebuilds dependent P2 identity and Course-to-Word Practice maps after the P3 content changes and commits these outputs together. Run `npm test` and compare the updated `npm run p3:triage:report` against the old 62 / 838 baseline.

## Outstanding broader P3 acceptance

The second baseline gap — **838/931 introductions without a later scored genuinely different Finnish sentence** — is a separate content-authoring problem. A later graded recall of the *same* sentence or only a Persian-to-Finnish prompt does **not** fix it. Additional, qualified Finnish/Persian editorial work remains necessary for items that have no alternative source-attested context, along with real-device and learner outcome tests. The 2-ranked + 2-topical + 1-expression / 3–5 earlier reviews composition model remains an advisory guideline, not a retrospective quota for 140 historical lessons. Therefore **do not tick P3's broad parent checkboxes or claim the whole phase is done** until the remaining content is explicitly authored, graded and verified.
