import { cached, fetchJson } from "../http";
import type { StoreKey } from "../stores";
import type { Game } from "../types";

interface Deal {
  title: string;
  dealID: string;
  storeID: string;
  gameID: string;
  normalPrice: string;
  salePrice: string;
  steamAppID: string | null;
  thumb: string;
  steamRatingPercent: string;
}

interface CsStore {
  storeID: string;
  storeName: string;
  isActive: number;
}

/** Steam, GOG and Epic come straight from their own APIs with regional prices. */
const SKIP = new Set(["1", "7", "25"]);

const STORE_MAP: Record<string, StoreKey> = {
  "11": "humble",
  "13": "ubisoft",
  "15": "fanatical",
  "30": "indiegala",
};

export function fetchCheapShark(): Promise<Game[]> {
  return cached("cheapshark", 30 * 60_000, async () => {
    const [deals, stores] = await Promise.all([
      fetchJson<Deal[]>("https://www.cheapshark.com/api/1.0/deals?upperPrice=0&pageSize=60"),
      cached("cheapshark-stores", 24 * 60 * 60_000, () =>
        fetchJson<CsStore[]>("https://www.cheapshark.com/api/1.0/stores"),
      ),
    ]);
    const storeNames = new Map(stores.map((s) => [s.storeID, s.storeName]));

    return deals
      .filter((d) => Number(d.salePrice) === 0 && Number(d.normalPrice) > 0 && !SKIP.has(d.storeID))
      .map((d): Game => {
        const store = STORE_MAP[d.storeID] ?? "other";
        return {
          id: `cs-${d.dealID}`,
          title: d.title,
          store,
          storeLabel: store === "other" ? storeNames.get(d.storeID) : undefined,
          offer: "giveaway",
          kind: "game",
          genres: ["other"],
          devices: ["windows"],
          modes: [],
          image: d.steamAppID
            ? `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${d.steamAppID}/header.jpg`
            : d.thumb,
          imageFallback: d.thumb,
          url: `https://www.cheapshark.com/redirect?dealID=${encodeURIComponent(d.dealID)}`,
          worthUsd: Number(d.normalPrice),
          popularity: Number(d.steamRatingPercent) || 0,
          sources: ["cheapshark"],
        };
      });
  });
}
