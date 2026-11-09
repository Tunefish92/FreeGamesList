import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Lang } from "./i18n";
import type { Game, GamesPayload } from "./types";

/**
 * Local SQLite cache. The worker writes, the website only reads:
 * - source_data: last successful result per source/region/language (kept when a fetch fails)
 * - snapshots:   finished payload per region/language, served to every visitor
 * - runs:        log of every update run, used for health checks
 */
const DB_PATH = process.env.DB_PATH ?? "./data/freegames.db";

/** Global sources (not region/language dependent) are stored under this key. */
export const ANY = "*";

export interface SourceRow {
  source: string;
  games: Game[];
  fetchedAt: string | null;
  lastError: string | null;
  lastAttempt: string;
}

export interface RunRow {
  id: number;
  startedAt: string;
  finishedAt: string | null;
  status: "running" | "success" | "partial" | "failed";
  details: unknown;
}

let db: DatabaseSync | null = null;

function open(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(/* turbopackIgnore: true */ DB_PATH), { recursive: true });
  db = new DatabaseSync(/* turbopackIgnore: true */ DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS source_data (
      source TEXT NOT NULL,
      country TEXT NOT NULL,
      lang TEXT NOT NULL,
      games TEXT NOT NULL DEFAULT '[]',
      fetched_at TEXT,
      last_error TEXT,
      last_attempt TEXT NOT NULL,
      PRIMARY KEY (source, country, lang)
    );
    CREATE TABLE IF NOT EXISTS snapshots (
      country TEXT NOT NULL,
      lang TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (country, lang)
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      details TEXT
    );
  `);
  return db;
}

/** The website must not create an empty database before the worker has run. */
export function dbExists(): boolean {
  return db !== null || existsSync(/* turbopackIgnore: true */ DB_PATH);
}

// ---------------------------------------------------------------------------
// Worker side
// ---------------------------------------------------------------------------

export function saveSourceSuccess(source: string, country: string, lang: string, games: Game[]): void {
  const now = new Date().toISOString();
  open()
    .prepare(
      `INSERT INTO source_data (source, country, lang, games, fetched_at, last_error, last_attempt)
       VALUES (?, ?, ?, ?, ?, NULL, ?)
       ON CONFLICT (source, country, lang) DO UPDATE SET
         games = excluded.games, fetched_at = excluded.fetched_at, last_error = NULL, last_attempt = excluded.last_attempt`,
    )
    .run(source, country, lang, JSON.stringify(games), now, now);
}

/** Records a failed fetch but keeps the previously stored games. */
export function saveSourceError(source: string, country: string, lang: string, error: string): void {
  const now = new Date().toISOString();
  open()
    .prepare(
      `INSERT INTO source_data (source, country, lang, last_error, last_attempt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (source, country, lang) DO UPDATE SET last_error = excluded.last_error, last_attempt = excluded.last_attempt`,
    )
    .run(source, country, lang, error, now);
}

export function getSourceRows(country: string, lang: string): SourceRow[] {
  const rows = open()
    .prepare(
      `SELECT source, games, fetched_at, last_error, last_attempt FROM source_data
       WHERE (country = ? AND lang = ?) OR (country = ? AND lang = ?)`,
    )
    .all(country, lang, ANY, ANY) as Record<string, string | null>[];
  return rows.map((r) => ({
    source: r.source!,
    games: JSON.parse(r.games ?? "[]") as Game[],
    fetchedAt: r.fetched_at,
    lastError: r.last_error,
    lastAttempt: r.last_attempt!,
  }));
}

export function saveSnapshot(payload: GamesPayload, lang: Lang): void {
  open()
    .prepare(
      `INSERT INTO snapshots (country, lang, payload, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (country, lang) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
    )
    .run(payload.country, lang, JSON.stringify(payload), payload.updatedAt);
}

export function startRun(): number {
  const result = open()
    .prepare(`INSERT INTO runs (started_at, status) VALUES (?, 'running')`)
    .run(new Date().toISOString());
  return Number(result.lastInsertRowid);
}

/** Runs still "running" when the worker starts were interrupted (crash, container restart). */
export function markInterruptedRuns(): void {
  open()
    .prepare(`UPDATE runs SET status = 'failed', finished_at = ?, details = '{"error":"interrupted"}' WHERE status = 'running'`)
    .run(new Date().toISOString());
}

export function finishRun(id: number, status: RunRow["status"], details: unknown): void {
  open()
    .prepare(`UPDATE runs SET finished_at = ?, status = ?, details = ? WHERE id = ?`)
    .run(new Date().toISOString(), status, JSON.stringify(details), id);
}

// ---------------------------------------------------------------------------
// Website side (read only)
// ---------------------------------------------------------------------------

export function getSnapshot(country: string, lang: Lang): GamesPayload | null {
  if (!dbExists()) return null;
  const row = open().prepare(`SELECT payload FROM snapshots WHERE country = ? AND lang = ?`).get(country, lang) as
    | { payload: string }
    | undefined;
  return row ? (JSON.parse(row.payload) as GamesPayload) : null;
}

function toRun(r: Record<string, string | number | null> | undefined): RunRow | null {
  if (!r) return null;
  return {
    id: Number(r.id),
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null,
    status: r.status as RunRow["status"],
    details: r.details ? JSON.parse(String(r.details)) : null,
  };
}

export function getLastRun(): RunRow | null {
  if (!dbExists()) return null;
  return toRun(open().prepare(`SELECT * FROM runs ORDER BY id DESC LIMIT 1`).get() as Record<string, string>);
}

export function getLastSuccessfulRun(): RunRow | null {
  if (!dbExists()) return null;
  return toRun(
    open().prepare(`SELECT * FROM runs WHERE status = 'success' ORDER BY id DESC LIMIT 1`).get() as Record<string, string>,
  );
}
