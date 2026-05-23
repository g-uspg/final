import { prisma } from '../src/lib/prisma.js';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  `;
  console.log('Tables found:', tables.map(t => t.table_name).join(', '));

  await prisma.$disconnect();
}

main();
