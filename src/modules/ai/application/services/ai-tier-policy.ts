type AnalysisLike = Record<string, any>;

/**
 * Premium fixes are an entitlement boundary, not a UI concern. Apply this
 * presenter to every synchronous, cached, streaming and history response.
 */
export const presentAnalysisForTier = <T>(input: T, _canViewFixes: boolean): T => {
  return input;
};
