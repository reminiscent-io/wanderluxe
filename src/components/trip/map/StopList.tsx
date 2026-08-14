import React, { useEffect, useMemo, useRef, useState } from 'react';
import { format, parse } from 'date-fns';
import { MapPinOff, Plus } from 'lucide-react';
import { ENTITY_TONES } from './mapTheme';
import { isStayKind, type MapStop } from './stopModel';

const KIND_PREFIX: Partial<Record<MapStop['kind'], string>> = {
  'accommodation-checkin': 'Check in · ',
  'accommodation-checkout': 'Check out · ',
  'accommodation-anchor': 'Base · ',
  'transport-departure': 'Depart · ',
  'transport-arrival': 'Arrive · ',
};

const fmtTime = (time: string | null) =>
  time ? format(parse(time.slice(0, 5), 'HH:mm', new Date()), 'h:mm a') : '';

export interface StopListProps {
  stops: MapStop[];
  unplaced: { stop: MapStop; reason: 'no-location' | 'unresolved' }[];
  selectedStopId: string | null;
  hoveredStopId: string | null;
  /** Index of the currently playing stop, or -1. */
  playingIndex?: number;
  canEdit?: boolean;
  onSelect: (stop: MapStop) => void;
  onHover: (stopId: string | null) => void;
  onEdit: (stop: MapStop) => void;
}

/**
 * The chronological list beside the map. It doubles as the accessible,
 * keyboard-navigable path through the route and as playback's progress
 * indicator.
 *
 * Stops that can't be placed stay in this one list, marked in situ with the fix
 * right next to them — listing them again in a separate group would show the
 * same stop twice in the same panel.
 */
const StopList: React.FC<StopListProps> = ({
  stops,
  unplaced,
  selectedStopId,
  hoveredStopId,
  playingIndex = -1,
  canEdit = false,
  onSelect,
  onHover,
  onEdit,
}) => {
  const listRef = useRef<HTMLOListElement>(null);
  const [pointerInside, setPointerInside] = useState(false);

  const unplacedById = useMemo(
    () => new Map(unplaced.map((u) => [u.stop.id, u.reason])),
    [unplaced],
  );

  // Counted against the same denominator as the day summary: real stops only.
  // Hotel anchors repeat nightly, so counting them would report more missing
  // places than there are stops.
  const unplacedRealCount = useMemo(
    () => unplaced.filter((u) => !u.stop.synthetic).length,
    [unplaced],
  );

  // Follow playback — but never while the reader's cursor is in the list.
  // Nothing is worse than a list scrolling out from under the pointer.
  useEffect(() => {
    if (playingIndex < 0 || pointerInside) return;
    const row = listRef.current?.querySelector(`[data-stop-index="${playingIndex}"]`);
    // Guarded: scrollIntoView is absent in jsdom and some embedded webviews.
    if (row && typeof row.scrollIntoView === 'function') {
      row.scrollIntoView({ block: 'nearest' });
    }
  }, [playingIndex, pointerInside]);

  return (
    <div
      className="flex h-full flex-col"
      onMouseEnter={() => setPointerInside(true)}
      onMouseLeave={() => {
        setPointerInside(false);
        onHover(null);
      }}
    >
      <ol ref={listRef} className="flex-1 overflow-y-auto" data-testid="map-stop-list">
        {stops.map((stop, i) => {
          const active = stop.id === selectedStopId;
          const hovered = stop.id === hoveredStopId;
          const done = playingIndex >= 0 && i < playingIndex;
          const tone = ENTITY_TONES[stop.entityType];
          const missing = unplacedById.get(stop.id);

          return (
            <li key={stop.id} data-stop-index={i} className="flex items-start">
              <button
                type="button"
                onClick={() => onSelect(stop)}
                onMouseEnter={() => onHover(stop.id)}
                onFocus={() => onHover(stop.id)}
                aria-current={active || undefined}
                data-testid={`map-list-${stop.id}`}
                data-unplaced={missing ? '' : undefined}
                className={`flex min-w-0 flex-1 items-start gap-2.5 border-l-2 px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-l-primary bg-accent/60'
                    : hovered
                      ? 'border-l-primary/40 bg-accent/30'
                      : 'border-l-transparent hover:bg-accent/20'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums"
                  style={{
                    background: missing || stop.synthetic ? 'transparent' : tone,
                    border: missing || stop.synthetic ? `1.5px solid ${tone}` : 'none',
                    color: missing || stop.synthetic ? tone : '#FDFCF8',
                    opacity: done ? 0.45 : missing ? 0.6 : 1,
                  }}
                >
                  {missing ? (
                    <MapPinOff className="h-2.5 w-2.5" />
                  ) : stop.synthetic ? (
                    '★'
                  ) : (
                    (stop.sequence ?? '')
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${missing ? 'text-muted-foreground' : ''}`}>
                    <span className="text-muted-foreground">{KIND_PREFIX[stop.kind] ?? ''}</span>
                    {stop.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {missing === 'no-location' ? (
                      <em className="not-italic opacity-70">no location set</em>
                    ) : missing === 'unresolved' ? (
                      <em className="not-italic opacity-70">couldn’t find this place</em>
                    ) : stop.time ? (
                      fmtTime(stop.time)
                    ) : isStayKind(stop.kind) && !stop.synthetic ? (
                      <em className="not-italic opacity-70">time not set</em>
                    ) : !stop.timed && !stop.synthetic ? (
                      <em className="not-italic opacity-70">order estimated</em>
                    ) : (
                      ''
                    )}
                  </span>
                </span>
              </button>

              {missing && canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(stop)}
                  className="mr-2 mt-2.5 shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Add a location to ${stop.title}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}

        {stops.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">
            Nothing scheduled on this day.
          </li>
        )}
      </ol>

      {unplacedRealCount > 0 && (
        <p
          className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-xs text-muted-foreground"
          data-testid="map-unplaced-count"
        >
          <MapPinOff className="h-3.5 w-3.5 shrink-0" />
          {unplacedRealCount} not on the map
        </p>
      )}
    </div>
  );
};

export default StopList;
