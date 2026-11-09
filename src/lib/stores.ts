import {
  siBattledotnet,
  siEa,
  siEpicgames,
  siGogdotcom,
  siHumblebundle,
  siItchdotio,
  siRiotgames,
  siSteam,
  siUbisoft,
} from "simple-icons";

export const STORES = {
  steam: { name: "Steam", color: "#1b2838", accent: "#66c0f4", icon: siSteam.path },
  epic: { name: "Epic Games", color: "#2a2a2a", accent: "#ffffff", icon: siEpicgames.path },
  gog: { name: "GOG", color: "#5c2a86", accent: "#d6b4f7", icon: siGogdotcom.path },
  ubisoft: { name: "Ubisoft", color: "#0070ff", accent: "#ffffff", icon: siUbisoft.path },
  ea: { name: "EA", color: "#ff4747", accent: "#ffffff", icon: siEa.path },
  battlenet: { name: "Battle.net", color: "#148eff", accent: "#ffffff", icon: siBattledotnet.path },
  riot: { name: "Riot Games", color: "#d13639", accent: "#ffffff", icon: siRiotgames.path },
  prime: { name: "Prime Gaming", color: "#9146ff", accent: "#ffffff", icon: null },
  itch: { name: "itch.io", color: "#fa5c5c", accent: "#ffffff", icon: siItchdotio.path },
  humble: { name: "Humble", color: "#cc2929", accent: "#ffffff", icon: siHumblebundle.path },
  fanatical: { name: "Fanatical", color: "#ff9800", accent: "#1a1a1a", icon: null },
  indiegala: { name: "IndieGala", color: "#e5322d", accent: "#ffffff", icon: null },
  other: { name: "Web", color: "#334155", accent: "#ffffff", icon: null },
} as const satisfies Record<string, { name: string; color: string; accent: string; icon: string | null }>;

export type StoreKey = keyof typeof STORES;

export const STORE_KEYS = Object.keys(STORES) as StoreKey[];
