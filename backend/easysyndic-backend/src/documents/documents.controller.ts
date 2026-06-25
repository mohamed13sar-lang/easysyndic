import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentsService } from './documents.service';

type AuthUser = { id: string; role: UserRole };
const documentUploadOptions: MulterOptions = { storage: memoryStorage() };

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get('syndic/residences/:residenceId/documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  findBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.findBySyndicResidence(residenceId, user);
  }

  @Post('syndic/documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @UseInterceptors(FileInterceptor('file', documentUploadOptions))
  create(
    @Body() dto: CreateDocumentDto,
    @UploadedFile()
    file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.createForSyndic(dto, file, user);
  }

  @Get('me/documents')
  @Roles(UserRole.RESIDENT)
  findMine(
    @CurrentUser() user: AuthUser,
    @Query('residenceId') residenceId?: string,
  ) {
    return this.documentsService.findMine(user, residenceId);
  }

  @Get('documents/:id/signed-url')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  getSignedUrl(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.getSignedUrl(id, user);
  }
}
