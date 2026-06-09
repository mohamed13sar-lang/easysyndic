import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: '+212612345678' })
  @Matches(/^\+212[67]\d{8}$/, {
    message:
      'phone must be a valid Moroccan mobile number in +2126XXXXXXXX or +2127XXXXXXXX format',
  })
  phone!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  @Matches(/^\d+$/, { message: 'code must contain digits only' })
  code!: string;
}
