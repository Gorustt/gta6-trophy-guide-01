// query.js — pure filtering over the trophy list. No DOM here: given the
// trophies and a query state it returns the visible rows, so the same rules
// drive the catalog, the HUD counts and the screenshots.

export function makeQuery() {
  return {
    text: '',
    category: 'all',
    tier: 'all',
    unlockedOnly: false,
    spoilerShield: false,
  };
}

// A trophy counts as a spoiler when it is a story trophy the player has not
// earned yet. The shield redacts its name, its official description, its
// walkthrough and its milestone tag — the tag alone can leak the chapter.
export function isSpoiler(trophy, earned, query) {
  return Boolean(query.spoilerShield && trophy.category === 'story' && !earned.has(trophy.id));
}

function haystack(trophy) {
  return [
    trophy.name,
    trophy.description,
    trophy.guide,
    trophy.walkthrough || '',
    trophy.milestoneTag || '',
    'phase ' + trophy.phase,
    trophy.category,
  ]
    .join(' ')
    .toLowerCase();
}

export function filterTrophies(trophies, earned, query) {
  const needle = query.text.trim().toLowerCase();
  return trophies.filter((t) => {
    if (query.category !== 'all' && t.category !== query.category) return false;
    if (query.tier !== 'all' && t.grade !== query.tier) return false;
    if (query.unlockedOnly && !earned.has(t.id)) return false;
    if (needle && !haystack(t).includes(needle)) return false;
    return true;
  });
}

export function countByTier(trophies, earned) {
  const out = { platinum: [0, 0], gold: [0, 0], silver: [0, 0], bronze: [0, 0] };
  for (const t of trophies) {
    out[t.grade][1] += 1;
    if (earned.has(t.id)) out[t.grade][0] += 1;
  }
  return out;
}

export function countByPhase(trophies, earned) {
  const out = {};
  for (const t of trophies) {
    if (!out[t.phase]) out[t.phase] = [0, 0];
    out[t.phase][1] += 1;
    if (earned.has(t.id)) out[t.phase][0] += 1;
  }
  return out;
}

export function countByCategory(trophies) {
  const out = { all: trophies.length, story: 0, missable: 0, collectibles: 0, activities: 0, online: 0 };
  for (const t of trophies) {
    if (out[t.category] !== undefined) out[t.category] += 1;
  }
  return out;
}
