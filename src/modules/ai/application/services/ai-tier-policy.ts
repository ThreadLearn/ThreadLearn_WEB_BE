type AnalysisLike = Record<string, any>;

/**
 * Premium fixes are an entitlement boundary, not a UI concern. Apply this
 * presenter to every synchronous, cached, streaming and history response.
 */
export const presentAnalysisForTier = <T>(input: T, canViewFixes: boolean): T => {
  if (canViewFixes || !input || typeof input !== 'object') return input;
  const value: AnalysisLike = typeof (input as any).toObject === 'function'
    ? (input as any).toObject()
    : { ...(input as any) };

  delete value.optimizedCode;
  delete value.optimized_code;

  if (Array.isArray(value.issues)) {
    value.issues = value.issues.map((issue: AnalysisLike) => {
      const safeIssue = { ...issue };
      delete safeIssue.fix;
      return safeIssue;
    });
  }
  if (value.issue && typeof value.issue === 'object') {
    value.issue = { ...value.issue };
    delete value.issue.fix;
  }
  return value as T;
};
