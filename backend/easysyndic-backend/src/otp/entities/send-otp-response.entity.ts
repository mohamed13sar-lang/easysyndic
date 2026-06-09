import { ApiProperty } from '@nestjs/swagger';

export class SendOtpResponseEntity {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'OTP sent successfully' })
  message!: string;
}
