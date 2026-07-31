(() => {
  function moveReviewPanel() {
    const slot = document.getElementById('spaced-review-slot');
    const panel = document.getElementById('spaced-review');
    if (!slot || !panel) return false;
    if (panel.parentElement !== slot) slot.replaceChildren(panel);
    return true;
  }

  function initializeProfileReviewMount() {
    if (moveReviewPanel()) return;

    const observer = new MutationObserver(() => {
      if (!moveReviewPanel()) return;
      observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeProfileReviewMount, { once: true });
  } else {
    initializeProfileReviewMount();
  }
})();
