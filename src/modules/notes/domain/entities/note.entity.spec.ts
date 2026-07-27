import { NoteEntity } from './note.entity';

const createNote = () => NoteEntity.createNew({
  userId: 'user-1',
  lessonId: 'lesson-1',
  noteText: 'Remember the event loop ordering.',
  anchorStart: 4,
  anchorEnd: 12,
});

describe('NoteEntity anchor range', () => {
  it('rejects an anchor whose end is not after its start on creation', () => {
    expect(() => NoteEntity.createNew({
      userId: 'user-1',
      lessonId: 'lesson-1',
      noteText: 'Invalid anchor',
      anchorStart: 12,
      anchorEnd: 12,
    })).toThrow('anchorEnd must be greater than anchorStart.');
  });

  it('preserves a valid range and rejects an invalid patch atomically', () => {
    const note = createNote();
    expect(() => note.applyPatch({ anchorEnd: 4 })).toThrow('anchorEnd must be greater than anchorStart.');
    expect(note.toProps()).toMatchObject({ anchorStart: 4, anchorEnd: 12 });
  });
});
