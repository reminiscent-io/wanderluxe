/**
 * pdfmake `pageBreakBefore` rule: a heading (headlineLevel 1) must never be
 * the last node on a page — push it to the next page with its content.
 * This replaces the old calculatePageFit item-count heuristic, which fought
 * pdfmake's real height-based pagination and produced orphaned day headers
 * and half-empty pages.
 */
export function isOrphanedHeading(
  node: { headlineLevel?: unknown },
  followingNodesOnPage: readonly unknown[]
): boolean {
  return node.headlineLevel === 1 && followingNodesOnPage.length === 0;
}
