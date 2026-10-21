import { openView, closeView } from './navigation.js';

const SWIPE_CLOSE_DISTANCE = 80; // px dragged down before letting go

/**
 * Bottom sheet on a native <dialog>. It closes with its close button, Esc, a tap
 * outside, a swipe down on its header, or the system back button.
 */
export function initSheet(dialog, trigger, closeButton) {
  trigger.addEventListener('click', () => {
    dialog.showModal();
    openView(() => dialog.close());
  });
  closeButton.addEventListener('click', closeView);
  dialog.addEventListener('cancel', e => { e.preventDefault(); closeView(); }); // Esc
  dialog.addEventListener('click', e => {
    if (e.target === dialog) closeView(); // the backdrop
  });

  // ---- Swipe down on the header ----
  const header = dialog.querySelector('.sheet-header');
  let startY = 0;

  header.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    dialog.classList.add('dragging');
  }, { passive: true });

  header.addEventListener('touchmove', e => {
    const dy = Math.max(0, e.touches[0].clientY - startY);
    dialog.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  header.addEventListener('touchend', e => {
    dialog.classList.remove('dragging');
    dialog.style.transform = '';
    if (e.changedTouches[0].clientY - startY > SWIPE_CLOSE_DISTANCE) closeView();
  });
}
