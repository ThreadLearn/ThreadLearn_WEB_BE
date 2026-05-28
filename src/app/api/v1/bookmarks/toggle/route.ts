import { apiHandler } from '@/common/api-handler';
import { BookmarkController } from '@/modules/bookmark/controllers/bookmark.controller';
import { toggleBookmarkSchema } from '@/modules/bookmark/validators/bookmark.validator';

export const POST = apiHandler(BookmarkController.toggle, {
  requireAuth: true,
  allowedRoles: ['STUDENT'],
  schema: toggleBookmarkSchema,
});
