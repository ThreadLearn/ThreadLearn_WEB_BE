import { Injectable } from '@nestjs/common';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { UpdateInstructorLessonDto } from '../dto/instructor-lesson.dto';
import { UpdateLessonService } from './update-lesson.service';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class UpdateInstructorLessonService {
  constructor(
    private readonly resolver: InstructorLessonAccessResolver,
    private readonly updateLessonService: UpdateLessonService,
  ) {}

  async execute(
    actor: CourseManagementActor,
    lessonId: string,
    input: UpdateInstructorLessonDto,
  ) {
    const { lesson } = await this.resolver.assertCanAuthorLesson(actor, lessonId);

    const updatedEntity = await this.updateLessonService.execute(
      lesson._id.toString(),
      {
        title: input.title,
        description: input.description,
        contentMarkdown: input.contentMarkdown,
        videoUrl: input.videoUrl,
        transcript: input.transcript,
        transcriptLanguage: input.transcriptLanguage,
        subtitleTracks: input.subtitleTracks,
        codeSnippets: input.codeSnippets,
        estimatedTime: input.estimatedTime,
      },
      { id: actor.id },
    );

    return updatedEntity;
  }
}
