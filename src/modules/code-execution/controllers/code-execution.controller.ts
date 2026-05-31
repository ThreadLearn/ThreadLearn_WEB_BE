import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Code Execution')
@Controller('v1/code-execution')
export class CodeExecutionController {}
