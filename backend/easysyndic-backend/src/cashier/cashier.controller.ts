import {
  Controller,
  Get,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CashierService } from './cashier.service';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Cashier')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.CASHIER)
@Controller()
export class CashierController {
  constructor(private readonly cashierService: CashierService) {}

  @Get('residences/:residenceId/cashier/dashboard')
  @ApiOperation({ summary: 'Get cashier dashboard for a residence and period' })
  @ApiOkResponse({ description: 'Cashier dashboard' })
  getDashboard(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Query('month', ParseIntPipe) month: number,
    @Query('year', ParseIntPipe) year: number,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.cashierService.getDashboard(
      residenceId,
      month,
      year,
      currentUser,
    );
  }
}
