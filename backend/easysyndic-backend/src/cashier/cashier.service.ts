import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class CashierService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(
    residenceId: string,
    month: number,
    year: number,
    currentUser: AuthUser,
  ) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });
    if (!residence)
      throw new NotFoundException(
        `Residence with id "${residenceId}" not found`,
      );
    this.assertResidenceAccess(currentUser, residence.syndicId);

    const payments = await this.prisma.payment.findMany({
      where: { residenceId, month, year, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const paymentAgg = await this.prisma.payment.aggregate({
      where: { residenceId, month, year, isActive: true },
      _sum: { amountPaid: true, remainingAmount: true },
      _count: { _all: true },
    });
    const nonPaidCount = await this.prisma.payment.count({
      where: {
        residenceId,
        month,
        year,
        isActive: true,
        status: {
          in: [
            PaymentStatus.NON_PAYE,
            PaymentStatus.PARTIELLEMENT_PAYE,
            PaymentStatus.EN_RETARD,
          ],
        },
      },
    });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    const invoices = await this.prisma.expenseInvoice.findMany({
      where: {
        residenceId,
        isActive: true,
        invoiceDate: { gte: start, lt: end },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    const invoiceAgg = await this.prisma.expenseInvoice.aggregate({
      where: {
        residenceId,
        isActive: true,
        invoiceDate: { gte: start, lt: end },
        status: InvoiceStatus.PAYEE,
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const totalCollected = paymentAgg._sum.amountPaid ?? 0;
    const totalUnpaid = paymentAgg._sum.remainingAmount ?? 0;
    const totalExpenses = invoiceAgg._sum.amount ?? 0;

    return {
      totalCollected,
      totalUnpaid,
      totalExpenses,
      currentBalanceEstimate: totalCollected - totalExpenses,
      paymentsCount: paymentAgg._count._all,
      invoicesCount: invoiceAgg._count._all,
      nonPaidCount,
      latestPayments: payments,
      latestInvoices: invoices,
    };
  }

  private assertResidenceAccess(currentUser: AuthUser, syndicId: string) {
    if (currentUser.role === UserRole.SUPER_ADMIN) return;
    if (currentUser.role === UserRole.SYNDIC && syndicId === currentUser.id)
      return;
    if (currentUser.role === UserRole.CASHIER) {
      // TODO: replace with cashier-residence assignment table check when available.
      return;
    }
    throw new ForbiddenException('You can only access allowed financial data');
  }
}
