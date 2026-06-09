import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

type AuthUser = { id: string; role: UserRole };

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    residenceId: string,
    dto: CreateInvoiceDto,
    currentUser: AuthUser,
  ) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);
    return this.prisma.expenseInvoice.create({
      data: {
        residenceId,
        title: dto.title,
        supplierName: dto.supplierName,
        category: dto.category,
        amount: dto.amount,
        invoiceDate: new Date(dto.invoiceDate),
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
        status: dto.status,
        fileUrl: dto.fileUrl,
        note: dto.note,
        createdById: currentUser.id,
        isActive: true,
      },
    });
  }

  async findByResidence(residenceId: string, currentUser: AuthUser) {
    const residence = await this.getResidenceOrThrow(residenceId);
    this.assertResidenceAccess(currentUser, residence.syndicId);
    return this.prisma.expenseInvoice.findMany({
      where: { residenceId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: AuthUser) {
    const invoice = await this.prisma.expenseInvoice.findUnique({
      where: { id },
    });
    if (!invoice)
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(invoice.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      invoice.createdById,
    );
    return invoice;
  }

  async update(id: string, dto: UpdateInvoiceDto, currentUser: AuthUser) {
    const invoice = await this.prisma.expenseInvoice.findUnique({
      where: { id },
    });
    if (!invoice)
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(invoice.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      invoice.createdById,
    );
    return this.prisma.expenseInvoice.update({
      where: { id },
      data: {
        title: dto.title,
        supplierName: dto.supplierName,
        category: dto.category,
        amount: dto.amount,
        invoiceDate: dto.invoiceDate ? new Date(dto.invoiceDate) : undefined,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
        status: dto.status,
        fileUrl: dto.fileUrl,
        note: dto.note,
      },
    });
  }

  async updateStatus(
    id: string,
    dto: UpdateInvoiceStatusDto,
    currentUser: AuthUser,
  ) {
    const invoice = await this.prisma.expenseInvoice.findUnique({
      where: { id },
    });
    if (!invoice)
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(invoice.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      invoice.createdById,
    );
    return this.prisma.expenseInvoice.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string, currentUser: AuthUser) {
    const invoice = await this.prisma.expenseInvoice.findUnique({
      where: { id },
    });
    if (!invoice)
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    const residence = await this.getResidenceOrThrow(invoice.residenceId);
    this.assertResidenceAccess(
      currentUser,
      residence.syndicId,
      invoice.createdById,
    );
    return this.prisma.expenseInvoice.update({
      where: { id },
      data: { isActive: false },
    });
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
