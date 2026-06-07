import { cfg } from './state.js';

export function initSetup() {
  document.querySelectorAll('button[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.dataset.group;
      const value = btn.dataset.value;

      // Clicking the active combo button closes it and reverts to HSK 1
      if (group === 'level' && value === 'combo' && btn.classList.contains('active')) {
        document.querySelectorAll('[data-group="level"]').forEach(b => b.classList.remove('active'));
        document.querySelector('[data-group="level"][data-value="1"]').classList.add('active');
        updateComboPanel('1');
        return;
      }

      document.querySelectorAll(`[data-group="${group}"]`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (group === 'count') {
        document.getElementById('custom-count').value = '';
      }
      if (group === 'order') {
        updateShuffleRow(value);
        updateRangeRow(value);
      }
      if (group === 'level') {
        updateComboPanel(value);
      }
    });
  });

  document.getElementById('custom-count').addEventListener('input', e => {
    if (e.target.value) {
      document.querySelectorAll('[data-group="count"]').forEach(b => b.classList.remove('active'));
    }
  });

  // Dim count section and show validation hint when range inputs change
  const rangeFrom = document.getElementById('range-from');
  const rangeTo   = document.getElementById('range-to');
  const rangeHint = document.getElementById('range-hint');
  const countSection = document.getElementById('count-section');

  const updateRangeState = () => {
    const from = parseInt(rangeFrom.value);
    const to   = parseInt(rangeTo.value);
    const fromOk = !isNaN(from) && from >= 1;
    const toOk   = !isNaN(to)   && to   >= 1;

    if (fromOk && toOk && from > to) {
      rangeHint.textContent = '"From" must be less than or equal to "To".';
      rangeHint.style.color = 'var(--error)';
      countSection.classList.remove('count-overridden');
    } else if (fromOk && toOk) {
      rangeHint.textContent = `Words ${from}–${to} selected (${to - from + 1} words). Count above is overridden.`;
      rangeHint.style.color = 'var(--primary)';
      countSection.classList.add('count-overridden');
    } else {
      rangeHint.textContent = 'Fill both fields to override the count above.';
      rangeHint.style.color = '';
      countSection.classList.remove('count-overridden');
    }
  };

  rangeFrom.addEventListener('input', updateRangeState);
  rangeTo.addEventListener('input',   updateRangeState);
}

function updateShuffleRow(order) {
  const row = document.getElementById('shuffle-row');
  if (order === 'random') {
    row.classList.remove('visible');
    document.getElementById('toggle-shuffle').checked = false;
  } else {
    row.classList.add('visible');
  }
}

function updateRangeRow(order) {
  const row = document.getElementById('range-row');
  if (order === 'random') {
    row.classList.remove('visible');
    document.getElementById('range-from').value = '';
    document.getElementById('range-to').value   = '';
    document.getElementById('range-hint').textContent = 'Fill both fields to override the count above.';
    document.getElementById('range-hint').style.color = '';
    document.getElementById('count-section').classList.remove('count-overridden');
  } else {
    row.classList.add('visible');
  }
}

function updateComboPanel(level) {
  const panel = document.getElementById('combo-panel');
  if (level === 'combo') {
    panel.classList.add('visible');
    const anyChecked = [...document.querySelectorAll('.combo-check')].some(cb => cb.checked);
    if (!anyChecked) {
      document.querySelector('.combo-check[value="1"]').checked = true;
      document.querySelector('.combo-check[value="2"]').checked = true;
    }
  } else {
    panel.classList.remove('visible');
  }
}

export function readSetupConfig() {
  const g = group => document.querySelector(`[data-group="${group}"].active`);

  cfg.level = g('level') ? g('level').dataset.value : '1';
  cfg.order = g('order') ? g('order').dataset.value : 'random';

  if (cfg.level === 'combo') {
    cfg.comboLevels = [...document.querySelectorAll('.combo-check:checked')]
      .map(cb => cb.value)
      .sort();
  } else {
    cfg.comboLevels = [];
  }

  cfg.presentationShuffle = cfg.order !== 'random'
    && document.getElementById('toggle-shuffle').checked;

  const cardModeBtn = document.querySelector('[data-group="card-mode"].active');
  cfg.cardMode = cardModeBtn ? cardModeBtn.dataset.value : 'hanzi-first';

  // Range (only meaningful when ordered)
  const fromVal = parseInt(document.getElementById('range-from').value);
  const toVal   = parseInt(document.getElementById('range-to').value);
  cfg.rangeFrom = (cfg.order !== 'random' && fromVal >= 1) ? fromVal : null;
  cfg.rangeTo   = (cfg.order !== 'random' && toVal   >= 1) ? toVal   : null;

  const customVal = parseInt(document.getElementById('custom-count').value);
  if (customVal > 0) {
    cfg.count = customVal;
  } else if (g('count')) {
    cfg.count = g('count').dataset.value === 'all' ? Infinity : parseInt(g('count').dataset.value);
  } else {
    cfg.count = 25;
  }
}
