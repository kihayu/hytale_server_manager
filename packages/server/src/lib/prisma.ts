import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function createPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? 'file:./data/db/hytale-manager.db';
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export { createPrismaClient };
