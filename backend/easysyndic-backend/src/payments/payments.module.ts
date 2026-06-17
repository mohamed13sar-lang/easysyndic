import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamModule } from '../team/team.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [NotificationsModule, TeamModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
