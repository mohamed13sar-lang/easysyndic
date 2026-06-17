import { Module } from '@nestjs/common';
import { TeamModule } from '../team/team.module';
import { ApartmentsController } from './apartments.controller';
import { ApartmentsService } from './apartments.service';

@Module({
  imports: [TeamModule],
  controllers: [ApartmentsController],
  providers: [ApartmentsService],
})
export class ApartmentsModule {}
