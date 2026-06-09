import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import twilio, { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class OtpService {
  private readonly twilioClient: Twilio;
  private readonly verifyServiceSid: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {
    const accountSid =
      this.configService.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken =
      this.configService.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    this.verifyServiceSid = this.configService.getOrThrow<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );
    this.twilioClient = twilio(accountSid, authToken);
  }

  async sendOtp(dto: SendOtpDto) {
    try {
      await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verifications.create({
          to: dto.phone,
          channel: 'sms',
        });

      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (error: unknown) {
      this.handleTwilioError(error, 'Failed to send OTP');
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: dto.phone,
          code: dto.code,
        });

      if (verificationCheck.status !== 'approved') {
        throw new UnauthorizedException('Invalid or expired OTP code');
      }

      const user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || user.role !== UserRole.RESIDENT) {
        throw new NotFoundException(
          'Resident account not found for this phone number',
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Resident account is inactive');
      }

      const payload: JwtPayload = {
        sub: user.id,
        role: user.role,
        phone: user.phone,
        email: user.email,
      };

      return {
        accessToken: await this.jwtService.signAsync(payload),
        user,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.handleTwilioError(error, 'Failed to verify OTP');
    }
  }

  private handleTwilioError(error: unknown, fallbackMessage: string): never {
    const twilioError = error as {
      status?: number;
      code?: number;
      message?: string;
    };

    if (
      twilioError.status &&
      twilioError.status >= 400 &&
      twilioError.status < 500
    ) {
      throw new UnauthorizedException(twilioError.message ?? fallbackMessage);
    }

    if (twilioError.status && twilioError.status >= 500) {
      throw new BadGatewayException(fallbackMessage);
    }

    throw new InternalServerErrorException(fallbackMessage);
  }
}
