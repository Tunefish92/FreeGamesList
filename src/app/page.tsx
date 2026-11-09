import { headers } from "next/headers";
import GameList from "@/components/GameList";
import Pending from "@/components/Pending";
import { toLang } from "@/lib/i18n";
import { regionFromAcceptLanguage } from "@/lib/regions";
import { loadGames } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const acceptLanguage = (await headers()).get("accept-language");
  const lang = toLang(params.lang ?? acceptLanguage?.slice(0, 2));
  const country = params.cc ?? regionFromAcceptLanguage(acceptLanguage)?.code;
  const data = loadGames(country, lang);

  return data ? <GameList data={data} lang={lang} /> : <Pending lang={lang} />;
}
