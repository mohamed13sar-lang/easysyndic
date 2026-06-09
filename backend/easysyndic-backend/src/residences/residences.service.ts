import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplaintStatus, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResidenceDto } from './dto/create-residence.dto';
import { UpdateResidenceStatusDto } from './dto/update-residence-status.dto';
import { UpdateResidenceDto } from './dto/update-residence.dto';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@Injectable()
export class ResidencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findSyndicResidences(currentUser: AuthenticatedUser) {
    const residences = await this.prisma.residence.findMany({
      where:
        currentUser.role === UserRole.SUPER_ADMIN
          ? undefined
          : { syndicId: currentUser.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            apartments: { where: { isActive: true } },
            residentApartments: { where: { isActive: true } },
            complaints: {
              where: {
                isActive: true,
                status: {
                  in: [
                    ComplaintStatus.NOUVELLE,
                    ComplaintStatus.VUE,
                    ComplaintStatus.EN_COURS,
                    ComplaintStatus.ENVOYEE_LHRAYFI,
                    ComplaintStatus.PRESTATAIRE_AFFECTE,
                  ],
                },
              },
            },
          },
        },
        payments: {
          where: {
            isActive: true,
            status: {
              in: [
                PaymentStatus.NON_PAYE,
                PaymentStatus.PARTIELLEMENT_PAYE,
                PaymentStatus.EN_RETARD,
              ],
            },
          },
          select: {
            amountDue: true,
            amountPaid: true,
          },
        },
      },
    });

    return residences.map((residence) => {
      const unpaidPaymentsAmount = residence.payments.reduce(
        (sum, payment) =>
          sum +
          Math.max(
            Number(payment.amountDue ?? 0) - Number(payment.amountPaid ?? 0),
            0,
          ),
        0,
      );

      return {
        id: residence.id,
        name: residence.name,
        address: residence.address,
        city: residence.city,
        district: residence.district,
        totalApartments: residence.totalApartments,
        isActive: residence.isActive,
        apartmentsCount: residence._count.apartments,
        residentsCount: residence._count.residentApartments,
        openComplaintsCount: residence._count.complaints,
        unpaidPaymentsAmount,
      };
    });
  }

  async create(
    createResidenceDto: CreateResidenceDto,
    currentUser: AuthenticatedUser,
  ) {
    const syndicId = await this.resolveSyndicIdForCreate(
      createResidenceDto,
      currentUser,
    );

    await this.ensureSyndicUser(syndicId);

    return this.prisma.residence.create({
      data: {
        name: createResidenceDto.name,
        address: createResidenceDto.address,
        city: createResidenceDto.city,
        district: createResidenceDto.district,
        syndicId,
        totalApartments: createResidenceDto.totalApartments,
        isActive: true,
      },
    });
  }

  async findAll(currentUser: AuthenticatedUser) {
    return this.prisma.residence.findMany({
      where:
        currentUser.role === UserRole.SUPER_ADMIN
          ? undefined
          : { syndicId: currentUser.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
    });

    if (!residence) {
      throw new NotFoundException(`Résidence avec l'id "${id}" introuvable`);
    }

    this.assertSyndicCanAccessResidence(currentUser, residence);

    return residence;
  }

  async update(
    id: string,
    updateResidenceDto: UpdateResidenceDto,
    currentUser: AuthenticatedUser,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
    });

    if (!residence) {
      throw new NotFoundException(`Résidence avec l'id "${id}" introuvable`);
    }

    this.assertSyndicCanAccessResidence(currentUser, residence);

    return this.prisma.residence.update({
      where: { id },
      data: {
        name: updateResidenceDto.name,
        address: updateResidenceDto.address,
        city: updateResidenceDto.city,
        district: updateResidenceDto.district,
        totalApartments: updateResidenceDto.totalApartments,
      },
    });
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
    });

    if (!residence) {
      throw new NotFoundException(`Résidence avec l'id "${id}" introuvable`);
    }

    this.assertSyndicCanAccessResidence(currentUser, residence);

    return this.prisma.residence.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async updateStatus(
    id: string,
    updateResidenceStatusDto: UpdateResidenceStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
    });

    if (!residence) {
      throw new NotFoundException(`Résidence avec l'id "${id}" introuvable`);
    }

    this.assertSyndicCanAccessResidence(currentUser, residence);

    return this.prisma.residence.update({
      where: { id },
      data: { isActive: updateResidenceStatusDto.isActive },
    });
  }

  private async resolveSyndicIdForCreate(
    createResidenceDto: CreateResidenceDto,
    currentUser: AuthenticatedUser,
  ) {
    if (currentUser.role === UserRole.SYNDIC) {
      return currentUser.id;
    }

    if (currentUser.role === UserRole.SUPER_ADMIN) {
      if (!createResidenceDto.syndicId) {
        throw new BadRequestException(
          'syndicId est obligatoire pour SUPER_ADMIN',
        );
      }

      return createResidenceDto.syndicId;
    }

    throw new ForbiddenException(
      'Vous n’êtes pas autorisé à créer une résidence',
    );
  }

  private async ensureSyndicUser(syndicId: string) {
    const syndicUser = await this.prisma.user.findUnique({
      where: { id: syndicId },
      select: { id: true, role: true },
    });

    if (!syndicUser) {
      throw new NotFoundException(
        `Utilisateur syndic avec l'id "${syndicId}" introuvable`,
      );
    }

    if (syndicUser.role !== UserRole.SYNDIC) {
      throw new BadRequestException(
        'syndicId doit appartenir à un utilisateur SYNDIC',
      );
    }
  }

  private assertSyndicCanAccessResidence(
    currentUser: AuthenticatedUser,
    residence: { syndicId: string },
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (
      currentUser.role === UserRole.SYNDIC &&
      residence.syndicId === currentUser.id
    ) {
      return;
    }

    throw new ForbiddenException(
      'Vous pouvez uniquement accéder à vos propres résidences',
    );
  }
}