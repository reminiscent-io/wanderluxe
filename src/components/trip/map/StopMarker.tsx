import React from 'react';
import { AdvancedMarker } from '@vis.gl/react-google-maps';
import {
  MapPin,
  UtensilsCrossed,
  PlaneTakeoff,
  PlaneLanding,
  TrainFront,
  Ship,
  Car,
} from 'lucide-react';
import { ENTITY_TONES, MAP_COLORS, MARKER_SIZE } from './mapTheme';
import { isStayKind, type LatLng, type MapStop } from './stopModel';

type Glyph = React.ComponentType<{ className?: string; strokeWidth?: number }>;

function transportGlyph(stop: MapStop): Glyph {
  const type = (stop.record as { type?: string })?.type;
  if (type === 'train') return TrainFront;
  if (type === 'ferry') return Ship;
  if (type === 'car_service' || type === 'rental_car' || type === 'shuttle') return Car;
  return stop.kind === 'transport-arrival' ? PlaneLanding : PlaneTakeoff;
}

function glyphFor(stop: MapStop): Glyph {
  if (stop.entityType === 'dining') return UtensilsCrossed;
  if (stop.entityType === 'transportation') return transportGlyph(stop);
  return MapPin;
}

/** Lucide's star outline, drawn with round joins so the points read soft. */
const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

export interface StopMarkerProps {
  stop: MapStop;
  position: LatLng;
  /** Every stop sharing this coordinate, including `stop` itself. */
  visits: MapStop[];
  /** Whole-trip mode renders bare dots; 150 full markers is too heavy. */
  compact?: boolean;
  selected?: boolean;
  hovered?: boolean;
  /** Ghost stops from the neighbouring day, drawn faintly. */
  ghost?: boolean;
  onSelect?: (stop: MapStop) => void;
  onHover?: (stopId: string | null) => void;
}

const StopMarker: React.FC<StopMarkerProps> = ({
  stop,
  position,
  visits,
  compact = false,
  selected = false,
  hovered = false,
  ghost = false,
  onSelect,
  onHover,
}) => {
  const tone = ENTITY_TONES[stop.entityType];
  const isStay = isStayKind(stop.kind);
  const isTransport = stop.entityType === 'transportation';
  const Glyph = glyphFor(stop);

  // Sequence badge shows the first real visit; anchors and stays carry none.
  const badge = visits.find((v) => !v.synthetic && v.sequence != null)?.sequence ?? null;
  const repeatCount = visits.filter((v) => !v.synthetic).length;

  const emphasis = selected ? 'selected' : hovered ? 'hovered' : 'rest';
  const ring = emphasis === 'rest' ? tone : MAP_COLORS.bronze;
  const ringWidth = emphasis === 'selected' ? 3 : 2;
  const scale = emphasis === 'selected' ? 1.15 : emphasis === 'hovered' ? 1.08 : 1;

  const label = [
    isStay ? 'Stay' : stop.entityType === 'dining' ? 'Dining' : isTransport ? 'Transport' : 'Activity',
    stop.title,
    badge != null ? `stop ${badge}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (compact && !selected && !hovered) {
    return (
      <AdvancedMarker
        position={position}
        title={stop.title}
        onClick={() => onSelect?.(stop)}
        zIndex={ghost ? 0 : 1}
      >
        <span
          aria-label={label}
          data-testid={`map-dot-${stop.id}`}
          data-entity-type={stop.entityType}
          style={{
            display: 'block',
            width: MARKER_SIZE.dot,
            height: MARKER_SIZE.dot,
            borderRadius: '50%',
            background: MAP_COLORS.cream,
            border: `2px solid ${tone}`,
            opacity: ghost ? 0.35 : 1,
            boxShadow: '0 1px 3px 0 rgba(139, 119, 93, 0.35)',
          }}
        />
      </AdvancedMarker>
    );
  }

  const size = isStay ? MARKER_SIZE.star : isTransport ? MARKER_SIZE.gate : MARKER_SIZE.coin;

  return (
    <AdvancedMarker
      position={position}
      title={stop.title}
      onClick={() => onSelect?.(stop)}
      zIndex={selected ? 30 : hovered ? 20 : ghost ? 0 : 10}
    >
      <button
        type="button"
        aria-label={label}
        data-testid={`map-marker-${stop.id}`}
        data-entity-type={stop.entityType}
        data-selected={selected || undefined}
        onMouseEnter={() => onHover?.(stop.id)}
        onMouseLeave={() => onHover?.(null)}
        onFocus={() => onHover?.(stop.id)}
        onBlur={() => onHover?.(null)}
        style={{
          position: 'relative',
          width: size,
          height: size,
          padding: 0,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          opacity: ghost ? 0.35 : 1,
          transform: `scale(${scale})`,
          transition: 'transform 150ms ease-out',
          lineHeight: 0,
        }}
      >
        {isStay ? (
          // The star is its own badge — a stay never carries a sequence number.
          <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
            <path
              d={STAR_PATH}
              fill={MAP_COLORS.cream}
              stroke={ring}
              strokeWidth={ringWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: size,
              height: size,
              // A different silhouette for transport reads instantly at a glance.
              borderRadius: isTransport ? 8 : '50%',
              background: MAP_COLORS.cream,
              border: `${ringWidth}px solid ${ring}`,
              boxShadow: '0 1px 3px 0 rgba(139, 119, 93, 0.3)',
              color: tone,
            }}
          >
            <Glyph className="h-3 w-3" strokeWidth={2.25} />
          </span>
        )}

        {badge != null && !isStay && (
          <span
            data-testid={`map-badge-${stop.id}`}
            style={{
              position: 'absolute',
              right: -5,
              bottom: -5,
              minWidth: 16,
              height: 16,
              padding: '0 3px',
              borderRadius: 8,
              background: tone,
              color: MAP_COLORS.cream,
              fontSize: 10,
              lineHeight: '16px',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              border: `1px solid ${MAP_COLORS.cream}`,
            }}
          >
            {badge}
          </span>
        )}

        {repeatCount > 1 && (
          <span
            style={{
              position: 'absolute',
              left: -5,
              bottom: -5,
              minWidth: 16,
              height: 16,
              padding: '0 3px',
              borderRadius: 8,
              background: MAP_COLORS.cream,
              color: MAP_COLORS.bronze,
              fontSize: 10,
              lineHeight: '15px',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center',
              border: `1px solid ${MAP_COLORS.border}`,
            }}
          >
            ×{repeatCount}
          </span>
        )}
      </button>
    </AdvancedMarker>
  );
};

export default StopMarker;
