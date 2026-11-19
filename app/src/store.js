// store.js — persistence for the Vice City Platinum Tracker.
// Progress is a Set of earned trophy ids, saved in localStorage as JSON.
// Export / import are validated: only ids 1..55 survive, anything else is dropped.
const STORAGE_KEY = 'vc-platinum-tracker-v1';

export function loadEarned() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55));
  } catch {
    return new Set();
  }
}

export function saveEarned(earned) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
  } catch {
    // Storage full or blocked (private mode): progress stays in memory only.
  }
}

export function clearEarned() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function exportProgress(earned) {
  return JSON.stringify(
    { app: 'vice-city-platinum-tracker', version: 1, earned: [...earned].sort((a, b) => a - b) },
    null,
    2
  );
}

export function importProgress(text) {
  const parsed = JSON.parse(text);
  const list = Array.isArray(parsed) ? parsed : parsed && parsed.earned;
  if (!Array.isArray(list)) throw new Error('Not a tracker export: expected an array of trophy ids.');
  const ids = list.filter((n) => Number.isInteger(n) && n >= 1 && n <= 55);
  if (ids.length === 0 && list.length > 0) throw new Error('No valid trophy ids (1-55) found in the file.');
  return new Set(ids);
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
