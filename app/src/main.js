// main.js — controller for the Vice City Platinum Tracker.
// Loads app/data/trophies.json once, keeps progress in localStorage, and
// renders the four views. Preview query params (?preview=17, ?view=...,
// ?trophy=..., ?category=..., ?spoiler=on) drive rendering only: they build an
// in-memory earned set and never touch localStorage, so a normal load is 0/55.
import { loadEarned, saveEarned, clearEarned, exportProgress, importProgress, downloadText } from './store.js';
import { filterTrophies, countByCategory, phaseCounts, slugOf } from './query.js';
import { renderHUD, renderCatalog, renderInspector, renderBlueprint, renderMissable, renderReference } from './views.js';

const PREVIEW_ORDER = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 7, 14, 1];

const state = {
  trophies: [],
  earned: new Set(),
  view: 'catalog',
  query: '',
  category: 'all',
  tier: 'all',
  spoilerShield: false,
  unlockedOnly: false,
  selectedId: null,
  preview: false,
};

const $ = (id) => document.getElementById(id);

function parsePreview() {
  const params = new URLSearchParams(location.search);
  const n = parseInt(params.get('preview') || '', 10);
  if (Number.isFinite(n) && n > 0) {
    state.preview = true;
    state.earned = new Set(PREVIEW_ORDER.slice(0, Math.min(n, 55)));
  }
  const view = params.get('view');
  if (view === 'blueprint' || view === 'missable' || view === 'reference' || view === 'catalog') state.view = view;
  const category = params.get('category');
  if (category === 'story' || category === 'missable' || category === 'collectibles' || category === 'activities' || category === 'online') {
    state.category = category;
  }
  if (params.get('spoiler') === 'on') state.spoilerShield = true;
  const trophy = params.get('trophy');
  if (trophy) {
    const found = state.trophies.find((t) => slugOf(t.name) === trophy);
    if (found) state.selectedId = found.id;
  }
}

function selectedTrophy() {
  if (state.selectedId != null) {
    const t = state.trophies.find((x) => x.id === state.selectedId);
    if (t) return t;
  }
  const list = filterTrophies(state.trophies, state);
  return list[0] || state.trophies[0] || null;
}

function render() {
  $('completion-hud').innerHTML = renderHUD(state.trophies, state.earned, phaseCounts(state.trophies, state.earned));
  const counts = countByCategory(state.trophies);
  const pills = $('category-pills');
  pills.innerHTML = ['all', 'story', 'missable', 'collectibles', 'activities', 'online']
    .map((c) => {
      const label = c === 'all' ? 'All' : c[0].toUpperCase() + c.slice(1);
      return '<button type="button" data-category="' + c + '" aria-pressed="' + (state.category === c) + '">' + label + ' (' + counts[c] + ')</button>';
    })
    .join('');
  $('tier-select').value = state.tier;
  $('spoiler-shield').checked = state.spoilerShield;
  $('unlocked-filter').checked = state.unlockedOnly;
  $('query-box').value = state.query;
  const tabs = { catalog: 'Catalog & Walkthroughs', blueprint: 'Platinum Blueprint', missable: 'Missable Alert & Saves', reference: 'Reference Index' };
  $('workspace-nav').innerHTML = Object.keys(tabs)
    .map((v) => '<button type="button" data-view="' + v + '" aria-selected="' + (state.view === v) + '">' + tabs[v] + '</button>')
    .join('');
  $('catalog-view').classList.toggle('hidden', state.view !== 'catalog');
  $('blueprint-panel').classList.toggle('hidden', state.view !== 'blueprint');
  $('missable-panel').classList.toggle('hidden', state.view !== 'missable');
  $('reference-panel').classList.toggle('hidden', state.view !== 'reference');
  if (state.view === 'catalog') {
    const list = filterTrophies(state.trophies, state);
    $('trophy-catalog').innerHTML =
      '<h2>Catalog &amp; Walkthroughs</h2><p class="count-line">Showing ' + list.length + ' of ' + state.trophies.length + ' trophies</p>' +
      renderCatalog(list, state);
    $('guide-inspector').innerHTML = renderInspector(selectedTrophy(), state);
  } else if (state.view === 'blueprint') {
    $('blueprint-panel').innerHTML = renderBlueprint(state.trophies, state.earned, phaseCounts(state.trophies, state.earned));
  } else if (state.view === 'missable') {
    $('missable-panel').innerHTML = renderMissable(state.trophies, state.earned);
  } else {
    $('reference-panel').innerHTML = renderReference();
  }
}

function toggleEarned(id) {
  if (state.preview) {
    if (state.earned.has(id)) state.earned.delete(id);
    else state.earned.add(id);
  } else {
    if (state.earned.has(id)) state.earned.delete(id);
    else state.earned.add(id);
    saveEarned(state.earned);
  }
  render();
}

function bindEvents() {
  $('query-box').addEventListener('input', (e) => {
    state.query = e.target.value;
    render();
  });
  $('category-pills').addEventListener('click', (e) => {
    const b = e.target.closest('[data-category]');
    if (b) {
      state.category = b.dataset.category;
      render();
    }
  });
  $('tier-select').addEventListener('change', (e) => {
    state.tier = e.target.value;
    render();
  });
  $('spoiler-shield').addEventListener('change', (e) => {
    state.spoilerShield = e.target.checked;
    render();
  });
  $('unlocked-filter').addEventListener('change', (e) => {
    state.unlockedOnly = e.target.checked;
    render();
  });
  $('workspace-nav').addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) {
      state.view = b.dataset.view;
      render();
    }
  });
  $('trophy-catalog').addEventListener('click', (e) => {
    const check = e.target.closest('[data-check]');
    if (check) {
      e.stopPropagation();
      toggleEarned(parseInt(check.dataset.check, 10));
      return;
    }
    const row = e.target.closest('[data-trophy]');
    if (row) {
      state.selectedId = parseInt(row.dataset.trophy, 10);
      render();
    }
  });
  $('trophy-catalog').addEventListener('keydown', (e) => {
    const row = e.target.closest('[data-trophy]');
    if (!row) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      state.selectedId = parseInt(row.dataset.trophy, 10);
      render();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const list = filterTrophies(state.trophies, state);
      const idx = list.findIndex((t) => t.id === parseInt(row.dataset.trophy, 10));
      const next = e.key === 'ArrowDown' ? list[idx + 1] : list[idx - 1];
      if (next) {
        state.selectedId = next.id;
        render();
        const el = document.querySelector('[data-trophy="' + next.id + '"]');
        if (el) el.focus();
      }
    }
  });
  $('guide-inspector').addEventListener('click', (e) => {
    const b = e.target.closest('[data-toggle]');
    if (b) toggleEarned(parseInt(b.dataset.toggle, 10));
  });
  $('blueprint-panel').addEventListener('click', (e) => {
    const chip = e.target.closest('[data-goto]');
    if (chip) {
      state.view = 'catalog';
      state.selectedId = parseInt(chip.dataset.goto, 10);
      render();
    }
  });
  $('btn-export').addEventListener('click', () => {
    downloadText('vice-city-platinum-tracker.json', exportProgress(state.earned));
  });
  $('btn-import').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const ids = importProgress(String(reader.result));
          state.earned = ids;
          if (!state.preview) saveEarned(state.earned);
          render();
        } catch (err) {
          alert('Import failed: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
  $('btn-reset').addEventListener('click', () => {
    if (confirm('Reset all progress to 0/55?')) {
      state.earned = new Set();
      if (!state.preview) clearEarned();
      render();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $('query-box')) {
      e.preventDefault();
      $('query-box').focus();
    }
  });
}

async function boot() {
  if (!state.preview) state.earned = loadEarned();
  try {
    const res = await fetch('data/trophies.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    state.trophies = Array.isArray(data) ? data : data.trophies || [];
  } catch (err) {
    $('trophy-catalog').innerHTML = '<p class="empty-note">Could not load app/data/trophies.json (' + err.message + '). Serve app/ over HTTP and reload.</p>';
    return;
  }
  parsePreview();
  bindEvents();
  render();
}

boot();
