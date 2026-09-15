// A document at reading scale inside a small frame.
//
// The page is laid out at its natural width and scaled with a transform, so
// the type keeps its real proportions instead of reflowing into a narrow
// column — a 46rem measure squeezed to 10rem would not be the document the
// traveler is being shown. Scale is width-driven and starts at a sensible
// fraction, so a frame that never reports a width (jsdom, a hidden panel)
// still renders something truthful rather than nothing. The page is taken out
// of flow so the thumbnail contributes no intrinsic width to its container,
// because a transform does not shrink layout.

import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface PageThumbnailProps {
  children: React.ReactNode;
  /** Natural width of the document being scaled. 736px = the document's 46rem. */
  pageWidth?: number;
  /** Frame height ÷ width. Taller shows more of the page. */
  aspect?: number;
  /** What a screen reader is told this picture is. */
  label: string;
  className?: string;
}

const PageThumbnail: React.FC<PageThumbnailProps> = ({
  children,
  pageWidth = 736,
  aspect = 1.25,
  label,
  className,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const width = frame.clientWidth;
      if (width > 0) setScale(width / pageWidth);
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [pageWidth]);

  return (
    <div className={cn('relative', className)}>
      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-card border border-border bg-background shadow-warm-sm"
        style={{ aspectRatio: `1 / ${aspect}` }}
        aria-hidden="true"
      >
        <div
          data-testid="thumb-page"
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: `${pageWidth}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
        >
          {children}
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
};

export default PageThumbnail;
