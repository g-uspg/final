import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createClient() {
  const url = process.env.DATABASE_URL5 ?? process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
    
    // Configurar search_path para incluir grupo1_academico
    pool.on('connect', client => { 
      client.query('SET search_path TO auth, grupo1_academico, grupo5_parqueo'); 
    });
    
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ 
      adapter,
      log: ['error', 'warn']
    });
  }
  return new PrismaClient();
}

const prisma = new Proxy(
  {},
  {
    get(_, prop) {
      if (!globalForPrisma._prismaClient) {
        globalForPrisma._prismaClient = createClient();
      }
      const client = globalForPrisma._prismaClient;
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

export default prisma;
export { prisma };
