// Print Studio art — filled illustration at page scale.
//
// The first Studio drew its motifs as hairline tiles 16px tall: a stroke of
// waves above the title, a mark at the end. On paper they read as a rule, not
// as art, and a theme like "Christmas" had nothing to draw with at all. This
// module draws the motifs as filled, multi-colour shapes (holly with berries,
// snowflakes, baubles on strings, a treeline) and composes them at the size of
// a page: a field across a cover, a frieze along an edge, a cluster in a
// corner, a single mark.
//
// Colour comes from the edition's own palette. Each motif names the hues its
// parts want (holly leaves near green, berries near red) and takes the nearest
// fill the design actually has, so the drawing reads right whatever order the
// model listed its fills in, and never uses a colour the edition did not
// choose. Everything is drawn in SVG content rather than CSS backgrounds, so
// it prints whatever the browser's "background graphics" setting says.
//
// Art carries no text, so it has no contrast floor. It only has to be visible
// against what it sits on.

import React from 'react';
import type { MotifId } from '@/lib/printDesign/spec';
import { FRIEZE, GROUND_SCALE, seeded, type Inks } from './artInks';

/* =========================================================================
   Geometry helpers
   ========================================================================= */

const f = (n: number) => Number(n.toFixed(2));

function starPath(cx: number, cy: number, outer: number, inner: number, points = 5, rotate = -90): string {
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = ((rotate + (i * 180) / points) * Math.PI) / 180;
    d += `${i === 0 ? 'M' : 'L'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`;
  }
  return `${d}Z`;
}

/** A holly leaf along +x from the origin: scalloped edges between sharp points. */
function hollyLeafPath(length: number, width: number, spikes = 3): string {
  const w = (t: number) => width * Math.pow(Math.sin(Math.PI * t), 0.75);
  const ts = Array.from({ length: spikes + 2 }, (_, i) => i / (spikes + 1));
  let d = 'M0 0';
  for (let i = 1; i < ts.length; i++) {
    const tm = (ts[i - 1] + ts[i]) / 2;
    const y = i === ts.length - 1 ? 0 : -w(ts[i]);
    d += ` Q${f(tm * length)} ${f(-w(tm) * 0.5)} ${f(ts[i] * length)} ${f(y)}`;
  }
  for (let i = ts.length - 2; i >= 0; i--) {
    const tm = (ts[i + 1] + ts[i]) / 2;
    const y = i === 0 ? 0 : w(ts[i]);
    d += ` Q${f(tm * length)} ${f(w(tm) * 0.5)} ${f(ts[i] * length)} ${f(y)}`;
  }
  return `${d}Z`;
}

/** An almond leaf along +x from the origin. */
function leafPath(length: number, width: number): string {
  return `M0 0 C${f(length * 0.3)} ${f(-width)} ${f(length * 0.75)} ${f(-width * 0.8)} ${f(length)} 0 C${f(length * 0.75)} ${f(width * 0.8)} ${f(length * 0.3)} ${f(width)} 0 0Z`;
}

/** A horizontal band across a circle, as a closed path (no clip ids to collide). */
function circleBand(cx: number, cy: number, r: number, y1: number, y2: number): string {
  const half = (y: number) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  const h1 = half(y1);
  const h2 = half(y2);
  return `M${f(cx - h1)} ${f(y1)} L${f(cx + h1)} ${f(y1)} A${r} ${r} 0 0 1 ${f(cx + h2)} ${f(y2)} L${f(cx - h2)} ${f(y2)} A${r} ${r} 0 0 1 ${f(cx - h1)} ${f(y1)}Z`;
}

/* =========================================================================
   Primitives — each draws one object in a 100 × 100 box
   ========================================================================= */

type Primitive = (inks: Inks, variant: number) => React.ReactNode;

const holly: Primitive = (k, v) => {
  const leaf = hollyLeafPath(44, 14, 3);
  const angles = v % 2 === 0 ? [-150, -30] : [-165, -60, 20];
  return (
    <g>
      {angles.map((a) => (
        <g key={a} transform={`translate(50 54) rotate(${a})`}>
          <path d={leaf} fill={k.a} />
          <path d="M3 0 L38 0" stroke={k.paper} strokeOpacity={0.45} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      ))}
      {[
        [45, 52],
        [55, 50],
        [50, 59],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={6.6} fill={k.b} />
          <circle cx={x - 2} cy={y - 2.2} r={1.7} fill={k.paper} fillOpacity={0.7} />
        </g>
      ))}
    </g>
  );
};

const snowflake: Primitive = (k, v) => {
  const arm = 40;
  const branches: Array<[number, number, number]> = [
    [0.42, 13, 42],
    [0.7, 9, 42],
  ];
  if (v % 3 === 1) branches[0] = [0.5, 15, 55];
  if (v % 3 === 2) branches.push([0.25, 7, 60]);
  return (
    <g stroke={k.a} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <g key={r} transform={`translate(50 50) rotate(${r})`}>
          <path d={`M0 0 L0 ${-arm}`} />
          {branches.map(([t, len, ang]) => {
            const y = -arm * t;
            const dx = Math.sin((ang * Math.PI) / 180) * len;
            const dy = Math.cos((ang * Math.PI) / 180) * len;
            return <path key={t} d={`M${f(-dx)} ${f(y - dy)} L0 ${f(y)} L${f(dx)} ${f(y - dy)}`} />;
          })}
        </g>
      ))}
      {v % 3 === 0 && <path d={starPath(50, 50, 8, 8, 6, 0)} strokeWidth={2.4} />}
    </g>
  );
};

const pine: Primitive = (k, v) => {
  const tiers = [
    { apex: 10, base: 40, hw: 15 },
    { apex: 26, base: 62, hw: 24 },
    { apex: 44, base: 86, hw: 33 },
  ];
  const tier = ({ apex, base, hw }: { apex: number; base: number; hw: number }) => {
    const scallops = 3;
    let d = `M50 ${apex} L${50 + hw} ${base}`;
    for (let i = scallops; i > 0; i--) {
      const x0 = 50 - hw + ((2 * hw) / scallops) * i;
      const x1 = 50 - hw + ((2 * hw) / scallops) * (i - 1);
      d += ` Q${f((x0 + x1) / 2)} ${f(base + 4.5)} ${f(x1)} ${base}`;
    }
    return `${d}Z`;
  };
  const rand = seeded(`pine-${v}`);
  return (
    <g>
      <rect x={45.5} y={84} width={9} height={14} rx={1.5} fill={k.c} />
      {tiers.map((t) => (
        <path key={t.apex} d={tier(t)} fill={k.a} />
      ))}
      {v % 3 !== 2 &&
        Array.from({ length: 7 }, (_, i) => {
          const t = tiers[i % 3];
          const y = t.base - 4 - rand() * (t.base - t.apex - 12);
          const span = t.hw * ((y - t.apex) / (t.base - t.apex)) * 0.8;
          return <circle key={i} cx={f(50 + (rand() * 2 - 1) * span)} cy={f(y)} r={2.6} fill={k.b} />;
        })}
      {v % 3 === 2 &&
        tiers.map((t) => (
          <path
            key={`snow-${t.apex}`}
            d={`M${f(50 - t.hw * 0.42)} ${f(t.apex + (t.base - t.apex) * 0.42)} Q50 ${f(t.apex + (t.base - t.apex) * 0.3)} ${f(50 + t.hw * 0.42)} ${f(t.apex + (t.base - t.apex) * 0.42)} L50 ${t.apex}Z`}
            fill={k.paper}
            fillOpacity={0.85}
          />
        ))}
      <path d={starPath(50, 9, 8, 3.4)} fill={k.b} />
    </g>
  );
};

const ornament: Primitive = (k, v) => {
  const cx = 50;
  const cy = 64;
  const r = 29;
  return (
    <g>
      <path d="M50 0 L50 30" stroke={k.c} strokeWidth={1.3} />
      <circle cx={50} cy={29} r={3.2} fill="none" stroke={k.c} strokeWidth={1.4} />
      <rect x={43} y={31} width={14} height={8} rx={1.6} fill={k.c} />
      <circle cx={cx} cy={cy} r={r} fill={k.a} />
      {v % 3 === 0 && <path d={circleBand(cx, cy, r, 58, 70)} fill={k.b} />}
      {v % 3 === 1 &&
        [44, 56, 68, 80].map((y, i) => (
          <circle key={y} cx={f(cx + (i % 2 === 0 ? -9 : 9))} cy={y - 6} r={3} fill={k.b} />
        ))}
      {v % 3 === 2 && (
        <path
          d={`M${cx - r + 3} ${cy} l7 -7 l7 7 l7 -7 l7 7 l7 -7 l7 7 l7 -7 l7 7`}
          fill="none"
          stroke={k.b}
          strokeWidth={4}
          strokeLinejoin="round"
        />
      )}
      <path
        d={`M${cx - 16} ${cy - 14} A20 20 0 0 1 ${cx - 2} ${cy - 23}`}
        fill="none"
        stroke={k.paper}
        strokeOpacity={0.55}
        strokeWidth={3.2}
        strokeLinecap="round"
      />
    </g>
  );
};

const star: Primitive = (k, v) => {
  if (v % 3 === 1) return <path d={starPath(50, 50, 40, 9, 4, -90)} fill={k.b === k.a ? k.a : k.b} />;
  if (v % 3 === 2) return <circle cx={50} cy={50} r={9} fill={k.a} />;
  return <path d={starPath(50, 52, 42, 17)} fill={k.a} />;
};

const MAPLE =
  'M50 4 L56 22 L66 15 L63 34 L80 26 L74 42 L93 44 L77 56 L83 65 L60 62 L53 80 L50 78 L47 80 L40 62 L17 65 L23 56 L7 44 L26 42 L20 26 L37 34 L34 15 L44 22 Z';

const leaf: Primitive = (k, v) => {
  const fill = [k.a, k.b, k.c][v % 3];
  if (v % 2 === 0) {
    return (
      <g>
        <path d={MAPLE} fill={fill} strokeLinejoin="round" />
        <path d="M50 30 L50 97" stroke={fill} strokeWidth={3} strokeLinecap="round" />
        <path d="M50 66 L50 30 M50 52 L33 40 M50 52 L67 40" stroke={k.paper} strokeOpacity={0.45} strokeWidth={1.5} fill="none" />
      </g>
    );
  }
  return (
    <g transform="rotate(-90 50 50)">
      <path d={leafPath(80, 26)} transform="translate(10 50)" fill={fill} />
      <path
        d="M14 50 L84 50 M34 50 L44 40 M34 50 L44 60 M54 50 L64 41 M54 50 L64 59"
        stroke={k.paper}
        strokeOpacity={0.45}
        strokeWidth={1.6}
        fill="none"
      />
      <path d="M2 50 L12 50" stroke={fill} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
};

const PETAL = 'M0 0 C -15 -10, -15 -30, -5 -38 L0 -33 L5 -38 C 15 -30, 15 -10, 0 0 Z';

const blossom: Primitive = (k, v) => {
  if (v % 3 === 2) {
    return (
      <g>
        <path d="M50 92 C 48 70, 52 50, 50 34" stroke={k.c} strokeWidth={2.4} fill="none" />
        <ellipse cx={50} cy={26} rx={10} ry={14} fill={k.a} />
        <path d={leafPath(22, 7)} transform="translate(50 64) rotate(-35)" fill={k.c} />
      </g>
    );
  }
  return (
    <g>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d={PETAL} transform={`translate(50 50) rotate(${r + (v % 2) * 36})`} fill={k.a} />
      ))}
      <circle cx={50} cy={50} r={7.5} fill={k.b} />
      {[0, 72, 144, 216, 288].map((r) => (
        <circle
          key={`s-${r}`}
          cx={f(50 + 12 * Math.cos(((r - 90) * Math.PI) / 180))}
          cy={f(50 + 12 * Math.sin(((r - 90) * Math.PI) / 180))}
          r={1.8}
          fill={k.c}
        />
      ))}
    </g>
  );
};

const citrus: Primitive = (k, v) => {
  if (v % 2 === 0) {
    return (
      <g>
        <circle cx={50} cy={50} r={42} fill={k.a} />
        <circle cx={50} cy={50} r={36} fill={k.paper} />
        {Array.from({ length: 8 }, (_, i) => {
          const a0 = ((i * 45 + 4) * Math.PI) / 180;
          const a1 = (((i + 1) * 45 - 4) * Math.PI) / 180;
          const r = 32;
          return (
            <path
              key={i}
              d={`M${f(50 + 4 * Math.cos((a0 + a1) / 2))} ${f(50 + 4 * Math.sin((a0 + a1) / 2))} L${f(50 + r * Math.cos(a0))} ${f(50 + r * Math.sin(a0))} A${r} ${r} 0 0 1 ${f(50 + r * Math.cos(a1))} ${f(50 + r * Math.sin(a1))} Z`}
              fill={k.a}
              fillOpacity={0.78}
            />
          );
        })}
      </g>
    );
  }
  return (
    <g>
      <path d={leafPath(34, 11)} transform="translate(52 24) rotate(-20)" fill={k.b} />
      <path d="M52 24 L48 30" stroke={k.b} strokeWidth={2.4} strokeLinecap="round" />
      <ellipse cx={46} cy={58} rx={33} ry={25} transform="rotate(-24 46 58)" fill={k.a} />
      <circle cx={f(46 - 33 * Math.cos((24 * Math.PI) / 180))} cy={f(58 + 33 * Math.sin((24 * Math.PI) / 180))} r={4} fill={k.a} />
      <path d="M30 52 A 18 12 -24 0 1 46 40" stroke={k.paper} strokeOpacity={0.5} strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  );
};

// Concentric arcs drawn as strokes, so no paper-coloured fill sits between
// two rings and leaves a seam where pieces overlap.
const waves: Primitive = (k, v) => (
  <g fill="none" strokeWidth={8.5}>
    {[39, 25, 11].map((r) => (
      <path key={r} d={`M${50 - r} 96 A${r} ${r} 0 0 1 ${50 + r} 96`} stroke={v % 2 === 0 ? k.a : k.b} />
    ))}
  </g>
);

const FROND = 'M0 0 Q 18 -16 44 -6 Q 20 -6 0 0 Z';

const palm: Primitive = (k) => (
  <g>
    <path d="M54 98 Q 58 70 47 40" stroke={k.b} strokeWidth={6} strokeLinecap="round" fill="none" />
    {[-170, -140, -105, -70, -35, -8].map((a) => (
      <path key={a} d={FROND} transform={`translate(47 40) rotate(${a})`} fill={k.a} />
    ))}
    <circle cx={46} cy={44} r={3.2} fill={k.c} />
    <circle cx={51} cy={45} r={3.2} fill={k.c} />
  </g>
);

const mountain: Primitive = (k) => (
  <g>
    <path d="M38 96 L70 38 L100 96 Z" fill={k.b} />
    <path d="M0 96 L42 16 L84 96 Z" fill={k.a} />
    <path d="M42 16 L31 37 L37 33 L42 40 L47 33 L53 37 Z" fill={k.paper} />
    <path d="M70 38 L63 51 L67 49 L70 53 L74 49 L77 51 Z" fill={k.paper} fillOpacity={0.9} />
  </g>
);

const deco: Primitive = (k, v) => (
  <g>
    <path d="M6 94 A44 44 0 0 1 94 94 Z" fill={v % 2 === 0 ? k.a : k.b} />
    <path d="M22 94 A28 28 0 0 1 78 94 Z" fill={k.paper} />
    <path d="M32 94 A18 18 0 0 1 68 94 Z" fill={v % 2 === 0 ? k.b : k.a} />
    {[-80, -55, -30, 0, 30, 55, 80].map((a) => (
      <path
        key={a}
        d={`M50 94 L${f(50 + 44 * Math.sin((a * Math.PI) / 180))} ${f(94 - 44 * Math.cos((a * Math.PI) / 180))}`}
        stroke={k.paper}
        strokeWidth={1.6}
      />
    ))}
  </g>
);

const botanical: Primitive = (k, v) => {
  const leaves: Array<[number, number, number]> = [
    [50, 80, -50],
    [51, 66, 40],
    [50, 52, -45],
    [51, 38, 35],
    [50, 24, -30],
  ];
  return (
    <g>
      <path d="M50 98 C 47 70, 53 44, 50 8" stroke={k.a} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {leaves.map(([x, y, a], i) => (
        <path key={i} d={leafPath(24 - i * 1.6, 7.5)} transform={`translate(${x} ${y}) rotate(${a < 0 ? 180 - a : -a})`} fill={k.a} />
      ))}
      {v % 2 === 0 && (
        <>
          <circle cx={50} cy={7} r={4.5} fill={k.b} />
          <circle cx={43} cy={12} r={3.2} fill={k.b} />
        </>
      )}
    </g>
  );
};

const geometric: Primitive = (k, v) => {
  switch (v % 4) {
    case 0:
      return (
        <g>
          <rect x={10} y={10} width={80} height={80} fill={k.a} />
          <path d="M10 90 A80 80 0 0 1 90 10 L90 90 Z" fill={k.b} />
        </g>
      );
    case 1:
      return (
        <g>
          <circle cx={50} cy={50} r={40} fill={k.a} />
          <path d="M10 50 A40 40 0 0 1 90 50 Z" fill={k.c} />
        </g>
      );
    case 2:
      return <path d="M50 8 L92 88 L8 88 Z" fill={k.b} />;
    default:
      return (
        <g>
          <path d="M50 6 L94 50 L50 94 L6 50 Z" fill={k.c} />
          <circle cx={50} cy={50} r={12} fill={k.paper} />
        </g>
      );
  }
};

const confetti: Primitive = (k, v) => {
  const fill = [k.a, k.b, k.c][v % 3];
  switch (v % 4) {
    case 0:
      return <rect x={38} y={20} width={24} height={60} rx={4} fill={fill} />;
    case 1:
      return <circle cx={50} cy={50} r={20} fill={fill} />;
    case 2:
      return <path d="M14 60 Q 32 30 50 60 T 86 60" stroke={fill} strokeWidth={10} fill="none" strokeLinecap="round" />;
    default:
      return <path d="M50 22 L78 74 L22 74 Z" fill={fill} />;
  }
};

const dot: Primitive = (k, v) => <circle cx={50} cy={50} r={v % 2 === 0 ? 36 : 22} fill={[k.a, k.b, k.c][v % 3]} />;

const sunburst: Primitive = (k) => (
  <g>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      const w = (9 * Math.PI) / 180;
      return (
        <path
          key={i}
          d={`M${f(50 + 24 * Math.cos(a - w))} ${f(50 + 24 * Math.sin(a - w))} L${f(50 + 46 * Math.cos(a))} ${f(50 + 46 * Math.sin(a))} L${f(50 + 24 * Math.cos(a + w))} ${f(50 + 24 * Math.sin(a + w))} Z`}
          fill={k.a}
        />
      );
    })}
    <circle cx={50} cy={50} r={19} fill={k.b} />
  </g>
);

type DrawnMotif = Exclude<MotifId, 'none'>;

const PRIMITIVES: Record<DrawnMotif, Primitive> = {
  holly,
  snowflakes: snowflake,
  pines: pine,
  ornaments: ornament,
  stars: star,
  leaves: leaf,
  blossoms: blossom,
  citrus,
  waves,
  palms: palm,
  mountains: mountain,
  deco,
  botanical,
  geometric,
  confetti,
  dots: dot,
  sunburst,
};

/** How a motif may turn: freely, a little, or not at all (things that stand or hang). */
const ROTATION: Record<DrawnMotif, 'free' | 'tilt' | 'upright'> = {
  holly: 'tilt',
  snowflakes: 'free',
  pines: 'upright',
  ornaments: 'upright',
  stars: 'free',
  leaves: 'free',
  blossoms: 'free',
  citrus: 'free',
  waves: 'upright',
  palms: 'upright',
  mountains: 'upright',
  deco: 'upright',
  botanical: 'tilt',
  geometric: 'upright',
  confetti: 'free',
  dots: 'upright',
  sunburst: 'free',
};

/** Variants each motif draws, so a field never repeats one shape. */
const VARIANTS: Record<DrawnMotif, number> = {
  holly: 2,
  snowflakes: 3,
  pines: 3,
  ornaments: 3,
  stars: 3,
  leaves: 4,
  blossoms: 3,
  citrus: 2,
  waves: 2,
  palms: 1,
  mountains: 1,
  deco: 2,
  botanical: 2,
  geometric: 4,
  confetti: 12,
  dots: 6,
  sunburst: 1,
};

interface Placed {
  x: number;
  y: number;
  size: number;
  rotate: number;
  variant: number;
  /** For hanging motifs: where the string starts. */
  hangFrom?: number;
}

function Piece({ motif, inks, p }: { motif: DrawnMotif; inks: Inks; p: Placed }) {
  const half = p.size / 2;
  return (
    <g
      transform={`translate(${f(p.x - half)} ${f(p.y - half)}) rotate(${f(p.rotate)} ${f(half)} ${f(half)}) scale(${f(p.size / 100)})`}
    >
      {PRIMITIVES[motif](inks, p.variant)}
    </g>
  );
}

function rotationFor(motif: DrawnMotif, rand: () => number): number {
  const mode = ROTATION[motif];
  if (mode === 'free') return rand() * 360;
  if (mode === 'tilt') return (rand() * 2 - 1) * 28;
  return 0;
}

/* =========================================================================
   Compositions
   ========================================================================= */

interface CompositionProps {
  motif: MotifId;
  inks: Inks;
  /** Seeds the layout, so a page draws the same art every time it renders. */
  seed: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
}

function svgProps(width: number, height: number, className?: string, style?: React.CSSProperties) {
  return {
    'aria-hidden': true as const,
    focusable: 'false' as const,
    className,
    style,
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  };
}

/**
 * A field of the motif across a whole area: a cover, a back page, the space
 * left under a light day. Laid on a jittered grid so it covers evenly without
 * looking gridded.
 */
export function ArtField({
  motif,
  inks,
  seed,
  width,
  height,
  className,
  style,
  size = [70, 130],
  density = 0.62,
}: CompositionProps & { size?: [number, number]; density?: number }) {
  if (motif === 'none') return null;
  const rand = seeded(`${seed}:field`);
  const cell = ((size[0] + size[1]) / 2) * 1.18;
  const pieces: Placed[] = [];
  for (let y = -cell / 2, row = 0; y < height + cell / 2; y += cell, row++) {
    for (let x = -cell / 2 + (row % 2) * (cell / 2); x < width + cell / 2; x += cell) {
      if (rand() > density) continue;
      pieces.push({
        x: x + (rand() - 0.5) * cell * 0.7,
        y: y + (rand() - 0.5) * cell * 0.7,
        size: size[0] + rand() * (size[1] - size[0]),
        rotate: rotationFor(motif, rand),
        variant: Math.floor(rand() * VARIANTS[motif]),
      });
    }
  }
  return (
    <svg {...svgProps(width, height, className, style)} preserveAspectRatio="xMidYMid slice">
      {pieces.map((p, i) => (
        <Piece key={i} motif={motif} inks={inks} p={p} />
      ))}
    </svg>
  );
}

/**
 * The motif along one edge of the page. Things that stand (trees, mountains,
 * waves) stand on the bottom; baubles hang from the top on strings of
 * different lengths; holly and leaves run as a garland; snow drifts.
 */
export function ArtFrieze({
  motif,
  inks,
  seed,
  width,
  height,
  className,
  style,
  edge = 'bottom',
}: CompositionProps & { edge?: 'top' | 'bottom' }) {
  if (motif === 'none') return null;
  const rand = seeded(`${seed}:frieze`);
  const mode = FRIEZE[motif];
  const pieces: Placed[] = [];

  if (mode === 'ground') {
    // A treeline: overlapping pieces of mixed heights, standing on the edge.
    // Waves only fill the lower half of their box, so they are drawn larger.
    const scale = GROUND_SCALE[motif] ?? 1;
    let x = -height * 0.2;
    while (x < width + height * 0.2) {
      const size = height * (0.55 + rand() * 0.5) * scale;
      const y = edge === 'bottom' ? height - size / 2 + size * 0.02 : size / 2 - size * 0.02;
      pieces.push({ x, y, size, rotate: edge === 'bottom' ? 0 : 180, variant: Math.floor(rand() * VARIANTS[motif]) });
      x += size * (0.42 + rand() * 0.3);
    }
    // Smallest first, so the tall ones stand in front.
    pieces.sort((a, b) => a.size - b.size);
  } else if (mode === 'hang') {
    // Baubles hang from a swag of rope across the top of their band, wherever
    // the band sits: a bauble standing on its cap reads as a fallen one.
    let x = height * 0.25;
    while (x < width) {
      const size = height * (0.38 + rand() * 0.28);
      const top = swagY(x, width, height);
      const drop = height * (0.06 + rand() * 0.34);
      pieces.push({
        x,
        y: top + drop + size / 2,
        size,
        rotate: 0,
        variant: Math.floor(rand() * VARIANTS[motif]),
        hangFrom: top,
      });
      x += size * (0.95 + rand() * 0.5);
    }
  } else if (mode === 'garland') {
    // Along a shallow arc, overlapping, alternate pieces turned the other way.
    const count = Math.max(3, Math.round(width / (height * 0.62)));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      const sag = Math.sin(Math.PI * t) * height * 0.22;
      const size = height * (0.62 + rand() * 0.32);
      pieces.push({
        x: t * width + (rand() - 0.5) * size * 0.25,
        y: edge === 'top' ? height * 0.4 + sag : height * 0.6 - sag,
        size,
        rotate: rotationFor(motif, rand) + (i % 2 === 0 ? -18 : 18),
        variant: Math.floor(rand() * VARIANTS[motif]),
      });
    }
  } else {
    // Drift: thickest at the edge, thinning toward the page.
    const n = Math.round(width / (height * 0.34));
    for (let i = 0; i < n; i++) {
      const depth = Math.pow(rand(), 1.6);
      const size = height * (0.16 + rand() * 0.34) * (1 - depth * 0.45);
      // Kept whole inside the band: a piece sliced by its top edge reads as a mistake.
      const travel = Math.max(0, height - size);
      const y = edge === 'top' ? size / 2 + depth * travel : height - size / 2 - depth * travel;
      pieces.push({ x: rand() * width, y, size, rotate: rotationFor(motif, rand), variant: Math.floor(rand() * VARIANTS[motif]) });
    }
  }

  return (
    <svg {...svgProps(width, height, className, style)} preserveAspectRatio={edge === 'top' ? 'xMidYMin slice' : 'xMidYMax slice'}>
      {mode === 'hang' && <path d={swagPath(width, height)} fill="none" stroke={inks.c} strokeWidth={2} strokeLinecap="round" />}
      {pieces.map((p, i) => (
        <g key={i}>
          {p.hangFrom !== undefined && (
            <line x1={f(p.x)} y1={p.hangFrom} x2={f(p.x)} y2={f(p.y - p.size / 2)} stroke={inks.c} strokeWidth={1.2} />
          )}
          <Piece motif={motif} inks={inks} p={p} />
        </g>
      ))}
    </svg>
  );
}

/** The rope baubles hang from: three shallow scallops across the band. */
function swagY(x: number, width: number, height: number): number {
  const dip = Math.min(26, height * 0.12);
  return 4 + dip * Math.abs(Math.sin((Math.PI * 3 * x) / width));
}

function swagPath(width: number, height: number): string {
  let d = '';
  for (let x = 0; x <= width; x += 8) d += `${x === 0 ? 'M' : 'L'}${x} ${f(swagY(x, width, height))}`;
  return d;
}

/** A cluster of the motif tucked into a corner, running off the page. */
export function ArtCorner({
  motif,
  inks,
  seed,
  width,
  height,
  className,
  style,
  corner = 'top-right',
}: CompositionProps & { corner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  if (motif === 'none') return null;
  const rand = seeded(`${seed}:corner`);
  const right = corner.endsWith('right');
  const bottom = corner.startsWith('bottom');
  const reach = Math.min(width, height);
  // Two rings out from the corner: two large pieces close in, three smaller
  // ones further out, each on its own bearing so none sits on another.
  const rings: Array<[number, number, number]> = [
    [24, 0.3, 0.44],
    [66, 0.3, 0.4],
    [10, 0.7, 0.27],
    [45, 0.72, 0.3],
    [80, 0.7, 0.27],
  ];
  const pieces: Placed[] = rings.map(([deg, dist, size]) => {
    const angle = ((deg + (rand() - 0.5) * 8) * Math.PI) / 180;
    const d = reach * (dist + (rand() - 0.5) * 0.06);
    return {
      x: (right ? width : 0) + (right ? -1 : 1) * Math.cos(angle) * d,
      y: (bottom ? height : 0) + (bottom ? -1 : 1) * Math.sin(angle) * d,
      size: reach * size * (0.92 + rand() * 0.16),
      rotate: rotationFor(motif, rand),
      variant: Math.floor(rand() * VARIANTS[motif]),
    };
  });
  return (
    <svg {...svgProps(width, height, className, style)}>
      {pieces.map((p, i) => (
        <Piece key={i} motif={motif} inks={inks} p={p} />
      ))}
    </svg>
  );
}

/** One piece of the motif, on its own. */
export function ArtMark({
  motif,
  inks,
  size,
  variant = 0,
  className,
}: {
  motif: MotifId;
  inks: Inks;
  size: number;
  variant?: number;
  className?: string;
}) {
  if (motif === 'none') return null;
  return (
    <svg aria-hidden focusable="false" className={className} width={size} height={size} viewBox="0 0 100 100">
      {PRIMITIVES[motif](inks, variant)}
    </svg>
  );
}
