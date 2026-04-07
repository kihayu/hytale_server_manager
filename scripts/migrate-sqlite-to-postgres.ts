#!/usr/bin/env npx ts-node
/**
 * SQLite to PostgreSQL Data Migration Script
 *
 * Usage:
 *   SQLITE_PATH=./data/db/hytale-manager.db \
 *   DATABASE_URL=postgresql://hsm:password@localhost:5432/hytale_manager \
 *   npx ts-node scripts/migrate-sqlite-to-postgres.ts
 *
 * This script reads all data from an existing SQLite database and inserts it
 * into a PostgreSQL database. The PostgreSQL schema must already exist
 * (run `npx prisma migrate deploy` first).
 */

import Database from 'better-sqlite3';
import { Client } from 'pg';

const SQLITE_PATH = process.env.SQLITE_PATH;
const PG_URL = process.env.DATABASE_URL;

if (!SQLITE_PATH) {
  console.error('Error: SQLITE_PATH environment variable is required');
  console.error('Example: SQLITE_PATH=./data/db/hytale-manager.db');
  process.exit(1);
}

if (!PG_URL) {
  console.error('Error: DATABASE_URL environment variable is required');
  console.error('Example: DATABASE_URL=postgresql://hsm:password@localhost:5432/hytale_manager');
  process.exit(1);
}

// Tables in dependency order (parents before children)
const TABLES = [
  'User',
  'Server',
  'Mod',
  'ModFile',
  'Player',
  'ScheduledTask',
  'TaskGroup',
  'TaskGroupMember',
  'TaskGroupExecution',
  'ConsoleLog',
  'ServerMetric',
  'HostMetric',
  'World',
  'Alert',
  'AutomationRule',
  'ServerNetwork',
  'ServerNetworkMember',
  'NetworkBackup',
  'Backup', // After NetworkBackup, AutomationRule, ScheduledTask (FK references)
  'Permission',
  'RolePermission',
  'GlobalSetting',
  'ActivityLog',
  'hytale_downloader_state',
  'ServerUpdateHistory',
];

async function migrate() {
  console.log('=== SQLite to PostgreSQL Migration ===\n');
  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log(`PostgreSQL: ${PG_URL!.replace(/\/\/.*@/, '//***@')}\n`);

  // Connect to SQLite
  const sqlite = new Database(SQLITE_PATH!);
  sqlite.pragma('journal_mode = WAL');

  // Connect to PostgreSQL
  const pg = new Client({ connectionString: PG_URL });
  await pg.connect();
  console.log('Connected to both databases.\n');

  let totalRows = 0;

  try {
    // Disable FK constraints temporarily for bulk insert
    await pg.query('SET session_replication_role = replica;');

    for (const table of TABLES) {
      // Check if table exists in SQLite
      const tableExists = sqlite
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
        .get(table);

      if (!tableExists) {
        console.log(`  [SKIP] ${table} — not found in SQLite`);
        continue;
      }

      const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];

      if (rows.length === 0) {
        console.log(`  [SKIP] ${table} — empty`);
        continue;
      }

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const quotedColumns = columns.map((c) => `"${c}"`).join(', ');
      const insertSQL = `INSERT INTO "${table}" (${quotedColumns}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      // Identify boolean columns by checking for columns whose values are only 0 or 1
      // across the entire dataset. These are SQLite's representation of booleans.
      const booleanColumns = new Set<string>();
      for (const col of columns) {
        const allBoolean = rows.every(
          (r) => r[col] === 0 || r[col] === 1 || r[col] === null
        );
        // Only flag if at least one row has a 0 or 1 (avoid flagging all-null columns)
        const hasBoolValue = rows.some((r) => r[col] === 0 || r[col] === 1);
        if (allBoolean && hasBoolValue) {
          booleanColumns.add(col);
        }
      }

      let inserted = 0;
      for (const row of rows) {
        const values = columns.map((col) => {
          const val = row[col];
          // Convert SQLite boolean integers (0/1) to JS booleans for PostgreSQL
          if (booleanColumns.has(col) && (val === 0 || val === 1)) {
            return val === 1;
          }
          return val;
        });

        try {
          await pg.query(insertSQL, values);
          inserted++;
        } catch (err: any) {
          console.error(`  [ERROR] ${table} row ${row.id || 'unknown'}: ${err.message}`);
        }
      }

      console.log(`  [OK]   ${table} — ${inserted}/${rows.length} rows migrated`);
      totalRows += inserted;
    }

    // Re-enable FK constraints
    await pg.query('SET session_replication_role = DEFAULT;');
  } finally {
    sqlite.close();
    await pg.end();
  }

  console.log(`\n=== Migration complete: ${totalRows} total rows migrated ===`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
