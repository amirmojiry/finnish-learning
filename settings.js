(() => {
  const THEME_KEY = 'fiAppTheme';
  const settingsView = document.querySelector('#settings-view');
  const homeView = document.querySelector('#home-view');
  const dictionaryView = document.querySelector('#dictionary-view');
  const mobileTitle = document.querySelector('#mobile-view-title');
  const themeLabel = document.querySelector('#current-theme-label');
  const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
  const settingsLinks = [...document.querySelectorAll('.settings-view-link')];
  const regularViewLinks = [...document.querySelectorAll('[data-view-link]')];
  const allNavItems = [...document.querySelectorAll('.bottom-nav-item, .desktop-view-link')];
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  function currentTheme() {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme, persist = true) {
    const resolvedTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = resolvedTheme;

    if (persist) localStorage.setItem(THEME_KEY, resolvedTheme);
    if (themeMeta) themeMeta.content = resolvedTheme === 'dark' ? '#111a2a' : '#f7f8fc';
    if (themeLabel) themeLabel.textContent = resolvedTheme === 'dark' ? 'تیره' : 'روشن';

    for (const button of themeButtons) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === resolvedTheme));
    }
  }

  function setSettingsNavigationActive(isActive) {
    for (const item of allNavItems) {
      const isSettingsItem = item.classList.contains('settings-view-link');
      item.classList.toggle('active', isActive && isSettingsItem);
      if (isActive && isSettingsItem) item.setAttribute('aria-current', 'page');
      else if (isSettingsItem || isActive) item.removeAttribute('aria-current');
    }
  }

  function showSettings({ updateHash = true } = {}) {
    if (!settingsView) return;
    homeView.hidden = true;
    dictionaryView.hidden = true;
    settingsView.hidden = false;
    if (mobileTitle) mobileTitle.textContent = 'تنظیمات';
    setSettingsNavigationActive(true);
    if (updateHash && location.hash !== '#settings') history.replaceState(null, '', '#settings');
  }

  function leaveSettings() {
    if (!settingsView) return;
    settingsView.hidden = true;
    setSettingsNavigationActive(false);
  }

  themeButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.themeChoice)));
  settingsLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSettings();
  }));
  regularViewLinks.forEach((link) => link.addEventListener('click', leaveSettings));

  window.addEventListener('hashchange', () => {
    if (location.hash === '#settings') showSettings({ updateHash: false });
    else leaveSettings();
  });

  applyTheme(currentTheme(), false);

  if (location.hash === '#settings') {
    showSettings({ updateHash: false });
    window.addEventListener('load', () => window.setTimeout(() => {
      if (location.hash === '#settings') showSettings({ updateHash: false });
    }, 350));
  }
})();

(async () => {
  const waitForApp = async () => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (typeof state !== 'undefined' && Array.isArray(state.words) && state.words.length) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }
    return false;
  };

  if (!await waitForApp()) return;

  try {
    const [frequencyResponse, detailsResponse] = await Promise.all([
      fetch('./data/parole-frequency.json?v=20260731-1'),
      fetch('./data/parole-new-details.json?v=20260731-1'),
    ]);

    if (!frequencyResponse.ok || !detailsResponse.ok) throw new Error('Parole data could not be loaded.');

    const frequencyData = await frequencyResponse.json();
    const newDetails = await detailsResponse.json();
    const existingByWord = new Map(state.words.map((word) => [normalize(word.word), word]));

    const mergedWords = frequencyData.words.map((frequencyWord) => {
      const key = normalize(frequencyWord.word);
      const details = existingByWord.get(key) || newDetails[frequencyWord.word];
      if (!details) throw new Error(`Missing learning details for ${frequencyWord.word}`);

      return {
        ...details,
        rank: frequencyWord.rank,
        word: frequencyWord.word,
        frequency_count: frequencyWord.frequency_count,
        frequency_percent: frequencyWord.frequency_percent,
      };
    });

    state.words = mergedWords;
    state.wordMap = new Map(mergedWords.map((word) => [normalize(word.word), word]));
    state.current = null;
    state.focusedRank = null;

    const posFilter = document.querySelector('#dictionary-pos-filter');
    if (posFilter) {
      while (posFilter.options.length > 1) posFilter.remove(1);
      populatePosFilter();
    }

    const baseRenderDictionaryList = renderDictionaryList;
    renderDictionaryList = function renderParoleDictionaryList() {
      baseRenderDictionaryList();

      document.querySelectorAll('.dictionary-list-item').forEach((item) => {
        const rankText = item.querySelector('.dictionary-rank')?.textContent || '';
        const rank = Number(rankText.replace(/\D/g, ''));
        const word = state.words.find((entry) => entry.rank === rank);
        const main = item.querySelector('.dictionary-item-main');
        if (!word || !main || main.querySelector('.dictionary-frequency-line')) return;

        const frequency = document.createElement('span');
        frequency.className = 'dictionary-frequency-line';
        frequency.textContent = `${new Intl.NumberFormat('fa-IR').format(word.frequency_count)} بار · ${word.frequency_percent.toLocaleString('fa-IR', { maximumFractionDigits: 4 })}٪`;
        main.append(frequency);
      });
    };

    const baseOpenWordDetail = openWordDetail;
    openWordDetail = function openParoleWordDetail(word) {
      baseOpenWordDetail(word);

      const meta = document.querySelector('.word-detail-meta');
      if (!meta) return;

      let countCard = document.querySelector('#detail-frequency-count-card');
      let percentCard = document.querySelector('#detail-frequency-percent-card');

      if (!countCard) {
        countCard = document.createElement('div');
        countCard.id = 'detail-frequency-count-card';
        countCard.className = 'word-meta-card';
        countCard.innerHTML = '<span class="word-meta-label">تعداد وقوع در پیکره</span><strong id="detail-frequency-count" class="word-meta-value"></strong>';
        meta.append(countCard);
      }

      if (!percentCard) {
        percentCard = document.createElement('div');
        percentCard.id = 'detail-frequency-percent-card';
        percentCard.className = 'word-meta-card';
        percentCard.innerHTML = '<span class="word-meta-label">درصد وقوع</span><strong id="detail-frequency-percent" class="word-meta-value"></strong>';
        meta.append(percentCard);
      }

      document.querySelector('#detail-frequency-count').textContent = new Intl.NumberFormat('fa-IR').format(word.frequency_count);
      document.querySelector('#detail-frequency-percent').textContent = `${word.frequency_percent.toLocaleString('fa-IR', { maximumFractionDigits: 4 })}٪`;
    };

    renderQuestion();
    if (state.view === 'dictionary') {
      if (state.detailWord) {
        const refreshed = state.words.find((word) => word.word === state.detailWord.word);
        if (refreshed) openWordDetail(refreshed);
      } else {
        renderDictionaryList();
      }
    }
  } catch (error) {
    console.error('Parole vocabulary upgrade failed:', error);
  }
})();
