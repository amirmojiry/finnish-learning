# P2 editorial lexical identity — batch 1

[Live deterministic report](P2-IDENTITY-BATCH1-REPORT.md) · [Persian explanation](P2-LEXICAL-IDENTITIES-BATCH1.fa.md) · [Issue #182](https://github.com/amirmojiry/finnish-learning/issues/182) · [Parent #101](https://github.com/amirmojiry/finnish-learning/issues/101)

## Editorial decision

This first batch verifies **40 specifically observed forms** (17 pronoun forms and 23 nominal forms). The seven previously reviewed forms are left unchanged, bringing the total to **47 reviewed exact forms out of 1,264 distinct surface/expression records**. The 40 new mappings comprise 38 forms already referenced by authored lessons and two forms in the curated dictionary that have not yet been introduced in a Course lesson (`hänen`, `heidän`). These two do **not** count as taught or learned.

The sidecar's reviewed `lexeme_id` and `sense_id` are editorial groupings within the **specific reviewed interpretation** and `form_id` remains strictly surface-specific. All 425 dictionary entries and their Parole counts/ranks/percentages are unchanged. Lesson target IDs, grade history, progress, Word Practice SRS state and `course-review-form-map.json` remain untouched. No new surface forms or paradigms are generated.

## Exactly which grammatical claims were reviewed?

| Reviewed cluster | Forms and assigned case |
| --- | --- |
| First person singular | Existing `minä` nominative and `minun` genitive; **new `minulle` allative** |
| Third person singular | `hän` nominative; `hänen` genitive |
| First person plural | `me` nominative; `meidän` genitive |
| Second person plural/polite | `te` nominative plural **as a grammatical form**; formal singular address is a pragmatic use |
| Third person plural | `he` nominative; `heidän` genitive |
| Proximal demonstrative | `tämä` nominative; `tässä` inessive, `tästä` elative, `tähän` illative |
| Referential demonstrative | `se` nominative; `siinä` inessive, `siitä` elative, `siihen` illative |
| Interrogative | `mikä` nominative |
| Time noun, in an explicit nominal context | `ajan` genitive **surface**, `aikaa` partitive, `aikana` essive |
| Home | `koti` nominative, `kotiin` illative goal |
| City | `kaupunki` nominative, `kaupungin` genitive |
| Clear nominative common nouns | `apteekki`, `viesti`, `kauppa`, `koulu`, `asema`, `bussi`, `lippu`, `numero`, `nimi`, `puhelin`, `osoite`, `keittiö`, `olohuone`, `makuuhuone`, `kuitti`, `kortti` |

The remaining 40-record source of truth, including exact case/number on **each** form, is `data/course/reviewed-lexical-identities.json`. The generated report enumerates every verified form/sense family. The simple noun senses above were checked against actual authored Finnish example contexts and Persian item glosses in the 14 shipped course sections, **not** assigned to every possible dictionary meaning. In particular, `lippu` is the travel *ticket* sense, `asema` the *station* sense, and `kauppa` the *shop* sense. `ajan` is morphologically a genitive-shaped form; its lesson uses it as a total-object expression in `varata ajan` rather than asserting the entire noun phrase has a genitive syntactic function.

## Deferred rather than guessed

- **`aika`** is unresolved as an isolated surface because current dictionary entries mix noun *time* and adverbial *fairly*. The three individually verified nominal forms remain linked only to the noun reading.
- **`kotona`** is a lexicalized old locative (*at home*), not treated as an automatically productive essive from modern `koti`. Unlike `kotiin`, it is deferred for a dedicated lexicalized-form review.
- **`voi`** (can/butter), **`pitää`** (different government and meanings), **`tuli`** (came/fire) and other homographs remain unresolved pending sense-by-context review.
- The `se` group is limited to its attested demonstrative interpretation, not automatic identity for all colloquial personal uses.
- The reviewed case labels are not evidence of productive inflection, speaking ability, Course completion or mastered SRS words. All 440 multiword expressions remain independent unresolved identity records in this batch.

## English-language linguistic references

- [Aalto University: Finnish personal pronouns, genitives and case forms](https://openlearning.aalto.fi/mod/book/tool/print/index.php?id=7549).
- [Handbook of Finnish: personal pronoun nominative/genitive/allative forms](https://jkorpela.fi/finnish/Personal_pronouns.html).
- [Handbook of Finnish: demonstrative pronoun case patterns](https://jkorpela.fi/finnish/Demonstrative_pronouns_t%C3%A4m%C3%A4%2C_1.html).
- [Uusi kielemme: `aika` and the `ajan / aikaa / aikana` case forms](https://uusikielemme.fi/finnish-vocabulary/interesting-words/aikaa-ajaksi-aikana-ajassa-using-aika-in-sentences).
- [Handbook of Finnish: historical locative `kotona`](https://jkorpela.fi/finnish/Essive.html).

## Next editorial batches

Prioritize the remaining 1,217 unresolved records in new, human-reviewable slices. Ambiguous surface forms need occurrence-specific sense decisions or a richer sidecar representation; **do not** fill a single global sense from fallback translations or use the grouped identity to transfer Word Practice mastery.

Regenerate `data/course/lexical-identity-sidecar.json` with `npm run lexical:identity:write`, then `npm run p2:identity:write` for the machine-readable inventory and generated Markdown. Run `npm test` and the main GitHub CI/UD workflows before merge.
