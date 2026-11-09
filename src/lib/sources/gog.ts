import type { Device } from "../devices";
import { genresFromSlugs } from "../genres";
import { cached, fetchJson } from "../http";
import { modesFromGog } from "../modes";
import type { Game, Offer } from "../types";
import type { Lang } from "../i18n";

interface GogProduct {
  id: string;
  slug: string;
  title: string;
  productType: "game" | "pack" | "dlc" | "extras";
  coverHorizontal: string;
  developers?: string[];
  publishers?: string[];
  operatingSystems: string[];
  price: { baseMoney: { amount: string; currency: string }; finalMoney: { amount: string } } | null;
  genres?: { slug: string }[];
  features?: { slug: string }[];
  tags?: { slug: string }[];
  storeLink?: string;
}

interface GogResponse {
  products: GogProduct[];
  pages: number;
}

interface GogPage {
  sections: { sectionId: string; sectionType: string }[];
}

interface GogGiveawaySection {
  properties?: { endDate?: string; product?: GogProduct };
}

const GOG_CURRENCIES = new Set(["EUR", "USD", "GBP", "PLN", "AUD", "CAD", "CHF", "SEK", "BRL"]);
const MAX_PAGES = 6;

function params(country: string, currency: string, lang: Lang): string {
  const cur = GOG_CURRENCIES.has(currency) ? currency : "USD";
  return `countryCode=${country}&locale=${lang === "de" ? "de-DE" : "en-US"}&currencyCode=${cur}`;
}

function storeLink(p: GogProduct, lang: Lang): string {
  return p.storeLink ?? `https://www.gog.com/${lang === "de" ? "de" : "en"}/game/${p.slug}`;
}

function toGame(p: GogProduct, offer: Offer, rank: number, lang: Lang): Game {
  const genres = genresFromSlugs([...(p.genres ?? []), ...(p.tags ?? []).slice(0, 6)].map((g) => g.slug));
  const base = Number(p.price?.baseMoney.amount ?? 0);
  return {
    id: `gog-${p.id}`,
    title: p.title,
    store: "gog",
    offer,
    kind: p.productType === "dlc" ? "dlc" : "game",
    genres,
    modes: modesFromGog((p.features ?? []).map((f) => f.slug), offer, genres),
    devices: p.operatingSystems.flatMap((os): Device[] =>
      os === "windows" ? ["windows"] : os === "osx" ? ["mac"] : os === "linux" ? ["linux"] : [],
    ),
    image: p.coverHorizontal,
    url: storeLink(p, lang),
    price: offer === "giveaway" && base > 0 ? { amount: base, currency: p.price!.baseMoney.currency } : undefined,
    publisher: p.publishers?.[0] ?? p.developers?.[0],
    popularity: 10_000 - rank * 5,
    sources: ["gog"],
  };
}

/** Everything priced 0 in the catalog: 100 %-off deals plus permanently free DRM-free games. */
export function fetchGog(country: string, currency: string, lang: Lang): Promise<Game[]> {
  return cached(`gog:${country}:${lang}`, 60 * 60_000, async () => {
    const base =
      `https://catalog.gog.com/v1/catalog?limit=100&price=between:0,0&order=desc:trending` +
      `&productType=in:game,pack,dlc&${params(country, currency, lang)}`;
    const first = await fetchJson<GogResponse>(`${base}&page=1`);
    const rest = await Promise.all(
      Array.from({ length: Math.min(first.pages, MAX_PAGES) - 1 }, (_, i) =>
        fetchJson<GogResponse>(`${base}&page=${i + 2}`),
      ),
    );
    const products = [first, ...rest].flatMap((r) => r.products);

    const games: Game[] = [];
    products.forEach((p, rank) => {
      const baseAmount = Number(p.price?.baseMoney.amount ?? 0);
      if (Number(p.price?.finalMoney.amount ?? 0) !== 0) return;
      const isGiveaway = baseAmount > 0;
      // Permanently free DLC on GOG is mostly goodies (soundtracks, artbooks), and demos aren't games.
      if (!isGiveaway && (p.productType === "dlc" || /\bdemo\b/i.test(p.title))) return;
      games.push(toGame(p, isGiveaway ? "giveaway" : "f2p", rank, lang));
    });
    return games;
  });
}

/**
 * GOG's headline giveaway is claimed via a homepage banner and is *not* 0 € in the catalog,
 * so it comes from the homepage's GIVEAWAY_SECTION in the sections API.
 */
export function fetchGogGiveaway(country: string, currency: string, lang: Lang): Promise<Game[]> {
  return cached(`gog-giveaway:${country}:${lang}`, 30 * 60_000, async () => {
    const q = params(country, currency, lang);
    const page = await fetchJson<GogPage>(`https://sections.gog.com/v1/pages/2f?${q}`);
    const section = page.sections.find((s) => s.sectionType === "GIVEAWAY_SECTION");
    if (!section) return [];

    const json = await fetchJson<GogGiveawaySection>(
      `https://sections.gog.com/v1/pages/2f/sections/${section.sectionId}?${q}`,
    );
    const product = json.properties?.product;
    const endDate = json.properties?.endDate;
    if (!product || (endDate && new Date(endDate).getTime() < Date.now())) return [];

    return [{ ...toGame(product, "giveaway", 0, lang), endDate: endDate ? new Date(endDate).toISOString() : undefined }];
  });
}
