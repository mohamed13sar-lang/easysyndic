import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamModule } from '../team/team.module';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';

@Module({
  imports: [NotificationsModule, TeamModule],
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
})
export class ComplaintsModule {}
