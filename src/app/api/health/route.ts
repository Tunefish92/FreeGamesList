import { getLastRun, getLastSuccessfulRun } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The daily update runs at 15:00; allow a couple of hours of slack before reporting stale data. */
const MAX_AGE_H = Number(process.env.HEALTH_MAX_AGE_H ?? 26);

/**
 * 200 while the web server is up and the data is fresh, 503 when the last
 * successful update is older than MAX_AGE_H. Pass ?web to only check the server.
 */
export function GET(request: Request) {
  if (new URL(request.url).searchParams.has("web")) return Response.json({ ok: true });

  const lastRun = getLastRun();
  const lastSuccess = getLastSuccessfulRun();
  const ageH = lastSuccess ? (Date.now() - new Date(lastSuccess.startedAt).getTime()) / 3_600_000 : null;
  const fresh = ageH !== null && ageH <= MAX_AGE_H;

  return Response.json(
    {
      ok: fresh,
      lastSuccessfulUpdate: lastSuccess?.finishedAt ?? null,
      dataAgeHours: ageH === null ? null : Math.round(ageH * 10) / 10,
      lastRun: lastRun && {
        status: lastRun.status,
        startedAt: lastRun.startedAt,
        finishedAt: lastRun.finishedAt,
        details: lastRun.details,
      },
    },
    { status: fresh ? 200 : 503 },
  );
}
