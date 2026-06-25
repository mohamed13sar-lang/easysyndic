import { Injectable } from '@nestjs/common';
import {
  ComplaintStatus,
  InvoiceStatus,
  PaymentStatus,
  UserRole,
} from '@prisma/client';
import { normalizePayment } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionMap } from '../team/permissions.types';
import { TeamPermissionsService } from '../team/team-permissions.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionsService: TeamPermissionsService,
  ) {}

  async getSyndicStats(currentUser: { id: string; role: UserRole }) {
    const accessibleResidenceIds =
      await this.permissionsService.getAccessibleResidenceIds(currentUser);
    const residenceWhere =
      currentUser.role === UserRole.SUPER_ADMIN
        ? { isActive: true }
        : { id: { in: accessibleResidenceIds ?? [] }, isActive: true };

    const residenceIds = await this.prisma.residence.findMany({
      where: residenceWhere,
      select: { id: true },
    });
    const scopedResidenceIds = residenceIds.map((residence) => residence.id);
    const scopedResidenceFilter = { residenceId: { in: scopedResidenceIds } };
    const unpaidStatuses: PaymentStatus[] = [
      PaymentStatus.NON_PAYE,
      PaymentStatus.PARTIELLEMENT_PAYE,
      PaymentStatus.EN_RETARD,
    ];
    const openComplaintStatuses = [
      ComplaintStatus.NOUVELLE,
      ComplaintStatus.VUE,
      ComplaintStatus.EN_COURS,
      ComplaintStatus.ENVOYEE_LHRAYFI,
      ComplaintStatus.PRESTATAIRE_AFFECTE,
    ];

    const [
      totalApartments,
      residentRows,
      paymentRows,
      openComplaintsCount,
      resolvedComplaintsCount,
      notificationsSentCount,
    ] = await Promise.all([
      this.prisma.apartment.count({
        where: { ...scopedResidenceFilter, isActive: true },
      }),
      this.prisma.residentApartment.findMany({
        where: { ...scopedResidenceFilter, isActive: true },
        distinct: ['userId'],
        select: { userId: true },
      }),
      this.prisma.payment.findMany({
        where: { ...scopedResidenceFilter, isActive: true },
        select: {
          amountDue: true,
          amountPaid: true,
          status: true,
        },
      }),
      this.prisma.complaint.count({
        where: {
          ...scopedResidenceFilter,
          isActive: true,
          status: { in: openComplaintStatuses },
        },
      }),
      this.prisma.complaint.count({
        where: {
          ...scopedResidenceFilter,
          isActive: true,
          status: ComplaintStatus.RESOLUE,
        },
      }),
      this.prisma.notification.count({
        where: {
          ...(currentUser.role === UserRole.SYNDIC
            ? { senderId: currentUser.id }
            : scopedResidenceFilter),
        },
      }),
    ]);

    const unpaidPayments = paymentRows
      .map((payment) =>
        normalizePayment(payment.amountDue, payment.amountPaid, payment.status),
      )
      .filter((payment) => unpaidStatuses.includes(payment.status));

    const response = {
      totalResidences: scopedResidenceIds.length,
      totalApartments,
      totalResidents: residentRows.length,
      unpaidPaymentsCount: unpaidPayments.length,
      unpaidPaymentsAmount: unpaidPayments.reduce(
        (sum, payment) => sum + payment.remainingAmount,
        0,
      ),
      openComplaintsCount,
      resolvedComplaintsCount,
      notificationsSentCount,
    };

    return this.filterSyndicStats(response, currentUser, scopedResidenceIds);
  }

  private async filterSyndicStats(
    stats: {
      totalResidences: number;
      totalApartments: number;
      totalResidents: number;
      unpaidPaymentsCount: number;
      unpaidPaymentsAmount: number;
      openComplaintsCount: number;
      resolvedComplaintsCount: number;
      notificationsSentCount: number;
    },
    currentUser: { id: string; role: UserRole },
    residenceIds: string[],
  ) {
    if (
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.SYNDIC
    ) {
      return stats;
    }

    const memberships = await this.prisma.syndicTeamMember.findMany({
      where: {
        userId: currentUser.id,
        residenceId: { in: residenceIds },
        isActive: true,
      },
      select: { permissions: true },
    });
    const can = (action: string) =>
      memberships.some((membership) =>
        Boolean((membership.permissions as PermissionMap)?.dashboard?.[action]),
      );

    return {
      totalResidences: can('viewDashboard') ? stats.totalResidences : 0,
      totalApartments: can('viewApartmentsKpi') ? stats.totalApartments : 0,
      totalResidents: can('viewResidentsKpi') ? stats.totalResidents : 0,
      unpaidPaymentsCount: can('viewUnpaidKpi') ? stats.unpaidPaymentsCount : 0,
      unpaidPaymentsAmount: can('viewUnpaidKpi')
        ? stats.unpaidPaymentsAmount
        : 0,
      openComplaintsCount: can('viewComplaintsKpi')
        ? stats.openComplaintsCount
        : 0,
      resolvedComplaintsCount: can('viewComplaintsKpi')
        ? stats.resolvedComplaintsCount
        : 0,
      notificationsSentCount: can('viewDashboard')
        ? stats.notificationsSentCount
        : 0,
    };
  }

  async getStats() {
    const [
      residencesTotal,
      apartmentsTotal,
      apartmentsOccupied,
      residentsTotal,
      residentsActive,
      providersTotal,
      providersActive,
      invoicesTotal,
      invoicesPaid,
      invoicesUnpaid,
      invoicesOverdue,
      invoicesTotalAmountAgg,
      invoicesPaidAmountAgg,
      invoicesUnpaidAmountAgg,
      paymentsRows,
      complaintsTotal,
      complaintsNew,
      complaintsInProgress,
      complaintsResolved,
      complaintsClosed,
      complaintsRefused,
      notificationsTotal,
      notificationsUnread,
      recentComplaints,
      recentInvoices,
      recentPayments,
      recentNotifications,
    ] = await Promise.all([
      this.prisma.residence.count(),
      this.prisma.apartment.count(),
      this.prisma.residentApartment.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: UserRole.RESIDENT } }),
      this.prisma.user.count({
        where: { role: UserRole.RESIDENT, isActive: true },
      }),
      this.prisma.user.count({ where: { role: UserRole.PROVIDER } }),
      this.prisma.user.count({
        where: { role: UserRole.PROVIDER, isActive: true },
      }),
      this.prisma.expenseInvoice.count({ where: { isActive: true } }),
      this.prisma.expenseInvoice.count({
        where: { isActive: true, status: InvoiceStatus.PAYEE },
      }),
      this.prisma.expenseInvoice.count({
        where: {
          isActive: true,
          status: { in: [InvoiceStatus.NON_PAYEE, InvoiceStatus.EN_ATTENTE] },
        },
      }),
      this.prisma.expenseInvoice.count({
        where: { isActive: true, status: InvoiceStatus.EN_ATTENTE },
      }),
      this.prisma.expenseInvoice.aggregate({
        where: { isActive: true },
        _sum: { amount: true },
      }),
      this.prisma.expenseInvoice.aggregate({
        where: { isActive: true, status: InvoiceStatus.PAYEE },
        _sum: { amount: true },
      }),
      this.prisma.expenseInvoice.aggregate({
        where: {
          isActive: true,
          status: { in: [InvoiceStatus.NON_PAYEE, InvoiceStatus.EN_ATTENTE] },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: { isActive: true },
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
      }),
      this.prisma.complaint.count({ where: { isActive: true } }),
      this.prisma.complaint.count({
        where: { isActive: true, status: ComplaintStatus.NOUVELLE },
      }),
      this.prisma.complaint.count({
        where: {
          isActive: true,
          status: {
            in: [
              ComplaintStatus.VUE,
              ComplaintStatus.EN_COURS,
              ComplaintStatus.PRESTATAIRE_AFFECTE,
            ],
          },
        },
      }),
      this.prisma.complaint.count({
        where: { isActive: true, status: ComplaintStatus.RESOLUE },
      }),
      this.prisma.complaint.count({
        where: { isActive: true, status: ComplaintStatus.FERMEE },
      }),
      this.prisma.complaint.count({
        where: { isActive: true, status: ComplaintStatus.REFUSEE },
      }),
      this.prisma.notification.count(),
      this.prisma.notificationRecipient.count({ where: { isRead: false } }),
      this.prisma.complaint.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.expenseInvoice.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.payment.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const normalizedPayments = paymentsRows.map((payment) => ({
      ...payment,
      ...normalizePayment(
        payment.amountDue,
        payment.amountPaid,
        payment.status,
      ),
    }));
    const residentsInactive = residentsTotal - residentsActive;
    const providersInactive = providersTotal - providersActive;
    const apartmentsAvailable = Math.max(
      apartmentsTotal - apartmentsOccupied,
      0,
    );

    return {
      residences: {
        total: residencesTotal,
      },
      buildings: {
        // No dedicated Building model exists in current schema.
        total: 0,
      },
      apartments: {
        total: apartmentsTotal,
        occupied: apartmentsOccupied,
        available: apartmentsAvailable,
      },
      residents: {
        total: residentsTotal,
        active: residentsActive,
        inactive: residentsInactive,
      },
      providers: {
        total: providersTotal,
        active: providersActive,
        inactive: providersInactive,
      },
      invoices: {
        total: invoicesTotal,
        paid: invoicesPaid,
        unpaid: invoicesUnpaid,
        overdue: invoicesOverdue,
        totalAmount: invoicesTotalAmountAgg._sum.amount ?? 0,
        paidAmount: invoicesPaidAmountAgg._sum.amount ?? 0,
        unpaidAmount: invoicesUnpaidAmountAgg._sum.amount ?? 0,
      },
      payments: {
        total: normalizedPayments.length,
        totalAmount: normalizedPayments.reduce(
          (sum, payment) => sum + payment.amountPaid,
          0,
        ),
      },
      complaints: {
        total: complaintsTotal,
        new: complaintsNew,
        inProgress: complaintsInProgress,
        resolved: complaintsResolved,
        closed: complaintsClosed,
        refused: complaintsRefused,
      },
      notifications: {
        total: notificationsTotal,
        unread: notificationsUnread,
      },
      recent: {
        complaints: recentComplaints,
        invoices: recentInvoices,
        payments: recentPayments.map((payment) => ({
          ...payment,
          ...normalizePayment(
            payment.amountDue,
            payment.amountPaid,
            payment.status,
          ),
        })),
        notifications: recentNotifications,
      },
    };
  }
}
