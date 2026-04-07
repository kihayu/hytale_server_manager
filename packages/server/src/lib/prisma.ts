import { PrismaClient } from '@prisma/client';

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export { createPrismaClient };
