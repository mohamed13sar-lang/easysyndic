import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TeamModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
