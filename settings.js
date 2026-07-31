(() => {
  const THEME_KEY = 'fiAppTheme';
  const profileView = document.querySelector('#profile-view');
  const aboutView = document.querySelector('#about-view');
  const homeView = document.querySelector('#home-view');
  const dictionaryView = document.querySelector('#dictionary-view');
  const mobileTitle = document.querySelector('#mobile-view-title');
  const themeLabel = document.querySelector('#current-theme-label');
  const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
  const profileLinks = [...document.querySelectorAll('.profile-view-link')];
  const aboutLinks = [...document.querySelectorAll('.about-view-link')];
  const regularViewLinks = [...document.querySelectorAll('[data-view-link]')];
  const allNavItems = [...document.querySelectorAll('.bottom-nav-item, .desktop-view-link')];
  const specialNavItems = [...document.querySelectorAll('.profile-view-link, .about-view-link')];
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

  function specialViewFromHash() {
    if (location.hash === '#profile' || location.hash === '#settings') return 'profile';
    if (location.hash === '#about') return 'about';
    return null;
  }

  function activateSpecialNavigation(view) {
    for (const item of allNavItems) {
      const isCurrent = item.classList.contains(`${view}-view-link`);
      item.classList.toggle('active', isCurrent);
      if (isCurrent) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  }

  function showSpecialView(view, { updateHash = true } = {}) {
    if (!profileView || !aboutView) return;

    homeView.hidden = true;
    dictionaryView.hidden = true;
    profileView.hidden = view !== 'profile';
    aboutView.hidden = view !== 'about';

    if (mobileTitle) mobileTitle.textContent = view === 'profile' ? 'پروفایل' : 'درباره';
    activateSpecialNavigation(view);

    const hash = view === 'profile' ? '#profile' : '#about';
    if (updateHash && location.hash !== hash) history.replaceState(null, '', hash);
  }

  function leaveSpecialViews() {
    if (profileView) profileView.hidden = true;
    if (aboutView) aboutView.hidden = true;

    for (const item of specialNavItems) {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    }
  }

  function syncSpecialViewFromHash() {
    const view = specialViewFromHash();
    if (view) showSpecialView(view, { updateHash: false });
    else leaveSpecialViews();
  }

  themeButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.themeChoice)));
  profileLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSpecialView('profile');
  }));
  aboutLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSpecialView('about');
  }));
  regularViewLinks.forEach((link) => link.addEventListener('click', leaveSpecialViews));
  window.addEventListener('hashchange', syncSpecialViewFromHash);

  const viewObserver = new MutationObserver(() => {
    const view = specialViewFromHash();
    if (!view) return;

    const targetView = view === 'profile' ? profileView : aboutView;
    if (targetView.hidden || !homeView.hidden || !dictionaryView.hidden) {
      showSpecialView(view, { updateHash: false });
    }
  });

  for (const view of [homeView, dictionaryView, profileView, aboutView]) {
    if (view) viewObserver.observe(view, { attributes: true, attributeFilter: ['hidden'] });
  }

  applyTheme(currentTheme(), false);
  syncSpecialViewFromHash();
})();