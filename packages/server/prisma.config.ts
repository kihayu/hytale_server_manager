import { defineConfig } from 'prisma/config';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const defaultUrl = 'file:./data/db/hytale-manager.db';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? defaultUrl,
  },
  migrate: {
    async adapter(env) {
      return new PrismaBetterSqlite3({ url: env.DATABASE_URL ?? defaultUrl });
    },
  },
});
