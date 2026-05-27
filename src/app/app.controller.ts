import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../common/api-response';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('v1/health')
  getHealth() {
    return ApiResponse.success({
      message: 'ThreadLearn scalable backend is healthy and fully operational.',
      data: {
        uptime: process.uptime(),
        timestamp: new Date(),
        status: 'UP',
      },
    });
  }

  @Get('v1/docs')
  @Redirect('/api/docs', 302)
  redirectLegacyDocs() {
    return { url: '/api/docs' };
  }
}
