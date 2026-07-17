export function buildExplanation(issueCount: number, docCount: number): string {
  if (issueCount === 0) return 'No concurrency issues detected in this code.';
  return `AI2 detected ${issueCount} issue${issueCount > 1 ? 's' : ''} using RAG retrieval from ${docCount} knowledge-base document${docCount !== 1 ? 's' : ''}. Review each issue card for details and fixes.`;
}
