# P3: effective-lesson vocabulary composition and spaced context audits (v1.72.0)

[Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Issue #227](https://github.com/amirmojiry/finnish-learning/issues/227) · [فارسی](P3-LEARNER-EFFECTIVE-RECYCLING.fa.md)

## Follow-up P3 triage and semantic novelty (v1.73.1, issue #232)

The prior v1.72.0 analysis was **an audit, not repair**. The new step makes the report actionable without changing authored lesson arrays: a previously introduced *reviewed lexeme+sense* is **not newly learned again** merely because a later lesson teaches another case/inflection. The later grammatical form remains new **as an exact form**, with separate positive grading and no SRS mastery inheritance. Same-lesson inflections sharing one reviewed sense are classified correctly; forms with **unreviewed P2 semantics** are not guessed into families. The ~2 ranked + ~2 topical + 1 expression / 3–5 reviewed policy remains guidance only. Ranked/form counts and *verified truly new lexeme+sense counts* are different measures, not interchangeable.

Use the new deterministic **P3 editorial remediation queue** to prioritize the **62/931 forms without later independently graded retrieval** and **838/931 without a later graded different authored Finnish example**. Some late introductions in A2.1 Section 2 may legitimately await a future playable section. The queue keeps exact written form IDs, reviewed sense metadata only when explicit, original Parole rank if source-backed, remaining shipped lessons, actual later scored modes and a clearly labeled heuristic priority score. **It never invents Finnish examples, alters learner progress or presents static opportunities as language proficiency.**

For new authored sections, `composition_recycling_gate: "required"` still requires later graded recall in a genuinely changed sentence. An additional **opt-in** `composition_skill_gate: "required"` can require later *receptive* and *productive* practice separately. It is not imposed retroactively on 140 legacy lessons; whether both skills are necessary for each lexical target is a pedagogical decision.

Run the triage commands alongside the original P3 audit:

```sh
npm run p3:triage:check
npm run p3:triage:report
npm run p3:triage:json
```

The report is a **review queue**, not 838 automatically written exercises. Each proposed new context requires human-confirmed Finnish, Persian meaning, suitable receptive/productive difficulty and a backward-compatible edition plan. The broad three P3 acceptance boxes in #101 remain open until those content decisions and relevant P2 sense review are completed.

## Why a separate audit

The initial P3 report checked **authored** activities, but 80 of the 140 shipped lessons now have shorter **fresh-start editorial editions**. An authored question omitted from those editions is **not** graded evidence for new learners. This revision adds an independent, reproducible audit of **all 14 sections / 140 actual learner-effective lessons**, with 931 declared new exact-form introductions and zero duplicates by normalized written form across shipped sections. The report keeps source authored activity totals separate from effective counts and never touches previous Course scores or Word Practice SRS.

The audit is **static authored evidence** and therefore cannot determine whether any individual learner recognized, actively produced, mastered or forgot a word.

## Composition guideline, not a quota

For a new teaching lesson propose approximately **two genuinely new ranked forms, two useful topical lexemes and one expression, plus three to five graded reviews** of already introduced forms. A flexible default is roughly three to six genuinely new lexical targets. Checkpoints should introduce no new forms. These are authoring **starting hypotheses**, not strict requirements for historical lessons or fixed activity totals. The audit classifies new ranked forms, new topical/unranked forms, expressions and **previously introduced forms with positive grading** separately. It reports exceptions rather than deleting needed grammar, morphology or later review questions.

## Identity and duplication boundary

- Exact single forms are keyed by stable Unicode-normalized **form IDs**; multiword expressions have separate expression IDs. Repeated spelling in a different course item or sentence is not a second *new* introduction.
- Only the explicitly reviewed P2 `lexeme_id` plus `sense_id` can identify two different forms belonging to one reviewed semantic family. A newly encountered case form may be new **as a form**, not a truly new lexeme; its scored evidence remains separate.
- **Unresolved P2 senses (1,194 records in v1.71.0)** remain **unknown**. In particular, `voi`, `pitää` and contextual sense variants cannot be joined by a guessed lemma and cannot inherit Word Practice mastery. No auto-change to the 425 dictionary entries, Parole ranks, historical SRS storage or previous lesson scores.

## Later review, skill and context

Positive graded opportunities are extracted from the current **effective learner edition** (including editorial selections), not source activities. **Context is derived from the graded activity's real Finnish sentence** (`expected_fi`, or a completed `prompt_fi`/`frame_fi`) and only falls back to the item's example where the activity has no full, grounded Finnish sentence. A one-word morphological answer is not a complete sentence; blank frames are not counted as new contexts unless they can be completed using the authored expected answer. This also prevents an alias item's unrelated static example from fabricating a contextual review. Later positive assessment is a different metric from later graded use of an actual **different Finnish example**. Repeatedly assigning the same real sentence in a new lesson is a review but **not** new-context generalization. On the updated v1.72.0 static baseline, **93/931** introductions have later graded examples in another context (**838** lack this stricter evidence); this is not an observed learner outcome.

The report also distinguishes receptive meaning/reading choice, Finnish listening recognition, dictated spelling, typed target recall, guided production and open production. It never treats a four-choice answer as independent productive mastery, nor equates having graded opportunities with a learner passing them. The detailed JSON records later scored lesson IDs, context-varied lesson IDs and receptive/production evidence for each introduction.

## New-content gate and legacy follow-up

- New **A2.1 Section 3** lessons and explicit `composition_policy: required` activities are checked for repeated exact-form introductions, positive initial graded evidence and no fresh checkpoint targets.
- When the full 10-lesson A2.1 Section 3 section is present, or a section opts into `composition_recycling_gate: required`, each non-checkpoint new exact form must receive later scored retrieval with a **different authored Finnish context**. Failures become CI errors. This avoids falsely counting repeated identical examples as varied contextual recall.
- The 140 existing lessons are measured as an **advisory historical baseline**; there is **no automatic rewrite** of their curated activities, original arrays or progress. The top gaps in the report become **review tickets**, not fabricated answers or deleted exercises.
- Receptive/production counts are authored opportunities, not measured outcomes. Full P3 closure requires careful correction of verified legacy gaps and still-unresolved lexeme/sense identity work, plus real learner and accessibility QA.

## Run

```sh
npm run p3:recycling:check
npm run p3:recycling:report
npm run p3:recycling:json
npm test
```

The CLI report is reproducible from the current checked-in course data and P2 sidecar. It does not store learner response history, change SRS scheduling or invent dictionary provenance.
