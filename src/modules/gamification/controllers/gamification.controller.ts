import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Gamification')
@Controller('v1/gamification')
export class GamificationController {}
