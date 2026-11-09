import type { Device } from "../devices";
import { genresFromSteamTags } from "../genres";
import { cached, chunk, fetchJson } from "../http";
import { modesFromSteam } from "../modes";
import { clip } from "../normalize";
import type { Game } from "../types";
import type { Lang } from "../i18n";

interface SearchResponse {
  results_html: string;
  total_count: number;
}

interface StoreItem {
  appid?: number;
  success: number;
  visible?: boolean;
  name?: string;
  type?: number; // 0 = game, 4 = DLC
  is_free?: boolean;
  store_url_path?: string;
  tagids?: number[];
  platforms?: { windows?: boolean; mac?: boolean; steamos_linux?: boolean };
  categories?: { supported_player_categoryids?: number[] };
  basic_info?: { short_description?: string; publishers?: { name: string }[] };
  assets?: { asset_url_format: string; header?: string; main_capsule?: string; small_capsule?: string };
  best_purchase_option?: {
    original_price_in_cents?: string;
    final_price_in_cents?: string;
    discount_pct?: number;
    is_free_to_keep?: boolean;
    free_to_keep_ends?: number;
  };
}

interface GetItemsResponse {
  response: { store_items?: StoreItem[] };
}

const STEAM_LANG: Record<Lang, string> = { de: "german", en: "english" };
const ASSET_BASE = "https://shared.fastly.steamstatic.com/store_item_assets/";

async function searchAppIds(params: string, country: string, pages: number): Promise<number[]> {
  const ids: number[] = [];
  for (let page = 0; page < pages; page++) {
    const url = `https://store.steampowered.com/search/results/?${params}&infinite=1&cc=${country}&count=100&start=${page * 100}`;
    const json = await fetchJson<SearchResponse>(url);
    for (const m of json.results_html.matchAll(/data-ds-appid="(\d+)"/g)) ids.push(Number(m[1]));
    if (ids.length >= json.total_count) break;
  }
  return [...new Set(ids)];
}

async function getItems(appIds: number[], country: string, lang: Lang): Promise<StoreItem[]> {
  const batches = await Promise.all(
    chunk(appIds, 50).map((ids) => {
      const input = {
        ids: ids.map((appid) => ({ appid })),
        context: { language: STEAM_LANG[lang], country_code: country },
        data_request: { include_assets: true, include_basic_info: true, include_tag_count: 8, include_platforms: true },
      };
      const url = `https://api.steampowered.com/IStoreBrowseService/GetItems/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`;
      return fetchJson<GetItemsResponse>(url);
    }),
  );
  return batches.flatMap((b) => b.response.store_items ?? []).filter((i) => i.success === 1 && i.visible !== false);
}

function image(item: StoreItem): { image: string; fallback?: string } {
  const a = item.assets;
  if (!a) return { image: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${item.appid}/header.jpg` };
  const file = (name?: string) => (name ? ASSET_BASE + a.asset_url_format.replace("${FILENAME}", name) : undefined);
  return { image: file(a.header) ?? file(a.main_capsule) ?? "", fallback: file(a.small_capsule) };
}

function devicesOf(item: StoreItem): Device[] {
  const p = item.platforms;
  if (!p) return ["windows"];
  const out: Device[] = [];
  if (p.windows) out.push("windows");
  if (p.mac) out.push("mac");
  if (p.steamos_linux) out.push("linux");
  return out.length ? out : ["windows"];
}

function toGame(item: StoreItem, offer: Game["offer"], rank: number, currency: string): Game {
  const opt = item.best_purchase_option;
  const original = Number(opt?.original_price_in_cents ?? 0) / 100;
  const { image: img, fallback } = image(item);
  const genres = genresFromSteamTags(item.tagids ?? []);
  return {
    id: `steam-${item.appid}`,
    title: item.name ?? `App ${item.appid}`,
    store: "steam",
    offer,
    kind: item.type === 4 ? "dlc" : "game",
    genres,
    devices: devicesOf(item),
    modes: modesFromSteam(item.categories?.supported_player_categoryids ?? [], offer, genres),
    image: img,
    imageFallback: fallback,
    description: clip(item.basic_info?.short_description),
    url: `https://store.steampowered.com/${item.store_url_path ?? `app/${item.appid}`}`,
    price: offer === "giveaway" && original > 0 ? { amount: original, currency } : undefined,
    endDate: opt?.free_to_keep_ends ? new Date(opt.free_to_keep_ends * 1000).toISOString() : undefined,
    publisher: item.basic_info?.publishers?.[0]?.name,
    popularity: 10_000 - rank,
    sources: ["steam"],
  };
}

/** Paid games/DLC that are currently 100 % off (free to keep). */
export function fetchSteamGiveaways(country: string, currency: string, lang: Lang): Promise<Game[]> {
  return cached(`steam-giveaways:${country}:${lang}`, 30 * 60_000, async () => {
    const ids = await searchAppIds("maxprice=free&specials=1", country, 2);
    const items = await getItems(ids, country, lang);
    return items
      .filter((i) => i.best_purchase_option?.discount_pct === 100 || i.best_purchase_option?.is_free_to_keep)
      .map((i, rank) => toGame(i, "giveaway", rank, currency));
  });
}

interface QueryResponse {
  response: { store_items?: StoreItem[] };
}

/** Steam has ~16k free games; beyond the top ~1000 by popularity it is mostly abandoned long tail. */
const FREE_LIMIT = Number(process.env.STEAM_FREE_LIMIT) || 1000;
const QUERY_PAGE = 500;

/** Steam's query API sort orders (undocumented; determined by testing). */
const SORT_POPULAR = 10;
const SORT_TOP_SELLING = 21;

/** Permanently free items of one type, paged in parallel. */
async function queryFree(
  country: string,
  lang: Lang,
  typeFilters: Record<string, boolean>,
  sort: number,
  limit: number,
): Promise<StoreItem[]> {
  const pages = await Promise.all(
    Array.from({ length: Math.ceil(limit / QUERY_PAGE) }, (_, page) => {
      const input = {
        query: {
          start: page * QUERY_PAGE,
          count: Math.min(QUERY_PAGE, limit - page * QUERY_PAGE),
          sort,
          filters: { released_only: true, type_filters: typeFilters, price_filters: { only_free_items: true } },
        },
        context: { language: STEAM_LANG[lang], country_code: country },
        data_request: { include_assets: true, include_basic_info: true, include_tag_count: 8, include_platforms: true },
      };
      const url = `https://api.steampowered.com/IStoreQueryService/Query/v1?input_json=${encodeURIComponent(JSON.stringify(input))}`;
      return fetchJson<QueryResponse>(url);
    }),
  );
  // only_free_items also matches paid games with a free component (e.g. Battlefield 6 / REDSEC).
  return pages
    .flatMap((p) => p.response.store_items ?? [])
    .filter((i) => i.success === 1 && i.visible !== false && i.is_free === true);
}

/** Permanently free games (Free-to-Play and free indies), ordered by popularity. */
export function fetchSteamFreeToPlay(country: string, lang: Lang): Promise<Game[]> {
  return cached(`steam-f2p:${country}:${lang}`, 6 * 60 * 60_000, async () => {
    const items = await queryFree(country, lang, { include_games: true }, SORT_POPULAR, FREE_LIMIT);
    return items.map((i, rank) => toGame(i, "f2p", rank, ""));
  });
}

/** Steam has ~4.4k permanently free DLCs; the top sellers are the relevant ones. */
const DLC_LIMIT = Number(process.env.STEAM_DLC_LIMIT) || 200;

export function fetchSteamFreeDlc(country: string, lang: Lang): Promise<Game[]> {
  return cached(`steam-dlc:${country}:${lang}`, 6 * 60 * 60_000, async () => {
    const items = await queryFree(country, lang, { include_dlc: true }, SORT_TOP_SELLING, DLC_LIMIT);
    return items.map((i, rank) => ({ ...toGame(i, "f2p", rank, ""), kind: "dlc" as const }));
  });
}
