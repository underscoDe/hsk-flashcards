import { foldForSearch, findMatches } from './utils.js';
import { getLanguage, t } from './i18n.js';

// The guide is plain HTML (index.html), one <template> per language. Searching keeps
// the topics that contain every typed word, opens them and highlights the words;
// accents don't matter.

let topics = [];

export function initGuide() {
  const input = document.getElementById('guide-search');
  input.addEventListener('input', () => search(input.value));

  // Section links scroll instead of using #anchors, which would add history entries
  document.getElementById('guide-layout').addEventListener('click', e => {
    const link = e.target.closest('.guide-toc-link');
    if (link) document.getElementById(link.dataset.target).scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // "/" jumps to the search field, as on many help sites
  document.addEventListener('keydown', e => {
    if (e.key !== '/' || !document.getElementById('guide-screen').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();
    input.focus();
  });

  renderGuide();
  document.addEventListener('hsk:language-change', renderGuide);
}

/** Shows the guide in the current language, ready to search. */
function renderGuide() {
  const guide = document.getElementById(`guide-${getLanguage()}`).content.cloneNode(true);
  document.getElementById('guide-layout').replaceChildren(guide);
  topics = [...document.querySelectorAll('#guide-layout .guide-item')].map(el => ({
    el,
    text: foldForSearch(el.textContent),
  }));
  search(document.getElementById('guide-search').value);
}

/** Empties the search and closes every topic, for a fresh guide each time it opens. */
export function resetGuide() {
  document.getElementById('guide-search').value = '';
  search('');
  // Left over when the guide was closed before the animation ended
  document.querySelectorAll('.guide-item.is-pointed').forEach(el => el.classList.remove('is-pointed'));
}

/** Opens a topic, or shows a section, for the "?" buttons around the app. */
export function showGuideTopic(id) {
  const target = document.getElementById(id);
  target.scrollIntoView({ block: 'start' });
  if (target.tagName !== 'DETAILS') return;

  target.open = true;
  target.classList.add('is-pointed');
  // The answer's own fade-in also bubbles up here: wait for the topic's animation
  target.addEventListener('animationend', function handleEnd(e) {
    if (e.target !== target) return;
    target.classList.remove('is-pointed');
    target.removeEventListener('animationend', handleEnd);
  });
}

function search(query) {
  const terms = foldForSearch(query).split(/\s+/).filter(Boolean);
  const isSearching = terms.length > 0;

  const found = topics.filter(({ el, text }) => {
    clearHighlights(el);
    const isMatch = terms.every(term => text.includes(term));
    el.hidden = !isMatch;
    el.open   = isSearching && isMatch;
    if (isSearching && isMatch) highlight(el, terms);
    return isMatch;
  }).length;

  document.querySelectorAll('.guide-section').forEach(section => {
    section.hidden = !section.querySelector('.guide-item:not([hidden])');
  });
  document.getElementById('guide-screen').classList.toggle('is-searching', isSearching);
  document.getElementById('guide-empty').hidden = !isSearching || found > 0;
  document.getElementById('guide-status').textContent =
    isSearching && found ? t('guide.found', { count: found }) : '';
}

/** Wraps the matching parts of every text in `el` in <mark>. */
function highlight(el, terms) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes  = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    const ranges = findMatches(node.data, terms);
    if (!ranges.length) return;

    const parts = ranges.flatMap(([start, end], i) => {
      const mark = document.createElement('mark');
      mark.textContent = node.data.slice(start, end);
      return [node.data.slice(i ? ranges[i - 1][1] : 0, start), mark];
    });
    node.replaceWith(...parts, node.data.slice(ranges.at(-1)[1]));
  });
}

function clearHighlights(el) {
  el.querySelectorAll('mark').forEach(mark => mark.replaceWith(mark.textContent));
  el.normalize(); // merge the text back, so later searches see whole words
}
