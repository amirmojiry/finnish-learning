(function attachSpacedRepetition(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinnishSpacedRepetition = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createSpacedRepetitionApi() {
  'use strict';

  const STORAGE_KEY = 'fiSrsProgressV1';
  const SCHEMA_VERSION = 1;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const RETRY_MS = 10 * 60 * 1000;
  const DEFAULT_NEW_LIMIT = 10;
  const DEFAULT_SESSION_LIMIT = 20;

  function normalizeWord(value) {
    return String(value || '').trim().normalize('NFC').toLocaleLowerCase('fi-FI');
  }

  function localDateKey(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function emptyProgress(now = Date.now()) {
    return {
      version: SCHEMA_VERSION,
      words: {},
      dailyNew: { date: localDateKey(now), count: 0 },
    };
  }

  function sanitizeRecord(record) {
    const source = record && typeof record === 'object' ? record : {};
    return {
      repetitions: Math.max(0, Number.isFinite(source.repetitions) ? Math.floor(source.repetitions) : 0),
      intervalDays: Math.max(0, Number.isFinite(source.intervalDays) ? source.intervalDays : 0),
      easeFactor: Math.min(3, Math.max(1.3, Number.isFinite(source.easeFactor) ? source.easeFactor : 2.5)),
      dueAt: Number.isFinite(source.dueAt) ? source.dueAt : 0,
      firstReviewedAt: Number.isFinite(source.firstReviewedAt) ? source.firstReviewedAt : 0,
      lastReviewedAt: Number.isFinite(source.lastReviewedAt) ? source.lastReviewedAt : 0,
      totalAnswers: Math.max(0, Number.isFinite(source.totalAnswers) ? Math.floor(source.totalAnswers) : 0),
      correctAnswers: Math.max(0, Number.isFinite(source.correctAnswers) ? Math.floor(source.correctAnswers) : 0),
      lapses: Math.max(0, Number.isFinite(source.lapses) ? Math.floor(source.lapses) : 0),
    };
  }

  function sanitizeProgress(progress, now = Date.now()) {
    const clean = emptyProgress(now);
    if (!progress || typeof progress !== 'object' || progress.version !== SCHEMA_VERSION) return clean;

    const words = progress.words && typeof progress.words === 'object' ? progress.words : {};
    for (const [key, record] of Object.entries(words)) {
      const normalizedKey = normalizeWord(key);
      if (normalizedKey) clean.words[normalizedKey] = sanitizeRecord(record);
    }

    const today = localDateKey(now);
    if (progress.dailyNew && progress.dailyNew.date === today) {
      clean.dailyNew.count = Math.max(
        0,
        Number.isFinite(progress.dailyNew.count) ? Math.floor(progress.dailyNew.count) : 0,
      );
    }
    return clean;
  }

  function loadProgress(storage, now = Date.now()) {
    if (!storage || typeof storage.getItem !== 'function') return emptyProgress(now);
    try {
      const raw = storage.getItem(STORAGE_KEY);
      return raw ? sanitizeProgress(JSON.parse(raw), now) : emptyProgress(now);
    } catch {
      return emptyProgress(now);
    }
  }

  function saveProgress(storage, progress, now = Date.now()) {
    const clean = sanitizeProgress(progress, now);
    if (storage && typeof storage.setItem === 'function') {
      storage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  }

  function scheduleAnswer(record, correct, now = Date.now()) {
    const current = sanitizeRecord(record);
    const next = {
      ...current,
      firstReviewedAt: current.firstReviewedAt || now,
      lastReviewedAt: now,
      totalAnswers: current.totalAnswers + 1,
      correctAnswers: current.correctAnswers + (correct ? 1 : 0),
    };

    if (!correct) {
      next.repetitions = 0;
      next.intervalDays = 0;
      next.easeFactor = Math.max(1.3, current.easeFactor - 0.2);
      next.dueAt = now + RETRY_MS;
      next.lapses = current.lapses + 1;
      return next;
    }

    next.repetitions = current.repetitions + 1;
    next.easeFactor = Math.min(3, current.easeFactor + 0.05);
    if (next.repetitions === 1) next.intervalDays = 1;
    else if (next.repetitions === 2) next.intervalDays = 3;
    else next.intervalDays = Math.min(365, Math.max(4, Math.round(Math.max(3, current.intervalDays) * next.easeFactor)));
    next.dueAt = now + next.intervalDays * DAY_MS;
    return next;
  }

  function recordAnswer(progress, word, correct, now = Date.now()) {
    const clean = sanitizeProgress(progress, now);
    const key = normalizeWord(word && word.word);
    if (!key) throw new Error('A vocabulary word is required to record an answer.');

    const isNew = !Object.prototype.hasOwnProperty.call(clean.words, key);
    clean.words[key] = scheduleAnswer(clean.words[key], Boolean(correct), now);
    if (isNew) clean.dailyNew.count += 1;
    return clean;
  }

  function buildReviewQueue(words, progress, now = Date.now(), options = {}) {
    const clean = sanitizeProgress(progress, now);
    const newLimit = Number.isInteger(options.newLimit) ? Math.max(0, options.newLimit) : DEFAULT_NEW_LIMIT;
    const sessionLimit = Number.isInteger(options.sessionLimit)
      ? Math.max(1, options.sessionLimit)
      : DEFAULT_SESSION_LIMIT;
    const remainingNew = Math.max(0, newLimit - clean.dailyNew.count);

    const due = [];
    const unseen = [];
    for (const word of Array.isArray(words) ? words : []) {
      const key = normalizeWord(word && word.word);
      if (!key) continue;
      const record = clean.words[key];
      if (!record) unseen.push(word);
      else if (record.dueAt <= now) due.push({ word, dueAt: record.dueAt });
    }

    due.sort((left, right) => left.dueAt - right.dueAt || Number(left.word.rank) - Number(right.word.rank));
    unseen.sort((left, right) => Number(left.rank) - Number(right.rank));

    const queue = due.map((item) => item.word).slice(0, sessionLimit);
    const freeSlots = Math.max(0, sessionLimit - queue.length);
    queue.push(...unseen.slice(0, Math.min(freeSlots, remainingNew)));
    return queue;
  }

  function summarizeProgress(words, progress, now = Date.now(), options = {}) {
    const clean = sanitizeProgress(progress, now);
    const newLimit = Number.isInteger(options.newLimit) ? Math.max(0, options.newLimit) : DEFAULT_NEW_LIMIT;
    let due = 0;
    let unseen = 0;
    let scheduled = 0;
    let mastered = 0;

    for (const word of Array.isArray(words) ? words : []) {
      const key = normalizeWord(word && word.word);
      if (!key) continue;
      const record = clean.words[key];
      if (!record) {
        unseen += 1;
        continue;
      }
      if (record.dueAt <= now) due += 1;
      else scheduled += 1;
      if (record.repetitions >= 3 && record.intervalDays >= 21) mastered += 1;
    }

    return {
      due,
      unseen,
      scheduled,
      mastered,
      learned: scheduled + due,
      availableNewToday: Math.min(unseen, Math.max(0, newLimit - clean.dailyNew.count)),
    };
  }

  function toPersianNumber(value) {
    return new Intl.NumberFormat('fa-IR').format(value);
  }

  function createPanel(document) {
    const panel = document.createElement('section');
    panel.id = 'spaced-review';
    panel.className = 'spaced-review-card';
    panel.setAttribute('aria-labelledby', 'spaced-review-title');
    panel.innerHTML = `
      <div class="spaced-review-heading">
        <div>
          <p class="spaced-review-eyebrow">مرور هوشمند</p>
          <h2 id="spaced-review-title">مرور امروز</h2>
          <p id="spaced-review-message">وضعیت مرور در حال آماده‌شدن است.</p>
        </div>
        <button id="spaced-review-start" class="primary-button spaced-review-start" type="button" disabled>شروع مرور</button>
      </div>
      <div class="spaced-review-stats" aria-label="وضعیت مرور فاصله‌دار">
        <div><strong id="spaced-review-due">۰</strong><span>موعددار</span></div>
        <div><strong id="spaced-review-new">۰</strong><span>جدید امروز</span></div>
        <div><strong id="spaced-review-learned">۰</strong><span>شروع‌شده</span></div>
        <div><strong id="spaced-review-mastered">۰</strong><span>مسلط</span></div>
      </div>
    `;
    const hero = document.querySelector('#home-view .hero');
    const quiz = document.getElementById('quiz');
    if (hero && quiz) hero.insertAdjacentElement('afterend', panel);
    return panel;
  }

  function initializeBrowser(windowObject) {
    const document = windowObject.document;
    if (!document || document.getElementById('spaced-review')) return;

    const panel = createPanel(document);
    if (!panel) return;

    const elements = {
      start: document.getElementById('spaced-review-start'),
      message: document.getElementById('spaced-review-message'),
      due: document.getElementById('spaced-review-due'),
      newToday: document.getElementById('spaced-review-new'),
      learned: document.getElementById('spaced-review-learned'),
      mastered: document.getElementById('spaced-review-mastered'),
    };

    let words = [];
    let progress = loadProgress(windowObject.localStorage);
    let active = false;
    let queue = [];
    let currentWord = null;
    let sessionTotal = 0;
    let sessionAnswered = 0;
    let sessionCorrect = 0;
    let answerRecorded = false;
    let completionMessage = '';

    function appReady() {
      const quizContent = document.getElementById('quiz-content');
      return Boolean(
        quizContent
        && !quizContent.hidden
        && typeof windowObject.openWordDetail === 'function'
        && typeof windowObject.startFocusedPractice === 'function'
      );
    }

    function currentMode() {
      return document.querySelector('.mode-button.active')?.dataset.mode
        || windowObject.localStorage.getItem('fiQuizMode')
        || 'translation';
    }

    function updatePanel() {
      progress = sanitizeProgress(progress);
      const stats = summarizeProgress(words, progress);
      elements.due.textContent = toPersianNumber(stats.due);
      elements.newToday.textContent = toPersianNumber(stats.availableNewToday);
      elements.learned.textContent = toPersianNumber(stats.learned);
      elements.mastered.textContent = toPersianNumber(stats.mastered);

      if (active) {
        elements.start.disabled = false;
        elements.start.textContent = 'توقف مرور';
        elements.message.textContent = `پیشرفت این نوبت: ${toPersianNumber(sessionAnswered)} از ${toPersianNumber(sessionTotal)} واژه`;
        return;
      }

      const available = stats.due + stats.availableNewToday;
      elements.start.disabled = words.length === 0 || available === 0 || !appReady();
      elements.start.textContent = available === 0 ? 'مروری برای امروز نیست' : 'شروع مرور';
      elements.message.textContent = completionMessage
        || (available > 0
          ? `${toPersianNumber(stats.due)} واژه موعددار و تا ${toPersianNumber(stats.availableNewToday)} واژه جدید آماده است.`
          : 'همه مرورهای امروز انجام شده‌اند. موعد بعدی در زمان مناسب فعال می‌شود.');
    }

    function launchWord(word, mode = currentMode()) {
      if (!word) return;
      answerRecorded = false;
      if (typeof windowObject.hideFeedback === 'function') windowObject.hideFeedback();
      if (typeof windowObject.openWordDetail === 'function' && typeof windowObject.startFocusedPractice === 'function') {
        windowObject.openWordDetail(word);
        windowObject.startFocusedPractice(mode);
        return;
      }
      windowObject.location.hash = `#word-${word.rank}`;
    }

    function completeSession() {
      active = false;
      currentWord = null;
      queue = [];
      completionMessage = `مرور امروز تمام شد؛ ${toPersianNumber(sessionCorrect)} پاسخ از ${toPersianNumber(sessionAnswered)} پاسخ درست بود.`;
      if (typeof windowObject.hideFeedback === 'function') windowObject.hideFeedback();
      const nextButton = document.getElementById('next-word');
      if (nextButton) nextButton.textContent = 'سؤال بعدی';
      if (typeof windowObject.renderQuestion === 'function') windowObject.renderQuestion();
      updatePanel();
    }

    function launchNext() {
      if (!active) return;
      if (queue.length === 0) {
        completeSession();
        return;
      }
      currentWord = queue.shift();
      launchWord(currentWord);
      updatePanel();
    }

    function stopSession() {
      active = false;
      queue = [];
      currentWord = null;
      completionMessage = 'مرور متوقف شد. پاسخ‌های ثبت‌شده حفظ شده‌اند.';
      const nextButton = document.getElementById('next-word');
      if (nextButton) nextButton.textContent = 'سؤال بعدی';
      if (typeof windowObject.hideFeedback === 'function') windowObject.hideFeedback();
      if (typeof windowObject.renderQuestion === 'function') windowObject.renderQuestion();
      updatePanel();
    }

    function startSession() {
      if (!appReady()) {
        completionMessage = 'تمرین‌ها هنوز در حال آماده‌شدن هستند.';
        updatePanel();
        return;
      }
      progress = loadProgress(windowObject.localStorage);
      queue = buildReviewQueue(words, progress);
      if (queue.length === 0) {
        completionMessage = 'در حال حاضر واژه موعددار یا سهمیه واژه جدیدی باقی نمانده است.';
        updatePanel();
        return;
      }
      active = true;
      currentWord = null;
      sessionTotal = queue.length;
      sessionAnswered = 0;
      sessionCorrect = 0;
      completionMessage = '';
      launchNext();
    }

    function persistAnswer(correct) {
      if (!active || !currentWord || answerRecorded) return;
      progress = recordAnswer(progress, currentWord, correct);
      progress = saveProgress(windowObject.localStorage, progress);
      answerRecorded = true;
      sessionAnswered += 1;
      if (correct) sessionCorrect += 1;
      const nextButton = document.getElementById('next-word');
      if (nextButton) nextButton.textContent = queue.length === 0 ? 'پایان مرور' : 'واژه مرور بعدی';
      updatePanel();
    }

    elements.start.addEventListener('click', () => {
      if (active) stopSession();
      else startSession();
    });

    document.addEventListener('click', (event) => {
      if (!active) return;
      const target = event.target instanceof windowObject.Element ? event.target : null;
      if (!target) return;

      if (target.closest('#next-word') || target.id === 'feedback-backdrop') {
        event.preventDefault();
        event.stopImmediatePropagation();
        launchNext();
        return;
      }

      const modeButton = target.closest('.mode-button');
      if (modeButton && currentWord) {
        event.preventDefault();
        event.stopImmediatePropagation();
        launchWord(currentWord, modeButton.dataset.mode);
      }
    }, true);

    document.addEventListener('click', (event) => {
      if (!active) return;
      const target = event.target instanceof windowObject.Element ? event.target : null;
      const option = target?.closest('.option');
      if (!option) return;
      windowObject.setTimeout(() => persistAnswer(!option.classList.contains('wrong')), 0);
    });

    document.addEventListener('submit', (event) => {
      if (!active || event.target?.id !== 'typing-form') return;
      windowObject.setTimeout(() => {
        const input = document.getElementById('typed-answer');
        persistAnswer(Boolean(input?.classList.contains('correct')));
      }, 0);
    });

    windowObject.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      progress = loadProgress(windowObject.localStorage);
      updatePanel();
    });

    const quizContent = document.getElementById('quiz-content');
    if (quizContent && typeof windowObject.MutationObserver === 'function') {
      const observer = new windowObject.MutationObserver(updatePanel);
      observer.observe(quizContent, { attributes: true, attributeFilter: ['hidden'] });
    }

    windowObject.fetch(`./data/common-words.json?v=${Date.now()}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then((payload) => {
        words = Array.isArray(payload.words) ? payload.words : [];
        progress = loadProgress(windowObject.localStorage);
        updatePanel();
      })
      .catch(() => {
        elements.message.textContent = 'بارگذاری صف مرور انجام نشد.';
        elements.start.disabled = true;
      });
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
    DAY_MS,
    RETRY_MS,
    DEFAULT_NEW_LIMIT,
    DEFAULT_SESSION_LIMIT,
    normalizeWord,
    localDateKey,
    emptyProgress,
    sanitizeRecord,
    sanitizeProgress,
    loadProgress,
    saveProgress,
    scheduleAnswer,
    recordAnswer,
    buildReviewQueue,
    summarizeProgress,
    initializeBrowser,
  };
});
