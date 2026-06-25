import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../team/decorators/require-permission.decorator';
import { PermissionsGuard } from '../team/guards/permissions.guard';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementStatusDto } from './dto/update-announcement-status.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { AnnouncementResponseEntity } from './entities/announcement-response.entity';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Announcements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Get('syndic/residences/:residenceId/announcements')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.GARDIEN,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('announcements', 'view')
  @ApiOperation({ summary: 'List active announcements for syndic residence' })
  @ApiOkResponse({ type: AnnouncementResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.findByResidence(residenceId, currentUser);
  }

  @Post('syndic/residences/:residenceId/announcements')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('announcements', 'create')
  @ApiOperation({ summary: 'Create announcement for syndic residence' })
  @ApiCreatedResponse({ type: AnnouncementResponseEntity })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.create(residenceId, dto, currentUser);
  }

  @Patch('syndic/residences/:residenceId/announcements/:announcementId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('announcements', 'edit')
  @ApiOperation({ summary: 'Update announcement for syndic residence' })
  @ApiOkResponse({ type: AnnouncementResponseEntity })
  update(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.updateInResidence(
      residenceId,
      announcementId,
      dto,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/announcements/:announcementId/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('announcements', 'edit')
  @ApiOperation({ summary: 'Update announcement active status' })
  @ApiOkResponse({ type: AnnouncementResponseEntity })
  updateStatus(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
    @Body() dto: UpdateAnnouncementStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.updateStatusInResidence(
      residenceId,
      announcementId,
      dto,
      currentUser,
    );
  }

  @Delete('syndic/residences/:residenceId/announcements/:announcementId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('announcements', 'delete')
  @ApiOperation({ summary: 'Soft delete announcement for syndic residence' })
  @ApiOkResponse({ type: AnnouncementResponseEntity })
  remove(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.removeInResidence(
      residenceId,
      announcementId,
      currentUser,
    );
  }

  @Get('me/announcements')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List current resident announcements by residence' })
  @ApiOkResponse({ type: AnnouncementResponseEntity, isArray: true })
  findMine(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.announcementsService.findMine(currentUser, residenceId, limit);
  }

  @Get('me/announcements/:announcementId')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get current resident announcement detail' })
  @ApiOkResponse({ type: AnnouncementResponseEntity })
  findMineOne(
    @Param('announcementId', new ParseUUIDPipe()) announcementId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.announcementsService.findMineOne(announcementId, currentUser);
  }
}
