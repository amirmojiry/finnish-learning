# P4 candidate selection: prerequisite-aware editorial gate

Scope: [#235](https://github.com/amirmojiry/finnish-learning/issues/235), parent [#101](https://github.com/amirmojiry/finnish-learning/issues/101). This is an editorial decision protocol for **future** Parole batches, not an import and not a declaration that P4 is complete.

## Source of truth and accounting units

- The [P4 review queue](P4-PAROLE-REVIEW-QUEUE.md) proposes source-attested **written forms**; it is not a syllabus or a frequency-ranked lexeme list.
- `data/course/master-curriculum.json` is the **sole authoritative source** for the ordered grammar concepts and prerequisite graph. The [grammar roadmap](GRAMMAR-ROADMAP.md) explains that canonical JSON for readers; if the prose and JSON disagree, use the JSON and correct the roadmap before approving a candidate. A corpus form cannot silently introduce an unintroduced productive grammar concept.
- [Vocabulary roadmap](VOCABULARY-ROADMAP.md) supplies advisory stage bands and topics. An original source position is not a guaranteed CEFR placement or proficiency claim.
- [P2 identity report](P2-UNRESOLVED-REVIEW-QUEUE.md) records reviewed versus unresolved senses. Never infer a stable sense from a surface spelling alone, particularly for homographs.

## Mandatory decision order

For every prospective candidate keep an auditable record with: exact NFC Finnish surface; original Parole position / provenance; stage and target section; source-attested Finnish example with reviewed Persian translation; target communicative need; linked concept IDs and unmet prerequisites; explicit item kind (form, inflected form or expression); proposed lemma/sense and review status; editorial decision; decision reason; and reviewer.

1. **Eligibility:** reject nonexistent or invented source ranks, duplicates of shipped exact forms and unverified example/translation pairs. Record `defer:source` rather than fabricate evidence.
2. **Grammar compatibility:** resolve each needed concept ID against the canonical prerequisite graph. A form may be taught as an explicitly bounded memorized formula at an earlier stage, but must not imply productive mastery of a later paradigm. Label `defer:prerequisite` where full intended use needs an unintroduced prerequisite.
3. **Semantic safety:** distinguish reviewed sense/context from unresolved or homographic surface. An ambiguous spelling without a verified intended context receives `defer:sense`; a source-backed context can receive scoped review without conferring a global P2 identity.
4. **Learner utility:** among eligible candidates, prefer documented needs in the next playable/approved section, reviewed forms required by communication and grammar examples, then authentic recurring contexts. Topic fit beats rank when learning requirements are otherwise comparable.
5. **Corpus tie-break:** among candidates with equal prerequisites, semantic quality and topic value, prefer earlier original Parole source position; never equate position, `frequency_rank`, inflection, lemma and learner mastery.
6. **Release approval:** record a separate human editorial sign-off for lemma/sense, morphosyntax, Persian gloss, source examples, duplicate detection and explicit coverage in a genuine lesson. Run generators, `npm run sync`, `npm test`, CI and Finnish UD checks before any dictionary count or version bump. Keep all deferred candidates in the review queue.

## Examples of deliberately different outcomes

| Candidate | Editorial action | Why |
| --- | --- | --- |
| `minulle` | Reuse a reviewed existing form rather than publish a duplicate | Source-backed allative is already shipped; its case does not certify productive use of allative generally |
| `ajan` | Defer global identity; assess each authored context | Time noun and finite verb can share the surface; `varata ajan` does not resolve the spelling everywhere |
| `pitää` | Defer global sense until contextual/rection review | Multiple constructions and interpretations must not be collapsed |
| A candidate needing a later-stage productive concept | Defer, or explicitly approve a formulaic chunk | The stage prerequisite graph is authoritative, not raw frequency |

## Acceptance evidence to attach to each future batch PR

Include counts of inspected / accepted / deferred / excluded / duplicates, every deferral reason, exact-form source witnesses, checked grammatical dependencies, reviewer decisions, before-and-after vocabulary totals, unchanged P2/SRS semantics, and test/CI receipts. No claim of learner retention or CEFR/YKI attainment comes from this review.

P4 status after this contract: **prioritization procedure documented; new semantic decisions and future needs-driven batches remain open**.
