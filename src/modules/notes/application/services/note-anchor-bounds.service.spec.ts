import { CreateNoteService } from './create-note.service';
import { UpdateNoteService } from './update-note.service';
import { NoteEntity } from '../../domain/entities/note.entity';

describe('note anchor bounds', () => {
  const lesson = {
    id: '507f1f77bcf86cd799439012',
    courseId: '507f1f77bcf86cd799439013',
    contentLength: 20,
  };

  it('rejects a new note whose anchor exceeds the lesson content', async () => {
    const notes = { create: jest.fn() };
    const access = {
      assertLessonInteractionAccess: jest.fn().mockResolvedValue(lesson),
    };
    const service = new CreateNoteService(notes as any, access as any);

    await expect(service.execute('507f1f77bcf86cd799439011', {
      lessonId: lesson.id,
      noteText: 'Remember this',
      anchorStart: 10,
      anchorEnd: 21,
    })).rejects.toMatchObject({ statusCode: 400 });
    expect(notes.create).not.toHaveBeenCalled();
  });

  it('checks the owned note lesson before changing its anchor', async () => {
    const note = NoteEntity.fromPersistence({
      id: '507f1f77bcf86cd799439014',
      userId: '507f1f77bcf86cd799439011',
      lessonId: lesson.id,
      noteText: 'Remember this',
      anchorStart: 1,
      anchorEnd: 4,
    });
    const notes = {
      findOwned: jest.fn().mockResolvedValue(note),
      update: jest.fn(),
    };
    const access = {
      assertLessonInteractionAccess: jest.fn().mockResolvedValue(lesson),
    };
    const service = new UpdateNoteService(notes as any, access as any);

    await expect(service.execute(
      '507f1f77bcf86cd799439011',
      note.id,
      { anchorEnd: 21 },
    )).rejects.toMatchObject({ statusCode: 400 });
    expect(access.assertLessonInteractionAccess).toHaveBeenCalledWith(
      lesson.id,
      { id: '507f1f77bcf86cd799439011', role: 'STUDENT' },
    );
    expect(notes.update).not.toHaveBeenCalled();
  });
});
