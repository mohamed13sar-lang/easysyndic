import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ComplaintStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};

@Injectable()
export class ApartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    residenceId: string,
    createApartmentDto: CreateApartmentDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.ensureResidenceAccess(residenceId, currentUser);

    try {
      return await this.prisma.apartment.create({
        data: {
          residenceId,
          number: createApartmentDto.number,
          floor: createApartmentDto.floor,
          block: createApartmentDto.block,
          surface: createApartmentDto.surface,
          monthlyFee: createApartmentDto.monthlyFee,
          isActive: true,
        },
      });
    } catch (error: unknown) {
      this.handleApartmentUniqueError(error);
      throw error;
    }
  }

  async findByResidence(residenceId: string, currentUser: AuthenticatedUser) {
    await this.ensureResidenceAccess(residenceId, currentUser);

    return this.prisma.apartment.findMany({
      where: { residenceId },
      include: this.apartmentCountsInclude(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: {
        residence: { select: { id: true, syndicId: true } },
        ...this.apartmentCountsInclude(),
      },
    });

    if (!apartment) {
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    }

    this.assertResidenceAccess(currentUser, apartment.residence);

    const safeApartment = this.omitProperties(apartment, ['residence']);
    return safeApartment;
  }

  async findOneInResidence(
    residenceId: string,
    apartmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.ensureResidenceAccess(residenceId, currentUser);

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      include: {
        residence: { select: { id: true, syndicId: true } },
        ...this.apartmentCountsInclude(),
      },
    });

    if (!apartment || apartment.residenceId !== residenceId) {
      throw new NotFoundException(
        `Apartment with id "${apartmentId}" not found in this residence`,
      );
    }

    this.assertResidenceAccess(currentUser, apartment.residence);
    const safeApartment = this.omitProperties(apartment, ['residence']);
    return safeApartment;
  }

  async findProfileInResidence(
    residenceId: string,
    apartmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.ensureResidenceAccess(residenceId, currentUser);

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: {
        id: true,
        residenceId: true,
        number: true,
        block: true,
        floor: true,
        surface: true,
        monthlyFee: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        residence: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            district: true,
            syndicId: true,
          },
        },
        residentApartments: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            userId: true,
            apartmentId: true,
            residenceId: true,
            residentType: true,
            isPrimary: true,
            startDate: true,
            endDate: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
        payments: {
          where: { isActive: true },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          select: {
            id: true,
            residenceId: true,
            apartmentId: true,
            residentId: true,
            amountDue: true,
            amountPaid: true,
            remainingAmount: true,
            month: true,
            year: true,
            status: true,
            paymentMethod: true,
            receiptUrl: true,
            note: true,
            paidAt: true,
            isActive: true,
            createdById: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        complaints: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            residenceId: true,
            apartmentId: true,
            residentId: true,
            category: true,
            title: true,
            description: true,
            urgency: true,
            status: true,
            assignedToId: true,
            sentToLhrayfi: true,
            isAnonymous: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            closedAt: true,
            resident: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!apartment || apartment.residenceId !== residenceId) {
      throw new NotFoundException(
        `Apartment with id "${apartmentId}" not found in this residence`,
      );
    }

    this.assertResidenceAccess(currentUser, apartment.residence);

    const payments = apartment.payments.map((payment) =>
      this.toPaymentProfileResponse(payment),
    );
    const unpaidPayments = payments.filter((payment) =>
      this.isUnpaidPayment(payment),
    );
    const openComplaintStatuses: ComplaintStatus[] = [
      ComplaintStatus.NOUVELLE,
      ComplaintStatus.VUE,
      ComplaintStatus.EN_COURS,
      ComplaintStatus.ENVOYEE_LHRAYFI,
      ComplaintStatus.PRESTATAIRE_AFFECTE,
    ];
    const openComplaints = apartment.complaints.filter((complaint) =>
      openComplaintStatuses.includes(complaint.status),
    );

    const latestActivity = [
      ...payments.map((payment) => ({
        id: payment.id,
        type: 'PAYMENT' as const,
        title: `Paiement ${payment.month}/${payment.year}`,
        subtitle: payment.status,
        createdAt: payment.updatedAt,
      })),
      ...apartment.complaints.map((complaint) => ({
        id: complaint.id,
        type: 'COMPLAINT' as const,
        title: complaint.title,
        subtitle: complaint.status,
        createdAt: complaint.updatedAt,
      })),
      ...apartment.residentApartments.map((link) => ({
        id: link.id,
        type: 'RESIDENT' as const,
        title: link.user.fullName,
        subtitle: link.residentType,
        createdAt: link.updatedAt,
      })),
    ]
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )
      .slice(0, 8);

    const totalDue = payments.reduce(
      (sum, payment) =>
        payment.status === PaymentStatus.EXONERE
          ? sum
          : sum + payment.amountDue,
      0,
    );
    const totalPaid = payments.reduce(
      (sum, payment) => sum + payment.amountPaid,
      0,
    );
    const totalRemaining = unpaidPayments.reduce(
      (sum, payment) => sum + payment.remainingAmount,
      0,
    );

    const { residence, residentApartments, complaints } = apartment;
    const apartmentDetails = this.omitProperties(apartment, [
      'residence',
      'residentApartments',
      'payments',
      'complaints',
    ]);

    return {
      apartment: apartmentDetails,
      residence,
      residents: residentApartments,
      payments,
      unpaidPayments,
      complaints,
      statistics: {
        totalDue,
        totalPaid,
        totalRemaining,
        unpaidCount: unpaidPayments.length,
        complaintsCount: complaints.length,
        openComplaintsCount: openComplaints.length,
      },
      latestActivity,
    };
  }

  async update(
    id: string,
    updateApartmentDto: UpdateApartmentDto,
    currentUser: AuthenticatedUser,
  ) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: { residence: { select: { id: true, syndicId: true } } },
    });
    if (!apartment) {
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    }

    this.assertResidenceAccess(currentUser, apartment.residence);

    try {
      return await this.prisma.apartment.update({
        where: { id },
        data: {
          number: updateApartmentDto.number,
          floor: updateApartmentDto.floor,
          block: updateApartmentDto.block,
          surface: updateApartmentDto.surface,
          monthlyFee: updateApartmentDto.monthlyFee,
        },
      });
    } catch (error: unknown) {
      this.handleApartmentUniqueError(error);
      throw error;
    }
  }

  async updateInResidence(
    residenceId: string,
    apartmentId: string,
    updateApartmentDto: UpdateApartmentDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertApartmentBelongsToResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
    return this.update(apartmentId, updateApartmentDto, currentUser);
  }

  async remove(id: string, currentUser: AuthenticatedUser) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: { residence: { select: { id: true, syndicId: true } } },
    });
    if (!apartment) {
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    }

    this.assertResidenceAccess(currentUser, apartment.residence);

    return this.prisma.apartment.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async removeInResidence(
    residenceId: string,
    apartmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertApartmentBelongsToResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
    return this.remove(apartmentId, currentUser);
  }

  async updateStatus(
    id: string,
    updateApartmentStatusDto: UpdateApartmentStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    const apartment = await this.prisma.apartment.findUnique({
      where: { id },
      include: { residence: { select: { id: true, syndicId: true } } },
    });
    if (!apartment) {
      throw new NotFoundException(`Apartment with id "${id}" not found`);
    }

    this.assertResidenceAccess(currentUser, apartment.residence);

    return this.prisma.apartment.update({
      where: { id },
      data: { isActive: updateApartmentStatusDto.isActive },
    });
  }

  async updateStatusInResidence(
    residenceId: string,
    apartmentId: string,
    updateApartmentStatusDto: UpdateApartmentStatusDto,
    currentUser: AuthenticatedUser,
  ) {
    await this.assertApartmentBelongsToResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
    return this.updateStatus(
      apartmentId,
      updateApartmentStatusDto,
      currentUser,
    );
  }

  private apartmentCountsInclude() {
    return {
      _count: {
        select: {
          residentApartments: true,
          payments: true,
        },
      },
    } as const;
  }

  private async assertApartmentBelongsToResidence(
    residenceId: string,
    apartmentId: string,
    currentUser: AuthenticatedUser,
  ) {
    await this.ensureResidenceAccess(residenceId, currentUser);

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: apartmentId },
      select: { id: true, residenceId: true },
    });

    if (!apartment || apartment.residenceId !== residenceId) {
      throw new NotFoundException(
        `Apartment with id "${apartmentId}" not found in this residence`,
      );
    }
  }

  private async ensureResidenceAccess(
    residenceId: string,
    currentUser: AuthenticatedUser,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });

    if (!residence) {
      throw new NotFoundException(
        `Residence with id "${residenceId}" not found`,
      );
    }

    this.assertResidenceAccess(currentUser, residence);
  }

  private assertResidenceAccess(
    currentUser: AuthenticatedUser,
    residence: { id?: string; syndicId: string },
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

    if (
      currentUser.permissionChecked &&
      (!residence.id ||
        currentUser.permissionChecked.residenceId === residence.id)
    ) {
      return;
    }

    throw new ForbiddenException(
      'You can only access apartments in your own residences',
    );
  }

  private toPaymentProfileResponse(payment: {
    id: string;
    residenceId: string;
    apartmentId: string;
    residentId: string;
    amountDue: number;
    amountPaid: number;
    remainingAmount: number;
    month: number;
    year: number;
    status: PaymentStatus;
    paymentMethod: unknown;
    receiptUrl: string | null;
    note: string | null;
    paidAt: Date | null;
    isActive: boolean;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const amountDue = this.toNumber(payment.amountDue);
    const amountPaid = this.toNumber(payment.amountPaid);
    let remainingAmount = Math.max(amountDue - amountPaid, 0);
    let status = payment.status;

    if (status === PaymentStatus.EXONERE) {
      remainingAmount = 0;
    } else if (amountPaid >= amountDue) {
      status = PaymentStatus.PAYE;
      remainingAmount = 0;
    } else if (status === PaymentStatus.EN_RETARD) {
      status = PaymentStatus.EN_RETARD;
    } else if (amountPaid > 0) {
      status = PaymentStatus.PARTIELLEMENT_PAYE;
    } else {
      status = PaymentStatus.NON_PAYE;
    }

    return {
      ...payment,
      amountDue,
      amountPaid,
      remainingAmount,
      status,
    };
  }

  private isUnpaidPayment(payment: {
    status: PaymentStatus;
    remainingAmount: number;
  }) {
    return (
      payment.remainingAmount > 0 &&
      (
        [
          PaymentStatus.NON_PAYE,
          PaymentStatus.PARTIELLEMENT_PAYE,
          PaymentStatus.EN_RETARD,
        ] as PaymentStatus[]
      ).includes(payment.status)
    );
  }

  private toNumber(value: unknown) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(',', '.'));
      return Number.isFinite(parsed) ? parsed : 0;
    }
    if (value && typeof value === 'object' && 'toNumber' in value) {
      const parsed = (value as { toNumber: () => number }).toNumber();
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private handleApartmentUniqueError(error: unknown) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Apartment number already exists in this residence',
      );
    }
  }

  private omitProperties<T extends object, K extends keyof T>(
    object: T,
    keys: readonly K[],
  ): Omit<T, K> {
    const clone = { ...object };
    for (const key of keys) {
      delete clone[key];
    }
    return clone;
  }
}
