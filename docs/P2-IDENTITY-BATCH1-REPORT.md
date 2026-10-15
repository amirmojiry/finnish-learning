# P2 reviewed lexical identities — editorial batch 1

[Review methodology](P2-LEXICAL-IDENTITIES-BATCH1.md) · [فارسی](P2-LEXICAL-IDENTITIES-BATCH1.fa.md) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101) · [Batch #182](https://github.com/amirmojiry/finnish-learning/issues/182)

This is a **deterministic inventory of editorially identified forms**, not evidence of learner mastery, completed spaced repetition, CEFR/YKI achievement, or automatically verified inflection paradigms.

## Coverage

| Measure | Count |
| --- | ---: |
| Total form/expression records | 1264 |
| Reviewed exact forms (including original seven) | 47 |
| Reviewed additions in batch 1 | 40 |
| Added noun forms | 23 |
| Added pronoun forms | 17 |
| New forms occurring in shipped lessons | 38 |
| New dictionary-only forms | 2 |
| Unresolved exact form records | 777 |
| Unresolved expression records | 440 |
| Distinct reviewed lexemes | 32 |
| Distinct reviewed senses | 32 |

## Reviewed lexeme/sense groups

Each listed case label is a **single reviewed form**. It does not generate other forms or merge form-specific SRS evidence.

| Lexeme | Context-bounded sense | Exact reviewed forms |
| --- | --- | --- |
| lexeme:aika | sense:aika-time | `aikaa` (partitive singular), `aikana` (essive singular) |
| lexeme:apteekki | sense:apteekki-pharmacy | `apteekki` (nominative singular) |
| lexeme:asema | sense:asema-station | `asema` (nominative singular) |
| lexeme:bussi | sense:bussi-bus | `bussi` (nominative singular) |
| lexeme:han | sense:han-third-person-singular | `hän` (nominative singular), `hänen` (genitive singular) |
| lexeme:he | sense:he-third-person-plural | `he` (nominative plural), `heidän` (genitive plural) |
| lexeme:kauppa | sense:kauppa-shop | `kauppa` (nominative singular) |
| lexeme:kaupunki | sense:kaupunki-city | `kaupungin` (genitive singular), `kaupunki` (nominative singular) |
| lexeme:keittio | sense:keittio-kitchen | `keittiö` (nominative singular) |
| lexeme:kirja | sense:kirja-book | `kirja` (nominative singular) |
| lexeme:kissa | sense:kissa-animal | `kissa` (nominative singular) |
| lexeme:koira | sense:koira-animal | `koira` (nominative singular) |
| lexeme:kortti | sense:kortti-card | `kortti` (nominative singular) |
| lexeme:koti | sense:koti-home | `koti` (nominative singular), `kotiin` (illative singular) |
| lexeme:koulu | sense:koulu-school | `koulu` (nominative singular) |
| lexeme:kuitti | sense:kuitti-receipt | `kuitti` (nominative singular) |
| lexeme:lippu | sense:lippu-ticket | `lippu` (nominative singular) |
| lexeme:makuuhuone | sense:makuuhuone-bedroom | `makuuhuone` (nominative singular) |
| lexeme:me | sense:me-first-person-plural | `me` (nominative plural), `meidän` (genitive plural) |
| lexeme:mika | sense:mika-interrogative-what-which | `mikä` (nominative singular) |
| lexeme:mina | sense:mina-first-person | `minulle` (allative singular), `minun` (genitive singular), `minä` (nominative singular) |
| lexeme:nimi | sense:nimi-name | `nimi` (nominative singular) |
| lexeme:numero | sense:numero-number | `numero` (nominative singular) |
| lexeme:olohuone | sense:olohuone-living-room | `olohuone` (nominative singular) |
| lexeme:osoite | sense:osoite-address | `osoite` (nominative singular) |
| lexeme:puhelin | sense:puhelin-phone | `puhelin` (nominative singular) |
| lexeme:se | sense:se-referential-demonstrative | `se` (nominative singular), `siihen` (illative singular), `siinä` (inessive singular), `siitä` (elative singular) |
| lexeme:sina | sense:sina-second-person | `sinun` (genitive singular), `sinä` (nominative singular) |
| lexeme:tama | sense:tama-proximal-demonstrative | `tähän` (illative singular), `tämä` (nominative singular), `tässä` (inessive singular), `tästä` (elative singular) |
| lexeme:te | sense:te-second-person-plural-or-polite | `te` (nominative plural) |
| lexeme:vesi | sense:vesi-water | `vesi` (nominative singular) |
| lexeme:viesti | sense:viesti-message | `viesti` (nominative singular) |

## Explicitly deferred

No automatic sense assignment for `aika` (noun/adverb), `ajan` (time / I drive), `voi` (verb/noun), `pitää` (multiple verb senses), `tuli` (past tense verb/fire), or frozen locative `kotona`. Only the separately attested nominal `aikaa / aikana`, water noun `vesi` and goal `kotiin` are reviewed.

## Reproducibility

- `npm run lexical:identity:check`: source-to-sidecar deterministic overlay.
- `npm run p2:identity:check`: this editorial batch inventory is current.
- `npm run p2:identity:write`: regenerate this report and its machine-readable JSON.
- `npm test`: cross-form, provenance, unknown/ambiguous and SRS-isolation regression gates.
