import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Enrollments')
@Controller('v1/enrollments')
export class EnrollmentsController {}
