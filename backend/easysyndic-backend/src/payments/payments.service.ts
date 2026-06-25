import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PaymentStatus,
  PaymentTransactionSource,
  PaymentTransactionStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  STORAGE_BUCKETS,
  STORAGE_LIMITS,
} from '../storage/storage.constants';
import { StorageService } from '../storage/storage.service';
import { TeamPermissionsService } from '../team/team-permissions.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { DeclarePaymentDto } from './dto/declare-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

type AuthUser = {
  id: string;
  role: UserRole;
  permissionChecked?: { residenceId: string };
};
type PaymentSummaryStatus = 'DEBT' | 'BALANCED' | 'CREDIT';
const PAYMENT_NOT_FOUND = 'Paiement introuvable ou non autorisé';
const TRANSACTIONS_UNAVAILABLE =
  'Historique des versements indisponible tant que la migration PaymentTransaction n’est pas appliquée';

export function normalizePayment(
  rawAmountDue: unknown,
  rawAmountPaid: unknown,
  requestedStatus?: PaymentStatus,
  rawDueDate?: unknown,
) {
  const amountDue = toSafeNumber(rawAmountDue);
  const amountPaid = toSafeNumber(rawAmountPaid);
  const dueDate = toOptionalDate(rawDueDate);
  const isOverdue = Boolean(
    dueDate && dueDate.getTime() < startOfToday().getTime(),
  );
  let remainingAmount = Math.max(amountDue - amountPaid, 0);
  let status: PaymentStatus;

  if (requestedStatus === PaymentStatus.EXONERE) {
    status = PaymentStatus.EXONERE;
    remainingAmount = 0;
  } else if (amountPaid >= amountDue) {
    status = PaymentStatus.PAYE;
    remainingAmount = 0;
  } else if (isOverdue) {
    status = PaymentStatus.EN_RETARD;
  } else if (amountPaid > 0) {
    status = PaymentStatus.PARTIELLEMENT_PAYE;
  } else {
    status = PaymentStatus.NON_PAYE;
  }

  return {
    amountDue,
    amountPaid,
    remainingAmount,
    status,
  };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function toOptionalDate(value: unknown) {
  if (!value) return null;
  const parsed =
    value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : null;
  if (!parsed) return null;
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toSafeNumber(value: unknown) {
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

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly permissionsService: TeamPermissionsService,
    private readonly storage: StorageService,
  ) {}

  async findMyPayments(
    currentUser: AuthUser,
    filters: { residenceId?: string; apartmentId?: string },
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (!filters.residenceId || !filters.apartmentId) {
      throw new ForbiddenException('residenceId and apartmentId are required');
    }

    await this.ensureResidentAssignment(
      currentUser.id,
      filters.apartmentId,
      filters.residenceId,
    );

    try {
      const payments = await this.prisma.payment.findMany({
        where: {
          residentId: currentUser.id,
          residenceId: filters.residenceId,
          apartmentId: filters.apartmentId,
          isActive: true,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: {
          id: true,
          month: true,
          year: true,
          dueDate: true,
          amountDue: true,
          amountPaid: true,
          remainingAmount: true,
          status: true,
          paidAt: true,
          paymentMethod: true,
          receiptUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      const transactionsByPaymentId = await this.findTransactionsByPaymentIds(
        payments.map((payment) => payment.id),
      );

      return payments.map((payment) =>
        this.toMyPaymentListResponse({
          ...payment,
          ...(transactionsByPaymentId
            ? { transactions: transactionsByPaymentId.get(payment.id) ?? [] }
            : {}),
        }),
      );
    } catch (error) {
      this.logPaymentReadError('findMyPayments', error, {
        userId: currentUser.id,
        residenceId: filters.residenceId,
        apartmentId: filters.apartmentId,
      });
      throw new InternalServerErrorException(
        'Impossible de charger vos paiements pour le moment',
      );
    }
  }

  async findMyPayment(paymentId: string, currentUser: AuthUser) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        residence: { select: { id: true, name: true } },
        apartment: {
          select: { id: true, number: true, block: true, floor: true },
        },
      },
    });

    if (!payment || !payment.isActive) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const ownsPayment = payment.residentId === currentUser.id;
    const hasActiveApartmentRelation = await this.hasResidentAssignment(
      currentUser.id,
      payment.apartmentId,
      payment.residenceId,
    );

    if (!ownsPayment && !hasActiveApartmentRelation) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds([
      payment.id,
    ]);

    return this.toMyPaymentDetailResponse({
      ...payment,
      ...(transactionsByPaymentId
        ? { transactions: transactionsByPaymentId.get(payment.id) ?? [] }
        : {}),
    });
  }

  async findMyPaymentsSummary(
    currentUser: AuthUser,
    filters: { residenceId?: string; apartmentId?: string },
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    if (!filters.residenceId || !filters.apartmentId) {
      throw new ForbiddenException('residenceId and apartmentId are required');
    }

    await this.ensureResidentAssignment(
      currentUser.id,
      filters.apartmentId,
      filters.residenceId,
    );

    const payments = await this.prisma.payment.findMany({
      where: {
        residentId: currentUser.id,
        residenceId: filters.residenceId,
        apartmentId: filters.apartmentId,
        isActive: true,
      },
      select: {
        id: true,
        month: true,
        year: true,
        amountDue: true,
        amountPaid: true,
        dueDate: true,
        status: true,
      },
    });

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds(
      payments.map((payment) => payment.id),
    );

    const totals = payments.reduce(
      (summary, payment) => {
        const amountPaid = transactionsByPaymentId
          ? this.sumValidatedTransactionResponses(
              transactionsByPaymentId.get(payment.id) ?? [],
            )
          : this.toNumber(payment.amountPaid);
        const normalized = normalizePayment(
          payment.amountDue,
          amountPaid,
          payment.status,
          payment.dueDate,
        );

        if (
          normalized.status !== PaymentStatus.EXONERE &&
          this.isDueCountable(payment)
        ) {
          summary.amountDueTotal += normalized.amountDue;
        }

        summary.amountPaidTotal += normalized.amountPaid;
        return summary;
      },
      { amountDueTotal: 0, amountPaidTotal: 0 },
    );

    const balance = totals.amountPaidTotal - totals.amountDueTotal;
    const status: PaymentSummaryStatus =
      balance < 0 ? 'DEBT' : balance > 0 ? 'CREDIT' : 'BALANCED';

    return {
      amountDueTotal: totals.amountDueTotal,
      amountPaidTotal: totals.amountPaidTotal,
      balance,
      remainingToPay: Math.max(-balance, 0),
      creditBalance: Math.max(balance, 0),
      status,
    };
  }

  async create(
    residenceId: string,
    dto: CreatePaymentDto,
    currentUser: AuthUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const apartment = await this.prisma.apartment.findUnique({
      where: { id: dto.apartmentId },
    });
    if (!apartment || apartment.residenceId !== residenceId) {
      throw new NotFoundException(
        'Appartement introuvable dans cette résidence',
      );
    }

    const resident = await this.prisma.user.findUnique({
      where: { id: dto.residentId },
    });
    if (
      !resident ||
      resident.role !== UserRole.RESIDENT ||
      !resident.isActive
    ) {
      throw new NotFoundException('Résident introuvable');
    }

    const link = await this.prisma.residentApartment.findFirst({
      where: {
        userId: dto.residentId,
        apartmentId: dto.apartmentId,
        residenceId,
        isActive: true,
      },
      select: { id: true },
    });
    if (!link) {
      throw new ConflictException('Résident non associé à cet appartement');
    }

    const existing = await this.prisma.payment.findUnique({
      where: {
        apartmentId_month_year: {
          apartmentId: dto.apartmentId,
          month: dto.month,
          year: dto.year,
        },
      },
      select: { id: true },
    });
    if (existing) {
      const initialPaid = this.toNumber(dto.amountPaid);
      if (initialPaid > 0) {
        return this.addTransaction(
          residenceId,
          existing.id,
          {
            amount: initialPaid,
            paymentMethod: dto.paymentMethod,
            receiptUrl: dto.receiptUrl,
            proofUrl: dto.receiptUrl,
            note: dto.note,
            paidAt: dto.paidAt,
          },
          currentUser,
        );
      }
      return this.findOne(existing.id, currentUser);
    }

    const initialPaid = this.toNumber(dto.amountPaid);
    const dueDate = this.getPaymentDueDate(dto.month, dto.year, dto.dueDate);
    const normalized = normalizePayment(dto.amountDue, 0, dto.status, dueDate);
    const payment = await this.prisma.payment.create({
      data: {
        residenceId,
        apartmentId: dto.apartmentId,
        residentId: dto.residentId,
        amountDue: normalized.amountDue,
        amountPaid: normalized.amountPaid,
        remainingAmount: normalized.remainingAmount,
        month: dto.month,
        year: dto.year,
        dueDate,
        status: normalized.status,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : null,
        createdById: currentUser.id,
        isActive: true,
      },
    });

    if (initialPaid > 0) {
      return this.addTransaction(
        residenceId,
        payment.id,
        {
          amount: initialPaid,
          paymentMethod: dto.paymentMethod,
          receiptUrl: dto.receiptUrl,
          proofUrl: dto.receiptUrl,
          note: dto.note,
          paidAt: dto.paidAt,
        },
        currentUser,
      );
    }

    return this.toPaymentResponse(payment);
  }

  async findTransactionsInResidence(
    residenceId: string,
    paymentId: string,
    currentUser: AuthUser,
  ) {
    await this.getPaymentInResidenceOrThrow(
      residenceId,
      paymentId,
      currentUser,
    );

    try {
      return await this.prisma.paymentTransaction.findMany({
        where: { paymentId, isActive: true },
        orderBy: { paidAt: 'desc' },
      });
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.throwTransactionsUnavailable(
          'findTransactionsInResidence',
          error,
          {
            residenceId,
            paymentId,
          },
        );
      }

      throw error;
    }
  }

  async findPendingDeclarations(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const declarations = await this.prisma.paymentTransaction.findMany({
      where: {
        source: PaymentTransactionSource.RESIDENT_DECLARATION,
        status: PaymentTransactionStatus.PENDING,
        isActive: true,
        payment: { residenceId },
      },
      include: {
        payment: {
          select: {
            id: true,
            month: true,
            year: true,
            residenceId: true,
            apartment: { select: { id: true, number: true, block: true } },
            resident: { select: { id: true, fullName: true, phone: true } },
            paymentProofs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      declarations.map(async (declaration) => {
        const proof = declaration.payment.paymentProofs[0] ?? null;
        const proofSignedUrl =
          proof?.storagePath && this.storage.isConfigured()
            ? await this.storage.createSignedUrl(
                STORAGE_BUCKETS.paymentProofs,
                proof.storagePath,
              )
            : null;

        return {
          id: declaration.id,
          paymentId: declaration.paymentId,
          amount: this.toNumber(declaration.amount),
          paymentMethod: declaration.paymentMethod,
          status: declaration.status,
          note: declaration.note,
          paidAt: declaration.paidAt,
          createdAt: declaration.createdAt,
          proofUrl: proofSignedUrl ?? declaration.proofUrl,
          proofSignedUrl,
          payment: {
            ...declaration.payment,
            paymentProofs: undefined,
          },
        };
      }),
    );
  }

  async addTransaction(
    residenceId: string,
    paymentId: string,
    dto: CreatePaymentTransactionDto,
    currentUser: AuthUser,
  ) {
    await this.getPaymentInResidenceOrThrow(
      residenceId,
      paymentId,
      currentUser,
    );

    const amount = this.toNumber(dto.amount);
    if (amount <= 0) {
      throw new ConflictException('Le montant du versement doit être positif');
    }

    try {
      await this.prisma.paymentTransaction.create({
        data: {
          paymentId,
          amount,
          paymentMethod: dto.paymentMethod,
          source: PaymentTransactionSource.SYNDIC_ENTRY,
          status: PaymentTransactionStatus.VALIDATED,
          receiptUrl: dto.receiptUrl,
          proofUrl: dto.proofUrl ?? dto.receiptUrl,
          note: dto.note,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          validatedAt: new Date(),
          validatedById: currentUser.id,
          createdById: currentUser.id,
          isActive: true,
        },
      });

      const result = await this.recalculatePaymentFromTransactions(paymentId);
      await this.notificationsService.sendPaymentStatusNotification(
        paymentId,
        currentUser.id,
        'VALIDATED',
      );
      return result;
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.throwTransactionsUnavailable('addTransaction', error, {
          residenceId,
          paymentId,
        });
      }

      throw error;
    }
  }

  async declarePayment(
    paymentId: string,
    dto: DeclarePaymentDto,
    currentUser: AuthUser,
    proofFile?: {
      originalname?: string;
      mimetype?: string;
      size?: number;
      buffer?: Buffer;
    },
  ) {
    if (currentUser.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        residenceId: true,
        apartmentId: true,
        residentId: true,
        isActive: true,
      },
    });

    if (!payment || !payment.isActive) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const ownsPayment = payment.residentId === currentUser.id;
    const hasActiveApartmentRelation = await this.hasResidentAssignment(
      currentUser.id,
      payment.apartmentId,
      payment.residenceId,
    );

    if (!ownsPayment && !hasActiveApartmentRelation) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const amount = this.toNumber(dto.amount);
    if (amount <= 0) {
      throw new ConflictException('Le montant du versement doit être positif');
    }

    let proofStoragePath = dto.proofUrl;

    if (proofFile) {
      this.storage.validateFile(proofFile, {
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
        maxSize: STORAGE_LIMITS.image,
        label: 'Justificatif',
      });
      proofStoragePath = this.storage.buildPath(
        ['payments', paymentId, 'proofs'],
        proofFile.originalname,
      );
      await this.storage.uploadPrivateFile(
        STORAGE_BUCKETS.paymentProofs,
        proofStoragePath,
        proofFile,
      );
      await this.prisma.paymentProof.create({
        data: {
          paymentId,
          fileName: proofFile.originalname ?? 'preuve-paiement',
          mimeType: proofFile.mimetype ?? 'application/octet-stream',
          size: proofFile.size ?? proofFile.buffer.length,
          storagePath: proofStoragePath,
          uploadedById: currentUser.id,
        },
      });
    }

    try {
      await this.prisma.paymentTransaction.create({
        data: {
          paymentId,
          amount,
          paymentMethod: dto.paymentMethod,
          source: PaymentTransactionSource.RESIDENT_DECLARATION,
          status: PaymentTransactionStatus.PENDING,
          proofUrl: proofStoragePath,
          receiptUrl: proofStoragePath,
          note: dto.note,
          paidAt: dto.paidAt ? new Date(dto.paidAt) : new Date(),
          createdById: currentUser.id,
          isActive: true,
        },
      });

      const result = await this.findMyPayment(paymentId, currentUser);
      await this.notificationsService.sendPaymentStatusNotification(
        paymentId,
        currentUser.id,
        'PENDING_VALIDATION',
      );
      return result;
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.throwTransactionsUnavailable('declarePayment', error, {
          paymentId,
          userId: currentUser.id,
        });
      }

      throw error;
    }
  }

  async validateTransaction(
    residenceId: string,
    paymentId: string,
    transactionId: string,
    currentUser: AuthUser,
  ) {
    await this.getPaymentInResidenceOrThrow(
      residenceId,
      paymentId,
      currentUser,
    );
    await this.updateTransactionStatus(
      paymentId,
      transactionId,
      PaymentTransactionStatus.VALIDATED,
      currentUser.id,
    );

    const result = await this.recalculatePaymentFromTransactions(paymentId);
    await this.notificationsService.sendPaymentStatusNotification(
      paymentId,
      currentUser.id,
      'VALIDATED',
    );
    return result;
  }

  async rejectTransaction(
    residenceId: string,
    paymentId: string,
    transactionId: string,
    currentUser: AuthUser,
  ) {
    await this.getPaymentInResidenceOrThrow(
      residenceId,
      paymentId,
      currentUser,
    );
    await this.updateTransactionStatus(
      paymentId,
      transactionId,
      PaymentTransactionStatus.REJECTED,
      currentUser.id,
    );

    const result = await this.recalculatePaymentFromTransactions(paymentId);
    await this.notificationsService.sendPaymentStatusNotification(
      paymentId,
      currentUser.id,
      'REJECTED',
    );
    return result;
  }

  async removeTransaction(
    residenceId: string,
    paymentId: string,
    transactionId: string,
    currentUser: AuthUser,
  ) {
    await this.getPaymentInResidenceOrThrow(
      residenceId,
      paymentId,
      currentUser,
    );

    try {
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
        select: { id: true, paymentId: true },
      });

      if (!transaction || transaction.paymentId !== paymentId) {
        throw new NotFoundException(PAYMENT_NOT_FOUND);
      }

      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: { isActive: false },
      });

      return this.recalculatePaymentFromTransactions(paymentId);
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.throwTransactionsUnavailable('removeTransaction', error, {
          residenceId,
          paymentId,
          transactionId,
        });
      }

      throw error;
    }
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);
    const payments = await this.prisma.payment.findMany({
      where: { residenceId, isActive: true },
      orderBy: { createdAt: 'desc' },
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
        dueDate: true,
        status: true,
        paymentMethod: true,
        receiptUrl: true,
        note: true,
        paidAt: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        apartment: {
          select: { id: true, number: true, block: true, floor: true },
        },
        resident: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds(
      payments.map((payment) => payment.id),
    );

    const response = payments.map((payment) =>
      this.toPaymentResponse({
        ...payment,
        ...(transactionsByPaymentId
          ? { transactions: transactionsByPaymentId.get(payment.id) ?? [] }
          : {}),
      }),
    );

    return this.filterPaymentResponses(response, residenceId, currentUser);
  }

  async findNonPaidByResidence(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);
    const payments = await this.prisma.payment.findMany({
      where: {
        residenceId,
        isActive: true,
        status: {
          in: [
            PaymentStatus.NON_PAYE,
            PaymentStatus.PARTIELLEMENT_PAYE,
            PaymentStatus.EN_RETARD,
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
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
        dueDate: true,
        status: true,
        paymentMethod: true,
        receiptUrl: true,
        note: true,
        paidAt: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        apartment: {
          select: { id: true, number: true, block: true, floor: true },
        },
        resident: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds(
      payments.map((payment) => payment.id),
    );

    const response = payments
      .map((payment) =>
        this.toPaymentResponse({
          ...payment,
          ...(transactionsByPaymentId
            ? { transactions: transactionsByPaymentId.get(payment.id) ?? [] }
            : {}),
        }),
      )
      .filter((payment) => this.isUnpaidPaymentResponse(payment));

    return this.filterPaymentResponses(response, residenceId, currentUser);
  }

  async findOne(id: string, currentUser: AuthUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
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
        dueDate: true,
        status: true,
        paymentMethod: true,
        receiptUrl: true,
        note: true,
        paidAt: true,
        isActive: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        apartment: {
          select: { id: true, number: true, block: true, floor: true },
        },
        resident: {
          select: { id: true, fullName: true, email: true, phone: true },
        },
      },
    });
    if (!payment)
      throw new NotFoundException(`Payment with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(payment.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      payment.createdById,
    );

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds([
      payment.id,
    ]);

    const response = this.toPaymentResponse({
      ...payment,
      ...(transactionsByPaymentId
        ? { transactions: transactionsByPaymentId.get(payment.id) ?? [] }
        : {}),
    });

    return this.filterPaymentResponse(
      response,
      payment.residenceId,
      currentUser,
    );
  }

  async update(id: string, dto: UpdatePaymentDto, currentUser: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment)
      throw new NotFoundException(`Payment with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(payment.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      payment.createdById,
    );

    const transactionTotal =
      dto.amountPaid === undefined
        ? ((await this.sumActiveTransactions(id)) ??
          this.toNumber(payment.amountPaid))
        : this.toNumber(dto.amountPaid);
    const dueDate =
      dto.dueDate === undefined
        ? this.getPaymentDueDate(payment.month, payment.year, payment.dueDate)
        : this.getPaymentDueDate(payment.month, payment.year, dto.dueDate);
    const normalized = normalizePayment(
      dto.amountDue ?? payment.amountDue,
      transactionTotal,
      dto.status ?? payment.status,
      dueDate,
    );

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        amountDue: normalized.amountDue,
        amountPaid: normalized.amountPaid,
        remainingAmount: normalized.remainingAmount,
        status: normalized.status,
        dueDate,
        paymentMethod: dto.paymentMethod,
        receiptUrl: dto.receiptUrl,
        note: dto.note,
        paidAt: dto.paidAt ? new Date(dto.paidAt) : undefined,
      },
    });

    const result = this.toPaymentResponse(updatedPayment);
    if (
      dto.status !== undefined ||
      dto.amountPaid !== undefined ||
      normalized.status !== payment.status
    ) {
      await this.notificationsService.sendPaymentStatusNotification(
        id,
        currentUser.id,
        'STATUS_CHANGED',
      );
    }
    return result;
  }

  async updateInResidence(
    residenceId: string,
    paymentId: string,
    dto: UpdatePaymentDto,
    currentUser: AuthUser,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, residenceId: true },
    });

    if (!payment || payment.residenceId !== residenceId) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    return this.update(paymentId, dto, currentUser);
  }

  async updateStatus(
    id: string,
    dto: UpdatePaymentStatusDto,
    currentUser: AuthUser,
  ) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment)
      throw new NotFoundException(`Payment with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(payment.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      payment.createdById,
    );
    const normalized = normalizePayment(
      payment.amountDue,
      payment.amountPaid,
      dto.status,
      payment.dueDate,
    );

    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: {
        amountDue: normalized.amountDue,
        amountPaid: normalized.amountPaid,
        remainingAmount: normalized.remainingAmount,
        status: normalized.status,
      },
    });

    const result = this.toPaymentResponse(updatedPayment);
    await this.notificationsService.sendPaymentStatusNotification(
      id,
      currentUser.id,
      'STATUS_CHANGED',
    );
    return result;
  }

  async remove(id: string, currentUser: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment)
      throw new NotFoundException(`Payment with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(payment.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      payment.createdById,
    );
    const updatedPayment = await this.prisma.payment.update({
      where: { id },
      data: { isActive: false },
    });

    return this.toPaymentResponse(updatedPayment);
  }

  private toNumber(value: unknown) {
    return toSafeNumber(value);
  }

  private getPaymentDueDate(month: number, year: number, rawDueDate?: unknown) {
    const dueDate = toOptionalDate(rawDueDate);
    if (dueDate) return dueDate;
    return new Date(Date.UTC(year, month - 1, 1));
  }

  private isDueCountable(payment: {
    month: number;
    year: number;
    dueDate?: Date | null;
  }) {
    return (
      this.getPaymentDueDate(
        payment.month,
        payment.year,
        payment.dueDate,
      ).getTime() <= startOfToday().getTime()
    );
  }

  private isValidatedTransaction(transaction: {
    status?: PaymentTransactionStatus;
    isActive?: boolean;
  }) {
    return (
      transaction.isActive !== false &&
      (!transaction.status ||
        transaction.status === PaymentTransactionStatus.VALIDATED)
    );
  }

  private async ensureResidentAssignment(
    userId: string,
    apartmentId: string,
    residenceId: string,
  ) {
    const assignment = await this.prisma.residentApartment.findUnique({
      where: { userId_apartmentId: { userId, apartmentId } },
      select: { id: true, residenceId: true, isActive: true },
    });

    if (
      !assignment ||
      assignment.residenceId !== residenceId ||
      !assignment.isActive
    ) {
      throw new ForbiddenException('Résident non associé à cet appartement');
    }
  }

  private async hasResidentAssignment(
    userId: string,
    apartmentId: string,
    residenceId: string,
  ) {
    const assignment = await this.prisma.residentApartment.findFirst({
      where: {
        userId,
        apartmentId,
        residenceId,
        isActive: true,
      },
      select: { id: true },
    });

    return Boolean(assignment);
  }

  private async sumActiveTransactions(paymentId: string) {
    try {
      const aggregate = await this.prisma.paymentTransaction.aggregate({
        where: {
          paymentId,
          isActive: true,
          status: PaymentTransactionStatus.VALIDATED,
        },
        _sum: { amount: true },
      });

      return this.toNumber(aggregate._sum.amount);
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.logPaymentReadError(
          'sumActiveTransactions',
          TRANSACTIONS_UNAVAILABLE,
          { paymentId },
        );
        return null;
      }

      throw error;
    }
  }

  private async findTransactionsByPaymentIds(paymentIds: string[]) {
    const transactionsByPaymentId = new Map<
      string,
      PaymentTransactionResponse[]
    >();

    if (paymentIds.length === 0) {
      return transactionsByPaymentId;
    }

    try {
      const transactions = await this.prisma.paymentTransaction.findMany({
        where: {
          paymentId: { in: paymentIds },
          isActive: true,
        },
        orderBy: { paidAt: 'desc' },
      });

      for (const transaction of transactions) {
        const current =
          transactionsByPaymentId.get(transaction.paymentId) ?? [];
        current.push(transaction);
        transactionsByPaymentId.set(transaction.paymentId, current);
      }
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.logPaymentReadError(
          'findTransactionsByPaymentIds',
          TRANSACTIONS_UNAVAILABLE,
          { paymentIds },
        );
        return null;
      }

      throw error;
    }

    return transactionsByPaymentId;
  }

  private async updateTransactionStatus(
    paymentId: string,
    transactionId: string,
    status: PaymentTransactionStatus,
    validatedById: string,
  ) {
    try {
      const transaction = await this.prisma.paymentTransaction.findUnique({
        where: { id: transactionId },
        select: { id: true, paymentId: true },
      });

      if (!transaction || transaction.paymentId !== paymentId) {
        throw new NotFoundException(PAYMENT_NOT_FOUND);
      }

      await this.prisma.paymentTransaction.update({
        where: { id: transactionId },
        data: {
          status,
          validatedAt: new Date(),
          validatedById,
        },
      });
    } catch (error) {
      if (this.isMissingPaymentTransactionStorageError(error)) {
        this.throwTransactionsUnavailable('updateTransactionStatus', error, {
          paymentId,
          transactionId,
          status,
        });
      }

      throw error;
    }
  }

  private isMissingPaymentTransactionStorageError(error: unknown) {
    const knownError = error as {
      code?: string;
      meta?: { table?: string; modelName?: string };
      message?: string;
    };
    const message = knownError.message ?? '';

    return (
      knownError.code === 'P2021' ||
      knownError.code === 'P2022' ||
      message.includes('PaymentTransaction') ||
      message.includes('payment transaction') ||
      message.includes('paymenttransaction') ||
      message.includes('PaymentTransaction" does not exist') ||
      message.includes('relation "PaymentTransaction" does not exist')
    );
  }

  private logPaymentReadError(
    scope: string,
    error: unknown,
    context?: Record<string, unknown>,
  ) {
    if (process.env.NODE_ENV === 'production') return;

    const message =
      error instanceof Error ? error.stack || error.message : String(error);
    this.logger.error(
      `[${scope}] ${message}${context ? ` ${JSON.stringify(context)}` : ''}`,
    );
  }

  private throwTransactionsUnavailable(
    scope: string,
    error: unknown,
    context?: Record<string, unknown>,
  ): never {
    this.logPaymentReadError(scope, error, context);
    throw new ServiceUnavailableException(TRANSACTIONS_UNAVAILABLE);
  }

  private async recalculatePaymentFromTransactions(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
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
        dueDate: true,
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
    });

    if (!payment) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const transactionsByPaymentId = await this.findTransactionsByPaymentIds([
      paymentId,
    ]);
    const transactions = transactionsByPaymentId?.get(paymentId) ?? [];
    const validatedTransactions = transactions.filter((transaction) =>
      this.isValidatedTransaction(transaction),
    );
    const latestValidatedTransaction = validatedTransactions[0];
    const amountPaid = this.sumValidatedTransactionResponses(transactions);
    const normalized = normalizePayment(
      payment.amountDue,
      amountPaid,
      payment.status,
      payment.dueDate,
    );

    const updatedPayment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        amountPaid: normalized.amountPaid,
        remainingAmount: normalized.remainingAmount,
        status: normalized.status,
        paymentMethod:
          latestValidatedTransaction?.paymentMethod ?? payment.paymentMethod,
        receiptUrl:
          latestValidatedTransaction?.receiptUrl ?? payment.receiptUrl,
        paidAt:
          normalized.amountPaid > 0 ? latestValidatedTransaction?.paidAt : null,
      },
    });

    return this.toPaymentResponse({
      ...updatedPayment,
      transactions,
    });
  }

  private async getPaymentInResidenceOrThrow(
    residenceId: string,
    paymentId: string,
    currentUser: AuthUser,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, residenceId: true, createdById: true },
    });

    if (!payment || payment.residenceId !== residenceId) {
      throw new NotFoundException(PAYMENT_NOT_FOUND);
    }

    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      payment.createdById,
    );

    return payment;
  }

  private async getResidenceOrThrow(id: string) {
    const residence = await this.prisma.residence.findUnique({
      where: { id },
      select: { id: true, syndicId: true },
    });
    if (!residence)
      throw new NotFoundException(`Residence with id "${id}" not found`);
    return residence;
  }

  private assertResidenceAccess(
    currentUser: AuthUser,
    syndicId: string,
    createdById?: string,
  ) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (currentUser.role === UserRole.SYNDIC && syndicId === currentUser.id)
      return;
    if (currentUser.permissionChecked) return;
    if (currentUser.role === UserRole.CASHIER) {
      // TODO: replace with cashier-residence assignment table check when available.
      if (!createdById || createdById === currentUser.id) return;
    }
    throw new ForbiddenException('Accès non autorisé aux données financières');
  }

  private toMyPaymentListResponse(payment: {
    id: string;
    month: number;
    year: number;
    dueDate?: Date | null;
    amountDue: number;
    amountPaid: number;
    remainingAmount: number;
    status: PaymentStatus;
    paidAt: Date | null;
    paymentMethod: unknown;
    receiptUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    transactions?: PaymentTransactionResponse[];
  }) {
    const normalized = normalizePayment(
      payment.amountDue,
      this.getResponseAmountPaid(payment),
      payment.status,
      payment.dueDate,
    );

    return {
      ...payment,
      ...normalized,
      dueDate: this.getPaymentDueDate(
        payment.month,
        payment.year,
        payment.dueDate,
      ),
    };
  }

  private toMyPaymentDetailResponse(payment: {
    id: string;
    residenceId: string;
    apartmentId: string;
    residentId: string;
    month: number;
    year: number;
    dueDate?: Date | null;
    amountDue: number;
    amountPaid: number;
    remainingAmount: number;
    status: PaymentStatus;
    paymentMethod: unknown;
    receiptUrl: string | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    residence: { id: string; name: string };
    apartment: {
      id: string;
      number: string;
      block: string | null;
      floor: number | null;
    };
    transactions?: PaymentTransactionResponse[];
  }) {
    const normalized = normalizePayment(
      payment.amountDue,
      this.getResponseAmountPaid(payment),
      payment.status,
      payment.dueDate,
    );

    return {
      id: payment.id,
      residenceId: payment.residenceId,
      apartmentId: payment.apartmentId,
      residentId: payment.residentId,
      month: payment.month,
      year: payment.year,
      ...normalized,
      paymentMethod: payment.paymentMethod,
      receiptUrl: payment.receiptUrl,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      dueDate: this.getPaymentDueDate(
        payment.month,
        payment.year,
        payment.dueDate,
      ),
      residence: payment.residence,
      apartment: payment.apartment,
      transactions: payment.transactions ?? [],
    };
  }

  private toPaymentResponse(payment: {
    id: string;
    residenceId: string;
    apartmentId: string;
    residentId: string;
    amountDue: number;
    amountPaid: number;
    remainingAmount: number;
    month: number;
    year: number;
    dueDate?: Date | null;
    status: PaymentStatus;
    paymentMethod: unknown;
    receiptUrl: string | null;
    note: string | null;
    paidAt: Date | null;
    isActive: boolean;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
    transactions?: PaymentTransactionResponse[];
  }) {
    const normalized = normalizePayment(
      payment.amountDue,
      this.getResponseAmountPaid(payment),
      payment.status,
      payment.dueDate,
    );

    return {
      ...payment,
      ...normalized,
      dueDate: this.getPaymentDueDate(
        payment.month,
        payment.year,
        payment.dueDate,
      ),
      transactions: payment.transactions ?? [],
    };
  }

  private getResponseAmountPaid(payment: {
    amountPaid: number;
    transactions?: PaymentTransactionResponse[];
  }) {
    if (!payment.transactions) return payment.amountPaid;
    return this.sumValidatedTransactionResponses(payment.transactions);
  }

  private async filterPaymentResponses<T extends Record<string, unknown>>(
    payments: T[],
    residenceId: string,
    currentUser: AuthUser,
  ) {
    return Promise.all(
      payments.map((payment) =>
        this.filterPaymentResponse(payment, residenceId, currentUser),
      ),
    );
  }

  private async filterPaymentResponse<T extends Record<string, unknown>>(
    payment: T,
    residenceId: string,
    currentUser: AuthUser,
  ) {
    if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SYNDIC ||
      currentUser.role === UserRole.RESIDENT
    ) {
      return payment;
    }

    const [canSeeAmount, canSeeProof, canSeeHistory] = await Promise.all([
      this.permissionsService.hasPermission(
        currentUser.id,
        residenceId,
        'payments',
        'viewAmount',
      ),
      this.permissionsService.hasPermission(
        currentUser.id,
        residenceId,
        'payments',
        'viewProofImage',
      ),
      this.permissionsService.hasPermission(
        currentUser.id,
        residenceId,
        'payments',
        'viewHistory',
      ),
    ]);

    const masked = {
      ...payment,
      amountDue: canSeeAmount ? payment.amountDue : null,
      amountPaid: canSeeAmount ? payment.amountPaid : null,
      remainingAmount: canSeeAmount ? payment.remainingAmount : null,
      receiptUrl: canSeeProof ? payment.receiptUrl : null,
      transactions: canSeeHistory
        ? (payment.transactions as unknown[] | undefined)?.map((transaction) =>
            canSeeProof && canSeeAmount
              ? transaction
              : {
                  ...(transaction as Record<string, unknown>),
                  amount: canSeeAmount
                    ? (transaction as Record<string, unknown>).amount
                    : null,
                  receiptUrl: canSeeProof
                    ? (transaction as Record<string, unknown>).receiptUrl
                    : null,
                  proofUrl: canSeeProof
                    ? (transaction as Record<string, unknown>).proofUrl
                    : null,
                },
          )
        : [],
    };

    return masked;
  }

  private sumValidatedTransactionResponses(
    transactions: PaymentTransactionResponse[],
  ) {
    return transactions.reduce(
      (sum, transaction) =>
        this.isValidatedTransaction(transaction)
          ? sum + this.toNumber(transaction.amount)
          : sum,
      0,
    );
  }

  private isUnpaidPaymentResponse(payment: {
    status: PaymentStatus;
    remainingAmount: number;
    dueDate?: Date | null;
    month: number;
    year: number;
  }) {
    return (
      this.isDueCountable(payment) &&
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
}

type PaymentTransactionResponse = {
  id: string;
  paymentId: string;
  amount: number;
  paymentMethod: unknown;
  source?: PaymentTransactionSource;
  status?: PaymentTransactionStatus;
  receiptUrl: string | null;
  proofUrl?: string | null;
  note: string | null;
  paidAt: Date;
  validatedAt?: Date | null;
  validatedById?: string | null;
  createdById: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
