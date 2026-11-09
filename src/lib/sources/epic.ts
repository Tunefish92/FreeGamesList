import { genresFromText } from "../genres";
import { cached, fetchJson } from "../http";
import { modesFromText } from "../modes";
import { clip } from "../normalize";
import type { Game } from "../types";
import type { Lang } from "../i18n";

interface PromoWindow {
  startDate: string;
  endDate: string;
  discountSetting: { discountPercentage: number };
}

interface EpicElement {
  id: string;
  title: string;
  description: string;
  offerType: string;
  productSlug: string | null;
  urlSlug: string | null;
  keyImages: { type: string; url: string }[];
  seller?: { name: string };
  catalogNs?: { mappings?: { pageSlug: string; pageType: string }[] | null };
  offerMappings?: { pageSlug: string; pageType: string }[] | null;
  price?: { totalPrice: { discountPrice: number; originalPrice: number; currencyCode: string } };
  promotions: {
    promotionalOffers: { promotionalOffers: PromoWindow[] }[];
    upcomingPromotionalOffers: { promotionalOffers: PromoWindow[] }[];
  } | null;
}

interface EpicResponse {
  data: { Catalog: { searchStore: { elements: EpicElement[] } } };
}

const IMAGE_PREFERENCE = ["OfferImageWide", "DieselStoreFrontWide", "featuredMedia", "Thumbnail", "OfferImageTall"];

function pickImage(el: EpicElement): string {
  for (const type of IMAGE_PREFERENCE) {
    const img = el.keyImages.find((k) => k.type === type);
    if (img) return img.url;
  }
  return el.keyImages[0]?.url ?? "";
}

function slugOf(el: EpicElement): string | undefined {
  const mapping =
    el.offerMappings?.find((m) => m.pageType === "productHome") ??
    el.catalogNs?.mappings?.find((m) => m.pageType === "productHome");
  return mapping?.pageSlug ?? el.productSlug?.replace(/\/home$/, "") ?? undefined;
}

/** Epic marks "free" promotions with discountPercentage 0 (= pay 0 %). */
function freeWindow(groups: { promotionalOffers: PromoWindow[] }[] | undefined): PromoWindow | undefined {
  return groups?.flatMap((g) => g.promotionalOffers).find((p) => p.discountSetting.discountPercentage === 0);
}

export async function fetchEpic(country: string, lang: Lang): Promise<Game[]> {
  const locale = lang === "de" ? "de" : "en-US";
  return cached(`epic:${country}:${lang}`, 30 * 60_000, async () => {
    const url = `https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${locale}&country=${country}&allowCountries=${country}`;
    const json = await fetchJson<EpicResponse>(url);
    const now = Date.now();
    const games: Game[] = [];

    for (const el of json.data.Catalog.searchStore.elements) {
      const active = freeWindow(el.promotions?.promotionalOffers);
      const upcoming = freeWindow(el.promotions?.upcomingPromotionalOffers);
      const isFreeNow =
        !!active && el.price?.totalPrice.discountPrice === 0 && new Date(active.startDate).getTime() <= now;
      const window = isFreeNow ? active : upcoming;
      if (!window) continue;
      // Games that are permanently free anyway are covered by the F2P sources.
      if (!el.price?.totalPrice.originalPrice) continue;

      const slug = slugOf(el);
      const total = el.price.totalPrice;
      const text = `${el.title} ${el.description}`;
      const genres = genresFromText(text);
      games.push({
        id: `epic-${el.id}`,
        title: el.title,
        store: "epic",
        offer: "giveaway",
        kind: el.offerType === "ADD_ON" ? "dlc" : "game",
        genres,
        modes: modesFromText(text, "giveaway", genres),
        devices: ["windows"],
        image: pickImage(el),
        description: clip(el.description),
        url: slug
          ? `https://store.epicgames.com/${locale}/p/${slug}`
          : `https://store.epicgames.com/${locale}/free-games`,
        price: { amount: total.originalPrice / 100, currency: total.currencyCode },
        startDate: window.startDate,
        endDate: window.endDate,
        upcoming: !isFreeNow,
        publisher: el.seller?.name,
        popularity: 10_000,
        sources: ["epic"],
      });
    }
    return games;
  });
}
