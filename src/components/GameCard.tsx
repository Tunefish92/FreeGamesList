import { CalendarClock, Clock } from "lucide-react";
import { DEVICES } from "@/lib/devices";
import type { Dict, Lang } from "@/lib/i18n";
import { MODES } from "@/lib/modes";
import { STORES } from "@/lib/stores";
import type { Game } from "@/lib/types";
import BrandIcon from "./BrandIcon";

interface Props {
  game: Game;
  t: Dict;
  lang: Lang;
  currency: string;
  /** Current time once mounted; null during SSR so server and client markup match. */
  now: number | null;
}

const HOUR = 3_600_000;

function remaining(endIso: string, now: number, t: Dict): { text: string; urgent: boolean } {
  const ms = new Date(endIso).getTime() - now;
  const days = Math.floor(ms / (24 * HOUR));
  const hours = Math.floor((ms % (24 * HOUR)) / HOUR);
  const minutes = Math.floor((ms % HOUR) / 60_000);
  const text = days > 0 ? `${days}${t.days} ${hours}${t.hours}` : hours > 0 ? `${hours}${t.hours} ${minutes}${t.minutes}` : `${minutes}${t.minutes}`;
  return { text, urgent: ms < 24 * HOUR };
}

export default function GameCard({ game: g, t, lang, currency, now }: Props) {
  const money = (amount: number, cur: string) =>
    new Intl.NumberFormat(t.locale, { style: "currency", currency: cur }).format(amount);
  const date = (iso: string) => new Date(iso).toLocaleDateString(t.locale, { day: "2-digit", month: "2-digit" });

  const store = STORES[g.store];
  const storeName = g.store === "other" ? (g.storeLabel ?? store.name) : store.name;
  const isGiveaway = g.offer === "giveaway";
  const end = g.endDate && now && !g.upcoming ? remaining(g.endDate, now, t) : null;

  return (
    <a
      href={g.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`game-card${g.upcoming ? " game-card--upcoming" : ""}`}
    >
      <span className="game-card__glow" aria-hidden />
      <div className="game-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={g.image}
          alt=""
          loading="lazy"
          onError={(e) => {
            if (g.imageFallback && e.currentTarget.src !== g.imageFallback) e.currentTarget.src = g.imageFallback;
          }}
        />
        <span className="game-card__store">
          {store.icon && <BrandIcon path={store.icon} />}
          {storeName}
        </span>
        {isGiveaway ? (
          <span className="game-card__badge">{g.kind === "dlc" ? "DLC · −100%" : "−100%"}</span>
        ) : (
          <span className="game-card__badge game-card__badge--muted">{g.kind === "dlc" ? "DLC" : "F2P"}</span>
        )}
      </div>

      <div className="game-card__body">
        <h4 className="game-card__title">{g.title}</h4>
        {g.description && <p className="game-card__desc">{g.description}</p>}

        <div className="game-card__meta">
          <span className="game-card__devices">
            {g.devices.map((d) => (
              <span key={d} title={DEVICES[d].name}>
                {DEVICES[d].icon ? <BrandIcon path={DEVICES[d].icon} /> : DEVICES[d].name}
              </span>
            ))}
          </span>
          {g.modes
            .filter((m) => m !== "online" && m !== "offline")
            .map((m) => (
              <span key={m} className="tag">
                {MODES[m][lang]}
              </span>
            ))}
        </div>

        <div className="game-card__footer">
          {isGiveaway ? (
            <div className="price">
              {g.price ? (
                <span className="price__old">{money(g.price.amount, g.price.currency)}</span>
              ) : g.worthUsd ? (
                <span className="price__old">{money(g.worthUsd, "USD")}</span>
              ) : null}
              <span className="price__now">{money(0, g.price?.currency ?? currency)}</span>
            </div>
          ) : (
            <span className="price__f2p">{g.kind === "dlc" ? t.free : t.freeToPlay}</span>
          )}

          {g.upcoming && g.startDate ? (
            <span className="status-pill status-pill--info" suppressHydrationWarning>
              <CalendarClock size={13} aria-hidden />
              {t.from} {date(g.startDate)}
            </span>
          ) : end ? (
            <span className={`status-pill ${end.urgent ? "status-pill--danger" : "status-pill--warn"}`}>
              <Clock size={13} aria-hidden />
              {t.endsIn} {end.text}
            </span>
          ) : g.endDate ? (
            <span className="status-pill status-pill--warn" suppressHydrationWarning>
              <Clock size={13} aria-hidden />
              {date(g.endDate)}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}
