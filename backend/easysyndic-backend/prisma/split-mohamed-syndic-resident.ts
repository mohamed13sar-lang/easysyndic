import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PaymentStatus,
  PrismaClient,
  ResidentType,
  UserRole,
} from '@prisma/client';
import { Pool } from 'pg';

const realPhone = '+212707704133';
const syndicEmail = 'mohamed.syndic.test@easysyndic.ma';
const residentEmail = 'mohamed.resident.test@easysyndic.ma';
const neutralSyndicPhones = [
  '+212700000001',
  '+212700000002',
  '+212700000003',
];

function normalizeConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  url.searchParams.delete('uselibpqcompat');
  return url.toString();
}

async function findAvailablePhone(prisma: PrismaClient, currentUserId: string) {
  for (const phone of neutralSyndicPhones) {
    const owner = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });

    if (!owner || owner.id === currentUserId) {
      return phone;
    }
  }

  throw new Error('No neutral syndic test phone is available');
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
    const syndic =
      (await prisma.user.findUnique({
        where: { email: syndicEmail },
      })) ??
      (await prisma.user.findUnique({
        where: { phone: realPhone },
      }));

    if (!syndic) {
      throw new Error(`Syndic user not found by email ${syndicEmail}`);
    }

    const neutralPhone = await findAvailablePhone(prisma, syndic.id);
    const updatedSyndic = await prisma.user.update({
      where: { id: syndic.id },
      data: {
        fullName: 'Mohamed Sarghini',
        email: syndicEmail,
        phone: neutralPhone,
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

    const residence =
      (await prisma.residence.findFirst({
        where: {
          syndicId: updatedSyndic.id,
          city: 'Casablanca',
          address: 'Adresse test Casablanca',
        },
      })) ??
      (await prisma.residence.create({
        data: {
          name: 'Residence Test EasySyndic',
          city: 'Casablanca',
          district: 'Maarif',
          address: 'Adresse test Casablanca',
          syndicId: updatedSyndic.id,
          totalApartments: 9,
          isActive: true,
        },
      }));

    const apartment = await prisma.apartment.upsert({
      where: {
        residenceId_number: {
          residenceId: residence.id,
          number: 'M-001',
        },
      },
      update: {
        floor: 1,
        block: 'M',
        monthlyFee: 500,
        isActive: true,
      },
      create: {
        residenceId: residence.id,
        number: 'M-001',
        floor: 1,
        block: 'M',
        monthlyFee: 500,
        isActive: true,
      },
      select: { id: true, number: true },
    });

    const residentEmailOwner = await prisma.user.findUnique({
      where: { email: residentEmail },
      select: { id: true, phone: true },
    });

    if (residentEmailOwner && residentEmailOwner.phone !== realPhone) {
      throw new Error(
        `Resident email ${residentEmail} is already used by phone ${residentEmailOwner.phone}`,
      );
    }

    const existingResidentByPhone = await prisma.user.findUnique({
      where: { phone: realPhone },
      select: { id: true },
    });

    const resident = existingResidentByPhone
      ? await prisma.user.update({
          where: { id: existingResidentByPhone.id },
          data: {
            fullName: 'Mohamed Sarghini',
            email: residentEmail,
            role: UserRole.RESIDENT,
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
        })
      : await prisma.user.create({
          data: {
            fullName: 'Mohamed Sarghini',
            phone: realPhone,
            email: residentEmail,
            role: UserRole.RESIDENT,
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

    const link = await prisma.residentApartment.upsert({
      where: {
        userId_apartmentId: {
          userId: resident.id,
          apartmentId: apartment.id,
        },
      },
      update: {
        residenceId: residence.id,
        residentType: ResidentType.OWNER,
        isPrimary: true,
        isActive: true,
      },
      create: {
        userId: resident.id,
        apartmentId: apartment.id,
        residenceId: residence.id,
        residentType: ResidentType.OWNER,
        isPrimary: true,
        isActive: true,
      },
      select: {
        id: true,
        residenceId: true,
        apartmentId: true,
        residentType: true,
        isPrimary: true,
        isActive: true,
      },
    });

    const payment = await prisma.payment.upsert({
      where: {
        apartmentId_month_year: {
          apartmentId: apartment.id,
          month: 6,
          year: 2026,
        },
      },
      update: {
        residenceId: residence.id,
        residentId: resident.id,
        amountDue: 500,
        amountPaid: 0,
        remainingAmount: 500,
        status: PaymentStatus.NON_PAYE,
        createdById: updatedSyndic.id,
        isActive: true,
      },
      create: {
        residenceId: residence.id,
        apartmentId: apartment.id,
        residentId: resident.id,
        month: 6,
        year: 2026,
        amountDue: 500,
        amountPaid: 0,
        remainingAmount: 500,
        status: PaymentStatus.NON_PAYE,
        createdById: updatedSyndic.id,
        isActive: true,
      },
      select: {
        id: true,
        month: true,
        year: true,
        status: true,
        amountDue: true,
        amountPaid: true,
        remainingAmount: true,
      },
    });

    console.log('Mohamed syndic/resident accounts are split:');
    console.log(
      JSON.stringify(
        {
          syndic: updatedSyndic,
          resident,
          residence: {
            id: residence.id,
            name: residence.name,
            city: residence.city,
          },
          apartment,
          residentApartment: link,
          payment,
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
  console.error('Failed to split Mohamed syndic/resident accounts:', error);
  process.exit(1);
});
