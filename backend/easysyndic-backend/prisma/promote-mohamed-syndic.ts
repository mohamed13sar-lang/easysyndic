import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';

const targetUser = {
  fullName: 'Mohamed Sarghini',
  phone: '+212707704133',
  email: 'mohamed.syndic.test@easysyndic.ma',
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
    const existingUser = await prisma.user.findUnique({
      where: { phone: targetUser.phone },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        residentApartments: {
          select: {
            id: true,
            apartmentId: true,
            residenceId: true,
            residentType: true,
            isPrimary: true,
            isActive: true,
            apartment: {
              select: {
                number: true,
                floor: true,
                block: true,
              },
            },
            residence: {
              select: {
                name: true,
                city: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!existingUser) {
      throw new Error(
        `User with phone ${targetUser.phone} was not found. No user was created.`,
      );
    }

    const emailOwner = await prisma.user.findUnique({
      where: { email: targetUser.email },
      select: { id: true, phone: true, email: true },
    });

    if (emailOwner && emailOwner.id !== existingUser.id) {
      throw new Error(
        `Email ${targetUser.email} is already used by user ${emailOwner.id} (${emailOwner.phone}).`,
      );
    }

    const hashedPassword = await bcrypt.hash(targetUser.password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: targetUser.fullName,
        phone: targetUser.phone,
        email: targetUser.email,
        password: hashedPassword,
        role: UserRole.SYNDIC,
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

    console.log('Mohamed syndic account updated safely:');
    console.log(
      JSON.stringify(
        {
          oldRole: existingUser.role,
          newRole: updatedUser.role,
          user: updatedUser,
          residentApartmentLinks: existingUser.residentApartments,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Failed to promote Mohamed Sarghini to syndic:', error);
  process.exit(1);
});
