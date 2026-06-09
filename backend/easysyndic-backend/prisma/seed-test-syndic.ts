import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const testSyndic = {
  fullName: 'Syndic Test EasySyndic',
  email: 'syndic.test@easysyndic.ma',
  phone: '+212600000001',
  password: '12345678',
};

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
    const hashedPassword = await bcrypt.hash(testSyndic.password, 10);

    const user = await prisma.user.upsert({
      where: { email: testSyndic.email },
      update: {
        fullName: testSyndic.fullName,
        phone: testSyndic.phone,
        password: hashedPassword,
        role: UserRole.SYNDIC,
        isActive: true,
      },
      create: {
        fullName: testSyndic.fullName,
        email: testSyndic.email,
        phone: testSyndic.phone,
        password: hashedPassword,
        role: UserRole.SYNDIC,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
      },
    });

    console.log('Test syndic is ready:');
    console.log(user);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Failed to seed test syndic:', error);
  process.exit(1);
});
