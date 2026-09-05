// Print Studio decorative motifs — stroke-based SVG pattern bands.
//
// Each motif is a small repeating tile drawn with currentColor strokes, so the
// same component renders the airy cover band, section dividers, and the
// closing mark just by varying size/opacity. Stroke-only drawing keeps the
// document printable even when the browser drops background fills.

import React, { useId } from 'react';
import type { MotifId } from '@/lib/printDesign/spec';

interface TileSpec {
  /** Tile width/height in SVG units. */
  w: number;
  h: number;
  content: React.ReactNode;
}

const STROKE = 1.1;

function tileFor(motif: MotifId): TileSpec | null {
  switch (motif) {
    case 'waves':
      return {
        w: 36,
        h: 12,
        content: (
          <>
            <path d="M0 6 Q 4.5 1.5, 9 6 T 18 6 T 27 6 T 36 6" fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
            <path d="M0 10 Q 4.5 5.5, 9 10 T 18 10 T 27 10 T 36 10" fill="none" stroke="currentColor" strokeWidth={STROKE * 0.7} strokeLinecap="round" opacity={0.55} />
          </>
        ),
      };
    case 'palms':
      return {
        w: 34,
        h: 18,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M17 16 C 16.4 11, 16.4 8, 17 4" />
            <path d="M17 6 C 13 4, 10 4.5, 7.5 7" />
            <path d="M17 6 C 21 4, 24 4.5, 26.5 7" />
            <path d="M17 4.6 C 14.5 2.4, 11.8 2, 9.5 3" opacity={0.7} />
            <path d="M17 4.6 C 19.5 2.4, 22.2 2, 24.5 3" opacity={0.7} />
          </g>
        ),
      };
    case 'mountains':
      return {
        w: 40,
        h: 14,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinejoin="round" strokeLinecap="round">
            <path d="M0 12 L 8 4 L 13 9 L 19 2.5 L 26 12" />
            <path d="M24 12 L 30 6 L 34 9.5 L 38 5.5 L 40 7.5" opacity={0.6} />
          </g>
        ),
      };
    case 'deco':
      return {
        w: 28,
        h: 14,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M14 12 A 8 8 0 0 1 22 4" transform="rotate(0 14 12)" />
            <path d="M14 12 A 8 8 0 0 0 6 4" />
            <path d="M14 12 L 14 3" />
            <path d="M14 12 L 8.5 5" opacity={0.7} />
            <path d="M14 12 L 19.5 5" opacity={0.7} />
            <path d="M0 13 L 28 13" strokeWidth={STROKE * 0.6} opacity={0.5} />
          </g>
        ),
      };
    case 'stars':
      return {
        w: 44,
        h: 18,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M10 5 L 10 11 M 7 8 L 13 8" />
            <path d="M28 10 L 28 16 M 25 13 L 31 13" opacity={0.75} />
            <path d="M38 4 L 38 8 M 36 6 L 40 6" opacity={0.55} />
            <circle cx="20" cy="4.5" r="0.9" fill="currentColor" stroke="none" opacity={0.6} />
            <circle cx="33" cy="7.5" r="0.7" fill="currentColor" stroke="none" opacity={0.45} />
          </g>
        ),
      };
    case 'botanical':
      return {
        w: 36,
        h: 16,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round">
            <path d="M4 13 C 12 12, 24 10, 32 4" />
            <path d="M12 11.6 C 11 9, 11.6 7.2, 13.6 6 C 14.2 8.6, 13.6 10.2, 12 11.6 Z" />
            <path d="M20 9.6 C 18.6 7.2, 19 5.4, 21 4 C 21.8 6.6, 21.4 8.2, 20 9.6 Z" opacity={0.75} />
            <path d="M26.5 7.2 C 25.4 5.2, 25.8 3.6, 27.6 2.4 C 28.2 4.8, 27.8 6, 26.5 7.2 Z" opacity={0.55} />
          </g>
        ),
      };
    case 'geometric':
      return {
        w: 24,
        h: 12,
        content: (
          <g fill="none" stroke="currentColor" strokeWidth={STROKE * 0.9} strokeLinejoin="round">
            <path d="M6 2 L 10 6 L 6 10 L 2 6 Z" />
            <path d="M18 2 L 22 6 L 18 10 L 14 6 Z" opacity={0.55} />
            <circle cx="12" cy="6" r="0.9" fill="currentColor" stroke="none" opacity={0.6} />
          </g>
        ),
      };
    case 'none':
    default:
      return null;
  }
}

interface MotifBandProps {
  motif: MotifId;
  /** Rendered band height in px; the tile scales to it. */
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A horizontal repeating band of the motif, tinted by CSS `color`.
 * Renders a plain hairline for the 'none' motif.
 */
export const MotifBand: React.FC<MotifBandProps> = ({ motif, height = 14, className, style }) => {
  const patternId = useId();
  const tile = tileFor(motif);

  if (!tile) {
    return (
      <div
        aria-hidden
        className={className}
        style={{ borderTop: '1px solid currentColor', opacity: 0.35, ...style }}
      />
    );
  }

  const scale = height / tile.h;

  return (
    <svg
      aria-hidden
      className={className}
      style={{ display: 'block', width: '100%', ...style }}
      height={height}
      role="presentation"
    >
      <defs>
        <pattern
          id={patternId}
          width={tile.w * scale}
          height={height}
          patternUnits="userSpaceOnUse"
        >
          <g transform={`scale(${scale})`}>{tile.content}</g>
        </pattern>
      </defs>
      <rect width="100%" height={height} fill={`url(#${patternId})`} />
    </svg>
  );
};

/** A single centered motif tile — used as the closing mark. */
export const MotifMark: React.FC<{ motif: MotifId; size?: number; className?: string }> = ({ motif, size = 40, className }) => {
  const tile = tileFor(motif);
  if (!tile) return null;
  const scale = size / Math.max(tile.w, tile.h);
  return (
    <svg
      aria-hidden
      className={className}
      width={tile.w * scale}
      height={tile.h * scale}
      viewBox={`0 0 ${tile.w} ${tile.h}`}
      role="presentation"
      style={{ display: 'block' }}
    >
      {tile.content}
    </svg>
  );
};
