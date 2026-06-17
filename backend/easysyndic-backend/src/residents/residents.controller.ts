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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
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
import { RequirePermission } from '../team/decorators/require-permission.decorator';
import { PermissionsGuard } from '../team/guards/permissions.guard';
import { AssignApartmentDto } from './dto/assign-apartment.dto';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentApartmentStatusDto } from './dto/update-resident-apartment-status.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { ResidentApartmentResponseEntity } from './entities/resident-apartment-response.entity';
import { ResidentResponseEntity } from './entities/resident-response.entity';
import { ResidentsService } from './residents.service';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@ApiTags('Residents')
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
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post('syndic/residences/:residenceId/residents')
  @RequirePermission('residents', 'create')
  @ApiOperation({
    summary: 'Create a resident and assign apartment in syndic residence',
  })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResidentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence or apartment not found' })
  @ApiConflictResponse({
    description: 'Duplicate phone/email or duplicate assignment',
  })
  createForSyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() createResidentDto: CreateResidentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.create(
      residenceId,
      createResidentDto,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/residents')
  @RequirePermission('residents', 'view')
  @ApiOperation({ summary: 'List residents by syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity, isArray: true })
  findBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.findByResidence(residenceId, currentUser);
  }

  @Post('syndic/residences/:residenceId/residents/:residentId/assign-apartment')
  @RequirePermission('residents', 'edit')
  @ApiOperation({ summary: 'Assign apartment to resident in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'residentId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResidentApartmentResponseEntity })
  @ApiConflictResponse({
    description: 'Apartment outside residence or duplicate assignment',
  })
  assignApartmentForSyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('residentId', new ParseUUIDPipe()) residentId: string,
    @Body() assignApartmentDto: AssignApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.assignApartmentInResidence(
      residenceId,
      residentId,
      assignApartmentDto,
      currentUser,
    );
  }

  @Post('residences/:residenceId/residents')
  @ApiOperation({
    summary: 'Create a resident and assign apartment in residence',
  })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResidentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence or apartment not found' })
  @ApiConflictResponse({
    description: 'Duplicate phone/email or duplicate assignment',
  })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() createResidentDto: CreateResidentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.create(
      residenceId,
      createResidentDto,
      currentUser,
    );
  }

  @Get('residences/:residenceId/residents')
  @ApiOperation({ summary: 'List residents by residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.findByResidence(residenceId, currentUser);
  }

  @Get('residents/:id')
  @ApiOperation({ summary: 'Get resident by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.findOne(id, currentUser);
  }

  @Put('residents/:id')
  @ApiOperation({ summary: 'Update resident by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity })
  @ApiConflictResponse({ description: 'Phone or email already exists' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateResidentDto: UpdateResidentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.update(id, updateResidentDto, currentUser);
  }

  @Delete('residents/:id')
  @ApiOperation({
    summary: 'Soft delete resident and resident-apartment links',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.remove(id, currentUser);
  }

  @Post('residents/:residentId/assign-apartment')
  @ApiOperation({ summary: 'Assign apartment to resident' })
  @ApiParam({ name: 'residentId', format: 'uuid' })
  @ApiCreatedResponse({ type: ResidentApartmentResponseEntity })
  @ApiConflictResponse({
    description: 'Resident already assigned to this apartment',
  })
  assignApartment(
    @Param('residentId', new ParseUUIDPipe()) residentId: string,
    @Body() assignApartmentDto: AssignApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.assignApartment(
      residentId,
      assignApartmentDto,
      currentUser,
    );
  }

  @Get('apartments/:apartmentId/residents')
  @ApiOperation({ summary: 'List residents by apartment' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ type: ResidentResponseEntity, isArray: true })
  findByApartment(
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.findByApartment(apartmentId, currentUser);
  }

  @Patch('resident-apartments/:id/status')
  @ApiOperation({ summary: 'Update resident-apartment link status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ResidentApartmentResponseEntity })
  updateResidentApartmentStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateDto: UpdateResidentApartmentStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.residentsService.updateResidentApartmentStatus(
      id,
      updateDto,
      currentUser,
    );
  }
}
