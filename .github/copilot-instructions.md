# Copilot instructions

Read and follow the repository-root `AGENTS.md` before making any change.

The non-negotiable requirements are:

- Use English for code comments, identifiers, developer logs, commit messages, and workflow step names.
- Preserve the source-of-truth split between Parole frequency data, Universal Dependencies analysis, and curated Persian learning content.
- Never hardcode the vocabulary total in code, workflows, generators, or tests.
- Keep `README.md` and `README.fa.md` factually synchronized.
- Run `npm run sync` after version, vocabulary, asset, or documented-count changes.
- Run `npm test`; do not merge or deploy when any test fails.
- Add regression coverage for bug fixes and user-visible behavior.
- Keep dictionary POS options derived from the currently loaded vocabulary after UD POS synchronization.
