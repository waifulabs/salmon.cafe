import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';
import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '../../data/salmon.db');

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize database with tables
export function initDatabase() {
  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS salmon_state (
      id INTEGER PRIMARY KEY DEFAULT 1,
      hunger REAL NOT NULL DEFAULT 50,
      is_alive INTEGER NOT NULL DEFAULT 1,
      tank_level INTEGER NOT NULL DEFAULT 1,
      days_survived INTEGER NOT NULL DEFAULT 0,
      born_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      last_fed_at INTEGER,
      last_delivery_at INTEGER,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS death_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      died_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      cause TEXT NOT NULL,
      days_survived INTEGER NOT NULL,
      duration_hours REAL NOT NULL,
      final_hunger REAL NOT NULL,
      tank_level INTEGER NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS action_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      hunger_before REAL NOT NULL,
      hunger_after REAL NOT NULL
    );
  `);

  // Initialize salmon state if it doesn't exist
  const existingState = db.select().from(schema.salmonState).where(eq(schema.salmonState.id, 1)).get();
  if (!existingState) {
    db.insert(schema.salmonState).values({
      id: 1,
      hunger: 50,
      isAlive: true,
      tankLevel: 1,
      daysSurvived: 0,
      bornAt: new Date(),
      updatedAt: new Date()
    }).run();
  }
}

export { schema };
