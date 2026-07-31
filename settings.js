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

    if (persist) {
      localStorage.setItem(THEME_KEY, resolvedTheme);
    }

    if (themeMeta) {
      themeMeta.content = resolvedTheme === 'dark' ? '#111a2a' : '#f7f8fc';
    }

    if (themeLabel) {
      themeLabel.textContent = resolvedTheme === 'dark' ? 'تیره' : 'روشن';
    }

    for (const button of themeButtons) {
      const isActive = button.dataset.themeChoice === resolvedTheme;
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  function setSettingsNavigationActive(isActive) {
    for (const item of allNavItems) {
      const isSettingsItem = item.classList.contains('settings-view-link');
      item.classList.toggle('active', isActive && isSettingsItem);

      if (isActive && isSettingsItem) {
        item.setAttribute('aria-current', 'page');
      } else if (isSettingsItem || isActive) {
        item.removeAttribute('aria-current');
      }
    }
  }

  function showSettings({ updateHash = true } = {}) {
    if (!settingsView) return;

    homeView.hidden = true;
    dictionaryView.hidden = true;
    settingsView.hidden = false;

    if (mobileTitle) {
      mobileTitle.textContent = 'تنظیمات';
    }

    setSettingsNavigationActive(true);

    if (updateHash && location.hash !== '#settings') {
      history.replaceState(null, '', '#settings');
    }
  }

  function leaveSettings() {
    if (!settingsView) return;
    settingsView.hidden = true;
    setSettingsNavigationActive(false);
  }

  for (const button of themeButtons) {
    button.addEventListener('click', () => {
      applyTheme(button.dataset.themeChoice);
    });
  }

  for (const link of settingsLinks) {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showSettings();
    });
  }

  for (const link of regularViewLinks) {
    link.addEventListener('click', leaveSettings);
  }

  window.addEventListener('hashchange', () => {
    if (location.hash === '#settings') {
      showSettings({ updateHash: false });
    } else {
      leaveSettings();
    }
  });

  applyTheme(currentTheme(), false);

  if (location.hash === '#settings') {
    showSettings({ updateHash: false });
    window.addEventListener('load', () => {
      window.setTimeout(() => {
        if (location.hash === '#settings') {
          showSettings({ updateHash: false });
        }
      }, 350);
    });
  }
})();
