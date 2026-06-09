import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ResidentType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AssignApartmentDto } from './dto/assign-apartment.dto';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentApartmentStatusDto } from './dto/update-resident-apartment-status.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@Injectable()
export class ResidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    residenceId: string,
    createResidentDto: CreateResidentDto,
    currentUser: AuthenticatedUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const apartment = await this.getApartmentOrThrow(
      createResidentDto.apartmentId,
    );
    if (apartment.residenceId !== residenceId) {
      throw new ConflictException(
        'Apartment does not belong to this residence',
      );
    }

    const existingByPhone = await this.prisma.user.findUnique({
      where: { phone: createResidentDto.phone },
    });

    if (existingByPhone) {
      if (existingByPhone.role !== UserRole.RESIDENT) {
        throw new ConflictException(
          'Phone already exists for a non-resident user',
        );
      }
      await this.ensureResidentNotAssigned(existingByPhone.id, apartment.id);
      const link = await this.createResidentApartmentLink(
        existingByPhone.id,
        apartment.id,
        residenceId,
        createResidentDto.residentType,
        createResidentDto.isPrimary,
        createResidentDto.startDate,
      );
      return this.buildResidentResponse(existingByPhone, [link]);
    }

    if (createResidentDto.email) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: createResidentDto.email },
        select: { id: true },
      });
      if (existingByEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    const hashedPassword = createResidentDto.password
      ? await bcrypt.hash(createResidentDto.password, 10)
      : null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          fullName: createResidentDto.fullName,
          phone: createResidentDto.phone,
          email: createResidentDto.email,
          password: hashedPassword,
          role: UserRole.RESIDENT,
          isActive: true,
        },
      });

      const link = await tx.residentApartment.create({
        data: {
          userId: user.id,
          apartmentId: apartment.id,
          residenceId,
          residentType: createResidentDto.residentType,
          isPrimary: createResidentDto.isPrimary ?? true,
          startDate: createResidentDto.startDate
            ? new Date(createResidentDto.startDate)
            : null,
          isActive: true,
        },
      });

      return { user, link };
    });

    return this.buildResidentResponse(result.user, [result.link]);
  }

  async assignApartment(
    residentId: string,
    assignApartmentDto: AssignApartmentDto,
    currentUser: AuthenticatedUser,
  ) {
    const resident = await this.getResidentUserOrThrow(residentId);
    const apartment = await this.getApartmentOrThrow(
      assignApartmentDto.apartmentId,
    );
    const residence = await this.getResidenceOrThrow(apartment.residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    await this.ensureResidentNotAssigned(resident.id, apartment.id);

    return this.createResidentApartmentLink(
      resident.id,
      apartment.id,
      residence.id,
      assignApartmentDto.residentType,
      assignApartmentDto.isPrimary,
      assignApartmentDto.startDate,
    );
  }

  async assignApartmentInResidence(
    residenceId: string,
    residentId: string,
    assignApartmentDto: AssignApartmentDto,
    currentUser: AuthenticatedUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const apartment = await this.getApartmentOrThrow(
      assignApartmentDto.apartmentId,
    );
    if (apartment.residenceId !== residenceId) {
      throw new ConflictException(
        'Apartment does not belong to this residence',
      );
    }

    return this.assignApartment(residentId, assignApartmentDto, currentUser);
  }

  async findByResidence(residenceId: string, currentUser: AuthenticatedUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const links = await this.prisma.residentApartment.findMany({
      where: { residenceId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return this.groupResidentLinks(links);
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const resident = await this.getResidentUserOrThrow(id);
    const links = await this.prisma.residentApartment.findMany({
      where: { userId: id },
      include: { apartment: { select: { id: true, residenceId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (currentUser.role === UserRole.SYNDIC) {
      const accessible = await this.hasSyndicAccessToAnyLink(
        currentUser.id,
        links,
      );
      if (!accessible) {
        throw new ForbiddenException(
          'You can only access residents in your own residences',
        );
      }
    }

    return this.buildResidentResponse(
      resident,
      links.map((l) => this.stripApartmentFromLink(l)),
    );
  }

  async update(
    id: string,
    updateResidentDto: UpdateResidentDto,
    currentUser: AuthenticatedUser,
  ) {
    const resident = await this.getResidentUserOrThrow(id);
    await this.assertResidentAccess(currentUser, id);

    await this.ensureUniqueResidentFields(
      updateResidentDto.phone,
      updateResidentDto.email,
      id,
    );

    const updated = await this.prisma.user.update({
      where: { id: resident.id },
      data: {
        fullName: updateResidentDto.fullName,
        phone: updateResidentDto.phone,
        email: updateResidentDto.email,
        isActive: updateResidentDto.isActive,
      },
    });

    const links = await this.prisma.residentApartment.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    });

    return this.buildResidentResponse(updated, links);
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const resident = await this.getResidentUserOrThrow(id);
    await this.assertResidentAccess(currentUser, id);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resident.id },
        data: { isActive: false },
      }),
      this.prisma.residentApartment.updateMany({
        where: { userId: resident.id },
        data: { isActive: false },
      }),
    ]);

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: resident.id },
    });
    const links = await this.prisma.residentApartment.findMany({
      where: { userId: resident.id },
      orderBy: { createdAt: 'desc' },
    });

    return this.buildResidentResponse(updated, links);
  }

  async findByApartment(apartmentId: string, currentUser: AuthenticatedUser) {
    const apartment = await this.getApartmentOrThrow(apartmentId);
    const residence = await this.getResidenceOrThrow(apartment.residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const links = await this.prisma.residentApartment.findMany({
      where: { apartmentId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return this.groupResidentLinks(links);
  }

  async updateResidentApartmentStatus(
    id: string,
    updateDto: UpdateResidentApartmentStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const link = await this.prisma.residentApartment.findUnique({
      where: { id },
      include: { residence: { select: { syndicId: true } } },
    });

    if (!link) {
      throw new NotFoundException(
        `Resident apartment link with id "${id}" not found`,
      );
    }

    this.assertResidenceAccess(currentUser, link.residence.syndicId);

    return this.prisma.residentApartment.update({
      where: { id },
      data: { isActive: updateDto.isActive },
    });
  }

  private async createResidentApartmentLink(
    userId: string,
    apartmentId: string,
    residenceId: string,
    residentType: ResidentType,
    isPrimary?: boolean,
    startDate?: string,
  ) {
    try {
      return await this.prisma.residentApartment.create({
        data: {
          userId,
          apartmentId,
          residenceId,
          residentType,
          isPrimary: isPrimary ?? true,
          startDate: startDate ? new Date(startDate) : null,
          isActive: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Resident is already assigned to this apartment',
        );
      }
      throw error;
    }
  }

  private async getResidenceOrThrow(id: string) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
      select: { id: true, syndicId: true },
    });
    if (!residence) {
      throw new NotFoundException(`Residence with id "${id}" not found`);
    }
    return residence;
  }

  private async getApartmentOrThrow(id: string) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      select: { id: true, residenceId: true },
    });
    if (!apartment) {
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    }
    return apartment;
  }

  private async getResidentUserOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== UserRole.RESIDENT) {
      throw new NotFoundException(`Resident with id "${id}" not found`);
    }
    return user;
  }

  private async ensureResidentNotAssigned(userId: string, apartmentId: string) {
    const existing = await this.prisma.residentApartment.findUnique({
      where: { userId_apartmentId: { userId, apartmentId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Resident is already assigned to this apartment',
      );
    }
  }

  private assertResidenceAccess(
    currentUser: AuthenticatedUser,
    syndicId: string,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (currentUser.role === UserRole.SYNDIC && syndicId === currentUser.id) {
      return;
    }
    throw new ForbiddenException(
      'You can only manage residents in your own residences',
    );
  }

  private async assertResidentAccess(
    currentUser: AuthenticatedUser,
    residentId: string,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) {
      return;
    }

    const links = await this.prisma.residentApartment.findMany({
      where: { userId: residentId },
      select: { residence: { select: { syndicId: true } } },
    });

    const hasAccess = links.some(
      (link) => link.residence.syndicId === currentUser.id,
    );
    if (!hasAccess) {
      throw new ForbiddenException(
        'You can only manage residents in your own residences',
      );
    }
  }

  private async hasSyndicAccessToAnyLink(
    syndicId: string,
    links: Array<{ apartment: { residenceId: string } }>,
  ) {
    if (links.length === 0) {
      return false;
    }
    const residenceIds = [
      ...new Set(links.map((l) => l.apartment.residenceId)),
    ];
    const accessible = await this.prisma.residence.findFirst({
      where: { id: { in: residenceIds }, syndicId },
      select: { id: true },
    });
    return Boolean(accessible);
  }

  private async ensureUniqueResidentFields(
    phone?: string,
    email?: string,
    excludeId?: string,
  ) {
    if (phone) {
      const existingPhone = await this.prisma.user.findFirst({
        where: {
          phone,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (existingPhone) {
        throw new ConflictException('Phone already exists');
      }
    }

    if (email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: {
          email,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }
  }

  private groupResidentLinks(
    links: Array<
      Prisma.ResidentApartmentGetPayload<{
        include: { user: true };
      }>
    >,
  ) {
    const map = new Map<
      string,
      {
        user: Omit<(typeof links)[number]['user'], 'password'>;
        residentApartments: Array<Omit<(typeof links)[number], 'user'>>;
      }
    >();

    for (const link of links) {
      const userKey = link.user.id;
      if (!map.has(userKey)) {
        map.set(userKey, {
          user: this.sanitizeUser(link.user),
          residentApartments: [],
        });
      }
      map.get(userKey)!.residentApartments.push(this.stripUserFromLink(link));
    }

    return Array.from(map.values()).map((entry) => ({
      ...entry.user,
      residentApartments: entry.residentApartments,
    }));
  }

  private sanitizeUser<T extends { password: string | null }>(
    user: T,
  ): Omit<T, 'password'> {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private stripUserFromLink<T extends { user: unknown }>(
    link: T,
  ): Omit<T, 'user'> {
    const { user: _user, ...safe } = link;
    return safe;
  }

  private stripApartmentFromLink<T extends { apartment: unknown }>(
    link: T,
  ): Omit<T, 'apartment'> {
    const { apartment: _apartment, ...safe } = link;
    return safe;
  }

  private buildResidentResponse(
    user: { password: string | null },
    residentApartments: Array<Record<string, unknown>>,
  ) {
    return {
      ...this.sanitizeUser(user),
      residentApartments,
    };
  }
}
