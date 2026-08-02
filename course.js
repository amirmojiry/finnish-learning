(function attachCourse(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinnishCourse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCourseApi() {
  'use strict';

  const STORAGE_KEY = 'fiCourseProgressV1';
  const SCHEMA_VERSION = 1;
  const SECTION_URL = './data/course/a1.1-section-1.json';

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

  function isTypedAnswerCorrect(item, answer) {
    const normalized = normalizeAnswer(answer);
    return Boolean(normalized && acceptedAnswers(item).includes(normalized));
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
    if (!Array.isArray(targets) || targets.length !== 5) {
      throw new Error('A standard sample lesson must define exactly five new targets.');
    }
    const [t1, t2, t3, t4, t5] = targets;
    const review = previousTargets.length ? previousTargets[previousTargets.length - 1] : t2;
    return [
      { type: 'teach', item: t1 },
      { type: 'choice', mode: 'meaning', item: t1, options: uniqueOptions([t1, t2, t3, t4]) },
      { type: 'teach', item: t2 },
      { type: 'choice', mode: 'finnish', item: t2, options: uniqueOptions([t1, t2, t3, t5]) },
      { type: 'teach', item: t3 },
      { type: 'choice', mode: 'meaning', item: t3, options: uniqueOptions([t1, t2, t3, t4]) },
      { type: 'teach', item: t4 },
      { type: 'choice', mode: 'cloze', item: t4, options: uniqueOptions([t1, t2, t4, t5]) },
      { type: 'teach', item: t5 },
      { type: 'type', mode: 'finnish', item: t5 },
      { type: 'choice', mode: 'listen', item: t1, options: uniqueOptions([t1, t2, t3, t5]) },
      { type: 'choice', mode: 'cloze', item: t2, options: uniqueOptions([t1, t2, t3, t4]) },
      { type: 'choice', mode: 'meaning', item: review, options: uniqueOptions([review, t1, t3, t5]) },
      { type: 'type', mode: 'cloze', item: t4 },
      { type: 'choice', mode: 'finnish', item: t5, options: uniqueOptions([t2, t3, t4, t5]) },
    ];
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
      if (Array.isArray(lesson.activities)) return;
      if (index === section.lessons.length - 1 && Array.isArray(lesson.checkpoint_targets)) {
        lesson.activities = buildCheckpointActivities(section, lesson);
      } else {
        lesson.activities = buildStandardActivities(lesson.new_targets, seen);
      }
      lesson.review_targets = Array.isArray(lesson.review_targets) ? lesson.review_targets : seen.slice(-3);
      seen.push(...(lesson.new_targets || []));
    });
    return section;
  }

  function validateSection(rawSection) {
    const section = prepareSection(rawSection);
    if (section.lessons.length !== 10) throw new Error('The sample section must contain exactly ten lessons.');
    for (const lesson of section.lessons) {
      if (!lesson.id || !Array.isArray(lesson.activities) || lesson.activities.length !== 15) {
        throw new Error(`Lesson ${lesson.id || '?'} must contain exactly fifteen activities.`);
      }
      for (const activity of lesson.activities) {
        if (!section.items[activity.item]) throw new Error(`Unknown course item: ${activity.item}`);
        for (const optionId of activity.options || []) {
          if (!section.items[optionId]) throw new Error(`Unknown course option: ${optionId}`);
        }
      }
    }
    return section;
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

    let section = null;
    let progress = loadProgress(windowObject.localStorage);
    let activeLesson = null;
    let activityIndex = 0;
    let sessionCorrect = 0;
    let sessionGraded = 0;
    let answered = false;

    function isCourseHash() {
      return location.hash === '#course' || /^#course-lesson-\d+$/.test(location.hash);
    }

    function lessonFromHash() {
      const match = location.hash.match(/^#course-(lesson-\d+)$/);
      return match && section ? section.lessons.find((lesson) => lesson.id === match[1]) || null : null;
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
      if (mobileTitle) mobileTitle.textContent = activeLesson ? activeLesson.title_fa : 'دوره A1.1';
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

    function renderLoading(message = 'در حال آماده‌کردن بخش آموزشی…') {
      root.replaceChildren();
      const status = document.createElement('div');
      status.className = 'course-loading';
      status.textContent = message;
      root.append(status);
    }

    function completionCount() {
      if (!section) return 0;
      return section.lessons.filter((lesson) => progress.completedLessons.includes(lesson.id)).length;
    }

    function renderSectionMap() {
      activeLesson = null;
      setHash('#course');
      showCourseView();
      if (!section) return renderLoading();
      root.replaceChildren();

      const header = document.createElement('header');
      header.className = 'course-hero-card';
      const level = document.createElement('span');
      level.className = 'course-level-badge';
      level.textContent = section.level;
      const title = document.createElement('h1');
      title.textContent = section.title_fa;
      const subtitle = document.createElement('p');
      subtitle.className = 'course-subtitle';
      subtitle.textContent = section.subtitle_fa;
      const description = document.createElement('p');
      description.className = 'course-description';
      description.textContent = section.description_fa;
      header.append(level, title, subtitle, description);

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

      const outcomes = document.createElement('section');
      outcomes.className = 'course-outcomes';
      const outcomesTitle = document.createElement('h2');
      outcomesTitle.textContent = 'در پایان این بخش می‌توانی';
      const outcomesList = document.createElement('ul');
      for (const outcome of section.can_do_fa || []) {
        const item = document.createElement('li');
        item.textContent = outcome;
        outcomesList.append(item);
      }
      outcomes.append(outcomesTitle, outcomesList);

      const path = document.createElement('section');
      path.className = 'course-path';
      path.setAttribute('aria-label', 'درس‌های بخش اول');
      section.lessons.forEach((lesson, index) => {
        const done = progress.completedLessons.includes(lesson.id);
        const unlocked = isLessonUnlocked(section, progress, index);
        const card = document.createElement('article');
        card.className = `course-lesson-card${done ? ' is-complete' : ''}${unlocked ? ' is-unlocked' : ' is-locked'}`;

        const marker = document.createElement('div');
        marker.className = 'course-lesson-marker';
        marker.textContent = done ? '✓' : toPersianNumber(lesson.order);
        marker.setAttribute('aria-hidden', 'true');

        const body = document.createElement('div');
        body.className = 'course-lesson-body';
        const heading = document.createElement('div');
        heading.className = 'course-lesson-heading';
        const lessonLabel = document.createElement('span');
        lessonLabel.textContent = `درس ${toPersianNumber(lesson.order)}`;
        const lessonTitle = document.createElement('h2');
        lessonTitle.textContent = lesson.title_fa;
        heading.append(lessonLabel, lessonTitle);
        const objective = document.createElement('p');
        objective.textContent = lesson.objective_fa;
        body.append(heading, objective);

        const targetList = document.createElement('div');
        targetList.className = 'course-target-list';
        const targetIds = lesson.new_targets.length ? lesson.new_targets : lesson.review_targets.slice(0, 5);
        for (const targetId of targetIds) {
          const target = section.items[targetId];
          if (!target) continue;
          const chip = document.createElement('span');
          chip.lang = 'fi';
          chip.dir = 'ltr';
          chip.textContent = target.surface_form;
          targetList.append(chip);
        }
        body.append(targetList);

        const action = createButton(
          done ? 'تمرین دوباره' : unlocked ? 'شروع درس' : 'قفل است',
          'course-lesson-action',
          () => startLesson(lesson),
        );
        action.disabled = !unlocked;
        if (done && progress.lessonScores[lesson.id]) {
          const score = progress.lessonScores[lesson.id];
          const scoreLabel = document.createElement('small');
          scoreLabel.className = 'course-best-score';
          scoreLabel.textContent = `بهترین نتیجه: ${toPersianNumber(score.correct)} از ${toPersianNumber(score.graded)}`;
          body.append(scoreLabel);
        }
        card.append(marker, body, action);
        path.append(card);
      });

      const footer = document.createElement('div');
      footer.className = 'course-map-footer';
      const note = document.createElement('p');
      note.textContent = 'این بخش یک نمونهٔ محصولی است. محتوای آن بازبینی اولیه شده، اما هنوز جایگزین یک دورهٔ رسمی CEFR نیست.';
      const reset = createButton('پاک‌کردن پیشرفت این نمونه', 'course-reset-button', () => {
        if (!windowObject.confirm('پیشرفت هر ده درس پاک شود؟')) return;
        progress = saveProgress(windowObject.localStorage, emptyProgress());
        renderSectionMap();
      });
      footer.append(note, reset);

      root.append(header, outcomes, path, footer);
      root.scrollTop = 0;
    }

    function startLesson(lesson) {
      if (!section || !lesson) return;
      const index = section.lessons.findIndex((entry) => entry.id === lesson.id);
      if (!isLessonUnlocked(section, progress, index)) return;
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
      const item = section.items[activity.item];
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

      if (activity.type === 'teach') {
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
          const correct = isTypedAnswerCorrect(item, input.value);
          if (correct) sessionCorrect += 1;
          input.disabled = true;
          submit.disabled = true;
          input.classList.add(correct ? 'correct' : 'wrong');
          showFeedback(feedback, correct, item);
        });
        card.append(form, feedback);
        windowObject.setTimeout(() => input.focus(), 0);
      }

      shell.append(top, track, lessonHeader, card);
      root.append(shell);
      root.scrollTop = 0;
    }

    function showFeedback(container, correct, item) {
      container.replaceChildren();
      container.hidden = false;
      container.className = `course-answer-feedback ${correct ? 'is-correct' : 'is-wrong'}`;
      const title = document.createElement('strong');
      title.textContent = correct ? 'آفرین، درست بود.' : `پاسخ درست: ${item.surface_form}`;
      const example = document.createElement('div');
      example.className = 'course-feedback-example';
      const fi = document.createElement('p');
      fi.lang = 'fi';
      fi.dir = 'ltr';
      fi.textContent = item.example_fi;
      const fa = document.createElement('p');
      fa.textContent = item.example_fa;
      example.append(fi, fa);
      container.append(title, example, createButton('سؤال بعدی', 'primary-button course-next-button', nextActivity));
    }

    function nextActivity() {
      activityIndex += 1;
      if (activityIndex >= activeLesson.activities.length) completeLesson();
      else renderActivity();
    }

    function completeLesson() {
      if (!activeLesson) return renderSectionMap();
      progress = recordLessonCompletion(progress, activeLesson.id, sessionCorrect, sessionGraded);
      progress = saveProgress(windowObject.localStorage, progress);
      const currentIndex = section.lessons.findIndex((lesson) => lesson.id === activeLesson.id);
      const nextLesson = section.lessons[currentIndex + 1] || null;
      root.replaceChildren();

      const card = document.createElement('section');
      card.className = 'course-completion-card';
      const badge = document.createElement('div');
      badge.className = 'course-completion-badge';
      badge.textContent = '✓';
      const title = document.createElement('h1');
      title.textContent = 'درس کامل شد';
      const message = document.createElement('p');
      message.textContent = `${toPersianNumber(sessionCorrect)} پاسخ درست از ${toPersianNumber(sessionGraded)} فعالیت نمره‌دار`;
      const note = document.createElement('p');
      note.className = 'course-completion-note';
      note.textContent = 'فعالیت‌های معرفی در امتیاز حساب نمی‌شوند. در نسخه‌های بعدی نتیجهٔ هر نوع تمرین به الگوریتم مرور متصل خواهد شد.';
      card.append(badge, title, message, note);
      if (nextLesson) {
        card.append(createButton(`شروع درس ${toPersianNumber(nextLesson.order)}`, 'primary-button', () => startLesson(nextLesson)));
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
      if (!section) return;
      const lesson = lessonFromHash();
      if (lesson) {
        const index = section.lessons.findIndex((entry) => entry.id === lesson.id);
        if (isLessonUnlocked(section, progress, index)) startLesson(lesson);
        else renderSectionMap();
      } else if (!activeLesson) {
        renderSectionMap();
      }
    }

    courseLinks.forEach((link) => link.addEventListener('click', (event) => {
      event.preventDefault();
      activeLesson = null;
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
    windowObject.fetch(`${SECTION_URL}?v=${version}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((payload) => {
        section = validateSection(payload);
        progress = loadProgress(windowObject.localStorage);
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
    SECTION_URL,
    normalizeAnswer,
    emptyProgress,
    sanitizeProgress,
    loadProgress,
    saveProgress,
    isLessonUnlocked,
    recordLessonCompletion,
    makeCloze,
    acceptedAnswers,
    isTypedAnswerCorrect,
    optionLabel,
    uniqueOptions,
    buildStandardActivities,
    buildCheckpointActivities,
    prepareSection,
    validateSection,
    initializeBrowser,
  };
});
