import type { Device } from "../devices";
import type { StoreKey } from "../stores";

const PC_CONSOLES: Device[] = ["windows", "playstation", "xbox", "switch"];
const PC_PS_XBOX: Device[] = ["windows", "playstation", "xbox"];
const PC_MOBILE: Device[] = ["windows", "android", "ios"];

/**
 * Big F2P titles whose real home is a launcher without a public API, plus the
 * devices they run on (no API reports console availability). Matched by title key.
 */
export const CURATED: Record<string, { store: StoreKey; url: string; devices: Device[] }> = {
  "league of legends": { store: "riot", url: "https://www.leagueoflegends.com", devices: ["windows", "mac"] },
  valorant: { store: "riot", url: "https://playvalorant.com", devices: PC_PS_XBOX },
  "legends of runeterra": { store: "riot", url: "https://playruneterra.com", devices: PC_MOBILE },
  hearthstone: { store: "battlenet", url: "https://hearthstone.blizzard.com", devices: ["windows", "mac", "android", "ios"] },
  "heroes of the storm": { store: "battlenet", url: "https://heroesofthestorm.blizzard.com", devices: ["windows", "mac"] },
  overwatch: { store: "battlenet", url: "https://overwatch.blizzard.com", devices: PC_CONSOLES },
  "overwatch 2": { store: "battlenet", url: "https://overwatch.blizzard.com", devices: PC_CONSOLES },
  "diablo immortal": { store: "battlenet", url: "https://diabloimmortal.blizzard.com", devices: PC_MOBILE },
  "call of duty warzone": { store: "battlenet", url: "https://www.callofduty.com/warzone", devices: PC_PS_XBOX },
  "apex legends": { store: "ea", url: "https://www.ea.com/games/apex-legends", devices: PC_CONSOLES },
  "battlefield redsec": { store: "ea", url: "https://www.ea.com/games/battlefield", devices: PC_PS_XBOX },
  fortnite: {
    store: "epic",
    url: "https://store.epicgames.com/p/fortnite",
    devices: [...PC_CONSOLES, "android", "ios"],
  },
  "rocket league": { store: "epic", url: "https://store.epicgames.com/p/rocket-league", devices: PC_CONSOLES },
  "fall guys": { store: "epic", url: "https://store.epicgames.com/p/fall-guys", devices: PC_CONSOLES },
  brawlhalla: { store: "ubisoft", url: "https://www.brawlhalla.com", devices: [...PC_CONSOLES, "android", "ios"] },
  trackmania: { store: "ubisoft", url: "https://www.trackmania.com", devices: PC_PS_XBOX },
  "tom clancy s rainbow six siege x": {
    store: "ubisoft",
    url: "https://www.ubisoft.com/game/rainbow-six/siege",
    devices: PC_PS_XBOX,
  },
  "the settlers online": { store: "ubisoft", url: "https://www.thesettlersonline.com", devices: ["windows"] },
};
