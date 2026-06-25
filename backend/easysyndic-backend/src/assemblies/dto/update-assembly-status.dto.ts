import { AssemblyStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAssemblyStatusDto {
  @IsEnum(AssemblyStatus)
  status!: AssemblyStatus;
}
