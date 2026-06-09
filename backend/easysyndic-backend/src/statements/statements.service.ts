import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  MonthlyStatementStatus,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateMonthlyStatementDto } from './dto/generate-monthly-statement.dto';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class StatementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(
    residenceId: string,
    dto: GenerateMonthlyStatementDto,
    currentUser: AuthUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const existing = await this.prisma.monthlyStatement.findUnique({
      where: {
        residenceId_month_year: {
          residenceId,
          month: dto.month,
          year: dto.year,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Statement already exists for this residence and month/year',
      );
    }

    const paymentsAgg = await this.prisma.payment.aggregate({
      where: {
        residenceId,
        month: dto.month,
        year: dto.year,
        isActive: true,
        status: { in: [PaymentStatus.PAYE, PaymentStatus.PARTIELLEMENT_PAYE] },
      },
      _sum: { amountPaid: true },
    });
    const totalIncome = paymentsAgg._sum.amountPaid ?? 0;

    const expensesAgg = await this.prisma.expenseInvoice.aggregate({
      where: {
        residenceId,
        isActive: true,
        status: InvoiceStatus.PAYEE,
        invoiceDate: {
          gte: new Date(dto.year, dto.month - 1, 1),
          lt: new Date(dto.year, dto.month, 1),
        },
      },
      _sum: { amount: true },
    });
    const totalExpenses = expensesAgg._sum.amount ?? 0;
    const closingBalance = dto.openingBalance + totalIncome - totalExpenses;

    return this.prisma.monthlyStatement.create({
      data: {
        residenceId,
        month: dto.month,
        year: dto.year,
        openingBalance: dto.openingBalance,
        totalIncome,
        totalExpenses,
        closingBalance,
        generatedById: currentUser.id,
        status: MonthlyStatementStatus.GENERATED,
      },
    });
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);
    return this.prisma.monthlyStatement.findMany({
      where: { residenceId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async findOne(id: string, currentUser: AuthUser) {
    const statement = await this.prisma.monthlyStatement.findUnique({
      where: { id },
    });
    if (!statement)
      throw new NotFoundException(`Statement with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(statement.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      statement.generatedById,
    );
    return statement;
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
    if (currentUser.role === UserRole.CASHIER) {
      // TODO: replace with cashier-residence assignment table check when available.
      if (!createdById || createdById === currentUser.id) return;
    }
    throw new ForbiddenException('You can only access allowed financial data');
  }
}
