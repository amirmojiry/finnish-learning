# P2 shared lexical identity contract — v1.75.0

[Issue #237](https://github.com/amirmojiry/finnish-learning/issues/237) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [فارسی](P2-SHARED-IDENTITY-CONTRACT.fa.md)

## Delivered schema and provenance

The source of truth remains `data/course/lexical-identity-sidecar.json`, generated from authored course sections and the original Parole/dictionary sources. Every exact form and expression has a deterministic `form_id` or `expression_id`; all records now also store canonical **curriculum section topic IDs** and the IDs of lessons that **explicitly declare review**. The historical `review_lessons` means later authored references and is **not** graded learner evidence. The two fields are intentionally separate.

`data/course/p2-cross-app-identity.json` is a read-only generated lookup from that sidecar, the existing 15 reviewed contextual items, the curated dictionary and the 14 shipped section manifests. All 1,264 identities, 1,178 unique authored section/item references and all 425 dictionary / Word Practice forms are linked. Its `dictionary_word` and `word_practice_key` are exact normalized written forms, not inferred lemmas or shared scores. Source ranks and `data/common-words.json` are unchanged.

## Review boundaries

- **70 global, editorially reviewed** form/lexeme/sense identities retain their exact `lexeme_id`, `sense_id`, and reviewed morphology. A different case form keeps its own form ID and assessed evidence.
- **1,194 unresolved** exact forms/expressions retain **null semantic IDs**; these are not automatically resolved by the compiler or by dictionary lemma spelling.
- **15 explicitly reviewed Course-item contexts** of five ambiguous surface forms are attached **only to their exact section/item**. For example, `aika`, `ajan`, `voi`, `pitää`, and `tuli` stay globally unresolved. These item-level readings do not transfer to the dictionary, another homographic usage, or SRS progress.
- The generated `topic_ids` identify canonical curriculum sections; raw item topic tags are *not* treated as authoritative grammar/semantic concepts. The source for grammar prerequisites remains `data/course/master-curriculum.json`.
- A first authored lesson, a declared review lesson, a graded activity and a learner's demonstrated mastery are different concepts. No inferred CEFR/YKI competence, lesson completion or lexical-family score is stored.

## Browser read-only integration

`p2-shared-identity.js` provides `hydrate()`, `courseItem(sectionId,itemId)`, `dictionaryWord(surface)`, `wordPracticeWord(surface)`, and `expression(surface)`. Each resolver shares exact stable identities; only `courseItem` can expose a separately reviewed context-only sense. Course objective labels mark verified senses, the dictionary attaches exact-form metadata to its detail lemma, and Word Practice history attaches the same exact-form ID. All existing progress keys (`fiCourseProgressV1`, `fiSrsProgressV1`, `fiSrsPreferencesV1`) and due-first scheduling stay unchanged. If the optional lookup cannot load, the pre-existing interface continues working.

## Build, test and release gates

1. `npm run lexical:identity:write` — rebuild the base sidecar.
2. `npm run p2:context:write` — verify item-scoped reviewed contexts.
3. `npm run p2:cross-app:write` — build the cross-app index.
4. `npm run p2:cross-app:check` and `npm test` — verify byte-for-byte deterministic generation, full coverage, no fabricated senses, contextual isolation, exact-form SRS continuity and previous A1/A2 behavior.
5. `npm run sync` — synchronize version, asset URLs and bilingual status pages.

This completes the **stable identity plumbing**, not a claim that all 1,194 remaining senses have been linguistically reviewed. That optional, expert-reviewed editorial queue remains separate from code acceptance.
