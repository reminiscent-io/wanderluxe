import React from 'react';
import { format, parse } from 'date-fns';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPhotoUrl } from '@/utils/googleMapsLoader';
import { buildPeekFacts } from '../calendar/peekFacts';
import { FACT_ICONS, TYPE_LABELS } from '../calendar/factIcons';
import { formatDistance, type DistanceUnits } from './geo';
import { MAP_COLORS } from './mapTheme';
import { isStayKind, type MapStop } from './stopModel';

const KIND_LABELS: Partial<Record<MapStop['kind'], string>> = {
  'accommodation-checkin': 'Check in',
  'accommodation-checkout': 'Check out',
  'accommodation-anchor': 'Your base',
  'transport-departure': 'Departs',
  'transport-arrival': 'Arrives',
};

function fmtTime(time: string | null): string {
  if (!time) return '';
  return format(parse(time.slice(0, 5), 'HH:mm', new Date()), 'h:mm a');
}

export interface StopPopupProps {
  stop: MapStop;
  /** Google Places photo reference for this coordinate, if one was cached. */
  photoRef?: string | null;
  sequenceLabel?: string | null;
  /** Distance and name of the previous stop, e.g. 1.2 km from Le Comptoir. */
  fromPrevious?: { km: number; title: string } | null;
  units?: DistanceUnits;
  canEdit?: boolean;
  onEdit?: (stop: MapStop) => void;
}

/**
 * Marker popup body. Exported bare (not wrapped in an InfoWindow) so it renders
 * in tests without the Maps library.
 */
const StopPopup: React.FC<StopPopupProps> = ({
  stop,
  photoRef,
  sequenceLabel,
  fromPrevious,
  units = 'km',
  canEdit = false,
  onEdit,
}) => {
  const facts = buildPeekFacts(stop.entityType, stop.record);
  const kindLabel = KIND_LABELS[stop.kind];
  const photoUrl = photoRef ? getPhotoUrl({ photo_reference: photoRef, height: 0, width: 0 }, 480) : null;

  return (
    <div style={{ width: 240 }} data-testid={`map-popup-${stop.id}`}>
      {photoUrl && (
        <img
          src={photoUrl}
          alt=""
          className="img-warm"
          style={{
            display: 'block',
            width: '100%',
            height: 110,
            objectFit: 'cover',
            borderTopLeftRadius: '0.75rem',
            borderTopRightRadius: '0.75rem',
          }}
          loading="lazy"
        />
      )}

      <div style={{ padding: 14 }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: MAP_COLORS.muted,
          }}
        >
          {kindLabel ?? TYPE_LABELS[stop.entityType]}
        </p>

        <h3 className="font-display" style={{ margin: '2px 0 8px', fontSize: 16, lineHeight: 1.25 }}>
          {stop.title}
        </h3>

        {/* A guessed check-in hour is never presented as though it were stored. */}
        {isStayKind(stop.kind) && !stop.timed && stop.kind !== 'accommodation-anchor' && (
          <p style={{ margin: '0 0 6px', fontSize: 11, color: MAP_COLORS.muted }}>
            {stop.kind === 'accommodation-checkin' ? 'Check-in' : 'Check-out'} time not set
          </p>
        )}

        {stop.time && !facts.some((f) => f.icon === 'clock') && (
          <p style={{ margin: '0 0 6px', fontSize: 12 }}>{fmtTime(stop.time)}</p>
        )}

        {facts.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 5 }}>
            {facts.map((fact, i) => {
              const Icon = FACT_ICONS[fact.icon];
              return (
                <li
                  key={`${fact.icon}-${i}`}
                  style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 12 }}
                >
                  <Icon className="h-3 w-3 shrink-0" />
                  <span>{fact.text}</span>
                </li>
              );
            })}
          </ul>
        )}

        {(sequenceLabel || fromPrevious) && (
          <p
            style={{
              margin: '10px 0 0',
              paddingTop: 8,
              borderTop: `1px solid ${MAP_COLORS.border}`,
              fontSize: 11,
              color: MAP_COLORS.muted,
            }}
          >
            {[
              sequenceLabel,
              fromPrevious
                ? `${formatDistance(fromPrevious.km, units)} from ${fromPrevious.title}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}

        {canEdit && onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-8 w-full justify-center"
            onClick={() => onEdit(stop)}
          >
            <Pencil className="mr-1.5 h-3 w-3" />
            Edit
          </Button>
        )}
      </div>
    </div>
  );
};

export default StopPopup;
