"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import type { Dict } from "@/lib/i18n";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "fgl.theme";
const CHANGE_EVENT = "fgl-theme-change";
const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    // Storage blocked: stay on system theme.
    return "system";
  }
}

/** Re-renders on changes from this tab (custom event) and other tabs (storage event). */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function apply(theme: Theme) {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

/** Cycles system → light → dark, persisted per browser like Tapeory's theme setting. */
export default function ThemeToggle({ t }: { t: Dict }) {
  const theme = useSyncExternalStore(subscribe, readTheme, (): Theme => "system");

  const cycle = () => {
    const next = NEXT[theme];
    apply(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best effort only.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={cycle}
      className="header-control header-control--icon"
      title={t.theme[theme]}
      aria-label={t.theme[theme]}
    >
      <Icon />
    </button>
  );
}
