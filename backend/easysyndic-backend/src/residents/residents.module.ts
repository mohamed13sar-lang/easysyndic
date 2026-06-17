import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';

@Module({
  imports: [TeamModule],
  controllers: [ResidentsController],
  providers: [ResidentsService],
})
export class ResidentsModule {}
