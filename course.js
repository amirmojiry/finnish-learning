(function attachCourse(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinnishCourse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCourseApi() {
  'use strict';

  const STORAGE_KEY = 'fiCourseProgressV1';
  const SCHEMA_VERSION = 1;
  const COURSE_STAGES = [
    {
      level: 'A1.1',
      curriculumUrl: './data/course/a1.1-curriculum.json',
      sectionUrls: [
        './data/course/a1.1-section-1.json',
        './data/course/a1.1-section-2.json',
        './data/course/a1.1-section-3.json',
        './data/course/a1.1-section-4.json',
      ],
    },
    {
      level: 'A1.2',
      curriculumUrl: './data/course/a1.2-curriculum.json',
      sectionUrls: [
        './data/course/a1.2-section-1.json',
      ],
    },
  ];
  const SECTION_URLS = COURSE_STAGES[0].sectionUrls;
  const SECTION_URL = SECTION_URLS[0];
  const CURRICULUM_URL = COURSE_STAGES[0].curriculumUrl;
  const WEAK_TARGET_ACCURACY = 0.8;
  const FOCUSED_PRACTICE_LIMIT = 10;
  const ANSWER_HISTORY_LIMIT = 5000;
  const ANSWER_HISTORY_MAX_BYTES = 1000000;

  function normalizeAnswer(value) {
    return String(value || '')
      .normalize('NFC')
      .toLocaleLowerCase('fi-FI')
      .trim()
      .replace(/[?.!,;:،؛؟]+$/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function historyString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  function utf8ByteLength(value) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    let bytes = 0;
    for (const character of text) {
      const codePoint = character.codePointAt(0);
      if (codePoint <= 0x7f) bytes += 1;
      else if (codePoint <= 0x7ff) bytes += 2;
      else if (codePoint <= 0xffff) bytes += 3;
      else bytes += 4;
    }
    return bytes;
  }

  function trimAnswerHistoryToBudget(history) {
    let retained = Array.isArray(history) ? history.slice(-ANSWER_HISTORY_LIMIT) : [];
    if (!retained.length || utf8ByteLength(retained) <= ANSWER_HISTORY_MAX_BYTES) return retained;

    let low = 0;
    let high = retained.length;
    while (low < high) {
      const midpoint = Math.floor((low + high) / 2);
      if (utf8ByteLength(retained.slice(midpoint)) <= ANSWER_HISTORY_MAX_BYTES) high = midpoint;
      else low = midpoint + 1;
    }
    retained = retained.slice(low);
    return utf8ByteLength(retained) <= ANSWER_HISTORY_MAX_BYTES ? retained : [];
  }

  function sanitizeAnswerHistoryEvent(event, fallbackSequence = 1) {
    if (!event || typeof event !== 'object') return null;
    const sessionId = historyString(event.sessionId);
    const sectionId = historyString(event.sectionId);
    const activityType = historyString(event.activityType);
    const answeredAt = Number(event.answeredAt);
    if (!sessionId || !sectionId || !activityType || !Number.isFinite(answeredAt) || answeredAt < 0) return null;

    const rawSequence = Math.floor(Number(event.sequence) || fallbackSequence);
    const sessionStartedAt = Number(event.sessionStartedAt);
    const responseMs = Math.max(0, Math.floor(Number(event.responseMs) || 0));
    return {
      sequence: Math.max(1, rawSequence),
      answeredAt,
      sessionId,
      sessionStartedAt: Number.isFinite(sessionStartedAt) && sessionStartedAt >= 0 ? sessionStartedAt : answeredAt,
      sessionType: event.sessionType === 'focused' ? 'focused' : 'lesson',
      sectionId,
      lessonId: historyString(event.lessonId),
      sourceLessonId: historyString(event.sourceLessonId),
      targetId: historyString(event.targetId),
      activityType,
      mode: historyString(event.mode),
      correct: event.correct === true,
      productive: event.productive === true,
      guided: event.guided === true,
      direction: historyString(event.direction),
      firstAttempt: event.firstAttempt !== false,
      responseMs,
      exact: typeof event.exact === 'boolean' ? event.exact : null,
      fuzzy: event.fuzzy === true,
      diacriticAdjusted: event.diacriticAdjusted === true,
    };
  }

  function emptyProgress() {
    return {
      version: SCHEMA_VERSION,
      completedLessons: [],
      lessonScores: {},
      targetPerformance: {},
      answerHistory: [],
      lastLessonId: null,
    };
  }

  function sanitizeProgress(progress) {
    const clean = emptyProgress();
    if (!progress || typeof progress !== 'object' || progress.version !== SCHEMA_VERSION) return clean;
    const completed = Array.isArray(progress.completedLessons) ? progress.completedLessons : [];
    clean.completedLessons = [...new Set(completed.filter((value) => typeof value === 'string' && value))];
    const scores = progress.lessonScores && typeof progress.lessonScores === 'object' ? progress.lessonScores : {};
    for (const [lessonId, score] of Object.entries(scores)) {
      if (!lessonId || !score || typeof score !== 'object') continue;
      clean.lessonScores[lessonId] = {
        correct: Math.max(0, Math.floor(Number(score.correct) || 0)),
        graded: Math.max(0, Math.floor(Number(score.graded) || 0)),
        completedAt: Number.isFinite(score.completedAt) ? score.completedAt : 0,
      };
    }
    const targetPerformance = progress.targetPerformance && typeof progress.targetPerformance === 'object'
      ? progress.targetPerformance
      : {};
    for (const [targetKey, stats] of Object.entries(targetPerformance)) {
      if (!targetKey || !stats || typeof stats !== 'object') continue;
      const attempts = Math.max(0, Math.floor(Number(stats.attempts) || 0));
      if (!attempts) continue;
      const correct = Math.min(attempts, Math.max(0, Math.floor(Number(stats.correct) || 0)));
      clean.targetPerformance[targetKey] = {
        attempts,
        correct,
        lastAttemptAt: Number.isFinite(stats.lastAttemptAt) ? stats.lastAttemptAt : 0,
      };
    }
    const answerHistory = Array.isArray(progress.answerHistory) ? progress.answerHistory : [];
    clean.answerHistory = trimAnswerHistoryToBudget(
      answerHistory
        .map((entry, index) => sanitizeAnswerHistoryEvent(entry, index + 1))
        .filter(Boolean)
        .sort((left, right) => left.sequence - right.sequence || left.answeredAt - right.answeredAt),
    );
    clean.lastLessonId = typeof progress.lastLessonId === 'string' ? progress.lastLessonId : null;
    return clean;
  }

  function loadProgress(storage) {
    if (!storage || typeof storage.getItem !== 'function') return emptyProgress();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? sanitizeProgress(JSON.parse(raw)) : emptyProgress();
    } catch {
      return emptyProgress();
    }
  }

  function saveProgress(storage, progress) {
    const clean = sanitizeProgress(progress);
    if (!storage || typeof storage.setItem !== 'function') return clean;

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
      return clean;
    } catch {
      const history = clean.answerHistory;
      const withoutHistory = { ...clean, answerHistory: [] };
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(withoutHistory));
      } catch {
        return clean;
      }

      let best = withoutHistory;
      let low = 1;
      let high = history.length;
      while (low <= high) {
        const count = Math.floor((low + high) / 2);
        const candidate = { ...clean, answerHistory: history.slice(-count) };
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(candidate));
          best = candidate;
          low = count + 1;
        } catch {
          high = count - 1;
        }
      }
      return best;
    }
  }

  function resetProgress(storage) {
    return saveProgress(storage, emptyProgress());
  }

  function isLessonUnlocked(section, progress, lessonIndex) {
    if (!section || !Array.isArray(section.lessons) || lessonIndex < 0 || lessonIndex >= section.lessons.length) return false;
    if (lessonIndex === 0) return true;
    const clean = sanitizeProgress(progress);
    return clean.completedLessons.includes(section.lessons[lessonIndex - 1].id);
  }

  function isSectionComplete(section, progress) {
    if (!section || !Array.isArray(section.lessons) || !section.lessons.length) return false;
    const clean = sanitizeProgress(progress);
    return section.lessons.every((lesson) => clean.completedLessons.includes(lesson.id));
  }

  function isSectionUnlocked(sections, progress, sectionIndex) {
    if (!Array.isArray(sections) || sectionIndex < 0 || sectionIndex >= sections.length) return false;
    if (sectionIndex === 0) return true;
    return sections.slice(0, sectionIndex).every((entry) => isSectionComplete(entry, progress));
  }

  function isSectionStarted(section, progress) {
    if (!section || !Array.isArray(section.lessons) || !section.lessons.length) return false;
    return sanitizeProgress(progress).completedLessons.includes(section.lessons[0].id);
  }

  function isBackfillSectionUnlocked(sections, progress, sectionIndex) {
    if (!Array.isArray(sections) || sectionIndex < 0 || sectionIndex >= sections.length) return false;
    return sections.slice(sectionIndex + 1).some((entry) => isSectionStarted(entry, progress));
  }

  function isSectionAccessible(sections, progress, sectionIndex) {
    if (!Array.isArray(sections) || sectionIndex < 0 || sectionIndex >= sections.length) return false;
    return (
      isSectionUnlocked(sections, progress, sectionIndex)
      || isSectionStarted(sections[sectionIndex], progress)
      || isBackfillSectionUnlocked(sections, progress, sectionIndex)
    );
  }

  function isCourseLessonAccessible(sections, progress, sectionIndex, lessonIndex) {
    if (!Array.isArray(sections) || sectionIndex < 0 || sectionIndex >= sections.length) return false;
    const targetSection = sections[sectionIndex];
    if (!targetSection || !Array.isArray(targetSection.lessons) || lessonIndex < 0 || lessonIndex >= targetSection.lessons.length) return false;
    if (lessonIndex === 0) {
      const priorStageSections = sections.slice(0, sectionIndex).filter((entry) => (
        entry?.level && targetSection.level && entry.level !== targetSection.level
      ));
      if (
        priorStageSections.length
        && !priorStageSections.every((entry) => isSectionComplete(entry, progress))
        && !isSectionStarted(targetSection, progress)
      ) {
        return false;
      }
      return true;
    }
    if (isBackfillSectionUnlocked(sections, progress, sectionIndex)) return true;
    return isSectionAccessible(sections, progress, sectionIndex)
      && isLessonUnlocked(targetSection, progress, lessonIndex);
  }

  function passesLessonRequirement(lesson, correct, graded) {
    const threshold = Number(lesson?.passing_score || 0);
    if (!threshold) return true;
    if (!Number.isFinite(graded) || graded <= 0) return false;
    return Number(correct || 0) / graded >= threshold;
  }

  function recordLessonCompletion(progress, lessonId, correct, graded, now = Date.now()) {
    const clean = sanitizeProgress(progress);
    if (!clean.completedLessons.includes(lessonId)) clean.completedLessons.push(lessonId);
    const previous = clean.lessonScores[lessonId];
    const nextScore = {
      correct: Math.max(0, Math.floor(Number(correct) || 0)),
      graded: Math.max(0, Math.floor(Number(graded) || 0)),
      completedAt: now,
    };
    if (!previous || nextScore.correct > previous.correct || (nextScore.correct === previous.correct && nextScore.graded < previous.graded)) {
      clean.lessonScores[lessonId] = nextScore;
    }
    clean.lastLessonId = lessonId;
    return clean;
  }

  function targetPerformanceKey(sectionId, targetId) {
    const sectionKey = String(sectionId || '').trim();
    const targetKey = String(targetId || '').trim();
    return sectionKey && targetKey ? `${sectionKey}::${targetKey}` : '';
  }

  function recordTargetAttempt(progress, sectionId, targetId, correct, now = Date.now()) {
    const clean = sanitizeProgress(progress);
    const key = targetPerformanceKey(sectionId, targetId);
    if (!key) return clean;
    const previous = clean.targetPerformance[key] || { attempts: 0, correct: 0, lastAttemptAt: 0 };
    clean.targetPerformance[key] = {
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
      lastAttemptAt: Number.isFinite(now) ? now : Date.now(),
    };
    return clean;
  }

  function recordAnswerHistoryEvent(progress, event) {
    const clean = sanitizeProgress(progress);
    const lastSequence = clean.answerHistory.reduce((highest, entry) => Math.max(highest, entry.sequence), 0);
    const normalized = sanitizeAnswerHistoryEvent({ ...event, sequence: lastSequence + 1 }, lastSequence + 1);
    if (!normalized) return clean;
    clean.answerHistory.push(normalized);
    clean.answerHistory = trimAnswerHistoryToBudget(clean.answerHistory);
    return clean;
  }

  function answerHistoryForTarget(progress, sectionId, targetId) {
    const sectionKey = historyString(sectionId);
    const targetKey = historyString(targetId);
    if (!sectionKey || !targetKey) return [];
    return sanitizeProgress(progress).answerHistory.filter((entry) => (
      entry.sectionId === sectionKey && entry.targetId === targetKey
    ));
  }

  function courseSessionId(sectionId, sessionType, lessonId, startedAt, ordinal = 1) {
    const sectionKey = historyString(sectionId) || 'course';
    const lessonKey = historyString(lessonId) || 'session';
    const type = sessionType === 'focused' ? 'focused' : 'lesson';
    const started = Number.isFinite(Number(startedAt)) ? Math.max(0, Math.floor(Number(startedAt))) : 0;
    const sequence = Math.max(1, Math.floor(Number(ordinal) || 1));
    return `${sectionKey}:${type}:${lessonKey}:${started}:${sequence}`;
  }

  function activityPrimaryTargetId(activity) {
    if (!activity || typeof activity !== 'object') return null;
    if (activity.type === 'negative-transform') return activity.negative_item || null;
    if (activity.type === 'event-time-match') return activity.time_item || null;
    if (activity.type === 'prompt-choice') return activity.answer_item || null;
    if (activity.type === 'short-reading') return activity.question_item || null;
    if (activity.type === 'teach' || activity.type === 'number-grid') return null;
    return activity.item || null;
  }

  function isProductiveCourseActivity(activity) {
    return Boolean(activity && [
      'type',
      'production',
      'dictation',
      'expression-completion',
      'controlled-production',
      'inflection-production',
      'negative-transform',
      'guided-writing',
    ].includes(activity.type));
  }

  function courseActivityDirection(activity) {
    if (!activity) return null;
    if (activity.type === 'dictation') return 'audio-to-fi';
    if (activity.type === 'production' || activity.type === 'controlled-production' || activity.type === 'guided-writing') return 'fa-to-fi';
    if (activity.type === 'type') return activity.mode === 'cloze' ? 'context-to-fi' : 'fa-to-fi';
    if (activity.type === 'choice') {
      if (activity.mode === 'listen') return 'audio-to-fa';
      if (activity.mode === 'meaning') return 'fi-to-fa';
      return 'context-to-fi';
    }
    if (activity.type === 'expression-completion') return 'context-to-fi';
    if (activity.type === 'morphology-choice' || activity.type === 'inflection-production') return 'morphology-to-fi';
    if (activity.type === 'negative-transform') return 'fi-transform';
    if (activity.type === 'sentence-order') return 'fi-structure';
    return null;
  }

  function isGuidedCourseActivity(activity) {
    return Boolean(activity && ['controlled-production', 'guided-writing'].includes(activity.type));
  }

  function weakTargetsForSection(section, progress, limit = FOCUSED_PRACTICE_LIMIT) {
    if (!section || !section.id || !section.items || typeof section.items !== 'object') return [];
    const clean = sanitizeProgress(progress);
    const targets = [];
    for (const itemId of Object.keys(section.items)) {
      const stats = clean.targetPerformance[targetPerformanceKey(section.id, itemId)];
      if (!stats || stats.attempts < 1) continue;
      const missed = stats.attempts - stats.correct;
      const accuracy = stats.correct / stats.attempts;
      if (missed < 1 || accuracy >= WEAK_TARGET_ACCURACY) continue;
      targets.push({
        itemId,
        attempts: stats.attempts,
        correct: stats.correct,
        missed,
        accuracy,
        lastAttemptAt: stats.lastAttemptAt,
      });
    }
    targets.sort((left, right) => (
      left.accuracy - right.accuracy
      || right.attempts - left.attempts
      || right.lastAttemptAt - left.lastAttemptAt
      || left.itemId.localeCompare(right.itemId)
    ));
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : targets.length;
    return targets.slice(0, max);
  }

  function focusedActivityStrength(activity) {
    if (!activity) return 0;
    if (['production', 'dictation', 'controlled-production', 'inflection-production', 'negative-transform'].includes(activity.type)) return 5;
    if (activity.type === 'type' || activity.type === 'expression-completion') return 4;
    if (activity.type === 'sentence-order' || activity.type === 'morphology-choice') return 3;
    if (activity.type === 'choice' && activity.mode === 'listen') return 1;
    return 2;
  }

  function buildFocusedPracticeActivities(section, progress, limit = FOCUSED_PRACTICE_LIMIT) {
    if (!section || !Array.isArray(section.lessons)) return [];
    const max = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : FOCUSED_PRACTICE_LIMIT;
    if (!max) return [];

    const weakTargets = weakTargetsForSection(section, progress, Number.POSITIVE_INFINITY);
    if (!weakTargets.length) return [];
    const weakIds = new Set(weakTargets.map((entry) => entry.itemId));
    const completed = new Set(sanitizeProgress(progress).completedLessons);
    const candidates = new Map(weakTargets.map((entry) => [entry.itemId, []]));

    section.lessons.forEach((lesson, lessonIndex) => {
      if (!completed.has(lesson.id)) return;
      lesson.activities.forEach((activity, activityIndex) => {
        const targetId = activityPrimaryTargetId(activity);
        if (!targetId || !weakIds.has(targetId)) return;
        candidates.get(targetId).push({
          activity,
          strength: focusedActivityStrength(activity),
          lessonId: lesson.id,
          lessonIndex,
          activityIndex,
        });
      });
    });

    for (const entries of candidates.values()) {
      entries.sort((left, right) => (
        right.strength - left.strength
        || right.lessonIndex - left.lessonIndex
        || left.activityIndex - right.activityIndex
      ));
    }

    const selected = [];
    for (let round = 0; round < 2 && selected.length < max; round += 1) {
      for (const target of weakTargets) {
        const candidate = candidates.get(target.itemId)?.[round];
        if (!candidate) continue;
        selected.push({ ...candidate.activity, source_lesson_id: candidate.lessonId });
        if (selected.length >= max) break;
      }
    }
    return selected;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function makeCloze(example, surface) {
    const sentence = String(example || '');
    const target = String(surface || '').trim();
    if (!sentence || !target) return '_____';
    const pattern = new RegExp(escapeRegExp(target), 'iu');
    if (pattern.test(sentence)) return sentence.replace(pattern, '_____');
    return `_____ — ${sentence}`;
  }

  function acceptedAnswers(item) {
    const values = Array.isArray(item && item.accepted_answers) ? item.accepted_answers : [];
    return [...new Set([item && item.surface_form, ...values].map(normalizeAnswer).filter(Boolean))];
  }

  function foldFinnishDiacritics(value) {
    return normalizeAnswer(value)
      .replace(/ä/g, 'a')
      .replace(/ö/g, 'o');
  }

  function alignAnswers(enteredValue, expectedValue) {
    const entered = Array.from(normalizeAnswer(enteredValue));
    const expected = Array.from(normalizeAnswer(expectedValue));
    const rows = entered.length + 1;
    const cols = expected.length + 1;
    const dp = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let i = 0; i < rows; i += 1) dp[i][0] = i;
    for (let j = 0; j < cols; j += 1) dp[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const substitution = dp[i - 1][j - 1] + (entered[i - 1] === expected[j - 1] ? 0 : 1);
        dp[i][j] = Math.min(
          substitution,
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
        );
      }
    }

    const operations = [];
    let i = entered.length;
    let j = expected.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && entered[i - 1] === expected[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
        operations.unshift({ type: 'equal', entered: entered[i - 1], expected: expected[j - 1] });
        i -= 1;
        j -= 1;
        continue;
      }
      if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        operations.unshift({ type: 'replace', entered: entered[i - 1], expected: expected[j - 1] });
        i -= 1;
        j -= 1;
        continue;
      }
      if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
        operations.unshift({ type: 'delete', entered: entered[i - 1], expected: '' });
        i -= 1;
        continue;
      }
      operations.unshift({ type: 'insert', entered: '', expected: expected[j - 1] });
      j -= 1;
    }

    return { distance: dp[entered.length][expected.length], operations };
  }

  function answerSimilarity(enteredValue, expectedValue) {
    const entered = foldFinnishDiacritics(enteredValue);
    const expected = foldFinnishDiacritics(expectedValue);
    if (!entered && !expected) return 1;
    const length = Math.max(Array.from(entered).length, Array.from(expected).length);
    if (!length) return 0;
    return Math.max(0, 1 - (alignAnswers(entered, expected).distance / length));
  }

  function gradeTypedAnswer(item, answer) {
    const entered = normalizeAnswer(answer);
    const candidates = acceptedAnswers(item);
    if (!entered || !candidates.length) {
      return {
        accepted: false,
        exact: false,
        fuzzy: false,
        diacriticAdjusted: false,
        similarity: 0,
        entered,
        expected: candidates[0] || '',
        operations: [],
      };
    }

    let best = null;
    for (const expected of candidates) {
      const alignment = alignAnswers(entered, expected);
      const foldedEntered = foldFinnishDiacritics(entered);
      const foldedExpected = foldFinnishDiacritics(expected);
      const foldedAlignment = alignAnswers(foldedEntered, foldedExpected);
      const length = Math.max(Array.from(foldedEntered).length, Array.from(foldedExpected).length);
      const similarity = length ? Math.max(0, 1 - (foldedAlignment.distance / length)) : 1;
      const rawLength = Math.max(Array.from(entered).length, Array.from(expected).length);
      const rawSimilarity = rawLength ? Math.max(0, 1 - (alignment.distance / rawLength)) : 1;
      const candidate = {
        expected,
        similarity,
        rawSimilarity,
        operations: alignment.operations,
        diacriticAdjusted: alignment.distance !== foldedAlignment.distance,
      };
      if (
        !best
        || candidate.similarity > best.similarity
        || (candidate.similarity === best.similarity && candidate.rawSimilarity > best.rawSimilarity)
      ) {
        best = candidate;
      }
    }

    const exact = entered === best.expected;
    const accepted = exact || best.similarity >= 0.8;
    return {
      accepted,
      exact,
      fuzzy: accepted && !exact,
      diacriticAdjusted: accepted && best.diacriticAdjusted,
      similarity: best.similarity,
      entered,
      expected: best.expected,
      operations: best.operations,
    };
  }

  function gradeMorphologyAnswer(item, answer) {
    const entered = normalizeAnswer(answer);
    const candidates = acceptedAnswers(item);
    if (!entered || !candidates.length) {
      return {
        accepted: false,
        exact: false,
        fuzzy: false,
        diacriticAdjusted: false,
        similarity: 0,
        entered,
        expected: candidates[0] || '',
        operations: [],
      };
    }

    const exactExpected = candidates.find((expected) => entered === expected);
    if (exactExpected) {
      return {
        accepted: true,
        exact: true,
        fuzzy: false,
        diacriticAdjusted: false,
        similarity: 1,
        entered,
        expected: exactExpected,
        operations: alignAnswers(entered, exactExpected).operations,
      };
    }

    const diacriticExpected = candidates.find((expected) => (
      foldFinnishDiacritics(entered) === foldFinnishDiacritics(expected)
    ));
    if (diacriticExpected) {
      return {
        accepted: true,
        exact: false,
        fuzzy: true,
        diacriticAdjusted: true,
        similarity: 1,
        entered,
        expected: diacriticExpected,
        operations: alignAnswers(entered, diacriticExpected).operations,
      };
    }

    const nearest = gradeTypedAnswer(item, answer);
    return {
      ...nearest,
      accepted: false,
      exact: false,
      fuzzy: false,
      diacriticAdjusted: false,
    };
  }

  function isTypedAnswerCorrect(item, answer) {
    return gradeTypedAnswer(item, answer).accepted;
  }

  function optionLabel(item, mode) {
    if (!item) return '';
    return mode === 'meaning' || mode === 'listen' ? item.translation_fa : item.surface_form;
  }

  function toPersianNumber(value) {
    return new Intl.NumberFormat('fa-IR').format(value);
  }

  function speechApiAvailable(windowObject) {
    return Boolean(
      windowObject
      && windowObject.speechSynthesis
      && typeof windowObject.speechSynthesis.speak === 'function'
      && typeof windowObject.SpeechSynthesisUtterance === 'function'
    );
  }

  function findFinnishVoice(windowObject) {
    if (!speechApiAvailable(windowObject) || typeof windowObject.speechSynthesis.getVoices !== 'function') return null;
    let voices = [];
    try {
      voices = windowObject.speechSynthesis.getVoices() || [];
    } catch {
      return null;
    }
    return voices
      .filter((voice) => /^fi(?:-|$)/i.test(String(voice && voice.lang || '')))
      .sort((left, right) => Number(Boolean(right.localService)) - Number(Boolean(left.localService)))[0] || null;
  }

  function finnishSpeechStatus(windowObject) {
    if (!speechApiAvailable(windowObject)) {
      return { state: 'unsupported', voice: null, strategy: 'none' };
    }
    const voice = findFinnishVoice(windowObject);
    if (voice) return { state: 'ready', voice, strategy: 'voice' };
    return { state: 'ready', voice: null, strategy: 'language' };
  }

  function speechSettingsGuide(windowObject) {
    const userAgent = String(windowObject?.navigator?.userAgent || '');
    if (/Windows/i.test(userAgent)) {
      return 'در Windows به Settings → Time & language → Language & region برو، Finnish را اضافه کن و در Language options بخش Text-to-speech را نصب کن. راه دیگر: Win+Ctrl+N → Add legacy voices → Add voices → Finnish. سپس مرورگر را کامل ببند و دوباره باز کن.';
    }
    if (/Macintosh|Mac OS X/i.test(userAgent)) {
      return 'در macOS به System Settings → Accessibility → Read & Speak برو، کنار System voice صداهای بیشتر را باز کن و یک صدای Finnish را دانلود کن. سپس مرورگر را دوباره باز کن.';
    }
    return 'در تنظیمات Text-to-Speech دستگاه، یک صدای Finnish / fi-FI را نصب یا فعال کن و بعد مرورگر را دوباره باز کن.';
  }

  function supportsSpeech(windowObject) {
    return finnishSpeechStatus(windowObject).state === 'ready';
  }

  function playSpeech(windowObject, text) {
    if (!text) return false;
    const status = finnishSpeechStatus(windowObject);
    if (status.state !== 'ready') return false;
    try {
      windowObject.speechSynthesis.cancel();
      const utterance = new windowObject.SpeechSynthesisUtterance(text);
      if (status.voice) utterance.voice = status.voice;
      utterance.lang = 'fi-FI';
      utterance.rate = 0.82;
      windowObject.speechSynthesis.speak(utterance);
      return true;
    } catch {
      return false;
    }
  }


  function uniqueOptions(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function buildStandardActivities(targets, previousTargets = []) {
    if (!Array.isArray(targets) || targets.length < 1 || targets.length > 6) {
      throw new Error('A standard lesson must define between one and six practice targets.');
    }
    const reviewTargets = uniqueOptions(previousTargets.slice().reverse().filter((id) => !targets.includes(id)));
    const optionPool = uniqueOptions([...targets, ...reviewTargets]);
    let choiceIndex = 0;
    const optionsFor = (itemId) => {
      const alternatives = optionPool.filter((candidate) => candidate !== itemId).slice(0, 3);
      const options = alternatives.slice();
      const answerIndex = choiceIndex % Math.min(4, alternatives.length + 1);
      options.splice(answerIndex, 0, itemId);
      choiceIndex += 1;
      return options;
    };

    const activities = [];
    for (const target of targets) {
      activities.push({ type: 'teach', item: target });
      activities.push({ type: 'choice', mode: 'meaning', item: target, options: optionsFor(target) });
    }

    const remaining = 15 - activities.length;
    const gradedModes = remaining <= 3
      ? [['choice', 'listen'], ['type', 'finnish'], ['type', 'cloze']]
      : [['choice', 'finnish'], ['choice', 'listen'], ['choice', 'cloze'], ['type', 'finnish'], ['type', 'cloze']];
    let cursor = 0;
    while (activities.length < 15) {
      const useReview = reviewTargets.length && cursor % 3 === 2;
      const item = useReview
        ? reviewTargets[cursor % reviewTargets.length]
        : targets[cursor % targets.length];
      const [type, mode] = gradedModes[cursor % gradedModes.length];
      activities.push(
        type === 'choice'
          ? { type, mode, item, options: optionsFor(item) }
          : { type, mode, item },
      );
      cursor += 1;
    }
    return activities.slice(0, 15);
  }

  function buildCheckpointActivities(section, lesson) {
    const targets = Array.isArray(lesson.checkpoint_targets) ? lesson.checkpoint_targets : [];
    const modes = Array.isArray(lesson.checkpoint_modes) ? lesson.checkpoint_modes : [];
    if (targets.length !== 15 || modes.length !== 15) {
      throw new Error('The checkpoint lesson must define fifteen targets and modes.');
    }
    const allIds = Object.keys(section.items);
    return targets.map((itemId, index) => {
      const [type, mode] = modes[index];
      if (type === 'type') return { type, mode, item: itemId };
      const options = [itemId];
      for (const candidate of allIds) {
        if (candidate !== itemId && !options.includes(candidate)) options.push(candidate);
        if (options.length === 4) break;
      }
      const answer = options.shift();
      options.splice(index % 4, 0, answer);
      return { type, mode, item: itemId, options };
    });
  }

  function activityItemReferences(activity) {
    const refs = [];
    for (const key of ['item', 'answer_item', 'question_item', 'negative_item', 'affirmative_item', 'event_item', 'time_item']) {
      if (activity[key]) refs.push(activity[key]);
    }
    for (const key of ['items', 'turns', 'expected_items', 'options']) {
      if (Array.isArray(activity[key])) refs.push(...activity[key]);
    }
    return refs;
  }

  function auditoryLessonScope(lesson) {
    return uniqueOptions([
      ...(lesson.new_targets || []),
      ...(lesson.practice_targets || []),
      ...(lesson.checkpoint_targets || []),
      ...(lesson.review_targets || []),
      ...(lesson.curriculum_target_refs?.high_frequency || []),
      ...(lesson.curriculum_target_refs?.topic || []),
      ...(lesson.curriculum_target_refs?.expressions || []),
      ...lesson.activities.flatMap(activityItemReferences),
    ]);
  }

  function listeningOptionsFor(section, lesson, targetId) {
    const candidates = auditoryLessonScope(lesson)
      .filter((itemId) => itemId !== targetId && section.items[itemId]);
    if (candidates.length < 3) {
      for (const itemId of Object.keys(section.items)) {
        if (itemId !== targetId && !candidates.includes(itemId)) candidates.push(itemId);
        if (candidates.length >= 3) break;
      }
    }
    const options = candidates.slice(0, 3);
    options.splice((lesson.order - 1) % Math.min(4, options.length + 1), 0, targetId);
    return options;
  }

  function injectListeningActivities(section, lesson) {
    const targets = Array.isArray(lesson.listening_targets) ? lesson.listening_targets : [];
    if (targets.length !== 2) throw new Error(`Lesson ${lesson.id || '?'} must declare exactly two listening targets.`);
    const [recognitionTargetId, dictationTargetId] = targets;
    const declared = new Set(auditoryLessonScope(lesson));

    for (const targetId of targets) {
      const target = section.items[targetId];
      if (!target || !target.surface_form || !acceptedAnswers(target).length) {
        throw new Error(`Invalid listening target: ${lesson.id || '?'} / ${targetId}`);
      }
      if (!declared.has(targetId)) {
        throw new Error(`Listening target must belong to the explicit lesson scope: ${lesson.id} / ${targetId}`);
      }
    }

    let recognitionIndex = lesson.activities.findIndex((activity) => (
      activity.type === 'choice' && activity.mode === 'listen' && activity.item === recognitionTargetId
    ));
    if (recognitionIndex < 0) {
      recognitionIndex = lesson.activities.findLastIndex((activity) => (
        activity.type !== 'production'
        && activity.type !== 'dictation'
        && (activity.type === 'choice' || activity.type === 'visual-choice')
        && activity.item === recognitionTargetId
      ));
    }
    if (recognitionIndex < 0) {
      recognitionIndex = lesson.activities.findLastIndex((activity) => (
        activity.type === 'type' && activity.item === recognitionTargetId
      ));
    }
    if (recognitionIndex < 0) {
      throw new Error(`Lesson ${lesson.id} has no matching slot for listening target ${recognitionTargetId}.`);
    }
    lesson.activities[recognitionIndex] = {
      type: 'choice',
      mode: 'listen',
      item: recognitionTargetId,
      options: listeningOptionsFor(section, lesson, recognitionTargetId),
    };
    lesson.activities = lesson.activities.map((activity, index) => (
      index !== recognitionIndex && activity.type === 'choice' && activity.mode === 'listen'
        ? { ...activity, mode: 'finnish' }
        : activity
    ));

    let dictationIndex = lesson.activities.findLastIndex((activity, index) => (
      index !== recognitionIndex
      && activity.type !== 'production'
      && activity.type !== 'dictation'
      && (activity.type === 'choice' || activity.type === 'visual-choice')
      && activity.item === dictationTargetId
    ));
    if (dictationIndex < 0) {
      dictationIndex = lesson.activities.findLastIndex((activity, index) => (
        index !== recognitionIndex
        && activity.type === 'type'
        && activity.item === dictationTargetId
      ));
    }
    if (dictationIndex < 0) {
      throw new Error(`Lesson ${lesson.id} has no matching slot for dictation target ${dictationTargetId}.`);
    }
    lesson.activities[dictationIndex] = { type: 'dictation', item: dictationTargetId };
  }

  const STRUCTURED_PRACTICE_TYPES = ['sentence-order', 'expression-completion', 'controlled-production'];

  function injectStructuredPractice(section, lesson) {
    const specs = Array.isArray(lesson.structured_practice) ? lesson.structured_practice : [];
    if (!specs.length) throw new Error(`Lesson ${lesson.id || '?'} must declare structured practice.`);
    const declared = new Set(auditoryLessonScope(lesson));
    const usedIndices = new Set();

    for (const spec of specs) {
      if (!STRUCTURED_PRACTICE_TYPES.includes(spec.type)) {
        throw new Error(`Unknown structured practice type in ${lesson.id}: ${spec.type}`);
      }
      if (!section.items[spec.item] || !declared.has(spec.item)) {
        throw new Error(`Structured practice target must belong to the explicit lesson scope: ${lesson.id} / ${spec.item}`);
      }

      let replacementIndex = lesson.activities.findLastIndex((activity, index) => (
        !usedIndices.has(index)
        && activity.item === spec.item
        && (
          (activity.type === 'choice' && activity.mode !== 'listen')
          || activity.type === 'visual-choice'
        )
      ));
      if (replacementIndex < 0) {
        replacementIndex = lesson.activities.findLastIndex((activity, index) => (
          !usedIndices.has(index)
          && activity.item === spec.item
          && activity.type === 'type'
        ));
      }
      if (replacementIndex < 0) {
        throw new Error(`Lesson ${lesson.id} has no matching slot for structured practice target ${spec.item}.`);
      }

      lesson.activities[replacementIndex] = { ...spec };
      usedIndices.add(replacementIndex);
    }
  }

  const MORPHOLOGY_PRACTICE_TYPES = ['morphology-choice', 'inflection-production'];

  function injectMorphologyPractice(section, lesson) {
    const specs = Array.isArray(lesson.morphology_practice) ? lesson.morphology_practice : [];
    if (!specs.length) return;
    const declared = new Set(auditoryLessonScope(lesson));
    const usedIndices = new Set();

    for (const spec of specs) {
      if (!MORPHOLOGY_PRACTICE_TYPES.includes(spec.type)) {
        throw new Error(`Unknown morphology practice type in ${lesson.id}: ${spec.type}`);
      }
      if (!section.items[spec.item] || !declared.has(spec.item)) {
        throw new Error(`Morphology practice target must belong to the explicit lesson scope: ${lesson.id} / ${spec.item}`);
      }

      const matchesTarget = (activity) => (
        activity.item === spec.item
        || activity.negative_item === spec.item
        || activity.affirmative_item === spec.item
      );

      let replacementIndex = -1;
      if (spec.type === 'morphology-choice') {
        replacementIndex = lesson.activities.findLastIndex((activity, index) => (
          !usedIndices.has(index)
          && matchesTarget(activity)
          && (
            (activity.type === 'choice' && activity.mode !== 'listen')
            || activity.type === 'visual-choice'
            || activity.type === 'negative-transform'
          )
        ));
      } else {
        replacementIndex = lesson.activities.findLastIndex((activity, index) => (
          !usedIndices.has(index)
          && matchesTarget(activity)
          && activity.type === 'type'
        ));
      }

      if (replacementIndex < 0) {
        replacementIndex = lesson.activities.findLastIndex((activity, index) => (
          !usedIndices.has(index)
          && matchesTarget(activity)
          && (
            (activity.type === 'choice' && activity.mode !== 'listen')
            || activity.type === 'visual-choice'
            || activity.type === 'type'
            || activity.type === 'negative-transform'
          )
        ));
      }

      if (replacementIndex < 0) {
        throw new Error(`Lesson ${lesson.id} has no matching slot for morphology practice target ${spec.item}.`);
      }

      lesson.activities[replacementIndex] = { ...spec };
      usedIndices.add(replacementIndex);
    }
  }

  function injectProductionActivity(section, lesson) {
    const targets = Array.isArray(lesson.production_targets) ? lesson.production_targets : [];
    if (targets.length !== 1) throw new Error(`Lesson ${lesson.id || '?'} must declare exactly one production target.`);
    const targetId = targets[0];
    const target = section.items[targetId];
    if (!target || !target.translation_fa || !acceptedAnswers(target).length) {
      throw new Error(`Invalid production target: ${lesson.id || '?'} / ${targetId}`);
    }

    const declared = new Set([
      ...(lesson.new_targets || []),
      ...(lesson.practice_targets || []),
      ...(lesson.checkpoint_targets || []),
      ...(lesson.review_targets || []),
      ...(lesson.curriculum_target_refs?.high_frequency || []),
      ...(lesson.curriculum_target_refs?.topic || []),
      ...(lesson.curriculum_target_refs?.expressions || []),
      ...lesson.activities.flatMap(activityItemReferences),
    ]);
    if (!declared.has(targetId)) {
      throw new Error(`Production target must belong to the explicit lesson scope: ${lesson.id} / ${targetId}`);
    }

    let replacementIndex = -1;
    for (let index = lesson.activities.length - 1; index >= 0; index -= 1) {
      const activity = lesson.activities[index];
      if (activity.item === targetId && (activity.type === 'choice' || activity.type === 'type' || activity.type === 'visual-choice')) {
        replacementIndex = index;
        break;
      }
    }
    if (replacementIndex < 0) {
      const protectedTargets = new Set([
        ...(lesson.new_targets || []),
        ...(lesson.practice_targets || []),
        ...(lesson.checkpoint_targets || []),
        ...(lesson.curriculum_target_refs?.high_frequency || []),
        ...(lesson.curriculum_target_refs?.topic || []),
        ...(lesson.curriculum_target_refs?.expressions || []),
      ]);
      const meaningfulReferenceCounts = new Map();
      for (const activity of lesson.activities) {
        const refs = [];
        for (const key of ['item', 'answer_item', 'question_item', 'negative_item', 'affirmative_item', 'event_item', 'time_item']) {
          if (activity[key]) refs.push(activity[key]);
        }
        for (const key of ['items', 'turns', 'expected_items']) {
          if (Array.isArray(activity[key])) refs.push(...activity[key]);
        }
        for (const itemId of new Set(refs)) {
          meaningfulReferenceCounts.set(itemId, (meaningfulReferenceCounts.get(itemId) || 0) + 1);
        }
      }

      for (let index = lesson.activities.length - 1; index >= 0; index -= 1) {
        const activity = lesson.activities[index];
        if (activity.type !== 'choice' && activity.type !== 'type') continue;
        const itemId = activity.item;
        if (protectedTargets.has(itemId) && (meaningfulReferenceCounts.get(itemId) || 0) <= 1) continue;
        replacementIndex = index;
        break;
      }
    }
    if (replacementIndex < 0) throw new Error(`Lesson ${lesson.id} has no replaceable slot for production practice.`);

    lesson.activities = lesson.activities.map((activity, index) => (
      index === replacementIndex ? { type: 'production', item: targetId } : activity
    ));
  }

  function prepareSection(rawSection) {
    if (!rawSection || rawSection.schema_version !== 1 || !rawSection.items || !Array.isArray(rawSection.lessons)) {
      throw new Error('Invalid course section data.');
    }
    const section = {
      ...rawSection,
      items: { ...rawSection.items },
      lessons: rawSection.lessons.map((lesson) => ({ ...lesson })),
    };
    const seen = [];
    section.lessons.forEach((lesson, index) => {
      if (!Array.isArray(lesson.activities)) {
        if (index === section.lessons.length - 1 && Array.isArray(lesson.checkpoint_targets)) {
          lesson.activities = buildCheckpointActivities(section, lesson);
        } else {
          const practiceTargets = Array.isArray(lesson.new_targets) && lesson.new_targets.length
            ? lesson.new_targets
            : lesson.practice_targets;
          lesson.activities = buildStandardActivities(practiceTargets, seen);
        }
      } else {
        lesson.activities = lesson.activities.map((activity) => ({ ...activity }));
      }
      lesson.review_targets = Array.isArray(lesson.review_targets) ? lesson.review_targets : seen.slice(-3);
      injectProductionActivity(section, lesson);
      injectListeningActivities(section, lesson);
      injectStructuredPractice(section, lesson);
      injectMorphologyPractice(section, lesson);
      seen.push(...(lesson.new_targets || []));
    });
    return section;
  }

  function validateSection(rawSection) {
    const section = prepareSection(rawSection);
    if (section.lessons.length !== 10) throw new Error('The sample section must contain exactly ten lessons.');
    for (const lesson of section.lessons) {
      if (!lesson.id || !lesson.curriculum_id || !lesson.summary_fa || !lesson.grammar_fa || !Array.isArray(lesson.activities) || lesson.activities.length !== 15) {
        throw new Error(`Lesson ${lesson.id || '?'} is missing curriculum metadata or fifteen deterministic activities.`);
      }
      const productionActivities = lesson.activities.filter((activity) => activity.type === 'production');
      if (productionActivities.length !== 1 || productionActivities[0].item !== lesson.production_targets[0]) {
        throw new Error(`Lesson ${lesson.id} must contain exactly one declared Persian-to-Finnish production activity.`);
      }
      const listeningTargets = Array.isArray(lesson.listening_targets) ? lesson.listening_targets : [];
      const listeningActivities = lesson.activities.filter((activity) => activity.type === 'choice' && activity.mode === 'listen');
      const dictationActivities = lesson.activities.filter((activity) => activity.type === 'dictation');
      if (
        listeningTargets.length !== 2
        || listeningActivities.length !== 1
        || dictationActivities.length !== 1
        || listeningActivities[0].item !== listeningTargets[0]
        || dictationActivities[0].item !== listeningTargets[1]
      ) {
        throw new Error(`Lesson ${lesson.id} must contain one declared listening-recognition activity and one declared dictation activity.`);
      }
      const structuredSpecs = Array.isArray(lesson.structured_practice) ? lesson.structured_practice : [];
      const structuredActivities = lesson.activities.filter((activity) => STRUCTURED_PRACTICE_TYPES.includes(activity.type));
      if (!structuredSpecs.length || structuredActivities.length !== structuredSpecs.length) {
        throw new Error(`Lesson ${lesson.id} must contain every declared structured-practice activity.`);
      }
      for (const spec of structuredSpecs) {
        const matches = structuredActivities.filter((activity) => activity.type === spec.type && activity.item === spec.item);
        if (matches.length !== 1) throw new Error(`Structured-practice contract mismatch in ${lesson.id}: ${spec.type} / ${spec.item}`);
      }
      if (lesson.order === 10) {
        for (const type of STRUCTURED_PRACTICE_TYPES) {
          if (!structuredActivities.some((activity) => activity.type === type)) {
            throw new Error(`Checkpoint ${lesson.id} must assess ${type}.`);
          }
        }
      }

      const morphologySpecs = Array.isArray(lesson.morphology_practice) ? lesson.morphology_practice : [];
      const morphologyActivities = lesson.activities.filter((activity) => MORPHOLOGY_PRACTICE_TYPES.includes(activity.type));
      if (morphologyActivities.length !== morphologySpecs.length) {
        throw new Error(`Lesson ${lesson.id} must contain every declared morphology-practice activity.`);
      }
      for (const spec of morphologySpecs) {
        const matches = morphologyActivities.filter((activity) => activity.type === spec.type && activity.item === spec.item);
        if (matches.length !== 1) throw new Error(`Morphology-practice contract mismatch in ${lesson.id}: ${spec.type} / ${spec.item}`);
      }

      for (const activity of lesson.activities) {
        if (activity.type === 'morphology-choice') {
          if (!section.items[activity.item]) throw new Error(`Unknown morphology-choice target in ${lesson.id}`);
          if (!activity.base_fi || !activity.feature_fa || !activity.prompt_fa || !activity.frame_fi || !activity.frame_fi.includes('_____') || !activity.explanation_fa) {
            throw new Error(`Morphology choice requires explicit base, feature, prompt, frame and explanation in ${lesson.id}`);
          }
          if (!Array.isArray(activity.options_fi) || activity.options_fi.length < 3 || activity.options_fi.some((option) => !String(option).trim())) {
            throw new Error(`Morphology choice requires at least three explicit Finnish forms in ${lesson.id}`);
          }
          if (new Set(activity.options_fi.map(normalizeAnswer)).size !== activity.options_fi.length) {
            throw new Error(`Morphology choice options must be unique in ${lesson.id}`);
          }
          if (!activity.expected_fi || activity.options_fi.filter((option) => normalizeAnswer(option) === normalizeAnswer(activity.expected_fi)).length !== 1) {
            throw new Error(`Morphology choice must contain exactly one explicit expected form in ${lesson.id}`);
          }
          continue;
        }
        if (activity.type === 'inflection-production') {
          if (!section.items[activity.item]) throw new Error(`Unknown inflection-production target in ${lesson.id}`);
          if (!activity.base_fi || !activity.feature_fa || !activity.prompt_fa || !activity.frame_fi || !activity.frame_fi.includes('_____') || !activity.explanation_fa) {
            throw new Error(`Inflection production requires explicit base, feature, prompt, frame and explanation in ${lesson.id}`);
          }
          if (!activity.expected_fi || !Array.isArray(activity.accepted_answers) || !activity.accepted_answers.length) {
            throw new Error(`Inflection production requires explicit accepted answers in ${lesson.id}`);
          }
          if (!activity.accepted_answers.map(normalizeAnswer).includes(normalizeAnswer(activity.expected_fi))) {
            throw new Error(`Inflection-production accepted answers must include expected Finnish in ${lesson.id}`);
          }
          continue;
        }
        if (activity.type === 'sentence-order') {
          if (!section.items[activity.item]) throw new Error(`Unknown sentence-order target in ${lesson.id}`);
          if (!Array.isArray(activity.tokens) || activity.tokens.length < 2 || activity.tokens.some((token) => !String(token).trim())) {
            throw new Error(`Sentence ordering requires explicit tokens in ${lesson.id}`);
          }
          if (!Array.isArray(activity.answer_order) || activity.answer_order.length !== activity.tokens.length) {
            throw new Error(`Sentence ordering requires an explicit answer order in ${lesson.id}`);
          }
          const expectedOrder = Array.from({ length: activity.tokens.length }, (_, index) => index).sort((a, b) => a - b);
          const actualOrder = [...activity.answer_order].sort((a, b) => a - b);
          if (JSON.stringify(expectedOrder) !== JSON.stringify(actualOrder)) throw new Error(`Sentence-order answer must be a permutation in ${lesson.id}`);
          const reconstructed = activity.answer_order.map((index) => activity.tokens[index]).join(' ');
          if (!activity.expected_fi || reconstructed !== activity.expected_fi) throw new Error(`Sentence-order expected Finnish must match its explicit token order in ${lesson.id}`);
          continue;
        }
        if (activity.type === 'expression-completion') {
          if (!section.items[activity.item]) throw new Error(`Unknown expression-completion target in ${lesson.id}`);
          if (!activity.prompt_fi || !activity.prompt_fi.includes('_____')) throw new Error(`Expression completion requires an explicit blank prompt in ${lesson.id}`);
          if (!Array.isArray(activity.accepted_answers) || !activity.accepted_answers.length || activity.accepted_answers.some((answer) => !String(answer).trim())) {
            throw new Error(`Expression completion requires explicit accepted answers in ${lesson.id}`);
          }
          const reconstructed = activity.prompt_fi.replace('_____', activity.accepted_answers[0]);
          if (!activity.expected_fi || normalizeAnswer(reconstructed) !== normalizeAnswer(activity.expected_fi)) {
            throw new Error(`Expression completion must reconstruct its explicit Finnish sentence in ${lesson.id}`);
          }
          continue;
        }
        if (activity.type === 'controlled-production') {
          if (!section.items[activity.item]) throw new Error(`Unknown controlled-production target in ${lesson.id}`);
          if (!activity.prompt_fa || !Array.isArray(activity.cues_fi) || !activity.cues_fi.length || activity.cues_fi.some((cue) => !String(cue).trim())) {
            throw new Error(`Controlled production requires a Persian prompt and explicit Finnish cues in ${lesson.id}`);
          }
          if (!activity.expected_fi || !Array.isArray(activity.accepted_answers) || !activity.accepted_answers.length) {
            throw new Error(`Controlled production requires an explicit expected Finnish answer in ${lesson.id}`);
          }
          if (!activity.accepted_answers.map(normalizeAnswer).includes(normalizeAnswer(activity.expected_fi))) {
            throw new Error(`Controlled production accepted answers must include expected Finnish in ${lesson.id}`);
          }
          continue;
        }
        if (activity.type === 'production') {
          const productionItem = section.items[activity.item];
          if (!productionItem || !productionItem.translation_fa || !acceptedAnswers(productionItem).length) {
            throw new Error(`Invalid production activity in ${lesson.id}`);
          }
          continue;
        }
        if (activity.type === 'number-grid') {
          if (!Array.isArray(activity.items) || activity.items.length < 2) throw new Error(`Invalid number grid in ${lesson.id}`);
          for (const itemId of activity.items) {
            if (!section.items[itemId]) throw new Error(`Unknown number-grid item: ${itemId}`);
          }
          continue;
        }
        if (activity.type === 'sequence-order') {
          if (!Array.isArray(activity.items) || activity.items.length < 2) throw new Error(`Invalid sequence activity in ${lesson.id}`);
          if (!Array.isArray(activity.answer_order) || activity.answer_order.length !== activity.items.length) throw new Error(`Invalid sequence answer in ${lesson.id}`);
          const expected = Array.from({ length: activity.items.length }, (_, index) => index).sort((a, b) => a - b);
          const actual = [...activity.answer_order].sort((a, b) => a - b);
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Sequence answer must be a permutation in ${lesson.id}`);
          for (const itemId of activity.items) {
            if (!section.items[itemId]) throw new Error(`Unknown sequence item: ${itemId}`);
          }
          continue;
        }
        if (activity.type === 'clock-choice') {
          if (!Number.isInteger(activity.hour) || activity.hour < 0 || activity.hour > 23) throw new Error(`Invalid clock hour in ${lesson.id}`);
          if (!section.items[activity.item]) throw new Error(`Unknown clock item: ${activity.item}`);
          if (!Array.isArray(activity.options) || !activity.options.includes(activity.item)) throw new Error(`Clock choice must include its answer in ${lesson.id}`);
          for (const optionId of activity.options) {
            if (!section.items[optionId]) throw new Error(`Unknown clock option: ${optionId}`);
          }
          continue;
        }
        if (activity.type === 'negative-transform') {
          if (!section.items[activity.affirmative_item] || !section.items[activity.negative_item]) throw new Error(`Invalid negative transform in ${lesson.id}`);
          if (!acceptedAnswers(section.items[activity.negative_item]).length) throw new Error(`Negative transform lacks accepted answer in ${lesson.id}`);
          continue;
        }
        if (activity.type === 'guided-writing') {
          if (!Array.isArray(activity.expected_items) || activity.expected_items.length < 2 || activity.expected_items.length > 4) {
            throw new Error(`Guided writing must define two to four sentences in ${lesson.id}`);
          }
          for (const itemId of activity.expected_items) {
            if (!section.items[itemId] || !acceptedAnswers(section.items[itemId]).length) throw new Error(`Invalid guided-writing item: ${itemId}`);
          }
          continue;
        }
        if (activity.type === 'event-time-match') {
          if (!section.items[activity.event_item] || !section.items[activity.time_item]) throw new Error(`Invalid event-time match in ${lesson.id}`);
          if (!Array.isArray(activity.options) || !activity.options.includes(activity.time_item)) throw new Error(`Event-time match must include its answer in ${lesson.id}`);
          for (const optionId of activity.options) {
            if (!section.items[optionId]) throw new Error(`Unknown event-time option: ${optionId}`);
          }
          continue;
        }

        if (activity.type === 'visual-choice') {
          const visualItem = section.items[activity.item];
          if (!visualItem || !visualItem.visual) throw new Error(`Visual choice lacks pictogram in ${lesson.id}`);
          if (!Array.isArray(activity.options) || !activity.options.includes(activity.item)) throw new Error(`Visual choice must include its answer in ${lesson.id}`);
          for (const optionId of activity.options) if (!section.items[optionId]) throw new Error(`Unknown visual option: ${optionId}`);
          continue;
        }
        if (activity.type === 'prompt-choice') {
          if (!section.items[activity.prompt_item] || !section.items[activity.answer_item]) throw new Error(`Invalid prompt choice in ${lesson.id}`);
          if (!Array.isArray(activity.options) || !activity.options.includes(activity.answer_item)) throw new Error(`Prompt choice must include its answer in ${lesson.id}`);
          for (const optionId of activity.options) if (!section.items[optionId]) throw new Error(`Unknown prompt-choice option: ${optionId}`);
          continue;
        }
        if (activity.type === 'category-match') {
          if (!section.items[activity.item]) throw new Error(`Unknown category item in ${lesson.id}`);
          if (!activity.answer || !Array.isArray(activity.options) || !activity.options.includes(activity.answer)) throw new Error(`Invalid category match in ${lesson.id}`);
          continue;
        }
        if (activity.type === 'short-reading') {
          if (!section.items[activity.item] || section.items[activity.item].item_type !== 'reading') throw new Error(`Invalid short reading in ${lesson.id}`);
          if (!section.items[activity.question_item]) throw new Error(`Invalid short-reading answer in ${lesson.id}`);
          if (!Array.isArray(activity.options) || !activity.options.includes(activity.question_item)) throw new Error(`Short reading must include its answer in ${lesson.id}`);
          for (const optionId of activity.options) if (!section.items[optionId]) throw new Error(`Unknown reading option: ${optionId}`);
          continue;
        }
        if (activity.type === 'dialogue-order') {
          if (!Array.isArray(activity.turns) || activity.turns.length < 3 || activity.turns.length > 5) throw new Error(`Invalid dialogue activity in ${lesson.id}`);
          if (!Array.isArray(activity.answer_order) || activity.answer_order.length !== activity.turns.length) throw new Error(`Invalid dialogue answer in ${lesson.id}`);
          const expected = Array.from({ length: activity.turns.length }, (_, index) => index).sort((a, b) => a - b);
          const actual = [...activity.answer_order].sort((a, b) => a - b);
          if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`Dialogue answer must be a permutation in ${lesson.id}`);
          for (const itemId of activity.turns) {
            if (!section.items[itemId]) throw new Error(`Unknown dialogue item: ${itemId}`);
          }
          continue;
        }
        if (!section.items[activity.item]) throw new Error(`Unknown course item: ${activity.item}`);
        for (const optionId of activity.options || []) {
          if (!section.items[optionId]) throw new Error(`Unknown course option: ${optionId}`);
        }
      }
    }
    return section;
  }

  function validateSectionAgainstCurriculum(section, curriculum) {
    if (!curriculum || !Array.isArray(curriculum.sections)) throw new Error('Invalid curriculum data.');
    const contract = curriculum.sections.find((entry) => entry.id === section.curriculum_section_id);
    if (!contract) throw new Error('Implemented section is missing from the curriculum.');
    if (contract.lessons.length !== section.lessons.length) throw new Error('Implemented lesson count does not match the curriculum.');

    const implementedByCurriculumId = new Map(section.lessons.map((lesson) => [lesson.curriculum_id, lesson]));
    for (const contractLesson of contract.lessons) {
      const implemented = implementedByCurriculumId.get(contractLesson.id);
      if (!implemented) throw new Error(`Missing implemented curriculum lesson: ${contractLesson.id}`);
      if (implemented.order !== contractLesson.order) throw new Error(`Lesson order mismatch: ${contractLesson.id}`);
      if (!implemented.summary_fa || !implemented.grammar_fa) throw new Error(`Incomplete learner content: ${contractLesson.id}`);

      const refs = implemented.curriculum_target_refs;
      if (!refs || !Array.isArray(refs.high_frequency) || !Array.isArray(refs.topic) || !Array.isArray(refs.expressions)) {
        throw new Error(`Missing curriculum target mapping: ${contractLesson.id}`);
      }
      const requiredCounts = {
        high_frequency: contractLesson.high_frequency_targets.length,
        topic: contractLesson.topic_targets.length,
        expressions: contractLesson.expressions.length,
      };
      for (const [group, count] of Object.entries(requiredCounts)) {
        if (refs[group].length !== count) throw new Error(`Curriculum target count mismatch for ${contractLesson.id} / ${group}`);
        for (const itemId of refs[group]) {
          if (!section.items[itemId]) throw new Error(`Unknown curriculum target item: ${itemId}`);
        }
      }
    }
    return { ...section, curriculum_contract: contract };
  }

  function validatePreparedSections(validated) {
    const lessonIds = new Set();
    const curriculumLessonIds = new Set();
    for (const implemented of validated) {
      for (const lesson of implemented.lessons) {
        if (lessonIds.has(lesson.id)) throw new Error(`Duplicate implemented lesson id: ${lesson.id}`);
        lessonIds.add(lesson.id);
        curriculumLessonIds.add(lesson.curriculum_id);

        if (Array.isArray(lesson.recycle_from)) {
          const contractLesson = implemented.curriculum_contract.lessons.find((entry) => entry.id === lesson.curriculum_id);
          if (JSON.stringify(lesson.recycle_from) !== JSON.stringify(contractLesson.recycle_from)) {
            throw new Error(`Recycle dependency mismatch: ${lesson.curriculum_id}`);
          }
        }

        for (const activity of lesson.activities) {
          if (activity.type === 'expression-completion' || activity.type === 'controlled-production' || activity.type === 'inflection-production') {
            if (!Array.isArray(activity.accepted_answers) || !activity.accepted_answers.length) {
              throw new Error(`Structured typed activity lacks explicit accepted answers: ${lesson.id} / ${activity.item}`);
            }
            continue;
          }
          if (activity.type !== 'type' && activity.type !== 'production' && activity.type !== 'dictation') continue;
          const typedItem = implemented.items[activity.item];
          if (!typedItem || !acceptedAnswers(typedItem).length) {
            throw new Error(`Typed activity lacks explicit accepted answers: ${lesson.id} / ${activity.item}`);
          }
          if (activity.type === 'production' && !typedItem.translation_fa) {
            throw new Error(`Production activity lacks a Persian prompt: ${lesson.id} / ${activity.item}`);
          }
        }
      }
    }

    for (const implemented of validated) {
      for (const lesson of implemented.lessons) {
        for (const dependency of lesson.recycle_from || []) {
          if (!curriculumLessonIds.has(dependency)) throw new Error(`Unimplemented recycling dependency: ${lesson.curriculum_id} -> ${dependency}`);
        }
      }
    }
    return validated;
  }

  function validateImplementedCourse(rawSections, curriculum) {
    if (!Array.isArray(rawSections) || !rawSections.length) throw new Error('No implemented course sections.');
    const validated = rawSections.map((rawSection) => validateSectionAgainstCurriculum(validateSection(rawSection), curriculum));
    const sectionOrders = validated.map((implemented) => implemented.curriculum_contract.order);
    const sortedOrders = [...sectionOrders].sort((a, b) => a - b);
    if (JSON.stringify(sectionOrders) !== JSON.stringify(sortedOrders)) throw new Error('Implemented sections must follow curriculum order.');
    return validatePreparedSections(validated);
  }

  function validateImplementedPath(stagePayloads) {
    if (!Array.isArray(stagePayloads) || !stagePayloads.length) throw new Error('No implemented course stages.');
    const combined = [];
    for (const stage of stagePayloads) {
      if (!stage?.curriculum || !Array.isArray(stage.sections) || !stage.sections.length) {
        throw new Error('Invalid implemented course stage.');
      }
      if (stage.curriculum.level !== stage.level) {
        throw new Error(`Course stage level mismatch: ${stage.level}`);
      }
      const validated = stage.sections.map((rawSection) => (
        validateSectionAgainstCurriculum(validateSection(rawSection), stage.curriculum)
      ));
      const orders = validated.map((implemented) => implemented.curriculum_contract.order);
      const sorted = [...orders].sort((a, b) => a - b);
      if (JSON.stringify(orders) !== JSON.stringify(sorted)) {
        throw new Error(`Implemented sections must follow curriculum order in ${stage.level}.`);
      }
      for (const implemented of validated) {
        if (implemented.level !== stage.level) throw new Error(`Implemented section level mismatch: ${implemented.id}`);
        combined.push(implemented);
      }
    }
    return validatePreparedSections(combined);
  }

  function renderStructuredPracticeActivity({
    document,
    windowObject,
    activity,
    item,
    card,
    feedback,
    createButton,
    nextActivity,
    showFeedback,
    recordResult,
  }) {
    if (!STRUCTURED_PRACTICE_TYPES.includes(activity.type)) return false;
    let answered = false;

    if (activity.type === 'sentence-order') {
      const ordered = [];
      const answerBox = document.createElement('div');
      answerBox.className = 'course-sentence-answer-box';
      answerBox.lang = 'fi';
      answerBox.dir = 'ltr';
      answerBox.setAttribute('role', 'group');
      answerBox.setAttribute('aria-label', 'جملهٔ ساخته‌شده');

      const tokenPool = document.createElement('div');
      tokenPool.className = 'course-sentence-token-pool';
      tokenPool.setAttribute('aria-label', 'کلمات باقی‌مانده');

      const submit = createButton('ثبت پاسخ', 'primary-button course-sentence-submit', () => {
        if (answered || ordered.length !== activity.tokens.length) return;
        answered = true;
        const correct = ordered.every((value, orderIndex) => value === activity.answer_order[orderIndex]);
        recordResult(correct);
        renderSelection();
        const result = document.createElement('div');
        result.className = `course-answer-feedback course-primary-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
        const title = document.createElement('strong');
        title.textContent = correct ? 'جمله درست ساخته شد.' : 'ترتیب درست جمله را مرور کن.';
        const review = document.createElement('p');
        review.lang = 'fi';
        review.dir = 'ltr';
        review.textContent = activity.expected_fi;
        result.append(title, review, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
        card.append(result);
      });
      submit.disabled = true;

      function renderSelection(focusRequest = null) {
        answerBox.replaceChildren();
        tokenPool.replaceChildren();
        const sourceButtons = new Map();

        if (!ordered.length) {
          const placeholder = document.createElement('span');
          placeholder.className = 'course-sentence-answer-placeholder';
          placeholder.textContent = 'کلمات انتخاب‌شده اینجا قرار می‌گیرند';
          answerBox.append(placeholder);
        } else {
          ordered.forEach((tokenIndex, selectedPosition) => {
            const token = activity.tokens[tokenIndex];
            const selected = createButton(token, 'course-sentence-selected-token', () => {
              if (answered) return;
              ordered.splice(selectedPosition, 1);
              renderSelection({ type: 'source', index: tokenIndex });
            });
            selected.lang = 'fi';
            selected.dir = 'ltr';
            selected.disabled = answered;
            selected.setAttribute('aria-label', `برگرداندن ${token} به فهرست کلمات`);
            answerBox.append(selected);
          });
        }

        activity.tokens.forEach((token, index) => {
          if (ordered.includes(index)) return;
          const button = createButton(token, 'course-sentence-source-token', () => {
            if (answered || ordered.includes(index)) return;
            ordered.push(index);
            const remainingIndex = activity.tokens.findIndex((_, candidateIndex) => !ordered.includes(candidateIndex));
            renderSelection(remainingIndex >= 0 ? { type: 'source', index: remainingIndex } : { type: 'submit' });
          });
          button.lang = 'fi';
          button.dir = 'ltr';
          button.disabled = answered;
          button.setAttribute('aria-label', `افزودن ${token} به جمله`);
          sourceButtons.set(index, button);
          tokenPool.append(button);
        });

        submit.disabled = answered || ordered.length !== activity.tokens.length;
        if (focusRequest?.type === 'source') {
          sourceButtons.get(focusRequest.index)?.focus();
        } else if (focusRequest?.type === 'submit' && !submit.disabled) {
          submit.focus();
        }
      }

      renderSelection();
      card.append(answerBox, tokenPool, submit);
      return true;
    }

    const form = document.createElement('form');
    form.className = 'course-typing-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.lang = 'fi';
    input.dir = 'ltr';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-button compact';
    submit.textContent = 'بررسی';
    form.append(input, submit);

    if (activity.type === 'expression-completion') {
      const sentence = document.createElement('p');
      sentence.className = 'course-cloze-sentence';
      sentence.lang = 'fi';
      sentence.dir = 'ltr';
      sentence.textContent = activity.prompt_fi;
      input.setAttribute('aria-label', 'بخش حذف‌شدهٔ عبارت فنلاندی');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (answered || !input.value.trim()) return;
        answered = true;
        const expected = {
          ...item,
          surface_form: activity.accepted_answers[0],
          accepted_answers: activity.accepted_answers,
          example_fi: activity.expected_fi,
        };
        const grading = gradeTypedAnswer(expected, input.value);
        recordResult(grading.accepted, grading);
        input.disabled = true;
        submit.disabled = true;
        input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
        showFeedback(feedback, grading.accepted, expected, grading);
      });
      card.append(sentence, form, feedback);
      windowObject.setTimeout(() => input.focus(), 0);
      return true;
    }

    const meaning = document.createElement('strong');
    meaning.className = 'course-focus-meaning';
    meaning.textContent = activity.prompt_fa;
    const cues = document.createElement('p');
    cues.className = 'course-transform-hint';
    cues.lang = 'fi';
    cues.dir = 'ltr';
    cues.textContent = `راهنما: ${activity.cues_fi.join(' + ')}`;
    input.setAttribute('aria-label', 'جملهٔ کنترل‌شدهٔ فنلاندی');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (answered || !input.value.trim()) return;
      answered = true;
      const expected = {
        ...item,
        surface_form: activity.expected_fi,
        accepted_answers: activity.accepted_answers,
        example_fi: activity.expected_fi,
        example_fa: activity.prompt_fa,
      };
      const grading = gradeTypedAnswer(expected, input.value);
      recordResult(grading.accepted, grading);
      input.disabled = true;
      submit.disabled = true;
      input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
      showFeedback(feedback, grading.accepted, expected, grading);
    });
    card.append(meaning, cues, form, feedback);
    windowObject.setTimeout(() => input.focus(), 0);
    return true;
  }

  function renderMorphologyPracticeActivity({
    document,
    windowObject,
    activity,
    card,
    feedback,
    createButton,
    nextActivity,
    createTypedDifference,
    recordResult,
  }) {
    if (!MORPHOLOGY_PRACTICE_TYPES.includes(activity.type)) return false;
    let answered = false;

    const context = document.createElement('div');
    context.className = 'course-morphology-context';

    const base = document.createElement('p');
    base.className = 'course-morphology-base';
    const baseLabel = document.createElement('span');
    baseLabel.textContent = 'شکل پایه:';
    const baseValue = document.createElement('strong');
    baseValue.lang = 'fi';
    baseValue.dir = 'ltr';
    baseValue.textContent = activity.base_fi;
    base.append(baseLabel, baseValue);

    const feature = document.createElement('p');
    feature.className = 'course-morphology-feature';
    feature.textContent = activity.feature_fa;

    const instruction = document.createElement('p');
    instruction.className = 'course-morphology-prompt';
    instruction.textContent = activity.prompt_fa;

    const frame = document.createElement('p');
    frame.className = 'course-morphology-frame';
    frame.lang = 'fi';
    frame.dir = 'ltr';
    frame.textContent = activity.frame_fi;
    context.append(base, feature, instruction, frame);
    card.append(context);

    const finish = (correct, grading = null) => {
      feedback.replaceChildren();
      feedback.hidden = false;
      feedback.className = `course-answer-feedback course-primary-feedback ${correct ? (grading?.fuzzy ? 'is-near-correct' : 'is-correct') : 'is-wrong'}`;

      const title = document.createElement('strong');
      title.textContent = correct
        ? (grading?.fuzzy ? 'قبول شد؛ شکل درست را هم مرور کن.' : 'آفرین، فرم درست است.')
        : `شکل درست: ${activity.expected_fi}`;
      feedback.append(title);

      if (grading && !grading.exact) feedback.append(createTypedDifference(grading));

      const completed = document.createElement('p');
      completed.className = 'course-morphology-answer';
      completed.lang = 'fi';
      completed.dir = 'ltr';
      completed.textContent = activity.frame_fi.replace('_____', activity.expected_fi);

      const explanation = document.createElement('p');
      explanation.className = 'course-morphology-explanation';
      explanation.textContent = activity.explanation_fa;

      feedback.append(completed, explanation, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
    };

    if (activity.type === 'morphology-choice') {
      const options = document.createElement('div');
      options.className = 'course-options course-morphology-options';
      for (const option of activity.options_fi) {
        const button = createButton(option, 'course-option', () => {
          if (answered) return;
          answered = true;
          const correct = normalizeAnswer(option) === normalizeAnswer(activity.expected_fi);
          recordResult(correct);
          for (const optionButton of options.querySelectorAll('button')) {
            optionButton.disabled = true;
            if (normalizeAnswer(optionButton.textContent) === normalizeAnswer(activity.expected_fi)) optionButton.classList.add('correct');
          }
          if (!correct) button.classList.add('wrong');
          finish(correct);
        });
        button.lang = 'fi';
        button.dir = 'ltr';
        options.append(button);
      }
      card.append(options, feedback);
      return true;
    }

    const form = document.createElement('form');
    form.className = 'course-typing-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.lang = 'fi';
    input.dir = 'ltr';
    input.autocomplete = 'off';
    input.autocapitalize = 'none';
    input.spellcheck = false;
    input.setAttribute('aria-label', 'صورت صرف‌شدهٔ فنلاندی');
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'primary-button compact';
    submit.textContent = 'بررسی';
    form.append(input, submit);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (answered || !input.value.trim()) return;
      answered = true;
      const expected = {
        surface_form: activity.expected_fi,
        accepted_answers: activity.accepted_answers,
      };
      const grading = gradeMorphologyAnswer(expected, input.value);
      recordResult(grading.accepted, grading);
      input.disabled = true;
      submit.disabled = true;
      input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
      finish(grading.accepted, grading);
    });

    card.append(form, feedback);
    windowObject.setTimeout(() => input.focus(), 0);
    return true;
  }

  function activityNeedsFinnishSpeech(activity) {
    return Boolean(
      activity
      && (
        activity.type === 'teach'
        || activity.type === 'dictation'
        || (activity.type === 'choice' && activity.mode === 'listen')
      )
    );
  }

  function shouldRefreshSpeechActivity(activity, answered) {
    return activityNeedsFinnishSpeech(activity) && !answered;
  }

  function initializeBrowser(windowObject) {
    const document = windowObject.document;
    const root = document && document.getElementById('course-root');
    const courseView = document && document.getElementById('course-view');
    if (!document || !root || !courseView || courseView.dataset.initialized === 'true') return;
    courseView.dataset.initialized = 'true';

    const views = {
      practice: document.getElementById('practice-view'),
      dictionary: document.getElementById('dictionary-view'),
      settings: document.getElementById('settings-view'),
      about: document.getElementById('about-view'),
      course: courseView,
    };
    const mobileTitle = document.getElementById('mobile-view-title');
    const courseLinks = [...document.querySelectorAll('.course-view-link')];
    const regularLinks = [...document.querySelectorAll('[data-view-link], .settings-view-link, .about-view-link')];
    const allPrimaryItems = [...document.querySelectorAll('.bottom-nav-item, .desktop-view-link')];

    let sections = [];
    let section = null;
    let curricula = new Map();
    let progress = loadProgress(windowObject.localStorage);
    let activeLesson = null;
    let infoDisclosureId = 0;
    let mapNavigationCleanup = null;
    let activityIndex = 0;
    let sessionCorrect = 0;
    let sessionGraded = 0;
    let sessionSequence = 0;
    let activeSessionId = null;
    let sessionStartedAt = 0;
    let activityStartedAt = 0;
    let activityTimingIndex = -1;
    let answered = false;

    function isCourseHash() {
      return location.hash === '#course' || location.hash.startsWith('#course-');
    }

    function sectionFromHash() {
      const value = location.hash.startsWith('#course-') ? location.hash.slice('#course-'.length) : '';
      return sections.find((entry) => entry.id === value) || null;
    }

    function lessonFromHash() {
      const value = location.hash.startsWith('#course-') ? location.hash.slice('#course-'.length) : '';
      for (const implemented of sections) {
        const lesson = implemented.lessons.find((entry) => entry.id === value);
        if (lesson) return { section: implemented, lesson };
      }
      return null;
    }

    function preferredSection() {
      if (!sections.length) return null;
      for (let index = 0; index < sections.length; index += 1) {
        if (!isSectionUnlocked(sections, progress, index)) break;
        if (!isSectionComplete(sections[index], progress)) return sections[index];
      }
      for (let index = sections.length - 1; index >= 0; index -= 1) {
        if (isSectionUnlocked(sections, progress, index)) return sections[index];
      }
      return sections[0];
    }

    function preferredSectionForLevel(level) {
      const candidates = sections.filter((entry) => entry.level === level);
      if (!candidates.length) return null;
      for (const candidate of candidates) {
        const index = sections.indexOf(candidate);
        if (isSectionAccessible(sections, progress, index) && !isSectionComplete(candidate, progress)) return candidate;
      }
      for (let index = candidates.length - 1; index >= 0; index -= 1) {
        const candidate = candidates[index];
        const globalIndex = sections.indexOf(candidate);
        if (isSectionAccessible(sections, progress, globalIndex)) return candidate;
      }
      return candidates[0];
    }

    function selectSection(nextSection, { updateHash = true } = {}) {
      if (!nextSection) return false;
      const index = sections.indexOf(nextSection);
      if (index < 0) return false;
      section = nextSection;
      activeLesson = null;
      if (updateHash) setHash(`#course-${section.id}`);
      return true;
    }

    function activateCourseNavigation(active) {
      if (active) {
        for (const item of allPrimaryItems) {
          const current = item.classList.contains('course-view-link');
          item.classList.toggle('active', current);
          if (current) item.setAttribute('aria-current', 'page');
          else item.removeAttribute('aria-current');
        }
      } else {
        for (const item of courseLinks) {
          item.classList.remove('active');
          item.removeAttribute('aria-current');
        }
      }
    }

    function setLessonFocusMode(active) {
      document.body?.classList.toggle('course-lesson-active', Boolean(active));
    }

    function showCourseView({ updateHash = false } = {}) {
      for (const [name, view] of Object.entries(views)) {
        if (view) view.hidden = name !== 'course';
      }
      setLessonFocusMode(Boolean(activeLesson));
      activateCourseNavigation(true);
      if (mobileTitle) mobileTitle.textContent = activeLesson ? activeLesson.title_fa : 'دوره';
      if (updateHash && !isCourseHash()) history.replaceState(null, '', '#course');
    }

    function hideCourseView() {
      courseView.hidden = true;
      setLessonFocusMode(false);
      activateCourseNavigation(false);
    }

    function setHash(hash) {
      if (location.hash === hash) return;
      history.replaceState(null, '', hash);
    }

    function createButton(label, className, onClick) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = className;
      button.textContent = label;
      button.addEventListener('click', onClick);
      return button;
    }

    function beginCourseSession(sessionType, lessonId) {
      sessionSequence += 1;
      sessionStartedAt = Date.now();
      activeSessionId = courseSessionId(section?.id, sessionType, lessonId, sessionStartedAt, sessionSequence);
      activityStartedAt = 0;
      activityTimingIndex = -1;
    }

    function recordActivityResult(activity, correct, grading = null) {
      answered = true;
      sessionGraded += 1;
      if (correct) sessionCorrect += 1;
      if (!section) return;

      const answeredAt = Date.now();
      const targetId = activityPrimaryTargetId(activity);
      if (targetId) {
        progress = recordTargetAttempt(progress, section.id, targetId, correct, answeredAt);
      }
      progress = recordAnswerHistoryEvent(progress, {
        answeredAt,
        sessionId: activeSessionId || courseSessionId(section.id, 'lesson', activeLesson?.id, answeredAt, 1),
        sessionStartedAt: sessionStartedAt || answeredAt,
        sessionType: activeLesson?.focused_practice ? 'focused' : 'lesson',
        sectionId: section.id,
        lessonId: activeLesson?.id || null,
        sourceLessonId: activity.source_lesson_id || (activeLesson?.focused_practice ? null : activeLesson?.id || null),
        targetId,
        activityType: activity.type || 'unknown',
        mode: activity.mode || null,
        correct,
        productive: isProductiveCourseActivity(activity),
        guided: isGuidedCourseActivity(activity),
        direction: courseActivityDirection(activity),
        firstAttempt: true,
        responseMs: activityStartedAt ? Math.max(0, answeredAt - activityStartedAt) : 0,
        exact: typeof grading?.exact === 'boolean' ? grading.exact : null,
        fuzzy: Boolean(grading?.fuzzy),
        diacriticAdjusted: Boolean(grading?.diacriticAdjusted),
      });
      progress = saveProgress(windowObject.localStorage, progress);
    }

    function createSpeechStatusNotice(status) {
      const notice = document.createElement('div');
      notice.className = 'course-audio-unavailable';
      const title = document.createElement('strong');
      const detail = document.createElement('p');

      if (status.state === 'loading') {
        title.textContent = 'در حال بررسی صدای فنلاندی دستگاه…';
        detail.textContent = `فهرست صداهای مرورگر هنوز آماده نشده است. اگر این وضعیت ادامه پیدا کرد، احتمالاً voice فنلاندی نصب نیست. ${speechSettingsGuide(windowObject)}`;
      } else if (status.state === 'missing') {
        title.textContent = 'صدای فنلاندی روی این دستگاه پیدا نشد.';
        detail.textContent = `برای جلوگیری از تلفظ اشتباه، این تمرین صوتی پخش نمی‌شود. ${speechSettingsGuide(windowObject)}`;
      } else {
        title.textContent = 'پخش صوتی فنلاندی در این مرورگر در دسترس نیست.';
        detail.textContent = `این تمرین در امتیاز حساب نمی‌شود. ${speechSettingsGuide(windowObject)}`;
      }

      const retry = createButton('بررسی دوبارهٔ صدای فنلاندی', 'course-secondary-button course-audio-retry', renderActivity);
      notice.append(title, detail, retry);
      return notice;
    }

    function createInfoDisclosure(buildContent, label = 'نمایش توضیحات') {
      infoDisclosureId += 1;
      const wrap = document.createElement('div');
      wrap.className = 'course-info-disclosure';
      const panelId = `course-info-${infoDisclosureId}`;
      const toggle = createButton('!', 'course-info-toggle', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
        wrap.classList.toggle('is-open', !expanded);
      });
      toggle.setAttribute('aria-label', label);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', panelId);
      const panel = document.createElement('div');
      panel.id = panelId;
      panel.className = 'course-info-panel';
      panel.hidden = true;
      buildContent(panel);
      wrap.append(toggle, panel);
      return wrap;
    }

    function createTypedDifference(grading, label = '') {
      const block = document.createElement('div');
      block.className = `course-answer-diff${grading.fuzzy ? ' is-near-correct' : ''}`;

      if (label) {
        const heading = document.createElement('strong');
        heading.className = 'course-answer-diff-heading';
        heading.textContent = label;
        block.append(heading);
      }

      const buildLine = (lineLabel, side) => {
        const row = document.createElement('div');
        row.className = 'course-answer-diff-row';
        const title = document.createElement('span');
        title.textContent = lineLabel;
        const value = document.createElement('b');
        value.lang = 'fi';
        value.dir = 'ltr';

        for (const operation of grading.operations) {
          const character = operation[side];
          if (!character) {
            const gap = document.createElement('span');
            gap.className = 'course-answer-diff-gap';
            gap.textContent = '□';
            gap.setAttribute('aria-label', side === 'entered' ? 'حرف جاافتاده' : 'حرف اضافه');
            value.append(gap);
            continue;
          }
          const span = document.createElement('span');
          span.textContent = character;
          if (operation.type !== 'equal') span.className = 'course-answer-diff-char';
          value.append(span);
        }
        row.append(title, value);
        return row;
      };

      block.append(
        buildLine('پاسخ شما:', 'entered'),
        buildLine('شکل درست:', 'expected'),
      );

      if (grading.fuzzy) {
        const similarity = document.createElement('small');
        similarity.className = 'course-answer-similarity';
        similarity.textContent = `شباهت ${toPersianNumber(Math.round(grading.similarity * 100))}٪ — پاسخ پذیرفته شد، اما این تفاوت‌ها را مرور کن.`;
        block.append(similarity);
      }
      return block;
    }

    function renderLoading(message = 'در حال آماده‌کردن بخش آموزشی…') {
      root.replaceChildren();
      const status = document.createElement('div');
      status.className = 'course-loading';
      status.textContent = message;
      root.append(status);
    }

    function completionCount(targetSection = section) {
      if (!targetSection) return 0;
      return targetSection.lessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
    }

    function renderSectionMap() {
      if (mapNavigationCleanup) {
        mapNavigationCleanup();
        mapNavigationCleanup = null;
      }
      activeLesson = null;
      setLessonFocusMode(false);
      if (!section) section = preferredSection();
      if (section) setHash(`#course-${section.id}`);
      showCourseView();
      if (!section) return renderLoading();
      root.replaceChildren();

      const catalog = document.createElement('section');
      catalog.className = 'course-section-catalog course-section-selector';
      const catalogTitle = document.createElement('div');
      catalogTitle.className = 'course-section-catalog-heading';
      catalogTitle.innerHTML = '<h1>مسیر A1</h1>';

      const levelTabs = document.createElement('div');
      levelTabs.className = 'course-level-tabs';
      levelTabs.setAttribute('role', 'tablist');
      levelTabs.setAttribute('aria-label', 'انتخاب سطح دوره');
      for (const stage of COURSE_STAGES) {
        const stageSections = sections.filter((entry) => entry.level === stage.level);
        const target = preferredSectionForLevel(stage.level);
        const targetIndex = target ? sections.indexOf(target) : -1;
        const accessible = target && isSectionAccessible(sections, progress, targetIndex);
        const current = section.level === stage.level;
        const tab = createButton(stage.level, `course-level-tab${current ? ' is-current' : ''}`, () => {
          if (!target || !accessible || current) return;
          selectSection(target);
          renderSectionMap();
        });
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', String(current));
        tab.tabIndex = current ? 0 : -1;
        tab.disabled = !stageSections.length || (!accessible && !current);
        if (!accessible && !current) tab.title = 'پس از تکمیل A1.1 باز می‌شود';
        levelTabs.append(tab);
      }
      levelTabs.addEventListener('keydown', (event) => {
        const availableTabs = [...levelTabs.querySelectorAll('.course-level-tab:not(:disabled)')];
        if (!availableTabs.length) return;
        const focusedIndex = Math.max(0, availableTabs.indexOf(document.activeElement));
        const rtl = document.documentElement?.dir === 'rtl';
        let nextIndex = null;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = availableTabs.length - 1;
        else if (event.key === 'ArrowRight') nextIndex = focusedIndex + (rtl ? -1 : 1);
        else if (event.key === 'ArrowLeft') nextIndex = focusedIndex + (rtl ? 1 : -1);
        if (nextIndex === null) return;
        event.preventDefault();
        const wrappedIndex = (nextIndex + availableTabs.length) % availableTabs.length;
        availableTabs[wrappedIndex].focus();
      });
      catalog.append(catalogTitle, levelTabs);

      const currentCurriculum = curricula.get(section.level);
      const currentContract = currentCurriculum?.sections?.find((entry) => entry.id === section.curriculum_section_id) || section.curriculum_contract;
      const selectorToggle = createButton('', 'course-section-selector-toggle', () => {
        const expanded = selectorToggle.getAttribute('aria-expanded') === 'true';
        selectorToggle.setAttribute('aria-expanded', String(!expanded));
        selectorList.hidden = expanded;
        catalog.classList.toggle('is-open', !expanded);
      });
      selectorToggle.setAttribute('aria-expanded', 'false');
      selectorToggle.setAttribute('aria-controls', 'course-section-selector-list');
      const selectorText = document.createElement('span');
      selectorText.className = 'course-section-selector-current';
      selectorText.textContent = `بخش ${toPersianNumber(currentContract.order)}: ${currentContract.title_fa}`;
      const selectorChevron = document.createElement('span');
      selectorChevron.className = 'course-section-selector-chevron';
      selectorChevron.setAttribute('aria-hidden', 'true');
      selectorChevron.textContent = '⌄';
      selectorToggle.append(selectorText, selectorChevron);

      const selectorList = document.createElement('div');
      selectorList.id = 'course-section-selector-list';
      selectorList.className = 'course-section-selector-list';
      selectorList.hidden = true;

      for (const entry of currentCurriculum?.sections || []) {
        const implemented = sections.find((candidate) => candidate.curriculum_section_id === entry.id) || null;
        const implementedIndex = implemented ? sections.indexOf(implemented) : -1;
        const unlocked = implemented ? isSectionAccessible(sections, progress, implementedIndex) : false;
        const current = implemented === section;
        const option = createButton('', `course-section-selector-option${current ? ' is-current' : ''}${unlocked ? ' is-unlocked' : ' is-locked'}`, () => {
          if (!implemented || current) return;
          if (!selectSection(implemented)) return;
          renderSectionMap();
        });
        option.disabled = !implemented || current;

        const optionMain = document.createElement('span');
        optionMain.className = 'course-section-selector-main';
        const optionTitle = document.createElement('span');
        optionTitle.className = 'course-section-selector-title';
        optionTitle.textContent = `بخش ${toPersianNumber(entry.order)}: ${entry.title_fa}`;
        optionMain.append(optionTitle);

        if (implemented) {
          const sectionCompleted = completionCount(implemented);
          const sectionTotal = implemented.lessons.length;
          const optionProgress = document.createElement('span');
          optionProgress.className = 'course-section-selector-progress';
          optionProgress.setAttribute('role', 'progressbar');
          optionProgress.setAttribute('aria-label', `پیشرفت بخش ${toPersianNumber(entry.order)}`);
          optionProgress.setAttribute('aria-valuemin', '0');
          optionProgress.setAttribute('aria-valuemax', String(sectionTotal));
          optionProgress.setAttribute('aria-valuenow', String(sectionCompleted));
          const optionProgressBar = document.createElement('span');
          optionProgressBar.style.width = `${sectionTotal ? (sectionCompleted / sectionTotal) * 100 : 0}%`;
          optionProgress.append(optionProgressBar);
          optionMain.append(optionProgress);
        }

        const optionStatus = document.createElement('small');
        optionStatus.textContent = current ? 'بخش فعلی' : unlocked ? 'باز کردن' : 'مشاهده (قفل)';
        option.append(optionMain, optionStatus);
        selectorList.append(option);
      }

      catalog.append(selectorToggle, selectorList);

      const header = document.createElement('header');
      header.className = 'course-hero-card';
      const level = document.createElement('span');
      level.className = 'course-level-badge';
      level.textContent = section.level;
      const title = document.createElement('h1');
      title.textContent = section.title_fa;
      header.append(level, title);

      const completed = completionCount();
      const progressWrap = document.createElement('div');
      progressWrap.className = 'course-section-progress';
      const progressText = document.createElement('div');
      progressText.innerHTML = `<strong>${toPersianNumber(completed)} از ${toPersianNumber(section.lessons.length)}</strong><span>درس کامل شده</span>`;
      const track = document.createElement('div');
      track.className = 'course-progress-track';
      track.setAttribute('aria-label', 'پیشرفت بخش');
      const bar = document.createElement('span');
      bar.style.width = `${(completed / section.lessons.length) * 100}%`;
      track.append(bar);
      progressWrap.append(progressText, track);
      header.append(progressWrap);

      const sectionInfo = createInfoDisclosure((panel) => {
        const subtitle = document.createElement('p');
        subtitle.className = 'course-subtitle';
        subtitle.textContent = section.subtitle_fa;
        const outcomesTitle = document.createElement('h2');
        outcomesTitle.textContent = 'در پایان این بخش می‌توانی';
        const outcomesList = document.createElement('ul');
        for (const outcome of section.can_do_fa || []) {
          const item = document.createElement('li');
          item.textContent = outcome;
          outcomesList.append(item);
        }
        panel.append(subtitle, outcomesTitle, outcomesList);
      }, 'توضیحات و اهداف بخش');
      header.append(sectionInfo);

      const path = document.createElement('section');
      path.className = 'course-path course-node-path';
      path.setAttribute('aria-label', `درس‌های ${section.title_fa}`);
      const actionPanel = document.createElement('article');
      actionPanel.className = 'course-lesson-popover';
      const lessonSteps = [];
      actionPanel.hidden = true;
      let selectedNode = null;
      let selectedStep = null;

      const closeLessonPopover = () => {
        if (selectedNode) {
          selectedNode.classList.remove('is-selected');
          selectedNode.setAttribute('aria-expanded', 'false');
        }
        if (selectedStep) selectedStep.classList.remove('has-open-popover');
        selectedNode = null;
        selectedStep = null;
        actionPanel.hidden = true;
        actionPanel.replaceChildren();
        actionPanel.remove();
      };

      const openLessonPopover = (lesson, node, unlocked, done, step, jumpAvailable = false) => {
        if (selectedNode) {
          selectedNode.classList.remove('is-selected');
          selectedNode.setAttribute('aria-expanded', 'false');
        }
        if (selectedStep) selectedStep.classList.remove('has-open-popover');
        selectedNode = node;
        selectedStep = step;
        step.classList.add('has-open-popover');
        node.classList.add('is-selected');
        node.setAttribute('aria-expanded', 'true');

        actionPanel.replaceChildren();
        actionPanel.hidden = false;

        const eyebrow = document.createElement('span');
        eyebrow.className = 'course-lesson-popover-label';
        eyebrow.textContent = `درس ${toPersianNumber(lesson.order)}`;

        const heading = document.createElement('h2');
        heading.textContent = lesson.title_fa;

        const actions = document.createElement('div');
        actions.className = 'course-lesson-popover-actions';
        const continueButton = createButton(
          jumpAvailable ? 'پرش به این درس' : unlocked ? 'ادامه درس' : 'قفل است',
          'primary-button course-lesson-continue',
          () => startLesson(lesson),
        );
        continueButton.disabled = !unlocked;

        const detailsButton = createButton('جزئیات درس', 'course-secondary-button course-lesson-details-toggle', () => {
          const expanded = detailsButton.getAttribute('aria-expanded') === 'true';
          detailsButton.setAttribute('aria-expanded', String(!expanded));
          details.hidden = expanded;
          detailsButton.textContent = expanded ? 'جزئیات درس' : 'بستن جزئیات';
        });
        detailsButton.setAttribute('aria-expanded', 'false');

        actions.append(continueButton, detailsButton);

        const details = document.createElement('div');
        details.className = 'course-lesson-popover-details';
        details.hidden = true;
        const objective = document.createElement('p');
        objective.className = 'course-lesson-objective';
        objective.textContent = lesson.objective_fa;
        const summary = document.createElement('p');
        summary.className = 'course-lesson-summary';
        summary.textContent = lesson.summary_fa;
        const grammar = document.createElement('p');
        grammar.className = 'course-lesson-grammar';
        grammar.textContent = `نکتهٔ زبان: ${lesson.grammar_fa}`;
        details.append(objective, summary, grammar);

        actionPanel.append(eyebrow, heading, actions, details);

        if (done && progress.lessonScores[lesson.id]) {
          const score = progress.lessonScores[lesson.id];
          const scoreLabel = document.createElement('small');
          scoreLabel.className = 'course-best-score';
          scoreLabel.textContent = `بهترین نتیجه: ${toPersianNumber(score.correct)} از ${toPersianNumber(score.graded)}`;
          actionPanel.append(scoreLabel);
        }

        step.append(actionPanel);
      };

      section.lessons.forEach((lesson, index) => {
        const done = progress.completedLessons.includes(lesson.id);
        const sectionIndex = sections.indexOf(section);
        const normalUnlocked = isSectionUnlocked(sections, progress, sectionIndex) && isLessonUnlocked(section, progress, index);
        const unlocked = isCourseLessonAccessible(sections, progress, sectionIndex, index);
        const jumpAvailable = index === 0 && unlocked && !normalUnlocked && !done;

        const step = document.createElement('div');
        step.className = `course-path-step${index === section.lessons.length - 1 ? ' is-last' : ''}`;

        const node = createButton(toPersianNumber(lesson.order), 'course-lesson-node', () => {
          openLessonPopover(lesson, node, unlocked, done, step, jumpAvailable);
        });
        node.classList.toggle('is-complete', done);
        node.classList.toggle('is-current', unlocked && !done);
        node.classList.toggle('is-jump', jumpAvailable);
        node.classList.toggle('is-locked', !unlocked);
        node.setAttribute('aria-label', `درس ${toPersianNumber(lesson.order)}: ${lesson.title_fa}`);
        node.setAttribute('aria-expanded', 'false');
        if (!unlocked) node.setAttribute('aria-describedby', 'course-locked-lesson-note');

        const state = document.createElement('span');
        state.className = 'course-lesson-node-state';
        state.textContent = done ? 'کامل شده' : jumpAvailable ? 'قابل پرش' : unlocked ? 'قابل یادگیری' : 'قفل است';

        step.append(node, state);
        lessonSteps.push(step);
        path.append(step);
        if (index < section.lessons.length - 1) {
          const connector = document.createElement('div');
          connector.className = 'course-path-connector';
          connector.setAttribute('aria-hidden', 'true');
          path.append(connector);
        }
      });

      const lockedNote = document.createElement('span');
      lockedNote.id = 'course-locked-lesson-note';
      lockedNote.className = 'course-sr-only';
      lockedNote.textContent = 'این درس هنوز قفل است.';
      path.append(lockedNote);

      const focusedActivities = buildFocusedPracticeActivities(section, progress);
      const weakTargets = weakTargetsForSection(section, progress, Number.POSITIVE_INFINITY);
      const focusedTargetIds = weakTargets.map((target) => target.itemId);
      let focusedCard = null;
      if (focusedActivities.length && focusedTargetIds.length) {
        focusedCard = document.createElement('section');
        focusedCard.className = 'course-focused-practice-card';
        const focusedCopy = document.createElement('div');
        focusedCopy.className = 'course-focused-practice-copy';
        const focusedLabel = document.createElement('span');
        focusedLabel.className = 'course-focused-practice-label';
        focusedLabel.textContent = 'مرور شخصی';
        const focusedTitle = document.createElement('h2');
        focusedTitle.textContent = 'تمرین نقاط ضعف';
        const focusedDescription = document.createElement('p');
        focusedDescription.textContent = `${toPersianNumber(focusedTargetIds.length)} هدف این بخش هنوز به مرور هدفمند نیاز دارد.`;
        const focusedTargets = document.createElement('div');
        focusedTargets.className = 'course-focused-practice-targets';
        for (const targetId of focusedTargetIds.slice(0, 4)) {
          const chip = document.createElement('span');
          chip.lang = 'fi';
          chip.dir = 'ltr';
          chip.textContent = section.items[targetId]?.surface_form || targetId;
          focusedTargets.append(chip);
        }
        focusedCopy.append(focusedLabel, focusedTitle, focusedDescription, focusedTargets);
        const focusedStart = createButton('شروع تمرین هدفمند', 'primary-button course-focused-practice-start', startFocusedPractice);
        focusedCard.append(focusedCopy, focusedStart);
      }

      root.append(catalog, header);
      if (focusedCard) root.append(focusedCard);
      root.append(path);

      const onPageClick = (event) => {
        if (!selectedNode) return;
        const target = event.target;
        if (target instanceof Element && target.closest('.course-lesson-node, .course-lesson-popover')) return;
        closeLessonPopover();
      };
      document.addEventListener('click', onPageClick);
      mapNavigationCleanup = () => {
        document.removeEventListener('click', onPageClick);
      };

      const sectionIndex = sections.indexOf(section);
      const targetLessonIndex = completed === 0
        ? 0
        : section.lessons.findIndex((lesson, index) => (
          !progress.completedLessons.includes(lesson.id)
          && isCourseLessonAccessible(sections, progress, sectionIndex, index)
        ));
      if (targetLessonIndex >= 0 && lessonSteps[targetLessonIndex]) {
        const targetStep = lessonSteps[targetLessonIndex];
        const jumpButton = createButton('↓', 'course-current-lesson-jump', () => {
          targetStep.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        jumpButton.setAttribute('aria-label', 'رفتن به درس قابل یادگیری');
        root.append(jumpButton);

        const updateJumpButton = () => {
          const targetRect = targetStep.getBoundingClientRect();
          const viewRect = courseView.getBoundingClientRect();
          const visibleTop = Math.max(0, viewRect.top);
          const visibleBottom = Math.min(windowObject.innerHeight || document.documentElement.clientHeight, viewRect.bottom);
          const targetVisible = targetRect.top >= visibleTop && targetRect.bottom <= visibleBottom;
          jumpButton.hidden = targetVisible;
          if (targetVisible) return;
          const direction = targetRect.bottom < visibleTop ? 'up' : 'down';
          jumpButton.textContent = direction === 'up' ? '↑' : '↓';
          jumpButton.setAttribute(
            'aria-label',
            direction === 'up' ? 'رفتن به درس قابل یادگیری در بالا' : 'رفتن به درس قابل یادگیری در پایین',
          );
        };

        const scheduleJumpUpdate = () => {
          if (typeof windowObject.requestAnimationFrame === 'function') {
            windowObject.requestAnimationFrame(updateJumpButton);
          } else {
            windowObject.setTimeout(updateJumpButton, 0);
          }
        };
        const onScroll = scheduleJumpUpdate;
        windowObject.addEventListener('scroll', onScroll, { passive: true });
        courseView.addEventListener('scroll', onScroll, { passive: true });
        windowObject.addEventListener('resize', onScroll);
        const previousMapCleanup = mapNavigationCleanup;
        mapNavigationCleanup = () => {
          previousMapCleanup?.();
          windowObject.removeEventListener('scroll', onScroll);
          courseView.removeEventListener('scroll', onScroll);
          windowObject.removeEventListener('resize', onScroll);
        };
        scheduleJumpUpdate();
      }

      root.scrollTop = 0;
    }

    function startLesson(lesson) {
      if (!section || !lesson) return;
      const sectionIndex = sections.indexOf(section);
      const index = section.lessons.findIndex((entry) => entry.id === lesson.id);
      if (!isCourseLessonAccessible(sections, progress, sectionIndex, index)) return;
      activeLesson = lesson;
      setLessonFocusMode(true);
      activityIndex = 0;
      sessionCorrect = 0;
      sessionGraded = 0;
      answered = false;
      beginCourseSession('lesson', lesson.id);
      setHash(`#course-${lesson.id}`);
      showCourseView();
      renderActivity();
    }

    function startFocusedPractice() {
      if (!section) return;
      const activities = buildFocusedPracticeActivities(section, progress);
      if (!activities.length) return renderSectionMap();
      activeLesson = {
        id: `focused-practice-${section.id}`,
        order: 0,
        title_fa: 'تمرین نقاط ضعف',
        summary_fa: 'این جلسه فقط از تمرین‌های بازبینی‌شدهٔ همین بخش ساخته شده و روی هدف‌هایی تمرکز می‌کند که در پاسخ‌های قبلی ضعیف‌تر بوده‌اند.',
        grammar_fa: 'با پاسخ‌های درست، دقت هر هدف به‌روز می‌شود و پس از رسیدن به آستانهٔ لازم از فهرست تمرین هدفمند خارج خواهد شد.',
        activities,
        focused_practice: true,
      };
      setLessonFocusMode(true);
      activityIndex = 0;
      sessionCorrect = 0;
      sessionGraded = 0;
      answered = false;
      beginCourseSession('focused', activeLesson.id);
      setHash(`#course-${section.id}`);
      showCourseView();
      renderActivity();
    }

    function questionHeading(activity) {
      if (activity.type === 'number-grid') return 'اعداد را ببین و با صدای بلند مرور کن.';
      if (activity.type === 'sequence-order') return activity.label_fa || 'موارد را به‌ترتیب درست بچین.';
      if (activity.type === 'clock-choice') return 'ساعت درست را به فنلاندی انتخاب کن.';
      if (activity.type === 'negative-transform') return 'جمله را به شکل منفی تبدیل کن.';
      if (activity.type === 'guided-writing') return `${toPersianNumber(activity.expected_items.length)} جملهٔ راهنمایی‌شده را به فنلاندی بنویس.`;
      if (activity.type === 'event-time-match') return 'رویداد را با زمان درست جور کن.';
      if (activity.type === 'visual-choice') return 'نام درست تصویر را انتخاب کن.';
      if (activity.type === 'prompt-choice') return 'پاسخ درست را انتخاب کن.';
      if (activity.type === 'category-match') return 'دستهٔ درست را انتخاب کن.';
      if (activity.type === 'short-reading') return 'متن کوتاه را بخوان و پاسخ درست را انتخاب کن.';
      if (activity.type === 'dialogue-order') return 'گفت‌وگوی کوتاه را مرتب کن.';
      if (activity.type === 'sentence-order') return 'کلمات را برای ساختن جملهٔ درست مرتب کن.';
      if (activity.type === 'expression-completion') return 'بخش حذف‌شدهٔ عبارت را کامل کن.';
      if (activity.type === 'controlled-production') return 'با راهنماها جملهٔ فنلاندی را بنویس.';
      if (activity.type === 'morphology-choice') return 'شکل صرفی درست را انتخاب کن.';
      if (activity.type === 'inflection-production') return 'شکل صرف‌شدهٔ درست را بنویس.';
      if (activity.type === 'production') return 'فارسی را به فنلاندی بنویس.';
      if (activity.type === 'dictation') return 'گوش کن و چیزی را که می‌شنوی به فنلاندی بنویس.';
      if (activity.type === 'teach') return 'عبارت جدید را ببین و با صدای بلند تکرار کن.';
      if (activity.mode === 'meaning') return 'معنی درست را انتخاب کن.';
      if (activity.mode === 'finnish') return 'گزینهٔ فنلاندی درست را انتخاب کن.';
      if (activity.mode === 'listen') return 'گوش بده و معنی درست را انتخاب کن.';
      return activity.type === 'type' ? 'پاسخ را به فنلاندی بنویس.' : 'جای خالی را کامل کن.';
    }

    function renderActivity() {
      if (!activeLesson) return renderSectionMap();
      const activity = activeLesson.activities[activityIndex];
      if (!activity) return completeLesson();
      if (activityTimingIndex !== activityIndex) {
        activityTimingIndex = activityIndex;
        activityStartedAt = Date.now();
      }
      answered = false;
      const item = ['dialogue-order', 'number-grid', 'sequence-order', 'negative-transform', 'guided-writing', 'event-time-match', 'visual-choice', 'prompt-choice', 'category-match', 'short-reading'].includes(activity.type)
        ? null
        : section.items[activity.item];
      root.replaceChildren();

      const shell = document.createElement('section');
      shell.className = 'course-activity-shell';
      const top = document.createElement('header');
      top.className = 'course-activity-top';

      const close = createButton('×', 'course-lesson-close', renderSectionMap);
      close.setAttribute('aria-label', 'بستن درس و بازگشت به فهرست درس‌ها');

      const progressWrap = document.createElement('div');
      progressWrap.className = 'course-activity-progress-wrap';
      const track = document.createElement('div');
      track.className = 'course-activity-progress';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-valuemin', '1');
      track.setAttribute('aria-valuemax', String(activeLesson.activities.length));
      track.setAttribute('aria-valuenow', String(activityIndex + 1));
      track.setAttribute('aria-label', `فعالیت ${toPersianNumber(activityIndex + 1)} از ${toPersianNumber(activeLesson.activities.length)}`);

      const bar = document.createElement('span');
      bar.className = 'course-activity-progress-bar';
      bar.style.width = `${((activityIndex + 1) / activeLesson.activities.length) * 100}%`;

      const counter = document.createElement('strong');
      counter.className = 'course-activity-progress-count';
      counter.textContent = `${toPersianNumber(activityIndex + 1)} / ${toPersianNumber(activeLesson.activities.length)}`;
      track.append(bar, counter);
      progressWrap.append(track);
      top.append(close, progressWrap);

      const card = document.createElement('div');
      card.className = 'course-question-card';
      const prompt = document.createElement('p');
      prompt.className = 'course-question-label';
      prompt.textContent = questionHeading(activity);
      card.append(prompt);

      if (activityIndex === 0) {
        const intro = createInfoDisclosure((panel) => {
          const summary = document.createElement('p');
          summary.textContent = activeLesson.summary_fa;
          const grammar = document.createElement('p');
          grammar.innerHTML = `<strong>نکتهٔ زبان:</strong> ${activeLesson.grammar_fa}`;
          panel.append(summary, grammar);
        }, 'توضیحات این درس');
        intro.classList.add('course-lesson-inline-info');
        card.append(intro);
      }

      const feedback = document.createElement('div');
      feedback.className = 'course-answer-feedback course-primary-feedback';
      feedback.setAttribute('role', 'status');
      feedback.hidden = true;

      function addExample() {
        const example = document.createElement('div');
        example.className = 'course-example';
        const fi = document.createElement('p');
        fi.lang = 'fi';
        fi.dir = 'ltr';
        fi.textContent = item.example_fi;
        const fa = document.createElement('p');
        fa.textContent = item.example_fa;
        example.append(fi, fa);
        card.append(example);
      }

      if (STRUCTURED_PRACTICE_TYPES.includes(activity.type)) {
        renderStructuredPracticeActivity({
          document,
          windowObject,
          activity,
          item,
          card,
          feedback,
          createButton,
          nextActivity,
          showFeedback,
          recordResult(correct, grading = null) {
            recordActivityResult(activity, correct, grading);
          },
        });
      } else if (MORPHOLOGY_PRACTICE_TYPES.includes(activity.type)) {
        renderMorphologyPracticeActivity({
          document,
          windowObject,
          activity,
          card,
          feedback,
          createButton,
          nextActivity,
          createTypedDifference,
          recordResult(correct, grading = null) {
            recordActivityResult(activity, correct, grading);
          },
        });
      } else if (activity.type === 'number-grid') {
        card.classList.add('is-long-content');
        const instruction = document.createElement('p');
        instruction.className = 'course-number-grid-instruction';
        instruction.textContent = activity.label_fa || 'اعداد این درس را یک‌بار از ابتدا تا انتها مرور کن.';
        const grid = document.createElement('div');
        grid.className = 'course-number-grid';
        for (const itemId of activity.items) {
          const numberItem = section.items[itemId];
          const cell = document.createElement('div');
          cell.className = 'course-number-cell';
          const fi = document.createElement('strong');
          fi.lang = 'fi';
          fi.dir = 'ltr';
          fi.textContent = numberItem.surface_form;
          const fa = document.createElement('span');
          fa.textContent = numberItem.translation_fa;
          cell.append(fi, fa);
          grid.append(cell);
        }
        card.append(instruction, grid, createButton('ادامه', 'primary-button course-next-button', nextActivity));
      } else if (activity.type === 'sequence-order') {
        const instruction = document.createElement('p');
        instruction.className = 'course-sequence-instruction';
        instruction.textContent = activity.label_fa || 'موارد را به‌ترتیب درست بچین.';
        card.append(instruction);

        const ordered = [];
        const answerBox = document.createElement('div');
        answerBox.className = 'course-sentence-answer-box';
        answerBox.lang = 'fi';
        answerBox.dir = 'ltr';
        answerBox.setAttribute('role', 'group');
        answerBox.setAttribute('aria-label', 'ترتیب انتخاب‌شده');

        const itemPool = document.createElement('div');
        itemPool.className = 'course-sentence-token-pool';
        itemPool.setAttribute('aria-label', 'موارد باقی‌مانده');

        const submit = createButton('ثبت پاسخ', 'primary-button course-sentence-submit', () => {
          if (answered || ordered.length !== activity.items.length) return;
          const correct = ordered.every((value, orderIndex) => value === activity.answer_order[orderIndex]);
          recordActivityResult(activity, correct);
          renderSelection();

          const result = document.createElement('div');
          result.className = `course-answer-feedback course-primary-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
          const title = document.createElement('strong');
          title.textContent = correct ? 'ترتیب درست بود.' : 'ترتیب درست را مرور کن.';
          const review = document.createElement('div');
          review.className = 'course-sequence-review';
          for (const answerIndex of activity.answer_order) {
            const line = document.createElement('p');
            line.lang = 'fi';
            line.dir = 'ltr';
            line.textContent = section.items[activity.items[answerIndex]].surface_form;
            review.append(line);
          }
          result.append(title, review, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
          card.append(result);
        });
        submit.disabled = true;

        function renderSelection(focusRequest = null) {
          answerBox.replaceChildren();
          itemPool.replaceChildren();
          const sourceButtons = new Map();

          if (!ordered.length) {
            const placeholder = document.createElement('span');
            placeholder.className = 'course-sentence-answer-placeholder';
            placeholder.textContent = 'موارد انتخاب‌شده اینجا قرار می‌گیرند';
            answerBox.append(placeholder);
          } else {
            ordered.forEach((itemIndex, selectedPosition) => {
              const sequenceItem = section.items[activity.items[itemIndex]];
              const selected = createButton(sequenceItem.surface_form, 'course-sentence-selected-token', () => {
                if (answered) return;
                ordered.splice(selectedPosition, 1);
                renderSelection({ type: 'source', index: itemIndex });
              });
              selected.lang = 'fi';
              selected.dir = 'ltr';
              selected.disabled = answered;
              selected.setAttribute('aria-label', `برگرداندن ${sequenceItem.surface_form} به فهرست`);
              answerBox.append(selected);
            });
          }

          activity.items.forEach((itemId, index) => {
            if (ordered.includes(index)) return;
            const sequenceItem = section.items[itemId];
            const button = createButton(sequenceItem.surface_form, 'course-sentence-source-token', () => {
              if (answered || ordered.includes(index)) return;
              ordered.push(index);
              const remainingIndex = activity.items.findIndex((_, candidateIndex) => !ordered.includes(candidateIndex));
              renderSelection(remainingIndex >= 0 ? { type: 'source', index: remainingIndex } : { type: 'submit' });
            });
            button.lang = 'fi';
            button.dir = 'ltr';
            button.disabled = answered;
            button.setAttribute('aria-label', `افزودن ${sequenceItem.surface_form} به ترتیب`);
            sourceButtons.set(index, button);
            itemPool.append(button);
          });

          submit.disabled = answered || ordered.length !== activity.items.length;
          if (focusRequest?.type === 'source') {
            sourceButtons.get(focusRequest.index)?.focus();
          } else if (focusRequest?.type === 'submit' && !submit.disabled) {
            submit.focus();
          }
        }

        renderSelection();
        card.append(answerBox, itemPool, submit);
      } else if (activity.type === 'clock-choice') {
        const clock = document.createElement('div');
        clock.className = 'course-clock-face';
        clock.setAttribute('role', 'img');
        clock.setAttribute('aria-label', `ساعت ${toPersianNumber(activity.hour)}`);
        const twelve = document.createElement('span');
        twelve.className = 'course-clock-twelve';
        twelve.textContent = '12';
        const six = document.createElement('span');
        six.className = 'course-clock-six';
        six.textContent = '6';
        const hand = document.createElement('span');
        hand.className = 'course-clock-hand';
        hand.style.transform = `translateX(-50%) rotate(${(activity.hour % 12) * 30}deg)`;
        clock.append(twelve, six, hand);

        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options) {
          const optionItem = section.items[optionId];
          const button = createButton(optionItem.surface_form, 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, section.items[activity.item]);
          });
          button.dataset.itemId = optionId;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(clock, options, feedback);
      } else if (activity.type === 'negative-transform') {
        const affirmative = section.items[activity.affirmative_item];
        const negative = section.items[activity.negative_item];
        const focus = document.createElement('strong');
        focus.className = 'course-focus-word';
        focus.lang = 'fi';
        focus.dir = 'ltr';
        focus.textContent = affirmative.surface_form;
        const hint = document.createElement('p');
        hint.className = 'course-transform-hint';
        hint.textContent = 'با en و شکل منفیِ درست بنویس.';
        const form = document.createElement('form');
        form.className = 'course-typing-form';
        const input = document.createElement('input');
        input.type = 'text';
        input.lang = 'fi';
        input.dir = 'ltr';
        input.autocomplete = 'off';
        input.autocapitalize = 'none';
        input.spellcheck = false;
        input.setAttribute('aria-label', 'جملهٔ منفی فنلاندی');
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'primary-button compact';
        submit.textContent = 'بررسی';
        form.append(input, submit);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (answered || !input.value.trim()) return;
          const grading = gradeTypedAnswer(negative, input.value);
          const correct = grading.accepted;
          recordActivityResult(activity, correct, grading);
          input.disabled = true;
          submit.disabled = true;
          input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
          showFeedback(feedback, correct, negative, grading);
        });
        card.append(focus, hint, form, feedback);
        windowObject.setTimeout(() => input.focus(), 0);
      } else if (activity.type === 'guided-writing') {
        const form = document.createElement('form');
        form.className = 'course-guided-writing';
        const rows = [];
        activity.expected_items.forEach((itemId, index) => {
          const expected = section.items[itemId];
          const row = document.createElement('label');
          row.className = 'course-guided-writing-row';
          const promptText = document.createElement('span');
          promptText.textContent = `${toPersianNumber(index + 1)}. ${expected.translation_fa}`;
          const input = document.createElement('input');
          input.type = 'text';
          input.lang = 'fi';
          input.dir = 'ltr';
          input.autocomplete = 'off';
          input.autocapitalize = 'none';
          input.spellcheck = false;
          row.append(promptText, input);
          form.append(row);
          rows.push({ input, expected });
        });
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'primary-button compact';
        submit.textContent = 'بررسی پاسخ‌ها';
        form.append(submit);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (answered || rows.some(({ input }) => !input.value.trim())) return;
          const gradings = rows.map(({ input, expected }) => gradeTypedAnswer(expected, input.value));
          const correct = gradings.every((grading) => grading.accepted);
          const hasFuzzy = gradings.some((grading) => grading.fuzzy);
          recordActivityResult(activity, correct, {
            exact: gradings.every((grading) => grading.exact),
            fuzzy: hasFuzzy,
            diacriticAdjusted: gradings.some((grading) => grading.diacriticAdjusted),
          });
          rows.forEach(({ input }, index) => {
            const grading = gradings[index];
            input.disabled = true;
            input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
          });
          submit.disabled = true;
          const result = document.createElement('div');
          result.className = `course-answer-feedback course-primary-feedback ${correct ? (hasFuzzy ? 'is-near-correct' : 'is-correct') : 'is-wrong'}`;
          const title = document.createElement('strong');
          title.textContent = correct
            ? hasFuzzy ? 'پاسخ‌ها پذیرفته شدند؛ تفاوت‌های کوچک را مرور کن.' : `هر ${toPersianNumber(rows.length)} جمله درست بود.`
            : 'پاسخ‌های دارای اختلاف را مرور کن.';
          const review = document.createElement('div');
          review.className = 'course-guided-writing-review';
          rows.forEach(({ expected }, index) => {
            const grading = gradings[index];
            if (!grading.exact) {
              review.append(createTypedDifference(grading, `جملهٔ ${toPersianNumber(index + 1)}`));
              return;
            }
            const line = document.createElement('p');
            line.lang = 'fi';
            line.dir = 'ltr';
            line.textContent = expected.surface_form;
            review.append(line);
          });
          result.append(title, review, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
          card.append(result);
        });
        card.append(form);
      } else if (activity.type === 'event-time-match') {
        const eventItem = section.items[activity.event_item];
        const timeItem = section.items[activity.time_item];
        const eventText = document.createElement('strong');
        eventText.className = 'course-focus-word';
        eventText.lang = 'fi';
        eventText.dir = 'ltr';
        eventText.textContent = eventItem.surface_form;
        const translation = document.createElement('p');
        translation.className = 'course-cloze-translation';
        translation.textContent = eventItem.translation_fa;
        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options) {
          const optionItem = section.items[optionId];
          const button = createButton(optionItem.surface_form, 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.time_item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.time_item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, timeItem);
          });
          button.dataset.itemId = optionId;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(eventText, translation, options, feedback);
      } else if (activity.type === 'visual-choice') {
        const visualItem = section.items[activity.item];
        const visual = document.createElement('div');
        visual.className = 'course-visual-prompt';
        visual.setAttribute('aria-label', visualItem.translation_fa);
        visual.textContent = visualItem.visual;
        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options) {
          const optionItem = section.items[optionId];
          const button = createButton(optionItem.surface_form, 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, visualItem);
          });
          button.dataset.itemId = optionId;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(visual, options, feedback);
      } else if (activity.type === 'prompt-choice') {
        const promptItem = section.items[activity.prompt_item];
        const answerItem = section.items[activity.answer_item];
        const focus = document.createElement('strong');
        focus.className = 'course-focus-word';
        focus.lang = 'fi';
        focus.dir = 'ltr';
        focus.textContent = promptItem.surface_form;
        const translation = document.createElement('p');
        translation.className = 'course-cloze-translation';
        translation.textContent = promptItem.translation_fa;
        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options) {
          const optionItem = section.items[optionId];
          const button = createButton(optionItem.surface_form, 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.answer_item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.answer_item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, answerItem);
          });
          button.dataset.itemId = optionId;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(focus, translation, options, feedback);
      } else if (activity.type === 'category-match') {
        const categoryItem = section.items[activity.item];
        const visual = document.createElement('div');
        visual.className = 'course-visual-prompt';
        visual.textContent = categoryItem.visual || categoryItem.surface_form;
        const word = document.createElement('strong');
        word.className = 'course-category-word';
        word.lang = 'fi';
        word.dir = 'ltr';
        word.textContent = categoryItem.surface_form;
        const options = document.createElement('div');
        options.className = 'course-options';
        for (const category of activity.options) {
          const button = createButton(category, 'course-option', () => {
            if (answered) return;
            const correct = category === activity.answer;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.category === activity.answer) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            const synthetic = { surface_form: activity.answer, translation_fa: 'دستهٔ درست', example_fi: '', example_fa: '' };
            showFeedback(feedback, correct, synthetic);
          });
          button.dataset.category = category;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(visual, word, options, feedback);
      } else if (activity.type === 'short-reading') {
        const reading = section.items[activity.item];
        const answerItem = section.items[activity.question_item];
        const passage = document.createElement('p');
        passage.className = 'course-reading-passage';
        passage.lang = 'fi';
        passage.dir = 'ltr';
        passage.textContent = reading.surface_form;
        const promptText = document.createElement('p');
        promptText.className = 'course-reading-question';
        promptText.textContent = 'کدام جمله در متن آمده است؟';
        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options) {
          const optionItem = section.items[optionId];
          const button = createButton(optionItem.surface_form, 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.question_item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.question_item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, answerItem);
          });
          button.dataset.itemId = optionId;
          button.lang = 'fi';
          button.dir = 'ltr';
          options.append(button);
        }
        card.append(passage, promptText, options, feedback);
      } else if (activity.type === 'dialogue-order') {
        const instruction = document.createElement('p');
        instruction.className = 'course-dialogue-instruction';
        instruction.textContent = activity.label_fa || `${toPersianNumber(activity.turns.length)} نوبت گفت‌وگو را به ترتیب درست بچین.`;
        card.append(instruction);

        const ordered = [];
        const turns = document.createElement('div');
        turns.className = 'course-dialogue-options';
        activity.turns.forEach((itemId, index) => {
          const turnItem = section.items[itemId];
          const button = createButton(turnItem.surface_form, 'course-option', () => {
            if (answered || ordered.includes(index)) return;
            ordered.push(index);
            button.disabled = true;
            button.dataset.order = String(ordered.length);
            button.textContent = `${toPersianNumber(ordered.length)}. ${turnItem.surface_form}`;
            if (ordered.length === activity.turns.length) {
              const correct = ordered.every((value, orderIndex) => value === activity.answer_order[orderIndex]);
              recordActivityResult(activity, correct);
              const result = document.createElement('div');
              result.className = `course-answer-feedback course-primary-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
              const title = document.createElement('strong');
              title.textContent = correct ? 'ترتیب درست بود.' : 'ترتیب درست را دوباره مرور کن.';
              const dialogue = document.createElement('div');
              dialogue.className = 'course-dialogue-review';
              for (const answerIndex of activity.answer_order) {
                const line = document.createElement('p');
                line.lang = 'fi';
                line.dir = 'ltr';
                line.textContent = section.items[activity.turns[answerIndex]].surface_form;
                dialogue.append(line);
              }
              result.append(title, dialogue, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
              card.append(result);
            }
          });
          button.lang = 'fi';
          button.dir = 'ltr';
          turns.append(button);
        });
        card.append(turns);
      } else if (activity.type === 'teach') {
        const word = document.createElement('div');
        word.className = 'course-teach-word';
        const surface = document.createElement('strong');
        surface.lang = 'fi';
        surface.dir = 'ltr';
        surface.textContent = item.surface_form;
        const speechStatus = finnishSpeechStatus(windowObject);
        word.append(surface);
        if (speechStatus.state === 'ready') {
          const speak = createButton('🔊', 'course-speak-button', () => playSpeech(windowObject, item.surface_form));
          speak.setAttribute('aria-label', `پخش تلفظ ${item.surface_form}`);
          word.append(speak);
        }
        const meaning = document.createElement('p');
        meaning.className = 'course-teach-meaning';
        meaning.textContent = item.translation_fa;
        card.append(word, meaning);
        addExample();
        card.append(createButton('ادامه', 'primary-button course-next-button', nextActivity));
      } else if (activity.type === 'choice') {
        const speechStatus = activity.mode === 'listen' ? finnishSpeechStatus(windowObject) : null;
        const speechUnavailable = activity.mode === 'listen' && speechStatus.state !== 'ready';
        if (activity.mode === 'meaning') {
          const focus = document.createElement('strong');
          focus.className = 'course-focus-word';
          focus.lang = 'fi';
          focus.dir = 'ltr';
          focus.textContent = item.surface_form;
          card.append(focus);
        } else if (activity.mode === 'finnish') {
          const focus = document.createElement('strong');
          focus.className = 'course-focus-meaning';
          focus.textContent = item.translation_fa;
          card.append(focus);
        } else if (activity.mode === 'listen') {
          if (speechUnavailable) {
            card.append(createSpeechStatusNotice(speechStatus));
          } else {
            const listen = createButton('پخش صدا', 'course-listen-button', () => playSpeech(windowObject, item.surface_form));
            card.append(listen);
            windowObject.setTimeout(() => playSpeech(windowObject, item.surface_form), 180);
          }
        } else {
          const sentence = document.createElement('p');
          sentence.className = 'course-cloze-sentence';
          sentence.lang = 'fi';
          sentence.dir = 'ltr';
          sentence.textContent = makeCloze(item.example_fi, item.surface_form);
          const translation = document.createElement('p');
          translation.className = 'course-cloze-translation';
          translation.textContent = item.example_fa;
          card.append(sentence, translation);
        }

        const options = document.createElement('div');
        options.className = 'course-options';
        for (const optionId of activity.options || []) {
          const optionItem = section.items[optionId];
          const button = createButton(optionLabel(optionItem, activity.mode), 'course-option', () => {
            if (answered) return;
            const correct = optionId === activity.item;
            recordActivityResult(activity, correct);
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, item);
          });
          button.dataset.itemId = optionId;
          button.disabled = speechUnavailable;
          if (activity.mode !== 'meaning' && activity.mode !== 'listen') {
            button.lang = 'fi';
            button.dir = 'ltr';
          }
          options.append(button);
        }
        card.append(options, feedback);
        if (speechUnavailable) {
          card.append(createButton('ادامه بدون تمرین شنیداری', 'primary-button course-next-button', nextActivity));
        }
      } else {
        const speechStatus = activity.type === 'dictation' ? finnishSpeechStatus(windowObject) : null;
        const speechUnavailable = activity.type === 'dictation' && speechStatus.state !== 'ready';
        if (activity.type === 'dictation') {
          const listen = createButton('پخش دوبارهٔ صدا', 'course-listen-button', () => playSpeech(windowObject, item.surface_form));
          listen.setAttribute('aria-label', 'پخش دوبارهٔ عبارت برای دیکته');
          listen.disabled = speechUnavailable;
          card.append(listen);
          if (speechUnavailable) {
            card.append(createSpeechStatusNotice(speechStatus));
          } else {
            windowObject.setTimeout(() => playSpeech(windowObject, item.surface_form), 180);
          }
        } else if (activity.mode === 'cloze') {
          const sentence = document.createElement('p');
          sentence.className = 'course-cloze-sentence';
          sentence.lang = 'fi';
          sentence.dir = 'ltr';
          sentence.textContent = makeCloze(item.example_fi, item.surface_form);
          const translation = document.createElement('p');
          translation.className = 'course-cloze-translation';
          translation.textContent = item.example_fa;
          card.append(sentence, translation);
        } else {
          const meaning = document.createElement('strong');
          meaning.className = 'course-focus-meaning';
          meaning.textContent = item.translation_fa;
          card.append(meaning);
        }
        const form = document.createElement('form');
        form.className = 'course-typing-form';
        const input = document.createElement('input');
        input.type = 'text';
        input.lang = 'fi';
        input.dir = 'ltr';
        input.autocomplete = 'off';
        input.autocapitalize = 'none';
        input.spellcheck = false;
        input.setAttribute('aria-label', activity.type === 'dictation' ? 'پاسخ دیکته به فنلاندی' : 'پاسخ فنلاندی');
        input.disabled = speechUnavailable;
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'primary-button compact';
        submit.textContent = 'بررسی';
        submit.disabled = speechUnavailable;
        form.append(input, submit);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (answered || !input.value.trim()) return;
          const grading = gradeTypedAnswer(item, input.value);
          const correct = grading.accepted;
          recordActivityResult(activity, correct, grading);
          input.disabled = true;
          submit.disabled = true;
          input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
          showFeedback(feedback, correct, item, grading);
        });
        card.append(form, feedback);
        if (speechUnavailable) {
          card.append(createButton('ادامه بدون دیکته', 'primary-button course-next-button', nextActivity));
        } else {
          windowObject.setTimeout(() => input.focus(), 0);
        }
      }

      shell.append(top, card);
      root.append(shell);
      root.scrollTop = 0;
    }

    function showFeedback(container, correct, item, grading = null) {
      container.replaceChildren();
      container.hidden = false;
      const fuzzy = Boolean(grading && grading.fuzzy);
      container.className = `course-answer-feedback course-primary-feedback ${correct ? (fuzzy ? 'is-near-correct' : 'is-correct') : 'is-wrong'}`;
      const title = document.createElement('strong');
      title.textContent = grading?.diacriticAdjusted && correct
        ? 'درست حساب شد؛ املای استاندارد فنلاندی را مرور کن.'
        : fuzzy
          ? 'قبول شد؛ پاسخ خیلی نزدیک بود.'
          : correct ? 'آفرین، درست بود.' : `پاسخ درست: ${item.surface_form}`;
      container.append(title);
      if (grading && !grading.exact) container.append(createTypedDifference(grading));
      const example = document.createElement('div');
      example.className = 'course-feedback-example';
      const fi = document.createElement('p');
      fi.lang = 'fi';
      fi.dir = 'ltr';
      fi.textContent = item.example_fi;
      const fa = document.createElement('p');
      fa.textContent = item.example_fa;
      example.append(fi, fa);
      container.append(example, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
    }

    function nextActivity() {
      activityIndex += 1;
      if (activityIndex >= activeLesson.activities.length) completeLesson();
      else renderActivity();
    }

    function completeLesson() {
      if (!activeLesson) return renderSectionMap();
      if (activeLesson.focused_practice) {
        const remainingActivities = buildFocusedPracticeActivities(section, progress);
        const remainingTargets = weakTargetsForSection(section, progress, Number.POSITIVE_INFINITY);
        root.replaceChildren();

        const card = document.createElement('section');
        card.className = 'course-completion-card';
        const badge = document.createElement('div');
        badge.className = 'course-completion-badge';
        badge.textContent = '✓';
        const title = document.createElement('h1');
        title.textContent = 'تمرین هدفمند تمام شد';
        const message = document.createElement('p');
        message.textContent = `${toPersianNumber(sessionCorrect)} پاسخ درست از ${toPersianNumber(sessionGraded)} فعالیت نمره‌دار`;
        const note = document.createElement('p');
        note.className = 'course-completion-note';
        note.textContent = remainingTargets.length
          ? `${toPersianNumber(remainingTargets.length)} هدف در این بخش هنوز زیر آستانهٔ دقت تمرین هدفمند است.`
          : 'فعلاً هدف ضعیفی در این بخش باقی نمانده است.';
        card.append(badge, title, message, note);
        if (remainingActivities.length) {
          card.append(createButton('یک دور دیگر', 'primary-button', startFocusedPractice));
        }
        card.append(createButton('بازگشت به نقشهٔ بخش', 'course-secondary-button', renderSectionMap));
        root.append(card);
        root.scrollTop = 0;
        return;
      }

      const passingScore = Number(activeLesson.passing_score || 0);
      const passed = passesLessonRequirement(activeLesson, sessionCorrect, sessionGraded);
      if (passed) {
        progress = recordLessonCompletion(progress, activeLesson.id, sessionCorrect, sessionGraded);
        progress = saveProgress(windowObject.localStorage, progress);
      }

      const currentIndex = section.lessons.findIndex((lesson) => lesson.id === activeLesson.id);
      const nextLesson = section.lessons[currentIndex + 1] || null;
      root.replaceChildren();

      const card = document.createElement('section');
      card.className = 'course-completion-card';
      const badge = document.createElement('div');
      badge.className = 'course-completion-badge';
      badge.textContent = passed ? '✓' : '↻';
      const title = document.createElement('h1');
      title.textContent = passed ? 'درس کامل شد' : 'برای قبولی دوباره تلاش کن';
      const message = document.createElement('p');
      message.textContent = `${toPersianNumber(sessionCorrect)} پاسخ درست از ${toPersianNumber(sessionGraded)} فعالیت نمره‌دار`;
      const note = document.createElement('p');
      note.className = 'course-completion-note';
      note.textContent = passed
        ? 'فعالیت‌های معرفی در امتیاز حساب نمی‌شوند.'
        : `برای قبولی در این آزمون حداقل ${toPersianNumber(Math.round(passingScore * 100))}٪ پاسخ درست لازم است.`;
      card.append(badge, title, message, note);

      if (!passed) {
        card.append(createButton('تلاش دوباره', 'primary-button', () => startLesson(activeLesson)));
        card.append(createButton('بازگشت به نقشهٔ بخش', 'course-secondary-button', renderSectionMap));
        root.append(card);
        root.scrollTop = 0;
        return;
      }

      if (nextLesson) {
        card.append(createButton(`شروع درس ${toPersianNumber(nextLesson.order)}`, 'primary-button', () => startLesson(nextLesson)));
      } else {
        const currentSectionIndex = sections.indexOf(section);
        const nextSection = sections[currentSectionIndex + 1] || null;
        if (nextSection && isSectionUnlocked(sections, progress, currentSectionIndex + 1)) {
          card.append(createButton(
            `شروع بخش ${toPersianNumber(nextSection.curriculum_contract.order)}`,
            'primary-button',
            () => {
              selectSection(nextSection);
              renderSectionMap();
            },
          ));
        }
      }
      card.append(createButton('بازگشت به نقشهٔ بخش', 'course-secondary-button', renderSectionMap));
      root.append(card);
      root.scrollTop = 0;
    }

    function syncFromHash() {
      if (!isCourseHash()) {
        hideCourseView();
        return;
      }
      showCourseView();
      if (!sections.length) return;

      const lessonMatch = lessonFromHash();
      if (lessonMatch) {
        const targetSectionIndex = sections.indexOf(lessonMatch.section);
        const lessonIndex = lessonMatch.section.lessons.findIndex((entry) => entry.id === lessonMatch.lesson.id);
        if (isCourseLessonAccessible(sections, progress, targetSectionIndex, lessonIndex)) {
          section = lessonMatch.section;
          startLesson(lessonMatch.lesson);
        } else {
          section = preferredSection();
          renderSectionMap();
        }
        return;
      }

      const targetSection = sectionFromHash();
      if (targetSection && selectSection(targetSection, { updateHash: false })) {
        if (!activeLesson) renderSectionMap();
        return;
      }

      section = preferredSection();
      if (!activeLesson) renderSectionMap();
    }

    courseLinks.forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      activeLesson = null;
      section = preferredSection();
      renderSectionMap();
    }));
    regularLinks.forEach((link) => link.addEventListener('click', hideCourseView));
    windowObject.addEventListener('hashchange', syncFromHash);
    windowObject.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      progress = loadProgress(windowObject.localStorage);
      if (isCourseHash() && !activeLesson) renderSectionMap();
    });

    windowObject.addEventListener('finnish-course-progress-reset', () => {
      progress = loadProgress(windowObject.localStorage);
      activeLesson = null;
      section = sections[0] || null;
      if (isCourseHash()) renderSectionMap();
    });

    if (windowObject.speechSynthesis && typeof windowObject.speechSynthesis.addEventListener === 'function') {
      windowObject.speechSynthesis.addEventListener('voiceschanged', () => {
        if (!activeLesson) return;
        const currentActivity = activeLesson.activities[activityIndex];
        if (shouldRefreshSpeechActivity(currentActivity, answered)) renderActivity();
      });
    }

    if (typeof windowObject.MutationObserver === 'function') {
      const observer = new windowObject.MutationObserver(() => {
        if (!isCourseHash()) return;
        const competingViewVisible = Object.entries(views).some(([name, view]) => name !== 'course' && view && !view.hidden);
        if (courseView.hidden || competingViewVisible) showCourseView();
      });
      for (const view of Object.values(views)) {
        if (view) observer.observe(view, { attributes: true, attributeFilter: ['hidden'] });
      }
    }

    const version = document.querySelector('meta[name="app-version"]')?.content || Date.now();
    renderLoading();
    Promise.all(COURSE_STAGES.map(async (stage) => {
      const [curriculumResponse, ...sectionResponses] = await Promise.all([
        windowObject.fetch(`${stage.curriculumUrl}?v=${version}`, { cache: 'no-store' }),
        ...stage.sectionUrls.map((url) => windowObject.fetch(`${url}?v=${version}`, { cache: 'no-store' })),
      ]);
      if (!curriculumResponse.ok) throw new Error(String(curriculumResponse.status));
      for (const response of sectionResponses) {
        if (!response.ok) throw new Error(String(response.status));
      }
      return {
        level: stage.level,
        curriculum: await curriculumResponse.json(),
        sections: await Promise.all(sectionResponses.map((response) => response.json())),
      };
    }))
      .then((stagePayloads) => {
        curricula = new Map(stagePayloads.map((stage) => [stage.level, stage.curriculum]));
        sections = validateImplementedPath(stagePayloads);
        progress = loadProgress(windowObject.localStorage);
        section = preferredSection();
        if (isCourseHash()) syncFromHash();
        else {
          courseView.hidden = true;
          activateCourseNavigation(false);
        }
      })
      .catch((error) => {
        console.error(error);
        renderLoading('بارگذاری بخش آموزشی انجام نشد.');
      });

    syncFromHash();
  }

  if (typeof window !== 'undefined' && window.document) {
    if (window.document.readyState === 'loading') {
      window.document.addEventListener('DOMContentLoaded', () => initializeBrowser(window), { once: true });
    } else {
      initializeBrowser(window);
    }
  }

  return {
    STORAGE_KEY,
    SCHEMA_VERSION,
    COURSE_STAGES,
    SECTION_URLS,
    SECTION_URL,
    CURRICULUM_URL,
    WEAK_TARGET_ACCURACY,
    FOCUSED_PRACTICE_LIMIT,
    ANSWER_HISTORY_LIMIT,
    ANSWER_HISTORY_MAX_BYTES,
    utf8ByteLength,
    trimAnswerHistoryToBudget,
    normalizeAnswer,
    foldFinnishDiacritics,
    emptyProgress,
    sanitizeProgress,
    loadProgress,
    saveProgress,
    resetProgress,
    isLessonUnlocked,
    isSectionComplete,
    isSectionUnlocked,
    isSectionStarted,
    isBackfillSectionUnlocked,
    isSectionAccessible,
    isCourseLessonAccessible,
    passesLessonRequirement,
    recordLessonCompletion,
    targetPerformanceKey,
    recordTargetAttempt,
    recordAnswerHistoryEvent,
    answerHistoryForTarget,
    courseSessionId,
    activityPrimaryTargetId,
    isProductiveCourseActivity,
    courseActivityDirection,
    isGuidedCourseActivity,
    weakTargetsForSection,
    buildFocusedPracticeActivities,
    makeCloze,
    acceptedAnswers,
    alignAnswers,
    answerSimilarity,
    gradeTypedAnswer,
    gradeMorphologyAnswer,
    isTypedAnswerCorrect,
    speechApiAvailable,
    findFinnishVoice,
    finnishSpeechStatus,
    speechSettingsGuide,
    supportsSpeech,
    playSpeech,
    activityNeedsFinnishSpeech,
    shouldRefreshSpeechActivity,
    STRUCTURED_PRACTICE_TYPES,
    injectStructuredPractice,
    renderStructuredPracticeActivity,
    MORPHOLOGY_PRACTICE_TYPES,
    injectMorphologyPractice,
    renderMorphologyPracticeActivity,
    optionLabel,
    uniqueOptions,
    buildStandardActivities,
    buildCheckpointActivities,
    prepareSection,
    validateSection,
    validateSectionAgainstCurriculum,
    validateImplementedCourse,
    validateImplementedPath,
    initializeBrowser,
  };
});
