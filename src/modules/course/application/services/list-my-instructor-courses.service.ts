import { Inject, Injectable } from '@nestjs/common';
import { buildPaginationMeta, normalizePagination, PaginatedResult } from '../../../../shared/http/pagination';
import { CourseEntity } from '../../domain/entities/course.entity';
import { COURSE_REPOSITORY, ICourseRepository } from '../../domain/interfaces/course.repository';
import { ListCoursesQueryDto } from '../dto/course.dto';

/** Read-only listing. The ownership filter is derived exclusively from the authenticated JWT subject. */
@Injectable()
export class ListMyInstructorCoursesService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly courseRepo: ICourseRepository) {}

  async execute(instructorId: string, query: ListCoursesQueryDto): Promise<PaginatedResult<CourseEntity>> {
    const pagination = normalizePagination(query.page, query.limit);
    const { items, total } = await this.courseRepo.list(
      {
        includeAll: true,
        instructorId,
        status: query.status === 'deleted' ? undefined : query.status,
        keyword: query.q || query.search,
        level: query.level,
        language: query.language,
        tag: query.tag,
        category: query.category,
        isPremium: query.isPremium,
        minPrice: query.minPrice,
        maxPrice: query.maxPrice,
      },
      pagination,
    );
    return { items, ...buildPaginationMeta(total, pagination.page, pagination.limit) };
  }
}
