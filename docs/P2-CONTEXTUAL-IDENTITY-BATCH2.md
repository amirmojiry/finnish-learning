# P2 contextual sense identities — batch 2

[Live report](P2-CONTEXTUAL-IDENTITY-BATCH2-REPORT.md) · [فارسی](P2-CONTEXTUAL-IDENTITY-BATCH2.fa.md) · [Issue #184](https://github.com/amirmojiry/finnish-learning/issues/184) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101)

## Design and scope

The first P2 batch [#182 / PR #183](https://github.com/amirmojiry/finnish-learning/pull/183) explicitly reviewed 47 exact written surface forms out of 1,264 records. This second, independent batch resolves five **homographic surfaces** only in **15 authored section/item pairs** that are linked to **24 lesson occurrences**. An occurrence is a lesson reference (possibly a distractor), not evidence that the student understood the meaning.

The raw editorial decisions live in `data/course/reviewed-contextual-identities.json`. `scripts/build-contextual-lexical-identities.cjs` validates them against every shipped section and the **unchanged** surface-sidecar, producing `data/course/contextual-lexical-identity-map.json` and the readable coverage report.

- **Item-level key:** `section_id + item_id`, exposed as `context_id = course-item:<section_id>/<item_id>`; exact authored `context_fi` is a mandatory review witness.
- **Stable surface key:** original `form_id` reused from the existing sidecar. Different senses of the same written form retain the same `form_id` but receive different item-scoped `sense_id` values.
- **Occurrences:** every existing authored lesson reference is linked to its reviewed item identity. No new word forms, lessons, per-lesson scores or new user data are created.
- **Fail closed:** unknown or duplicate item keys, stale/wrong Finnish contexts, unmatched forms, invented senses, inconsistent lexemes, unauthorized lemma overrides, invalid noun/verb morphology, and incomplete reviewed coverage are rejected.
- **No global inference:** all five globally unresolved surface entries remain unresolved; Course/Word Practice SRS is **not** merged or made lexeme-wide.

## Linguistically bounded decisions

| Written form | Reviewed course sense | Morphological interpretation |
| --- | --- | --- |
| `aika` | General time in `Aika on nyt.` versus scheduled healthcare appointment in `Minulla on aika lääkärille.` | Singular nominative noun in both items, different senses |
| `ajan` | Scheduled appointment as the total object of `varata ajan` | Singular genitive/accusative **surface** of noun `aika`; never globally relabelled because it also spells first-person present `ajaa` |
| `voi` | Ability/possibility in `Hän voi auttaa` and `Anteeksi, en voi`; wellbeing in `En voi hyvin` | Positive finite indicative 3SG or present connegative after `en`; noun `voi` (butter) unreviewed |
| `pitää` | Necessity in `Minun pitää ...` | Impersonal-necessity use with genitive experiencer and present 3SG verb; no liking or holding sense implied |
| `tuli` | Bus came/arrived | `tulla` past indicative 3SG; noun `tuli` (fire) unreviewed |

**Existing source editorial caveats:** The A1.3 Section 4 word item `a13s4-h-003` has source lemma `tuli` even though `Bussi tuli myöhässä.` is a verb example. The new contextual mapping explicitly selects `tulla` and records this source inconsistency instead of silently rewriting legacy items. Four items using `En voi hyvin.` retain an older generic Persian word gloss referring to ability; the bounded review records the correct wellbeing usage and the caveat, without rewriting learner content in this PR.

## Verification and references

- [Wiktionary (English), ajan](https://en.wiktionary.org/wiki/ajan) — noun genitive/accusative and verb `ajaa` first-person homography.
- [Uusi kielemme, necessity sentences](https://uusikielemme.fi/finnish-grammar/syntax/sentence-types/necessity-sentences-taytyy-pitaa-on-pakko) — genitive subject and `pitää` necessity.
- [FinnishWords, voida conjugation](https://www.finnishwords.com/verbs/14/voida.html) — affirmative `voi` and negative `en voi`.
- [ConLexis, University of Helsinki](https://conlexis-23.it.helsinki.fi/voida-verbi/) — `voida` as ability, possibility and wellbeing (Finnish-language specialist source).
- [DailyFinnish, tulla past tense](https://dailyfinnish.fi/learn-finnish/verbs/tulla/) — `tuli` as the past third-person form.

Run `npm run p2:context:write` to regenerate the JSON + report, `npm run p2:context:check` to confirm both are current, and `npm test` for mutation/compatibility regressions. **This is a read-only educational identity layer, not runtime semantic grading, SRS mastery or independent CEFR/YKI evidence.** P2, P5, R3 and the A2.1 Section 3 prerequisites remain open.
