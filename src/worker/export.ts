import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getAllSnapshots, getLastRun, getLastSuccessfulRun } from "../lib/db";

/** What status.json holds: when the lists were last updated and how the newest run went. */
export interface ExportStatus {
  generatedAt: string;
  lastSuccessfulUpdate: string | null;
  lastRun: { status: string; startedAt: string; finishedAt: string | null; details: unknown } | null;
  lists: string[];
}

/**
 * Writes every stored game list to `<outDir>/<CC>-<lang>.json` (what the static site loads) and
 * `<outDir>/status.json` (replaces the old /api/health). The folder is emptied first, so a list
 * that is no longer stored doesn't linger. Returns the number of lists written.
 */
export function exportSnapshots(outDir: string): number {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const lists: string[] = [];
  for (const row of getAllSnapshots()) {
    const name = `${row.country}-${row.lang}`;
    writeFileSync(join(outDir, `${name}.json`), row.payload);
    lists.push(name);
  }

  const lastRun = getLastRun();
  const status: ExportStatus = {
    generatedAt: new Date().toISOString(),
    lastSuccessfulUpdate: getLastSuccessfulRun()?.finishedAt ?? null,
    lastRun: lastRun && {
      status: lastRun.status,
      startedAt: lastRun.startedAt,
      finishedAt: lastRun.finishedAt,
      details: lastRun.details,
    },
    lists,
  };
  writeFileSync(join(outDir, "status.json"), JSON.stringify(status, null, 2));
  return lists.length;
}
