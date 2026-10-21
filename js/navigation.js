// The system back button (Android, browser) closes the settings and guide pages, the
// options sheet and sessions instead of leaving the app: opening one adds a
// history entry, and going back through it runs that view's close handler.
const views = [];
let isClosingInApp = false;
let resolveClosing = null;

/**
 * Registers a view that was just opened; `handleClose` hides it again.
 * With `handleBack`, the system back button calls it instead and the view
 * stays open (e.g. to ask before quitting); in-app buttons use closeView().
 */
export function openView(handleClose, handleBack = null) {
  views.push({ handleClose, handleBack });
  history.pushState({ view: views.length }, '');
}

/**
 * Closes the top view from an in-app button, through history so both stay in sync.
 * Resolves once it is closed, so another view can be opened in its place.
 */
export function closeView() {
  if (!views.length) return Promise.resolve();
  isClosingInApp = true;
  history.back();
  return new Promise(resolve => { resolveClosing = resolve; });
}

export function initNavigation() {
  // Our entries are views, not pages: the browser restoring their scroll position
  // after going back would undo scrolling done in the newly shown view
  history.scrollRestoration = 'manual';

  window.addEventListener('popstate', () => {
    const view = views.at(-1);
    if (!view) return;

    if (view.handleBack && !isClosingInApp) {
      history.pushState({ view: views.length }, ''); // stay on this view
      view.handleBack();
      return;
    }

    isClosingInApp = false;
    views.pop();
    view.handleClose();
    resolveClosing?.();
    resolveClosing = null;
  });
}
