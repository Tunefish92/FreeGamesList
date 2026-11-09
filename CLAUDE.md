@AGENTS.md

# FreeGamesList

List of all free games (giveaways and free-to-play) from Steam, Epic, GOG and more, at
freegames.tunefishservers.net (behind the user's Cloudflare Tunnel). No GitHub repo yet.

## Stack and layout

- Next.js 16 (standalone output), React 19, Tailwind 4, TypeScript; SQLite via `node:sqlite`
- One image, two roles: `node server.js` (website, only reads the database) and `node worker.mjs`
  (cron worker, the only process calling the store APIs and writing `/data/freegames.db`)
- `src/lib/sources/` – one fetcher per store; `src/worker/` – update run with retries
- `unraid/` – private Unraid install (see below)

## Commands

```bash
npm run dev                    # website :3000 (reads ./data/freegames.db)
npm run update                 # one worker run now (fills ./data)
npm run lint
docker compose up -d --build   # web + worker
bash unraid/build-local.sh     # build the Unraid bundle into the share
```

`node_modules/.bin/*` are broken copies in this checkout (`Cannot find module '../lib/tsc.js'`):
call tools directly, e.g. `node node_modules/typescript/bin/tsc --noEmit -p .`,
`node node_modules/eslint/bin/eslint.js src`, `node node_modules/next/dist/bin/next build`.

## Rules

- UI text only through `src/lib/i18n.ts` (`de` and `en`; `en` is typed `typeof de`, keys must match).
- The footer's transparency note (`footer.note`: hobby project, no money, no tracking, outside
  requests, AI, voluntary PayPal tip at paypal.me/tunefish92) must stay true: when the site starts
  storing something in the browser, loading from a new outside server, showing ads, or adding
  affiliate links, update the note in both languages in the same change.

## Private Unraid install (current deployment)

Same procedure as Beichtstuhl: the user's Unraid (10.0.0.10) runs a locally built image, site on
port 8092, containers `freegameslist` + `freegameslist-worker`, data in
`/mnt/user/appdata/freegameslist`. `bash unraid/build-local.sh` builds `freegameslist:local`, saves
it as `freegameslist-image.tar.gz` and copies it with `unraid/install-local.sh` and
`install-local.README.txt` (as `install.sh`/`README.txt`) to
`/mnt/filesharing/unraid-share/freegameslist/` (its own subfolder: the share root belongs to
Beichtstuhl). The user runs `install.sh` there (install, update with backup + data check +
automatic rollback, `rollback`).

- Both containers run `--user 99:100`, read-only, `--cap-drop ALL`; `install.sh` sets the data
  folder's owner through a throwaway root container. Don't add a root entrypoint with
  chown/setpriv: it needs the capabilities this image drops.
- Never test `install.sh` locally with the real names: sed `SITE`/`WORKER`/`IMAGE`/`TARBALL` to
  `fgltest`, use a scratch `DATA`/`BACKUPS` and another `PORT`. `/boot/config/ident.cfg` only
  exists on Unraid; everything reading it must tolerate its absence (`set -o pipefail`).
- New settings for the worker or site: add them to `create_containers` in `install-local.sh`, the
  README.txt "Settings" block and `docker-compose.yml`.

## Memory

- Open work: `docs/todo.md`. Lasting rules: this file. Corrections and decisions: auto memory.
- After every task: run `/memory-update`.
