import { apiHandler } from '@/common/api-handler';
import { LessonsController } from '@/modules/lessons/controllers/lessons.controller';

export const GET = apiHandler(LessonsController.getLessonById);
