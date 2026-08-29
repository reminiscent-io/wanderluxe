import React, { useMemo } from 'react';
import { AdvancedMarker, Polyline } from '@vis.gl/react-google-maps';
import { arcPath, coordKey, formatDistance, type DistanceUnits } from './geo';
import {
  AIR_DASH_REPEAT,
  DASH_SYMBOL,
  MAP_COLORS,
  SEA_DASH_REPEAT,
  segmentStroke,
  type DayEmphasis,
} from './mapTheme';
import type { RouteSegment } from './routeSegments';
import type { LatLng } from './stopModel';

/**
 * Each repeat pass over the same directed pair of points bows wider, so a
 * favourite restaurant visited three times reads as three nested arcs rather
 * than one line drawn three times. Capped — past a few visits, wider arcs stop
 * adding information and start colliding with unrelated legs.
 */
const REPEAT_BOW_STEP = 0.9;
const REPEAT_BOW_CAP = 3;

function buildArcs(segments: RouteSegment[]): Map<string, LatLng[]> {
  const passes = new Map<string, number>();
  const arcs = new Map<string, LatLng[]>();

  segments.forEach((segment) => {
    const pairKey = `${coordKey(segment.fromPos)}|${coordKey(segment.toPos)}`;
    const repeat = passes.get(pairKey) ?? 0;
    passes.set(pairKey, repeat + 1);
    arcs.set(
      segment.id,
      arcPath(segment.fromPos, segment.toPos, 1 + REPEAT_BOW_STEP * Math.min(repeat, REPEAT_BOW_CAP)),
    );
  });

  return arcs;
}

/**
 * Dashes and arrowheads are Symbol objects, which need the Maps library loaded.
 * Built lazily so a render before load simply omits them rather than throwing.
 */
function symbolPath(name: 'FORWARD_CLOSED_ARROW'): unknown | null {
  const g = (globalThis as { google?: { maps?: { SymbolPath?: Record<string, unknown> } } }).google;
  return g?.maps?.SymbolPath?.[name] ?? null;
}

function lineIcons(segment: RouteSegment, color: string, weight: number) {
  const icons: Record<string, unknown>[] = [];
  const dashed = segment.mode !== 'ground';

  if (dashed) {
    icons.push({
      icon: { ...DASH_SYMBOL, strokeColor: color, scale: Math.max(2, weight - 0.5) },
      offset: '0',
      repeat: segment.mode === 'air' ? AIR_DASH_REPEAT : SEA_DASH_REPEAT,
    });
  }

  // Direction is the whole point of a chronological map, so every leg gets one
  // arrowhead — placed past centre so it never collides with a distance label.
  const arrow = symbolPath('FORWARD_CLOSED_ARROW');
  if (arrow) {
    icons.push({
      icon: { path: arrow, scale: 2.5, strokeColor: color, fillColor: color, fillOpacity: 1 },
      offset: '55%',
    });
  }

  return icons;
}

export interface RouteLayerProps {
  segments: RouteSegment[];
  /** Ordered trip dates, for the day colour ramp. */
  dates: string[];
  /** Date currently focused, or null in whole-trip mode with nothing hovered. */
  focusedDate?: string | null;
  /** Segment ids whose distance should be labelled. */
  labelledSegmentIds?: Set<string>;
  units?: DistanceUnits;
  /** Appends "bird's-eye" to the first label so it is never read as driving distance. */
  annotateFirstLabel?: boolean;
}

const RouteLayer: React.FC<RouteLayerProps> = ({
  segments,
  dates,
  focusedDate = null,
  labelledSegmentIds,
  units = 'km',
  annotateFirstLabel = true,
}) => {
  const dayCount = Math.max(1, dates.length);

  // Derived up front rather than counted with a mutable tally during render:
  // render must be idempotent, and StrictMode double-invokes it.
  const firstLabelledId = segments.find((s) => labelledSegmentIds?.has(s.id))?.id ?? null;

  const arcs = useMemo(() => buildArcs(segments), [segments]);

  return (
    <>
      {segments.map((segment) => {
        const dayIndex = Math.max(0, dates.indexOf(segment.date));
        const emphasis: DayEmphasis = focusedDate
          ? segment.date === focusedDate
            ? 'focused'
            : 'dimmed'
          : 'normal';
        const stroke = segmentStroke(dayIndex, dayCount, emphasis, segment.inferred);
        const dashed = segment.mode !== 'ground';
        const path = arcs.get(segment.id) ?? [segment.fromPos, segment.toPos];
        // The label sits on the arc's apex, not the straight-chord midpoint —
        // on a bowed line the chord midpoint floats off in empty space.
        const apex = path[Math.floor(path.length / 2)];

        return (
          <React.Fragment key={segment.id}>
            <Polyline
              path={path}
              // Geodesic per sampled sub-segment: visually identical at this
              // sampling density, and it keeps antimeridian-crossing hops from
              // streaking the long way around the world.
              geodesic
              strokeColor={stroke.color}
              // A dashed line is drawn entirely by its repeated icons, so the
              // underlying stroke must be invisible.
              strokeOpacity={dashed ? 0 : stroke.opacity}
              strokeWeight={stroke.weight}
              icons={lineIcons(segment, stroke.color, stroke.weight) as never}
              zIndex={emphasis === 'focused' ? 5 : 1}
            />
            {labelledSegmentIds?.has(segment.id) && (
              <AdvancedMarker
                position={apex}
                zIndex={40}
              >
                <span
                  data-testid={`map-distance-${segment.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '2px 7px',
                    borderRadius: 999,
                    background: MAP_COLORS.cream,
                    border: `1px solid ${MAP_COLORS.border}`,
                    color: MAP_COLORS.bronze,
                    fontSize: 10,
                    lineHeight: '14px',
                    fontVariantNumeric: 'tabular-nums',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 1px 3px 0 rgba(139, 119, 93, 0.25)',
                  }}
                >
                  {formatDistance(segment.distanceKm, units)}
                  {annotateFirstLabel && segment.id === firstLabelledId ? ' bird’s-eye' : ''}
                </span>
              </AdvancedMarker>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default RouteLayer;
