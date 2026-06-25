import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TeamModule } from '../team/team.module';
import { AssembliesController } from './assemblies.controller';
import { AssembliesService } from './assemblies.service';

@Module({
  imports: [PrismaModule, TeamModule],
  controllers: [AssembliesController],
  providers: [AssembliesService],
})
export class AssembliesModule {}
