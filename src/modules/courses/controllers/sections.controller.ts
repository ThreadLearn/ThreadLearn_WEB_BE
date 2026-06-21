import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { z } from '../../../common/zod/z';
import { SectionsService } from '../services/sections.service';

const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id.');
const sectionPayloadSchema = z.object({
  courseId: objectIdSchema,
  title: z.string().min(1, 'title is required.'),
  orderIndex: z.number().optional(),
  description: z.string().optional(),
  isPublished: z.boolean().optional(),
});
const updateSectionSchema = sectionPayloadSchema.partial();
const reorderSectionsSchema = z.object({
  courseId: objectIdSchema,
  items: z.array(z.object({ id: objectIdSchema, orderIndex: z.number() })).optional(),
});

@ApiTags('Sections')
@Controller('v1/sections')
export class SectionsController {
  @Get()
  async list(@Query('courseId', new ZodValidationPipe(objectIdSchema)) courseId: string) {
    const data = await SectionsService.listByCourse(courseId);
    return ApiResponse.success({ message: 'Sections fetched.', data });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async create(@Body(new ZodValidationPipe(sectionPayloadSchema)) body: any) {
    const section = await SectionsService.create(body);
    return ApiResponse.success({ message: 'Section created.', data: section, statusCode: 201 });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async update(
    @Param('id', new ZodValidationPipe(objectIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateSectionSchema)) body: any,
  ) {
    const section = await SectionsService.update(id, body);
    return ApiResponse.success({ message: 'Section updated.', data: section });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async remove(@Param('id', new ZodValidationPipe(objectIdSchema)) id: string) {
    const result = await SectionsService.remove(id);
    return ApiResponse.success({ message: 'Section deleted.', data: result });
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async reorder(
    @Body(new ZodValidationPipe(reorderSectionsSchema))
    body: { courseId: string; items?: { id: string; orderIndex: number }[] },
  ) {
    const data = await SectionsService.reorder(body.courseId, body.items ?? []);
    return ApiResponse.success({ message: 'Sections reordered.', data });
  }
}

export default SectionsController;
