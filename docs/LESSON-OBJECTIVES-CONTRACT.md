# Lesson learning objectives contract (P1)

The optional `learning_objectives` property separates communicative, lexical and grammar goals. Existing lesson records remain valid without it. It is checked after deterministic activity injection by `validateImplementedPath` and can also be checked directly with `validateLessonObjectives`.

- `communicative`: `{id, can_do_fa}`, a Persian can-do statement.
- `lexical`: `{target_id, status}`, with a section item ID and `introduced` or `reviewed`.
- `grammar`: `{concept_id, status, prerequisite_concept_ids, explanation_fa, examples, evidence}`. Grammar concept IDs and prerequisite lists must match `curriculum.grammar_concepts` derived from the master curriculum. Examples require reviewed Finnish and Persian text.
- `evidence`: `{activity_type, item_id, mode}` identifies a positively graded activity after runtime injection. Alternatively, `activity_index` may select an activity. Each selected activity must explicitly declare `grammar_concept_ids` containing the objective's concept ID. `mode` is `recognition`, `supported_production`, or `independent_production`. Independent production rejects explicit scaffolding. This validates an authored assessment opportunity, not learner proficiency.

The first mapped example is A2.1 Section 2 Lesson 3: simple past `alkoivat` is supported production via a positively graded inflection exercise. The surrounding lessons' grammar prose is **not** automatically labeled as mastery of any canonical grammar concept. Additional concept mappings require reviewed examples and matching graded evidence; do not infer them from distractors, grammar notes, or activity type alone.

This change does not alter lesson progression or user storage. Lesson-overview UI, activity-count flexibility and additional lesson mappings are separate follow-up work.
