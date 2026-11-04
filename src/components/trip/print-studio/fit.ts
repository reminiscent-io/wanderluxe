// Measuring an edition's pages for overflow.
//
// The plan (src/lib/printDesign/plan.ts) decides pages from estimates; this
// checks them against the real thing. Every page that can run long marks its
// flowing region with data-pd-flow and each unit inside it with
// data-pd-block="<stream>:<index>" (or "details-panel"). Anything whose
// bottom edge passes the region's bottom edge did not fit, and the page's kind
// says what to do about it. A page is tightened before it is ever split, so
// running a few pixels long never costs a whole sheet:
//
//   pair          the two days stop sharing a sheet       → solo:<date> ×2
//   bookings box  the bookings leave the overview          → details:own
//   overview      one line per day, then a new page        → compact:overview, then break
//   day           closer spacing, then a new page          → tight:<date>, then break
//   anything else start a new page at the first block that → break:<stream>:<i>
//                 did not fit
//
// Tokens only ever add constraints, so the loop in PrintDocument converges.
// Measured with getBoundingClientRect on both the region and its blocks, so a
// zoomed or scaled preview compares like with like.

/** Below this, a block's bottom edge counts as inside the page (sub-pixel layout). */
const TOLERANCE = 0.75;

export function measureOverflow(root: ParentNode): string[] {
  const tokens: string[] = [];
  for (const sheet of root.querySelectorAll<HTMLElement>('[data-pd-kind]')) {
    const flow = sheet.querySelector<HTMLElement>('[data-pd-flow]');
    if (!flow) continue;
    const limit = flow.getBoundingClientRect().bottom + TOLERANCE;
    const blocks = Array.from(flow.querySelectorAll<HTMLElement>('[data-pd-block]'));
    const over = blocks.find((b) => b.getBoundingClientRect().bottom > limit);
    if (!over) continue;

    if (sheet.dataset.pdKind === 'pair') {
      for (const date of (sheet.dataset.pdDates ?? '').split(',').filter(Boolean)) tokens.push(`solo:${date}`);
      continue;
    }
    const block = over.dataset.pdBlock ?? '';
    if (block === 'details-panel') {
      tokens.push('details:own');
      continue;
    }
    if (sheet.dataset.pdKind === 'overview' && sheet.dataset.pdCompact !== 'true') {
      tokens.push('compact:overview');
      continue;
    }
    if (sheet.dataset.pdKind === 'day' && sheet.dataset.pdTight !== 'true' && sheet.dataset.pdDates) {
      tokens.push(`tight:${sheet.dataset.pdDates}`);
      continue;
    }
    // The first unit on a page has nowhere earlier to break. Leave it; the
    // page clips rather than loop.
    if (over === blocks[0]) continue;
    tokens.push(`break:${block}`);
  }
  return tokens;
}
