import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CertificatesService } from '../services/certificates.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('certificates')
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certs: CertificatesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: 'UC58 — list my certificates.' })
  async myCerts(@CurrentUser() user: JwtPayload) {
    const data = await this.certs.getMyCertificates(user.id);
    return { message: 'Certificates fetched.', data };
  }

  /** Public endpoint — no auth needed (for LinkedIn / CV verification). */
  @Get('verify/:code')
  @ApiOperation({ summary: 'UC58 — public verify certificate by code.' })
  async verify(@Param('code') code: string) {
    const data = await this.certs.verifyByCode(code);
    return { message: 'Certificate is valid.', data };
  }
}
