"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { BASE_PATH } from "@/lib/basePath";
import type { Dict, Lang } from "@/lib/i18n";
import { REGIONS } from "@/lib/regions";
import ThemeToggle from "./ThemeToggle";

interface Props {
  t: Dict;
  lang: Lang;
  country: string;
  query: string;
  onQuery: (q: string) => void;
}

function navigate(cc: string, lang: Lang) {
  window.location.search = `?cc=${cc}&lang=${lang}`;
}

export default function Header({ t, lang, country, query, onQuery }: Props) {
  const input = useRef<HTMLInputElement>(null);

  // "/" focuses the search, like on most store sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <a href={`?cc=${country}&lang=${lang}`} className="app-header__brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/logo.svg`} alt="" width={30} height={30} className="app-header__logo" />
          <h1 className="app-header__name">
            FreeGames<span>List</span>
          </h1>
        </a>

        <label className="search">
          <Search aria-hidden />
          <input
            ref={input}
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t.search}
            aria-label={t.search}
          />
          <kbd>/</kbd>
        </label>

        <div className="app-header__actions">
          <select
            className="header-control"
            value={country}
            onChange={(e) => navigate(e.target.value, lang)}
            aria-label={t.region}
            title={t.region}
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.flag} {r.code} · {r.currency}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="header-control"
            onClick={() => navigate(country, lang === "de" ? "en" : "de")}
            aria-label={t.language}
            title={t.language}
          >
            {lang === "de" ? "EN" : "DE"}
          </button>
          <ThemeToggle t={t} />
        </div>
      </div>
    </header>
  );
}
