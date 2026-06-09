import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { DashboardService } from './dashboard.service';
import { SyndicDashboardStatsEntity } from './entities/syndic-dashboard-stats.entity';

type AuthUser = { id: string; role: UserRole };

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYNDIC)
@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiOkResponse({ description: 'Dashboard stats payload' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('syndic/dashboard/stats')
  @ApiOperation({ summary: 'Get syndic-scoped dashboard statistics' })
  @ApiOkResponse({ type: SyndicDashboardStatsEntity })
  getSyndicStats(@CurrentUser() currentUser: AuthUser) {
    return this.dashboardService.getSyndicStats(currentUser);
  }
}
