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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequirePermission } from '../team/decorators/require-permission.decorator';
import { PermissionsGuard } from '../team/guards/permissions.guard';
import { AssembliesService } from './assemblies.service';
import { AgendaItemDto } from './dto/agenda-item.dto';
import { CreateAssemblyDto } from './dto/create-assembly.dto';
import { ResolutionDto } from './dto/resolution.dto';
import { UpdateAssemblyStatusDto } from './dto/update-assembly-status.dto';
import { UpdateAssemblyDto } from './dto/update-assembly.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { UpdateVotingStatusDto } from './dto/update-voting-status.dto';
import { VoteResolutionDto } from './dto/vote-resolution.dto';

type AuthUser = { id: string; role: UserRole };

@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller()
export class AssembliesController {
  constructor(private readonly assembliesService: AssembliesService) {}

  @Get('syndic/residences/:residenceId/assemblies')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'view')
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findByResidence(residenceId, currentUser);
  }

  @Post('syndic/residences/:residenceId/assemblies')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'create')
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreateAssemblyDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.create(residenceId, dto, currentUser);
  }

  @Get('syndic/residences/:residenceId/assemblies/:assemblyId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'view')
  findOne(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findOneInResidence(
      residenceId,
      assemblyId,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/assemblies/:assemblyId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  update(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Body() dto: UpdateAssemblyDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.update(
      residenceId,
      assemblyId,
      dto,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/assemblies/:assemblyId/status')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'publish')
  updateStatus(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Body() dto: UpdateAssemblyStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateStatus(
      residenceId,
      assemblyId,
      dto.status,
      currentUser,
    );
  }

  @Delete('syndic/residences/:residenceId/assemblies/:assemblyId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'delete')
  remove(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.remove(residenceId, assemblyId, currentUser);
  }

  @Post('syndic/residences/:residenceId/assemblies/:assemblyId/agenda')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  addAgendaItem(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Body() dto: AgendaItemDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.addAgendaItem(
      residenceId,
      assemblyId,
      dto,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/assemblies/:assemblyId/agenda/:itemId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  updateAgendaItem(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @Body() dto: AgendaItemDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateAgendaItem(
      residenceId,
      assemblyId,
      itemId,
      dto,
      currentUser,
    );
  }

  @Delete(
    'syndic/residences/:residenceId/assemblies/:assemblyId/agenda/:itemId',
  )
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  deleteAgendaItem(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('itemId', new ParseUUIDPipe()) itemId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.deleteAgendaItem(
      residenceId,
      assemblyId,
      itemId,
      currentUser,
    );
  }

  @Post('syndic/residences/:residenceId/assemblies/:assemblyId/resolutions')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  createResolution(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Body() dto: ResolutionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.createResolution(
      residenceId,
      assemblyId,
      dto,
      currentUser,
    );
  }

  @Patch(
    'syndic/residences/:residenceId/assemblies/:assemblyId/resolutions/:resolutionId',
  )
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'edit')
  updateResolution(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('resolutionId', new ParseUUIDPipe()) resolutionId: string,
    @Body() dto: ResolutionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateResolution(
      residenceId,
      assemblyId,
      resolutionId,
      dto,
      currentUser,
    );
  }

  @Patch(
    'syndic/residences/:residenceId/assemblies/:assemblyId/resolutions/:resolutionId/voting-status',
  )
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'voteManage')
  updateVotingStatus(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('resolutionId', new ParseUUIDPipe()) resolutionId: string,
    @Body() dto: UpdateVotingStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateVotingStatus(
      residenceId,
      assemblyId,
      resolutionId,
      dto.votingStatus,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/assemblies/:assemblyId/participants')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'view')
  findParticipants(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findParticipants(
      residenceId,
      assemblyId,
      currentUser,
    );
  }

  @Patch(
    'syndic/residences/:residenceId/assemblies/:assemblyId/participants/:participantId',
  )
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'attendance')
  updateParticipant(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('participantId', new ParseUUIDPipe()) participantId: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateParticipant(
      residenceId,
      assemblyId,
      participantId,
      dto,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/assemblies/:assemblyId/results')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SYNDIC,
    UserRole.VICE_SYNDIC,
    UserRole.SECRETAIRE,
  )
  @RequirePermission('assemblies', 'view')
  findResults(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findResults(
      residenceId,
      assemblyId,
      currentUser,
    );
  }

  @Get('me/assemblies')
  @Roles(UserRole.RESIDENT)
  findMine(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
  ) {
    return this.assembliesService.findMine(currentUser, residenceId);
  }

  @Get('me/assemblies/:assemblyId')
  @Roles(UserRole.RESIDENT)
  findMineOne(
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findMineOne(assemblyId, currentUser);
  }

  @Patch('me/assemblies/:assemblyId/attendance')
  @Roles(UserRole.RESIDENT)
  updateMyAttendance(
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.updateMyAttendance(
      assemblyId,
      dto,
      currentUser,
    );
  }

  @Post('me/assemblies/:assemblyId/resolutions/:resolutionId/vote')
  @Roles(UserRole.RESIDENT)
  vote(
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @Param('resolutionId', new ParseUUIDPipe()) resolutionId: string,
    @Body() dto: VoteResolutionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.vote(
      assemblyId,
      resolutionId,
      dto.vote,
      currentUser,
    );
  }

  @Get('me/assemblies/:assemblyId/results')
  @Roles(UserRole.RESIDENT)
  findMyResults(
    @Param('assemblyId', new ParseUUIDPipe()) assemblyId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.assembliesService.findMyResults(assemblyId, currentUser);
  }
}
