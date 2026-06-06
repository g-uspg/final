import { PrismaClient } from '../../node_modules/.prisma/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis;

function createClient() {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
    pool.on('connect', (client) => {
      client.query('SET search_path TO grupo3_laboratorios');
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }
  return new PrismaClient();
}

function clientHasLabModels(client) {
  return Boolean(
    client?.asientoLaboratorio?.findMany &&
      client?.cursoLibre?.findMany &&
      client?.facturaMensualLab?.findUnique &&
      client?.blockchainAuditLab?.create
  );
}

function getClient() {
  const cached = globalForPrisma._prismaLaboratoriosClient;
  if (cached && clientHasLabModels(cached)) {
    return cached;
  }
  if (cached?.$disconnect) {
    cached.$disconnect().catch(() => {});
  }
  const fresh = createClient();
  globalForPrisma._prismaLaboratoriosClient = fresh;
  return fresh;
}

const prismaLaboratorios = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

export default prismaLaboratorios;
export { prismaLaboratorios as prisma };
