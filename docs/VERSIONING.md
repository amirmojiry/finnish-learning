# Versioning and releases

Finnish Learning uses Semantic Versioning in the form `MAJOR.MINOR.PATCH`.

- **PATCH**: bug fixes, content corrections, tests, documentation, and internal refactoring that do not change the public data schema.
- **MINOR**: backward-compatible features, new practice modes, new vocabulary ranges, or new optional data fields.
- **MAJOR**: incompatible data-schema changes, removed behavior, or migrations that require consumers to change.

## Source of truth

`VERSION` is the canonical application version. The same version must appear in:

- `package.json`
- the `app-version` metadata in `index.html`
- local CSS and JavaScript cache keys in `index.html`
- `CHANGELOG.md`
- the synchronized project-status blocks in both README files

Run `npm run sync` after changing data or metadata. Run `npm test` before committing.

## Bumping a version

Use one of these commands:

```bash
npm run version:patch
npm run version:minor
npm run version:major
```

The command updates `VERSION`, `package.json`, `CHANGELOG.md`, cache keys, the deployment marker, and both README status blocks. Replace the generated changelog placeholder with a useful release summary before merging.

## Vocabulary releases

Adding a new vocabulary range is normally a MINOR release. The application and tests derive the vocabulary count from `data/common-words.json`; do not encode totals such as 200 or 300 in application logic or test assertions. Human-facing titles and README status blocks are synchronized by `scripts/sync_project.py`.

## Deployment

GitHub Pages deployment has a mandatory validation job. A release must not deploy when any JavaScript contract test, data-integrity test, version check, documentation synchronization check, or Python syntax check fails.
