import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../team/guards/permissions.guard';
import { CreateResidenceDto } from './dto/create-residence.dto';
import { UpdateResidenceStatusDto } from './dto/update-residence-status.dto';
import { UpdateResidenceDto } from './dto/update-residence.dto';
import { ResidenceResponseEntity } from './entities/residence-response.entity';
import { SyndicResidenceSummaryEntity } from './entities/syndic-residence-summary.entity';
import { ResidencesService } from './residences.service';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@ApiTags('Residences')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(
  UserRole.SUPER_ADMIN,
  UserRole.SYNDIC,
  UserRole.VICE_SYNDIC,
  UserRole.CAISSIER,
  UserRole.CASHIER,
  UserRole.GARDIEN,
  UserRole.SECRETAIRE,
)
@Controller()
export class ResidencesController {
  constructor(private readonly residencesService: ResidencesService) {}

  @Get('/syndic/residences')
  @ApiOperation({ summary: 'List syndic residences with summary metrics' })
  @ApiOkResponse({ type: SyndicResidenceSummaryEntity, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findSyndicResidences(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.residencesService.findSyndicResidences(currentUser);
  }

  @Post('residences')
  @ApiOperation({ summary: 'Create a residence/building' })
  @ApiCreatedResponse({ type: ResidenceResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  create(
    @Body() createResidenceDto: CreateResidenceDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residencesService.create(createResidenceDto, currentUser);
  }

  @Get('residences')
  @ApiOperation({ summary: 'List residences' })
  @ApiOkResponse({ type: ResidenceResponseEntity, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findAll(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.residencesService.findAll(currentUser);
  }

  @Get('residences/:id')
  @ApiOperation({ summary: 'Get residence by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidenceResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residencesService.findOne(id, currentUser);
  }

  @Put('residences/:id')
  @ApiOperation({ summary: 'Update residence by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidenceResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateResidenceDto: UpdateResidenceDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residencesService.update(id, updateResidenceDto, currentUser);
  }

  @Delete('residences/:id')
  @ApiOperation({ summary: 'Soft delete residence (set isActive=false)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidenceResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residencesService.remove(id, currentUser);
  }

  @Patch('residences/:id/status')
  @ApiOperation({ summary: 'Update residence active status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidenceResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateResidenceStatusDto: UpdateResidenceStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residencesService.updateStatus(
      id,
      updateResidenceStatusDto,
      currentUser,
    );
  }
}
