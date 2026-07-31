import { CodeExecutionMapper } from './code-execution.mapper';

describe('CodeExecutionMapper provider-data boundary', () => {
  it('does not map a legacy Judge0 token into the domain or persistence payload', () => {
    const entity = CodeExecutionMapper.toEntity({
      _id: '507f1f77bcf86cd799439011',
      userId: '507f1f77bcf86cd799439012',
      sourceCode: 'print(1)',
      language: 'python',
      languageId: 71,
      status: 'Accepted',
      judge0Token: 'provider-secret-token',
      executedAt: new Date(),
    });

    expect(entity.toProps()).not.toHaveProperty('judge0Token');
    expect(CodeExecutionMapper.toPersistence(entity)).not.toHaveProperty('judge0Token');
  });
});
