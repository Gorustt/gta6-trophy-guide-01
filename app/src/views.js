// views.js — pure rendering for the Vice City Platinum Tracker.
// Every function returns an HTML string; main.js injects it and wires events.
// All trophy text goes through esc() — names carry asterisks and an ellipsis,
// never markup. Spoiler shielding redacts locked story trophies here.
import { categoryOf, slugOf } from './query.js';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TIER_FILL = { platinum: '#e2e8f0', gold: '#f59e0b', silver: '#cbd5e1', bronze: '#d97706' };
const TIER_LETTER = { platinum: 'P', gold: 'G', silver: 'S', bronze: 'B' };

export function medalSVG(grade, size) {
  const s = size || 26;
  const fill = TIER_FILL[grade] || '#94a3b8';
  const letter = TIER_LETTER[grade] || '?';
  return (
    '<svg width="' + s + '" height="' + s + '" viewBox="0 0 26 26" aria-hidden="true">' +
    '<circle cx="13" cy="13" r="12" fill="' + fill + '" stroke="#0b1120" stroke-width="1.5"/>' +
    '<text x="13" y="17.5" text-anchor="middle" font-size="11" font-weight="700" fill="#0b1120" font-family="ui-monospace, monospace">' + letter + '</text>' +
    '</svg>'
  );
}

export function isRedacted(trophy, state) {
  return !!(
    state.spoilerShield &&
    categoryOf(trophy) === 'story' &&
    !(state.earned && state.earned.has(trophy.id))
  );
}

const REDACTED_LINE = 'Spoiler Protected — Unlock in-game or turn off Spoiler Shield to inspect';

// ---- HUD ----
export function renderHUD(trophies, earned, phaseCounts) {
  const total = trophies.length;
  const done = earned.size;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const tiers = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    if (!tiers[t.grade]) continue;
    tiers[t.grade][1] += 1;
    if (earned.has(t.id)) tiers[t.grade][0] += 1;
  }
  let chips = '';
  for (let p = 1; p <= 6; p++) {
    const c = phaseCounts[p] || [0, 0];
    const doneCls = c[0] === c[1] && c[1] > 0 ? ' done' : '';
    chips += '<span class="phase-chip' + doneCls + '">P' + p + ' ' + c[0] + '/' + c[1] + '</span>';
  }
  return (
    '<div class="hud-top">' +
    '<div class="hud-mark">VC</div>' +
    '<div class="hud-title"><h1>Vice City Platinum Tracker</h1>' +
    '<p>55 Official PS5 Trophies &bull; Offline Walkthroughs &amp; Roadmap &bull; Zero Network</p></div>' +
    '</div>' +
    '<div class="hud-stats">' +
    '<div class="hud-box"><span class="lbl">OVERALL</span><b>' + done + ' / ' + total + ' &bull; ' + pct + '%</b></div>' +
    '<div class="hud-box"><span class="lbl">TIERS</span>Platinum ' + tiers.platinum[0] + '/' + tiers.platinum[1] +
    ' &bull; Gold ' + tiers.gold[0] + '/' + tiers.gold[1] +
    ' &bull; Silver ' + tiers.silver[0] + '/' + tiers.silver[1] +
    ' &bull; Bronze ' + tiers.bronze[0] + '/' + tiers.bronze[1] + '</div>' +
    '<div class="hud-box"><span class="lbl">ROADMAP</span><span class="phase-chips">' + chips + '</span></div>' +
    '</div>'
  );
}

// ---- Catalog ----
export function renderCatalog(list, state) {
  if (!list.length) {
    return '<p class="empty-note">No trophies match these filters. Clear the search or pick another category.</p>';
  }
  return list
    .map((t) => {
      const earned = state.earned.has(t.id);
      const selected = state.selectedId === t.id;
      const redacted = isRedacted(t, state);
      const name = redacted ? 'Spoiler Protected' : esc(t.name);
      const desc = redacted ? REDACTED_LINE : esc(t.description);
      const nameCls = earned ? 't-name earned' : 't-name';
      let tags = '<span class="tag ' + t.grade + '">' + t.grade[0].toUpperCase() + t.grade.slice(1) + '</span>';
      tags += '<span class="tag phase">P' + t.phase + '</span>';
      if (t.isMissable) tags += '<span class="tag missable">MISSABLE</span>';
      if (redacted) {
        tags += '<span class="tag redacted">HIDDEN</span>';
      } else {
        tags += '<span class="tag">' + esc(t.milestoneTag || '') + '</span>';
      }
      return (
        '<div class="trophy-row" role="button" tabindex="0" data-trophy="' + t.id + '" aria-selected="' + selected + '">' +
        '<input type="checkbox" data-check="' + t.id + '"' + (earned ? ' checked' : '') + ' aria-label="Mark ' + esc(t.name) + ' earned">' +
        '<span class="medal">' + medalSVG(t.grade, 26) + '</span>' +
        '<span class="t-body"><span class="' + nameCls + '">' + name + '</span><br>' +
        '<span class="t-desc' + (redacted ? ' redacted-text' : '') + '">' + desc + '</span><br>' + tags + '</span>' +
        '<span class="t-num">#' + t.id + '</span>' +
        '</div>'
      );
    })
    .join('');
}

// ---- Inspector ----
export function renderInspector(trophy, state) {
  if (!trophy) {
    return '<h2>Guide Inspector</h2><p class="empty-note">Pick a trophy on the left to see its walkthrough, execution steps and cited sources.</p>';
  }
  const earned = state.earned.has(trophy.id);
  const redacted = isRedacted(trophy, state);
  const name = redacted ? 'Spoiler Protected' : esc(trophy.name);
  const desc = redacted ? REDACTED_LINE : esc(trophy.description);
  const walk = redacted ? REDACTED_LINE : esc(trophy.walkthrough || trophy.guide || '');
  let html =
    '<div class="insp-head"><span class="medal">' + medalSVG(trophy.grade, 34) + '</span>' +
    '<div><h2>' + name + '</h2>' +
    '<div class="insp-meta">#' + trophy.id + ' &bull; ' + trophy.grade[0].toUpperCase() + trophy.grade.slice(1) +
    ' &bull; Phase ' + trophy.phase + (redacted ? '' : ' &bull; ' + esc(trophy.milestoneTag || '')) + '</div></div></div>' +
    '<button type="button" class="earned-btn' + (earned ? ' earned' : '') + '" data-toggle="' + trophy.id + '">' +
    (earned ? 'Earned — click to unmark' : 'Mark as earned') + '</button>' +
    '<div class="callout"><span class="callout-lbl">OFFICIAL PSN DESCRIPTION</span>' + desc + '</div>';
  if (trophy.isMissable) {
    html +=
      '<div class="missable-alert"><b>MISSABLE ALERT — DO THIS IN CHAPTER 1.</b> Meditate on the balcony at Jason\u2019s house with Lucia right after Down to Earth. 18 spots / 10 locations; 100% needs 15. This encounter cannot be revisited.</div>';
  }
  html += '<h3>Strategy &amp; Walkthrough</h3><p>' + walk + '</p>';
  const steps = trophy.actionSteps || [];
  if (steps.length) {
    html += '<h3>Execution Steps</h3><ol class="steps">';
    for (const s of steps) html += '<li>' + esc(s) + '</li>';
    html += '</ol>';
  }
  const cites = trophy.citations || [];
  if (cites.length) {
    html += '<h3>Cited Sources</h3><ul class="cite-list">';
    for (const c of cites) {
      html += '<li><a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.name) + '</a></li>';
    }
    html += '</ul>';
  }
  return html;
}

// ---- Blueprint ----
const PHASES = [
  {
    n: 1, title: 'Main Story Arc', sub: 'Chapters 1–5',
    objectives: ['Finish Chapters 1–4 and the final mission', 'Clear the six named story missions'],
    tips: ['Play on the standard difficulty; story trophies cannot be missed', 'Trophies pop at each chapter and mission end'],
  },
  {
    n: 2, title: 'Ch. 1 Missable & Character Strands', sub: 'One missable + 6 strands',
    objectives: ['Meditate with Lucia in Chapter 1 (the only missable)', 'Finish the final mission for Andy, Kenton, Billy, Randy, Tyrone and Bret'],
    tips: ['Do the balcony meditation before leaving Chapter 1', 'Strand missions unlock as the story advances'],
  },
  {
    n: 3, title: 'Stunt, Vehicle & Combat Mastery', sub: 'Stunts, ranges, races',
    objectives: ['250 of 397 stunts; gold in all 42 Shooting Range challenges', 'Win drone races at all 14 Top Fun locations; 20 different races'],
    tips: ['Stunt jumps count across free roam — chain them between missions', 'Gold medals need clean runs, not speed alone'],
  },
  {
    n: 4, title: 'Leonida Map & Collectible Sweep', sub: 'Cards, WAINK, zones',
    objectives: ['3 collectible card sets; WAINK It at 100 spots', 'Explore all 52 map zones; hit one illegal operation per gang'],
    tips: ['Sweep one region at a time with the map open', 'Buy all 8 garages and register 10 vehicles as you go'],
  },
  {
    n: 5, title: 'Side Activities & Gold Medals', sub: 'Everything else',
    objectives: ['Try all 9 activity types; 50 challenges', 'Launder $250,000 of Marked Bills; spend $100,000 in shops'],
    tips: ['Money trophies come naturally from heists and businesses', 'Save the odd one-offs (bowling, cocktail, showroom) for a relaxed session'],
  },
  {
    n: 6, title: '100% Completion & Platinum', sub: 'The finish line',
    objectives: ['Reach 100% completion for A Long Road', 'Vice Got a Price! pops with the 54th trophy'],
    tips: ['100% counts missions, activities and collectibles together', 'Use the tracker: one unchecked row is one job left'],
  },
];

export function renderBlueprint(trophies, earned, phaseCounts) {
  let cards = '';
  for (const ph of PHASES) {
    const c = phaseCounts[ph.n] || [0, 0];
    const pct = c[1] ? Math.round((c[0] / c[1]) * 100) : 0;
    const members = trophies.filter((t) => t.phase === ph.n).slice(0, 6);
    let chips = '';
    for (const m of members) {
      const cls = earned.has(m.id) ? ' earned' : (m.isMissable ? ' miss' : '');
      chips += '<button type="button" class="mini-chip' + cls + '" data-goto="' + m.id + '">' + esc(m.name) + '</button>';
    }
    cards +=
      '<div class="phase-card"><h3>Phase ' + ph.n + ' — ' + esc(ph.title) + '</h3>' +
      '<div class="phase-sub">' + esc(ph.sub) + ' &bull; ' + c[1] + ' trophies</div><ul>';
    for (const o of ph.objectives) cards += '<li>' + esc(o) + '</li>';
    cards += '</ul><div class="progress"><i style="width:' + pct + '%"></i></div>' +
      '<div class="progress-lbl">' + c[0] + ' / ' + c[1] + ' &bull; ' + pct + '%</div>' +
      '<div class="chip-row">' + chips + '</div></div>';
  }
  return (
    '<h2>Platinum Blueprint</h2>' +
    '<p class="count-line">One playthrough, in order. Work the phases top to bottom; Phase 2 holds the only missable trophy.</p>' +
    '<div class="kpi-strip">' +
    '<div class="kpi"><b>1</b><span>Playthrough</span></div>' +
    '<div class="kpi"><b>~200 hrs</b><span>To platinum</span></div>' +
    '<div class="kpi"><b>4/10</b><span>Difficulty</span></div>' +
    '<div class="kpi"><b>1</b><span>Potentially missable</span></div>' +
    '<div class="kpi"><b>0</b><span>Online trophies</span></div>' +
    '</div>' +
    '<div class="phase-grid">' + cards + '</div>'
  );
}

// ---- Missable & Saves ----
export function renderMissable(trophies, earned) {
  const pma = trophies.find((t) => t.isMissable);
  const pmaName = pma ? esc(pma.name) : 'Positive Mental Attitude';
  const pmaDone = pma ? earned.has(pma.id) : false;
  let slots = '';
  for (let i = 1; i <= 15; i++) {
    slots += '<span class="save-slot' + (i === 2 ? ' hot' : '') + '">S' + i + '</span>';
  }
  return (
    '<h2>Missable Alert &amp; Saves</h2>' +
    '<div class="missable-alert"><b>ONE POTENTIALLY MISSABLE TROPHY.</b> ' + pmaName + ' — meditate with Lucia on the balcony at Jason\u2019s house in Chapter 1, right after Down to Earth. 18 spots across 10 locations; 100% needs 15. Miss the balcony and the trophy cannot be earned on that playthrough. Status: <b>' + (pmaDone ? 'EARNED' : 'NOT EARNED YET') + '</b></div>' +
    '<h3>Manual Save Rotation Protocol</h3>' +
    '<p>Rotate all 15 manual save slots before every chapter transition, so a missed step can be rewound without replaying the game.</p>' +
    '<div class="save-grid">' + slots + '</div>' +
    '<ol class="steps">' +
    '<li>Before each chapter transition, save to the next empty slot (Slot 2 is the Chapter 1 safety save — keep it).</li>' +
    '<li>After 15 slots, overwrite the oldest non-Chapter-1 slot first.</li>' +
    '<li>Never rely on autosave alone: autosave overwrites itself at story beats.</li>' +
    '<li>Do not use cheat codes — they block trophy unlocks while active.</li>' +
    '</ol>' +
    '<h3>Character Strand Watchlist</h3>' +
    '<p class="note">Each strand ends in one trophy. Finish every strand\u2019s final mission; none of them is missable, but they only unlock as the story advances.</p>' +
    '<ul class="watch-list">' +
    '<li><b>Andy</b> — Road to Rehabilitation</li>' +
    '<li><b>Kenton</b> — This Was No Boat Accident</li>' +
    '<li><b>Billy</b> — The Lone Rider</li>' +
    '<li><b>Randy</b> — Supply &amp; Demand</li>' +
    '<li><b>Tyrone</b> — Spin On This!</li>' +
    '<li><b>Bret</b> — Fair Game (unique animal hunt)</li>' +
    '</ul>' +
    '<p class="note">No mission replay and no New Game+ carry progress back: a missed Chapter 1 meditation means a new playthrough.</p>'
  );
}

// ---- Reference Index ----
export function renderReference() {
  return (
    '<h2>Reference Index</h2>' +
    '<h3>Methodology</h3>' +
    '<p>Every trophy shows its official PlayStation name, description and grade exactly as published, checked against the starter list shipped with this bounty and cross-verified with the published guides below. Each walkthrough is written in this guide\u2019s own words from those descriptions plus the cited guides; no guide text is copied. Counts (42 ranges, 250 stunts, 14 drone tracks, 100 WAINK spots, 100 vehicles, 52 zones, 9 gangs, 8 garages) come from the official descriptions and the cited guides, and every specific location or step names its source.</p>' +
    '<h3>Source Directory</h3>' +
    '<table class="src-table"><tr><th>Source</th><th>What it covers</th><th>Link</th></tr>' +
    '<tr><td>PSNProfiles</td><td>GTA VI trophy guide &amp; roadmap</td><td><a href="https://psnprofiles.com/guide/grand-theft-auto-vi-trophy-guide" target="_blank" rel="noopener">psnprofiles.com/guide/grand-theft-auto-vi-trophy-guide</a></td></tr>' +
    '<tr><td>PowerPyx</td><td>100% completion &amp; trophy roadmap</td><td><a href="https://www.powerpyx.com/grand-theft-auto-vi-trophy-guide-roadmap/" target="_blank" rel="noopener">powerpyx.com/grand-theft-auto-vi-trophy-guide-roadmap</a></td></tr>' +
    '<tr><td>Exophase</td><td>PS5 trophy list &amp; earn rates</td><td><a href="https://www.exophase.com/game/grand-theft-auto-vi-psn/trophies/" target="_blank" rel="noopener">exophase.com/game/grand-theft-auto-vi-psn/trophies</a></td></tr>' +
    '<tr><td>GTABase</td><td>GTA 6 trophies database</td><td><a href="https://www.gtabase.com/grand-theft-auto-6/trophies/" target="_blank" rel="noopener">gtabase.com/grand-theft-auto-6/trophies</a></td></tr>' +
    '</table>' +
    '<h3>Offline JSON Schema</h3>' +
    '<p class="note">app/data/trophies.json is the whole dataset. The app fetches it once at load; nothing else leaves the device.</p>' +
    '<div class="schema">{\n  "id": 28,                 // official order, 1-55\n  "name": "Positive Mental Attitude",\n  "description": "Meditate at every spot across Leonida.",\n  "grade": "bronze",          // platinum | gold | silver | bronze\n  "guide": "Meditate at all 18 spots.",\n  "category": "missable",     // story | missable | collectibles | activities\n  "isMissable": true,         // only one trophy: true\n  "phase": 2,                 // roadmap phase 1-6\n  "milestoneTag": "Ch. 1 • Post \'Down to Earth\'",\n  "walkthrough": "…own words, 2-4 sentences…",\n  "actionSteps": ["…", "…", "…"],\n  "citations": [{ "name": "…", "url": "…" }]\n}</div>'
  );
}

export function trophySlug(trophy) {
  return slugOf(trophy.name);
}
