import { Coffee } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import type { SourceStatus } from "@/lib/types";

/** Author of this site; a name, so never translated. */
const AUTHOR = "Tunefish";
const AUTHOR_URL = "https://github.com/Tunefish92";
/** Voluntary tips; the same link as in the author's other projects. */
const SUPPORT_URL = "https://paypal.me/tunefish92";
const SUPPORT_LABEL = "paypal.me/tunefish92";

const SOURCE_INFO: Record<string, { name: string; url: string }> = {
  epic: { name: "Epic Games Store", url: "https://store.epicgames.com/free-games" },
  steam: { name: "Steam (−100 %)", url: "https://store.steampowered.com/search/?maxprice=free&specials=1" },
  "steam-f2p": { name: "Steam (Free-to-Play)", url: "https://store.steampowered.com/genre/Free%20to%20Play/" },
  "steam-dlc": { name: "Steam (DLC)", url: "https://store.steampowered.com/search/?maxprice=free&category1=21" },
  gog: { name: "GOG.com", url: "https://www.gog.com/games?priceRange=0,0" },
  "gog-giveaway": { name: "GOG Giveaway", url: "https://www.gog.com/#giveaway" },
  freetogame: { name: "FreeToGame.com", url: "https://www.freetogame.com" },
  cheapshark: { name: "CheapShark", url: "https://www.cheapshark.com" },
};

/**
 * Site footer: about text, data sources with their status, last update time, and the
 * transparency note (hobby project, no money or tracking, outside requests, AI) with the
 * voluntary PayPal tip link, so visitors know who runs the site and what it does with them.
 */
export default function Footer({ t, sources, updatedAt }: { t: Dict; sources: SourceStatus[]; updatedAt: string }) {
  const note = t.footer.note;
  return (
    <footer className="app-footer">
      <div className="container app-footer__grid">
        <div>
          <h4>FreeGamesList</h4>
          <p>{t.footer.about}</p>
          <p>{t.footer.disclaimer}</p>
        </div>
        <div>
          <h4>{t.footer.sources}</h4>
          <ul>
            {sources.map((s) => {
              const info = SOURCE_INFO[s.id] ?? { name: s.id, url: "#" };
              return (
                <li key={s.id}>
                  <span className={`source-dot${s.ok ? "" : " source-dot--down"}`} aria-hidden />
                  <a href={info.url} target="_blank" rel="noopener noreferrer">
                    {info.name}
                  </a>{" "}
                  · {s.ok ? s.count : "offline"}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <h4>{t.footer.status}</h4>
          <ul>
            <li suppressHydrationWarning>
              {t.updated}: {new Date(updatedAt).toLocaleString(t.locale, { dateStyle: "medium", timeStyle: "short" })}
            </li>
            <li>
              {sources.filter((s) => s.ok).length}/{sources.length} {t.footer.sources}
            </li>
          </ul>
        </div>
      </div>
      <section className="container app-footer__note" aria-labelledby="footer-note-title">
        <div>
          <h4 id="footer-note-title">{note.title}</h4>
          <p>{note.intro}</p>
          <ul className="app-footer__facts">
            <li>{note.money}</li>
            <li>{note.privacy}</li>
            <li>{note.outside}</li>
            <li>{note.ai}</li>
          </ul>
        </div>
        <div className="app-footer__support">
          <p>{note.support}</p>
          <a className="support-link" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
            <Coffee size={18} aria-hidden />
            <span>{note.button}</span>
            <span className="support-link__url">{SUPPORT_LABEL}</span>
          </a>
          <p className="app-footer__fine">{note.fine}</p>
        </div>
      </section>
      <div className="container app-footer__bottom">
        <span>
          © {new Date(updatedAt).getFullYear()} by{" "}
          <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
            {AUTHOR}
          </a>
        </span>
        <span>{t.footer.made}</span>
      </div>
    </footer>
  );
}
