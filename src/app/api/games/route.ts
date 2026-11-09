import { NextResponse } from "next/server";
import { toLang } from "@/lib/i18n";
import { loadGames } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const payload = loadGames(params.get("cc") ?? undefined, toLang(params.get("lang")));
  if (!payload) return NextResponse.json({ error: "No data yet — first update still running" }, { status: 503 });
  return NextResponse.json(payload);
}
