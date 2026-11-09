import { getSnapshot } from "./db";
import { withoutExpired } from "./expiry";
import type { Lang } from "./i18n";
import { DEFAULT_REGION, getRegion } from "./regions";
import type { GamesPayload } from "./types";

/**
 * What the website serves: the worker's stored snapshot for this region/language,
 * falling back to the default region. Never calls an external API.
 */
export function loadGames(country: string | undefined, lang: Lang): GamesPayload | null {
  const code = getRegion(country)?.code ?? DEFAULT_REGION;
  const snapshot = getSnapshot(code, lang) ?? getSnapshot(DEFAULT_REGION, lang);
  return snapshot ? withoutExpired(snapshot) : null;
}
