const state = {
  words: [],
  current: null,
  answered: false,
  correct: Number(localStorage.getItem('fiQuizCorrect') || 0),
  total: Number(localStorage.getItem('fiQuizTotal') || 0),
};

const els = {
  loading: document.querySelector('#loading'),
  error: document.querySelector('#error'),
  content: document.querySelector('#quiz-content'),
  word: document.querySelector('#word'),
  rank: document.querySelector('#rank'),
  options: document.querySelector('#options'),
  feedback: document.querySelector('#feedback'),
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

function makeOptions(correctWord) {
  const distractors = shuffle(
    state.words.filter((item) => item.rank !== correctWord.rank),
  ).slice(0, 3);

  return shuffle([correctWord, ...distractors]);
}

function renderQuestion() {
  const previousRank = state.current?.rank ?? null;
  state.current = getRandomWord(previousRank);
  state.answered = false;

  els.word.textContent = state.current.word;
  els.rank.textContent = `#${state.current.rank}`;
  els.options.replaceChildren();
  els.feedback.hidden = true;
  els.next.hidden = true;

  for (const optionWord of makeOptions(state.current)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.textContent = optionWord.translation_fa;
    button.dataset.rank = String(optionWord.rank);
    button.addEventListener('click', () => answer(button, optionWord));
    els.options.append(button);
  }
}

function answer(selectedButton, selectedWord) {
  if (state.answered) return;
  state.answered = true;
  state.total += 1;

  const isCorrect = selectedWord.rank === state.current.rank;
  if (isCorrect) state.correct += 1;

  for (const button of els.options.querySelectorAll('.option')) {
    button.disabled = true;
    const rank = Number(button.dataset.rank);
    if (rank === state.current.rank) button.classList.add('correct');
  }

  if (!isCorrect) selectedButton.classList.add('wrong');

  els.result.textContent = isCorrect
    ? 'درست انتخاب کردی.'
    : `پاسخ درست: ${state.current.translation_fa}`;
  els.result.className = `result-message ${isCorrect ? 'correct' : 'wrong'}`;
  els.exampleFi.textContent = state.current.example_fi;
  els.exampleFa.textContent = state.current.example_fa;
  els.feedback.hidden = false;
  els.next.hidden = false;
  updateScore();
  els.next.focus();
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

  try {
    const response = await fetch('./data/common-words.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!Array.isArray(data.words) || data.words.length < 4) {
      throw new Error('ساختار فایل واژه‌ها معتبر نیست.');
    }

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
els.speak.addEventListener('click', speakCurrentWord);
els.reset.addEventListener('click', () => {
  state.correct = 0;
  state.total = 0;
  updateScore();
});

document.addEventListener('keydown', (event) => {
  if (!state.answered && ['1', '2', '3', '4'].includes(event.key)) {
    const button = els.options.querySelectorAll('.option')[Number(event.key) - 1];
    button?.click();
  }
  if (state.answered && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    renderQuestion();
  }
});

init();
