// Vice City Platinum Tracker — gta6-trophy-guide-01 build entrypoint.
//
// The guide is a plain static site: app/index.html with its CSS, JS modules
// and app/data/trophies.json — all 55 official PS5 trophies, each with its
// official name, description and grade, an original walkthrough, numbered
// steps and cited sources, plus a 6-phase roadmap to the platinum, one
// flagged missable trophy, search and filters, and a spoiler shield. It runs
// entirely offline: no network at runtime, no build step, no external fonts
// or images, and progress is kept in the browser's localStorage.
//
// This file hands the entry in. It copies app/ and screenshots/ from beside
// this file into the output directory and writes output/dossier.json with the
// vendored make.fun library (vendor/makefun-frontend.ts). The dossier is
// what the judge reads: the screenshots, the first-load files and bytes, and
// the source listing. The build is deterministic: the same files in produce
// the same dossier out, byte for byte, on every run. Leave
// vendor/makefun-frontend.ts untouched — the scorer requires dossier.json to
// be byte for byte what its own copy of the library writes.
//
// Run it outside the grader's container with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail fast, before anything is copied: the entry is only submittable when
// the trophy data and the screenshots already satisfy the competition's own
// rules. A build that silently produced a dossier the scorer would refuse
// wastes a submission slot, so these checks throw with the exact reason.
// Every check is deterministic — no clock, no randomness — so a passing
// build stays byte-identical across runs.
const MAX_SCREENSHOT_BYTES = 262144;
const data = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
if (!Array.isArray(data.trophies) || data.trophies.length !== 55) {
  throw new Error(`trophies.json must list exactly 55 trophies, found ${Array.isArray(data.trophies) ? data.trophies.length : 'no array'}`);
}
const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
for (const t of data.trophies) {
  if (!(t.grade in grades)) throw new Error(`trophy ${t.id} has unknown grade ${JSON.stringify(t.grade)}`);
  grades[t.grade] += 1;
}
if (grades.platinum !== 1 || grades.gold !== 2 || grades.silver !== 6 || grades.bronze !== 46) {
  throw new Error(`grade split must be 1P/2G/6S/46B, found ${grades.platinum}P/${grades.gold}G/${grades.silver}S/${grades.bronze}B`);
}
const missables = data.trophies.filter((t) => t.isMissable === true);
if (missables.length !== 1 || missables[0].id !== 28) {
  throw new Error(`exactly one missable trophy expected (id 28), found ${missables.map((t) => t.id).join(',') || 'none'}`);
}
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((f) => statSync(join(shotsDir, f)).isFile()) : [];
if (shots.length === 0 || shots.length > 4) {
  throw new Error(`screenshots/ must hold 1-4 files, found ${shots.length}`);
}
for (const f of shots) {
  const size = statSync(join(shotsDir, f)).size;
  if (size > MAX_SCREENSHOT_BYTES) throw new Error(`screenshot ${f} is ${size} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse — more than 4
// screenshots or one over 256 KiB, more than 993 files and directories in
// app/, or more than 48 MiB of app files (app/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
