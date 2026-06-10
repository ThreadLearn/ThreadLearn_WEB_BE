import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from '../../../common/api-response';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SectionsService } from '../services/sections.service';

@ApiTags('Sections')
@Controller('v1/sections')
export class SectionsController {
  @Get()
  async list(@Query('courseId') courseId: string) {
    const data = await SectionsService.listByCourse(courseId);
    return ApiResponse.success({ message: 'Sections fetched.', data });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async create(@Body() body: any) {
    const section = await SectionsService.create(body);
    return ApiResponse.success({ message: 'Section created.', data: section, statusCode: 201 });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async update(@Param('id') id: string, @Body() body: any) {
    const section = await SectionsService.update(id, body);
    return ApiResponse.success({ message: 'Section updated.', data: section });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async remove(@Param('id') id: string) {
    const result = await SectionsService.remove(id);
    return ApiResponse.success({ message: 'Section deleted.', data: result });
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('BearerAuth')
  async reorder(@Body() body: { courseId: string; items: { id: string; orderIndex: number }[] }) {
    const data = await SectionsService.reorder(body.courseId, body.items ?? []);
    return ApiResponse.success({ message: 'Sections reordered.', data });
  }
}

export default SectionsController;
