import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Salmon state table - stores the current state of the salmon
export const salmonState = sqliteTable('salmon_state', {
  id: integer('id').primaryKey().default(1),
  hunger: real('hunger').notNull().default(50), // 0-100, 0 = starving, 100 = overfed
  isAlive: integer('is_alive', { mode: 'boolean' }).notNull().default(true),
  tankLevel: integer('tank_level').notNull().default(1), // Tank upgrades
  daysSurvived: integer('days_survived').notNull().default(0),
  bornAt: integer('born_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  lastFedAt: integer('last_fed_at', { mode: 'timestamp' }),
  lastDeliveryAt: integer('last_delivery_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`)
});

// Death history table - tracks all deaths
export const deathHistory = sqliteTable('death_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  diedAt: integer('died_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  cause: text('cause').notNull(), // 'starvation', 'overfeeding', 'neglect'
  daysSurvived: integer('days_survived').notNull(),
  durationHours: real('duration_hours').notNull(),
  finalHunger: real('final_hunger').notNull(),
  tankLevel: integer('tank_level').notNull()
});

// Action log table - tracks all user actions
export const actionLog = sqliteTable('action_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  action: text('action').notNull(), // 'feed', 'order'
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s', 'now'))`),
  hungerBefore: real('hunger_before').notNull(),
  hungerAfter: real('hunger_after').notNull()
});
