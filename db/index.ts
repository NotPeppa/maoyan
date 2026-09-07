import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const databasePath = resolve(
  /* turbopackIgnore: true */
  process.cwd(),
  process.env.SQLITE_PATH ?? './data/maoyan.db',
);

type DatabaseGlobal = typeof globalThis & { __piaohouDb?: Database.Database };

function openDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  const sqlite = new Database(databasePath);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS monitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      name TEXT NOT NULL,
      venue TEXT,
      show_time TEXT,
      button_text TEXT NOT NULL,
      sale_status INTEGER,
      ticket_status INTEGER,
      available INTEGER NOT NULL DEFAULT 0,
      last_checked_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_error TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_monitors_project_id ON monitors(project_id);
    CREATE INDEX IF NOT EXISTS idx_monitors_last_checked_at ON monitors(last_checked_at);
    CREATE TABLE IF NOT EXISTS status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
      button_text TEXT NOT NULL,
      available INTEGER NOT NULL,
      sale_status INTEGER,
      ticket_status INTEGER,
      checked_at TEXT NOT NULL,
      notification_status TEXT NOT NULL DEFAULT 'skipped',
      notification_error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_status_history_monitor_checked
      ON status_history(monitor_id, checked_at);
  `);

  const columns = sqlite
    .prepare('PRAGMA table_info(status_history)')
    .all() as Array<{ name: string }>;
  const names = new Set(columns.map((column) => column.name));
  const additions = [
    ['sale_status', 'INTEGER'],
    ['ticket_status', 'INTEGER'],
    ['notification_status', "TEXT NOT NULL DEFAULT 'skipped'"],
    ['notification_error', 'TEXT'],
  ] as const;
  for (const [name, definition] of additions) {
    if (!names.has(name))
      sqlite.exec(
        `ALTER TABLE status_history ADD COLUMN ${name} ${definition}`,
      );
  }
  return sqlite;
}

const databaseGlobal = globalThis as DatabaseGlobal;

export function getDb() {
  databaseGlobal.__piaohouDb ??= openDatabase();
  return databaseGlobal.__piaohouDb;
}

export function getDatabasePath() {
  return databasePath;
}
