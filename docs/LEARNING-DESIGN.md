# Learning design and curriculum plan

[نسخه فارسی](LEARNING-DESIGN.fa.md)

> **Canonical A1.1–C2 roadmap:** [Master curriculum](MASTER-CURRICULUM.md) · [Persian version](MASTER-CURRICULUM.fa.md) · [Grammar](GRAMMAR-ROADMAP.md) · [Vocabulary](VOCABULARY-ROADMAP.md) · [Implementation audit](CURRICULUM-AUDIT.fa.md). These files specify the project content plan and distinguish planned stages from shipped lessons.

This document records the research-backed learning model and the proposed curriculum architecture for Finnish Learning. It is a product and data-design specification, not a claim that the current application already implements every item below.

## 1. Product direction

Finnish Learning should evolve from a high-frequency vocabulary trainer into a structured Finnish course with a Duolingo-like progression, while retaining transparent linguistic data, reviewed content, and evidence-based review.

The course should:

- progress through CEFR-aligned stages, beginning with A1.1 and A1.2 and continuing toward later levels;
- divide each stage into sections, each section into 10 lessons, and each lesson into approximately 15 questions or activities;
- introduce high-frequency vocabulary in broadly descending frequency order;
- supplement frequency vocabulary with curated topic vocabulary and useful multiword expressions;
- revisit vocabulary through multiple task types and spaced retrieval;
- integrate grammar mainly through meaningful examples and controlled use before introducing explicit explanations where needed;
- gradually add listening, speaking, reading, and writing activities;
- keep frequency, curriculum order, CEFR level, topic, and morphology as separate data dimensions.

CEFR levels should be treated as communicative outcome targets, not as fixed word-count bands. The Council of Europe describes CEFR through action-oriented communicative activities and descriptors rather than prescribed vocabulary lists. Finnish educational materials commonly subdivide A1 into A1.1, A1.2, and A1.3, but these subdivisions are implementation conventions and must be mapped to reviewed can-do outcomes rather than inferred from lesson counts alone.

## 2. Why vocabulary remains central but is not the whole course

Vocabulary knowledge strongly supports reading, listening, speaking, and writing, but vocabulary recognition alone does not produce communicative ability.

The course must therefore balance four strands:

1. meaning-focused input: understandable reading and listening;
2. meaning-focused output: speaking and writing to communicate;
3. language-focused learning: vocabulary, morphology, grammar, pronunciation, and spelling;
4. fluency development: faster use of already known language.

High lexical coverage is particularly important for comprehension. Research often places relatively comfortable independent reading near 98% known-word coverage, but coverage is not equivalent to comprehension: grammar, discourse, background knowledge, and processing speed also matter.

## 3. Curriculum hierarchy

The proposed hierarchy is:

```text
Course
└── CEFR stage, for example A1.1
    └── Section
        └── Lesson, normally 10 per section
            └── Activity, normally about 15 per lesson
```

### CEFR stage

A stage defines reviewed communicative outcomes, for example:

- recognizing and using basic greetings and introductions;
- giving simple personal information;
- understanding short familiar instructions;
- handling basic transactions;
- identifying common people, places, objects, and daily actions.

### Section

A section combines:

- a communicative situation or thematic domain;
- a set of high-frequency vocabulary forms and lexemes;
- a curated topic collection;
- selected expressions and collocations;
- one or more grammar or morphology patterns;
- recycling targets from earlier sections.

Examples include introductions, family, food, animals, time, home, transport, shopping, work, weather, and health.

### Lesson

A lesson should not simply expose 15 new items. Its approximately 15 activities should mix:

- introduction of a small number of new targets;
- recognition and meaning retrieval;
- contextual selection;
- typed production;
- listening or pronunciation where available;
- review of earlier targets;
- transfer to a new sentence or inflected form.

A practical initial target is 3–6 genuinely new lexical targets per lesson, depending on difficulty, with the remaining activities devoted to retrieval, variation, and recycling. This number should remain configurable and should be validated through usage data rather than treated as a universal constant.

## 4. Vocabulary selection: frequency plus usefulness

The curriculum should use two complementary channels.

### Frequency stream

The Parole list supplies real written-corpus surface-form frequency. These forms should generally enter the course in descending frequency order, subject to pedagogical constraints such as ambiguity, grammatical readiness, and duplicate forms belonging to the same lexeme.

Frequency remains source-owned data:

- `frequency_rank`
- `frequency_count`
- `frequency_percent`
- observed surface form

Curriculum order must not overwrite source frequency.

### Curated stream

A lesson may introduce a pedagogically useful word or expression even when it:

- has a low Parole rank;
- does not occur in the current frequency range;
- belongs to spoken or situational language;
- is a multiword expression without a single frequency rank;
- is needed to make a topic coherent.

For example, an animal section may include a relevant low-frequency word, while an introductions section may include expressions such as `Mitä kuuluu?` or `Hauska tutustua`.

Curated inclusion must be explicitly attributed to curriculum design and must never fabricate a Parole frequency value.

## 5. Required separation of data dimensions

A vocabulary item should not be represented by one overloaded rank or category. The future schema should separate at least:

- stable application identifier;
- surface form;
- learner-facing lemma or lexeme identifier;
- part of speech;
- Persian meaning or meanings;
- corpus frequency fields when available;
- `frequency_status`, such as `ranked`, `unranked`, or `not_applicable`;
- CEFR introduction target;
- curriculum section and lesson placement;
- zero or more topic categories;
- expression type, such as word, fixed phrase, collocation, or sentence frame;
- morphological features;
- reviewed examples;
- accepted answer variants;
- content source and review status.

A topic field must support zero, one, or multiple values. A rigid single category will not model items such as a word that belongs to both food and shopping.

Illustrative future metadata:

```json
{
  "lexeme_id": "fi-hirvi-noun",
  "surface_form": "hirvi",
  "lemma": "hirvi",
  "item_type": "word",
  "frequency_status": "ranked",
  "frequency_rank": 5300,
  "curriculum_level": "A1.1",
  "topics": ["animals", "nature"],
  "introduced_in": "a1.1-section-1-lesson-4"
}
```

For an unranked expression:

```json
{
  "lexeme_id": "expr-hauska-tutustua",
  "surface_form": "Hauska tutustua",
  "item_type": "expression",
  "frequency_status": "unranked",
  "frequency_rank": null,
  "curriculum_level": "A1.1",
  "topics": ["introductions", "conversation"],
  "introduced_in": "a1.1-section-2-lesson-2"
}
```

This is a proposed direction. Migrating the current flat vocabulary contract requires a separately designed schema migration and may require a MAJOR release if compatibility cannot be preserved.

## 6. Lemma, lexeme, and surface-form learning

The knowledge model should be lexeme-centered, but questions should use real surface forms.

- A shared lexeme record tracks core meaning and productive access to the base form.
- Surface-form records track recognition and production of important inflections.
- Success with one inflected form contributes evidence to the lexeme but does not automatically mark all forms as learned.
- Derivational relatives such as `kirja`, `kirjasto`, and `kirjailija` remain separate lexemes even when linked as a word family.
- Transparent forms can receive less direct repetition after transfer is demonstrated.
- stem-changing and irregular forms require independent evidence.

The learner may therefore be strong on the meaning of `mies` while still needing review of `miehen` or `miestä`.

## 7. Evidence-based review model

There is no universal number of repetitions that guarantees learning. The important unit is successful retrieval distributed across sessions, not passive exposure count.

A practical target for consolidation is approximately six successful retrievals across at least four separate sessions, including productive retrieval. This reflects successive-relearning research while remaining an engineering policy that should later be calibrated from learner data.

Proposed learning states:

```text
Introduced
- successful initial recognition
- at least one successful active retrieval

Learning
- successful retrieval in multiple sessions
- at least one contextual task

Consolidated
- approximately six successful retrievals
- at least four separate sessions
- at least two productive responses
- one successful retrieval after a gap of at least 14 days

Long-term
- successful retrieval after a gap of roughly 45–90 days
```

The current A1.1 implementation keeps the lightweight section-scoped aggregate used by focused practice and also records a bounded chronological answer history. Each graded course answer receives stable sequence order and a timestamp plus session identity/start time, lesson and source-lesson provenance, target ID when one exists, activity type/mode and retrieval direction, correctness, productive-vs-recognition evidence, whether the task contains built-in guidance, response time, first-attempt status, and exact/fuzzy/diacritic-adjusted typed-grading evidence when available. The browser retains at most the newest 5,000 course-answer events and also caps the serialized history near 1 MB. If the browser still rejects a local-storage write, the app progressively evicts older history and continues the graded interaction instead of surfacing a storage exception. This history supplies evidence for future mastery rules; it does not itself declare a target mastered.

The scheduler should record:

- successful and failed retrievals;
- first-attempt success;
- session count;
- task type and direction;
- use of hints;
- response time;
- longest successfully survived interval;
- lapses and common confusions;
- lexeme-level and surface-form-level evidence.

A scheduled 21-day interval is not proof of 21-day retention. Mastery evidence is earned only after a successful response following that interval.

On failure, the application should provide immediate corrective feedback, schedule a short relearning step, preserve historical evidence, and reduce the next interval rather than erasing the learner's entire history.

## 8. Exercise design

The current three modes all have a useful role, but they provide different strengths of evidence.

### Translation multiple choice

Best for:

- first exposure;
- low-pressure recognition;
- linking a Finnish form to a Persian meaning.

It provides weak mastery evidence because the answer can be recognized or guessed.

### Multiple-choice cloze

Best for:

- meaning in context;
- recognizing morphology and syntactic fit;
- distinguishing related forms.

Morphology-focused distractors are now supported through reviewed lesson manifests. They are explicit alternative Finnish forms for the same grammatical decision, not runtime-generated suffix combinations or unrelated vocabulary.

### Typed cloze

Best for:

- active retrieval;
- spelling;
- producing the required surface form in context.

It provides the strongest evidence among the current modes. Hint-assisted and unassisted answers must not receive equal learning credit.

### Activity-family status

A1.1 now directly supports Persian-to-Finnish production, listening recognition, dictation, sentence ordering, expression completion, controlled sentence production, short reading comprehension, and several reviewed lesson-specific activity families.

Structured sentence practice is declared in each lesson through a reviewed `structured_practice` manifest. Each entry names an existing lesson target and stores its learner-facing prompt and answer contract explicitly:

- `sentence-order` stores the Finnish tokens, their explicit answer order, and the expected sentence;
- `expression-completion` stores an explicit Finnish prompt with a blank plus accepted completions;
- `controlled-production` stores a Persian prompt, explicit Finnish cues, and accepted full-sentence answers.

The runtime may replace only an existing assessment slot for the same declared target. It must not generate new Finnish morphology, inflections, sentences, or accepted answers.

Introductory morphology practice is declared through an optional reviewed `morphology_practice` manifest on morphology-relevant lessons:

- `morphology-choice` stores the base form, grammatical cue, sentence frame, explicit Finnish form options, one explicit expected form, and a short explanation;
- `inflection-production` stores the base form, grammatical cue, sentence frame, explicit accepted answer forms, and a short explanation.

A1.1 uses this contract only for patterns already reviewed in the curriculum, including selected elative, inessive, partitive, genitive, adessive, present-tense person, and negative/connegative forms. Distractors and inflections are authored data; the browser never derives a stem or concatenates a suffix.

The lesson system should gradually add:

- surface form to lemma identification;
- collocation practice beyond the current reviewed expression-completion contract;
- pronunciation practice;
- later, reviewed open-ended writing and speaking tasks.

The scheduler should choose task type according to learning state. A learner must not be able to reach full mastery using only translation multiple choice.

## 9. Lesson composition and recycling

A lesson of approximately 15 activities should be generated from a reviewed lesson manifest rather than from unrestricted randomness.

An illustrative lesson mix:

- 3 activities introducing new targets;
- 4 recognition or contextual-choice activities;
- 3 typed or productive activities;
- 3 reviews from earlier lessons;
- 1 listening or pronunciation activity;
- 1 transfer or mixed checkpoint.

The exact composition should vary by lesson objective. Grammar lessons may use more sentence-level tasks; pronunciation lessons may use more audio; review lessons may contain no new vocabulary.

Each newly introduced target should reappear in later lessons and sections according to the spaced scheduler. Course order and personal review order are complementary:

- the curriculum controls when content becomes available;
- the scheduler controls when the learner needs to retrieve it again.

## 10. Grammar and the four skills

Grammar should initially be embedded in meaningful examples and contrastive tasks, then explained explicitly when the pattern is useful or when errors show that implicit exposure is insufficient.

For Finnish, early priorities include:

- person and present-tense verb forms;
- negation;
- noun cases used in core situations;
- local cases;
- partitive contrasts;
- consonant gradation and stem alternation;
- question formation;
- possession and common sentence frames.

The course should avoid presenting an advanced paradigm merely because UD contains the analysis. Corpus metadata informs the curriculum but does not determine pedagogical order.

All four skills should eventually receive direct practice:

- reading: short comprehensible texts and questions;
- listening: recorded or synthesized words, sentences, and dialogues;
- writing: typed answers progressing toward short original responses;
- speaking: repetition, controlled production, and later speech-recognition-assisted tasks.

Vocabulary learning supports all four skills, but skill transfer requires modality-specific practice. Written recognition is not evidence of listening recognition or spoken production.

Typed Finnish grading may tolerate keyboard-only substitutions between a/ä and o/ö for acceptance, but canonical Finnish orthography remains authoritative. Such answers are reported as near-correct and the character-level difference must remain visible to the learner.

Browser speech synthesis is usable only when the browser exposes an installed voice whose BCP-47 language tag starts with `fi`. The runtime explicitly selects that Finnish voice; it must not fall back silently to a non-Finnish default voice. If the voice list is still loading, the app waits for `voiceschanged`; if no Finnish voice is installed, listening and dictation are skipped without a score penalty and the learner receives device-specific setup guidance.

## 11. GitHub Pages architecture

GitHub Pages can support a substantial first version because it can deliver HTML, CSS, JavaScript, JSON, audio, and other static assets. The browser can perform:

- deterministic lesson generation from reviewed manifests;
- spaced-repetition scheduling;
- lemma and morphology-based question generation;
- distractor selection from static metadata;
- local progress storage through IndexedDB or local storage;
- PWA installation and offline study;
- browser text-to-speech where supported.

GitHub Actions can perform secure build-time generation using repository secrets, for example:

- generating draft questions and examples with an external API;
- validating lesson manifests;
- producing static audio;
- building compact lesson bundles;
- running quality checks before deployment.

AI-generated learning content must be reviewed or validated before publication. Build-time generation is preferable to exposing an API key in browser JavaScript.

GitHub Pages alone is not suitable for:

- secure real-time AI generation per learner;
- centralized accounts and cross-device progress synchronization;
- private analytics tied to accounts;
- secure storage of third-party API keys;
- server-side semantic grading of arbitrary learner text;
- reliable shared leaderboards or social features.

Those features require a separate backend or serverless API. The static frontend can remain on Pages and call that service later.

## 12. Recommended implementation phases

The roadmap is course-first. Personalization and convenience features should not displace completion of the instructional sequence.

### Phase 1 — complete the A1.1 course foundation

- define the full A1.1 curriculum matrix from reviewed CEFR can-do outcomes;
- turn the existing 10-lesson prototype into a complete, coherent A1.1 learning path;
- ensure every lesson deliberately combines high-frequency vocabulary, topic vocabulary, useful expressions or sentence frames, and an explicit grammar or morphology objective;
- define prerequisite and recycling relationships between lessons;
- add short lesson summaries and grammar explanations where explicit instruction improves understanding;
- keep all course data static and deployable on GitHub Pages;
- validate every lesson manifest and accepted answer deterministically.

A lesson is not considered complete merely because it contains 15 activities. It must have a communicative purpose and reviewed content coverage.

### Phase 2 — richer A1.1 practice and retention

- connect curriculum targets to lexeme- and surface-form-aware spaced repetition;
- add Persian-to-Finnish production;
- add listening and dictation with static or build-time-generated audio where practical;
- add sentence ordering, expression completion, and controlled sentence production;
- add morphology-aware distractors and introductory inflection exercises;
- add focused review of weak or frequently missed course targets;
- record chronological answer evidence needed for better mastery decisions.

### Phase 3 — expand the structured course

- build A1.2 and A1.3 using the same reviewed curriculum schema;
- expand high-frequency vocabulary without replacing topic-based curriculum choices; the first Phase 3 tranche now covers consecutive Parole positions 301–400, and later tranches remain driven by the deterministic curriculum-gap analysis;
- add new practical domains such as shopping, transport, home, work, weather, appointments, and health;
- expand grammar in pedagogical order, including present tense, negation, question formation, core cases, local cases, partitive use, possession, and common stem changes;
- introduce short dialogues, readings, and listening passages that recycle earlier material;
- move into A2 only after the A1 progression is coherent and validated.

### Phase 4 — content pipeline and quality at scale

- formalize topic taxonomy, expressions, lexeme/surface-form links, and curriculum metadata;
- use GitHub Actions only for validation or intentional build-time generation;
- keep AI-generated drafts unpublished until reviewed or deterministically validated;
- generate compact static lesson bundles and optional audio artifacts;
- add course-level completeness checks so missing grammar, vocabulary, expression, or recycling targets are visible before merge.

### Phase 5 — secondary learner features

After the structured course is useful end to end:

- configurable session length and difficulty;
- daily goals, streaks, and richer progress dashboards;
- bookmarks and custom word lists;
- import/export of local learning progress;
- PWA installation and offline study;
- accessibility improvements and screen-reader regression coverage.

### Phase 6 — optional backend

Only when GitHub Pages is no longer sufficient:

- accounts and synchronized progress;
- live AI tutoring;
- free-text semantic feedback;
- speech uploads and richer pronunciation analysis;
- teacher dashboards or shared courses.


## 13. A1 curriculum specifications

The A1 curriculum model is now defined across all three Finnish implementation subdivisions:

- [Complete A1.1 curriculum](A1.1-CURRICULUM.md)
- machine-readable A1.1 matrix: [`data/course/a1.1-curriculum.json`](../data/course/a1.1-curriculum.json)
- reviewed A1.2 matrix: [`data/course/a1.2-curriculum.json`](../data/course/a1.2-curriculum.json)
- reviewed A1.3 matrix: [`data/course/a1.3-curriculum.json`](../data/course/a1.3-curriculum.json)

Each stage contains four sections and forty lessons under the same planning contract: communicative can-do outcomes, source-backed high-frequency targets, separate curated topic targets, explicit expressions, grammar or morphology focus, backward-only recycling, activity families, four-skill coverage, assessment criteria, and exact lexical target counts. A1.3 deliberately strengthens familiar social interaction, short messages and texts, routine study/work communication, home and neighborhood problems, and a small set of explicit recent-event forms while remaining inside CEFR A1.

These matrices define reviewed curriculum targets. A1.1 has complete playable manifests, and A1.2 Sections 1–2 now provide twenty reviewed playable lessons using the same 15-activity contract: shopping/everyday services followed by getting around/finding places. The remaining A1.2 Sections 3–4 and all A1.3 playable manifests remain sequenced behind content implementation and validation.

## 14. Key sources

### Standards and curriculum framing

- Council of Europe, [CEFR Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)
- Finnish National Agency for Education, [language proficiency and curriculum materials](https://www.oph.fi/en)

### Retrieval and spacing

- Rawson and Dunlosky, [Optimizing schedules of retrieval practice for durable and efficient learning](https://pubmed.ncbi.nlm.nih.gov/21707204/)
- Cepeda et al., [Distributed practice in verbal recall tasks: a review and quantitative synthesis](https://pubmed.ncbi.nlm.nih.gov/16719566/)
- Karpicke and Roediger, [Repeated retrieval during learning is the key to long-term retention](https://pubmed.ncbi.nlm.nih.gov/18309098/)

### Vocabulary learning

- Webb, [The effects of repetition on vocabulary knowledge](https://academic.oup.com/applij/article/28/1/46/174744)
- Nation, [The Four Strands](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/1996-Four-strands.pdf)

### Infrastructure

- GitHub Docs, [What is GitHub Pages?](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
- GitHub Docs, [Using custom workflows with GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- GitHub Docs, [Using secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

## 15. Decisions recorded

The current product direction is therefore:

- the primary product is a structured Finnish course, not a standalone vocabulary trainer;
- GitHub Pages remains the target platform for the current development stage;
- A1.1 is the immediate curriculum priority, followed by A1.2, A1.3, and later A2+;
- each lesson combines communicative goals with high-frequency vocabulary, curated topic vocabulary, useful sentences or expressions, and grammar;
- sections normally contain about 10 lessons and lessons normally contain about 15 activities, but pedagogical completeness matters more than fixed counts;
- frequency vocabulary is distributed through the curriculum without overriding source frequency data;
- topic vocabulary and useful expressions may be introduced even when unranked or low-frequency;
- lexeme-centered knowledge is practiced through real surface forms;
- spaced retrieval supports the course but does not replace curriculum sequencing;
- reading, listening, writing, and speaking coverage should increase progressively where a static architecture can support them;
- reviewed static content and deterministic validation are preferred over live generation;
- personalization features are secondary to completing a coherent instructional path;
- repository changes follow issue -> branch -> draft PR -> green latest PR commit -> ready for review;
- GitHub Actions should avoid duplicate full-suite runs and expensive unscoped generation;
- a backend remains optional until a concrete feature requires it.
