# Delivery roadmap — Finnish Learning

[نسخهٔ فارسی](ROADMAP.fa.md) · [Documentation hub](README.md) · [Curriculum audit](CURRICULUM-AUDIT.fa.md)

This document is the **single maintained delivery roadmap**. [Learning Design](LEARNING-DESIGN.md) covers *why* and *how* we teach; the [master curriculum](MASTER-CURRICULUM.md) specifies *what* the whole A1.1–C2 learning path should cover. They are not independent backlogs.

## Baseline and source of truth

This status snapshot was checked on **2026-10-09**. For fresh implementation counts use `npm run curriculum:audit`, which reads the actual course JSON files. A planned level is not a playable level.

| Stage | Curriculum planning | Implemented lesson records | Next decision |
| --- | --- | --- | --- |
| A1.1 | 4 sections, 40 lessons in [A1.1 curriculum](../data/course/a1.1-curriculum.json) | 4 sections / 40 lessons | Maintain correctness, review exercise quality and skills evidence |
| A1.2 | 4 sections, 40 lessons in [A1.2 curriculum](../data/course/a1.2-curriculum.json) | **4 sections / 40 lessons** | Continue correctness, device/audio and proficiency-evidence auditing |
| A1.3 | 4 sections, 40 lessons in [A1.3 curriculum](../data/course/a1.3-curriculum.json) | 4 sections / 40 lessons | Language review, device testing and independent proficiency-evidence audit |
| A2.1 | [40-lesson curriculum outline](../data/course/a2.1-curriculum.json), first 20 lesson contracts detailed | **2 sections / 20 playable lessons** | Review naturalness, confirm accessible service interactions, and author Sections 3–4 before shipping them |
| A2.2–C2 | Four proposed modules per level in the [master plan](../data/course/master-curriculum.json) | 0 | Author and review full level curricula before writing lessons |

The shipped dictionary has an independently generated count and Parole frequency fields. Do not interpret stage lexical targets as existing dictionary entries or attained proficiency. Consult the [vocabulary gap report](../data/course/a1.2-vocabulary-gap.json) and [vocabulary roadmap](VOCABULARY-ROADMAP.md) when sourcing new items.

## Completed foundations (keep maintained)

- **A1.1 foundation:** Four playable sections, lesson summaries, reviewed example frames, basic morphology, prerequisite and recycling relationships, and automated data contracts.
- **Course practice foundations:** Persian-to-Finnish production, reading/listening and dictation where device audio permits, sentence ordering, expression completion, exercise feedback and course weakness review with answer history.
- **Authoring contracts:** A1.2's reviewed contract is now fully playable; A1.3 has four implemented playable sections and a reviewed lesson plan. Frequency and curated topical sources remain separate.
- **Source-backed vocabulary:** The reviewed Parole position tranche through 400 was added to the dictionary. Future tranches must be selected from evidence, not simply assumed to cover the next curriculum topics.
- **Whole-course planning:** A1.1–C2 master JSON with grammar dependencies, topic vocabulary, sentence/phrase examples and proposed authentic assessment. These are design targets, not automatic certification claims.

## Near-term content priorities

### 1. Review completed A1.2 and close quality gaps

- A1.2 Sections 3 (routines, work/study, appointments) and 4 (weather, symptoms, pharmacy and help) are now playable: 20 new lessons, each with 15 activities.
- Re-evaluate expression naturalness, accepted variants, device speech support, visual clarity and the final cumulative checkpoint using user feedback.
- All four sections must keep reviewed target IDs, explicit word morphology and authentic Persian prompts; do not confuse this milestone with independent CEFR/YKI proficiency assessment.
- Use `npm run curriculum:check`, `npm run curriculum:audit` and `npm test` before any content release.

### 2. Quality review of completed A1.3

- All four sections of the [reviewed A1.3 curriculum](../data/course/a1.3-curriculum.json) are now playable; preserve one canonical curriculum and verify every implemented contract.
- Extend familiar conversations, messages, home/neighborhood, study/work and recent-event phrases.
- Teach selected past forms as reviewed chunks first; do not silently equate them with full independent past-tense morphology.

### 3. Verify the A1 progression before A2

- Audit grammar transfer from memorized phrases to productive use, including present tense, negation, local cases, partitive and consonant gradation.
- Check progression through listening, reading, writing and spoken interaction with appropriately valid assessment evidence. Current app exercise completion **does not** certify CEFR/YKI speaking or mediation.

### 4. Complete A2.1 deliberately, then expand A2.2–C2

- A2.1 Sections 1–2 are playable: 20 lessons covering travel/past and routine healthcare/public-service language, each with varied listening, controlled production, integrated reading and an 80% checkpoint. Healthcare texts teach communication, never medication dosage or clinical advice.
- Author and independently review A2.1 Sections 3–4 (leisure and family narratives), then add playable files and regression tests; A2.2–C2 remain planning-only.
- The current A1 convention of ten lessons and fifteen activities is a starting heuristic, **not** an obligatory prescription for B2/C1/C2.

## Cross-cutting quality work

| Area | Current baseline | Outstanding work |
| --- | --- | --- |
| Curriculum integrity | Master dependency checks and A1 lesson identity validation | Add stage/lesson-level coverage of actual lexical introduction, expression use, grammar depth and recycling |
| Vocabulary | Parole-backed dictionary + curated lesson words and A1.2 gap report | Lexeme vs form vs sense links, reviewed multiword-expression metadata, prioritized gap closure |
| Review | Word Practice SRS and separate Course weakness practice | Tune learning evidence without treating the two distinct progress models as interchangeable |
| Delivery and accessibility | Static GitHub Pages, CI quality gate, existing keyboard/mobile improvements | Continue device testing, meaningful screen-reader and interactive regression tests |
| Generated assets | Deterministic vocabulary and UD pipelines | Consider compact content bundles and optional build-time audio without runtime dependency |

## Later, contingent capabilities

Session length/difficulty, daily goals, streaks, bookmarks, word lists, progress import/export, offline/PWA, teacher features and synchronized accounts may be valuable, but **do not displace core lesson coverage**. A backend, AI tutor or free-text/speech assessment belongs in a separately scoped decision after static delivery no longer meets a concrete requirement.

## Contribution gate

1. Choose a milestone here, then link the issue and PR to the exact reviewed curriculum objective.
2. Distinguish planned content, implemented activity data and independently verified skills.
3. Follow [AGENTS.md](../AGENTS.md), the [grammar dependency map](GRAMMAR-ROADMAP.md) and the [master curriculum](MASTER-CURRICULUM.md).
4. Preserve GitHub Pages compatibility and current course/data contracts; do not fabricate source frequency ranks.
5. Use `npm run curriculum:check`, `npm run curriculum:audit`, and `npm test`. Review CI comments before merge.
6. Change milestones **only here and in the paired Persian roadmap**; root READMEs and Learning Design link here rather than maintaining separate phase checklists.
