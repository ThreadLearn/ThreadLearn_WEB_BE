import { apiHandler } from '@/common/api-handler';
import { BookmarkController } from '@/modules/bookmark/controllers/bookmark.controller';

export const GET = apiHandler(BookmarkController.check, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
});
