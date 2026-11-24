// Pure result shaping for scripts/contrast-scan.ts: groups axe-core
// color-contrast nodes into one line per color pair so a token used in 40
// places reads as one problem, not 40.

export interface ContrastNode {
  kind: 'fail' | 'needs-review';
  target: string;
  html: string;
  fg?: string;
  bg?: string;
  ratio?: number;
  required?: string;
  fontSize?: string;
  fontWeight?: string;
  reason?: string | null;
}

export interface PageResult {
  route: string;
  viewport: string;
  nodes?: ContrastNode[];
  error?: string;
}

export interface FailureGroup {
  fg?: string;
  bg?: string;
  ratio?: number;
  required?: string;
  fontSize?: string;
  fontWeight?: string;
  count: number;
  pages: string[];
  samples: string[];
}

const SAMPLES_PER_GROUP = 3;

function snippet(html: string): string {
  return html.replace(/\s+/g, ' ').trim().slice(0, 140);
}

export function groupFailures(results: PageResult[]): FailureGroup[] {
  const groups = new Map<string, FailureGroup>();
  for (const page of results) {
    for (const node of page.nodes ?? []) {
      if (node.kind !== 'fail') continue;
      const key = [node.fg, node.bg, node.ratio, node.required, node.fontSize, node.fontWeight].join('|');
      let group = groups.get(key);
      if (!group) {
        group = {
          fg: node.fg, bg: node.bg, ratio: node.ratio, required: node.required,
          fontSize: node.fontSize, fontWeight: node.fontWeight,
          count: 0, pages: [], samples: [],
        };
        groups.set(key, group);
      }
      group.count++;
      const pageLabel = `${page.route} (${page.viewport})`;
      if (!group.pages.includes(pageLabel)) group.pages.push(pageLabel);
      const sample = snippet(node.html);
      if (group.samples.length < SAMPLES_PER_GROUP && !group.samples.includes(sample)) group.samples.push(sample);
    }
  }
  return [...groups.values()].sort((a, b) => (a.ratio ?? 0) - (b.ratio ?? 0) || b.count - a.count);
}

export interface ContrastReport {
  text: string;
  failures: number;
  reviews: number;
  errors: number;
}

export function formatReport(results: PageResult[]): ContrastReport {
  const lines: string[] = [];
  let failures = 0;
  let reviews = 0;
  let errors = 0;

  for (const page of results) {
    if (page.error) {
      errors++;
      lines.push(`${page.viewport.padEnd(7)} ${page.route.padEnd(40)} ERROR ${page.error}`);
      continue;
    }
    const fail = (page.nodes ?? []).filter((n) => n.kind === 'fail').length;
    const review = (page.nodes ?? []).length - fail;
    failures += fail;
    reviews += review;
    lines.push(`${page.viewport.padEnd(7)} ${page.route.padEnd(40)} fail=${fail} review=${review}`);
  }

  const groups = groupFailures(results);
  if (groups.length) {
    lines.push('', 'Failures by color pair (worst first):');
    for (const g of groups) {
      lines.push(
        '',
        `${g.ratio}:1 (needs ${g.required})  ${g.fg} on ${g.bg}  ${g.fontSize} w${g.fontWeight}  x${g.count}`,
        `  pages: ${g.pages.join(', ')}`,
        ...g.samples.map((s) => `  · ${s}`),
      );
    }
  }

  lines.push(
    '',
    `${failures} failure(s), ${reviews} needing manual review (text over images, gradients or overlaps), ${errors} page error(s).`,
  );
  return { text: lines.join('\n'), failures, reviews, errors };
}
