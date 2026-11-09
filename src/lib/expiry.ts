import type { GamesPayload } from "./types";

/** Drops giveaways whose end date has passed (also applied when serving, between update runs). */
export function withoutExpired(payload: GamesPayload, now = Date.now()): GamesPayload {
  return { ...payload, games: payload.games.filter((g) => !g.endDate || new Date(g.endDate).getTime() > now) };
}
