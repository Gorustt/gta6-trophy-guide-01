// main.js — controller. Loads app/data/trophies.json, owns the query state,
// wires every control, and renders the four views. Preview query parameters
// (?preview=17&view=catalog&trophy=positive-mental-attitude) drive rendering
// only: they never touch localStorage, so a normal load always opens 0/55.
import { loadEarned, saveEarned, parseImport, exportEarned, resetEarned } from './store.js';
import { makeQuery, filterTrophies, countByTier, countByPhase, countByCategory } from './query.js';
import { renderCatalog, renderInspector, renderBlueprint, renderMissable, renderReference, esc } from './views.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

// Preview mode: earn the first N trophies by id (skipping the platinum, id 1,
// which stays locked) in memory only. localStorage is never read or written
// while a preview parameter is present.
const previewN = params.has('preview') ? Math.max(0, parseInt(params.get('preview'), 10) || 0) : null;
const previewEarned = new Set();
if (previewN !== null) {
  for (const t of trophies) {
    if (t.id === 1) continue;
    if (previewEarned.size >= previewN) break;
    previewEarned.add(t.id);
  }
}
const earned = previewN !== null ? previewEarned : loadEarned();
const persist = () => {
  if (previewN === null) saveEarned(earned);
};

const query = makeQuery();
if (params.get('category')) query.category = params.get('category');
if (params.get('tier')) query.tier = params.get('tier');
if (params.get('spoiler') === '1') query.spoilerShield = true;
if (params.get('unlocked') === '1') query.unlockedOnly = true;
if (params.get('q')) query.text = params.get('q');

let selectedId = null;
const slug = params.get('trophy');
if (slug) {
  const found = trophies.find((t) => t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') === slug);
  if (found) selectedId = found.id;
}
if (selectedId === null) {
  const first = filterTrophies(trophies, earned, query)[0];
  if (first) selectedId = first.id;
}

let view = params.get('view') || 'catalog';
if (!['catalog', 'blueprint', 'missable', 'reference'].includes(view)) view = 'catalog';

function renderHud() {
  const total = trophies.length;
  const got = [...earned].filter((id) => trophies.some((t) => t.id === id)).length;
  document.title = `Vice City Platinum Tracker — ${got}/${total} earned`;
  $('hud-overall').textContent = `${got} / ${total} • ${Math.round((got / total) * 100)}%`;
  const tiers = countByTier(trophies, earned);
  $('hud-tiers').textContent = `Platinum ${tiers.platinum[0]}/${tiers.platinum[1]} • Gold ${tiers.gold[0]}/${tiers.gold[1]} • Silver ${tiers.silver[0]}/${tiers.silver[1]} • Bronze ${tiers.bronze[0]}/${tiers.bronze[1]}`;
  const phases = countByPhase(trophies, earned);
  $('hud-phases').innerHTML = [1, 2, 3, 4, 5, 6]
    .map((p) => {
      const [gg, tt] = phases[p] || [0, 0];
      return `<span class="phase-chip${gg === tt && tt > 0 ? ' done' : ''}">P${p} ${gg}/${tt}</span>`;
    })
    .join('');
  const cats = countByCategory(trophies);
  document.querySelectorAll('#category-pills button').forEach((b) => {
    const c = b.dataset.category;
    b.textContent = `${b.textContent.replace(/ \(\d+\)$/, '')} (${cats[c] ?? 0})`;
  });
}

function renderAll() {
  renderHud();
  // The search/filter bar belongs to the catalog; hiding it on the other
  // views leaves room for all six blueprint phases in one 800px screen.
  $('command-controls').style.display = view === 'catalog' ? '' : 'none';
  document.querySelectorAll('#workspace-nav button').forEach((b) => {
    b.setAttribute('aria-selected', String(b.dataset.view === view));
  });
  for (const v of ['catalog', 'blueprint', 'missable', 'reference']) {
    $('view-' + v).classList.toggle('hidden-view', v !== view);
  }
  if (view === 'catalog') {
    renderCatalog($('trophy-catalog'), trophies, earned, query, selectedId);
    const sel = trophies.find((t) => t.id === selectedId) || null;
    renderInspector($('guide-inspector'), sel, earned, query, (id) => toggleEarned(id));
  } else if (view === 'blueprint') {
    renderBlueprint($('blueprint-panel'), trophies, earned);
  } else if (view === 'missable') {
    renderMissable($('missable-panel'), trophies, earned);
  } else {
    renderReference($('reference-panel'));
  }
}

function toggleEarned(id) {
  if (earned.has(id)) earned.delete(id);
  else earned.add(id);
  persist();
  renderAll();
}

function setView(v) {
  view = v;
  renderAll();
}

// Controls
$('query-box').value = query.text;
$('query-box').addEventListener('input', (e) => {
  query.text = e.target.value;
  renderAll();
});
document.querySelectorAll('#category-pills button').forEach((b) => {
  b.setAttribute('aria-pressed', String(b.dataset.category === query.category));
  b.addEventListener('click', () => {
    query.category = b.dataset.category;
    document.querySelectorAll('#category-pills button').forEach((x) => {
      x.setAttribute('aria-pressed', String(x === b));
    });
    renderAll();
  });
});
$('tier-select').value = query.tier;
$('tier-select').addEventListener('change', (e) => {
  query.tier = e.target.value;
  renderAll();
});
$('spoiler-shield').checked = query.spoilerShield;
$('spoiler-shield').addEventListener('change', (e) => {
  query.spoilerShield = e.target.checked;
  renderAll();
});
$('unlocked-filter').checked = query.unlockedOnly;
$('unlocked-filter').addEventListener('change', (e) => {
  query.unlockedOnly = e.target.checked;
  renderAll();
});
$('btn-export').addEventListener('click', () => exportEarned(earned));
$('btn-import').addEventListener('click', () => $('import-file').click());
$('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const next = parseImport(await file.text(), new Set(trophies.map((t) => t.id)));
  if (!next) {
    alert('That file is not valid trophy progress (a JSON array of trophy ids).');
    return;
  }
  earned.clear();
  for (const id of next) earned.add(id);
  persist();
  renderAll();
});
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all earned trophies to 0/55?')) return;
  earned.clear();
  resetEarned();
  renderAll();
});
document.querySelectorAll('#workspace-nav button').forEach((b) => {
  b.addEventListener('click', () => setView(b.dataset.view));
});

// Catalog clicks (delegated: rows, checkboxes, chips all route here).
$('trophy-catalog').addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-toggle]');
  if (toggle) {
    e.stopPropagation();
    toggleEarned(parseInt(toggle.dataset.toggle, 10));
    return;
  }
  const row = e.target.closest('.trophy-row');
  if (row) {
    selectedId = parseInt(row.dataset.id, 10);
    renderAll();
  }
});
$('trophy-catalog').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.trophy-row');
  if (!row) return;
  e.preventDefault();
  selectedId = parseInt(row.dataset.id, 10);
  renderAll();
});
$('blueprint-panel').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-chip]');
  if (!chip) return;
  selectedId = parseInt(chip.dataset.chip, 10);
  setView('catalog');
});

// Keyboard: 1–4 switch views, arrows move the inspector selection.
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  const views = ['catalog', 'blueprint', 'missable', 'reference'];
  if (['1', '2', '3', '4'].includes(e.key)) {
    setView(views[parseInt(e.key, 10) - 1]);
    return;
  }
  if (view !== 'catalog') return;
  const rows = filterTrophies(trophies, earned, query);
  const i = rows.findIndex((t) => t.id === selectedId);
  if (e.key === 'ArrowDown' && i < rows.length - 1) {
    selectedId = rows[i + 1].id;
    renderAll();
  } else if (e.key === 'ArrowUp' && i > 0) {
    selectedId = rows[i - 1].id;
    renderAll();
  } else if (e.key === 'Enter' && selectedId !== null) {
    toggleEarned(selectedId);
  }
});

renderAll();
