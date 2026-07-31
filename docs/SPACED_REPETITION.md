# Spaced repetition

The review queue is implemented in `spaced-repetition.js` and stores learner progress locally under `fiSrsProgressV1`.

## Queue selection

- Previously reviewed words whose `dueAt` is in the past are selected first.
- Due words are ordered by the oldest due time and then by vocabulary rank.
- Unseen words fill the remaining session slots in frequency-rank order.
- A session contains at most 20 words.
- At most 10 unseen words can be introduced during one local calendar day.

The daily new-word counter changes only after the learner answers a previously unseen word. Starting and abandoning a session does not consume the daily allowance.

## Scheduling

A correct answer uses these initial intervals:

1. first correct answer: 1 day
2. second consecutive correct answer: 3 days
3. later correct answers: the previous interval multiplied by the current ease factor, rounded and capped at 365 days

A correct answer slightly raises the ease factor up to 3.0. An incorrect answer resets consecutive repetitions, reduces the ease factor down to a minimum of 1.3, increments the lapse count, and schedules a retry after 10 minutes.

A word is shown as mastered after at least three successful repetitions and an interval of at least 21 days.

## Storage schema

Progress is stored as an object with:

- `version`: storage schema version
- `words`: records keyed by the Unicode-normalized lowercase surface form
- `dailyNew`: local date and the number of unseen words answered on that date

Each word record contains repetitions, interval, ease factor, due time, first and last review times, total and correct answer counts, and lapses.

Surface forms are used as keys instead of display ranks so appending positions 201–300 does not invalidate existing progress. Changing or removing a surface form requires an explicit migration.

Malformed or unsupported values are sanitized before use. Invalid JSON falls back to an empty progress object instead of preventing the app from loading.

## Reviewed-word history

The Started statistic is an interactive control. It opens a list of all vocabulary forms with at least one recorded review answer, ordered by the most recent review time. Each list item shows the current learning state, total answer count, accuracy, and a direct route to the dictionary detail page.

Dictionary detail pages receive a review-status card only after the word has entered spaced repetition. The card distinguishes learning, due, and mastered states and shows answer accuracy and the latest review date.

## Frequency coverage

Reviewed coverage is the sum of `frequency_percent` for every reviewed surface form. Mastered coverage uses the same calculation but includes only records that satisfy the mastery rule.

These values estimate token coverage in the written Finnish Parole corpus. They must be presented as approximate corpus coverage, not as a literal percentage of language comprehension, vocabulary size, or communicative ability.

## Browser integration

The review panel is mounted directly in the Profile view. Profile contains the review queue, reviewed-word history, per-word progress summary, and frequency coverage.

Settings is a separate view containing only the light/dark appearance controls and a compact link to About. The bottom navigation contains Home, Dictionary, Profile, and Settings; About is not a primary navigation item.

Starting a review uses the existing focused-practice functions, so all three exercise modes keep their current answer rendering and feedback behavior. Only answers submitted while a review session is active update the spaced-repetition schedule; normal free practice continues to update the general score without altering review timing.

## Required validation

Run:

```bash
npm test
```

The tests cover interval progression, incorrect-answer retries, due-word priority, daily new-word limits, progress summaries, frequency coverage, reviewed-word ordering, per-word status, malformed storage, separate Profile and Settings placement, navigation contracts, asset loading order, and the public app functions used by the integration.
