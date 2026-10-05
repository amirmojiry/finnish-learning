# Changelog

All notable changes to Finnish Learning are documented in this file.

The project follows [Semantic Versioning](docs/VERSIONING.md).

## [Unreleased]

## [1.12.0] - 2026-10-05

### Added

- A full-width expandable section selector for switching between unlocked A1.1 sections.
- Icon-only desktop navigation with accessible hover/focus tooltips.
- Character-level typed-answer difference feedback, including accepted near-matches at the 80% similarity threshold.

### Changed

- Lesson action cards now keep a stable large width with equal Continue and Details actions.
- Lesson path connectors are rendered outside opened lesson cards instead of continuing through them.
- Fuzzy accepted typed answers still surface their exact character differences for review.
- The obsolete end-of-lesson note about future review-algorithm integration was removed.


## [1.11.0] - 2026-10-05

### Added

- A circular numbered lesson path for every course section, connected with thick dashed links.
- A focused lesson action card that opens from a lesson node with a continue action and expandable lesson details.

### Changed

- Section lesson maps no longer expose full lesson cards by default; title, objective, summary, and grammar/help are revealed on demand.
- Completed, current, and locked lesson states are preserved in the compact path UI on desktop and mobile.


## [1.10.0] - 2026-10-04

### Added

- A fully implemented curriculum-driven A1.1 Section 4 covering home, fixed familiar locations, food and drink, basic wants and needs, a minimal café order, familiar animals, simple descriptions, and a short familiar-world text.
- Static pictogram recognition, supported location matching, animal categorization, four-sentence guided writing, and short-reading activities.
- A real A1.1 final checkpoint spanning first contact, personal information, time/routine, and home/basic-needs content, including a three-turn mini-dialogue and supported multi-sentence output.

### Changed

- The complete A1.1 path now contains all four sections and forty sequential learner-facing lessons.
- The final A1.1 checkpoint requires at least 80% first-attempt accuracy before it is marked complete.
- Guided writing now supports two to four sentences and dialogue ordering supports three to five turns.
- Phase 1 of the course-first roadmap is complete; subsequent work moves to richer A1.1 practice.


## [1.9.0] - 2026-10-04

### Added

- A fully implemented curriculum-driven A1.1 Section 3 covering day references, weekdays, whole-hour time, parts of the day, simple routines, practiced questions, explicit negation, asking when, and a short routine sequence.
- Dedicated learner activities for weekday ordering, analog whole-hour clock choice, explicit affirmative-to-negative transformation, five-event routine ordering, and three-sentence guided writing.
- Explicit learner-facing coverage of all five reviewed first-person connegative pairs from the Section 3 curriculum contract.

### Changed

- The course runtime now loads A1.1 Sections 1–3 and unlocks Section 3 only after all prior implemented sections are complete.
- Section 4 remains upcoming while the implemented course path now contains 30 sequential lessons.
- Section 3 keeps weekday, time, present-tense, question, directional, and negative forms explicit in static course data rather than synthesizing morphology at runtime.


## [1.8.0] - 2026-10-03

### Added

- A fully implemented curriculum-driven A1.1 Section 2 covering personal information, people, origin, languages, residence, family, possession, age, numbers 0–20, contact details, and a personal profile.
- Explicit cross-section recycling dependencies from Section 1 into Section 2.
- A dedicated learner-facing 0–20 number reference activity with deterministic follow-up practice.

### Changed

- The course runtime now supports multiple implemented sections instead of a single hard-coded section.
- Section 2 unlocks only after all ten Section 1 lessons are complete; Sections 3–4 remain upcoming.
- Course hashes, completion flow, and section selection now work across multiple implemented sections while preserving existing Section 1 progress IDs.
- Required Finnish inflected forms and typed accepted answers remain explicit in static lesson data rather than being generated at runtime.


## [1.7.0] - 2026-10-03

### Changed

- The application now opens on the Course view by default.
- Course navigation is visually icon-only while retaining the accessible name “دوره”.
- Section goals, section outcomes, lesson objectives, summaries, and grammar notes are collapsed behind compact info controls by default.
- “در پایان این بخش می‌توانی” now lives inside the main Section 1 information disclosure instead of a separate card.
- Lesson and review action buttons use stable desktop sizing independent of explanatory content height.

### Removed

- Learner-facing roadmap and implementation-oriented copy that distracted from the learning flow.


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
