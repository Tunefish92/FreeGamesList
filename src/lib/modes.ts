import type { GenreKey } from "./genres";
import type { Offer } from "./types";

export const MODES = {
  single: { de: "Einzelspieler", en: "Singleplayer" },
  multi: { de: "Mehrspieler", en: "Multiplayer" },
  coop: { de: "Koop", en: "Co-op" },
  online: { de: "Online", en: "Online" },
  offline: { de: "Offline spielbar", en: "Playable offline" },
} as const;

export type Mode = keyof typeof MODES;

export const MODE_KEYS = Object.keys(MODES) as Mode[];

interface Flags {
  single?: boolean;
  multi?: boolean;
  coop?: boolean;
  online?: boolean;
  local?: boolean;
}

/**
 * No store reports "needs internet". Heuristic: Free-to-Play and MMOs are online,
 * paid/DRM-free singleplayer games (giveaways, GOG freebies) are playable offline.
 */
function finish(f: Flags, offer: Offer, genres: GenreKey[], drmFree = false): Mode[] {
  const onlineOnly = genres.includes("mmo") || genres.includes("moba") || genres.includes("battle-royale");
  const online = f.online || onlineOnly || (offer === "f2p" && !drmFree);
  const offline = !onlineOnly && (f.local || (f.single && (offer === "giveaway" || drmFree)));
  const modes: Mode[] = [];
  if (f.single) modes.push("single");
  if (f.multi || onlineOnly) modes.push("multi");
  if (f.coop) modes.push("coop");
  if (online) modes.push("online");
  if (offline) modes.push("offline");
  return modes;
}

/** Steam "supported player" category IDs. */
export function modesFromSteam(ids: number[], offer: Offer, genres: GenreKey[]): Mode[] {
  const has = (...xs: number[]) => xs.some((x) => ids.includes(x));
  return finish(
    {
      single: has(2),
      multi: has(1, 49, 36, 47, 37, 27),
      coop: has(9, 38, 39, 48),
      online: has(36, 38, 20),
      local: has(24, 37, 39, 47, 48),
    },
    offer,
    genres,
  );
}

/** GOG feature slugs ("single", "multi", "coop", …). GOG games are DRM-free. */
export function modesFromGog(slugs: string[], offer: Offer, genres: GenreKey[]): Mode[] {
  return finish(
    {
      single: slugs.includes("single"),
      multi: slugs.some((s) => s.includes("multi")),
      coop: slugs.some((s) => s.includes("coop")),
      online: slugs.some((s) => s.includes("online")),
    },
    offer,
    genres,
    true,
  );
}

/** Fallback for sources without metadata: look for keywords in the description. */
export function modesFromText(text: string, offer: Offer, genres: GenreKey[]): Mode[] {
  return finish(
    {
      single: /single[- ]?player|einzelspieler|solo|story/i.test(text),
      multi: /multi[- ]?player|mehrspieler|pvp|versus|massively/i.test(text),
      coop: /co-?op|koop|cooperative|kooperativ/i.test(text),
      online: /online|mmo/i.test(text),
      local: /local|couch|split[- ]?screen/i.test(text),
    },
    offer,
    genres,
  );
}
