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
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { DeclarePaymentDto } from './dto/declare-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { MyPaymentResponseEntity } from './entities/my-payment-response.entity';
import { PaymentResponseEntity } from './entities/payment-response.entity';
import { PaymentsService } from './payments.service';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Payments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.CASHIER)
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('syndic/residences/:residenceId/payments/non-paid')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List non-paid payments by syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity, isArray: true })
  findNonPaidBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findNonPaidByResidence(
      residenceId,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List payments by syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity, isArray: true })
  findBySyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findByResidence(residenceId, currentUser);
  }

  @Post('syndic/residences/:residenceId/payments')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Create payment in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: PaymentResponseEntity })
  createForSyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.create(residenceId, dto, currentUser);
  }

  @Patch('syndic/residences/:residenceId/payments/:paymentId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Update payment in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  updateForSyndicResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.updateInResidence(
      residenceId,
      paymentId,
      dto,
      currentUser,
    );
  }

  @Get('syndic/residences/:residenceId/payments/:paymentId/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'List payment transactions in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiOkResponse({ isArray: true })
  findTransactionsForSyndicPayment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findTransactionsInResidence(
      residenceId,
      paymentId,
      currentUser,
    );
  }

  @Post('syndic/residences/:residenceId/payments/:paymentId/transactions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Add payment transaction in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiCreatedResponse({ type: PaymentResponseEntity })
  addTransactionForSyndicPayment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() dto: CreatePaymentTransactionDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.addTransaction(
      residenceId,
      paymentId,
      dto,
      currentUser,
    );
  }

  @Patch(
    'syndic/residences/:residenceId/payments/:paymentId/transactions/:transactionId/validate',
  )
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Validate resident declared payment transaction' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  validateTransactionForSyndicPayment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.validateTransaction(
      residenceId,
      paymentId,
      transactionId,
      currentUser,
    );
  }

  @Patch(
    'syndic/residences/:residenceId/payments/:paymentId/transactions/:transactionId/reject',
  )
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Reject resident declared payment transaction' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  rejectTransactionForSyndicPayment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.rejectTransaction(
      residenceId,
      paymentId,
      transactionId,
      currentUser,
    );
  }

  @Delete(
    'syndic/residences/:residenceId/payments/:paymentId/transactions/:transactionId',
  )
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
  @ApiOperation({ summary: 'Soft delete payment transaction in syndic residence' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiParam({ name: 'transactionId', format: 'uuid' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  removeTransactionForSyndicPayment(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Param('transactionId', new ParseUUIDPipe()) transactionId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.removeTransaction(
      residenceId,
      paymentId,
      transactionId,
      currentUser,
    );
  }

  @Get('me/payments')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'List current resident payments' })
  @ApiOkResponse({ type: MyPaymentResponseEntity, isArray: true })
  findMyPayments(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
    @Query('apartmentId') apartmentId?: string,
  ) {
    return this.paymentsService.findMyPayments(currentUser, {
      residenceId,
      apartmentId,
    });
  }

  @Get('me/payments/summary')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get current resident payment account summary' })
  @ApiOkResponse({
    schema: {
      example: {
        amountDueTotal: 1500,
        amountPaidTotal: 1000,
        balance: -500,
        remainingToPay: 500,
        creditBalance: 0,
        status: 'DEBT',
      },
    },
  })
  findMyPaymentsSummary(
    @CurrentUser() currentUser: AuthUser,
    @Query('residenceId') residenceId?: string,
    @Query('apartmentId') apartmentId?: string,
  ) {
    return this.paymentsService.findMyPaymentsSummary(currentUser, {
      residenceId,
      apartmentId,
    });
  }

  @Get('me/payments/:paymentId')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Get current resident payment by id' })
  @ApiOkResponse({ type: MyPaymentResponseEntity })
  findMyPayment(
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findMyPayment(paymentId, currentUser);
  }

  @Post('me/payments/:paymentId/declare-payment')
  @Roles(UserRole.RESIDENT)
  @ApiOperation({ summary: 'Declare a payment for validation' })
  @ApiParam({ name: 'paymentId', format: 'uuid' })
  @ApiCreatedResponse({ type: MyPaymentResponseEntity })
  declareMyPayment(
    @Param('paymentId', new ParseUUIDPipe()) paymentId: string,
    @Body() dto: DeclarePaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.declarePayment(paymentId, dto, currentUser);
  }

  @Post('residences/:residenceId/payments')
  @ApiOperation({ summary: 'Create payment' })
  @ApiParam({ name: 'residenceId', format: 'uuid' })
  @ApiCreatedResponse({ type: PaymentResponseEntity })
  create(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: CreatePaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.create(residenceId, dto, currentUser);
  }

  @Get('residences/:residenceId/payments/non-paid')
  @ApiOperation({ summary: 'List non-paid payments by residence' })
  @ApiOkResponse({ type: PaymentResponseEntity, isArray: true })
  findNonPaidByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findNonPaidByResidence(
      residenceId,
      currentUser,
    );
  }

  @Get('residences/:residenceId/payments')
  @ApiOperation({ summary: 'List payments by residence' })
  @ApiOkResponse({ type: PaymentResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findByResidence(residenceId, currentUser);
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment by id' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.findOne(id, currentUser);
  }

  @Put('payments/:id')
  @ApiOperation({ summary: 'Update payment' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePaymentDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.update(id, dto, currentUser);
  }

  @Patch('payments/:id/status')
  @ApiOperation({ summary: 'Update payment status' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdatePaymentStatusDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.updateStatus(id, dto, currentUser);
  }

  @Delete('payments/:id')
  @ApiOperation({ summary: 'Soft delete payment' })
  @ApiOkResponse({ type: PaymentResponseEntity })
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.paymentsService.remove(id, currentUser);
  }
}
