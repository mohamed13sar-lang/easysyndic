import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { Pool } from 'pg';

const phone = '+212707704133';
const email = 'mohamed.resident.test@easysyndic.ma';

function normalizeConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');
  return url.toString();
}

async function main() {
  const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DIRECT_URL or DATABASE_URL must be set');
  }

  const pool = new Pool({
    connectionString: normalizeConnectionString(databaseUrl),
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  try {
    const user = await prisma.user.upsert({
      where: { phone },
      update: {
        fullName: 'Mohamed Sarghini',
        email,
        role: UserRole.RESIDENT,
        isActive: true,
      },
      create: {
        fullName: 'Mohamed Sarghini',
        phone,
        email,
        role: UserRole.RESIDENT,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    console.log('Test resident is ready:');
    console.log(user);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Failed to seed test resident:', error);
  process.exit(1);
});
