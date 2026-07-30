# Finnish Learning

**[Open the live app](https://amirmojiry.github.io/finnish-learning/)**

[نسخه فارسی](README.fa.md)

A lightweight, mobile-friendly web app for learning and practicing Finnish vocabulary with Persian translations.

## Current features

- 100 high-frequency Finnish word forms with Persian translations
- three exercise modes:
  - choose the Persian translation
  - complete a Finnish sentence with four choices
  - type the missing Finnish word
- three progressive hints in typing mode: first letter, last letter, and second letter
- two Finnish example sentences and Persian translations for every word
- random use of either example sentence in exercises
- Finnish part of speech and dictionary base form (`lemma`) for every entry
- browser-based Finnish text-to-speech
- score and selected exercise mode saved locally in the browser
- responsive Persian interface using Vazirmatn
- keyboard shortcuts for multiple-choice exercises

The vocabulary data is stored in [`data/common-words.json`](data/common-words.json).

## Vocabulary data

Each entry includes:

- frequency rank
- Finnish word form
- Persian translation
- part of speech in English and Persian
- dictionary base form (`lemma`)
- two Finnish examples with Persian translations

The ranking is based on the OpenSubtitles-oriented Finnish frequency list published on Wiktionary. Because it is corpus-based, it contains inflected forms such as `olen`, `oli`, and `minulle`, not only dictionary headwords.

## Run locally

The app loads its vocabulary with `fetch`, so use a local HTTP server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Roadmap

### Phase 1 — smarter review

- [ ] spaced-repetition review queue
- [ ] mastery score and answer history for each word
- [ ] focused practice for weak or frequently missed words
- [ ] filters by frequency range, part of speech, and lemma
- [ ] word details after each answer: lemma, part of speech, and both examples
- [ ] session length and difficulty settings

### Phase 2 — more exercise types

- [ ] reverse translation from Persian to Finnish
- [ ] listening and dictation exercises using Finnish text-to-speech
- [ ] sentence-ordering exercises
- [ ] verb conjugation exercises
- [ ] Finnish case-form exercises for pronouns and nouns
- [ ] pronunciation practice with speech recognition where browser support is available

### Phase 3 — personal learning app

- [ ] daily goal, streak, and progress dashboard
- [ ] import and export learning progress
- [ ] bookmarks and custom word lists
- [ ] larger decks: 500, 1,000, and topic-based words
- [ ] installable Progressive Web App
- [ ] offline exercises through a service worker
- [ ] accessibility audit and improved screen-reader support

The roadmap prioritizes retrieval practice and distributed review for retention. PWA installation, offline use, and optional speech recognition are planned as progressive enhancements because browser support differs across devices.

## References used for the roadmap

- [Distributed practice in second-language learning](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/effects-of-distributed-practice-on-second-language-fluency-development/4F6787916C198376CAD222934D3B37E4)
- [MDN: Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN: Offline and background operation](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation)
- [MDN: Using the Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API)
