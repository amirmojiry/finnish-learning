# Changelog

All notable changes to Finnish Learning are documented in this file.

The project follows [Semantic Versioning](docs/VERSIONING.md).

## [Unreleased]

## [1.3.0] - 2026-08-01

- Describe the release changes here.

## [1.2.1] - 2026-07-31

### Fixed

- Profile and Settings are separate views again: spaced repetition and learning progress live in Profile, while Settings contains only appearance controls and the About link.
- The bottom and desktop navigation now expose both Profile and Settings without restoring a separate About navigation item.

### Added

- Regression coverage that prevents review content from being placed in Settings and prevents appearance or About controls from being placed in Profile.

## [1.2.0] - 2026-07-31

### Added

- A clickable reviewed-word history in settings with per-word accuracy, review state, and direct links to dictionary details.
- Approximate reviewed and mastered token coverage calculated from the original Parole frequency percentages.
- Review-status cards on dictionary detail pages for words that have entered spaced repetition.

### Changed

- The primary navigation now contains Home, Dictionary, and Settings; About is available from a compact button inside Settings.
- Appearance controls and the spaced-repetition dashboard now share the Settings view.
- The frequency-coverage message explicitly describes corpus token coverage and does not present it as a complete comprehension score.

### Removed

- The obsolete profile review mount helper and the separate Profile navigation label.

## [1.1.2] - 2026-07-31

### Changed

- The spaced-repetition dashboard now lives in the profile view together with appearance settings.
- The home view is again dedicated to the full-height exercise card and no longer needs an extra review-page scroll container.
- The legacy `#settings` URL continues to open the profile view for backward compatibility.

### Added

- Regression coverage for profile placement, script order, and isolation of the mobile home layout.

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
