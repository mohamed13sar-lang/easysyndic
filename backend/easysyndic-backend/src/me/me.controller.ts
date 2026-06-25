import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MeResidencesResponseEntity } from './entities/me-residences-response.entity';
import { MeService } from './me.service';

type AuthenticatedUser = {
  id: string;
  role: UserRole;
};

@ApiTags('Me')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get('residences')
  @ApiOperation({
    summary: 'Get current resident profile, residences and apartments',
  })
  @ApiOkResponse({ type: MeResidencesResponseEntity })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({
    description: 'Only residents can access this endpoint',
  })
  findMyResidences(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.meService.findMyResidences(currentUser);
  }
}
