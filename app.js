const MODES = {
  TRANSLATION: 'translation',
  CLOZE_CHOICE: 'cloze-choice',
  CLOZE_INPUT: 'cloze-input',
};

const FINNISH_LETTERS = [...'abcdefghijklmnopqrstuvwxyzåäö'];

const state = {
  words: [],
  current: null,
  currentExample: null,
  answered: false,
  mode: localStorage.getItem('fiQuizMode') || MODES.TRANSLATION,
  revealedHintPositions: new Set(),
  correct: Number(localStorage.getItem('fiQuizCorrect') || 0),
  total: Number(localStorage.getItem('fiQuizTotal') || 0),
};

const els = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  content: document.querySelector('#quiz-content'),
  questionLabel: document.querySelector('#quiz-title'),
  wordRow: document.querySelector('#word-row'),
  word: document.querySelector('#word'),
  rank: document.querySelector('#rank'),
  sentencePanel: document.querySelector('#sentence-panel'),
  clozeSentence: document.querySelector('#cloze-sentence'),
  clozeTranslation: document.querySelector('#cloze-translation'),
  options: document.querySelector('#options'),
  typingForm: document.querySelector('#typing-form'),
  typedAnswer: document.querySelector('#typed-answer'),
  letterKeyboard: document.querySelector('#letter-keyboard'),
  keyboardBackspace: document.querySelector('#keyboard-backspace'),
  keyboardClear: document.querySelector('#keyboard-clear'),
  hintButtons: [...document.querySelectorAll('.hint-button')],
  hintPattern: document.querySelector('#hint-pattern'),
  modeButtons: [...document.querySelectorAll('.mode-button')],
  feedback: document.querySelector('#feedback'),
  feedbackBackdrop: document.querySelector('#feedback-backdrop'),
  feedbackStatusIcon: document.querySelector('#feedback-status-icon'),
  answerEffect: document.querySelector('#answer-effect'),
  result: document.querySelector('#result-message'),
  exampleFi: document.querySelector('#example-fi'),
  exampleFa: document.querySelector('#example-fa'),
  next: document.querySelector('#next-word'),
  correctCount: document.querySelector('#correct-count'),
  totalCount: document.querySelector('#total-count'),
  reset: document.querySelector('#reset-score'),
  speak: document.querySelector('#speak-word'),
};

const faNumber = (number) => new Intl.NumberFormat('fa-IR').format(number);
const wordLength = (word) => [...word].length;

function updateScore() {
  els.correctCount.textContent = faNumber(state.correct);
  els.totalCount.textContent = faNumber(state.total);
  localStorage.setItem('fiQuizCorrect', String(state.correct));
  localStorage.setItem('fiQuizTotal', String(state.total));
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getRandomWord(exceptRank = null) {
  const pool = state.words.filter((item) => item.rank !== exceptRank);
  return pool[Math.floor(Math.random() * pool.length)];
}

function getExamples(word) {
  return [
    { fi: word.example_fi, fa: word.example_fa },
    { fi: word.example_2_fi, fa: word.example_2_fa },
  ].filter((example) => example.fi && example.fa);
}

function getRandomExample(word) {
  const examples = getExamples(word);
  return examples[Math.floor(Math.random() * examples.length)];
}

function makeTranslationOptions(correctWord) {
  const distractors = shuffle(
    state.words.filter((item) => item.rank !== correctWord.rank),
  ).slice(0, 3);
  return shuffle([correctWord, ...distractors]);
}

function makeFinnishWordOptions(correctWord) {
  const targetLength = wordLength(correctWord.word);
  const candidates = shuffle(
    state.words.filter((item) => item.rank !== correctWord.rank),
  ).sort((a, b) => (
    Math.abs(wordLength(a.word) - targetLength)
    - Math.abs(wordLength(b.word) - targetLength)
  ));
  return shuffle([correctWord, ...candidates.slice(0, 3)]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makeBlank(word) {
  return '＿'.repeat(Math.max(3, wordLength(word)));
}

function blankWordInSentence(sentence, word) {
  const escapedWord = escapeRegExp(word);
  const exactWord = new RegExp(`(^|[^\\p{L}])${escapedWord}(?=$|[^\\p{L}])`, 'iu');
  const blank = makeBlank(word);
  if (exactWord.test(sentence)) {
    return sentence.replace(exactWord, (match, prefix) => `${prefix}${blank}`);
  }
  return sentence.replace(new RegExp(escapedWord, 'iu'), blank);
}

function normalizeFinnish(value) {
  return value.trim().normalize('NFC').toLocaleLowerCase('fi-FI');
}

function updateModeButtons() {
  for (const button of els.modeButtons) {
    const isActive = button.dataset.mode === state.mode;
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  }
}

function resetHints() {
  state.revealedHintPositions = new Set();
  els.hintPattern.hidden = true;
  els.hintPattern.textContent = '';
  els.hintButtons.forEach((button, index) => {
    button.disabled = index !== 0;
    button.classList.remove('used');
  });
}

function getHintPosition(hintIndex, letters) {
  if (hintIndex === 0) return 0;
  if (hintIndex === 1) return letters.length - 1;
  return Math.min(1, letters.length - 1);
}

function renderHintPattern() {
  const letters = [...state.current.word];
  els.hintPattern.textContent = letters
    .map((letter, index) => (state.revealedHintPositions.has(index) ? letter : 'ـ'))
    .join(' ');
  els.hintPattern.hidden = false;
}

function revealHint(hintIndex) {
  if (state.answered || !state.current || state.mode !== MODES.CLOZE_INPUT) return;
  const letters = [...state.current.word];
  state.revealedHintPositions.add(getHintPosition(hintIndex, letters));
  renderHintPattern();
  const usedButton = els.hintButtons[hintIndex];
  usedButton.disabled = true;
  usedButton.classList.add('used');
  const nextButton = els.hintButtons[hintIndex + 1];
  if (nextButton) nextButton.disabled = false;
}

function getOptionSizeClass(label) {
  const length = [...label.trim()].length;
  if (length <= 10) return 'option-text-short';
  if (length <= 22) return 'option-text-medium';
  if (length <= 42) return 'option-text-long';
  return 'option-text-extra-long';
}

function renderChoiceOptions(options, labelSelector, isFinnish = false) {
  els.options.replaceChildren();
  els.options.hidden = false;

  for (const optionWord of options) {
    const label = labelSelector(optionWord);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = [
      'option',
      isFinnish ? 'finnish-option' : '',
      getOptionSizeClass(label),
    ].filter(Boolean).join(' ');
    button.textContent = label;
    button.dataset.rank = String(optionWord.rank);
    button.addEventListener('click', () => answerChoice(button, optionWord));
    els.options.append(button);
  }
}

function makeLetterKeyboard(word) {
  const answerLetters = [...new Set([...normalizeFinnish(word)])];
  const targetCount = Math.max(10, answerLetters.length);
  const extras = shuffle(
    FINNISH_LETTERS.filter((letter) => !answerLetters.includes(letter)),
  ).slice(0, targetCount - answerLetters.length);
  return shuffle([...answerLetters, ...extras]);
}

function setKeyboardDisabled(disabled) {
  for (const button of els.letterKeyboard.querySelectorAll('.letter-key')) {
    button.disabled = disabled;
  }
  els.keyboardBackspace.disabled = disabled;
  els.keyboardClear.disabled = disabled;
}

function insertLetter(letter) {
  if (state.answered || state.mode !== MODES.CLOZE_INPUT) return;

  const input = els.typedAnswer;
  const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : input.value.length;
  input.value = `${input.value.slice(0, start)}${letter}${input.value.slice(end)}`;

  const caret = start + letter.length;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function removeLastLetter() {
  if (state.answered || state.mode !== MODES.CLOZE_INPUT) return;

  const input = els.typedAnswer;
  const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
  const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : input.value.length;

  if (start !== end) {
    input.value = `${input.value.slice(0, start)}${input.value.slice(end)}`;
    input.setSelectionRange(start, start);
    return;
  }

  if (start === 0) return;
  const before = [...input.value.slice(0, start)];
  before.pop();
  const newStart = before.join('').length;
  input.value = `${before.join('')}${input.value.slice(end)}`;
  input.setSelectionRange(newStart, newStart);
}

function clearTypedAnswer() {
  if (state.answered || state.mode !== MODES.CLOZE_INPUT) return;
  els.typedAnswer.value = '';
  els.typedAnswer.setSelectionRange(0, 0);
}

function renderLetterKeyboard(word) {
  els.letterKeyboard.replaceChildren();
  for (const letter of makeLetterKeyboard(word)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'letter-key';
    button.textContent = letter;
    button.setAttribute('aria-label', `حرف ${letter}`);
    button.addEventListener('click', () => {
      insertLetter(letter);
      button.classList.add('pressed');
      window.setTimeout(() => button.classList.remove('pressed'), 120);
    });
    els.letterKeyboard.append(button);
  }
  setKeyboardDisabled(false);
}

function hideFeedback() {
  els.feedback.hidden = true;
  els.feedbackBackdrop.hidden = true;
  els.feedbackStatusIcon.className = 'feedback-status-icon';
}

function playAnswerEffect(isCorrect) {
  const stateClass = isCorrect ? 'correct' : 'wrong';
  els.answerEffect.className = `answer-effect ${stateClass}`;
  void els.answerEffect.offsetWidth;
  els.answerEffect.classList.add('show');
  window.setTimeout(() => {
    els.answerEffect.className = 'answer-effect';
  }, 720);
}

function renderQuestion() {
  const previousRank = state.current?.rank ?? null;
  state.current = getRandomWord(previousRank);
  state.currentExample = getRandomExample(state.current);
  state.answered = false;

  hideFeedback();
  els.typingForm.hidden = true;
  els.options.hidden = true;
  els.options.replaceChildren();
  els.typedAnswer.blur();
  els.typedAnswer.value = '';
  els.typedAnswer.disabled = false;
  els.typedAnswer.classList.remove('correct', 'wrong');
  els.letterKeyboard.replaceChildren();
  resetHints();
  updateModeButtons();

  if (state.mode === MODES.TRANSLATION) {
    els.questionLabel.textContent = 'ترجمه این واژه چیست؟';
    els.wordRow.hidden = false;
    els.sentencePanel.hidden = true;
    els.word.textContent = state.current.word;
    els.rank.textContent = `#${state.current.rank}`;
    renderChoiceOptions(makeTranslationOptions(state.current), (item) => item.translation_fa);
    return;
  }

  els.wordRow.hidden = true;
  els.sentencePanel.hidden = false;
  els.clozeSentence.textContent = blankWordInSentence(state.currentExample.fi, state.current.word);
  els.clozeTranslation.textContent = state.currentExample.fa;

  if (state.mode === MODES.CLOZE_CHOICE) {
    els.questionLabel.textContent = 'کدام واژه جای خالی را کامل می‌کند؟';
    renderChoiceOptions(makeFinnishWordOptions(state.current), (item) => item.word, true);
    return;
  }

  els.questionLabel.textContent = 'واژه مناسب را در جای خالی بنویس.';
  els.typingForm.hidden = false;
  renderLetterKeyboard(state.current.word);
}

function finishAnswer(isCorrect) {
  state.answered = true;
  state.total += 1;
  if (isCorrect) state.correct += 1;

  const stateClass = isCorrect ? 'correct' : 'wrong';
  els.result.textContent = isCorrect
    ? 'آفرین! پاسخ درست است.'
    : state.mode === MODES.TRANSLATION
      ? `پاسخ درست: ${state.current.translation_fa}`
      : `پاسخ درست: ${state.current.word} — ${state.current.translation_fa}`;
  els.result.className = `result-message ${stateClass}`;
  els.feedbackStatusIcon.className = `feedback-status-icon ${stateClass}`;
  els.exampleFi.textContent = state.currentExample.fi;
  els.exampleFa.textContent = state.currentExample.fa;
  els.feedbackBackdrop.hidden = false;
  els.feedback.hidden = false;
  updateScore();
  playAnswerEffect(isCorrect);
  window.setTimeout(() => els.next.focus(), 250);
}

function answerChoice(selectedButton, selectedWord) {
  if (state.answered) return;
  const isCorrect = selectedWord.rank === state.current.rank;
  for (const button of els.options.querySelectorAll('.option')) {
    button.disabled = true;
    const rank = Number(button.dataset.rank);
    if (rank === state.current.rank) button.classList.add('correct');
  }
  if (!isCorrect) selectedButton.classList.add('wrong');
  finishAnswer(isCorrect);
}

function answerTyped(event) {
  event.preventDefault();
  if (state.answered) return;
  const answer = normalizeFinnish(els.typedAnswer.value);
  if (!answer) return;

  const isCorrect = answer === normalizeFinnish(state.current.word);
  els.typedAnswer.blur();
  els.typedAnswer.disabled = true;
  els.typedAnswer.classList.add(isCorrect ? 'correct' : 'wrong');
  for (const button of els.hintButtons) button.disabled = true;
  setKeyboardDisabled(true);
  finishAnswer(isCorrect);
}

function changeMode(mode) {
  if (!Object.values(MODES).includes(mode) || mode === state.mode) return;
  state.mode = mode;
  localStorage.setItem('fiQuizMode', mode);
  renderQuestion();
}

function speakCurrentWord() {
  if (!state.current || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(state.current.word);
  utterance.lang = 'fi-FI';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

async function init() {
  updateScore();
  updateModeButtons();
  try {
    const response = await fetch('./data/common-words.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const hasValidWords = Array.isArray(data.words)
      && data.words.length >= 4
      && data.words.every((word) => getExamples(word).length >= 1);
    if (!hasValidWords) throw new Error('ساختار فایل واژه‌ها معتبر نیست.');
    state.words = data.words;
    els.loading.hidden = true;
    els.content.hidden = false;
    renderQuestion();
  } catch (error) {
    console.error(error);
    els.loading.hidden = true;
    els.error.hidden = false;
    els.error.textContent = 'بارگذاری واژه‌ها انجام نشد. صفحه را از طریق GitHub Pages یا یک وب‌سرور محلی باز کن.';
  }
}

els.next.addEventListener('click', renderQuestion);
els.feedbackBackdrop.addEventListener('click', renderQuestion);
els.speak.addEventListener('click', speakCurrentWord);
els.typingForm.addEventListener('submit', answerTyped);
els.keyboardBackspace.addEventListener('click', removeLastLetter);
els.keyboardClear.addEventListener('click', clearTypedAnswer);
for (const button of els.modeButtons) {
  button.addEventListener('click', () => changeMode(button.dataset.mode));
}
els.hintButtons.forEach((button, index) => {
  button.addEventListener('click', () => revealHint(index));
});
els.reset.addEventListener('click', () => {
  state.correct = 0;
  state.total = 0;
  updateScore();
});

document.addEventListener('keydown', (event) => {
  const isChoiceMode = [MODES.TRANSLATION, MODES.CLOZE_CHOICE].includes(state.mode);
  if (!state.answered && isChoiceMode && ['1', '2', '3', '4'].includes(event.key)) {
    const button = els.options.querySelectorAll('.option')[Number(event.key) - 1];
    button?.click();
  }
  if (
    state.answered
    && (event.key === 'Enter' || event.key === ' ')
    && !['INPUT', 'BUTTON'].includes(document.activeElement?.tagName)
  ) {
    event.preventDefault();
    renderQuestion();
  }
});

init();
