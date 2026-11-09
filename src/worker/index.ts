import { Cron } from "croner";
import { getLastSuccessfulRun, markInterruptedRuns } from "../lib/db";
import { runUpdate } from "./update";

/**
 * Background worker: the only process that talks to the store APIs.
 *   node worker.js          → runs on CRON_SCHEDULE (default daily at 15:00)
 *   node worker.js --once   → one update now, exit code 0 on success
 */
const SCHEDULE = process.env.CRON_SCHEDULE ?? "0 15 * * *";
const TIMEZONE = process.env.TZ ?? "Europe/Berlin";
/** Catch up on start when the last good update is older than this (e.g. server was down at 15:00). */
const STALE_AFTER_H = 24;

function log(message: string) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function safeUpdate() {
  try {
    await runUpdate();
  } catch (err) {
    log(`Update crashed: ${err instanceof Error ? err.stack : err}`);
  }
}

async function main() {
  markInterruptedRuns();

  if (process.argv.includes("--once")) {
    const ok = await runUpdate();
    process.exit(ok ? 0 : 1);
  }

  const job = new Cron(SCHEDULE, { timezone: TIMEZONE, protect: true, name: "update" }, safeUpdate);
  log(`Worker started — schedule "${SCHEDULE}" (${TIMEZONE}), next run ${job.nextRun()?.toISOString()}`);

  const last = getLastSuccessfulRun();
  const ageH = last ? (Date.now() - new Date(last.startedAt).getTime()) / 3_600_000 : Infinity;
  if (ageH > STALE_AFTER_H) {
    log(last ? `Last successful update is ${ageH.toFixed(1)}h old — updating now` : "No data yet — updating now");
    void safeUpdate();
  }

  const stop = () => {
    log("Worker stopping");
    job.stop();
    process.exit(0);
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

void main();
