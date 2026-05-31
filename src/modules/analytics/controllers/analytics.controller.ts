import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('v1/analytics')
export class AnalyticsController {}
