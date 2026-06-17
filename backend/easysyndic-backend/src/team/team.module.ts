import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { TeamController } from './team.controller';
import { TeamPermissionsService } from './team-permissions.service';
import { TeamService } from './team.service';

@Module({
  imports: [PrismaModule],
  controllers: [TeamController],
  providers: [TeamService, TeamPermissionsService, PermissionsGuard],
  exports: [TeamPermissionsService, PermissionsGuard],
})
export class TeamModule {}
