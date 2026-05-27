import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('IDE')
@Controller('v1/ide')
export class IDEController {}
