import type { Device } from "./devices";
import type { GenreKey } from "./genres";
import type { Mode } from "./modes";
import type { StoreKey } from "./stores";

export type Offer = "giveaway" | "f2p";
export type Kind = "game" | "dlc" | "loot";

export interface Price {
  /** Original (non-discounted) price in major units, e.g. 19.99 */
  amount: number;
  currency: string;
}

export interface Game {
  id: string;
  title: string;
  store: StoreKey;
  /** Display name when store is "other" (e.g. publisher or shop name) */
  storeLabel?: string;
  offer: Offer;
  kind: Kind;
  genres: GenreKey[];
  /** Operating systems / consoles the game runs on */
  devices: Device[];
  /** Singleplayer / multiplayer / co-op / online / offline (partly heuristic) */
  modes: Mode[];
  image: string;
  imageFallback?: string;
  description?: string;
  url: string;
  /** Regional original price (store-provided) */
  price?: Price;
  /** Fallback value estimate in USD when no regional price is known */
  worthUsd?: number;
  startDate?: string;
  endDate?: string;
  upcoming?: boolean;
  publisher?: string;
  /** Higher = more popular. Only comparable within the same offer type. */
  popularity: number;
  sources: string[];
}

export interface SourceStatus {
  id: string;
  ok: boolean;
  count: number;
  error?: string;
  /** Time of the last successful fetch of this source */
  fetchedAt?: string;
}

export interface GamesPayload {
  games: Game[];
  sources: SourceStatus[];
  country: string;
  currency: string;
  updatedAt: string;
}
