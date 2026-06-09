import { ApiProperty } from '@nestjs/swagger';
import { AuthUserEntity } from './auth-user.entity';

export class LoginResponseEntity {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ type: AuthUserEntity })
  user!: AuthUserEntity;
}
