# Variable lesson counts per shipped section (R3)

[Generated shipped-versus-planned audit](SECTION-STRUCTURE-AUDIT.md) · [فارسی](VARIABLE-SECTION-LENGTHS.fa.md) · [Issue #186](https://github.com/amirmojiry/finnish-learning/issues/186) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101)

## What changed

There is **no universal fixed ten-lesson rule** for a section. The authored `section.lessons` array, its consecutive one-based `order`, and the corresponding curriculum section contract determine how many lessons are playable. A section must be nonempty; the **last** lesson, whatever its ordinal, remains a real checkpoint with nonempty `checkpoint_targets`, its preserved passing score, no first-time lexical introductions, and all required structured/practice evidence. Earlier lessons may not claim to be the checkpoint.

A section with seven lessons has a seventh-lesson checkpoint; a section with thirteen lessons has a thirteenth-lesson checkpoint. The authored curriculum IDs and order must match exactly, even when the counts match. Duplicate IDs or gaps are rejected rather than silently reindexed.

The existing browser UI already takes path length, completion fraction, connecting elements, next/previous lesson and next-section availability from the actual `section.lessons` array. This PR preserves that dynamic behavior and adds executable 7-, 10-, and 13-lesson regression fixtures, including score persistence, unlock/backfill and checkpoint gating.

## Planned is not shipped

The canonical master curriculum enumerates planned sections through C2; these are **design slots**, not playable app sections. The generated [structure audit](SECTION-STRUCTURE-AUDIT.md) separates:

- **Shipped:** a manifest explicitly included in `COURSE_STAGES.sectionUrls` and validated against its curriculum (currently 14 sections / 140 lessons).
- **Outline-only:** a curriculum section with non-playable authored lesson outlines but no shipped manifest (currently A2.1 Sections 3–4).
- **Plan-only:** a future master-curriculum section slot with no shipped manifest and no detailed shipped-stage curriculum (future A2.2–C2).

The audit reports distinct playable lesson totals and available *unshipped* outlines; it never treats the outline's planned lesson count as completed work.

## Compatibility boundaries

- No authored Finnish/Persian lesson text, `curriculum_id`, `lesson.id`, checkpoint target list, grades, browser storage version, Course target performance, or Word Practice SRS was changed.
- Legacy 10-lesson sections remain byte-for-byte intact. Synthetic shorter/longer section fixtures exist **only in tests**.
- A grade recorded for a legacy lesson remains associated with the same stable lesson ID and historical denominator.
- Grammatical prerequisites, assessed correct answers, recycling dependencies and activity requirements remain in effect. The number of lessons is not a substitute for those educational quality gates.
- This is **not** authorization to publish A2.1 Section 3. Parent P2/P5 and independent language skill gates remain open.

Reproduce with `npm run r3:structure:write`; verify with `npm run r3:structure:check` and `npm test`.
