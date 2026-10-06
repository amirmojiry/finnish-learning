const MODES = {
  TRANSLATION: 'translation',
  CLOZE_CHOICE: 'cloze-choice',
  CLOZE_INPUT: 'cloze-input',
};

if (!location.hash) history.replaceState(null, '', '#course');

const state = {
  words: [],
  wordMap: new Map(),
  current: null,
  currentExample: null,
  answered: false,
  mode: MODES.TRANSLATION,
  view: 'course',
  detailWord: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  practice: $('#practice-view'),
  dictionary: $('#dictionary-view'),
  mobileTitle: $('#mobile-view-title'),
  viewLinks: $$('[data-view-link]'),
  reviewQuiz: $('#review-quiz'),
  practiceError: $('#practice-load-error'),
  questionLabel: $('#quiz-title'),
  wordRow: $('#word-row'),
  word: $('#word'),
  rank: $('#rank'),
  sentencePanel: $('#sentence-panel'),
  clozeSentence: $('#cloze-sentence'),
  clozeTranslation: $('#cloze-translation'),
  options: $('#options'),
  typingForm: $('#typing-form'),
  typedAnswer: $('#typed-answer'),
  feedback: $('#feedback'),
  feedbackStatusIcon: $('#feedback-status-icon'),
  result: $('#result-message'),
  exampleFi: $('#example-fi'),
  exampleFa: $('#example-fa'),
  next: $('#next-word'),
  speak: $('#speak-word'),
  dictionaryListPanel: $('#dictionary-list-panel'),
  dictionaryDetail: $('#dictionary-detail'),
  dictionarySearch: $('#dictionary-search'),
  dictionarySort: $('#dictionary-sort'),
  dictionaryPosFilter: $('#dictionary-pos-filter'),
  dictionaryList: $('#dictionary-list'),
  dictionaryEmpty: $('#dictionary-empty'),
  dictionaryCount: $('#dictionary-count'),
  dictionaryBack: $('#dictionary-back'),
  detailWord: $('#detail-word'),
  detailTranslation: $('#detail-translation'),
  detailRank: $('#detail-rank'),
  detailPos: $('#detail-pos'),
  detailLemma: $('#detail-lemma'),
  detailExamples: $('#detail-examples'),
  detailSpeak: $('#detail-speak'),
};

const faNumber = (value) => new Intl.NumberFormat('fa-IR').format(value);
const normalize = (value) => String(value || '').trim().normalize('NFC').toLocaleLowerCase('fi-FI');
const wordLength = (word) => [...String(word || '')].length;

function shuffle(values) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function getExamples(word) {
  return [
    { fi: word.example_fi, fa: word.example_fa },
    { fi: word.example_2_fi, fa: word.example_2_fa },
  ].filter((entry) => entry.fi && entry.fa);
}

function reviewExample(word) {
  const examples = getExamples(word);
  if (!examples.length) return { fi: word.word, fa: word.translation_fa };
  return examples[(Number(word.rank) || 1) % examples.length];
}

function makeTranslationOptions(word) {
  return shuffle([
    word,
    ...shuffle(state.words.filter((candidate) => candidate.rank !== word.rank)).slice(0, 3),
  ]);
}

function makeFinnishOptions(word) {
  const length = wordLength(word.word);
  const candidates = shuffle(state.words.filter((candidate) => candidate.rank !== word.rank))
    .sort((left, right) => Math.abs(wordLength(left.word) - length) - Math.abs(wordLength(right.word) - length));
  return shuffle([word, ...candidates.slice(0, 3)]);
}

function makeBlank(word) {
  return '＿'.repeat(Math.max(3, wordLength(word)));
}

function makeWordLink(word, text = word.word) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dictionary-word-link';
  button.textContent = text;
  button.dataset.rank = word.rank;
  button.addEventListener('click', () => openWordDetail(word));
  return button;
}

function renderLinkedSentence(container, sentence, blankWord = null) {
  container.replaceChildren();
  const parts = String(sentence || '').split(/([\p{L}\p{N}]+)/gu);
  let blanked = false;
  for (const part of parts) {
    if (!part) continue;
    const key = normalize(part);
    if (blankWord && !blanked && key === normalize(blankWord.word)) {
      const span = document.createElement('span');
      span.className = 'cloze-blank';
      span.textContent = makeBlank(blankWord.word);
      container.append(span);
      blanked = true;
      continue;
    }
    const found = state.wordMap.get(key);
    container.append(found ? makeWordLink(found, part) : document.createTextNode(part));
  }
}

function optionSize(text) {
  const length = [...String(text || '').trim()].length;
  if (length <= 10) return 'option-text-short';
  if (length <= 22) return 'option-text-medium';
  if (length <= 42) return 'option-text-long';
  return 'option-text-extra-long';
}

function hideReviewFeedback() {
  if (!els.feedback) return;
  els.feedback.hidden = true;
  els.feedbackStatusIcon.className = 'feedback-status-icon';
}

function closeReviewQuiz() {
  state.current = null;
  state.currentExample = null;
  state.answered = false;
  hideReviewFeedback();
  if (els.reviewQuiz) els.reviewQuiz.hidden = true;
}

function notifyReviewAnswer(correct) {
  window.dispatchEvent(new CustomEvent('finnish-review-answer', {
    detail: { correct: Boolean(correct), rank: state.current?.rank || null },
  }));
}

function finishReviewAnswer(correct) {
  if (state.answered || !state.current) return;
  state.answered = true;
  const cssClass = correct ? 'correct' : 'wrong';
  els.result.textContent = correct
    ? 'آفرین! پاسخ درست است.'
    : state.mode === MODES.TRANSLATION
      ? `پاسخ درست: ${state.current.translation_fa}`
      : `پاسخ درست: ${state.current.word} — ${state.current.translation_fa}`;
  els.result.className = `result-message ${cssClass}`;
  els.feedbackStatusIcon.className = `feedback-status-icon ${cssClass}`;
  renderLinkedSentence(els.exampleFi, state.currentExample.fi);
  els.exampleFa.textContent = state.currentExample.fa;
  els.feedback.hidden = false;
  notifyReviewAnswer(correct);
}

function renderChoiceOptions(options, label, isFinnish = false) {
  els.options.replaceChildren();
  els.options.hidden = false;
  for (const word of options) {
    const text = label(word);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = ['option', isFinnish ? 'finnish-option' : '', optionSize(text)].filter(Boolean).join(' ');
    button.textContent = text;
    button.dataset.rank = word.rank;
    button.addEventListener('click', () => {
      if (state.answered) return;
      const correct = word.rank === state.current.rank;
      for (const option of els.options.querySelectorAll('.option')) {
        option.disabled = true;
        if (Number(option.dataset.rank) === state.current.rank) option.classList.add('correct');
      }
      if (!correct) button.classList.add('wrong');
      finishReviewAnswer(correct);
    });
    els.options.append(button);
  }
}

function startReviewPractice(word, mode = MODES.TRANSLATION) {
  if (!word) return;
  state.current = word;
  state.currentExample = reviewExample(word);
  state.mode = Object.values(MODES).includes(mode) ? mode : MODES.TRANSLATION;
  state.answered = false;
  showView('practice');
  els.reviewQuiz.hidden = false;
  hideReviewFeedback();
  els.typingForm.hidden = true;
  els.options.hidden = true;
  els.options.replaceChildren();
  els.typedAnswer.value = '';
  els.typedAnswer.disabled = false;
  els.typedAnswer.classList.remove('correct', 'wrong', 'near-correct');

  if (state.mode === MODES.TRANSLATION) {
    els.questionLabel.textContent = 'ترجمه این واژه چیست؟';
    els.wordRow.hidden = false;
    els.sentencePanel.hidden = true;
    els.word.textContent = word.word;
    els.rank.textContent = `#${word.rank}`;
    renderChoiceOptions(makeTranslationOptions(word), (candidate) => candidate.translation_fa);
    return;
  }

  els.wordRow.hidden = true;
  els.sentencePanel.hidden = false;
  renderLinkedSentence(els.clozeSentence, state.currentExample.fi, word);
  els.clozeTranslation.textContent = state.currentExample.fa;

  if (state.mode === MODES.CLOZE_CHOICE) {
    els.questionLabel.textContent = 'کدام واژه جای خالی را کامل می‌کند؟';
    renderChoiceOptions(makeFinnishOptions(word), (candidate) => candidate.word, true);
    return;
  }

  els.questionLabel.textContent = 'واژه مناسب را در جای خالی بنویس.';
  els.typingForm.hidden = false;
  window.setTimeout(() => els.typedAnswer.focus(), 0);
}

function answerTyped(event) {
  event.preventDefault();
  if (state.answered || !state.current) return;
  const entered = normalize(els.typedAnswer.value);
  if (!entered) return;
  const grading = window.FinnishCourse?.gradeTypedAnswer
    ? window.FinnishCourse.gradeTypedAnswer({ surface_form: state.current.word }, entered)
    : { accepted: entered === normalize(state.current.word), exact: entered === normalize(state.current.word) };
  els.typedAnswer.disabled = true;
  els.typedAnswer.classList.add(grading.exact ? 'correct' : grading.accepted ? 'near-correct' : 'wrong');
  finishReviewAnswer(grading.accepted);
}

function speakFinnish(text) {
  if (!text) return false;
  return Boolean(window.FinnishCourse?.playSpeech?.(window, text));
}

function showView(view, { updateHash = true } = {}) {
  if (!['practice', 'dictionary'].includes(view)) return;
  state.view = view;
  if (els.practice) els.practice.hidden = view !== 'practice';
  if (els.dictionary) els.dictionary.hidden = view !== 'dictionary';
  if (els.mobileTitle) els.mobileTitle.textContent = view === 'practice'
    ? 'تمرین واژه'
    : state.detailWord ? `واژه: ${state.detailWord.word}` : 'واژه‌نامه';

  for (const link of els.viewLinks) {
    const active = link.dataset.viewLink === view;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (view === 'dictionary' && !state.detailWord) renderDictionaryList();
  if (updateHash) history.replaceState(null, '', view === 'practice' ? '#practice' : '#dictionary');
}

function populatePosFilter() {
  const labels = [...new Set(state.words
    .map((word) => word.part_of_speech_fa || word.part_of_speech)
    .filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, 'fa'));

  els.dictionaryPosFilter.replaceChildren();
  const all = document.createElement('option');
  all.value = 'all';
  all.textContent = 'همه انواع واژه';
  els.dictionaryPosFilter.append(all);
  for (const label of labels) {
    const option = document.createElement('option');
    option.value = label;
    option.textContent = label;
    els.dictionaryPosFilter.append(option);
  }
  els.dictionaryPosFilter.value = 'all';
}

function filteredWords() {
  const query = normalize(els.dictionarySearch.value);
  const pos = els.dictionaryPosFilter.value;
  const list = state.words.filter((word) => {
    const haystack = normalize([
      word.word,
      word.translation_fa,
      word.lemma,
      word.part_of_speech_fa,
      word.part_of_speech,
    ].join(' '));
    return (!query || haystack.includes(query))
      && (pos === 'all' || (word.part_of_speech_fa || word.part_of_speech) === pos);
  });
  if (els.dictionarySort.value === 'alphabetical') list.sort((a, b) => a.word.localeCompare(b.word, 'fi'));
  else list.sort((a, b) => a.rank - b.rank);
  return list;
}

function renderDictionaryList() {
  state.detailWord = null;
  els.dictionaryDetail.hidden = true;
  els.dictionaryListPanel.hidden = false;
  if (els.mobileTitle) els.mobileTitle.textContent = 'واژه‌نامه';
  const list = filteredWords();
  els.dictionaryList.replaceChildren();
  els.dictionaryCount.textContent = `${faNumber(list.length)} واژه`;
  els.dictionaryEmpty.hidden = list.length > 0;

  for (const word of list) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'dictionary-list-item';
    button.innerHTML = `<span class="dictionary-rank">#${word.rank}</span><span class="dictionary-item-main"><strong class="dictionary-item-word" lang="fi">${word.word}</strong><span class="dictionary-item-translation">${word.translation_fa}</span></span><span class="dictionary-item-pos">${word.part_of_speech_fa || word.part_of_speech}</span>`;
    button.addEventListener('click', () => openWordDetail(word));
    els.dictionaryList.append(button);
  }
}

function openWordDetail(word) {
  if (!word) return;
  state.detailWord = word;
  showView('dictionary');
  els.dictionaryListPanel.hidden = true;
  els.dictionaryDetail.hidden = false;
  if (els.mobileTitle) els.mobileTitle.textContent = `واژه: ${word.word}`;
  els.detailWord.textContent = word.word;
  els.detailTranslation.textContent = word.translation_fa;
  els.detailRank.textContent = `#${word.rank}`;
  els.detailPos.textContent = word.part_of_speech_fa || word.part_of_speech;
  els.detailLemma.textContent = word.lemma;
  els.detailExamples.replaceChildren();

  for (const example of getExamples(word)) {
    const card = document.createElement('div');
    card.className = 'word-example-card';
    const fi = document.createElement('p');
    fi.className = 'word-example-fi';
    renderLinkedSentence(fi, example.fi);
    const fa = document.createElement('p');
    fa.className = 'word-example-fa';
    fa.textContent = example.fa;
    card.append(fi, fa);
    els.detailExamples.append(card);
  }

  history.replaceState(null, '', `#word-${word.rank}`);
  els.dictionaryDetail.scrollTop = 0;
}

function routeFromHash() {
  const hash = location.hash;
  if (hash === '#course' || hash.startsWith('#course-') || hash === '#settings' || hash === '#about') return;

  if (hash.startsWith('#word-')) {
    if (state.words.length) {
      const rank = Number(hash.slice(6));
      const word = state.words.find((entry) => entry.rank === rank);
      if (word) {
        openWordDetail(word);
        return;
      }
    }
    showView('dictionary', { updateHash: false });
    return;
  }

  showView(hash === '#dictionary' ? 'dictionary' : 'practice', { updateHash: false });
}

async function init() {
  routeFromHash();
  try {
    const response = await fetch(`./data/common-words.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(String(response.status));
    const payload = await response.json();
    if (!Array.isArray(payload.words) || payload.words.length < 4) throw new Error('invalid data');
    state.words = payload.words;
    state.wordMap = new Map(state.words.map((word) => [normalize(word.word), word]));
    populatePosFilter();
    routeFromHash();
  } catch (error) {
    console.error(error);
    if (els.practiceError) {
      els.practiceError.hidden = false;
      els.practiceError.textContent = 'بارگذاری واژه‌ها انجام نشد.';
    }
    if (state.view === 'dictionary') {
      els.dictionaryList.replaceChildren();
      els.dictionaryEmpty.hidden = false;
      els.dictionaryEmpty.textContent = 'بارگذاری واژه‌ها انجام نشد.';
    }
  }
}

els.next?.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('finnish-review-next'));
});
els.speak?.addEventListener('click', () => speakFinnish(state.current?.word));
els.typingForm?.addEventListener('submit', answerTyped);
els.viewLinks.forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  state.detailWord = null;
  closeReviewQuiz();
  showView(link.dataset.viewLink);
}));
els.dictionarySearch?.addEventListener('input', renderDictionaryList);
els.dictionarySort?.addEventListener('change', renderDictionaryList);
els.dictionaryPosFilter?.addEventListener('change', renderDictionaryList);
els.dictionaryBack?.addEventListener('click', () => {
  state.detailWord = null;
  history.replaceState(null, '', '#dictionary');
  renderDictionaryList();
});
els.detailSpeak?.addEventListener('click', () => speakFinnish(state.detailWord?.word));

window.addEventListener('hashchange', routeFromHash);
document.addEventListener('keydown', (event) => {
  if (
    state.current
    && !state.answered
    && [MODES.TRANSLATION, MODES.CLOZE_CHOICE].includes(state.mode)
    && ['1', '2', '3', '4'].includes(event.key)
  ) {
    els.options.querySelectorAll('.option')[Number(event.key) - 1]?.click();
  }
});

window.openWordDetail = openWordDetail;
window.startReviewPractice = startReviewPractice;
window.hideReviewFeedback = hideReviewFeedback;
window.closeReviewQuiz = closeReviewQuiz;

init();
