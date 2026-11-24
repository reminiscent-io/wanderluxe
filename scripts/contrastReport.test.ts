import { describe, expect, it } from 'vitest';
import { formatReport, groupFailures, type ContrastNode, type PageResult } from './contrastReport';

const node = (over: Partial<ContrastNode> = {}): ContrastNode => ({
  kind: 'fail',
  target: 'p',
  html: '<p class="text-earth-400">Itineraries</p>',
  fg: '#8a7f6c',
  bg: '#ffffff',
  ratio: 3.93,
  required: '4.5:1',
  fontSize: '9.0pt (12px)',
  fontWeight: 'normal',
  ...over,
});

describe('groupFailures', () => {
  it('collapses one color pair across pages and viewports into a single group', () => {
    const results: PageResult[] = [
      { route: '/', viewport: 'desktop', nodes: [node(), node({ html: '<p>Other</p>' })] },
      { route: '/', viewport: 'mobile', nodes: [node()] },
      { route: '/guide', viewport: 'desktop', nodes: [node()] },
    ];
    const groups = groupFailures(results);
    expect(groups).toHaveLength(1);
    expect(groups[0].count).toBe(4);
    expect(groups[0].pages).toEqual(['/ (desktop)', '/ (mobile)', '/guide (desktop)']);
    expect(groups[0].samples).toEqual(['<p class="text-earth-400">Itineraries</p>', '<p>Other</p>']);
  });

  it('keeps different sizes of the same colors apart, since the required ratio differs', () => {
    const groups = groupFailures([
      { route: '/', viewport: 'desktop', nodes: [node(), node({ fontSize: '18.0pt (24px)', required: '3:1' })] },
    ]);
    expect(groups).toHaveLength(2);
  });

  it('ignores needs-review nodes and sorts worst ratio first', () => {
    const groups = groupFailures([
      {
        route: '/',
        viewport: 'desktop',
        nodes: [node({ ratio: 4.47, fg: '#7c716a' }), node({ kind: 'needs-review', ratio: 1.2 }), node({ ratio: 2.66, fg: '#a89b8e' })],
      },
    ]);
    expect(groups.map((g) => g.ratio)).toEqual([2.66, 4.47]);
  });

  it('caps samples at three', () => {
    const nodes = ['a', 'b', 'c', 'd'].map((t) => node({ html: `<p>${t}</p>` }));
    expect(groupFailures([{ route: '/', viewport: 'desktop', nodes }])[0].samples).toHaveLength(3);
  });
});

describe('formatReport', () => {
  it('counts failures, reviews and page errors', () => {
    const report = formatReport([
      { route: '/', viewport: 'desktop', nodes: [node(), node({ kind: 'needs-review' })] },
      { route: '/about', viewport: 'desktop', error: 'Timeout' },
    ]);
    expect(report).toMatchObject({ failures: 1, reviews: 1, errors: 1 });
    expect(report.text).toContain('3.93:1 (needs 4.5:1)  #8a7f6c on #ffffff');
    expect(report.text).toContain('/about');
    expect(report.text).toContain('ERROR Timeout');
  });

  it('prints no color-pair section on a clean run', () => {
    const report = formatReport([{ route: '/', viewport: 'desktop', nodes: [] }]);
    expect(report.failures).toBe(0);
    expect(report.text).not.toContain('Failures by color pair');
  });
});
