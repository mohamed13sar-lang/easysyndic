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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceStatusDto } from './dto/update-invoice-status.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseEntity } from './entities/invoice-response.entity';
import { InvoicesService } from './invoices.service';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.CASHIER)
@Controller()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('residences/:residenceId/invoices')
  @ApiOperation({ summary: 'Create expense invoice' })
  @ApiCreatedResponse({ type: InvoiceResponseEntity })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreateInvoiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.create(residenceId, dto, currentUser);
  }

  @Get('residences/:residenceId/invoices')
  @ApiOperation({ summary: 'List invoices by residence' })
  @ApiOkResponse({ type: InvoiceResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.findByResidence(residenceId, currentUser);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by id' })
  @ApiOkResponse({ type: InvoiceResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.findOne(id, currentUser);
  }

  @Put('invoices/:id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiOkResponse({ type: InvoiceResponseEntity })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.update(id, dto, currentUser);
  }

  @Patch('invoices/:id/status')
  @ApiOperation({ summary: 'Update invoice status' })
  @ApiOkResponse({ type: InvoiceResponseEntity })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateInvoiceStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.updateStatus(id, dto, currentUser);
  }

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Soft delete invoice' })
  @ApiOkResponse({ type: InvoiceResponseEntity })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.invoicesService.remove(id, currentUser);
  }
}
