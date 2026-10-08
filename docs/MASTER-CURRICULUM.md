# Master curriculum: Finnish A1.1–C2

[نسخهٔ کامل فارسی](MASTER-CURRICULUM.fa.md) · [Grammar dependency map](GRAMMAR-ROADMAP.md) · [Vocabulary progression](VOCABULARY-ROADMAP.md) · [Implementation audit (Persian)](CURRICULUM-AUDIT.fa.md)

**Status:** Reviewed design baseline, not a claim that every stage has playable content, not a CEFR/YKI certification. The canonical machine-readable plan is [`data/course/master-curriculum.json`](../data/course/master-curriculum.json).

## Scope and limitations

CEFR has six global levels (A1–C2). The Finnish educational scale includes intermediary stages such as A1.1/A1.2/A1.3 and A2.1/A2.2; this project uses those labels for a pedagogical sequence. C1 and C2 are kept unsplit. The distribution of Finnish grammar, words, and expressions below is **project-authored and provisional**, not prescribed by CEFR, OPH or YKI.

The curriculum explicitly distinguishes (1) introduced grammatical patterns, (2) reviewed patterns, (3) ranked Parole surface-form candidates, (4) curated thematic vocabulary and (5) multiword expressions. Corpus frequency and proficiency are separate measures. The performance outcomes span listening, reading, spoken interaction, spoken production, writing and mediation; software-generated scores alone cannot validate the full CEFR construct.

## End-to-end progression

| Stage | Parent CEFR | Communicative endpoint | Current delivery |
| --- | --- | --- | --- |
| A1.1 | A1 | Handle rehearsed greetings and familiar personal exchanges with support. | implemented |
| A1.2 | A1 | Complete predictable transactions and ask for places, quantities, and help. | implemented (40 playable lessons; not proficiency certification) |
| A1.3 | A1 | Maintain simple social exchanges and manage familiar practical messages with some support. | planned |
| A2.1 | A2 | Describe past experiences and handle routine appointments and familiar institutional tasks. | planned |
| A2.2 | A2 | Explain experiences, compare options, and make moderately extended requests. | planned |
| B1.1 | B1 | Manage most familiar everyday situations and justify straightforward opinions. | planned |
| B1.2 | B1 | Maintain connected discussions, summarize information, and adjust register for familiar contexts. | planned |
| B2.1 | B2 | Argue for positions, follow extended discourse, and engage in broad familiar professional contexts. | planned |
| B2.2 | B2 | Discuss nuanced questions, synthesize sources, and produce clear detailed arguments. | planned |
| C1 | C1 | Communicate fluently and precisely in social, professional, and academic contexts. | planned |
| C2 | C2 | Interpret almost all demanding discourse and express subtle distinctions precisely and spontaneously. | planned |

## Stage content contracts

Each stage specifies four thematic modules, introduced and recycled grammatical concepts, topic word samples, phrases and Finnish sentence patterns, plus a human-assessed integrative performance task. All example utterances must be editorially checked before being incorporated into published questions.

### A1.1 — Handle rehearsed greetings and familiar personal exchanges with support.

**Grammar to introduce/systematize:** Basic phonology and vowel length (`a11-sounds`); Olla in basic identification (`a11-olla`); Core question words (`a11-questions`); Present-tense formulae (`a11-present-chunks`); Simple negation and memorized frames (`a11-negation`); Locative and partitive chunks (`a11-case-chunks`); Basic pronouns and demonstratives (`a11-pronouns`).
**Review:** Entry stage; none.
**Topic streams:** سلام و مکالمهٔ ابتدایی: `hei`, `moi`, `kiitos`; خود، خانواده و زبان: `minä`, `sinä`, `perhe`; عدد، روز و کار روزانه: `yksi`, `maanantai`, `tänään`; خانه و خوراک: `koti`, `keittiö`, `leipä`.
**Expressions:** `Hei!`; `Mikä sinun nimesi on?`; `En ymmärrä. Uudestaan, kiitos.`; `Asun Vaasassa.`; `Minulla on lapsi.`; `Kello on kolme.`.
**Sentence frames:** `Minun nimeni on …`; `Mistä olet?`; `Minä syön.`; `En ymmärrä.`.
**Modules:** `a1.1-s1` (اولین ارتباط و فنلاندیِ ضروری), `a1.1-s2` (من و آدم‌های اطرافم), `a1.1-s3` (زمان و یک روز ساده), `a1.1-s4` (خانه، خوراک و دنیای آشنا).
**Assessment scenario:** گفت‌وگوی دو تا چهار نوبتی با کمک، تشخیص اطلاعات شخصی از یک فایل صوتی کوتاه و نوشتن معرفی دو جمله‌ای. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 400. This is not an exclusive or official word-count band.

### A1.2 — Complete predictable transactions and ask for places, quantities, and help.

**Grammar to introduce/systematize:** Quantities and restricted partitive (`a12-quantities`); Internal and external local cases in reviewed forms (`a12-local-cases`); Polite service requests as formulae (`a12-requests`); Singular imperatives and route instructions (`a12-commands`); Expanded everyday negation (`a12-negation-expand`); Simple frequency/time adverbs (`a12-frequency-adverbs`).
**Review:** `a11-questions`, `a11-case-chunks`, `a11-pronouns`.
**Topic streams:** خرید و پرداخت: `hinta`, `euro`, `kassa`; مسیر و حمل‌ونقل: `asema`, `pysäkki`, `bussi`; کار، تحصیل، قرار: `työ`, `koulu`, `tapaaminen`; هوا، سلامت و خدمات: `apteekki`, `lääkäri`, `sää`.
**Expressions:** `Paljonko tämä maksaa?`; `Haluaisin kahvia, kiitos.`; `Missä pysäkki on?`; `Voinko maksaa kortilla?`; `Minulla on kuumetta.`; `Voitko auttaa?`.
**Sentence frames:** `Se maksaa viisi euroa.`; `Menen bussilla keskustaan.`; `Tarvitsen apua.`; `Kello on kolme.`.
**Modules:** `a1.2-s1` (خرید و خدمات روزمره), `a1.2-s2` (رفت‌وآمد و پیدا کردن مکان‌ها), `a1.2-s3` (زندگی روزمره، تحصیل، کار و قرارهای ساده), `a1.2-s4` (آب‌وهوا، سلامت و کمک‌های روزمره).
**Assessment scenario:** خرید شبیه‌سازی‌شده همراه با مقدار و پرداخت، پرسیدن مسیر و نوشتن پیام کوتاه. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 900. This is not an exclusive or official word-count band.

### A1.3 — Maintain simple social exchanges and manage familiar practical messages with some support.

**Grammar to introduce/systematize:** High-frequency present paradigms (`a13-present-paradigm`); Selected verb types and stems (`a13-verb-classes`); Selected consonant gradation (`a13-kpt-preview`); Expanded local-case patterns (`a13-local-expansion`); Partitive in familiar object frames (`a13-partitive-patterns`); Necessity and ability frames (`a13-necessity`); Recognition of common past forms (`a13-past-recognition`).
**Review:** `a12-requests`, `a12-local-cases`, `a11-negation`.
**Topic streams:** دوستی و پیام: `viesti`, `myöhässä`, `sopia`; خانه و محله: `naapuri`, `huolto`, `avaimet`; مسئولیت و آموزش: `tehtävä`, `aikataulu`, `opiskella`; رویداد و آیندهٔ نزدیک: `eilen`, `huomenna`, `ensi viikolla`.
**Expressions:** `Haluatko tulla mukaan?`; `Valitettavasti en voi.`; `Voimmeko tavata myöhemmin?`; `Minun täytyy perua tapaaminen.`; `Voitko toistaa?`; `Olin kotona eilen.`.
**Sentence frames:** `Olen vähän myöhässä.`; `Meidän pitää lähteä.`; `Voimmeko tavata huomenna?`; `Eilen olin kotona.`.
**Modules:** `a1.3-s1` (پیام‌ها، دعوت‌ها و ارتباط اجتماعی), `a1.3-s2` (خانه، محله و مشکلات روزمره), `a1.3-s3` (تحصیل، کار و مسئولیت‌های روزمره), `a1.3-s4` (رویدادهای اخیر، برنامه‌ها و زبان روزمرهٔ یکپارچه).
**Assessment scenario:** تعامل چهار تا شش نوبتی برای دعوت و جابه‌جایی قرار، گزارش کوتاه مشکل و نوشتن پیام کاربردی. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 1400. This is not an exclusive or official word-count band.

### A2.1 — Describe past experiences and handle routine appointments and familiar institutional tasks.

**Grammar to introduce/systematize:** Productive simple past (`a21-imperfect`); Partitive vs total-object basics (`a21-object-core`); Plural partitive in common phrases (`a21-plural-partitive`); Expanded destination forms (`a21-illative-patterns`); Common verb-case government (`a21-rections`); Common -maan/-massa frames (`a21-maan`); Sequencing simple events (`a21-sequencing`).
**Review:** `a13-present-paradigm`, `a13-kpt-preview`, `a13-partitive-patterns`.
**Topic streams:** سفر و خاطرات: `matka`, `hotelli`, `lippu`; خدمات و قرار: `ajanvaraus`, `hakemus`, `todistus`; تفریح و فعالیت: `harrastus`, `uiminen`, `metsä`; رویداد و تجربه: `eilen`, `viime viikolla`, `tapasin`.
**Expressions:** `Eilen kävin kirjastossa.`; `Viime viikolla matkustin Tampereelle.`; `Odotan bussia.`; `Pidän suomalaisesta ruoasta.`; `Lähden opiskelemaan.`; `Voisinko varata ajan?`.
**Sentence frames:** `Kävin eilen lääkärissä.`; `Odotamme bussia.`; `Lähden opiskelemaan.`; `Pidän tästä kaupungista.`.
**Modules:** `a2.1-s1` (سفر و رویدادهای گذشته), `a2.1-s2` (پزشک و خدمات اداری), `a2.1-s3` (تفریح و علایق), `a2.1-s4` (خانواده و داستان کوتاه).
**Assessment scenario:** بازگویی یک سفر کوتاه، تنظیم قرار و نوشتن پیام درباره تجربه گذشته. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 2300. This is not an exclusive or official word-count band.

### A2.2 — Explain experiences, compare options, and make moderately extended requests.

**Grammar to introduce/systematize:** Present perfect (`a22-perfect`); Past perfect recognition (`a22-pluperfect-preview`); Conditional for polite requests (`a22-conditional`); Present passive (`a22-passive-present`); Comparatives and superlatives (`a22-comparison`); Essive and translative cases (`a22-essive-translative`); Common Finnish postpositions (`a22-postpositions`).
**Review:** `a21-imperfect`, `a21-object-core`, `a21-rections`.
**Topic streams:** مسکن و قرارداد: `vuokra`, `asunto`, `sopimus`; خرید و انتخاب: `halvempi`, `parempi`, `sopivampi`; فرهنگ و جشن: `juhla`, `perinne`, `konsertti`; ایمیل و محیط کار: `sähköposti`, `työpaikka`, `kokous`.
**Expressions:** `Olen asunut Suomessa kaksi vuotta.`; `Voisitko auttaa minua?`; `Tämä on halvempi kuin tuo.`; `Asunto on suurempi.`; `Täällä puhutaan suomea.`; `Haluaisin vaihtaa ajan.`.
**Sentence frames:** `Olen jo käynyt siellä.`; `Tämä asunto on rauhallisempi.`; `Kokous pidetään huomenna.`; `Voisitko lähettää viestin?`.
**Modules:** `a2.2-s1` (تجربه و گذشتهٔ نقلی), `a2.2-s2` (مقایسه و انتخاب), `a2.2-s3` (کار و مکاتبه), `a2.2-s4` (زندگی در فنلاند).
**Assessment scenario:** مقایسه دو آپارتمان، نوشتن ایمیل رسمی ساده و روایت یک تجربه با Perfekti. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 3600. This is not an exclusive or official word-count band.

### B1.1 — Manage most familiar everyday situations and justify straightforward opinions.

**Grammar to introduce/systematize:** Past-tense contrasts (`b11-tense-contrast`); Passive in past contexts (`b11-passive-past`); Conditional constructions (`b11-conditionals`); Plural case inflection (`b11-plural-case`); Introductory participles (`b11-participles-intro`); Possessive suffixes (`b11-possessive-suffixes`); Subordinate clauses (`b11-subordination`); Early written/spoken register awareness (`b11-register`).
**Review:** `a21-object-core`, `a22-comparison`, `a22-postpositions`.
**Topic streams:** کار و درخواست شغل: `työsopimus`, `haastattelu`, `palkka`; اداره و مقررات: `päätös`, `lomake`, `todistus`; فناوری روزمره: `sovellus`, `kirjautua`, `salasana`; زندگی اجتماعی: `palvelu`, `asukas`, `liikenne`.
**Expressions:** `Olen sitä mieltä, että …`; `Voisitko tarkentaa asiaa?`; `Haluaisin hakea tätä paikkaa.`; `Jos minulla olisi aikaa, …`; `Tämä asia pitää selvittää.`; `Miten voin valittaa päätöksestä?`.
**Sentence frames:** `Haen työpaikkaa, koska haluan kehittyä.`; `Jos ehtisin, tulisin mukaan.`; `Päätös on lähetetty.`; `Olen eri mieltä tästä asiasta.`.
**Modules:** `b1.1-s1` (کار و مصاحبه), `b1.1-s2` (اداره و خدمات عمومی), `b1.1-s3` (فناوری و حل مشکل), `b1.1-s4` (نظر و تجربهٔ اجتماعی).
**Assessment scenario:** درخواست شغل و تماس با خدمات عمومی، توضیح مشکل و نوشتن نامهٔ چندپاراگرافی. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 6000. This is not an exclusive or official word-count band.

### B1.2 — Maintain connected discussions, summarize information, and adjust register for familiar contexts.

**Grammar to introduce/systematize:** Common non-finite clause equivalents (`b12-clause-equivalents`); Extended infinitival constructions (`b12-infinitive`); Productive participial modifiers (`b12-participles`); Systematic verb-case government (`b12-verb-case`); Common Finnish derivation (`b12-derivation`); Reported speech (`b12-reporting`); Discourse particles (`b12-particles`).
**Review:** `b11-tense-contrast`, `b11-passive-past`, `b11-possessive-suffixes`.
**Topic streams:** اخبار و رسانه: `uutinen`, `haastattelu`, `tapahtuma`; جامعه و مشارکت: `yhdistys`, `osallistua`, `vapaaehtoinen`; مطالعه و مسیر شغلی: `tutkinto`, `opinnot`, `koulutus`; سلامت و سبک زندگی: `hyvinvointi`, `neuvonta`, `liikunta`.
**Expressions:** `Luin uutisen, jossa kerrottiin …`; `Olen huomannut, että …`; `Toisin sanoen …`; `Kyse on siitä, että …`; `Haluaisin perustella näkökulmani.`; `Mistä tämä johtuu?`.
**Sentence frames:** `Luettuani viestin vastasin heti.`; `Minun mielestäni asia on tärkeä.`; `Hän sanoi tulevansa myöhemmin.`; `Voisitko selittää tämän tarkemmin?`.
**Modules:** `b1.2-s1` (اخبار و روایت), `b1.2-s2` (مشارکت و سازمان‌دهی), `b1.2-s3` (تحصیل و محیط کار), `b1.2-s4` (گفت‌وگوی استدلالی).
**Assessment scenario:** خلاصه خبر، ارائه کوتاه درباره جامعه و نوشتن گزارش منسجم با نقل غیرمستقیم. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 9500. This is not an exclusive or official word-count band.

### B2.1 — Argue for positions, follow extended discourse, and engage in broad familiar professional contexts.

**Grammar to introduce/systematize:** Potential mood, mainly receptive (`b21-potential`); Advanced passive structures (`b21-passive-advanced`); Aspectual object choice and semantics (`b21-object-semantics`); Advanced non-finite forms (`b21-nonfinite`); Textual cohesion and reference (`b21-cohesion`); Causal and concessive discourse patterns (`b21-discourse`); Register control (`b21-register`).
**Review:** `b12-infinitive`, `b12-verb-case`, `b12-participles`.
**Topic streams:** قرارداد و جلسات: `neuvottelu`, `vastuu`, `hanke`; اقتصاد و مصرف: `talous`, `kustannus`, `kestävä`; آموزش و سیاست‌گذاری اجتماعی: `keskustelu`, `vaikutus`, `näkökulma`; هنر و نقد: `teos`, `arvostelu`, `tulkinta`.
**Expressions:** `Ensinnäkin … toisaalta …`; `Tämä johtuu osittain siitä, että …`; `On syytä huomata, että …`; `Ymmärrän näkökulmasi, mutta …`; `Tutkimuksen mukaan …`; `Voisimmeko tarkastella vaihtoehtoja?`.
**Sentence frames:** `Vaikka ratkaisu maksaa enemmän, se voi olla kestävämpi.`; `On syytä harkita muitakin vaihtoehtoja.`; `Raportin mukaan tulokset paranivat.`; `Ehdotan, että keskustelemme asiasta.`.
**Modules:** `b2.1-s1` (اقتصاد و جامعه), `b2.1-s2` (کار و مذاکره), `b2.1-s3` (رسانه و ارزیابی منبع), `b2.1-s4` (مناظره و ارائه).
**Assessment scenario:** ارائه پنج‌دقیقه‌ای درباره یک مسئله، مناظرهٔ هدایت‌شده و نگارش مقالهٔ تحلیلی. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 15000. This is not an exclusive or official word-count band.

### B2.2 — Discuss nuanced questions, synthesize sources, and produce clear detailed arguments.

**Grammar to introduce/systematize:** Nominalisation and dense participial phrases (`b22-nominalisation`); Modality and epistemic stance (`b22-mood-modality`); Word order and information structure (`b22-information-structure`); Idioms and lexicalized collocations (`b22-idioms`); Fine-grained cohesion (`b22-precision`); Style shifting and politeness (`b22-style-shift`).
**Review:** `b21-object-semantics`, `b21-passive-advanced`, `b21-cohesion`.
**Topic streams:** رسانه و اطلاعات نادرست: `väite`, `todiste`, `luotettava`; محیط زیست و سیاست عمومی: `ilmasto`, `energiatehokkuus`, `päästö`; فرایند و مدیریت: `hankinta`, `tavoite`, `johtaminen`; هویت و فرهنگ: `identiteetti`, `perinne`, `muutos`.
**Expressions:** `Näkemykseni mukaan …`; `Tätä voidaan tulkita myös niin, että …`; `Yhtäältä … toisaalta …`; `Edellä esitetyn perusteella …`; `On mahdollista, että …`; `Tässä yhteydessä on erotettava …`.
**Sentence frames:** `Näiden tietojen perusteella ehdotus vaikuttaa perustellulta.`; `Kysymystä on tarkasteltava useasta näkökulmasta.`; `Tulos ei välttämättä tarkoita samaa kaikille.`; `Tämä ei kuitenkaan poista ongelmaa.`.
**Modules:** `b2.2-s1` (تحلیل منابع و ادعاها), `b2.2-s2` (مسئله‌های اجتماعی), `b2.2-s3` (مکاتبه و گزارش رسمی), `b2.2-s4` (بحث پیچیده و جمع‌بندی).
**Assessment scenario:** ارائه و پاسخ به پرسش‌های انتقادی و نوشتن گزارش ترکیبی با استناد به دو منبع. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** 24000. This is not an exclusive or official word-count band.

### C1 — Communicate fluently and precisely in social, professional, and academic contexts.

**Grammar to introduce/systematize:** Flexible register and style (`c1-style`); Complex discourse organization (`c1-discourse`); Pragmatic implication and nuance (`c1-implicature`); Low-frequency morphology in context (`c1-morphology`); Specialized collocations (`c1-collocations`); Dialectal and situational variation (`c1-varieties`).
**Review:** `b22-information-structure`, `b22-mood-modality`, `b22-idioms`.
**Topic streams:** گفتار دانشگاهی و پژوهش: `menetelmä`, `johtopäätös`, `viite`; قانون، خدمات و اجتماع: `lainsäädäntö`, `vastuullisuus`, `oikeudenmukaisuus`; ادبیات و نقد هنری: `kerronta`, `symboli`, `metafora`; تصمیم‌گیری حرفه‌ای: `strategia`, `päätös`, `peruste`.
**Expressions:** `Olennaista on tarkastella sitä, miten …`; `Edellä mainitusta huolimatta …`; `Tämä herättää kysymyksen siitä, …`; `Ilmiö voidaan ymmärtää usealla tavalla.`; `Mikäli oletetaan, että …`; `Tässä väitteessä jää huomiotta …`.
**Sentence frames:** `Tätä ilmiötä on syytä tarkastella laajemmassa yhteydessä.`; `Vaikka perustelut ovat vakuuttavia, johtopäätös jää avoimeksi.`; `Keskustelussa on erotettava tosiasiat tulkinnoista.`; `Hänen näkemyksensä poikkeaa aiemmin esitetystä.`.
**Modules:** `c1-s1` (متون دانشگاهی و حرفه‌ای), `c1-s2` (مذاکره و ارتباط بین‌فرهنگی), `c1-s3` (ادبیات، رسانه و اشاره), `c1-s4` (گزارش و استدلال پیشرفته).
**Assessment scenario:** ارائهٔ مستقل با پرسش و پاسخ، تحلیل مقالهٔ دانشگاهی و نگارش گزارش چندمنبعی. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** none; specialist and genre coverage supersede a raw word-rank target. This is not an exclusive or official word-count band.

### C2 — Interpret almost all demanding discourse and express subtle distinctions precisely and spontaneously.

**Grammar to introduce/systematize:** Rhetorical flexibility (`c2-rhetoric`); Deep pragmatic inference (`c2-implicit`); Advanced editing across genres (`c2-genre-editing`); Idiomatic and cultural allusions (`c2-idiomatic`); Lexical-semantic precision (`c2-precision`); Cross-source synthesis (`c2-synthesis`).
**Review:** `c1-implicature`, `c1-varieties`, `c1-morphology`.
**Topic streams:** متون تخصصی و فناورانه: `tutkimustieto`, `monitulkintainen`, `perustelu`; سبک و فرهنگ: `ironia`, `viittaus`, `kerronnallinen`; میانجی‌گری پیچیده: `ristiriita`, `tulkintakehys`, `sovittelu`; بازنویسی حرفه‌ای: `vivahde`, `johdonmukaisuus`, `täsmällisyys`.
**Expressions:** `Se, mitä lausumatta jää, on tässä yhtä olennaista kuin …`; `Tarkastelutavasta riippuen …`; `Väitteen taustalla näyttää olevan oletus, että …`; `Tämä tulkinta ei yksin riitä selittämään …`; `Sanavalinta muuttaa merkitysvivahdetta.`; `Teksti voidaan muotoilla myös lukijalähtöisemmin.`.
**Sentence frames:** `Tulkinnan uskottavuus riippuu siitä, mitä oletuksia pidetään perusteltuina.`; `Ilmauksen sävy muuttuu asiayhteyden mukaan.`; `Näennäinen ristiriita ratkeaa, kun käsitteet erotetaan toisistaan.`; `Kirjoittaja jättää johtopäätöksen tarkoituksella avoimeksi.`.
**Modules:** `c2-s1` (تفسیر چندلایه و سبک), `c2-s2` (بازنویسی و ویرایش تخصصی), `c2-s3` (مذاکره و گفت‌وگوی دشوار), `c2-s4` (ترکیب منابع و تولید خلاق).
**Assessment scenario:** تحلیل متن پرارجاع، مذاکرهٔ پیچیده، ارائهٔ آزاد و بازنویسی حرفه‌ای برای دو مخاطب متفاوت. (human verification is needed for unaudited skills).
**Advisory Parole source-position ceiling:** none; specialist and genre coverage supersede a raw word-rank target. This is not an exclusive or official word-count band.

## Workflow for adding a level

1. Check learner can-do objectives and prerequisite concepts in the master JSON.
2. Author an independently reviewed level curriculum with four modules, each split into lesson outcomes and explicit grammar/lexical references.
3. Select real Finnish surface forms, curated expressions, Persian translations and verified accepted answers; never generate arbitrary inflections through string concatenation.
4. Include retrieval and recycling of prerequisite items, and collect listening/reading/production evidence separately.
5. Run `node scripts/audit-master-curriculum.cjs --check`, `node scripts/audit-master-curriculum.cjs --markdown` and `npm test`; reconcile planned-vs-shipped inventory before reporting progress.
6. Keep the Persian master, grammar map and vocabulary map in sync with the JSON changes and review evidence.

## Primary references

- [Council of Europe CEFR illustrative descriptors and 2020 Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors) — Communicative outcomes and mediation.
- [Finnish National Agency for Education evolving proficiency scale](https://www.oph.fi/fi/koulutus-ja-tutkinnot/kehittyvan-kielitaidon-tasojen-kuvausasteikko) — Finer-grained A1–B2 educational progression.
- [Finnish National Agency for Education YKI correspondence](https://www.oph.fi/en/education-and-qualifications/selecting-right-yki-test-test-days) — Six-level YKI to A1–C2 correspondence.
- [University of Helsinki Finnish course contents](https://www.helsinki.fi/en/language-centre/teaching-and-research/finnish-foreigners/course-materials-objectives-and-contents) — Practical Finnish grammatical sequencing; not an official prescription.
- [Institute for the Languages of Finland grammar overview](https://kotus.fi/kotus/kielet-ja-kielipolitiikka/kansalliskielet/suomen-kieli/) — Reference morphology and descriptive grammatical categories.
