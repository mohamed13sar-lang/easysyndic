import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyResidences(currentUser: AuthenticatedUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can access this endpoint');
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: currentUser.id },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        residentApartments: {
          orderBy: [
            { isActive: 'desc' },
            { isPrimary: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
                floor: true,
                block: true,
                surface: true,
                monthlyFee: true,
                isActive: true,
              },
            },
            residence: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                district: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    const residences = user.residentApartments.map((link) => ({
      relationId: link.id,
      id: link.residence.id,
      name: link.residence.name,
      address: link.residence.address,
      city: link.residence.city,
      district: link.residence.district,
      isActive: link.residence.isActive,
      residentType: link.residentType,
      isPrimary: link.isPrimary,
      relationIsActive: link.isActive,
      startDate: link.startDate,
      endDate: link.endDate,
      monthlyFee: link.apartment.monthlyFee,
      apartment: link.apartment,
    }));

    const activeRelation =
      residences.find(
        (residence) =>
          residence.relationIsActive &&
          residence.isActive &&
          residence.apartment.isActive,
      ) ?? null;

    const profile = this.omitProperty(user, 'residentApartments');

    return {
      user: profile,
      residences,
      activeRelation,
    };
  }

  private omitProperty<T extends object, K extends keyof T>(
    object: T,
    key: K,
  ): Omit<T, K> {
    const clone = { ...object };
    delete clone[key];
    return clone;
  }
}
