import { RefreshCw } from "lucide-react";
import type { Lang } from "@/lib/i18n";

const TEXT = {
  de: { title: "Die Spieleliste wird gerade erstellt", hint: "Das erste Update läuft – bitte in ein paar Minuten neu laden." },
  en: { title: "The game list is being built", hint: "The first update is running — please reload in a few minutes." },
};

/** Shown only before the worker has stored its first snapshot. */
export default function Pending({ lang }: { lang: Lang }) {
  const t = TEXT[lang];
  return (
    <div className="app-shell">
      <main className="container empty">
        <RefreshCw aria-hidden />
        <h3>{t.title}</h3>
        <p>{t.hint}</p>
      </main>
    </div>
  );
}
