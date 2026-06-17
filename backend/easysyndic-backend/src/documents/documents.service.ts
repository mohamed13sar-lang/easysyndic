import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  STORAGE_BUCKETS,
  STORAGE_LIMITS,
} from '../storage/storage.constants';
import { StorageService } from '../storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';

type AuthUser = { id: string; role: UserRole };
type UploadedFile = {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createForSyndic(dto: CreateDocumentDto, file: UploadedFile, user: AuthUser) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: dto.residenceId },
      select: { id: true, syndicId: true },
    });
    if (!residence) throw new NotFoundException('Residence introuvable');
    this.assertSyndicResidenceAccess(user, residence.syndicId);

    this.storage.validateFile(file, {
      allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
      maxSize: STORAGE_LIMITS.documents,
      label: 'Document',
    });

    const storagePath = this.storage.buildPath(
      ['residences', dto.residenceId, 'documents'],
      file.originalname,
    );
    await this.storage.uploadPrivateFile(STORAGE_BUCKETS.documents, storagePath, file);

    return this.prisma.document.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        fileName: file.originalname || 'document',
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size ?? file.buffer.length,
        storagePath,
        residenceId: dto.residenceId,
        uploadedById: user.id,
      },
    });
  }

  async findMine(user: AuthUser, residenceId?: string) {
    if (user.role !== UserRole.RESIDENT) {
      throw new ForbiddenException('Only residents can use this endpoint');
    }

    const assignments = await this.prisma.residentApartment.findMany({
      where: {
        userId: user.id,
        isActive: true,
        ...(residenceId ? { residenceId } : {}),
      },
      select: { residenceId: true },
    });
    const residenceIds = Array.from(new Set(assignments.map((item) => item.residenceId)));
    if (residenceId && !residenceIds.includes(residenceId)) {
      throw new ForbiddenException('Resident non associe a cette residence');
    }

    return this.prisma.document.findMany({
      where: { residenceId: { in: residenceIds } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySyndicResidence(residenceId: string, user: AuthUser) {
    const residence = await this.prisma.residence.findUnique({
      where: { id: residenceId },
      select: { id: true, syndicId: true },
    });
    if (!residence) throw new NotFoundException('Residence introuvable');
    this.assertSyndicResidenceAccess(user, residence.syndicId);

    return this.prisma.document.findMany({
      where: { residenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSignedUrl(id: string, user: AuthUser) {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException('Document introuvable');

    if (user.role === UserRole.RESIDENT) {
      const link = await this.prisma.residentApartment.findFirst({
        where: { userId: user.id, residenceId: document.residenceId, isActive: true },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('Acces document refuse');
    } else {
      const residence = await this.prisma.residence.findUnique({
        where: { id: document.residenceId },
        select: { syndicId: true },
      });
      this.assertSyndicResidenceAccess(user, residence?.syndicId ?? '');
    }

    const url = await this.storage.createSignedUrl(
      STORAGE_BUCKETS.documents,
      document.storagePath,
    );
    return { url, expiresIn: 600 };
  }

  private assertSyndicResidenceAccess(user: AuthUser, syndicId: string) {
    if (user.role === UserRole.SUPER_ADMIN) return;
    if (user.role === UserRole.SYNDIC && user.id === syndicId) return;
    throw new ForbiddenException('Acces residence refuse');
  }
}
