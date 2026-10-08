# Vocabulary roadmap: ranked forms, thematic lexemes and expressions

[سیلابس جامع فارسی](MASTER-CURRICULUM.fa.md) · [Master curriculum](MASTER-CURRICULUM.md) · [Grammar roadmap](GRAMMAR-ROADMAP.md)

## Key distinction

**A corpus position is not a CEFR word requirement.** The project currently ships 400 curated Parole-backed Finnish written *surface forms* in `data/common-words.json`, but the full underlying source is larger. A ranked form, a Finnish lexeme, a grammatical inflection and a multiword expression are different accounting units. Comprehending one inflected form does not imply productive command of the lemma, nor the entire language.

The priority bands below are **project review queues**, not promised per-stage word counts. A candidate may be deferred due to pedagogical difficulty, replaced by a more relevant topic item, or recycled from an earlier level. Adjacent levels deliberately review earlier candidates.

## Advisory candidate allocation across levels

| Stage | New source positions to examine first (non-exclusive) | Topic stream emphasis |
| --- | --- | --- |
| A1.1 | 1–400 candidates for first evaluation; reconsider earlier bands for recycling | سلام و مکالمهٔ ابتدایی؛ خود، خانواده و زبان؛ عدد، روز و کار روزانه؛ خانه و خوراک |
| A1.2 | 401–900 candidates for first evaluation; reconsider earlier bands for recycling | خرید و پرداخت؛ مسیر و حمل‌ونقل؛ کار، تحصیل، قرار؛ هوا، سلامت و خدمات |
| A1.3 | 901–1400 candidates for first evaluation; reconsider earlier bands for recycling | دوستی و پیام؛ خانه و محله؛ مسئولیت و آموزش؛ رویداد و آیندهٔ نزدیک |
| A2.1 | 1401–2300 candidates for first evaluation; reconsider earlier bands for recycling | سفر و خاطرات؛ خدمات و قرار؛ تفریح و فعالیت؛ رویداد و تجربه |
| A2.2 | 2301–3600 candidates for first evaluation; reconsider earlier bands for recycling | مسکن و قرارداد؛ خرید و انتخاب؛ فرهنگ و جشن؛ ایمیل و محیط کار |
| B1.1 | 3601–6000 candidates for first evaluation; reconsider earlier bands for recycling | کار و درخواست شغل؛ اداره و مقررات؛ فناوری روزمره؛ زندگی اجتماعی |
| B1.2 | 6001–9500 candidates for first evaluation; reconsider earlier bands for recycling | اخبار و رسانه؛ جامعه و مشارکت؛ مطالعه و مسیر شغلی؛ سلامت و سبک زندگی |
| B2.1 | 9501–15000 candidates for first evaluation; reconsider earlier bands for recycling | قرارداد و جلسات؛ اقتصاد و مصرف؛ آموزش و سیاست‌گذاری اجتماعی؛ هنر و نقد |
| B2.2 | 15001–24000 candidates for first evaluation; reconsider earlier bands for recycling | رسانه و اطلاعات نادرست؛ محیط زیست و سیاست عمومی؛ فرایند و مدیریت؛ هویت و فرهنگ |
| C1 | No fixed rank ceiling | گفتار دانشگاهی و پژوهش؛ قانون، خدمات و اجتماع؛ ادبیات و نقد هنری؛ تصمیم‌گیری حرفه‌ای |
| C2 | No fixed rank ceiling | متون تخصصی و فناورانه؛ سبک و فرهنگ؛ میانجی‌گری پیچیده؛ بازنویسی حرفه‌ای |

**How to use the bands:** The ranges refer only to an original Parole source-position sequence and must not be mistaken for `frequency_rank` ties, the 400-entry application's `position` field, frequency percentages, or recognized vocabulary size. Do not assume every source form in a band is appropriate. C1/C2 have no fixed ceiling and require authentic genre-specific texts.

## The four complementary lexical channels

1. **Core ranked forms:** Real Parole written-corpus form, count and token percentage. Include only when relevant to the communicative outcome; preserve upstream source fields exactly.
2. **Curated topic lexemes:** Useful words such as `pysäkki`, `kuitti` and `ajanvaraus` even when outside the current 400-form application pool. If the form exists in full Parole but is not in the current app subset, label it as a source-backed gap rather than inventing a source rank.
3. **Expressions and constructional frames:** Multiword items such as `Paljonko tämä maksaa?`, `Minulla on kuumetta`, `Olisin kiinnostunut …`. These do not inherit an arbitrary frequency rank from an individual word.
4. **Morphological form coverage and senses:** Forms such as `talo`, `talossa`, `taloon` are related but not interchangeable. Track comprehension and production by relevant sense and inflection, not only a single base-form checkbox.

## Levels, topic lexemes and formulae

### A1.1 — فنلاندیِ ضروری و ارتباط نخست

- **سلام و مکالمهٔ ابتدایی:** `hei`, `moi`, `kiitos`, `anteeksi`.
- **خود، خانواده و زبان:** `minä`, `sinä`, `perhe`, `äiti`, `puhun`.
- **عدد، روز و کار روزانه:** `yksi`, `maanantai`, `tänään`, `aamulla`.
- **خانه و خوراک:** `koti`, `keittiö`, `leipä`, `vesi`.
- **Formulae:** `Hei!`; `Mikä sinun nimesi on?`; `En ymmärrä. Uudestaan, kiitos.`; `Asun Vaasassa.`; `Minulla on lapsi.`.
- **Frequency policy:** از صورت‌های پرتکرار موجود آغاز کن؛ تنها واژه‌های قابل‌آموزشِ متناسب با سطح را معرفی کن. ۳ تا ۶ هدف جدید در هر درس صرفاً راهنمای طراحی است.

### A1.2 — خرید، رفت‌وآمد و خدمات روزمره

- **خرید و پرداخت:** `hinta`, `euro`, `kassa`, `kortti`, `kuitti`.
- **مسیر و حمل‌ونقل:** `asema`, `pysäkki`, `bussi`, `vasen`, `oikea`.
- **کار، تحصیل، قرار:** `työ`, `koulu`, `tapaaminen`, `viikko`.
- **هوا، سلامت و خدمات:** `apteekki`, `lääkäri`, `sää`, `kuume`.
- **Formulae:** `Paljonko tämä maksaa?`; `Haluaisin kahvia, kiitos.`; `Missä pysäkki on?`; `Voinko maksaa kortilla?`; `Minulla on kuumetta.`.
- **Frequency policy:** صورت‌های پرتکرار منطبق با خرید و مسیر را با واژگان موضوعی کم‌بسامد ولی ضروری ترکیب کن؛ پنجرهٔ عددی سهمیه یا سطح رسمی نیست.

### A1.3 — کارکرد مستقل‌تر در موقعیت‌های آشنا

- **دوستی و پیام:** `viesti`, `myöhässä`, `sopia`, `kanssa`.
- **خانه و محله:** `naapuri`, `huolto`, `avaimet`, `rikki`.
- **مسئولیت و آموزش:** `tehtävä`, `aikataulu`, `opiskella`, `selittää`.
- **رویداد و آیندهٔ نزدیک:** `eilen`, `huomenna`, `ensi viikolla`, `suunnitelma`.
- **Formulae:** `Haluatko tulla mukaan?`; `Valitettavasti en voi.`; `Voimmeko tavata myöhemmin?`; `Minun täytyy perua tapaaminen.`; `Voitko toistaa?`.
- **Frequency policy:** از لغات پرکاربردِ پشتیبان پیام و زندگی روزانه استفاده کن؛ واژگان معرفی‌شده در A1.1/A1.2 باید در بافت متفاوت بازیابی شوند.

### A2.1 — تجربه‌های گذشته و خدمات پیچیده‌تر

- **سفر و خاطرات:** `matka`, `hotelli`, `lippu`, `kävin`.
- **خدمات و قرار:** `ajanvaraus`, `hakemus`, `todistus`, `toimisto`.
- **تفریح و فعالیت:** `harrastus`, `uiminen`, `metsä`, `retki`.
- **رویداد و تجربه:** `eilen`, `viime viikolla`, `tapasin`, `vierailu`.
- **Formulae:** `Eilen kävin kirjastossa.`; `Viime viikolla matkustin Tampereelle.`; `Odotan bussia.`; `Pidän suomalaisesta ruoasta.`; `Lähden opiskelemaan.`.
- **Frequency policy:** واژه‌های پرتکرار فعل/حالت را در کنار حوزه‌های سفر و خدمات بازگسترش بده؛ شناسايی ریشه و صورت صرف‌شده را جدا ثبت کن.

### A2.2 — روایت، مقایسه و تعامل اجتماعی

- **مسکن و قرارداد:** `vuokra`, `asunto`, `sopimus`, `muutto`.
- **خرید و انتخاب:** `halvempi`, `parempi`, `sopivampi`, `laatu`.
- **فرهنگ و جشن:** `juhla`, `perinne`, `konsertti`, `näyttely`.
- **ایمیل و محیط کار:** `sähköposti`, `työpaikka`, `kokous`, `liite`.
- **Formulae:** `Olen asunut Suomessa kaksi vuotta.`; `Voisitko auttaa minua?`; `Tämä on halvempi kuin tuo.`; `Asunto on suurempi.`; `Täällä puhutaan suomea.`.
- **Frequency policy:** معناهای چندگانهٔ واژه‌های رایج و هم‌آیندها مهم‌تر از بالا بردن صرف شمار واژه‌اند؛ فهرست پربسامد راهنماست.

### B1.1 — کاربرد مستقل در خدمات و کار

- **کار و درخواست شغل:** `työsopimus`, `haastattelu`, `palkka`, `työvuoro`.
- **اداره و مقررات:** `päätös`, `lomake`, `todistus`, `oikeus`.
- **فناوری روزمره:** `sovellus`, `kirjautua`, `salasana`, `laite`.
- **زندگی اجتماعی:** `palvelu`, `asukas`, `liikenne`, `koulutus`.
- **Formulae:** `Olen sitä mieltä, että …`; `Voisitko tarkentaa asiaa?`; `Haluaisin hakea tätä paikkaa.`; `Jos minulla olisi aikaa, …`; `Tämä asia pitää selvittää.`.
- **Frequency policy:** واژگان اداری و کاربردی، هم‌آیندهای فعل+حالت و ترکیب‌های معنایی را از پیکره و منابع بازبینی‌شده انتخاب کن.

### B1.2 — روایت پیچیده‌تر و تعامل در جامعه

- **اخبار و رسانه:** `uutinen`, `haastattelu`, `tapahtuma`, `lähde`.
- **جامعه و مشارکت:** `yhdistys`, `osallistua`, `vapaaehtoinen`, `järjestää`.
- **مطالعه و مسیر شغلی:** `tutkinto`, `opinnot`, `koulutus`, `hakemus`.
- **سلامت و سبک زندگی:** `hyvinvointi`, `neuvonta`, `liikunta`, `vaikutus`.
- **Formulae:** `Luin uutisen, jossa kerrottiin …`; `Olen huomannut, että …`; `Toisin sanoen …`; `Kyse on siitä, että …`; `Haluaisin perustella näkökulmani.`.
- **Frequency policy:** عبارت‌های طبیعی رسانه‌ای و فعل‌+حالت با یادداشت تفاوت رسمی/محاوره‌ای در اولویت‌اند.

### B2.1 — بحث، تحلیل و ارتباط تخصصی ابتدایی

- **قرارداد و جلسات:** `neuvottelu`, `vastuu`, `hanke`, `arvio`.
- **اقتصاد و مصرف:** `talous`, `kustannus`, `kestävä`, `kuluttaja`.
- **آموزش و سیاست‌گذاری اجتماعی:** `keskustelu`, `vaikutus`, `näkökulma`, `tutkimus`.
- **هنر و نقد:** `teos`, `arvostelu`, `tulkinta`, `yleisö`.
- **Formulae:** `Ensinnäkin … toisaalta …`; `Tämä johtuu osittain siitä, että …`; `On syytä huomata, että …`; `Ymmärrän näkökulmasi, mutta …`; `Tutkimuksen mukaan …`.
- **Frequency policy:** واژگان انتزاعی پربسامد، هم‌آیندهای کاری و تمایز سبک؛ صرف رتبهٔ خام واژه معیار کفایت نیست.

### B2.2 — نوشتار استدلالی و انعطاف سبکی

- **رسانه و اطلاعات نادرست:** `väite`, `todiste`, `luotettava`, `näkökulma`.
- **محیط زیست و سیاست عمومی:** `ilmasto`, `energiatehokkuus`, `päästö`, `päätöksenteko`.
- **فرایند و مدیریت:** `hankinta`, `tavoite`, `johtaminen`, `resurssi`.
- **هویت و فرهنگ:** `identiteetti`, `perinne`, `muutos`, `moninaisuus`.
- **Formulae:** `Näkemykseni mukaan …`; `Tätä voidaan tulkita myös niin, että …`; `Yhtäältä … toisaalta …`; `Edellä esitetyn perusteella …`; `On mahdollista, että …`.
- **Frequency policy:** عبارت‌های ژانری، ساختارهای تأکیدی و واژه‌های معنایی دقیق را از متن‌های معتبر استخراج کن.

### C1 — کاربرد پیشرفتهٔ مستقل در بافت‌های گوناگون

- **گفتار دانشگاهی و پژوهش:** `menetelmä`, `johtopäätös`, `viite`, `tulkinta`.
- **قانون، خدمات و اجتماع:** `lainsäädäntö`, `vastuullisuus`, `oikeudenmukaisuus`, `käytäntö`.
- **ادبیات و نقد هنری:** `kerronta`, `symboli`, `metafora`, `tyyli`.
- **تصمیم‌گیری حرفه‌ای:** `strategia`, `päätös`, `peruste`, `vaihtoehto`.
- **Formulae:** `Olennaista on tarkastella sitä, miten …`; `Edellä mainitusta huolimatta …`; `Tämä herättää kysymyksen siitä, …`; `Ilmiö voidaan ymmärtää usealla tavalla.`; `Mikäli oletetaan, että …`.
- **Frequency policy:** از سقف عددی واژگان صرف‌نظر کن: تسلط بر کاربرد حرفه‌ای، ژانر، تنوع سبکی و دقت معنایی مهم‌تر از رتبهٔ Parole است.

### C2 — دقت، ظرافت و کنترل کامل ارتباط پیچیده

- **متون تخصصی و فناورانه:** `tutkimustieto`, `monitulkintainen`, `perustelu`, `tarkkuus`.
- **سبک و فرهنگ:** `ironia`, `viittaus`, `kerronnallinen`, `sävy`.
- **میانجی‌گری پیچیده:** `ristiriita`, `tulkintakehys`, `sovittelu`, `taustaoletus`.
- **بازنویسی حرفه‌ای:** `vivahde`, `johdonmukaisuus`, `täsmällisyys`, `painotus`.
- **Formulae:** `Se, mitä lausumatta jää, on tässä yhtä olennaista kuin …`; `Tarkastelutavasta riippuen …`; `Väitteen taustalla näyttää olevan oletus, että …`; `Tämä tulkinta ei yksin riitä selittämään …`; `Sanavalinta muuttaa merkitysvivahdetta.`.
- **Frequency policy:** در C2 فهرست واژهٔ پایان‌یافتنی وجود ندارد؛ ارزیابی بر شواهد عملکردی و دامنهٔ ژانری استوار باشد.

## Proposed lexical coverage sidecar (not yet a migrated runtime schema)

A future lexeme/form coverage table should record these separate fields. Until a compatible schema and migration have been reviewed, **do not modify existing `data/common-words.json` fields**:

| Field | Meaning |
| --- | --- |
| `lexeme_id`, `sense_id` | Stable identity and intended sense of an entry |
| `surface_form`, `morphological_features` | The actual Finnish form and case/tense/person features |
| `frequency_status`, `source_position` | Source-backed/ranked/gap/unranked; no fabricated rank |
| `topic_ids`, `expression_id` | Topic and expression membership; many-to-many |
| `first_introduced_level`, `introduced_lesson_id` | Authored stage + an actual reviewed lesson (never assumed from plans alone) |
| `review_level_ids` | Where real activities revisit a target |
| `recognition_evidence`, `production_evidence` | Different evidence for receptive and productive knowledge |
| `source_id`, `review_status` | Provenance and editorial verification |

## Recycling and quality assurance

- **First exposure:** introduce a useful form in a context with audio and a trustworthy Persian meaning.
- **Recognition:** choose or identify it in a new example without displaying the same prompt.
- **Retrieval:** recall the form independently, not only after a multiple-choice hint.
- **Context transfer:** use it in a distinct sentence, dialogue or relevant inflection.
- **Scheduled repetition:** revisit by actual learner performance rather than treating a lesson as the last exposure.
- **Proficiency check:** reading, listening and production are distinct skills; available automatic tasks do not certify all of them.

The curriculum's existing `high_frequency_targets` and `topic_targets` for A1.1–A1.3 are **plans**, while implemented section JSON files are the source of the learner-facing content. The audit command counts authored targets separately from shipped lessons. The existing [A1.2 gap inventory](../data/course/a1.2-vocabulary-gap.json) remains a useful trace for Parole-backed versus currently available items.

## Frequency and measurement rules

- Never estimate percentage of Finnish understood from the number of words or from a raw list of ranks.
- A Parole `frequency_percent` sum is only an **approximate written-corpus token coverage** of the matching recorded forms. It is not learner skill, recognition or CEFR attainment.
- Never calculate Parole coverage by substituting Universal Dependencies frequency counts.
- Never assign a rank to an expression or curated word simply because it appears in the course.
- If the application dictionary increases, rebuild source-backed vocabulary through its established Parole generator and update the related UD/translation artifacts.

## Implementation gate for future stages

When authoring a new stage: (1) identify the planned topic/grammar prerequisite, (2) reuse high-priority reviewed lexemes, (3) add required curated terms with provenance, (4) create explicit bilingual examples and accepted answer variants, (5) connect each item to a real lesson only when shipped, (6) update the lexical implementation inventory and associated tests. Current stage-level source-position ceilings are advisory and should be recalibrated from learner evidence; no fixed number constitutes CEFR mastery.

## References

- [Council of Europe CEFR illustrative descriptors and 2020 Companion Volume](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)
- [Finnish National Agency for Education evolving proficiency scale](https://www.oph.fi/fi/koulutus-ja-tutkinnot/kehittyvan-kielitaidon-tasojen-kuvausasteikko)
- [University of Helsinki Finnish course contents](https://www.helsinki.fi/en/language-centre/teaching-and-research/finnish-foreigners/course-materials-objectives-and-contents)
- [Institute for the Languages of Finland grammar overview](https://kotus.fi/kotus/kielet-ja-kielipolitiikka/kansalliskielet/suomen-kieli/)
