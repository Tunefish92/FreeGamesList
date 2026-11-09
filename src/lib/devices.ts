import { siAndroid, siApple, siIos, siLinux, siPlaystation } from "simple-icons";

export const DEVICES = {
  windows: { name: "Windows", icon: null },
  mac: { name: "macOS", icon: siApple.path },
  linux: { name: "Linux", icon: siLinux.path },
  playstation: { name: "PlayStation", icon: siPlaystation.path },
  xbox: { name: "Xbox", icon: null },
  switch: { name: "Switch", icon: null },
  android: { name: "Android", icon: siAndroid.path },
  ios: { name: "iOS", icon: siIos.path },
} as const satisfies Record<string, { name: string; icon: string | null }>;

export type Device = keyof typeof DEVICES;

export const DEVICE_KEYS = Object.keys(DEVICES) as Device[];
