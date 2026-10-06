# Changelog

All notable changes to Finnish Learning are documented in this file.

The project follows [Semantic Versioning](docs/VERSIONING.md).

## [Unreleased]

## [1.21.0] - 2026-10-06

### Added

- Bounded chronological A1.1 course-answer history with stable sequence numbers, timestamps, and separate session identity.
- Per-answer mastery evidence for activity type/mode, productive-vs-recognition retrieval, response time, source lesson, and typed exact/fuzzy/diacritic-adjusted grading when available.
- Deterministic target-history queries and focused-practice source-lesson provenance for future mastery logic.

### Changed

- Course progress remains backward compatible while retaining the newest 5,000 answer events in local storage to prevent unbounded growth.
- The Phase 2 A1.1 richer-practice roadmap is now complete.


## [1.20.0] - 2026-10-06

### Added

- Aggregate per-target A1.1 course performance tracking, scoped by section and stored with existing local course progress.
- Section-level focused practice for targets below 80% aggregate accuracy, built only from existing reviewed graded activities in completed lessons.
- A focused-practice card that surfaces the weak-target count and a small preview of the Finnish targets selected for review.

### Changed

- Graded course activities now update target-level correctness aggregates while preserving the existing lesson score and unlocking behavior.
- Focused-practice sessions update weak-target evidence but never complete or unlock lessons.


## [1.19.1] - 2026-10-06

### Fixed

- Replace the legacy A1.1 week-day sequence interaction with the reversible answer-builder pattern and explicit submission.
- Dismiss an open lesson popover when the learner clicks elsewhere on the section page while preserving clicks inside the lesson node or popover.
- Keep the first row of the 0–20 reference grid fully visible on mobile by top-aligning long scrollable lesson content.


## [1.19.0] - 2026-10-06

### Added

- First-lesson jump entry points for every implemented A1.1 section, even when earlier sections are incomplete.
- Per-section progress bars inside the expandable section selector.
- A visibility-aware floating control that scrolls to the current learnable lesson and points up or down toward it.

### Changed

- Completing a jumped-to section entry lesson unlocks earlier sections for backfill without marking skipped lessons complete.
- Once a section has been started through its jump entry point, its later lessons continue to unlock sequentially from completed prerequisites.


## [1.18.1] - 2026-10-06

### Changed

- Refresh the Persian About page to describe the current structured A1.1 course, Word Practice / Smart Review, Dictionary, Finnish speech requirements, and current release statistics.
- Replace legacy vocabulary-practice framing and outdated About-page statistics with the current 40-lesson, 15-activity-per-lesson experience.


## [1.18.0] - 2026-10-06

### Added

- A dedicated Word Practice destination that owns Smart Review, reviewed-word history, coverage, and mastery summaries.
- Live Finnish speech-voice status in Settings, including detected voice name, retry, `voiceschanged` refresh, and device-specific setup guidance.
- Distraction-free lesson mode with a compact close control, integrated progress count, and viewport-fixed primary answer feedback.

### Changed

- Primary navigation is now Course, Dictionary, Word Practice, and Settings.
- Mobile bottom navigation is icon-only; labels remain available through accessible names.
- Smart Review rotates internally across translation, multiple-choice cloze, and typed cloze instead of exposing the legacy free-practice mode selector.
- Lesson activity count is shown inside the progress bar and the separate lesson header/back button is removed.

### Removed

- Legacy Home and Profile destinations.
- Per-word “practice this word” actions from dictionary detail pages.
- Legacy user-selectable free-practice mode UI.


## [1.17.0] - 2026-10-05

### Added

- Reviewed `morphology_practice` manifests for morphology-relevant A1.1 lessons and checkpoints.
- `morphology-choice` activities with explicit same-pattern Finnish distractor forms.
- `inflection-production` activities with explicit accepted forms, strict grammatical-form grading, and tolerance only for Finnish keyboard diacritic substitutions.
- Introductory practice for selected elative, inessive, partitive, genitive, adessive, present-tense person, and negative/connegative forms.
- Regression coverage for morphology manifests, safe target replacement, checkpoints, choice interaction, typed inflection, and malformed data.

### Changed

- Morphology exercises replace only an assessment that already references the same declared lesson target.
- Morphology-choice answer positions are intentionally varied so the correct form is not predictable by button position.
- Morphology-choice answer positions are intentionally varied so the correct form is not predictable by button position.
- Finnish stems, suffixes, inflections, distractors, and accepted answers are never generated at runtime.
- Affected lessons and checkpoints still contain exactly 15 activities.


## [1.16.0] - 2026-10-05

### Added

- Device-level Finnish speech-voice detection using `speechSynthesis.getVoices()` and `voiceschanged`.
- Platform-aware guidance when Finnish text-to-speech is not installed.

### Changed

- Sentence-order practice now uses an answer box, a source-token pool, undo before grading, and an explicit submit action.
- Typed grading treats a/ä and o/ö substitutions as acceptable near-correct answers while retaining canonical Finnish spelling feedback.
- Listening and dictation explicitly select an installed `fi-*` speech voice and never silently fall back to another language.
- Audio activities remain skippable without a score penalty when a Finnish voice is unavailable.


## [1.15.0] - 2026-10-05

### Added

- Reviewed structured-practice manifests across all 40 A1.1 lessons.
- Sentence-order activities built from explicit Finnish tokens and answer order.
- Expression-completion activities with explicit Finnish prompts and accepted completions.
- Controlled sentence-production activities with Persian prompts, Finnish cues, and explicit expected answers.
- All three structured-practice families in every section checkpoint, including the final A1.1 checkpoint.
- Regression coverage for target preservation, malformed manifests, checkpoint coverage, and shared fuzzy grading.

### Changed

- A1.1 lessons still contain exactly 15 activities; structured practice replaces only an existing assessment of the same declared target.
- Structured typed practice reuses the existing >=80% fuzzy typed-answer grading and character-level feedback.


## [1.14.0] - 2026-10-05

### Added

- Explicit listening-recognition and dictation targets across all 40 A1.1 lessons, including every section checkpoint and the final checkpoint.
- Deterministic auditory-practice validation and regression coverage.
- Dictation playback that reuses the existing typed-answer fuzzy grading and character-level feedback.

### Changed

- Each A1.1 lesson still contains exactly 15 activities; auditory practice replaces lower-value recognition/review slots instead of extending lessons.
- Finnish browser speech synthesis is the current zero-dependency audio backend, while lesson manifests keep auditory targets explicit for future static or build-time-generated audio.
- Auditory activity injection now preserves unrelated lesson/checkpoint targets instead of replacing an arbitrary fallback slot.
- Browsers without the Web Speech API show an explicit unavailable-audio state and allow the learner to continue without grading the skipped auditory activity.


## [1.13.0] - 2026-10-05

### Added

- Persian-to-Finnish productive recall across all 40 A1.1 lessons.
- One explicit production target per lesson, including every section checkpoint and the final A1.1 checkpoint.
- Deterministic validation ensuring production prompts, accepted answers, and lesson scope are explicit and reviewed.

### Changed

- Selected recognition/review slots are replaced by productive recall while preserving the 15-activity-per-lesson contract.
- Production uses the existing 80% fuzzy-acceptance threshold and character-level typo feedback.


## [1.12.1] - 2026-10-05

### Changed

- Locked A1.1 sections can now be opened for preview while all of their lessons remain locked until prerequisites are completed.
- The section selector labels locked destinations as previewable instead of disabling them.


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
