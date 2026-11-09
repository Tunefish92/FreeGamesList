"use client";

import { LoaderCircle, RotateCcw, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/basePath";
import { withoutExpired } from "@/lib/expiry";
import { DICT, toLang, type Lang } from "@/lib/i18n";
import { DEFAULT_REGION, getRegion, regionFromAcceptLanguage } from "@/lib/regions";
import type { GamesPayload } from "@/lib/types";
import GameList from "./GameList";
import Pending from "./Pending";

type State =
  | { status: "loading" }
  | { status: "ready"; data: GamesPayload; lang: Lang }
  | { status: "pending"; lang: Lang }
  | { status: "error"; lang: Lang };

/**
 * Region and language for this visit: ?cc= and ?lang= from the address (the header's switches set
 * them), otherwise guessed from the browser's languages, like the server did from Accept-Language.
 */
function chooseListFor(): { country: string; lang: Lang } {
  const params = new URLSearchParams(window.location.search);
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language];
  const lang = toLang(params.get("lang") ?? languages[0]?.slice(0, 2));
  const country =
    getRegion(params.get("cc"))?.code ?? regionFromAcceptLanguage(languages.join(","))?.code ?? DEFAULT_REGION;
  return { country, lang };
}

/**
 * Loads the worker's exported list for this region and language, falling back to the default
 * region. Giveaways that ended since the last update are dropped. Null when no list exists yet.
 */
async function loadList(country: string, lang: Lang): Promise<GamesPayload | null> {
  const codes = country === DEFAULT_REGION ? [country] : [country, DEFAULT_REGION];
  for (const code of codes) {
    const res = await fetch(`${BASE_PATH}/data/${code}-${lang}.json`);
    if (res.ok) {
      return withoutExpired((await res.json()) as GamesPayload);
    }
    if (res.status !== 404) {
      throw new Error(`HTTP ${res.status}`);
    }
  }
  return null;
}

/**
 * The whole site on a static host: the HTML is the same for everyone, so the browser picks the
 * region and language and loads the matching list from /data. Shows a spinner while loading,
 * Pending before the first update, and a retry message when the list can't be loaded.
 */
export default function GamesApp() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const { country, lang } = chooseListFor();
    document.documentElement.lang = lang;
    loadList(country, lang)
      .then((data) => setState(data ? { status: "ready", data, lang } : { status: "pending", lang }))
      .catch(() => setState({ status: "error", lang }));
  }, []);

  if (state.status === "ready") {
    return <GameList data={state.data} lang={state.lang} />;
  }
  if (state.status === "pending") {
    return <Pending lang={state.lang} />;
  }
  if (state.status === "error") {
    const t = DICT[state.lang];
    return (
      <div className="app-shell">
        <main className="container empty">
          <WifiOff aria-hidden />
          <h3>{t.loadFailed}</h3>
          <p>{t.loadFailedHint}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={15} aria-hidden />
            {t.retry}
          </button>
        </main>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <main className="container empty" aria-busy="true">
        <LoaderCircle className="spin" aria-hidden />
      </main>
    </div>
  );
}
