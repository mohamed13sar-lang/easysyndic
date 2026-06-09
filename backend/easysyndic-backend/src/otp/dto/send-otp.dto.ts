import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class SendOtpDto {
  @ApiProperty({ example: '+212612345678' })
  @Matches(/^\+212[67]\d{8}$/, {
    message:
      'phone must be a valid Moroccan mobile number in +2126XXXXXXXX or +2127XXXXXXXX format',
  })
  phone!: string;
}
