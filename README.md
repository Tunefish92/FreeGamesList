# FreeGamesList

[![Buy me a coffee](https://img.shields.io/badge/Buy_me_a_coffee-PayPal-0070ba?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/tunefish92)

Every free PC game in one list: current giveaways you can keep, free-to-play games and free DLC
from Steam, Epic Games, GOG and more, for 15 regions in German and English.

**➜ [freegames.tunefishservers.net](https://freegames.tunefishservers.net/)**

## What it shows

- **Free to keep**: games that cost nothing for a limited time (Epic's weekly games, Steam −100 %
  deals, GOG giveaways), with the normal price and a countdown until the offer ends
- **Coming soon**: giveaways that are already announced
- **Free-to-play** games and **free DLC**, grouped by genre
- Search by title, publisher or store, filters for store, device (Windows, macOS, Linux,
  consoles, phones) and game mode (single player, multiplayer, co-op, online, playable offline),
  sorting by ending soon, popularity, value or name
- Prices in your region's currency: Germany, Austria, Switzerland, France, Italy, Spain, the
  Netherlands, Belgium, Poland, Sweden, the UK, the US, Canada, Australia and Brazil
- German and English, light and dark mode

The site picks region and language from your browser's language; the switches at the top change
them.

## How it works

There is no server. Everything runs on GitHub:

1. Every 6 hours (00:00, 06:00, 12:00 and 18:00 German time) the
   [Update and publish](.github/workflows/publish.yml) workflow fetches
   the stores' public data: Epic Games Store, Steam, GOG, FreeToGame and CheapShark. A store that
   fails is retried 3 times, 10 minutes apart; if it still fails, the list keeps that store's
   last good data.
2. It builds one finished list per region and language (`data/DE-de.json`, `data/US-en.json`, …)
   and a `data/status.json` with the time of the last update and any store that failed.
3. It builds the website as static files and publishes it with the lists on GitHub Pages. Your
   browser loads the page and the one list it needs.

Between runs, the fetched data is kept in the workflow's cache. If the cache is gone, the next run
fetches everything again. A push to `main` publishes site changes right away with the stored
lists; **Actions → Update and publish → Run workflow** fetches everything now.

When a run fails or a store still fails after the retries, the run turns red and GitHub emails
you; the site keeps showing the last good lists.

## Run your own copy

1. Fork this repository.
2. **Settings → Pages → Build and deployment → Source:** choose **GitHub Actions**.
3. **Actions** tab: enable workflows for the fork, then **Update and publish → Run workflow**.
   The first run takes 2–3 minutes; the site is then at `https://<your-name>.github.io/FreeGamesList/`.

**Your own domain:** add a `CNAME` record for it at your DNS provider pointing to
`<your-name>.github.io`, then enter the domain under **Settings → Pages → Custom domain**, wait
for the certificate and tick **Enforce HTTPS**. Run the workflow once more afterwards, so the site
is built for the domain's root instead of `/FreeGamesList`. With Cloudflare, keep the record on
**DNS only** (grey cloud) until GitHub has issued the certificate.

**Settings** are environment variables in the workflow's `env:` block:

| Variable | Default | What it does |
|---|---|---|
| `UPDATE_REGIONS` | all 15 | Only these regions, e.g. `DE,AT,CH` |
| `RETRY_ATTEMPTS` | `3` | How often a failed store is retried |
| `RETRY_DELAY_MIN` | `10` | Minutes between retries |
| `STEAM_FREE_LIMIT` | `1000` | How many Steam free-to-play games to fetch |
| `STEAM_DLC_LIMIT` | `200` | How many free Steam DLC to fetch |
| `MIN_GAMES` | `100` | A list with fewer games is treated as broken and not replaced |
| `STALE_AFTER_H` | `5` | A push fetches the stores only when the last good update is older than this |

The run times are the `cron` line in the workflow, in the time zone of the `timezone` line below it.
GitHub often starts scheduled runs a few minutes late, most of all at the full hour.

GitHub switches off scheduled workflows in a repository that had no commit for 60 days. It emails
you before that; **Actions → Update and publish → Enable workflow** turns it back on.

## Develop

Needs Node.js 24 or newer (the worker uses the built-in `node:sqlite`).

```bash
npm install
npm run update   # fetches all stores into data/freegames.db and writes public/data (1–2 minutes)
npm run dev      # http://localhost:3000
npm run lint
npm run build    # static site in out/
```

`npm run update -- --if-stale` skips fetching when the last good update is less than 5 hours old.

## Privacy

No ads, no affiliate links, no cookies, no analytics. The site only saves your light/dark choice
in your own browser. GitHub Pages hosts the site, and game pictures load straight from the stores'
servers, so both see your IP address. Deals from CheapShark open through CheapShark's own redirect
link.

## A note about this project

I'm a hobby programmer with an interest in coding and software development. I can read and write
code, but for this project, I used Claude AI as a development assistant to help me turn my ideas
into a working project.

I believe AI is a useful tool for learning, experimenting, and bringing ideas to life. I want to be
transparent about how this project was created and acknowledge the role AI played in its
development.

## Buy me a coffee

FreeGamesList is free, without ads, and it will stay that way. If it helped you grab a game and
you'd like to say thanks, you can buy me a coffee:

**☕ [paypal.me/tunefish92](https://paypal.me/tunefish92)**

It's entirely voluntary and a thank-you only: it doesn't buy features or priority, and the site
stays the same for everyone. Please don't send money as "Friends and Family" on PayPal.

Not affiliated with any of the stores listed. All trademarks belong to their respective owners.
