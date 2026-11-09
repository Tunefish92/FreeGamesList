/** Builds a comparison key so the same game from different sources can be merged. */
export function titleKey(title: string): string {
  return title
    .replace(/[™®©]/g, "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\((steam|epic games?( store)?|gog|ubisoft( connect)?|prime gaming|amazon|itch\.io|ea( app)?|origin|battle\.net|indiegala|humble|fanatical|drm-free)\)/g, "")
    .replace(/\b(giveaway|free to keep|gratis)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function clip(text: string | undefined, max = 220): string | undefined {
  if (!text) return undefined;
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}
