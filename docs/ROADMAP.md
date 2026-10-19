# Delivery roadmap — Finnish Learning

[نسخهٔ فارسی](ROADMAP.fa.md) · [Documentation hub](README.md) · [Curriculum audit](CURRICULUM-AUDIT.fa.md)

This document is the **single maintained delivery roadmap**. [Learning Design](LEARNING-DESIGN.md) covers *why* and *how* we teach; the [master curriculum](MASTER-CURRICULUM.md) specifies *what* the whole A1.1–C2 learning path should cover. They are not independent backlogs.

## R2 editorial shortening of priority A1 lessons (2026-10-19)

[Child #194](https://github.com/amirmojiry/finnish-learning/issues/194) introduces genuinely shorter edited editions for four overlong A1 lessons, reducing their combined independently graded answers from **144 to 92** while retaining checkpoint targets, explicit grammar evidence and the original archived activity arrays for resuming v1.56 drafts. Fresh attempts use 19/20/21/24 initial visible screens; paused old attempts use the historical question sequence. [Rationale and side-by-side audit](LESSON-EDITORIAL-REDUCTION.md). Parent #189 remains open for editorial work on the other 51 historically long lessons, reinforcement redistribution and real-device UX/retention verification.

## R2 pacing and remaining editorial workload (2026-10-18)

The grouped-slide work in [#189](https://github.com/amirmojiry/finnish-learning/issues/189) now offers optional **locally resumable** study sittings for four heavy A1 lessons via [child #192](https://github.com/amirmojiry/finnish-learning/issues/192). Each sitting has at most 15 visible screens and 20 independently graded answers, with unchanged legacy lesson IDs, checkpoint targets and total question count. [English details](LESSON-PACING.md) / [فارسی](LESSON-PACING.fa.md). Parent #189 remains open for *actual* editorial shortening, tested mobile/screen-reader accessibility and responsible learner-duration evidence; this is not proof of reduced total course workload.

## R3 flexible lesson counts (2026-10-17)

[Issue #186](https://github.com/amirmojiry/finnish-learning/issues/186) enables variable number of lessons per section while preserving all shipped identifiers and checkpoints, with a separate [shipped/planned inventory](SECTION-STRUCTURE-AUDIT.md). Existing 14 sections / 140 lessons stay intact; A2.1 Sections 3–4 are still outlines. Parent #101 P2/P5/release gates remain open.

## Content acceptance progress (2026-10-15)

All twelve A1 section packages and A2.1 Section 1 travel/past (#178/#179) are accepted for authored content. [Issue #180](https://github.com/amirmojiry/finnish-learning/issues/180) covers A2.1 Section 2 healthcare/public services ([scoped acceptance](A21-SECTION2-ACCEPTANCE.md)), with explicit positive/recycled forms, bounded grammar and supported reading/writing. All 140 playable lessons across the 14 implemented sections have scoped content checks. The next work is assessing open P2/P5/R3 and independent skills evidence under parent #101, **not** launching A2.1 Section 3 before prerequisites. CEFR/YKI certification remains open.

## P2 lexical identity progress (2026-10-15)

First editorial batch [#182](https://github.com/amirmojiry/finnish-learning/issues/182) adds 40 deliberate nominal/pronoun form-and-context-sense links to the original seven. See [review methodology](P2-LEXICAL-IDENTITIES-BATCH1.md) and the [deterministic report](P2-IDENTITY-BATCH1-REPORT.md). This identifies written forms only; it does not transfer Word Practice SRS mastery, assert general declension competence, or close the remaining P2/P5/R3 release gates. A2.1 Section 3 remains outline-only.

## P2 contextual senses, batch 2 (2026-10-15)

The scoped [batch #184](https://github.com/amirmojiry/finnish-learning/issues/184) differentiates five globally unresolved homographs in 15 source course items and 24 lesson references, using a [new item-scoped sense contract](P2-CONTEXTUAL-IDENTITY-BATCH2.md) and [deterministic report](P2-CONTEXTUAL-IDENTITY-BATCH2-REPORT.md). Existing exact form IDs and Word Practice SRS never become lexeme/sense mastery automatically. P2 overall, P5/R3 and independent language assessment are outstanding; no playable A2.1 Section 3.

## Baseline and source of truth

This status snapshot was checked on **2026-10-09**. For fresh implementation counts use `npm run curriculum:audit`, which reads the actual course JSON files. A planned level is not a playable level.

| Stage | Curriculum planning | Implemented lesson records | Next decision |
| --- | --- | --- | --- |
| A1.1 | 4 sections, 40 lessons in [A1.1 curriculum](../data/course/a1.1-curriculum.json) | 4 sections / 40 lessons | Maintain correctness, review exercise quality and skills evidence |
| A1.2 | 4 sections, 40 lessons in [A1.2 curriculum](../data/course/a1.2-curriculum.json) | **4 sections / 40 lessons** | Continue correctness, device/audio and proficiency-evidence auditing |
| A1.3 | 4 sections, 40 lessons in [A1.3 curriculum](../data/course/a1.3-curriculum.json) | 4 sections / 40 lessons | Language review, device testing and independent proficiency-evidence audit |
| A2.1 | [40-lesson curriculum outline](../data/course/a2.1-curriculum.json), first 20 lesson contracts detailed | **2 sections / 20 playable lessons** | Keep Sections 3–4 outline-only until parent #101 prerequisites and independent quality gates are met |
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

**Gate before A2.1 Section 3:** [Tracking issue #101](https://github.com/amirmojiry/finnish-learning/issues/101) sequences lexical, grammar and review infrastructure. P0 adds the [shipped content coverage audit](COURSE-COVERAGE-AUDIT.md) and its [machine-readable evidence](../data/course/coverage-audit.json). A grammar explanation in prose is not counted as a validated grammar-concept mapping.

### 4. Complete A2.1 deliberately, then expand A2.2–C2

- A2.1 Sections 1–2 are playable: 20 lessons covering travel/past and routine healthcare/public-service language, with varied listening, controlled production, contextual Finnish form completion, integrated reading and an 80% checkpoint. After the practice expansion and 2026-10-13 plural-partitive follow-up, Section 1 has 181 activities and Section 2 has 184 (365 total); the two checkpoints retain 15 targets each. These remain learning opportunities, not evidence of independently mastered grammar or CEFR certification. Healthcare texts teach communication, never medication dosage or clinical advice.
- Author and independently review A2.1 Sections 3–4 (leisure and family narratives), then add playable files and regression tests; A2.2–C2 remain planning-only.
- The current A1 convention of ten lessons and fifteen activities is a starting heuristic, **not** an obligatory prescription for B2/C1/C2.

P3 composition audit pilot: issue [#138](https://github.com/amirmojiry/finnish-learning/issues/138) provides deterministic per-lesson positive assessment and planned later lexical review evidence. Legacy gaps stay advisory; a strict new-section gate applies before authoring A2.1 Section 3. This is an initial P3 quality gate, not completion of the broader editorial recycling/backfill work under #101.

P4 lexical selection preparation: [issue #140](https://github.com/amirmojiry/finnish-learning/issues/140) and the [Parole candidate-review guide](P4-PAROLE-REVIEW-QUEUE.md) establish source-grounded priorities. They do not satisfy the parent P4 first-reviewed-batch release gate, which still requires genuine curated forms, full UD and Persian corpus example translation regeneration.

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

P4 delivery, initial reviewed batch: issue #142, 25 original-source forms 401–425 (minor release 1.35.0). Future batches remain editorial review work; P5 Course/Word Practice review bridge follows after the first real batch meets source, UD and Persian-translation coverage gates.

P5 minimal read-only evidence bridge: issue #144, first-attempt Course errors can prioritize unseen Word Practice forms without changing due SRS schedules or migrating history. Further Course-context review cards, skill analytics and deeper lexeme/sense review models remain separate follow-up work and are not general CEFR/YKI proficiency evidence.

P1/P3 grammar follow-up: [issue #146](https://github.com/amirmojiry/finnish-learning/issues/146) links the existing supported `valokuvia` completion in travel lesson 7 to its grammar objective and a later positively graded contextual review in lesson 9. Travel now has 181 activities; services remain at 184. Broader plural-pattern coverage, A1/A2 objective backfill, P2 reviewed identities, P3 recycling and R3 variable section lengths remain open under #101; Section 3 is still gated.

P1 A1.1 pilot: [issue #148](https://github.com/amirmojiry/finnish-learning/issues/148) maps `a11-olla` introduction in Section 1 lesson 2 and later supported review in lesson 9. Both people have correct-answer grammatical decisions and typed form evidence. Section 1 grows to 155 activities while all lesson IDs, old activity positions and checkpoints remain stable. The pilot is historical; remaining A1 delivery now follows whole-section evidence-linked packages; this does not complete P1 or unlock A2.1 Section 3.

P1 A1.1 question-word pilot: [issue #150](https://github.com/amirmojiry/finnish-learning/issues/150) adds contextual `kuka`/`mikä` choices and typed application in lesson 5, later object-question review in lesson 8 and contextual recognition in checkpoint 10. In the 1.36.3 pilot the section had 160 activities; all fifteen checkpoint targets and saved progress are retained. Continue remaining evidence-linked A1 backfill; this does not complete P1 or open Section 3.

First complete section-sized package: [issue #152](https://github.com/amirmojiry/finnish-learning/issues/152) completes A1.1 Section 1 with ten canonical overviews, zero declared positive-answer gaps, zero repeated-new labels and later review for 49 introduced surfaces/expressions and five scoped grammar concepts. The section has 233 activities; original checkpoint targets and historical scores remain intact. [Acceptance report](A11-SECTION1-ACCEPTANCE.md) / [Persian explanation](A11-SECTION1-ACCEPTANCE.fa.md). Section 2 follows in issue #154; other sections and broader #101 gates remain open.

Second whole-section package: [issue #154](https://github.com/amirmojiry/finnish-learning/issues/154) completes all ten A1.1 Section 2 lessons (270 activities), with no declared positive-answer gaps, correct cross-section review status, later retrieval for 77 introduced surfaces/expressions and five bounded grammar concepts. Numbers 0–20 all have assessment and later review; the profile has four reading facts and supported writing. Original item records, IDs, scores and fifteen checkpoint targets are retained. [Acceptance report](A11-SECTION2-ACCEPTANCE.md) / [Persian explanation](A11-SECTION2-ACCEPTANCE.fa.md). Section 3 follows in issue #156; Section 4 comes next. Wider P2 identities, P5 review, R3 section lesson counts and final integration/acceptance remain open under #101; playable A2.1 Section 3 is still blocked by those foundations.

Third whole-section package: [issue #156](https://github.com/amirmojiry/finnish-learning/issues/156) completes all ten A1.1 Section 3 lessons (282 activities), with no declared positive-answer gaps or repeated-new labels, and later retrieval for 80 introduced surfaces/expressions and five scoped grammar concepts. All weekdays, whole hours 1–5 and time-of-day targets are assessed and reviewed. Each of the five first-person negative mappings is transformed again in the checkpoint; strict grammatical answer grading fixes the En syön false acceptance. Routine frames are introduced before review, and the existing passage gains three reading questions. [Acceptance report](A11-SECTION3-ACCEPTANCE.md) / [Persian explanation](A11-SECTION3-ACCEPTANCE.fa.md). Section 4 follows in issue #158. Broader P2/P5/R3 and final integration/acceptance remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Fourth whole-section package: [issue #158](https://github.com/amirmojiry/finnish-learning/issues/158) completes all ten A1.1 Section 4 lessons (245 activities), zero declared positive-answer gaps/repeated-new labels, later retrieval for 65 introduced surfaces/expressions and six bounded grammar concepts. All ten animal names are assessed/reviewed. Cafe ordering remains formulaic. Familiar-world frames are taught before review; the existing passage has five reading questions and supported four-sentence writing. The final checkpoint retains its original prepared answer scope and 80% threshold. [Acceptance report](A11-SECTION4-ACCEPTANCE.md) / [Persian explanation](A11-SECTION4-ACCEPTANCE.fa.md). This completes the four A1.1 content packages: forty canonical overviews and scoped section gates, 1,030 activities. The next package is tracked in issue #160. Remaining A1.2/A1.3/A2 backfill, P2/P5/R3 and final integration/acceptance remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Fifth whole-section package: [issue #160](https://github.com/amirmojiry/finnish-learning/issues/160) completes all ten A1.2 Section 1 shopping/services overviews, with 291 activities, 71 introduced exact surfaces/expressions retrieved later and six bounded grammar concepts reviewed later. The canonical A1.2 registry includes A1.1 prerequisites. Original item records, core targets, fifteen checkpoint targets and 80% threshold are retained. [Acceptance report](A12-SECTION1-ACCEPTANCE.md) / [فارسی](A12-SECTION1-ACCEPTANCE.fa.md). Section 2 follows in issue #164. Wider P2/P5/R3 and final integration/acceptance remain open under #101.

Sixth whole-section package: [issue #164](https://github.com/amirmojiry/finnish-learning/issues/164) completes all ten A1.2 Section 2 transport/directions lessons: 309 activities, 80 introduced exact surfaces/expressions retrieved later, five bounded grammar concepts reviewed later and zero declared positive-answer gaps. Original item records, core mappings, fifteen checkpoint targets and 80% threshold are retained. Timetable reading and three-sentence trip writing are supported practice. [Acceptance report](A12-SECTION2-ACCEPTANCE.md) / [فارسی](A12-SECTION2-ACCEPTANCE.fa.md). Section 3 follows in issue #166. Wider P2/P5/R3 and final integration/acceptance remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Seventh whole-section package: [issue #166](https://github.com/amirmojiry/finnish-learning/issues/166) completes all ten A1.2 Section 3 routine/study/work/interests/arrangements lessons: 329 activities, 79 introduced exact surfaces/expressions retrieved later, six bounded grammar concepts reviewed later, and zero declared positive-answer gaps/repeated-new labels. All seven temporal weekdays are assessed and later retrieved; both original passages have four reading facts, with supported four-sentence routine/week writing. Original records/core mappings, fifteen checkpoint targets and 80% threshold are retained. [Acceptance report](A12-SECTION3-ACCEPTANCE.md) / [فارسی](A12-SECTION3-ACCEPTANCE.fa.md). Section 4 follows in issue #168. Wider P2/P5/R3 and final integration/acceptance remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Eighth whole-section package: [issue #168](https://github.com/amirmojiry/finnish-learning/issues/168) completes all ten A1.2 Section 4 weather/health/help lessons: 338 activities, 72 introduced exact surfaces/expressions retrieved later, eight bounded grammar concepts reviewed later, zero declared positive-answer gaps/repeated-new labels. Two original passages each have four reading facts; four-sentence appointment writing is supported communication practice. Original records/core mappings, cumulative checkpoint targets and 80% threshold are retained. [Acceptance report](A12-SECTION4-ACCEPTANCE.md) / [فارسی](A12-SECTION4-ACCEPTANCE.fa.md). This completes forty canonical A1.2 overviews/four scoped gates, 1,267 activities. Section 1 follows in issue #170. Wider P2/P5/R3 and final integration/acceptance remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Ninth whole-section package: [issue #170](https://github.com/amirmojiry/finnish-learning/issues/170) completes all ten A1.3 Section 1 message/invitation/social lessons: 300 activities, 60 introduced exact surfaces/expressions retrieved later, seven bounded grammar concepts reviewed later, and zero declared positive-answer gaps/repeated-new labels. A1.3's registry carries master prerequisites; present-person/necessity/case/partitive applications are bounded, and suggestions stay formulaic. Two original readings assess two facts each with supported four-sentence message writing. Original records/core mappings, fifteen checkpoint targets and 80% threshold are preserved. [Acceptance report](A13-SECTION1-ACCEPTANCE.md) / [فارسی](A13-SECTION1-ACCEPTANCE.fa.md). Next: all ten A1.3 Section 2 lessons. Wider P2/P5/R3 and final integration remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Tenth whole-section package: [issue #172](https://github.com/amirmojiry/finnish-learning/issues/172) completes all ten A1.3 Section 2 home/neighbourhood lessons: 305 activities, all 59 introduced exact surfaces/expressions retrieved later, nine bounded grammar concepts reviewed later, and zero declared positive-answer gaps/repeated-new labels. Opening-hours reading and supported repair writing preserve original records/core mappings, fifteen checkpoint targets and the 80% threshold. Address ellipsis remains recognition-only. [Acceptance report](A13-SECTION2-ACCEPTANCE.md) / [فارسی](A13-SECTION2-ACCEPTANCE.fa.md). Next: all ten A1.3 Section 3 lessons. Wider P2/P5/R3 and final integration remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Eleventh whole-section package: [issue #174](https://github.com/amirmojiry/finnish-learning/issues/174) completes all ten A1.3 Section 3 study/work lessons: 303 activities, all 56 introduced exact surfaces/expressions retrieved later, twelve bounded grammar concepts reviewed later, and zero declared positive-answer gaps/repeated-new labels. Explicit verb-class and tt/t examples stay bounded; past olin is recognition. Three-step instructions, four reading facts and supported message writing preserve all original records/core mappings, fifteen checkpoint targets and 80% threshold. [Acceptance report](A13-SECTION3-ACCEPTANCE.md) / [فارسی](A13-SECTION3-ACCEPTANCE.fa.md). Next: all ten A1.3 Section 4 lessons. Wider P2/P5/R3 and final integration remain open under #101; playable A2.1 Section 3 still awaits those foundations.

Twelfth whole-section package: [issue #176](https://github.com/amirmojiry/finnish-learning/issues/176) completes all ten A1.3 Section 4 recent-event/plan lessons: 307 activities, all 54 introduced exact surfaces/expressions retrieved later, eight bounded grammar concepts reviewed later, and no declared positive-answer gaps/repeated-new labels. Ten past forms have explicit recognition/later checkpoint recognition; comparative phrases stay formulaic. Event ordering, four reading facts and two supported four-sentence writing tasks preserve every original item/core mapping, fifteen cumulative checkpoint targets and the 80% threshold. [Acceptance report](A13-SECTION4-ACCEPTANCE.md) / [فارسی](A13-SECTION4-ACCEPTANCE.fa.md). All 120 A1 overviews/twelve scoped gates are complete: 3,512 activities (A1.3: 1,215), without proficiency certification. Next: revisit existing A2.1 Sections 1 and 2 in separate packages. Wider P2/P5/R3 and final integration remain open under #101; playable A2.1 Section 3 still awaits those foundations.
