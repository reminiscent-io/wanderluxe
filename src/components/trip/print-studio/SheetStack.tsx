// An edition's pages at the width of the screen.
//
// Every page is a fixed Letter sheet, 816px wide, because that is what
// prints. On a phone the stack is scaled down to fit with a transform rather
// than reflowed, so the reader sees the page they will print, line for line.
// A transform (not CSS zoom) on purpose: it leaves layout sizes alone, so the
// art that measures its own space (clientHeight) composes for the printed
// page, and the fit check compares scaled rects with scaled rects. Print
// drops the transform (printDocument.css, .pd-stack).

import React, { useLayoutEffect, useRef, useState } from 'react';
import { SHEET } from '@/lib/printDesign/plan';

const SheetStack: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      const width = outer.clientWidth;
      const next = width > 0 ? Math.min(1, width / SHEET.width) : 1;
      setScale(next);
      setHeight(next < 1 ? Math.ceil(inner.offsetHeight * next) : undefined);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className={`pd-stack${className ? ` ${className}` : ''}`} style={{ height }}>
      <div
        ref={innerRef}
        className="pd-stack-inner"
        style={scale < 1 ? { transform: `scale(${scale})`, transformOrigin: 'top left', width: SHEET.width } : undefined}
      >
        {children}
      </div>
    </div>
  );
};

export default SheetStack;
