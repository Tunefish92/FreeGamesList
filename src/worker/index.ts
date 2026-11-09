import { getLastSuccessfulRun, markInterruptedRuns } from "../lib/db";
import { exportSnapshots } from "./export";
import { runUpdate } from "./update";

/**
 * One worker run, as the GitHub Actions job (.github/workflows/publish.yml) uses it:
 *   node worker.mjs              → fetch all stores now, then export the lists
 *   node worker.mjs --if-stale   → fetch only when the last good update is older than STALE_AFTER_H
 *                                  (a push that only changes the site doesn't refetch everything)
 * Afterwards every stored list is written to OUT_DIR (default public/data) for the static build.
 *
 * Exit code: 0 when the update succeeded or wasn't needed, 1 when it failed or some stores still
 * failed after the retries (the stored lists are exported anyway), 2 when there is no list at all.
 */
const OUT_DIR = process.env.OUT_DIR ?? "public/data";
/** A push refetches when the last good update is older than this (runs are 6 hours apart; e.g. one failed). */
const STALE_AFTER_H = Number(process.env.STALE_AFTER_H ?? 5);

/** Prints a line with a timestamp, like the update log. */
function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

/** Hours since the last successful update; Infinity when there was none. */
function hoursSinceLastSuccess(): number {
  const last = getLastSuccessfulRun();
  return last ? (Date.now() - new Date(last.startedAt).getTime()) / 3_600_000 : Infinity;
}

/** Runs the update when needed, exports the lists and sets the exit code. */
async function main() {
  markInterruptedRuns();

  let ok = true;
  const ageH = hoursSinceLastSuccess();
  if (process.argv.includes("--if-stale") && ageH <= STALE_AFTER_H) {
    log(`Last successful update is ${ageH.toFixed(1)}h old — no update needed`);
  } else {
    ok = await runUpdate();
  }

  const count = exportSnapshots(OUT_DIR);
  log(`Exported ${count} game list(s) to ${OUT_DIR}`);
  if (count === 0) {
    process.exit(2);
  }
  process.exit(ok ? 0 : 1);
}

void main();
