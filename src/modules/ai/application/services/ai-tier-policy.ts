type AnalysisLike = Record<string, any>;

/**
 * Premium fixes are an entitlement boundary, not a UI concern. Apply this
 * presenter to every synchronous, cached, streaming and history response.
 */
export const presentAnalysisForTier = <T>(input: T, canViewFixes: boolean): T => {
  if (canViewFixes || !input || typeof input !== 'object') return input;
  const source = input as AnalysisLike;
  const output: AnalysisLike = { ...source };
  delete output.optimizedCode;
  if (Array.isArray(source.issues)) {
    output.issues = source.issues.map((issue: AnalysisLike) => {
      const redacted = { ...issue };
      delete redacted.fix;
      return redacted;
    });
  }
  if (source.issue && typeof source.issue === 'object') {
    output.issue = { ...source.issue };
    delete output.issue.fix;
  }
  return output as T;
};
