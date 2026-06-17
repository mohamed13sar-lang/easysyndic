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
import { ApartmentsService } from './apartments.service';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentStatusDto } from './dto/update-apartment-status.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { ApartmentResponseEntity } from './entities/apartment-response.entity';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@ApiTags('Apartments')
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
export class ApartmentsController {
  constructor(private readonly apartmentsService: ApartmentsService) {}

  @Get('syndic/residences/:residenceId/apartments')
  @RequirePermission('apartments', 'view')
  @ApiOperation({ summary: 'List apartments for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence not found' })
  findSyndicResidenceApartments(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.findByResidence(residenceId, currentUser);
  }

  @Post('syndic/residences/:residenceId/apartments')
  @RequirePermission('apartments', 'create')
  @ApiOperation({ summary: 'Create apartment for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence not found' })
  @ApiConflictResponse({
    description: 'Apartment number already exists in this residence',
  })
  createSyndicResidenceApartment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() createApartmentDto: CreateApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.create(
      residenceId,
      createApartmentDto,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/apartments/:apartmentId')
  @RequirePermission('apartments', 'view')
  @ApiOperation({ summary: 'Get apartment details for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found in residence' })
  findSyndicResidenceApartment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.findOneInResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/apartments/:apartmentId/profile')
  @RequirePermission('apartments', 'view')
  @ApiOperation({ summary: 'Get apartment profile for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ description: 'Apartment profile with residents, payments and complaints' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found in residence' })
  findSyndicResidenceApartmentProfile(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.findProfileInResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/apartments/:apartmentId')
  @RequirePermission('apartments', 'edit')
  @ApiOperation({ summary: 'Update apartment for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiConflictResponse({
    description: 'Apartment number already exists in this residence',
  })
  updateSyndicResidenceApartment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @Body() updateApartmentDto: UpdateApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.updateInResidence(
      residenceId,
      apartmentId,
      updateApartmentDto,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/apartments/:apartmentId/status')
  @RequirePermission('apartments', 'edit')
  @ApiOperation({ summary: 'Update apartment active status for syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  updateSyndicResidenceApartmentStatus(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @Body() updateApartmentStatusDto: UpdateApartmentStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.updateStatusInResidence(
      residenceId,
      apartmentId,
      updateApartmentStatusDto,
      currentUser,
    );
  }

  @Delete('syndic/residences/:residenceId/apartments/:apartmentId')
  @RequirePermission('apartments', 'delete')
  @ApiOperation({
    summary: 'Soft delete apartment for syndic residence (set isActive=false)',
  })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'apartmentId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  removeSyndicResidenceApartment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('apartmentId', new ParseUUIDPipe()) apartmentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.removeInResidence(
      residenceId,
      apartmentId,
      currentUser,
    );
  }

  @Post('residences/:residenceId/apartments')
  @ApiOperation({ summary: 'Create an apartment inside a residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence not found' })
  @ApiConflictResponse({
    description: 'Apartment number already exists in this residence',
  })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() createApartmentDto: CreateApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.create(
      residenceId,
      createApartmentDto,
      currentUser,
    );
  }

  @Get('residences/:residenceId/apartments')
  @ApiOperation({ summary: 'List apartments by residence id' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Residence not found' })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.findByResidence(residenceId, currentUser);
  }

  @Get('apartments/:id')
  @ApiOperation({ summary: 'Get apartment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.findOne(id, currentUser);
  }

  @Put('apartments/:id')
  @ApiOperation({ summary: 'Update apartment by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({
    description: 'Apartment number already exists in this residence',
  })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateApartmentDto: UpdateApartmentDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.update(id, updateApartmentDto, currentUser);
  }

  @Delete('apartments/:id')
  @ApiOperation({ summary: 'Soft delete apartment (set isActive=false)' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.remove(id, currentUser);
  }

  @Patch('apartments/:id/status')
  @ApiOperation({ summary: 'Update apartment active status' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: ApartmentResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateApartmentStatusDto: UpdateApartmentStatusDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.apartmentsService.updateStatus(
      id,
      updateApartmentStatusDto,
      currentUser,
    );
  }
}
