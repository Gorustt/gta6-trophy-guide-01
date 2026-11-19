// views.js — pure DOM rendering. Every view is a function of (trophies,
// earned, query, selection): no network, no storage, no side effects except
// the DOM it is handed. Medal icons are inline geometric SVG, never images.
import { filterTrophies, isSpoiler, countByPhase } from './query.js';

export function esc(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// A geometric medal per tier: platinum = 4-point star, gold = circle with
// inner ring, silver = hexagon, bronze = triangle. Drawn as SVG so the
// contact sheet stays sharp at any scale.
export function medalSvg(grade) {
  const colors = { platinum: '#7dd3fc', gold: '#f59e0b', silver: '#cbd5e1', bronze: '#cd8f5a' };
  const c = colors[grade] || colors.bronze;
  if (grade === 'platinum') {
    return `<svg class="medal" viewBox="0 0 32 32" aria-label="platinum"><polygon points="16,2 20,12 30,16 20,20 16,30 12,20 2,16 12,12" fill="${c}" stroke="#0b1120" stroke-width="1"/></svg>`;
  }
  if (grade === 'gold') {
    return `<svg class="medal" viewBox="0 0 32 32" aria-label="gold"><circle cx="16" cy="16" r="13" fill="${c}" stroke="#0b1120" stroke-width="1"/><circle cx="16" cy="16" r="7" fill="none" stroke="#0b1120" stroke-width="2"/></svg>`;
  }
  if (grade === 'silver') {
    return `<svg class="medal" viewBox="0 0 32 32" aria-label="silver"><polygon points="16,3 27,10 27,22 16,29 5,22 5,10" fill="${c}" stroke="#0b1120" stroke-width="1"/></svg>`;
  }
  return `<svg class="medal" viewBox="0 0 32 32" aria-label="bronze"><polygon points="16,4 28,26 4,26" fill="${c}" stroke="#0b1120" stroke-width="1"/></svg>`;
}

function gradeTag(t) {
  return `<span class="tag ${t.grade}">${t.grade[0].toUpperCase() + t.grade.slice(1)}</span>`;
}

function rowHtml(t, earned, query) {
  const spoiler = isSpoiler(t, earned, query);
  const checked = earned.has(t.id) ? ' checked' : '';
  const earnedCls = earned.has(t.id) ? ' earned' : '';
  const name = spoiler ? 'Spoiler Protected' : esc(t.name);
  const desc = spoiler
    ? 'Spoiler Protected — Unlock in-game or turn off Spoiler Shield to inspect'
    : esc(t.description);
  const tags = [gradeTag(t), `<span class="tag phase">P${t.phase}</span>`];
  if (t.isMissable) tags.push('<span class="tag missable">MISSABLE</span>');
  if (spoiler) tags.push('<span class="tag hidden">HIDDEN</span>');
  if (!spoiler && t.milestoneTag) tags.push(`<span class="tag">${esc(t.milestoneTag)}</span>`);
  return `<div class="trophy-row${earnedCls}" data-id="${t.id}" role="button" tabindex="0" aria-label="${spoiler ? 'Spoiler protected trophy' : esc(t.name)}">
    <input type="checkbox" data-toggle="${t.id}"${checked} aria-label="Mark ${spoiler ? 'trophy' : esc(t.name)} earned">
    ${medalSvg(t.grade)}
    <div><div class="t-name">${name}</div><div class="t-desc">${desc}</div><div class="t-meta">${tags.join('')}</div></div>
  </div>`;
}

export function renderCatalog(el, trophies, earned, query, selectedId) {
  const rows = filterTrophies(trophies, earned, query);
  const head = `<h2>Trophy Catalog &mdash; ${rows.length} of ${trophies.length} shown</h2>`;
  if (!rows.length) {
    el.innerHTML = head + '<p class="empty">No trophies match this filter. Clear the search or pick another category.</p>';
    return;
  }
  el.innerHTML =
    head +
    rows
      .map((t) => rowHtml(t, earned, query).replace('class="trophy-row', `class="trophy-row${t.id === selectedId ? ' selected' : ''}`))
      .join('');
}

export function renderInspector(el, trophy, earned, query, onToggle) {
  if (!trophy) {
    el.innerHTML = '<h2>Guide Inspector</h2><p class="empty">Pick a trophy on the left to read its walkthrough, steps and sources.</p>';
    return;
  }
  const isEarned = earned.has(trophy.id);
  const spoiler = isSpoiler(trophy, earned, query);
  const tags = [gradeTag(trophy), `<span class="tag phase">Phase ${trophy.phase}</span>`];
  if (trophy.isMissable) tags.push('<span class="tag missable">MISSABLE</span>');
  if (spoiler) tags.push('<span class="tag hidden">HIDDEN</span>');
  const sub = spoiler
    ? 'Story trophy &bull; locked &bull; spoiler shield on'
    : `#${trophy.id} &bull; ${trophy.grade[0].toUpperCase() + trophy.grade.slice(1)} &bull; Phase ${trophy.phase} &bull; ${esc(trophy.milestoneTag || '')}`;
  let body = `<div class="insp-head">${medalSvg(trophy.grade)}<div><h2>${spoiler ? 'Spoiler Protected' : esc(trophy.name)}</h2><div class="insp-sub">${sub}</div></div></div>
  <div class="t-meta" style="margin-top:8px">${tags.join('')}</div>
  <button type="button" class="earn-btn${isEarned ? ' earned' : ''}" data-earn="${trophy.id}">${isEarned ? '✓ Earned — click to unmark' : 'Mark as earned'}</button>`;
  if (spoiler) {
    body += `<div class="spoiler-note">Spoiler Protected — Unlock in-game or turn off Spoiler Shield to inspect</div>`;
  } else {
    body += `<div class="callout"><div class="callout-label">Official PSN description</div><div>${esc(trophy.description)}</div></div>
    <div class="insp-sub" style="margin:6px 0">Milestone: ${esc(trophy.milestoneTag || '—')} &bull; Category: ${esc(trophy.category)}</div>`;
    if (trophy.isMissable) {
      body += `<div class="missable-alert"><span class="alert-title">MISSABLE ALERT &mdash; DO THIS IN CHAPTER 1.</span> Meditate on the balcony at Jason&rsquo;s house with Lucia right after completing Down to Earth. 18 spots across 10 locations, 100% needs 15 &mdash; but this Chapter 1 encounter cannot be revisited once the story moves on.</div>`;
    }
    body += `<h3>Strategy &amp; Walkthrough</h3><p>${esc(trophy.walkthrough)}</p>
    <h3>Execution Steps</h3><ol>${trophy.actionSteps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
    <div class="cited"><h3>Cited Sources</h3><ul>${trophy.citations
      .map((c) => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.source)}</a></li>`)
      .join('')}</ul></div>`;
  }
  el.innerHTML = body;
  if (onToggle) {
    const btn = el.querySelector('[data-earn]');
    if (btn) btn.addEventListener('click', () => onToggle(trophy.id));
  }
}

const PHASES = [
  { n: 1, title: 'Main Story Arc — Chapters 1–5', tip: 'Play the story straight through; every chapter and key mission trophy lands here.' },
  { n: 2, title: 'Chapter 1 Missable & Character Strands', tip: 'Lock in Positive Mental Attitude in Chapter 1, then finish each strand-holder\u2019s final mission.' },
  { n: 3, title: 'Stunt, Vehicle & Combat Mastery', tip: 'Chain stunts between missions; Combat Focus makes the 5-in-one takedown easy.' },
  { n: 4, title: 'Leonida Map & Collectible Sweep', tip: 'Sweep zone by zone: 52 zones, 100 WAiNK spots, 100 vehicles, 8 garages.' },
  { n: 5, title: 'Side Activities & Gold Medals', tip: 'Sample every activity once, then gold the shooting ranges venue by venue.' },
  { n: 6, title: '100% Completion & Platinum', tip: 'A Long Road needs every checklist item done; the platinum pops with the last one.' },
];

export function renderBlueprint(el, trophies, earned) {
  const byPhase = countByPhase(trophies, earned);
  const kpis = [
    ['1', 'Playthrough'],
    ['~200 hrs', 'Estimated time'],
    ['4/10', 'Difficulty'],
    ['1', 'Potentially missable'],
    ['0', 'Online trophies'],
  ];
  const cards = PHASES.map((p) => {
    const [got, total] = byPhase[p.n] || [0, 0];
    const pct = total ? Math.round((got / total) * 100) : 0;
    const chips = trophies
      .filter((t) => t.phase === p.n)
      .map((t) => `<span class="chip${earned.has(t.id) ? ' earned' : ''}" data-chip="${t.id}" title="${esc(t.name)}">${esc(t.name)}</span>`)
      .join('');
    return `<div class="phase-card"><h3>Phase ${p.n} — ${p.title}</h3>
      <div class="phase-count">${got} / ${total} earned &bull; ${pct}%</div>
      <div class="progress"><div style="width:${pct}%"></div></div>
      <p class="phase-tip">${p.tip}</p>
      <div class="chips">${chips}</div></div>`;
  }).join('');
  el.innerHTML = `<h2>Platinum Blueprint</h2>
  <div class="kpi-strip">${kpis.map(([v, l]) => `<div class="kpi"><div class="kpi-value">${v}</div><div class="kpi-label">${l}</div></div>`).join('')}</div>
  <div class="phase-grid">${cards}</div>`;
}

export function renderMissable(el, trophies, earned) {
  const pma = trophies.find((t) => t.isMissable);
  const strands = [
    ['Andy', 'Road to Rehabilitation', 'Complete the final mission for Andy.'],
    ['Kenton', 'This Was No Boat Accident', 'Complete the final mission for Kenton.'],
    ['Billy', 'The Lone Rider', 'Complete the final mission for Billy.'],
    ['Randy', 'Supply & Demand', 'Complete the final mission for Randy.'],
    ['Tyrone', 'Spin On This!', 'Complete the final mission for Tyrone.'],
    ['Bret', 'Fair Game', 'Hunt a unique animal for Bret.'],
  ];
  const slots = Array.from({ length: 15 }, (_, i) => i + 1)
    .map((n) => `<div class="save-slot${n === 2 ? ' current' : ''}">Slot ${n}</div>`)
    .join('');
  el.innerHTML = `<h2>Missable Alert &amp; Saves</h2>
  <div class="missable-alert"><span class="alert-title">1 POTENTIALLY MISSABLE TROPHY.</span> ${pma ? esc(pma.name) : ''} — meditate on the balcony at Jason&rsquo;s house with Lucia right after completing Down to Earth, in Chapter 1. Miss it and there is no mission replay and no New Game+ to go back.</div>
  <h3>Positive Mental Attitude — the numbers</h3>
  <p>18 meditation spots across 10 locations; 100% completion needs 15 of them. The Chapter 1 balcony encounter with Lucia is the only one that cannot be revisited — do it before the story moves past Chapter 1, then work the other 17 spots at your own pace.</p>
  <h3>Manual Save Rotation Protocol</h3>
  <ol>
    <li>Rotate all 15 manual save slots before every chapter transition.</li>
    <li>Keep Slot 2 as your pre-Chapter-1 checkpoint — the gold slot above.</li>
    <li>Never overwrite your newest two saves until the next chapter is confirmed safe.</li>
    <li>Avoid cheat codes entirely — they block trophy unlocks.</li>
  </ol>
  <div class="save-grid">${slots}</div>
  <h3>Character Strand Watchlist</h3>
  <ul class="watchlist">${strands.map(([who, what, how]) => `<li><strong>${who}</strong> — ${what}: ${how}</li>`).join('')}</ul>
  <p class="empty">No mission replay, no New Game+. A clean manual-save rotation is the only safety net.</p>`;
}

export function renderReference(el) {
  el.innerHTML = `<h2>Reference Index</h2>
  <h3>Methodology</h3>
  <p>Every trophy keeps its official PlayStation 5 name, description and grade character for character. Walkthroughs are written in this guide&rsquo;s own words from the official descriptions, cross-checked against the published guides below — never copied from them. A specific location or step earns its place only when a cited source backs it. The tracker runs entirely offline: the only file it fetches at runtime is its own <code>data/trophies.json</code>.</p>
  <h3>Source Directory</h3>
  <table>
    <thead><tr><th>Source</th><th>What it covers</th><th>Link</th></tr></thead>
    <tbody>
      <tr><td>PSNProfiles</td><td>GTA VI trophy guide &amp; roadmap</td><td><a href="https://psnprofiles.com/guide/grand-theft-auto-vi-trophy-guide" target="_blank" rel="noopener">psnprofiles.com/guide/grand-theft-auto-vi-trophy-guide</a></td></tr>
      <tr><td>PowerPyx</td><td>100% completion &amp; trophy roadmap</td><td><a href="https://www.powerpyx.com/grand-theft-auto-vi-trophy-guide-roadmap/" target="_blank" rel="noopener">powerpyx.com/grand-theft-auto-vi-trophy-guide-roadmap/</a></td></tr>
      <tr><td>Exophase</td><td>PS5 trophy list &amp; earn rates</td><td><a href="https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/" target="_blank" rel="noopener">exophase.com/game/grand-theft-auto-vi-psn/trophies/</a></td></tr>
      <tr><td>GTABase</td><td>GTA 6 trophy list</td><td><a href="https://www.gtabase.com/grand-theft-auto-6/trophies/" target="_blank" rel="noopener">gtabase.com/grand-theft-auto-6/trophies/</a></td></tr>
    </tbody>
  </table>
  <h3>Offline JSON Schema</h3>
  <p><code>app/data/trophies.json</code> is one object: <code>{ "game", "platform", "list", "trophies": [ … ] }</code>. Each trophy carries <code>id</code>, <code>name</code>, <code>description</code>, <code>grade</code> (official, untouched), plus <code>guide</code>, <code>category</code>, <code>isMissable</code>, <code>phase</code>, <code>milestoneTag</code>, <code>walkthrough</code>, <code>actionSteps</code> and <code>citations</code> (each <code>{ source, url }</code>). 55 trophies: 1 platinum, 2 gold, 6 silver, 46 bronze; 0 online.</p>`;
}
