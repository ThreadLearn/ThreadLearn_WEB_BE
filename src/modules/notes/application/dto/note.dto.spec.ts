import { createNoteSchema, updateNoteSchema } from './note.dto';

describe('note DTO anchor contract', () => {
  const lessonId = '507f1f77bcf86cd799439011';

  it('accepts a complete increasing anchor range', () => {
    expect(createNoteSchema.safeParse({
      lessonId,
      noteText: 'Remember this',
      anchorStart: 2,
      anchorEnd: 8,
    }).success).toBe(true);
  });

  it('rejects a partial or reversed anchor range', () => {
    expect(createNoteSchema.safeParse({
      lessonId,
      noteText: 'Remember this',
      anchorStart: 2,
    }).success).toBe(false);
    expect(updateNoteSchema.safeParse({
      anchorStart: 8,
      anchorEnd: 2,
    }).success).toBe(false);
  });

  it('rejects empty patches and schema-sized overflows as validation errors', () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
    expect(updateNoteSchema.safeParse({ noteText: 'x'.repeat(10_001) }).success).toBe(false);
    expect(updateNoteSchema.safeParse({ codeSnippet: 'x'.repeat(50_001) }).success).toBe(false);
  });
});
