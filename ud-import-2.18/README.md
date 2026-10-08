# Finnish Universal Dependencies 2.18 source files

**Current repository data — not a temporary upload folder.**

این پوشه فایل‌های اصلی CoNLL-U نسخهٔ 2.18 چهار درخت‌بانک فنلاندی را نگه می‌دارد. این فایل‌ها برای بازتولید خروجی‌های تحلیلی پروژه به کار می‌روند و اکنون در مخزن حضور دارند؛ بر خلاف توضیح قدیمی، قرار نیست بدون جایگزین قابل‌بازتولید حذف شوند.

The eight tracked `.conllu` files are the 2.18 inputs used by the current deterministic pipeline:

- Finnish-TDT: train, dev and test
- Finnish-FTB: train, dev and test
- Finnish-OOD: test
- Finnish-PUD: test

## What to read and run | راهنمای عملی

- [Importer usage and data ownership](../tools/ud-import/README.md) — current extraction order, generated outputs, translation coverage and review rules.
- [Automated validation workflow](../.github/workflows/extract-ud-data.yml) — path-scoped checks plus manual dispatch, without automatic source commits.
- [Generated UD metadata](../data/ud/metadata.json) — authoritative treebank release, licensing, SHA-256 checksums and sentence/token counts.
- [Current coverage report](../data/ud/coverage-report.json) — actual results for the app's current vocabulary.
- [Historical July 2026 proposal](../docs/archive/ud-integration-plan-2026-07.md) — design history only, **not** current steps.

## Input and attribution policy

Treebanks have **different licenses** (including CC BY 4.0 and CC BY-SA 4.0). Preserve each original source's attribution and license information in generated metadata and example provenance; don't assume one blanket license for every input.

For a future upstream release: update the reviewed source inputs, check their release/license compatibility, run the documented importer on an issue branch, compare output changes, synchronize Persian corpus-example translations, and run the full project test suite before merging. Do not hand-edit generated `data/ud/*.json` to compensate for a source change.
