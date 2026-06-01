import {
  Controller, Get, Put, Patch, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../../../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Current user ───────────────────────────────────────────────────────────

  @Get('me')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    const data = await this.usersService.getProfile(user.id);
    return { message: 'Profile retrieved.', data };
  }

  @Put('me')
  @ApiOperation({ summary: 'UC09 — update profile.' })
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() body: { name?: string; avatarUrl?: string; firstName?: string; lastName?: string },
  ) {
    const data = await this.usersService.updateProfile(user.id, body);
    return { message: 'Profile updated.', data };
  }

  // ── Admin endpoints (UC10-13) ──────────────────────────────────────────────

  @Get()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC12 — list users (Admin).' })
  async list(
    @Query('page')   page  = '1',
    @Query('limit')  limit = '20',
    @Query('search') search = '',
  ) {
    const result = await this.usersService.listUsers(
      parseInt(page, 10), parseInt(limit, 10), search,
    );
    return {
      message: 'Users fetched.',
      data:    result.data,
      meta:    {
        page: result.page, limit: result.limit,
        total: result.total, totalPages: result.totalPages,
      },
    };
  }

  @Post()
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC10 — add student (Admin).' })
  async create(@Body() body: { name: string; email: string; password: string }) {
    const data = await this.usersService.createStudent(body);
    return { message: 'Student created.', data, statusCode: 201 };
  }

  @Put(':id')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC13 — update student info (Admin).' })
  async adminUpdate(@Param('id') id: string, @Body() body: any) {
    const data = await this.usersService.adminUpdateUser(id, body);
    return { message: 'User updated.', data };
  }

  @Patch(':id/lock')
  @Roles('ADMIN')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'UC11 — lock/unlock student (Admin).' })
  async toggleLock(@Param('id') id: string) {
    const data = await this.usersService.toggleLock(id);
    return { message: 'Lock toggled.', data };
  }
}
