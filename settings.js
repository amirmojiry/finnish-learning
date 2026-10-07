(() => {
  const THEME_KEY = 'fiAppTheme';

  const practiceView = document.querySelector('#practice-view');
  const dictionaryView = document.querySelector('#dictionary-view');
  const courseView = document.querySelector('#course-view');
  const settingsView = document.querySelector('#settings-view');
  const aboutView = document.querySelector('#about-view');
  const mobileTitle = document.querySelector('#mobile-view-title');
  const themeLabel = document.querySelector('#current-theme-label');
  const themeButtons = [...document.querySelectorAll('[data-theme-choice]')];
  const settingsLinks = [...document.querySelectorAll('.settings-view-link')];
  const aboutLinks = [...document.querySelectorAll('.about-view-link')];
  const regularViewLinks = [...document.querySelectorAll('[data-view-link], .course-view-link')];
  const allNavItems = [...document.querySelectorAll('.bottom-nav-item, .desktop-view-link')];
  const themeMeta = document.querySelector('meta[name="theme-color"]');

  const speechState = document.querySelector('#finnish-speech-state');
  const speechCard = document.querySelector('#finnish-speech-card');
  const speechMessage = document.querySelector('#finnish-speech-message');
  const speechVoice = document.querySelector('#finnish-speech-voice');
  const speechGuide = document.querySelector('#finnish-speech-guide');
  const speechRetry = document.querySelector('#finnish-speech-retry');
  const courseProgressReset = document.querySelector('#course-progress-reset');

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
    if (location.hash === '#settings') return 'settings';
    if (location.hash === '#about') return 'about';
    return null;
  }

  function activateSpecialNavigation(view) {
    const navigationView = view === 'about' ? 'settings' : view;
    for (const item of allNavItems) {
      const isCurrent = item.classList.contains(`${navigationView}-view-link`);
      item.classList.toggle('active', isCurrent);
      if (isCurrent) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    }
  }

  function showSpecialView(view, { updateHash = true } = {}) {
    if (!settingsView || !aboutView) return;

    if (practiceView) practiceView.hidden = true;
    if (dictionaryView) dictionaryView.hidden = true;
    if (courseView) courseView.hidden = true;
    settingsView.hidden = view !== 'settings';
    aboutView.hidden = view !== 'about';

    const titles = { settings: 'تنظیمات', about: 'درباره' };
    if (mobileTitle) mobileTitle.textContent = titles[view];
    activateSpecialNavigation(view);

    const hash = `#${view}`;
    if (updateHash && location.hash !== hash) history.replaceState(null, '', hash);
  }

  function leaveSpecialViews() {
    if (settingsView) settingsView.hidden = true;
    if (aboutView) aboutView.hidden = true;
    for (const item of allNavItems) {
      if (!item.classList.contains('settings-view-link')) continue;
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    }
  }

  function syncSpecialViewFromHash() {
    const view = specialViewFromHash();
    if (view) showSpecialView(view, { updateHash: false });
    else leaveSpecialViews();
  }

  function renderFinnishSpeechStatus() {
    if (!speechCard || !speechState || !speechMessage || !speechVoice || !speechGuide) return;
    const api = window.FinnishCourse;

    if (!api?.finnishSpeechStatus || !api?.speechSettingsGuide) {
      speechCard.dataset.state = 'loading';
      speechState.textContent = 'در حال بررسی';
      speechMessage.textContent = 'در حال آماده‌کردن بررسی صدای فنلاندی…';
      speechVoice.textContent = '';
      speechGuide.textContent = '';
      return;
    }

    const status = api.finnishSpeechStatus(window);
    speechCard.dataset.state = status.state;

    if (status.state === 'ready') {
      speechState.textContent = 'فعال';
      if (status.voice) {
        speechMessage.textContent = 'صدای فنلاندی مرورگر تشخیص داده شد.';
        speechVoice.textContent = status.voice.name
          ? `${status.voice.name} · ${status.voice.lang || 'fi-FI'}`
          : status.voice.lang || 'fi-FI';
        speechGuide.textContent = 'تمرین‌های شنیداری و دیکته از همین صدای فنلاندی استفاده می‌کنند.';
      } else {
        speechMessage.textContent = 'پخش فنلاندی از طریق موتور گفتار دستگاه فعال است.';
        speechVoice.textContent = 'fi-FI · انتخاب خودکار مرورگر/دستگاه';
        speechGuide.textContent = 'مرورگر صدای فنلاندی را در فهرست voiceها نشان نمی‌دهد؛ برنامه زبان fi-FI را مستقیم درخواست می‌کند. اگر تلفظ فنلاندی نبود، تنظیمات Text-to-Speech دستگاه را بررسی کن.';
      }
      return;
    }

    speechVoice.textContent = '';
    speechGuide.textContent = api.speechSettingsGuide(window);

    if (status.state === 'loading') {
      speechState.textContent = 'در حال بررسی';
      speechMessage.textContent = 'فهرست صداهای مرورگر هنوز بارگذاری نشده است. می‌توانی چند لحظه بعد دوباره بررسی کنی.';
    } else if (status.state === 'missing') {
      speechState.textContent = 'پیدا نشد';
      speechMessage.textContent = 'صدای فنلاندی روی این دستگاه پیدا نشد. تا زمان نصب آن، تمرین‌های صوتی بدون جریمه قابل ردکردن هستند.';
    } else {
      speechState.textContent = 'پشتیبانی نمی‌شود';
      speechMessage.textContent = 'این مرورگر یا دستگاه Speech Synthesis قابل استفاده برای صدای فنلاندی ارائه نمی‌دهد.';
    }
  }

  async function confirmCourseProgressReset() {
    const courseApi = window.FinnishCourse;
    if (!courseApi?.resetProgress) return false;

    const warningText = 'این کار همهٔ درس‌های کامل‌شده، امتیازها، تمرین نقاط ضعف و تاریخچهٔ پاسخ‌های دوره را پاک می‌کند و قابل بازگشت نیست.';
    const swal = window.Swal?.fire ? window.Swal : null;

    if (swal) {
      const result = await swal.fire({
        title: 'پیشرفت دوره پاک شود؟',
        text: warningText,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'بله، پاک شود',
        cancelButtonText: 'لغو',
        reverseButtons: true,
        focusCancel: true,
      });
      if (!result.isConfirmed) return false;
    } else if (!window.confirm(`پیشرفت دوره پاک شود؟\n\n${warningText}`)) {
      return false;
    }

    courseApi.resetProgress(localStorage);
    window.dispatchEvent(new CustomEvent('finnish-course-progress-reset'));

    if (swal) {
      await swal.fire({
        title: 'پیشرفت دوره پاک شد',
        icon: 'success',
        confirmButtonText: 'باشه',
      });
    } else {
      window.alert('پیشرفت دوره پاک شد.');
    }
    return true;
  }

  themeButtons.forEach((button) => button.addEventListener('click', () => applyTheme(button.dataset.themeChoice)));
  settingsLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSpecialView('settings');
    renderFinnishSpeechStatus();
  }));
  aboutLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSpecialView('about');
  }));
  regularViewLinks.forEach((link) => link.addEventListener('click', leaveSpecialViews));
  speechRetry?.addEventListener('click', renderFinnishSpeechStatus);
  courseProgressReset?.addEventListener('click', confirmCourseProgressReset);
  window.addEventListener('hashchange', syncSpecialViewFromHash);

  applyTheme(currentTheme(), false);
  syncSpecialViewFromHash();

  window.addEventListener('DOMContentLoaded', () => {
    renderFinnishSpeechStatus();
    if (window.speechSynthesis && typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', renderFinnishSpeechStatus);
    }
  }, { once: true });
})();
