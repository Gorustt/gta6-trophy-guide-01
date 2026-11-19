// query.js — instant filtering for the trophy catalog.
// Search matches title, chapter/milestone text and guide words; category,
// tier and "unlocked only" narrow the list. Spoiler shielding is a display
// rule (handled in views.js), not a filter: a redacted trophy still counts.
export const CATEGORIES = ['all', 'story', 'missable', 'collectibles', 'activities', 'online'];
export const TIERS = ['all', 'platinum', 'gold', 'silver', 'bronze'];

export function categoryOf(trophy) {
  if (trophy.isMissable) return 'missable';
  return trophy.category || 'activities';
}

export function matchesQuery(trophy, query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return true;
  const hay = [
    trophy.name,
    trophy.description,
    trophy.guide,
    trophy.walkthrough,
    trophy.milestoneTag,
    'chapter ' + trophy.phase,
    'phase ' + trophy.phase,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}

export function filterTrophies(trophies, state) {
  const { query, category, tier, unlockedOnly, earned } = state;
  return trophies.filter((t) => {
    if (tier && tier !== 'all' && t.grade !== tier) return false;
    if (category && category !== 'all') {
      if (category === 'missable') {
        if (!t.isMissable) return false;
      } else if (category === 'online') {
        return false; // all 55 are offline single-player; the tab shows 0
      } else if (categoryOf(t) !== category) {
        return false;
      }
    }
    if (unlockedOnly && !(earned && earned.has(t.id))) return false;
    return matchesQuery(t, query);
  });
}

export function countByCategory(trophies) {
  const counts = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of trophies) {
    const c = categoryOf(t);
    if (counts[c] !== undefined) counts[c] += 1;
  }
  return counts;
}

export function tierCounts(trophies, earned) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    if (!out[t.grade]) continue;
    out[t.grade][1] += 1;
    if (earned && earned.has(t.id)) out[t.grade][0] += 1;
  }
  return out;
}

export function phaseCounts(trophies, earned) {
  const out = {};
  for (let p = 1; p <= 6; p++) out[p] = [0, 0];
  for (const t of trophies) {
    const p = t.phase || 6;
    if (!out[p]) out[p] = [0, 0];
    out[p][1] += 1;
    if (earned && earned.has(t.id)) out[p][0] += 1;
  }
  return out;
}

export function slugOf(name) {
  return name
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
