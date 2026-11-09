@AGENTS.md

# FreeGamesList

List of all free PC games (giveaways, free-to-play, free DLC) from Steam, Epic, GOG and more.
Public repo Tunefish92/FreeGamesList, hosted on GitHub Pages; no server, no Docker.

## Stack and layout

- Next.js 16 static export (`output: "export"` → `out/`), React 19, Tailwind 4, TypeScript
- `src/worker/` – the only code that calls the store APIs: fetches, stores per-source results and
  finished lists in SQLite (`node:sqlite`, `data/freegames.db`), then exports every list to
  `public/data/<CC>-<lang>.json` + `status.json` (`export.ts`)
- `src/components/GamesApp.tsx` – picks region/language in the browser (?cc= / ?lang=, else
  `navigator.languages`) and fetches the matching JSON; the HTML is the same for everyone
- `src/lib/sources/` – one fetcher per store
- `.github/workflows/publish.yml` – every 6 h (00/06/12/18 UTC) + push to main + manual: restore the database
  from the Actions cache, run the worker, build, deploy to Pages

## Commands

```bash
npm run update                   # fetch all stores, write public/data (1–2 min, real network)
npm run update -- --if-stale     # only when the last good update is > 5 h old
npm run dev                      # http://localhost:3000, reads public/data
PAGES_BASE_PATH=/FreeGamesList npm run build   # static site in out/, as on github.io
```

`node_modules/.bin/*` are broken copies in this checkout (`Cannot find module '../lib/tsc.js'`):
call tools directly, e.g. `node node_modules/typescript/bin/tsc --noEmit -p .`,
`node node_modules/eslint/bin/eslint.js`, `node node_modules/next/dist/bin/next build`.
After deleting a route, `rm -rf .next` (stale generated types break `tsc`).

## Rules

- No server features: no API routes, `headers()`, cookies, server actions, rewrites or `next/image`
  optimisation; everything dynamic happens in the browser. Security headers can't be set on
  Pages; the CSP is a `<meta>` tag in `layout.tsx`.
- Every path the code builds by hand (fetch, `<img src>`) gets `BASE_PATH` from `src/lib/basePath.ts`:
  the site lives under `/FreeGamesList` on github.io and at `/` on a custom domain
  (`actions/configure-pages` → `PAGES_BASE_PATH` → `basePath`). Test builds with
  `PAGES_BASE_PATH=/FreeGamesList` and serve `out/` under that prefix.
- The browser drops ended giveaways itself (`withoutExpired` in `GamesApp`): lists are up to a day old.
- UI text only through `src/lib/i18n.ts` (`de` and `en`; `en` is typed `typeof de`, keys must match).
- The footer's transparency note (`footer.note`: hobby project, no money, no tracking, GitHub Pages
  and store servers see the IP, CheapShark redirect, AI, voluntary PayPal tip at paypal.me/tunefish92)
  must stay true: when the site starts storing something in the browser, loading from a new outside
  server, showing ads or adding affiliate links, update the note in both languages and the README's
  Privacy section in the same change. The footer's author link opens the repo (the user's wish).
- New worker setting: read it with a default in the worker, add it to the workflow's `env:` only if
  it differs from the default, and to the README settings table.
- Screenshots/visual checks: Chromium in `~/.cache/ms-playwright/chromium-1254/chrome-linux64/chrome`
  (`--headless=new --virtual-time-budget=15000 --dump-dom|--screenshot`, `--lang=de-AT` for the
  region guess); the mobile_audit script captures the spinner before the list arrives.

## Memory

- Open work: `docs/todo.md`. Lasting rules: this file. Corrections and decisions: auto memory.
- After every task: run `/memory-update`.
