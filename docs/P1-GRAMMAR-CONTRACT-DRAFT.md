# P1 lesson objectives and grammar assessment contract (draft)

Parent: #101 · Implementation: #104

## Backward-compatible proposed lesson fields

Each lesson MAY declare `learning_objectives`. Legacy manifests without the field remain playable and are reported as **unmapped**, never as grammar-mastered.

```json
{
  "learning_objectives": {
    "communicative": [{"id": "a21s3-l1-can-do", "can_do_fa": "دربارهٔ علاقه‌مندی‌هایم صحبت کنم."}],
    "lexical": [{"target_id": "existing-target-id", "status": "introduced"}],
    "grammar": [{
      "concept_id": "canonical-master-curriculum-concept-id",
      "status": "introduced",
      "prerequisite_concept_ids": [],
      "explanation_fa": "توضیح بازبینی‌شده",
      "examples": [{"fi": "Pidän musiikista.", "fa": "موسیقی را دوست دارم."}],
      "evidence": [{"activity_id": "stable-graded-activity-id", "mode": "recognition"}]
    }]
  }
}
```

IDs above are illustrative; implementation must resolve actual canonical IDs and existing activity schema before adding manifests. Do not generate Finnish inflections by suffix concatenation.

## Validation requirements

- An objective is **introduced**, **recognized**, **produced with support**, **produced independently in a new context**, or **reviewed** only with distinct supporting evidence; displaying a sentence is not assessed competence.
- A claimed assessed grammar concept needs at least one positively graded correct-answer activity with an explicit concept link; distractor-only occurrence, note text or reading exposure is insufficient.
- Grammar prerequisite IDs must resolve to canonical curriculum concepts and respect stage order. A memorized phrase does not establish an entire tense/case paradigm.
- Repeated attempts and hints must not be counted as independent mastery; no CEFR/YKI certification inference.
- Preserve existing course/Word Practice progress and IDs. Keep Persian can-do phrasing natural and learner-facing examples reviewed.
- Feed the later pre-lesson overview (R1) from these same fields; do not duplicate objectives in UI-specific content.

## Implementation acceptance for #104

- [ ] Inspect real activity/lesson and canonical grammar ID schemas; adapt this proposed shape as needed.
- [ ] Introduce optional metadata with backward-compatible loader and validation.
- [ ] Map A2.1 grammar concepts to reviewed examples and graded activity IDs; report missing evidence honestly.
- [ ] Add positive/negative fixtures for prerequisite errors, distractor-only grammar and production vs recognition.
- [ ] Run complete regression/sync/CI and review before marking P1 done in #101.
