# P2 unresolved lexical/sense review queue

[Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Child #225](https://github.com/amirmojiry/finnish-learning/issues/225) · [Editorial decisions](P2-REVIEWED-NOUNS-AND-SHARED-FORM-IDS.md)

**Unreviewed is not unlearned.** These are authoring identity records; no user results are read, inferred or stored.

- All globally indexed forms/expressions: **1264**
- Explicit reviewed global noun/pronoun identities: **70**
- Still globally unresolved: **1194** (**754** exact forms, **440** expressions)
- Existing item-scoped contextual sense reviews: **15**; the five affected ambiguous written surfaces remain globally unresolved.

## Prioritized next review witnesses

| Surface/phrase | Type | Review category | Authored lessons | Provenance |
| --- | --- | --- | ---: | --- |
| `voi` | form | known_context_sensitive | 8 | ranked |
| `pitää` | form | known_context_sensitive | 8 | ranked |
| `tuli` | form | known_context_sensitive | 3 | ranked |
| `aika` | form | known_context_sensitive | 3 | ranked |
| `ajan` | form | known_context_sensitive | 2 | ranked |
| `sitten` | form | course_form | 9 | ranked |
| `missä` | form | course_form | 9 | ranked |
| `on` | form | course_form | 8 | ranked |
| `paljon` | form | course_form | 8 | ranked |
| `oli` | form | course_form | 7 | ranked |
| `mitä` | form | course_form | 7 | ranked |
| `minun nimeni on` | form | course_form | 7 | curated_unranked |
| `myös` | form | course_form | 6 | ranked |
| `nyt` | form | course_form | 6 | ranked |
| `kanssa` | form | course_form | 6 | ranked |
| `jälkeen` | form | course_form | 6 | ranked |
| `yksi` | form | course_form | 6 | ranked |
| `hyvä` | form | course_form | 6 | ranked |
| `heti` | form | course_form | 6 | ranked |
| `siellä` | form | course_form | 6 | ranked |
| `yhdessä` | form | course_form | 6 | ranked |
| `kiitos` | form | course_form | 6 | source_backed_outside_dictionary |
| `myöhässä` | form | course_form | 6 | source_backed_outside_dictionary |
| `ei` | form | course_form | 5 | ranked |
| `tulee` | form | course_form | 5 | ranked |
| `koska` | form | course_form | 5 | ranked |
| `ehkä` | form | course_form | 5 | ranked |
| `täällä` | form | course_form | 5 | ranked |
| `nukun` | form | course_form | 5 | source_backed_outside_dictionary |
| `mutta` | form | course_form | 4 | ranked |
| `viime` | form | course_form | 4 | ranked |
| `ennen` | form | course_form | 4 | ranked |
| `en` | form | course_form | 4 | ranked |
| `ensi` | form | course_form | 4 | ranked |
| `olen` | form | course_form | 4 | ranked |
| `tehdä` | form | course_form | 4 | ranked |
| `vähän` | form | course_form | 4 | ranked |
| `antaa` | form | course_form | 4 | ranked |
| `liian` | form | course_form | 4 | ranked |
| `torstaina` | form | course_form | 4 | ranked |

## How to progress safely

1. Examine the exact authored Finnish and Persian context for a target; compare available UD morphological analyses and real case government. Review expressions as expressions, not as the sum of word lemmas.
2. Record an explicit lexeme, sense and exact morphological reading when evidence is sufficient. If several senses apply, retain separate **section+item** identities rather than a fabricated global sense.
3. Add editorial fixtures, validate source rank provenance and regenerate the sidecar; do not infer or propagate SRS mastery to related forms.
4. Keep existing local Word Practice records keyed by their exact written word; only prioritize independently reviewed/eligible matching exact forms. No transfer across different inflections.

Regenerate and verify with `node scripts/build-p2-review-queue.cjs --write` and `--check`. All rows are already present with stable form/expression IDs in the original sidecar; this queue **does not count as linguistic review**.
