import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
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
@UseGuards(JwtAuthGuard)
@Roles('ADMIN', 'INSTRUCTOR')
@ApiBearerAuth('BearerAuth')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List sections for a course.' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('courseId', new ZodValidationPipe(objectIdSchema)) courseId: string,
  ) {
    const data = await this.sectionsService.listByCourse({ id: user.id, role: user.role }, courseId);
    return ApiResponse.success({ message: 'Sections fetched.', data });
  }

  @Post()
  @ApiOperation({ summary: 'Create a section.' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(sectionPayloadSchema)) body: any,
  ) {
    const section = await this.sectionsService.create({ id: user.id, role: user.role }, body);
    return ApiResponse.success({ message: 'Section created.', data: section, statusCode: 201 });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a section.' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateSectionSchema)) body: any,
  ) {
    const section = await this.sectionsService.update({ id: user.id, role: user.role }, id, body);
    return ApiResponse.success({ message: 'Section updated.', data: section });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a section.' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ZodValidationPipe(objectIdSchema)) id: string,
  ) {
    const result = await this.sectionsService.remove({ id: user.id, role: user.role }, id);
    return ApiResponse.success({ message: 'Section deleted.', data: result });
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder sections within a course.' })
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(reorderSectionsSchema))
    body: { courseId: string; items?: { id: string; orderIndex: number }[] },
  ) {
    const data = await this.sectionsService.reorder({ id: user.id, role: user.role }, body.courseId, body.items ?? []);
    return ApiResponse.success({ message: 'Sections reordered.', data });
  }
}

export default SectionsController;
