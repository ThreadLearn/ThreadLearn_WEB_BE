import { presentAnalysisForTier } from './ai-tier-policy';

describe('presentAnalysisForTier', () => {
  const analysis = {
    optimizedCode: 'premium code',
    issues: [{ description: 'race', fix: 'premium fix' }],
    issue: { description: 'partial stream issue', fix: 'partial premium fix' },
  };

  it('redacts every premium fix path for Free users without mutating cache data', () => {
    const presented = presentAnalysisForTier(analysis, false);

    expect(presented).toEqual({
      issues: [{ description: 'race' }],
      issue: { description: 'partial stream issue' },
    });
    expect(analysis.issues[0].fix).toBe('premium fix');
  });

  it('preserves fixes for entitled users', () => {
    expect(presentAnalysisForTier(analysis, true)).toBe(analysis);
  });
});
