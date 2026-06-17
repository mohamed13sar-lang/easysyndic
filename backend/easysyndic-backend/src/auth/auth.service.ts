import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    console.log('login started');
    const { identifier, password } = loginDto;

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [{ email: identifier }, { phone: identifier }],
        },
      });
      console.log(`user found: ${user ? 'yes' : 'no'}`);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is inactive');
      }

      const passwordLoginRoles: UserRole[] = [
        UserRole.SUPER_ADMIN,
        UserRole.SYNDIC,
        UserRole.VICE_SYNDIC,
        UserRole.CAISSIER,
        UserRole.GARDIEN,
        UserRole.SECRETAIRE,
        UserRole.CASHIER,
      ];

      if (!passwordLoginRoles.includes(user.role)) {
        throw new UnauthorizedException('This user must login with OTP');
      }

      const hasPassword = Boolean(user.password);
      console.log(`password exists: ${hasPassword ? 'yes' : 'no'}`);
      if (!user.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log(`password compare result: ${isPasswordValid}`);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const payload: JwtPayload = {
        sub: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      console.log('token generated');

      return {
        accessToken,
        user: {
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Login unexpected error:', error);
      throw new InternalServerErrorException('Login failed');
    }
  }
}
