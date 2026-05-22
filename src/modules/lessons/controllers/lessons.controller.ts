import { AuthenticatedNextRequest } from '../../../common/api-handler';
import { ApiResponse } from '../../../common/api-response';
import { LessonsService } from '../services/lessons.service';
import { BadRequestError } from '../../../common/custom-error';
import { saveUploadedFile } from '../../../configs/upload';

export class LessonsController {
  static async getLessonById(req: AuthenticatedNextRequest, { params }: { params: { id: string } }) {
    const lesson = await LessonsService.getLesson(params.id);
    return ApiResponse.success({
      message: 'Lesson content retrieved successfully.',
      data: lesson,
    });
  }

  static async createLesson(req: AuthenticatedNextRequest) {
    const body = await req.json();
    const lesson = await LessonsService.createLesson(body);
    return ApiResponse.success({
      message: 'Lesson created successfully.',
      data: lesson,
      statusCode: 201,
    });
  }

  static async uploadAttachment(req: AuthenticatedNextRequest, { params }: { params: { id: string } }) {
    try {
      const formData = await req.formData();
      const file = formData.get('attachment') as File;

      if (!file) {
        throw new BadRequestError('No attachment file provided in FormData.');
      }

      const fileUrl = await saveUploadedFile(file, 'attachments');
      const updatedLesson = await LessonsService.updateAttachment(params.id, fileUrl);

      return ApiResponse.success({
        message: 'Attachment uploaded successfully.',
        data: updatedLesson,
      });
    } catch (err: any) {
      if (err instanceof BadRequestError) throw err;
      throw new BadRequestError('Failed to parse multipart/form-data for lesson attachment upload.');
    }
  }
}
export default LessonsController;
