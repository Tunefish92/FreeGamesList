export const GENRES = [
  "battle-royale",
  "shooter",
  "moba",
  "mmo",
  "rpg",
  "action",
  "adventure",
  "strategy",
  "card",
  "fighting",
  "racing",
  "sports",
  "simulation",
  "survival",
  "horror",
  "platformer",
  "puzzle",
  "casual",
  "social",
  "other",
] as const;

export type GenreKey = (typeof GENRES)[number];

/** Which genre decides the section a game is listed under (most specific first). */
const PRIMARY_PRIORITY: GenreKey[] = [
  "battle-royale",
  "moba",
  "mmo",
  "card",
  "fighting",
  "racing",
  "sports",
  "shooter",
  "horror",
  "survival",
  "platformer",
  "puzzle",
  "rpg",
  "strategy",
  "simulation",
  "adventure",
  "action",
  "casual",
  "social",
  "other",
];

export function primaryGenre(genres: GenreKey[]): GenreKey {
  return PRIMARY_PRIORITY.find((g) => genres.includes(g)) ?? "other";
}

function uniq(genres: (GenreKey | undefined)[]): GenreKey[] {
  const out = [...new Set(genres.filter((g): g is GenreKey => !!g))];
  return out.length ? out : ["other"];
}

const FTG_MAP: Record<string, GenreKey[]> = {
  shooter: ["shooter"],
  rpg: ["rpg"],
  mmorpg: ["mmo", "rpg"],
  "battle royale": ["battle-royale", "shooter"],
  arpg: ["rpg", "action"],
  "action rpg": ["rpg", "action"],
  mmoarpg: ["mmo", "rpg", "action"],
  strategy: ["strategy"],
  fighting: ["fighting"],
  card: ["card"],
  "card game": ["card"],
  social: ["social"],
  sports: ["sports"],
  mmo: ["mmo"],
  moba: ["moba"],
  "dungeon crawler": ["rpg"],
  "action game": ["action"],
  action: ["action"],
  racing: ["racing"],
  fantasy: ["rpg"],
};

export function genresFromFreeToGame(genre: string): GenreKey[] {
  return uniq(FTG_MAP[genre.toLowerCase().trim()] ?? []);
}

/** Steam store tag IDs → genre. */
const STEAM_TAGS: Record<number, GenreKey> = {
  19: "action",
  21: "adventure",
  1774: "shooter",
  1663: "shooter",
  3814: "shooter",
  176981: "battle-royale",
  122: "rpg",
  4231: "rpg",
  1695: "adventure",
  128: "mmo",
  1754: "mmo",
  1718: "moba",
  9: "strategy",
  1741: "strategy",
  1676: "strategy",
  1708: "strategy",
  599: "simulation",
  701: "sports",
  699: "racing",
  1743: "fighting",
  1666: "card",
  17389: "card",
  1664: "puzzle",
  1625: "platformer",
  1662: "survival",
  1667: "horror",
  597: "casual",
  4136: "casual",
  3964: "social",
};

export function genresFromSteamTags(tagIds: number[]): GenreKey[] {
  return uniq(tagIds.map((id) => STEAM_TAGS[id]));
}

export function genresFromSlugs(slugs: string[]): GenreKey[] {
  return uniq(
    slugs.map((s): GenreKey | undefined => {
      if (s.includes("battle-royale")) return "battle-royale";
      if (s.includes("shooter") || s === "fps" || s === "tps") return "shooter";
      if (s.includes("rpg") || s.includes("role-playing")) return "rpg";
      if (s.includes("mmo")) return "mmo";
      if (s.includes("moba")) return "moba";
      if (s.includes("strategy") || s === "rts" || s.includes("tactical")) return "strategy";
      if (s.includes("card")) return "card";
      if (s.includes("fighting")) return "fighting";
      if (s.includes("racing")) return "racing";
      if (s.includes("sport")) return "sports";
      if (s.includes("simulation")) return "simulation";
      if (s.includes("survival")) return "survival";
      if (s.includes("horror")) return "horror";
      if (s.includes("platform")) return "platformer";
      if (s.includes("puzzle")) return "puzzle";
      if (s.includes("casual")) return "casual";
      if (s.includes("adventure")) return "adventure";
      if (s.includes("action")) return "action";
      return undefined;
    }),
  );
}

const KEYWORDS: [RegExp, GenreKey][] = [
  [/battle royale/i, "battle-royale"],
  [/\b(shooter|fps|first-person shooter|sniper|gunfight)/i, "shooter"],
  [/\bmoba\b/i, "moba"],
  [/\bmmo/i, "mmo"],
  [/\b(rpg|role-playing|roleplaying|rollenspiel)/i, "rpg"],
  [/\b(strategy|strategie|tactic|taktik|tower defense|city-builder|city builder|4x)/i, "strategy"],
  [/\b(card game|deckbuild|kartenspiel|roguelike deck)/i, "card"],
  [/\b(fighting|brawler|beat 'em up|kampfspiel)/i, "fighting"],
  [/\b(racing|rennspiel|racer|drift)/i, "racing"],
  [/\b(football|soccer|basketball|sport|golf|tennis|fußball)/i, "sports"],
  [/\b(simulat|tycoon|farming|management)/i, "simulation"],
  [/\b(survival|überleben|überlebens)/i, "survival"],
  [/\b(horror|grusel|terrifying|creepy)/i, "horror"],
  [/\b(platformer|jump 'n' run|plattform)/i, "platformer"],
  [/\b(puzzle|rätsel|sudoku|logic)/i, "puzzle"],
  [/\b(adventure|abenteuer|exploration|point-and-click|narrative|story-driven)/i, "adventure"],
  [/\b(action|hack and slash|hack-and-slash|roguelite|roguelike)/i, "action"],
  [/\b(casual|relaxing|cozy|idle|entspannend)/i, "casual"],
];

/** Fallback genre detection for sources without genre metadata. */
export function genresFromText(text: string): GenreKey[] {
  return uniq(KEYWORDS.filter(([re]) => re.test(text)).map(([, g]) => g).slice(0, 3));
}
