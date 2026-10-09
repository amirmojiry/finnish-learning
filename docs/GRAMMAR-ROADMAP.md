# Grammar progression and prerequisite graph

[سیلابس کامل فارسی](MASTER-CURRICULUM.fa.md) · [English master](MASTER-CURRICULUM.md) · [Vocabulary roadmap](VOCABULARY-ROADMAP.md)

## Principles

- CEFR and YKI do **not** publish a fixed list of Finnish grammatical forms that must be mastered at each level. Placement below is a **reviewable project hypothesis**, informed by University of Helsinki Finnish course descriptions, OPH's proficiency scale and Kotus grammar references.
- A pattern can be **encountered as a memorized expression**, then **recognized**, then **produced with cues**, and later **used productively in new contexts**. Mentioning a case ending or conjugated word in A1.1 never implies that the full paradigm has been taught.
- Prerequisite links are directional: an item may only depend on a concept introduced in the same stage earlier or an earlier stage. Review links must point to older stages. These are validated by `scripts/audit-master-curriculum.cjs`.
- Natural inflected forms and accepted variants require human linguistic review; do not generate answers by suffix concatenation. Teach register distinctions (standard vs colloquial) gradually and label forms correctly.

## Stage-level grammar spine

| Stage | First focus | Recycled prerequisites | Pedagogical emphasis |
| --- | --- | --- | --- |
| A1.1 | Basic phonology and vowel length; Olla in basic identification; Core question words | Entry stage | Available in existing content; audit individual lesson treatment |
| A1.2 | Quantities and restricted partitive; Internal and external local cases in reviewed forms; Polite service requests as formulae | a11-questions, a11-case-chunks, a11-pronouns | Four playable sections; grammatical competence still requires separate learner assessment |
| A1.3 | High-frequency present paradigms; Selected verb types and stems; Selected consonant gradation | a12-requests, a12-local-cases, a11-negation | Four playable sections with explicit reviewed chunks; productive mastery still requires independent assessment |
| A2.1 | Productive simple past; Partitive vs total-object basics; Plural partitive in common phrases | a13-present-paradigm, a13-kpt-preview, a13-partitive-patterns | Section 1 playable: selected past forms, explicit objects and event sequencing; full A2.1 grammar not yet shipped |
| A2.2 | Present perfect; Past perfect recognition; Conditional for polite requests | a21-imperfect, a21-object-core, a21-rections | Planning only, not shipped |
| B1.1 | Past-tense contrasts; Passive in past contexts; Conditional constructions | a21-object-core, a22-comparison, a22-postpositions | Planning only, not shipped |
| B1.2 | Common non-finite clause equivalents; Extended infinitival constructions; Productive participial modifiers | b11-tense-contrast, b11-passive-past, b11-possessive-suffixes | Planning only, not shipped |
| B2.1 | Potential mood, mainly receptive; Advanced passive structures; Aspectual object choice and semantics | b12-infinitive, b12-verb-case, b12-participles | Planning only, not shipped |
| B2.2 | Nominalisation and dense participial phrases; Modality and epistemic stance; Word order and information structure | b21-object-semantics, b21-passive-advanced, b21-cohesion | Planning only, not shipped |
| C1 | Flexible register and style; Complex discourse organization; Pragmatic implication and nuance | b22-information-structure, b22-mood-modality, b22-idioms | Planning only, not shipped |
| C2 | Rhetorical flexibility; Deep pragmatic inference; Advanced editing across genres | c1-implicature, c1-varieties, c1-morphology | Planning only, not shipped |

## Detailed graph (canonical concept IDs)

Each concept has one first-introduction stage. Dependencies refer to earlier explicitly introduced IDs; the full canonical object also carries Finnish/Persian concept descriptions.

### A1.1 (CEFR A1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `a11-sounds` | Basic phonology and vowel length — واج‌ها، واکه‌های کوتاه/بلند و آهنگ پایه | — |
| `a11-olla` | Olla in basic identification — فعل olla و معرفی ساده | — |
| `a11-questions` | Core question words — واژه‌های پرسشی kuka/mikä/missä و پرسش‌های کوتاه | `a11-olla` |
| `a11-present-chunks` | Present-tense formulae — شکل‌های پرتکرار حال به‌صورت عبارت‌های آماده | `a11-olla` |
| `a11-negation` | Simple negation and memorized frames — منفی‌سازی ساده با en/ei و عبارت‌های ثابت | `a11-present-chunks` |
| `a11-case-chunks` | Locative and partitive chunks — حالت‌های مکانی و Partitive در عبارت‌های آماده، نه صرف آزاد | `a11-present-chunks` |
| `a11-pronouns` | Basic pronouns and demonstratives — ضمایر شخصی و اشاری پایه، مالکیت در عبارت‌های ثابت | `a11-olla` |

**Scheduled recycling:** Initial stage.

### A1.2 (CEFR A1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `a12-quantities` | Quantities and restricted partitive — مقدار، عدد و کاربردهای محدود Partitive | `a11-case-chunks` |
| `a12-local-cases` | Internal and external local cases in reviewed forms — حالت‌های در/از/به مکان، با صورت‌های صحیح و بازبینی‌شده | `a11-case-chunks` |
| `a12-requests` | Polite service requests as formulae — درخواست مودبانهٔ ثابت (haluaisin، saanko) | `a11-present-chunks` |
| `a12-commands` | Singular imperatives and route instructions — امر مفرد و دستورهای جهت‌یابی | `a11-present-chunks` |
| `a12-negation-expand` | Expanded everyday negation — منفی‌سازی درخواست‌ها و جمله‌های روزمره | `a11-negation` |
| `a12-frequency-adverbs` | Simple frequency/time adverbs — قیدهای بسامد و زمان‌بندی ساده | `a11-present-chunks` |

**Scheduled recycling:** `a11-questions`, `a11-case-chunks`, `a11-pronouns`.

### A1.3 (CEFR A1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `a13-present-paradigm` | High-frequency present paradigms — توسعهٔ شکل‌های شخصی حال در فعل‌های پرتکرار | `a11-present-chunks` |
| `a13-verb-classes` | Selected verb types and stems — آشنایی تدریجی با انواع فعل و ریشه‌های متداول | `a13-present-paradigm` |
| `a13-kpt-preview` | Selected consonant gradation — درجه‌بندی همخوان (KPT) در واژه‌های منتخب | `a13-verb-classes` |
| `a13-local-expansion` | Expanded local-case patterns — تقویت کاربرد حالت‌های مکانی و فعل + حالت | `a12-local-cases` |
| `a13-partitive-patterns` | Partitive in familiar object frames — مفعول Partitive در جمله‌های آشنا | `a12-quantities` |
| `a13-necessity` | Necessity and ability frames — الگوهای اجبار/توانایی (pitää، täytyy، voin) | `a12-requests` |
| `a13-past-recognition` | Recognition of common past forms — تشخیص چند شکل پرتکرار گذشته، بدون الزام صرف آزاد | `a13-present-paradigm` |

**Scheduled recycling:** `a12-requests`, `a12-local-cases`, `a11-negation`.

### A2.1 (CEFR A2)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `a21-imperfect` | Productive simple past — گذشتهٔ ساده (imperfekti) در افعال متداول | `a13-past-recognition`, `a13-verb-classes` |
| `a21-object-core` | Partitive vs total-object basics — مفعول کل/جزئی در نمونه‌های مشخص | `a13-partitive-patterns` |
| `a21-plural-partitive` | Plural partitive in common phrases — Partitive جمع و گروه‌های اسمی پرکاربرد | `a12-quantities` |
| `a21-illative-patterns` | Expanded destination forms — حالت‌های ورود/خروج و مقصدهای متنوع‌تر | `a13-local-expansion` |
| `a21-rections` | Common verb-case government — حاکمیت حالت در فعل‌های پرکاربرد (pitää + sta و ...) | `a13-local-expansion` |
| `a21-maan` | Common -maan/-massa frames — الگوهای فعل + -maan/-massa/-masta در بافت‌های محدود | `a13-verb-classes` |
| `a21-sequencing` | Sequencing simple events — پیوند ترتیب اتفاق‌ها با sitten، kun و ... | `a21-imperfect` |

**Scheduled recycling:** `a13-present-paradigm`, `a13-kpt-preview`, `a13-partitive-patterns`.

### A2.2 (CEFR A2)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `a22-perfect` | Present perfect — گذشتهٔ نقلی (perfekti) و کاربرد در تجربه‌ها | `a21-imperfect` |
| `a22-pluperfect-preview` | Past perfect recognition — آشنایی و تشخیص گذشتهٔ دور | `a22-perfect` |
| `a22-conditional` | Conditional for polite requests — شرطی مودبانه و درخواست احتمالی | `a12-requests` |
| `a22-passive-present` | Present passive — مجهول حال و کاربرد خدماتی | `a13-present-paradigm` |
| `a22-comparison` | Comparatives and superlatives — صفت تفضیلی و عالی | `a13-kpt-preview` |
| `a22-essive-translative` | Essive and translative cases — Essive و Translative در نقش، وضعیت و تغییر | `a21-illative-patterns` |
| `a22-postpositions` | Common Finnish postpositions — حروف اضافه/پس‌اضافهٔ پرتکرار | `a13-local-expansion` |

**Scheduled recycling:** `a21-imperfect`, `a21-object-core`, `a21-rections`.

### B1.1 (CEFR B1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `b11-tense-contrast` | Past-tense contrasts — تمایز imperfekti/perfekti/pluskvamperfekti | `a22-perfect`, `a22-pluperfect-preview` |
| `b11-passive-past` | Passive in past contexts — مجهول در زمان گذشته و نقلی | `a22-passive-present` |
| `b11-conditionals` | Conditional constructions — جمله‌های شرطی اگر/پس و درخواست پیچیده‌تر | `a22-conditional` |
| `b11-plural-case` | Plural case inflection — جمع در حالت‌های اسمی و الگوهای رایج | `a21-plural-partitive`, `a22-essive-translative` |
| `b11-participles-intro` | Introductory participles — وجه وصفی حال و گذشته در متن‌های آشنا | `a22-perfect` |
| `b11-possessive-suffixes` | Possessive suffixes — شناسه‌های ملکی در کاربردهای رایج | `a11-pronouns` |
| `b11-subordination` | Subordinate clauses — جمله‌واره‌های että، koska، kun و اگر | `a21-sequencing` |
| `b11-register` | Early written/spoken register awareness — تفاوت فنلاندی نوشتاری و گفتاری در موقعیت آشنا | `a13-present-paradigm` |

**Scheduled recycling:** `a21-object-core`, `a22-comparison`, `a22-postpositions`.

### B1.2 (CEFR B1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `b12-clause-equivalents` | Common non-finite clause equivalents — ساختارهای جانشین جمله‌واره (lauseenvastike) در موارد رایج | `b11-subordination`, `b11-participles-intro` |
| `b12-infinitive` | Extended infinitival constructions — اسم‌مصدرها و ترکیب‌های -maan/-massa/-minen پیشرفته‌تر | `a21-maan` |
| `b12-participles` | Productive participial modifiers — وجه وصفی و عبارت‌های وصفی چندواژه‌ای | `b11-participles-intro` |
| `b12-verb-case` | Systematic verb-case government — ترکیب‌های فعل + حالت و معنای متفاوت حالت‌ها | `a21-rections` |
| `b12-derivation` | Common Finnish derivation — ساخت واژه و مشتقات پرکاربرد | `a13-verb-classes` |
| `b12-reporting` | Reported speech — نقل گفتار و گزارش غیرمستقیم | `b11-subordination` |
| `b12-particles` | Discourse particles — ذرات گفتاری -han/-hän و -kin/-kaan در بافت | `b11-register` |

**Scheduled recycling:** `b11-tense-contrast`, `b11-passive-past`, `b11-possessive-suffixes`.

### B2.1 (CEFR B2)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `b21-potential` | Potential mood, mainly receptive — وجه احتمالی (potentiaali) بیشتر برای تشخیص و کاربرد محدود | `b11-tense-contrast` |
| `b21-passive-advanced` | Advanced passive structures — الگوهای مجهول و تفاوت کاربرد رسمی/محاوره‌ای | `b11-passive-past`, `b11-register` |
| `b21-object-semantics` | Aspectual object choice and semantics — جزئی/کلی بودن مفعول و دلالت معنایی در بافت پیچیده | `a21-object-core` |
| `b21-nonfinite` | Advanced non-finite forms — ساختارهای مصدر/وجه وصفی پیچیده‌تر | `b12-clause-equivalents` |
| `b21-cohesion` | Textual cohesion and reference — ارجاع، پیوستگی و ارتباط بین بندها | `b12-reporting` |
| `b21-discourse` | Causal and concessive discourse patterns — رابطه‌های علت، نتیجه، امتیاز و تضاد | `b11-subordination` |
| `b21-register` | Register control — تغییر سبک زبان در ارائه، نامه و گفت‌وگو | `b12-particles` |

**Scheduled recycling:** `b12-infinitive`, `b12-verb-case`, `b12-participles`.

### B2.2 (CEFR B2)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `b22-nominalisation` | Nominalisation and dense participial phrases — اسمی‌سازی و عبارت‌های وجه وصفی فشرده | `b21-nonfinite` |
| `b22-mood-modality` | Modality and epistemic stance — درجهٔ قطعیت، الزام، احتمال و بیان دیدگاه | `b21-potential`, `a22-conditional` |
| `b22-information-structure` | Word order and information structure — ترتیب واژه، تأکید و ساختار اطلاعات | `b21-cohesion` |
| `b22-idioms` | Idioms and lexicalized collocations — عبارت‌های اصطلاحی، مجازی و هم‌آیندهای دشوارتر | `b12-derivation` |
| `b22-precision` | Fine-grained cohesion — کنترل ارجاع، تضاد و رابطه‌های منطقی | `b21-discourse` |
| `b22-style-shift` | Style shifting and politeness — تفاوت سبک در درخواست، انتقاد و متن رسمی | `b21-register` |

**Scheduled recycling:** `b21-object-semantics`, `b21-passive-advanced`, `b21-cohesion`.

### C1 (CEFR C1)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `c1-style` | Flexible register and style — سبک رسمی، محاوره‌ای و ادبی و انتخاب هدفمند | `b22-style-shift` |
| `c1-discourse` | Complex discourse organization — ساختار متن پیچیده، انسجام و استدلال چندلایه | `b22-precision` |
| `c1-implicature` | Pragmatic implication and nuance — اشارهٔ ضمنی، کنایه، لحن و ادب ارتباطی | `b22-mood-modality` |
| `c1-morphology` | Low-frequency morphology in context — کاربرد دقیق ساختارهای صرفی کم‌کاربرد با شواهد متنی | `b22-nominalisation` |
| `c1-collocations` | Specialized collocations — هم‌آیندهای تخصصی، اصطلاحات و ترکیب‌های تثبیت‌شده | `b22-idioms` |
| `c1-varieties` | Dialectal and situational variation — شناخت گونه‌های محلی، گفتاری و موقعیتی | `b21-register` |

**Scheduled recycling:** `b22-information-structure`, `b22-mood-modality`, `b22-idioms`.

### C2 (CEFR C2)

| Concept ID | Finnish grammar focus | Depends on |
| --- | --- | --- |
| `c2-rhetoric` | Rhetorical flexibility — بلاغت و تغییر ظریف لحن برای مخاطب | `c1-style`, `c1-discourse` |
| `c2-implicit` | Deep pragmatic inference — دریافت نیت، پیش‌فرض و معنی ضمنی | `c1-implicature` |
| `c2-genre-editing` | Advanced editing across genres — ویرایش پیشرفته و بازنویسی چندژانری | `c1-style` |
| `c2-idiomatic` | Idiomatic and cultural allusions — اصطلاحات کم‌بسامد، طنز و ارجاعات فرهنگی | `c1-collocations`, `c1-varieties` |
| `c2-precision` | Lexical-semantic precision — تفاوت‌های بسیار ریز معنایی و انتخاب واژه | `c1-collocations` |
| `c2-synthesis` | Cross-source synthesis — تلفیق انتقادی منابع ناهمگون و اختلاف‌های ضمنی | `c1-discourse` |

**Scheduled recycling:** `c1-implicature`, `c1-varieties`, `c1-morphology`.

## Core pathways requiring longitudinal recycling

### Negation and verb patterns

A1.1 teaches high-frequency first-person negation as complete phrases; A1.2 strengthens everyday negation; A1.3 systematizes productive present forms. Later stages extend tense, modal and passive constructions. This avoids claiming that an early `En syö.` card teaches the entire negative paradigm.

### Cases and object marking

A1 introduces local/partitive chunks; A1.2–A1.3 expand concrete locative and partitive uses. A2 connects quantity and object marking to distinct meanings and introduces plural partitives. B1/B2 broaden case-government, aspect and literary/official alternatives; C1/C2 target precision and genre rather than more suffix names.

### Past time and narrative

A1.3 is limited to recognition of selected past forms. A2.1 makes familiar simple past productive; A2.2 introduces perfect. B1 contrasts imperfect, perfect and pluperfect in coherent narratives; higher levels refine stance and story structure.

### Requests, conditional, politeness and register

A1.2 may use `haluaisin` as a fixed polite service formula without teaching conditional morphology. A2.2 introduces conditional patterns; B1 builds larger hypothetical clauses; B2–C2 practice register adaptation, nuanced stance, implicit meaning and rhetoric.

### Finite clauses and nonfinite reductions

Conjunctions and simple explanatory clauses begin at B1.1. B1.2 onward adds common non-finite clause equivalents, participles and compact expression. Advanced stages emphasize authenticity, naturalness, reader orientation and genre effects rather than completing a checklist of grammar labels.

## Authoring and acceptance gate

1. Add a stable concept ID and its checked prerequisites to the master JSON; never silently reorder a prerequisite later than its dependent.
2. Identify learning depth and list examples: recognition, guided production, free production. For A1 (chunks), protect against implying productive morphological control.
3. Attach concrete lesson/activity references at the section level when that level is authored; do not mark a planning-only concept as shipped.
4. Include regular, irregular, harmony-sensitive and consonant-gradation cases when the structure is actually taught. Validate accepted answers against explicit Finnish forms.
5. Keep the reader-friendly maps synchronized and run `node scripts/audit-master-curriculum.cjs --check` plus `npm test`.

## References

- [Council of Europe CEFR illustrative descriptors and 2020 Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)
- [Finnish National Agency for Education evolving proficiency scale](https://www.oph.fi/fi/koulutus-ja-tutkinnot/kehittyvan-kielitaidon-tasojen-kuvausasteikko)
- [University of Helsinki Finnish course contents](https://www.helsinki.fi/en/language-centre/teaching-and-research/finnish-foreigners/course-materials-objectives-and-contents)
- [Institute for the Languages of Finland grammar overview](https://kotus.fi/kotus/kielet-ja-kielipolitiikka/kansalliskielet/suomen-kieli/)
