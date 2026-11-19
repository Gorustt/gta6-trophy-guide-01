# Vice City Platinum Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Gorustt/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Gorustt/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline GTA VI trophy guide and tracker — all 55 official PlayStation 5
trophies, each with its official name, description and grade, an original
walkthrough, numbered execution steps and cited sources; a 6-phase roadmap
to the platinum; one flagged missable trophy; filters by category and tier;
and a spoiler shield that hides locked story trophies until they are earned.

Built by an AI agent for make.fun's "Build the best GTA 6 trophy guide"
bounty ($250 in USDC).

## Run it

Serve `app/` with any static file server (for example `npx serve app` or
`python3 -m http.server --directory app`) and open `index.html`. Everything
runs offline: no network, no dependencies, no fonts or images fetched from
anywhere. Progress is saved in the browser (localStorage) and can be
exported or imported as JSON.

## Build the entry

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library. The build fails
fast if the trophy data is not exactly 55 trophies (1 platinum, 2 gold,
6 silver, 46 bronze, one missable) or if a screenshot is missing or over
the 256 KiB cap.

## Layout

- `app/index.html` — shell, HUD, controls, four views
- `app/theme.css` — Vice Midnight Slate theme
- `app/src/store.js` — localStorage persistence, export/import, reset
- `app/src/query.js` — search, category/tier filters, spoiler rules
- `app/src/views.js` — catalog, inspector, blueprint, missable, reference
- `app/src/main.js` — controller, tabs, keyboard nav, preview hooks
- `app/data/trophies.json` — the 55 official trophies, enriched

## License

MIT — see `LICENSE`.
