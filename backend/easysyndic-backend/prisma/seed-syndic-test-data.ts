import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  ResidentType,
  UserRole,
} from '@prisma/client';
import { Pool } from 'pg';

const syndicIdentity = {
  email: 'mohamed.syndic.test@easysyndic.ma',
  phone: '+212707704133',
};

const residenceSeed = {
  name: 'Résidence Test EasySyndic',
  city: 'Casablanca',
  district: 'Maarif',
  address: 'Adresse test Casablanca',
  totalApartments: 8,
};

const apartmentSeeds = [
  { number: 'A-101', floor: 1, block: 'A' },
  { number: 'A-102', floor: 1, block: 'A' },
  { number: 'A-103', floor: 1, block: 'A' },
  { number: 'A-104', floor: 1, block: 'A' },
  { number: 'B-201', floor: 2, block: 'B' },
  { number: 'B-202', floor: 2, block: 'B' },
  { number: 'B-203', floor: 2, block: 'B' },
  { number: 'B-204', floor: 2, block: 'B' },
];

const residentSeeds = [
  {
    fullName: 'Resident Test 01',
    phone: '+212600000101',
    email: 'resident01@easysyndic.ma',
    apartment: 'A-101',
    residentType: ResidentType.OWNER,
    paymentStatus: PaymentStatus.PAYE,
    amountPaid: 500,
  },
  {
    fullName: 'Resident Test 02',
    phone: '+212600000102',
    email: 'resident02@easysyndic.ma',
    apartment: 'A-102',
    residentType: ResidentType.TENANT,
    paymentStatus: PaymentStatus.PAYE,
    amountPaid: 500,
  },
  {
    fullName: 'Resident Test 03',
    phone: '+212600000103',
    email: 'resident03@easysyndic.ma',
    apartment: 'A-103',
    residentType: ResidentType.OWNER,
    paymentStatus: PaymentStatus.PAYE,
    amountPaid: 500,
  },
  {
    fullName: 'Resident Test 04',
    phone: '+212600000104',
    email: 'resident04@easysyndic.ma',
    apartment: 'A-104',
    residentType: ResidentType.TENANT,
    paymentStatus: PaymentStatus.NON_PAYE,
    amountPaid: 0,
  },
  {
    fullName: 'Resident Test 05',
    phone: '+212600000105',
    email: 'resident05@easysyndic.ma',
    apartment: 'B-201',
    residentType: ResidentType.OWNER,
    paymentStatus: PaymentStatus.NON_PAYE,
    amountPaid: 0,
  },
  {
    fullName: 'Resident Test 06',
    phone: '+212600000106',
    email: 'resident06@easysyndic.ma',
    apartment: 'B-202',
    residentType: ResidentType.TENANT,
    paymentStatus: PaymentStatus.NON_PAYE,
    amountPaid: 0,
  },
  {
    fullName: 'Resident Test 07',
    phone: '+212600000107',
    email: 'resident07@easysyndic.ma',
    apartment: 'B-203',
    residentType: ResidentType.OWNER,
    paymentStatus: PaymentStatus.PARTIELLEMENT_PAYE,
    amountPaid: 250,
  },
  {
    fullName: 'Resident Test 08',
    phone: '+212600000108',
    email: 'resident08@easysyndic.ma',
    apartment: 'B-204',
    residentType: ResidentType.TENANT,
    paymentStatus: PaymentStatus.EN_RETARD,
    amountPaid: 0,
  },
];

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
    const syndic =
      (await prisma.user.findUnique({
        where: { email: syndicIdentity.email },
      })) ??
      (await prisma.user.findUnique({
        where: { phone: syndicIdentity.phone },
      }));

    if (!syndic) {
      throw new Error(
        `Syndic user not found by email ${syndicIdentity.email} or phone ${syndicIdentity.phone}`,
      );
    }

    const activeSyndic = await prisma.user.update({
      where: { id: syndic.id },
      data: {
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

    const existingResidence = await prisma.residence.findFirst({
      where: {
        name: residenceSeed.name,
        city: residenceSeed.city,
        syndicId: activeSyndic.id,
      },
      select: { id: true },
    });

    const residence = existingResidence
      ? await prisma.residence.update({
          where: { id: existingResidence.id },
          data: {
            ...residenceSeed,
            syndicId: activeSyndic.id,
            isActive: true,
          },
        })
      : await prisma.residence.create({
          data: {
            ...residenceSeed,
            syndicId: activeSyndic.id,
            isActive: true,
          },
        });

    const apartments = new Map<string, { id: string; number: string }>();
    for (const apartmentSeed of apartmentSeeds) {
      const apartment = await prisma.apartment.upsert({
        where: {
          residenceId_number: {
            residenceId: residence.id,
            number: apartmentSeed.number,
          },
        },
        update: {
          floor: apartmentSeed.floor,
          block: apartmentSeed.block,
          monthlyFee: 500,
          isActive: true,
        },
        create: {
          residenceId: residence.id,
          number: apartmentSeed.number,
          floor: apartmentSeed.floor,
          block: apartmentSeed.block,
          monthlyFee: 500,
          isActive: true,
        },
        select: { id: true, number: true },
      });
      apartments.set(apartment.number, apartment);
    }

    const residents: Array<{
      id: string;
      fullName: string;
      phone: string;
      email: string | null;
      apartment: string;
      residentType: ResidentType;
    }> = [];

    for (const residentSeed of residentSeeds) {
      const apartment = apartments.get(residentSeed.apartment);
      if (!apartment) {
        throw new Error(`Apartment ${residentSeed.apartment} was not created`);
      }

      const emailOwner = await prisma.user.findUnique({
        where: { email: residentSeed.email },
        select: { id: true, phone: true },
      });
      const phoneOwner = await prisma.user.findUnique({
        where: { phone: residentSeed.phone },
        select: { id: true },
      });

      if (emailOwner && emailOwner.phone !== residentSeed.phone) {
        throw new Error(
          `Email ${residentSeed.email} already belongs to phone ${emailOwner.phone}`,
        );
      }

      const resident = phoneOwner
        ? await prisma.user.update({
            where: { id: phoneOwner.id },
            data: {
              fullName: residentSeed.fullName,
              email: residentSeed.email,
              role: UserRole.RESIDENT,
              isActive: true,
            },
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          })
        : await prisma.user.create({
            data: {
              fullName: residentSeed.fullName,
              phone: residentSeed.phone,
              email: residentSeed.email,
              role: UserRole.RESIDENT,
              isActive: true,
            },
            select: {
              id: true,
              fullName: true,
              phone: true,
              email: true,
            },
          });

      await prisma.residentApartment.upsert({
        where: {
          userId_apartmentId: {
            userId: resident.id,
            apartmentId: apartment.id,
          },
        },
        update: {
          residenceId: residence.id,
          residentType: residentSeed.residentType,
          isPrimary: true,
          isActive: true,
        },
        create: {
          userId: resident.id,
          apartmentId: apartment.id,
          residenceId: residence.id,
          residentType: residentSeed.residentType,
          isPrimary: true,
          isActive: true,
        },
      });

      await prisma.payment.upsert({
        where: {
          apartmentId_month_year: {
            apartmentId: apartment.id,
            month: 6,
            year: 2026,
          },
        },
        update: {
          residentId: resident.id,
          residenceId: residence.id,
          amountDue: 500,
          amountPaid: residentSeed.amountPaid,
          remainingAmount: 500 - residentSeed.amountPaid,
          status: residentSeed.paymentStatus,
          paymentMethod:
            residentSeed.paymentStatus === PaymentStatus.PAYE
              ? PaymentMethod.CASH
              : null,
          paidAt:
            residentSeed.paymentStatus === PaymentStatus.PAYE
              ? new Date('2026-06-07T12:00:00.000Z')
              : null,
          createdById: activeSyndic.id,
          isActive: true,
        },
        create: {
          residenceId: residence.id,
          apartmentId: apartment.id,
          residentId: resident.id,
          amountDue: 500,
          amountPaid: residentSeed.amountPaid,
          remainingAmount: 500 - residentSeed.amountPaid,
          month: 6,
          year: 2026,
          status: residentSeed.paymentStatus,
          paymentMethod:
            residentSeed.paymentStatus === PaymentStatus.PAYE
              ? PaymentMethod.CASH
              : null,
          paidAt:
            residentSeed.paymentStatus === PaymentStatus.PAYE
              ? new Date('2026-06-07T12:00:00.000Z')
              : null,
          createdById: activeSyndic.id,
          isActive: true,
        },
      });

      residents.push({
        ...resident,
        apartment: apartment.number,
        residentType: residentSeed.residentType,
      });
    }

    const paymentsSummary = await prisma.payment.groupBy({
      by: ['status'],
      where: {
        residenceId: residence.id,
        month: 6,
        year: 2026,
        isActive: true,
      },
      _count: { _all: true },
      _sum: { amountPaid: true, remainingAmount: true },
    });

    console.log('Syndic test data is ready:');
    console.log(
      JSON.stringify(
        {
          syndic: activeSyndic,
          residence: {
            id: residence.id,
            name: residence.name,
            city: residence.city,
            district: residence.district,
            address: residence.address,
          },
          apartments: Array.from(apartments.values()),
          residents,
          payments: paymentsSummary,
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
  console.error('Failed to seed syndic test data:', error);
  process.exit(1);
});
