# Changelog

All notable changes to Finnish Learning are documented in this file.

The project follows [Semantic Versioning](docs/VERSIONING.md).

## [Unreleased]

## [1.6.0] - 2026-10-03

### Added

- A fully implemented curriculum-driven A1.1 Section 1 with ten learner-facing lessons covering first contact and survival Finnish.
- Learner-facing lesson summaries, concise grammar/help notes, explicit curriculum-target mappings, and deterministic review-only practice.
- A four-section A1.1 course catalog in the UI, with Section 1 available and Sections 2–4 shown as upcoming.

### Changed

- The course engine now loads and validates the machine-readable curriculum alongside the implemented lesson data.
- Section 1 progression keeps the existing local lesson IDs for progress compatibility while binding every lesson to its stable curriculum ID.
- The old prototype topic mix has been replaced by the actual Section 1 sequence: greetings, introductions, wellbeing, simple negation, basic questions, politeness, communication repair, demonstratives, mini-dialogues, and a checkpoint.


## [1.5.0] - 2026-10-03

### Added

- A complete machine-readable A1.1 curriculum contract with four sections and forty ordered lessons.
- English and Persian A1.1 curriculum specifications covering communicative outcomes, frequency vocabulary, topic vocabulary, useful expressions, grammar, recycling, skills, and assessment criteria.
- Regression coverage for curriculum structure, prototype lineage, explicit Finnish inflection, lexical-target counts, and preservation of prototype learning targets.

### Changed

- The ten-lesson A1.1 prototype is now explicitly mapped into the complete curriculum without silently dropping existing learning targets.
- Lexical target guidance is advisory, while every lesson declares an exact machine-validated lexical target count.


## [1.4.1] - 2026-08-03

### Fixed

- Keep all five mobile navigation items inside the bottom navigation bar, including Settings on narrow screens.

### Changed

- Restyle the desktop header as a compact responsive navigation surface with clearer active and hover states.
- Remove the raw vocabulary JSON link from the primary desktop navigation.

## [1.4.0] - 2026-08-03

### Added

- A new A1.1 course view with a complete ten-lesson sample section and fifteen deterministic activities per lesson.
- Sequential lesson unlocking, local course progress, lesson scores, listening prompts, typed production, and topic-aware curated content.
- A reviewed static lesson manifest combining introductory expressions, high-frequency forms, family vocabulary, and a ten-word animal collection.
- Regression coverage for course data, progression, answers, navigation, and asset integration.

### Changed

- Primary mobile navigation now exposes the course as a fifth destination.

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
