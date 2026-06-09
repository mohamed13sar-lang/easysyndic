import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import { GenerateMonthlyStatementDto } from './dto/generate-monthly-statement.dto';
import { MonthlyStatementResponseEntity } from './entities/monthly-statement-response.entity';
import { StatementsService } from './statements.service';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Statements')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC, UserRole.CASHIER)
@Controller()
export class StatementsController {
  constructor(private readonly statementsService: StatementsService) {}

  @Post('residences/:residenceId/statements/generate')
  @ApiOperation({ summary: 'Generate monthly statement' })
  @ApiCreatedResponse({ type: MonthlyStatementResponseEntity })
  generate(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @Body() dto: GenerateMonthlyStatementDto,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.statementsService.generate(residenceId, dto, currentUser);
  }

  @Get('residences/:residenceId/statements')
  @ApiOperation({ summary: 'List monthly statements by residence' })
  @ApiOkResponse({ type: MonthlyStatementResponseEntity, isArray: true })
  findByResidence(
    @Param('residenceId', new ParseUUIDPipe()) residenceId: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.statementsService.findByResidence(residenceId, currentUser);
  }

  @Get('statements/:id')
  @ApiOperation({ summary: 'Get statement by id' })
  @ApiOkResponse({ type: MonthlyStatementResponseEntity })
  findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: AuthUser,
  ) {
    return this.statementsService.findOne(id, currentUser);
  }
}
