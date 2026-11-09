import { buildPayload, SOURCES, type SourceDef } from "../lib/aggregate";
import { ANY, finishRun, getSourceRows, saveSnapshot, saveSourceError, saveSourceSuccess, startRun } from "../lib/db";
import { clearCache } from "../lib/http";
import type { Lang } from "../lib/i18n";
import { getRegion, REGIONS, type Region } from "../lib/regions";

const LANGS: Lang[] = ["de", "en"];
const RETRY_ATTEMPTS = Number(process.env.RETRY_ATTEMPTS ?? 3);
const RETRY_DELAY_MIN = Number(process.env.RETRY_DELAY_MIN ?? 10);
/** A snapshot with fewer games than this means something is badly wrong (normally ~1500). */
const MIN_GAMES = Number(process.env.MIN_GAMES ?? 100);

interface Task {
  def: SourceDef;
  region: Region | null;
  lang: Lang | null;
}

interface Failure {
  source: string;
  country: string;
  lang: string;
  error: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function configuredRegions(): Region[] {
  const codes = process.env.UPDATE_REGIONS?.split(",").map((c) => c.trim()).filter(Boolean);
  if (!codes?.length) return REGIONS;
  return codes.map((c) => getRegion(c)).filter((r): r is Region => !!r);
}

function describe(t: Task): string {
  return t.region ? `${t.def.id} ${t.region.code}/${t.lang}` : t.def.id;
}

async function runTask(t: Task): Promise<Failure | null> {
  const country = t.region?.code ?? ANY;
  const lang = t.lang ?? ANY;
  try {
    // Global sources ignore the region; any region works as a placeholder.
    const games = await t.def.fetch(t.region ?? REGIONS[0], t.lang ?? "en");
    saveSourceSuccess(t.def.id, country, lang, games);
    return null;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    saveSourceError(t.def.id, country, lang, error);
    log(`  ✗ ${describe(t)}: ${error}`);
    return { source: t.def.id, country, lang, error };
  }
}

/** Runs tasks grouped by region/language, one group after another to stay polite to the store APIs. */
async function runTasks(tasks: Task[]): Promise<Failure[]> {
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    const key = `${t.region?.code ?? ANY}/${t.lang ?? ANY}`;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  const failures: Failure[] = [];
  for (const group of groups.values()) {
    const results = await Promise.all(group.map(runTask));
    failures.push(...results.filter((f): f is Failure => f !== null));
    await sleep(500);
  }
  return failures;
}

/**
 * One full update: fetch every source, retry failures, rebuild all snapshots and verify them.
 * Returns true when everything succeeded.
 */
export async function runUpdate(): Promise<boolean> {
  const started = Date.now();
  const runId = startRun();
  const regions = configuredRegions();
  clearCache();
  log(`Update #${runId} started (${regions.length} regions × ${LANGS.length} languages)`);

  const tasks: Task[] = [
    ...SOURCES.filter((d) => d.scope === "global").map((def) => ({ def, region: null, lang: null })),
    ...regions.flatMap((region) =>
      LANGS.flatMap((lang) => SOURCES.filter((d) => d.scope === "regional").map((def) => ({ def, region, lang }))),
    ),
  ];

  let failures = await runTasks(tasks);
  for (let attempt = 1; failures.length > 0 && attempt <= RETRY_ATTEMPTS; attempt++) {
    log(`${failures.length} task(s) failed — retry ${attempt}/${RETRY_ATTEMPTS} in ${RETRY_DELAY_MIN} min`);
    await sleep(RETRY_DELAY_MIN * 60_000);
    const retry = tasks.filter((t) =>
      failures.some(
        (f) => f.source === t.def.id && f.country === (t.region?.code ?? ANY) && f.lang === (t.lang ?? ANY),
      ),
    );
    failures = await runTasks(retry);
  }

  // Build snapshots from the stored results; failed sources keep their last good data.
  const snapshots: { country: string; lang: string; games: number }[] = [];
  const problems: string[] = [];
  for (const region of regions) {
    for (const lang of LANGS) {
      const payload = buildPayload(getSourceRows(region.code, lang), region);
      if (payload.games.length < MIN_GAMES) {
        problems.push(`${region.code}/${lang}: only ${payload.games.length} games — snapshot not replaced`);
        continue;
      }
      saveSnapshot(payload, lang);
      snapshots.push({ country: region.code, lang, games: payload.games.length });
    }
  }

  const status =
    snapshots.length === 0 ? "failed" : failures.length > 0 || problems.length > 0 ? "partial" : "success";
  const durationSec = Math.round((Date.now() - started) / 1000);
  finishRun(runId, status, { durationSec, tasks: tasks.length, failures, problems, snapshots });

  log(
    `Update #${runId} finished: ${status.toUpperCase()} in ${durationSec}s — ` +
      `${snapshots.length}/${regions.length * LANGS.length} snapshots, ${failures.length} failed task(s)`,
  );
  for (const p of problems) log(`  ! ${p}`);
  return status === "success";
}
