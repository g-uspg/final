import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  const limit = process.env.NODE_ENV === "production" ? "5" : "1";
  const params = `connection_limit=${limit}&pool_timeout=20`;

  if (url.includes("connection_limit=")) {
    return url.replace(/connection_limit=\d+/, `connection_limit=${limit}`);
  }

  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${params}`;
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: process.env.DATABASE_URL
      ? { db: { url: getDatabaseUrl() } }
      : undefined,
  });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
export { prisma };
