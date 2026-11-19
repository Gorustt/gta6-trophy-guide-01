// store.js — localStorage persistence for earned trophies, with validated
// JSON export / import and a reset. The store holds trophy ids only; every
// other fact lives in app/data/trophies.json.
export const STORAGE_KEY = 'vice-platinum-tracker-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x) => Number.isInteger(x)));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

// Validate an imported payload: it must be a JSON array of integer ids,
// each one naming a trophy in the official list. Returns a Set or null.
export function parseImport(text, validIds) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const out = new Set();
  for (const x of parsed) {
    if (!Number.isInteger(x) || !validIds.has(x)) return null;
    out.add(x);
  }
  return out;
}

export function exportEarned(earned) {
  const blob = new Blob([JSON.stringify([...earned].sort((a, b) => a - b), null, 2)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vice-platinum-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

export function resetEarned() {
  localStorage.removeItem(STORAGE_KEY);
  return new Set();
}
