import { createLessonSchema } from './lesson.dto';

const baseLesson = {
  courseId: '507f1f77bcf86cd799439011',
  title: 'Video lesson',
};

describe('createLessonSchema', () => {
  it('accepts transcript content and multiple WebVTT subtitle tracks', () => {
    expect(
      createLessonSchema.safeParse({
        ...baseLesson,
        transcript: 'A searchable transcript for this lesson.',
        transcriptLanguage: 'en',
        subtitleTracks: [
          { language: 'en', label: 'English', url: 'https://cdn.example.com/video.en.vtt' },
          { language: 'vi', label: 'Tiếng Việt', url: 'https://cdn.example.com/video.vi.vtt' },
        ],
      }).success
    ).toBe(true);
  });

  it('rejects a subtitle track without a valid URL', () => {
    expect(
      createLessonSchema.safeParse({
        ...baseLesson,
        subtitleTracks: [{ language: 'en', url: 'not-a-url' }],
      }).success
    ).toBe(false);
  });
});
