import { genresFromFreeToGame } from "../genres";
import { cached, fetchJson } from "../http";
import { modesFromText } from "../modes";
import { clip } from "../normalize";
import type { Game } from "../types";

interface FtgGame {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  publisher: string;
  developer: string;
  release_date: string;
}

export function fetchFreeToGame(): Promise<Game[]> {
  return cached("freetogame", 12 * 60 * 60_000, async () => {
    const list = await fetchJson<FtgGame[]>("https://www.freetogame.com/api/games?platform=pc&sort-by=popularity");
    return list.map((g, rank): Game => {
      const genres = genresFromFreeToGame(g.genre);
      return {
        id: `ftg-${g.id}`,
        title: g.title.trim(),
        store: "other",
        storeLabel: g.publisher || g.developer,
        offer: "f2p",
        kind: "game",
        genres,
        // FreeToGame lists online multiplayer F2P games; the description sometimes reveals more.
        modes: modesFromText(`${g.short_description} online multiplayer`, "f2p", genres),
        devices: ["windows"],
        image: g.thumbnail,
        description: clip(g.short_description),
        url: g.game_url,
        publisher: g.publisher,
        // ~350 entries vs. Steam's 1000: stretch the rank so both lists share one scale.
        popularity: 10_000 - rank * 3,
        sources: ["freetogame"],
      };
    });
  });
}
