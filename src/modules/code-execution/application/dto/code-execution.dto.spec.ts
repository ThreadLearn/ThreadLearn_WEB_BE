import { MAX_SOURCE_CODE_BYTES, runCodeSchema } from './code-execution.dto';

describe('runCodeSchema UTF-8 byte limit', () => {
  it('accepts source at the byte limit and rejects multi-byte source beyond it', () => {
    expect(runCodeSchema.safeParse({
      sourceCode: 'a'.repeat(MAX_SOURCE_CODE_BYTES),
      language: 'javascript',
    }).success).toBe(true);
    expect(runCodeSchema.safeParse({
      sourceCode: '😀'.repeat(Math.ceil(MAX_SOURCE_CODE_BYTES / 4) + 1),
      language: 'javascript',
    }).success).toBe(false);
  });

  it('rejects unsupported public languages', () => {
    expect(runCodeSchema.safeParse({ sourceCode: 'class Main {}', language: 'java' }).success).toBe(false);
  });
});
