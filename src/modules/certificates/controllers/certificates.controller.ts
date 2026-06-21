import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CertificatesService } from '../services/certificates.service';

@ApiTags('Certificates')
@Controller('v1/certificates')
export class CertificatesController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('BearerAuth')
  async mine(@CurrentUser() user: AuthenticatedUser) {
    const certificates = await CertificatesService.listMine(user.id);
    return ApiResponse.success({ message: 'Certificates fetched.', data: certificates });
  }

  @Get('verify/:code')
  async verify(@Param('code') code: string) {
    const certificate = await CertificatesService.verify(code);
    return ApiResponse.success({ message: 'Certificate verified.', data: certificate });
  }
}
