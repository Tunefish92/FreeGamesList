export interface Region {
  code: string;
  currency: string;
  flag: string;
  name: { de: string; en: string };
}

export const REGIONS: Region[] = [
  { code: "DE", currency: "EUR", flag: "🇩🇪", name: { de: "Deutschland", en: "Germany" } },
  { code: "AT", currency: "EUR", flag: "🇦🇹", name: { de: "Österreich", en: "Austria" } },
  { code: "CH", currency: "CHF", flag: "🇨🇭", name: { de: "Schweiz", en: "Switzerland" } },
  { code: "FR", currency: "EUR", flag: "🇫🇷", name: { de: "Frankreich", en: "France" } },
  { code: "IT", currency: "EUR", flag: "🇮🇹", name: { de: "Italien", en: "Italy" } },
  { code: "ES", currency: "EUR", flag: "🇪🇸", name: { de: "Spanien", en: "Spain" } },
  { code: "NL", currency: "EUR", flag: "🇳🇱", name: { de: "Niederlande", en: "Netherlands" } },
  { code: "BE", currency: "EUR", flag: "🇧🇪", name: { de: "Belgien", en: "Belgium" } },
  { code: "PL", currency: "PLN", flag: "🇵🇱", name: { de: "Polen", en: "Poland" } },
  { code: "SE", currency: "SEK", flag: "🇸🇪", name: { de: "Schweden", en: "Sweden" } },
  { code: "GB", currency: "GBP", flag: "🇬🇧", name: { de: "Vereinigtes Königreich", en: "United Kingdom" } },
  { code: "US", currency: "USD", flag: "🇺🇸", name: { de: "USA", en: "United States" } },
  { code: "CA", currency: "CAD", flag: "🇨🇦", name: { de: "Kanada", en: "Canada" } },
  { code: "AU", currency: "AUD", flag: "🇦🇺", name: { de: "Australien", en: "Australia" } },
  { code: "BR", currency: "BRL", flag: "🇧🇷", name: { de: "Brasilien", en: "Brazil" } },
];

export const DEFAULT_REGION = "DE";

export function getRegion(code: string | undefined | null): Region | undefined {
  if (!code) return undefined;
  return REGIONS.find((r) => r.code === code.toUpperCase());
}

/** Picks a supported region from an Accept-Language header like "de-AT,de;q=0.9". */
export function regionFromAcceptLanguage(header: string | null): Region | undefined {
  if (!header) return undefined;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0].trim();
    const country = tag.split("-")[1];
    const region = getRegion(country);
    if (region) return region;
  }
  return undefined;
}
