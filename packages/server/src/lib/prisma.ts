import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export { createPrismaClient };
