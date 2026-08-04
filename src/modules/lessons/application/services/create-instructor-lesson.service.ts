import { Injectable } from '@nestjs/common';
import { CourseManagementActor } from '../../../course/application/policies/course-management.policy';
import { CreateInstructorLessonDto } from '../dto/instructor-lesson.dto';
import { CreateLessonService } from './create-lesson.service';
import { InstructorLessonAccessResolver } from './instructor-lesson-access.resolver';

@Injectable()
export class CreateInstructorLessonService {
  constructor(
    private readonly resolver: InstructorLessonAccessResolver,
    private readonly createLessonService: CreateLessonService,
  ) {}

  async execute(
    actor: CourseManagementActor,
    sectionId: string,
    input: CreateInstructorLessonDto,
  ) {
    const { section, course } = await this.resolver.assertCanAuthorSection(actor, sectionId);

    const lessonEntity = await this.createLessonService.execute({
      title: input.title,
      description: input.description,
      contentMarkdown: input.contentMarkdown,
      lessonType: input.lessonType,
      videoUrl: input.videoUrl,
      transcript: input.transcript,
      transcriptLanguage: input.transcriptLanguage,
      subtitleTracks: input.subtitleTracks,
      codeSnippets: input.codeSnippets,
      estimatedTime: input.estimatedTime,
      courseId: course._id.toString(),
      sectionId: section._id.toString(),
      createdBy: actor.id,
    });

    return lessonEntity;
  }
}
