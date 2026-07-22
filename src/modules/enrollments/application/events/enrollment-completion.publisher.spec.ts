import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentCompletionPublisher } from './enrollment-completion.publisher';

describe('EnrollmentCompletionPublisher', () => {
  const lessonEvent = {
    userId: 'student-1',
    lessonId: 'lesson-1',
    lessonTitle: 'Events in NestJS',
    courseId: 'course-1',
    progressPercent: 50,
    totalLessons: 2,
    completedLessons: 1,
    alreadyCompleted: false,
    courseCompleted: false,
  };

  it('publishes a first-time lesson completion and returns listener effects', async () => {
    const events = new EventEmitter2();
    const lessonListener = jest.fn().mockResolvedValue({
      xpRewarded: 100,
      stats: { xp: 100 },
    });
    events.on('lesson.completed', lessonListener);

    await expect(
      new EnrollmentCompletionPublisher(events).publishLessonCompleted(lessonEvent),
    ).resolves.toEqual({ xpRewarded: 100, stats: { xp: 100 } });
    expect(lessonListener).toHaveBeenCalledWith(lessonEvent);
  });

  it('does not publish side effects for an already completed lesson', async () => {
    const events = new EventEmitter2();
    const lessonListener = jest.fn();
    events.on('lesson.completed', lessonListener);

    await expect(
      new EnrollmentCompletionPublisher(events).publishLessonCompleted({
        ...lessonEvent,
        alreadyCompleted: true,
      }),
    ).resolves.toEqual({ xpRewarded: 0, stats: null });
    expect(lessonListener).not.toHaveBeenCalled();
  });

  it('publishes lesson and course events and combines their reward effects', async () => {
    const events = new EventEmitter2();
    const emitted: string[] = [];
    events.on('lesson.completed', async () => {
      emitted.push('lesson.completed');
      return { xpRewarded: 100, stats: { xp: 100 } };
    });
    events.on('course.completed', async () => {
      emitted.push('course.completed');
      return { xpRewarded: 500, stats: { xp: 600 } };
    });

    await expect(
      new EnrollmentCompletionPublisher(events).publishLessonCompleted({
        ...lessonEvent,
        progressPercent: 100,
        completedLessons: 2,
        courseCompleted: true,
      }),
    ).resolves.toEqual({ xpRewarded: 600, stats: { xp: 600 } });
    expect(emitted).toEqual(['lesson.completed', 'course.completed']);
  });

  it('ignores listener results that are not completion effects', async () => {
    const events = new EventEmitter2();
    events.on('lesson.completed', async () => undefined);
    events.on('lesson.completed', async () => ({ xpRewarded: 'invalid' }));

    await expect(
      new EnrollmentCompletionPublisher(events).publishLessonCompleted(lessonEvent),
    ).resolves.toEqual({ xpRewarded: 0, stats: null });
  });
});
