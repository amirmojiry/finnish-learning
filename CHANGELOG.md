# Changelog

All notable changes to Finnish Learning are documented in this file.

The project follows [Semantic Versioning](docs/VERSIONING.md).

## [Unreleased]

## [1.1.1] - 2026-07-31

### Fixed

- The mobile home view now scrolls when the spaced-review panel is present, keeping the exercise card and all answer controls reachable.

## [1.1.0] - 2026-07-31

### Added

- A daily spaced-repetition review queue that prioritizes overdue words and introduces at most ten new words per local day.
- Persistent per-word scheduling data in local storage, including interval, ease factor, answer totals, lapses, and the next review time.
- Review status cards for due, new, started, and mastered vocabulary.
- Regression tests for scheduling intervals, retry behavior, daily limits, queue ordering, progress summaries, storage recovery, and browser integration contracts.
- Two-sentence descriptions for every roadmap item in both English and Persian documentation.

## [1.0.0] - 2026-07-31

### Added

- A versioned baseline for the 200-word Finnish learning application.
- Corpus-based UD analysis, feature-specific examples, and dominant part-of-speech labels.
- Automated data, UI contract, and deployment regression tests.
- Repository-wide AI contribution rules.

### Fixed

- Dictionary part-of-speech filters now contain only categories used by the current vocabulary.
