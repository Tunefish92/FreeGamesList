# Open items, newest last

## 1. Host FreeGamesList on GitHub instead of Unraid

**Status:** built and tested locally on `main` (not pushed) · **Reported:** 2026-11-09

> Change everything in a way, it works on github, like its doing now.
> this is my repo: https://github.com/Tunefish92/FreeGamesList

The private Unraid install (Docker, `unraid/install-local.sh`) was dropped before it was ever run
on the server; the bundle in `/mnt/filesharing/unraid-share/freegameslist/` is obsolete.

**Plan**
- [x] Worker exports `public/data/<CC>-<lang>.json` + `status.json`, `--if-stale` for pushes
- [x] Static export, region/language chosen in the browser, CSP as meta tag, `BASE_PATH`
- [x] Workflow `publish.yml`: Actions cache for the database, worker, build, deploy to Pages
- [x] Tested locally: full update (30/30 lists), skip when fresh, build under `/FreeGamesList`,
      German/Austria and US/English guesses, fallback to "list is being built", actionlint clean
- [ ] Push to GitHub, Settings → Pages → Source: GitHub Actions
- [ ] First workflow run: do the store APIs answer GitHub's runners (Steam, Epic, GOG)?
- [ ] Second run (push) restores the database from the cache and skips fetching
- [ ] Custom domain (freegameslist. or freegames.tunefishservers.net): Cloudflare CNAME →
      tunefish92.github.io (DNS only), Pages custom domain, Enforce HTTPS, run the workflow again
- [ ] Delete the obsolete Unraid bundle from the share

**Done when** the site loads at its address with today's lists, and the next day's scheduled run
is green.
