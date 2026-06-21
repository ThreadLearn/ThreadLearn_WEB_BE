import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  buildPaginationMeta,
  normalizePagination,
} from '../../../../shared/http/pagination';
import { CourseEntity } from '../../domain/entities/course.entity';
import {
  COURSE_REPOSITORY,
  CourseListFilter,
  ICourseRepository,
} from '../../domain/interfaces/course.repository';
import { ListCoursesQueryDto } from '../dto/course.dto';

/** UC24 — Search / Filter Courses (text index + lọc theo level/language/tag/price...). */
@Injectable()
export class ListCoursesService {
  constructor(@Inject(COURSE_REPOSITORY) private readonly repo: ICourseRepository) {}

  async execute(query: ListCoursesQueryDto & { includeAll?: boolean }): Promise<PaginatedResult<CourseEntity>> {
    const pagination = normalizePagination(query.page, query.limit);
    const filter: CourseListFilter = {
      includeAll: query.includeAll,
      status: query.status,
      keyword: query.q || query.search,
      level: query.level,
      language: query.language,
      tag: query.tag,
      category: query.category,
      isPremium: query.isPremium,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
    };

    const { items, total } = await this.repo.list(filter, pagination);
    return { items, ...buildPaginationMeta(total, pagination.page, pagination.limit) };
  }
}
