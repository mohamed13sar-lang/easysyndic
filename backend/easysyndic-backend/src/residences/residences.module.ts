import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { ResidencesController } from './residences.controller';
import { ResidencesService } from './residences.service';

@Module({
  imports: [TeamModule],
  controllers: [ResidencesController],
  providers: [ResidencesService],
})
export class ResidencesModule {}
