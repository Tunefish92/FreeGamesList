"use client";

import Fuse from "fuse.js";
import { Gamepad2, Gift, Puzzle, RotateCcw, SearchX, Wallet } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DEVICE_KEYS, DEVICES, type Device } from "@/lib/devices";
import { GENRES, primaryGenre, type GenreKey } from "@/lib/genres";
import { DICT, type Lang } from "@/lib/i18n";
import { MODE_KEYS, MODES, type Mode } from "@/lib/modes";
import { STORE_KEYS, STORES, type StoreKey } from "@/lib/stores";
import type { Game, GamesPayload } from "@/lib/types";
import FilterRow from "./FilterRow";
import Footer from "./Footer";
import GameCard from "./GameCard";
import Header from "./Header";

type Tab = "giveaway" | "f2p" | "dlc" | "all";
type Sort = "popular" | "ending" | "value" | "az";

const SECTION_LIMIT = 12;
const TABS: Tab[] = ["giveaway", "f2p", "dlc", "all"];

function inTab(g: Game, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "dlc") return g.kind !== "game";
  return g.kind === "game" && g.offer === tab;
}

/** Clock for the countdowns: ticks once a minute, null during SSR so server and client markup match. */
function subscribeMinute(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function currentMinute() {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

function sortGames(games: Game[], sort: Sort): Game[] {
  const end = (g: Game) => (g.endDate ? new Date(g.endDate).getTime() : Infinity);
  const value = (g: Game) => g.price?.amount ?? g.worthUsd ?? 0;
  const by: Record<Sort, (a: Game, b: Game) => number> = {
    popular: (a, b) => b.popularity - a.popularity,
    ending: (a, b) => end(a) - end(b) || b.popularity - a.popularity,
    value: (a, b) => value(b) - value(a),
    az: (a, b) => a.title.localeCompare(b.title),
  };
  return [...games].sort(by[sort]);
}

export default function GameList({ data, lang }: { data: GamesPayload; lang: Lang }) {
  const t = DICT[lang];
  const [tab, setTab] = useState<Tab>("giveaway");
  const [sort, setSort] = useState<Sort>("ending");
  const [query, setQuery] = useState("");
  const [stores, setStores] = useState<StoreKey[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [modes, setModes] = useState<Mode[]>([]);
  const [expanded, setExpanded] = useState<GenreKey[]>([]);
  const now = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const fuse = useMemo(
    () =>
      new Fuse(data.games, {
        keys: [
          { name: "title", weight: 3 },
          { name: "publisher", weight: 1 },
          { name: "storeLabel", weight: 1 },
        ],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [data.games],
  );

  const switchTab = (next: Tab) => {
    setTab(next);
    setSort(next === "giveaway" || next === "dlc" ? "ending" : "popular");
    setExpanded([]);
  };

  const tabGames = useMemo(() => data.games.filter((g) => inTab(g, tab)), [data.games, tab]);

  const visible = useMemo(() => {
    const q = deferredQuery.trim();
    const matches = q ? new Set(fuse.search(q).map((r) => r.item.id)) : null;
    return sortGames(
      tabGames.filter(
        (g) =>
          (!matches || matches.has(g.id)) &&
          (stores.length === 0 || stores.includes(g.store)) &&
          (devices.length === 0 || devices.some((d) => g.devices.includes(d))) &&
          modes.every((m) => g.modes.includes(m)),
      ),
      sort,
    );
  }, [tabGames, deferredQuery, fuse, stores, devices, modes, sort]);

  const upcoming = visible.filter((g) => g.upcoming);
  const current = visible.filter((g) => !g.upcoming);
  // Genre sections only pay off with enough games; a handful of giveaways reads better as one grid.
  const grouped = current.length > SECTION_LIMIT;
  const groups = useMemo(() => {
    const byGenre = new Map<GenreKey, Game[]>();
    for (const g of visible) {
      if (g.upcoming) continue;
      const key = primaryGenre(g.genres);
      byGenre.set(key, [...(byGenre.get(key) ?? []), g]);
    }
    return GENRES.filter((g) => byGenre.has(g)).map((g) => [g, byGenre.get(g)!] as const);
  }, [visible]);

  const countBy = <K extends string>(keys: K[], of: (g: Game) => K[]) =>
    new Map(keys.map((k) => [k, tabGames.filter((g) => of(g).includes(k)).length]));

  const stats = useMemo(() => {
    const freeNow = data.games.filter((g) => g.offer === "giveaway" && !g.upcoming);
    const savings = freeNow
      .filter((g) => g.price?.currency === data.currency)
      .reduce((sum, g) => sum + (g.price?.amount ?? 0), 0);
    return {
      freeNow: freeNow.filter((g) => g.kind === "game").length,
      savings: new Intl.NumberFormat(t.locale, { style: "currency", currency: data.currency }).format(savings),
      f2p: data.games.filter((g) => inTab(g, "f2p")).length,
      dlc: data.games.filter((g) => inTab(g, "dlc")).length,
    };
  }, [data, t.locale]);

  const hasFilters = stores.length + devices.length + modes.length > 0 || query !== "";
  const resetFilters = () => {
    setStores([]);
    setDevices([]);
    setModes([]);
    setQuery("");
  };

  const card = (g: Game) => <GameCard key={g.id} game={g} t={t} lang={lang} currency={data.currency} now={now} />;

  return (
    <div className="app-shell">
      <Header t={t} lang={lang} country={data.country} query={query} onQuery={setQuery} />

      <main className="container">
        <section className="hero">
          <div>
            <h2>
              {t.tagline.split(". ")[0]}. <span>{t.tagline.split(". ")[1]}</span>
            </h2>
            <p>{t.subtitle}</p>
          </div>
          <span className="status-pill status-pill--success status-pill--dot status-pill--live" suppressHydrationWarning>
            {t.live} · {t.updated}{" "}
            {new Date(data.updatedAt).toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" })}
          </span>
        </section>

        <div className="stat-grid">
          <button type="button" className="stat-card stat-card--highlight" onClick={() => switchTab("giveaway")}>
            <span className="stat-card__glow" aria-hidden />
            <span className="stat-card__icon">
              <Gift aria-hidden />
            </span>
            <span className="stat-card__label">{t.stats.freeNow}</span>
            <span className="stat-card__value">{stats.freeNow}</span>
            <span className="stat-card__sub">{t.stats.freeNowSub}</span>
          </button>
          <button type="button" className="stat-card" onClick={() => switchTab("giveaway")}>
            <span className="stat-card__glow" aria-hidden />
            <span className="stat-card__icon">
              <Wallet aria-hidden />
            </span>
            <span className="stat-card__label">{t.stats.savings}</span>
            <span className="stat-card__value">{stats.savings}</span>
            <span className="stat-card__sub">{t.stats.savingsSub}</span>
          </button>
          <button type="button" className="stat-card" onClick={() => switchTab("f2p")}>
            <span className="stat-card__glow" aria-hidden />
            <span className="stat-card__icon">
              <Gamepad2 aria-hidden />
            </span>
            <span className="stat-card__label">{t.stats.f2p}</span>
            <span className="stat-card__value">{stats.f2p}</span>
            <span className="stat-card__sub">{t.stats.f2pSub}</span>
          </button>
          <button type="button" className="stat-card" onClick={() => switchTab("dlc")}>
            <span className="stat-card__glow" aria-hidden />
            <span className="stat-card__icon">
              <Puzzle aria-hidden />
            </span>
            <span className="stat-card__label">{t.stats.dlc}</span>
            <span className="stat-card__value">{stats.dlc}</span>
            <span className="stat-card__sub">{t.stats.dlcSub}</span>
          </button>
        </div>

        <div className="toolbar">
          <div className="toolbar__top">
            <div className="tabs" role="tablist">
              {TABS.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  className="tab"
                  aria-selected={tab === key}
                  onClick={() => switchTab(key)}
                >
                  {t.tabs[key]}
                  <span className="tab__count">{data.games.filter((g) => inTab(g, key)).length}</span>
                </button>
              ))}
            </div>
            <div className="toolbar__sort">
              {hasFilters && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={resetFilters}>
                  <RotateCcw size={14} aria-hidden />
                  {t.filters.reset}
                </button>
              )}
              <label htmlFor="sort">{t.sort.label}</label>
              <select id="sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                {(["popular", "ending", "value", "az"] as Sort[]).map((s) => (
                  <option key={s} value={s}>
                    {t.sort[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FilterRow
            label={t.filters.store}
            allLabel={t.filters.all}
            counts={countBy(STORE_KEYS, (g) => [g.store])}
            selected={stores}
            onChange={setStores}
            name={(k) => STORES[k].name}
            icon={(k) => STORES[k].icon}
          />
          <FilterRow
            label={t.filters.device}
            allLabel={t.filters.all}
            counts={countBy(DEVICE_KEYS, (g) => g.devices)}
            selected={devices}
            onChange={setDevices}
            name={(k) => DEVICES[k].name}
            icon={(k) => DEVICES[k].icon}
          />
          <FilterRow
            label={t.filters.mode}
            allLabel={t.filters.all}
            counts={countBy(MODE_KEYS, (g) => g.modes)}
            selected={modes}
            onChange={setModes}
            name={(k) => MODES[k][lang]}
          />
        </div>

        {visible.length === 0 && (
          <div className="empty">
            <SearchX aria-hidden />
            <h3>{t.empty}</h3>
            <p>{t.emptyHint}</p>
            {hasFilters && (
              <button type="button" className="btn btn-primary" onClick={resetFilters}>
                <RotateCcw size={15} aria-hidden />
                {t.filters.reset}
              </button>
            )}
          </div>
        )}

        {!grouped && current.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h3>{t.tabs[tab]}</h3>
              <span className="status-pill status-pill--neutral">{current.length}</span>
            </div>
            <div className="game-grid">{current.map(card)}</div>
          </section>
        )}

        {grouped && groups.map(([genre, games]) => {
          const open = expanded.includes(genre);
          return (
            <section key={genre} className="section">
              <div className="section__head">
                <h3>{t.genres[genre]}</h3>
                <span className="status-pill status-pill--neutral">{games.length}</span>
              </div>
              <div className="game-grid">{(open ? games : games.slice(0, SECTION_LIMIT)).map(card)}</div>
              {games.length > SECTION_LIMIT && (
                <div className="section__more">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setExpanded((prev) => (open ? prev.filter((x) => x !== genre) : [...prev, genre]))}
                  >
                    {open ? t.showLess : `${t.showAll} (${games.length})`}
                  </button>
                </div>
              )}
            </section>
          );
        })}

        {upcoming.length > 0 && (
          <section className="section">
            <div className="section__head">
              <h3>{t.upcoming}</h3>
              <span className="status-pill status-pill--info">{upcoming.length}</span>
            </div>
            <div className="game-grid">{upcoming.map(card)}</div>
          </section>
        )}
      </main>

      <Footer t={t} sources={data.sources} updatedAt={data.updatedAt} />
    </div>
  );
}
