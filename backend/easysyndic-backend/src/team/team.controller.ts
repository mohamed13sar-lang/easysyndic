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
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberStatusDto } from './dto/update-team-member-status.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { TeamService } from './team.service';

type AuthUser = { id: string; role: UserRole };

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.SYNDIC,
  UserRole.VICE_SYNDIC,
  UserRole.CAISSIER,
  UserRole.CASHIER,
  UserRole.GARDIEN,
  UserRole.SECRETAIRE,
)
@Controller('syndic')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('permissions-template')
  getPermissionTemplates() {
    return this.teamService.getPermissionTemplates();
  }

  @Get('me/permissions')
  getMyPermissions(
    @Query('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.getMyPermissions(residenceId, currentUser);
  }

  @Get('team')
  findByResidence(
    @Query('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.findByResidence(residenceId, currentUser);
  }

  @Post('team')
  create(
    @Body() dto: CreateTeamMemberDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.create(dto, currentUser);
  }

  @Patch('team/:id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.update(id, dto, currentUser);
  }

  @Patch('team/:id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateTeamMemberStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.updateStatus(id, dto, currentUser);
  }

  @Delete('team/:id')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.teamService.remove(id, currentUser);
  }
}
