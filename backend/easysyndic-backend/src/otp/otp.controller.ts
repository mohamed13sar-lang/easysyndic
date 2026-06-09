import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginResponseEntity } from '../auth/entities/login-response.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendOtpResponseEntity } from './entities/send-otp-response.entity';
import { OtpService } from './otp.service';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'Send OTP to a Moroccan resident phone number using Twilio Verify',
  })
  @ApiOkResponse({ type: SendOtpResponseEntity })
  @ApiBadRequestResponse({ description: 'Invalid phone number format' })
  @ApiTooManyRequestsResponse({ description: 'Too many OTP requests' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.otpService.sendOtp(dto);
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({
    summary: 'Verify resident OTP and return a JWT access token',
  })
  @ApiOkResponse({ type: LoginResponseEntity })
  @ApiBadRequestResponse({ description: 'Invalid request body' })
  @ApiUnauthorizedResponse({
    description: 'Invalid OTP, expired OTP, or inactive resident',
  })
  @ApiNotFoundResponse({
    description: 'Resident account not found for this phone number',
  })
  @ApiTooManyRequestsResponse({
    description: 'Too many OTP verification attempts',
  })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.otpService.verifyOtp(dto);
  }
}
