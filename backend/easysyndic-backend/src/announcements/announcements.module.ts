import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamModule } from '../team/team.module';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

@Module({
  imports: [NotificationsModule, TeamModule],
  controllers: [AnnouncementsController],
  providers: [AnnouncementsService],
})
export class AnnouncementsModule {}
