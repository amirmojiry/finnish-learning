(function attachCourse(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinnishCourse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCourseApi() {
  'use strict';

  const STORAGE_KEY = 'fiCourseProgressV1';
  const SCHEMA_VERSION = 1;
  const SECTION_URLS = [
    './data/course/a1.1-section-1.json',
    './data/course/a1.1-section-2.json',
    './data/course/a1.1-section-3.json',
    './data/course/a1.1-section-4.json',
  ];
  const SECTION_URL = SECTION_URLS[0];
  const CURRICULUM_URL = './data/course/a1.1-curriculum.json';

  function normalizeAnswer(value) {
    return String(value || '')
      .normalize('NFC')
      .toLocaleLowerCase('fi-FI')
      .trim()
      .replace(/[?.!,;:،؛؟]+$/u, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function emptyProgress() {
    return {
      version: SCHEMA_VERSION,
      completedLessons: [],
      lessonScores: {},
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
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
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
    const entered = normalizeAnswer(enteredValue);
    const expected = normalizeAnswer(expectedValue);
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
        similarity: 0,
        entered,
        expected: candidates[0] || '',
        operations: [],
      };
    }

    let best = null;
    for (const expected of candidates) {
      const alignment = alignAnswers(entered, expected);
      const length = Math.max(Array.from(entered).length, Array.from(expected).length);
      const similarity = length ? Math.max(0, 1 - (alignment.distance / length)) : 1;
      const candidate = { expected, similarity, operations: alignment.operations };
      if (!best || candidate.similarity > best.similarity) best = candidate;
    }

    const exact = best.similarity === 1;
    const accepted = exact || best.similarity >= 0.8;
    return {
      accepted,
      exact,
      fuzzy: accepted && !exact,
      similarity: best.similarity,
      entered,
      expected: best.expected,
      operations: best.operations,
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

  function playSpeech(windowObject, text) {
    if (!text || !windowObject || !('speechSynthesis' in windowObject)) return false;
    windowObject.speechSynthesis.cancel();
    const utterance = new windowObject.SpeechSynthesisUtterance(text);
    utterance.lang = 'fi-FI';
    utterance.rate = 0.82;
    windowObject.speechSynthesis.speak(utterance);
    return true;
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
      if (activity.item === targetId && (activity.type === 'choice' || activity.type === 'type')) {
        replacementIndex = index;
        break;
      }
    }
    if (replacementIndex < 0) {
      for (let index = lesson.activities.length - 1; index >= 0; index -= 1) {
        if (lesson.activities[index].type === 'choice' || lesson.activities[index].type === 'type') {
          replacementIndex = index;
          break;
        }
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
      for (const activity of lesson.activities) {
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

  function validateImplementedCourse(rawSections, curriculum) {
    if (!Array.isArray(rawSections) || !rawSections.length) throw new Error('No implemented course sections.');
    const validated = rawSections.map((rawSection) => validateSectionAgainstCurriculum(validateSection(rawSection), curriculum));
    const sectionOrders = validated.map((implemented) => implemented.curriculum_contract.order);
    const sortedOrders = [...sectionOrders].sort((a, b) => a - b);
    if (JSON.stringify(sectionOrders) !== JSON.stringify(sortedOrders)) throw new Error('Implemented sections must follow curriculum order.');

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
          if (activity.type !== 'type' && activity.type !== 'production') continue;
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

  function initializeBrowser(windowObject) {
    const document = windowObject.document;
    const root = document && document.getElementById('course-root');
    const courseView = document && document.getElementById('course-view');
    if (!document || !root || !courseView || courseView.dataset.initialized === 'true') return;
    courseView.dataset.initialized = 'true';

    const views = {
      home: document.getElementById('home-view'),
      dictionary: document.getElementById('dictionary-view'),
      profile: document.getElementById('profile-view'),
      settings: document.getElementById('settings-view'),
      about: document.getElementById('about-view'),
      course: courseView,
    };
    const mobileTitle = document.getElementById('mobile-view-title');
    const courseLinks = [...document.querySelectorAll('.course-view-link')];
    const regularLinks = [...document.querySelectorAll('[data-view-link], .profile-view-link, .settings-view-link, .about-view-link')];
    const allPrimaryItems = [...document.querySelectorAll('.bottom-nav-item, .desktop-view-link')];

    let sections = [];
    let section = null;
    let curriculum = null;
    let progress = loadProgress(windowObject.localStorage);
    let activeLesson = null;
    let infoDisclosureId = 0;
    let activityIndex = 0;
    let sessionCorrect = 0;
    let sessionGraded = 0;
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

    function showCourseView({ updateHash = false } = {}) {
      for (const [name, view] of Object.entries(views)) {
        if (view) view.hidden = name !== 'course';
      }
      activateCourseNavigation(true);
      if (mobileTitle) mobileTitle.textContent = activeLesson ? activeLesson.title_fa : 'دوره';
      if (updateHash && !isCourseHash()) history.replaceState(null, '', '#course');
    }

    function hideCourseView() {
      courseView.hidden = true;
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
      activeLesson = null;
      if (!section) section = preferredSection();
      if (section) setHash(`#course-${section.id}`);
      showCourseView();
      if (!section) return renderLoading();
      root.replaceChildren();

      const catalog = document.createElement('section');
      catalog.className = 'course-section-catalog course-section-selector';
      const catalogTitle = document.createElement('div');
      catalogTitle.className = 'course-section-catalog-heading';
      catalogTitle.innerHTML = '<h1>مسیر A1.1</h1>';
      catalog.append(catalogTitle);

      const currentContract = curriculum?.sections?.find((entry) => entry.id === section.curriculum_section_id) || section.curriculum_contract;
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

      for (const entry of curriculum?.sections || []) {
        const implemented = sections.find((candidate) => candidate.curriculum_section_id === entry.id) || null;
        const implementedIndex = implemented ? sections.indexOf(implemented) : -1;
        const unlocked = implemented ? isSectionUnlocked(sections, progress, implementedIndex) : false;
        const current = implemented === section;
        const option = createButton('', `course-section-selector-option${current ? ' is-current' : ''}${unlocked ? ' is-unlocked' : ' is-locked'}`, () => {
          if (!implemented || current) return;
          if (!selectSection(implemented)) return;
          renderSectionMap();
        });
        option.disabled = !implemented || current;
        const optionTitle = document.createElement('span');
        optionTitle.textContent = `بخش ${toPersianNumber(entry.order)}: ${entry.title_fa}`;
        const optionStatus = document.createElement('small');
        optionStatus.textContent = current ? 'بخش فعلی' : unlocked ? 'باز کردن' : 'مشاهده (قفل)';
        option.append(optionTitle, optionStatus);
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
      actionPanel.hidden = true;
      let selectedNode = null;
      let selectedStep = null;

      const openLessonPopover = (lesson, node, unlocked, done, step) => {
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
          unlocked ? 'ادامه درس' : 'قفل است',
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
        const unlocked = isSectionUnlocked(sections, progress, sectionIndex) && isLessonUnlocked(section, progress, index);

        const step = document.createElement('div');
        step.className = `course-path-step${index === section.lessons.length - 1 ? ' is-last' : ''}`;

        const node = createButton(toPersianNumber(lesson.order), 'course-lesson-node', () => {
          openLessonPopover(lesson, node, unlocked, done, step);
        });
        node.classList.toggle('is-complete', done);
        node.classList.toggle('is-current', unlocked && !done);
        node.classList.toggle('is-locked', !unlocked);
        node.setAttribute('aria-label', `درس ${toPersianNumber(lesson.order)}: ${lesson.title_fa}`);
        node.setAttribute('aria-expanded', 'false');
        if (!unlocked) node.setAttribute('aria-describedby', 'course-locked-lesson-note');

        const state = document.createElement('span');
        state.className = 'course-lesson-node-state';
        state.textContent = done ? 'کامل شده' : unlocked ? 'قابل یادگیری' : 'قفل است';

        step.append(node, state);
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

      const footer = document.createElement('div');
      footer.className = 'course-map-footer';
      const reset = createButton('پاک‌کردن پیشرفت دوره', 'course-reset-button', () => {
        if (!windowObject.confirm('پیشرفت همهٔ بخش‌های دوره پاک شود؟')) return;
        progress = saveProgress(windowObject.localStorage, emptyProgress());
        section = sections[0] || null;
        renderSectionMap();
      });
      footer.append(reset);

      root.append(catalog, header, path, footer);
      root.scrollTop = 0;
    }

    function startLesson(lesson) {
      if (!section || !lesson) return;
      const sectionIndex = sections.indexOf(section);
      const index = section.lessons.findIndex((entry) => entry.id === lesson.id);
      if (!isSectionUnlocked(sections, progress, sectionIndex) || !isLessonUnlocked(section, progress, index)) return;
      activeLesson = lesson;
      activityIndex = 0;
      sessionCorrect = 0;
      sessionGraded = 0;
      answered = false;
      setHash(`#course-${lesson.id}`);
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
      if (activity.type === 'production') return 'فارسی را به فنلاندی بنویس.';
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
      answered = false;
      const item = ['dialogue-order', 'number-grid', 'sequence-order', 'negative-transform', 'guided-writing', 'event-time-match', 'visual-choice', 'prompt-choice', 'category-match', 'short-reading'].includes(activity.type)
        ? null
        : section.items[activity.item];
      root.replaceChildren();

      const shell = document.createElement('section');
      shell.className = 'course-activity-shell';
      const top = document.createElement('header');
      top.className = 'course-activity-top';
      const back = createButton('بازگشت به درس‌ها', 'course-back-button', renderSectionMap);
      const counter = document.createElement('span');
      counter.textContent = `${toPersianNumber(activityIndex + 1)} از ${toPersianNumber(activeLesson.activities.length)}`;
      top.append(back, counter);

      const track = document.createElement('div');
      track.className = 'course-activity-progress';
      const bar = document.createElement('span');
      bar.style.width = `${((activityIndex + 1) / activeLesson.activities.length) * 100}%`;
      track.append(bar);

      const lessonHeader = document.createElement('div');
      lessonHeader.className = 'course-current-lesson';
      const label = document.createElement('span');
      label.textContent = `درس ${toPersianNumber(activeLesson.order)}`;
      const title = document.createElement('h1');
      title.textContent = activeLesson.title_fa;
      lessonHeader.append(label, title);
      if (activityIndex === 0) {
        const intro = createInfoDisclosure((panel) => {
          const summary = document.createElement('p');
          summary.textContent = activeLesson.summary_fa;
          const grammar = document.createElement('p');
          grammar.innerHTML = `<strong>نکتهٔ زبان:</strong> ${activeLesson.grammar_fa}`;
          panel.append(summary, grammar);
        }, 'توضیحات این درس');
        intro.classList.add('course-lesson-intro');
        lessonHeader.append(intro);
      }

      const card = document.createElement('div');
      card.className = 'course-question-card';
      const prompt = document.createElement('p');
      prompt.className = 'course-question-label';
      prompt.textContent = questionHeading(activity);
      card.append(prompt);

      const feedback = document.createElement('div');
      feedback.className = 'course-answer-feedback';
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

      if (activity.type === 'number-grid') {
        const instruction = document.createElement('p');
        instruction.className = 'course-number-grid-instruction';
        instruction.textContent = 'اعداد ۰ تا ۲۰ را یک‌بار از ابتدا تا انتها مرور کن.';
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
        const items = document.createElement('div');
        items.className = 'course-sequence-options';
        activity.items.forEach((itemId, index) => {
          const sequenceItem = section.items[itemId];
          const button = createButton(sequenceItem.surface_form, 'course-option', () => {
            if (answered || ordered.includes(index)) return;
            ordered.push(index);
            button.disabled = true;
            button.dataset.order = String(ordered.length);
            button.textContent = `${toPersianNumber(ordered.length)}. ${sequenceItem.surface_form}`;
            if (ordered.length === activity.items.length) {
              answered = true;
              sessionGraded += 1;
              const correct = ordered.every((value, orderIndex) => value === activity.answer_order[orderIndex]);
              if (correct) sessionCorrect += 1;
              const result = document.createElement('div');
              result.className = `course-answer-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
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
            }
          });
          button.lang = 'fi';
          button.dir = 'ltr';
          items.append(button);
        });
        card.append(items);
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.item;
            if (correct) sessionCorrect += 1;
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
          answered = true;
          sessionGraded += 1;
          const grading = gradeTypedAnswer(negative, input.value);
          const correct = grading.accepted;
          if (correct) sessionCorrect += 1;
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
          answered = true;
          sessionGraded += 1;
          const gradings = rows.map(({ input, expected }) => gradeTypedAnswer(expected, input.value));
          const correct = gradings.every((grading) => grading.accepted);
          const hasFuzzy = gradings.some((grading) => grading.fuzzy);
          if (correct) sessionCorrect += 1;
          rows.forEach(({ input }, index) => {
            const grading = gradings[index];
            input.disabled = true;
            input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
          });
          submit.disabled = true;
          const result = document.createElement('div');
          result.className = `course-answer-feedback ${correct ? (hasFuzzy ? 'is-near-correct' : 'is-correct') : 'is-wrong'}`;
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.time_item;
            if (correct) sessionCorrect += 1;
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.item;
            if (correct) sessionCorrect += 1;
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.answer_item;
            if (correct) sessionCorrect += 1;
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
            answered = true;
            sessionGraded += 1;
            const correct = category === activity.answer;
            if (correct) sessionCorrect += 1;
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.question_item;
            if (correct) sessionCorrect += 1;
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
              answered = true;
              sessionGraded += 1;
              const correct = ordered.every((value, orderIndex) => value === activity.answer_order[orderIndex]);
              if (correct) sessionCorrect += 1;
              const result = document.createElement('div');
              result.className = `course-answer-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
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
        const speak = createButton('🔊', 'course-speak-button', () => playSpeech(windowObject, item.surface_form));
        speak.setAttribute('aria-label', `پخش تلفظ ${item.surface_form}`);
        word.append(surface, speak);
        const meaning = document.createElement('p');
        meaning.className = 'course-teach-meaning';
        meaning.textContent = item.translation_fa;
        card.append(word, meaning);
        addExample();
        card.append(createButton('ادامه', 'primary-button course-next-button', nextActivity));
      } else if (activity.type === 'choice') {
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
          const listen = createButton('پخش صدا', 'course-listen-button', () => playSpeech(windowObject, item.surface_form));
          card.append(listen);
          windowObject.setTimeout(() => playSpeech(windowObject, item.surface_form), 180);
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
            answered = true;
            sessionGraded += 1;
            const correct = optionId === activity.item;
            if (correct) sessionCorrect += 1;
            for (const optionButton of options.querySelectorAll('button')) {
              optionButton.disabled = true;
              if (optionButton.dataset.itemId === activity.item) optionButton.classList.add('correct');
            }
            if (!correct) button.classList.add('wrong');
            showFeedback(feedback, correct, item);
          });
          button.dataset.itemId = optionId;
          if (activity.mode !== 'meaning' && activity.mode !== 'listen') {
            button.lang = 'fi';
            button.dir = 'ltr';
          }
          options.append(button);
        }
        card.append(options, feedback);
      } else {
        if (activity.mode === 'cloze') {
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
        input.setAttribute('aria-label', 'پاسخ فنلاندی');
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.className = 'primary-button compact';
        submit.textContent = 'بررسی';
        form.append(input, submit);
        form.addEventListener('submit', (event) => {
          event.preventDefault();
          if (answered || !input.value.trim()) return;
          answered = true;
          sessionGraded += 1;
          const grading = gradeTypedAnswer(item, input.value);
          const correct = grading.accepted;
          if (correct) sessionCorrect += 1;
          input.disabled = true;
          submit.disabled = true;
          input.classList.add(grading.exact ? 'correct' : grading.fuzzy ? 'near-correct' : 'wrong');
          showFeedback(feedback, correct, item, grading);
        });
        card.append(form, feedback);
        windowObject.setTimeout(() => input.focus(), 0);
      }

      shell.append(top, track, lessonHeader, card);
      root.append(shell);
      root.scrollTop = 0;
    }

    function showFeedback(container, correct, item, grading = null) {
      container.replaceChildren();
      container.hidden = false;
      const fuzzy = Boolean(grading && grading.fuzzy);
      container.className = `course-answer-feedback ${correct ? (fuzzy ? 'is-near-correct' : 'is-correct') : 'is-wrong'}`;
      const title = document.createElement('strong');
      title.textContent = fuzzy
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
        if (isSectionUnlocked(sections, progress, targetSectionIndex) && isLessonUnlocked(lessonMatch.section, progress, lessonIndex)) {
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
    Promise.all([
      ...SECTION_URLS.map((url) => windowObject.fetch(`${url}?v=${version}`, { cache: 'no-store' })),
      windowObject.fetch(`${CURRICULUM_URL}?v=${version}`, { cache: 'no-store' }),
    ])
      .then(async (responses) => {
        const curriculumResponse = responses[responses.length - 1];
        const sectionResponses = responses.slice(0, -1);
        for (const response of sectionResponses) {
          if (!response.ok) throw new Error(String(response.status));
        }
        if (!curriculumResponse.ok) throw new Error(String(curriculumResponse.status));
        return Promise.all([
          Promise.all(sectionResponses.map((response) => response.json())),
          curriculumResponse.json(),
        ]);
      })
      .then(([sectionPayloads, curriculumPayload]) => {
        curriculum = curriculumPayload;
        sections = validateImplementedCourse(sectionPayloads, curriculum);
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
    SECTION_URLS,
    SECTION_URL,
    CURRICULUM_URL,
    normalizeAnswer,
    emptyProgress,
    sanitizeProgress,
    loadProgress,
    saveProgress,
    isLessonUnlocked,
    isSectionComplete,
    isSectionUnlocked,
    passesLessonRequirement,
    recordLessonCompletion,
    makeCloze,
    acceptedAnswers,
    alignAnswers,
    answerSimilarity,
    gradeTypedAnswer,
    isTypedAnswerCorrect,
    optionLabel,
    uniqueOptions,
    buildStandardActivities,
    buildCheckpointActivities,
    prepareSection,
    validateSection,
    validateSectionAgainstCurriculum,
    validateImplementedCourse,
    initializeBrowser,
  };
});
