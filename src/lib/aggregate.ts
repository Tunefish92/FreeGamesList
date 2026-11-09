import type { SourceRow } from "./db";
import { withoutExpired } from "./expiry";
import { safeUrl } from "./safeUrl";
import type { Lang } from "./i18n";
import { titleKey } from "./normalize";
import type { Region } from "./regions";
import { fetchCheapShark } from "./sources/cheapshark";
import { CURATED } from "./sources/curated";
import { fetchEpic } from "./sources/epic";
import { fetchFreeToGame } from "./sources/freetogame";
import { fetchGog, fetchGogGiveaway } from "./sources/gog";
import { fetchSteamFreeDlc, fetchSteamFreeToPlay, fetchSteamGiveaways } from "./sources/steam";
import type { Game, GamesPayload, SourceStatus } from "./types";

export interface SourceDef {
  id: string;
  /** "global" sources are fetched once per run, "regional" once per region + language. */
  scope: "global" | "regional";
  fetch: (region: Region, lang: Lang) => Promise<Game[]>;
}

export const SOURCES: SourceDef[] = [
  { id: "epic", scope: "regional", fetch: (r, l) => fetchEpic(r.code, l) },
  { id: "steam", scope: "regional", fetch: (r, l) => fetchSteamGiveaways(r.code, r.currency, l) },
  { id: "steam-f2p", scope: "regional", fetch: (r, l) => fetchSteamFreeToPlay(r.code, l) },
  { id: "steam-dlc", scope: "regional", fetch: (r, l) => fetchSteamFreeDlc(r.code, l) },
  { id: "gog", scope: "regional", fetch: (r, l) => fetchGog(r.code, r.currency, l) },
  { id: "gog-giveaway", scope: "regional", fetch: (r, l) => fetchGogGiveaway(r.code, r.currency, l) },
  { id: "freetogame", scope: "global", fetch: () => fetchFreeToGame() },
  { id: "cheapshark", scope: "global", fetch: () => fetchCheapShark() },
];

/** When the same giveaway appears in several sources, the first one here wins (store APIs have regional prices). */
const SOURCE_RANK = ["epic", "steam", "gog-giveaway", "gog", "cheapshark", "freetogame"];

function rank(g: Game): number {
  return SOURCE_RANK.indexOf(g.sources[0]);
}

function merge(primary: Game, other: Game): Game {
  return {
    ...primary,
    genres: primary.genres[0] === "other" ? other.genres : primary.genres,
    devices: [...new Set([...primary.devices, ...other.devices])],
    modes: primary.modes.length ? primary.modes : other.modes,
    description: primary.description ?? other.description,
    endDate: primary.endDate ?? other.endDate,
    worthUsd: primary.worthUsd ?? other.worthUsd,
    popularity: Math.max(primary.popularity, other.popularity),
    sources: [...new Set([...primary.sources, ...other.sources])],
  };
}

function dedupe(games: Game[], keyOf: (g: Game) => string): Game[] {
  const byKey = new Map<string, Game>();
  for (const g of [...games].sort((a, b) => rank(a) - rank(b))) {
    const key = keyOf(g);
    const existing = byKey.get(key);
    byKey.set(key, existing ? merge(existing, g) : g);
  }
  return [...byKey.values()];
}

function applyCurated(g: Game): Game {
  const hit = CURATED[titleKey(g.title)];
  return hit
    ? { ...g, store: hit.store, storeLabel: undefined, url: hit.url, devices: [...new Set([...g.devices, ...hit.devices])] }
    : g;
}

/** Merges the stored per-source results of one region/language into the payload the website serves. */
export function buildPayload(rows: SourceRow[], region: Region): GamesPayload {
  const all = rows
    .flatMap((r) => r.games)
    .map((g) => ({ ...g, url: safeUrl(g.url) ?? "", image: safeUrl(g.image) ?? "", imageFallback: safeUrl(g.imageFallback) }))
    .filter((g) => g.url !== "");
  const sources: SourceStatus[] = SOURCES.map((def) => {
    const row = rows.find((r) => r.source === def.id);
    return {
      id: def.id,
      ok: !!row && !row.lastError,
      count: row?.games.length ?? 0,
      error: row?.lastError ?? undefined,
      fetchedAt: row?.fetchedAt ?? undefined,
    };
  });

  // Giveaways: same title on the same store is the same offer.
  const giveaways = dedupe(
    all.filter((g) => g.offer === "giveaway"),
    (g) => `${g.store}:${g.kind}:${titleKey(g.title)}`,
  );
  // F2P: a game is a game regardless of where it was listed; curated launcher info wins afterwards.
  const f2p = dedupe(
    all.filter((g) => g.offer === "f2p"),
    (g) => `${g.kind}:${titleKey(g.title)}`,
  ).map(applyCurated);

  return withoutExpired({
    games: [...giveaways, ...f2p],
    sources,
    country: region.code,
    currency: region.currency,
    updatedAt: new Date().toISOString(),
  });
}
