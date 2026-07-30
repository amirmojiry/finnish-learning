# Finnish Learning

A personal static website for learning and practicing Finnish.

## Current exercise

### 100 common Finnish words

The site displays a random Finnish word and four Persian translations. After answering, it shows:

- whether the answer was correct
- a Finnish example sentence
- the Persian translation of the example
- the saved score in the browser
- optional Finnish pronunciation through the browser's speech synthesis

The vocabulary data is stored in [`data/common-words.json`](data/common-words.json).

## Run locally

Because the page loads the JSON file with `fetch`, open it through a local HTTP server instead of opening `index.html` directly.

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## GitHub Pages

A deployment workflow is included at `.github/workflows/pages.yml`.

In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**. The site will then deploy after changes are pushed to `main`.

Expected URL:

`https://amirmojiry.github.io/finnish-learning/`

## Vocabulary source

The ranking is based on the OpenSubtitles-oriented Finnish frequency list published on Wiktionary. It reflects conversational language and includes inflected word forms, not only dictionary lemmas.
