# Documentation hub | راهنمای مستندات

این صفحه نقطهٔ شروع مستندات **Finnish Learning** است. برای اینکه مطالب تکراری یا متناقض نشوند، هر موضوع یک مرجع اصلی دارد. فایل‌های فارسی و انگلیسیِ یک سند، دو نسخهٔ زبانی از همان موضوعند؛ نه دو مرجع مستقل.

This is the documentation entry point for **Finnish Learning**. Each subject has one canonical source of truth; bilingual files serve different readers, not competing specifications.

## 1. Start here | شروع

| Need / موضوع | Recommended document / سند | Role / نقش |
| --- | --- | --- |
| Product, setup, commands / معرفی و راه‌اندازی | [فارسی](../README.fa.md) · [English](../README.md) | Short project entry points |
| What is built vs next / وضعیت و گام بعد | [نقشهٔ راه فارسی](ROADMAP.fa.md) · [English roadmap](ROADMAP.md) | **Canonical delivery roadmap**; replaces duplicated phase lists |
| How language learning is designed / منطق آموزشی | [فارسی](LEARNING-DESIGN.fa.md) · [English](LEARNING-DESIGN.md) | Pedagogical rationale, architecture and research; **not** the current status checklist |
| Change history / تاریخچه | [Changelog](../CHANGELOG.md) | Release notes, not a future roadmap |

## 2. Curriculum | برنامهٔ درسی

| Purpose / موضوع | Document / سند | Authority / مرجع |
| --- | --- | --- |
| All levels A1.1–C2 / برنامهٔ جامع | [فارسی](MASTER-CURRICULUM.fa.md) · [English](MASTER-CURRICULUM.md) | Readable versions of the **canonical** [master curriculum JSON](../data/course/master-curriculum.json) |
| Grammar dependencies / ترتیب قواعد | [Grammar roadmap](GRAMMAR-ROADMAP.md) | Focused explanation of the master JSON's concepts/prerequisites |
| Topic and frequency vocabulary / تقسیم واژگان | [Vocabulary roadmap](VOCABULARY-ROADMAP.md) | Selection policy; does not replace actual Parole data |
| A1.1 lesson-by-lesson matrix / ماتریس درس‌ها | [فارسی](A1.1-CURRICULUM.fa.md) · [English](A1.1-CURRICULUM.md) | Detailed readable plan of [A1.1 curriculum JSON](../data/course/a1.1-curriculum.json) |
| Later A1 curriculum contracts | [A1.2 JSON](../data/course/a1.2-curriculum.json) · [A1.3 JSON](../data/course/a1.3-curriculum.json) | A1.2 and A1.3 each have four playable sections and 40 lessons; both follow their reviewed curriculum contracts |
| A2.1 partially authored contract | [A2.1 curriculum](../data/course/a2.1-curriculum.json) | Sections 1–2 have twenty playable lessons (travel/past and health/public services); Sections 3–4 remain outline-only |
| Existing content coverage / پوشش اجرایی | [ممیزی محتوایی فارسی](CURRICULUM-AUDIT.fa.md) | A dated snapshot; regenerate live inventory with `npm run curriculum:audit` |
| A1.2 corpus-vocabulary gap | [Vocabulary gap report](../data/course/a1.2-vocabulary-gap.json) | Source-backed selection analysis, not a learner score |

**Canonical rule / قانون مرجع:** The JSON under `data/course/` owns curriculum structure; readable Markdown explains it. Neither a proposed module nor a reviewed planning matrix creates a playable lesson. The content inventory command reads existing section files. **فهرست بسامد Parole و واژگان موضوعیِ تألیفی را با هم یکی نگیرید.**

## 3. Engineering and contributor guides | مستندات فنی

| Topic / موضوع | Canonical documentation / راهنمای اصلی |
| --- | --- |
| Contribution workflow, source ownership, testing | [AGENTS.md](../AGENTS.md) · [Copilot summary](../.github/copilot-instructions.md) |
| Version and deployment | [Versioning](VERSIONING.md) · [CI workflow](../.github/workflows/ci.yml) |
| Word Practice spaced repetition (separate from Course weakness review) | [Spaced repetition](SPACED_REPETITION.md) |
| Source vocabulary and curated entry bundles | [Vocabulary details](../data/vocabulary-details/README.md) |
| Current Finnish UD 2.18 extraction and UI integration | [UD import tools](../tools/ud-import/README.md) · [source treebanks](../ud-import-2.18/README.md) |
| Current UD metadata and provenance | [UD metadata](../data/ud/metadata.json) · [coverage](../data/ud/coverage-report.json) |

## 4. Archive | بایگانی

- [Initial UD integration proposal (July 2026)](archive/ud-integration-plan-2026-07.md) — **historical only**; it predates the implemented importer, generated files, and current workflow. Do not follow its former "future implementation" steps for a current release.
- Code and earlier document revisions remain available through Git history; obsolete instructions should be revised or archived, not silently reused.

## 5. Maintenance rules | اصول نگهداری

1. New content plans start in [master curriculum JSON](../data/course/master-curriculum.json) and the appropriate reviewed level curriculum, then receive updated readable summaries in the same PR.
2. Delivery priorities and checklists belong in [the roadmap](ROADMAP.md) / [نسخه فارسی](ROADMAP.fa.md). **Do not** duplicate an independent phase checklist in the two root READMEs or Learning Design files.
3. Current UD implementation steps belong in [tools/ud-import/README.md](../tools/ud-import/README.md), not in the archived design proposal.
4. Keep English/Persian document pairs factually aligned. Record changes in [CHANGELOG.md](../CHANGELOG.md).
5. Run `npm test` (including Markdown link checks), `npm run curriculum:check`, and `npm run curriculum:audit` before claiming content milestones are complete. Corpus counts and level-status claims must be grounded in current source data.
