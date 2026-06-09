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
  Put,
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
import { ComplaintsService } from './complaints.service';
import { AddComplaintCommentDto } from './dto/add-complaint-comment.dto';
import { AddComplaintMediaDto } from './dto/add-complaint-media.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { CreateMyComplaintDto } from './dto/create-my-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { ComplaintCommentResponseEntity } from './entities/complaint-comment-response.entity';
import { ComplaintMediaResponseEntity } from './entities/complaint-media-response.entity';
import { ComplaintResponseEntity } from './entities/complaint-response.entity';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Complaints')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get('syndic/residences/:residenceId/complaints')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List complaints by syndic residence' })
  @ApiOkResponse({ type: ComplaintResponseEntity, isArray: true })
  findBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findByResidence(residenceId, currentUser);
  }

  @Get('syndic/residences/:residenceId/complaints/:complaintId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Get complaint by id in syndic residence' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  findOneBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findOneInResidence(
      residenceId,
      complaintId,
      currentUser,
    );
  }

  @Patch('syndic/residences/:residenceId/complaints/:complaintId/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Update complaint status in syndic residence' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  updateStatusBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.updateStatusInResidence(
      residenceId,
      complaintId,
      dto,
      currentUser,
    );
  }

  @Post('syndic/residences/:residenceId/complaints/:complaintId/comments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Add comment to complaint in syndic residence' })
  @ApiCreatedResponse({ type: ComplaintCommentResponseEntity })
  addCommentBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @Body() dto: AddComplaintCommentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.addCommentInResidence(
      residenceId,
      complaintId,
      dto,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/complaints/:complaintId/media')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List complaint media in syndic residence' })
  @ApiOkResponse({ type: ComplaintMediaResponseEntity, isArray: true })
  findMediaBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findMediaInResidence(
      residenceId,
      complaintId,
      currentUser,
    );
  }

  @Post('syndic/residences/:residenceId/complaints/:complaintId/media')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Add media to complaint in syndic residence' })
  @ApiCreatedResponse({ type: ComplaintMediaResponseEntity })
  addMediaBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @Body() dto: AddComplaintMediaDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.addMediaInResidence(
      residenceId,
      complaintId,
      dto,
      currentUser,
    );
  }

  @Get('me/complaints')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List current resident complaints' })
  @ApiOkResponse({ type: ComplaintResponseEntity, isArray: true })
  findMyComplaints(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
    @Query('apartmentId') apartmentId?: string,
  ) {
    return this.complaintsService.findMyComplaints(currentUser, {
      residenceId,
      apartmentId,
    });
  }

  @Post('me/complaints')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Create complaint for current resident apartment' })
  @ApiCreatedResponse({ type: ComplaintResponseEntity })
  createMyComplaint(
    @Body() dto: CreateMyComplaintDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.createMyComplaint(dto, currentUser);
  }

  @Get('me/complaints/:id')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get current resident complaint by id' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  findMyComplaint(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findMyComplaint(id, currentUser);
  }

  @Get('me/complaints/:complaintId/media')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List media for current resident complaint' })
  @ApiOkResponse({ type: ComplaintMediaResponseEntity, isArray: true })
  findMyComplaintMedia(
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findMyMedia(complaintId, currentUser);
  }

  @Post('me/complaints/:complaintId/media')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Add media to current resident complaint' })
  @ApiCreatedResponse({ type: ComplaintMediaResponseEntity })
  addMyComplaintMedia(
    @Param('complaintId', new ParseUUIDPipe()) complaintId: string,
    @Body() dto: AddComplaintMediaDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.addMyMedia(complaintId, dto, currentUser);
  }

  @Post('residences/:residenceId/complaints')
  @Roles(UserRole.RESIDENT, UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Create complaint in residence' })
  @ApiCreatedResponse({ type: ComplaintResponseEntity })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreateComplaintDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.create(residenceId, dto, currentUser);
  }

  @Get('residences/:residenceId/my-complaints')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List my complaints by residence' })
  @ApiOkResponse({ type: ComplaintResponseEntity, isArray: true })
  findMyByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findMyByResidence(residenceId, currentUser);
  }

  @Get('residences/:residenceId/complaints')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List complaints by residence' })
  @ApiOkResponse({ type: ComplaintResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findByResidence(residenceId, currentUser);
  }

  @Get('complaints/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get complaint by id' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findOne(id, currentUser);
  }

  @Put('complaints/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Update complaint' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateComplaintDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.update(id, dto, currentUser);
  }

  @Patch('complaints/:id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Update complaint status' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateComplaintStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.updateStatus(id, dto, currentUser);
  }

  @Delete('complaints/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Soft delete complaint' })
  @ApiOkResponse({ type: ComplaintResponseEntity })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.remove(id, currentUser);
  }

  @Post('complaints/:id/media')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Add media to complaint' })
  @ApiCreatedResponse({ type: ComplaintMediaResponseEntity })
  addMedia(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddComplaintMediaDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.addMedia(id, dto, currentUser);
  }

  @Post('complaints/:id/comments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'Add comment to complaint' })
  @ApiCreatedResponse({ type: ComplaintCommentResponseEntity })
  addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AddComplaintCommentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.addComment(id, dto, currentUser);
  }

  @Get('complaints/:id/comments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.RESIDENT)
  @ApiOperation({ summary: 'List comments by complaint' })
  @ApiOkResponse({ type: ComplaintCommentResponseEntity, isArray: true })
  findComments(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.complaintsService.findComments(id, currentUser);
  }
}
