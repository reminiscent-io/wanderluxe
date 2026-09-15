// The Print Studio's place on the landing page: the one paid feature, shown
// rather than described.
//
// The heading and pitch are static so they prerender and index. The stage is a
// separate chunk that mounts when the section nears the viewport — it pulls in
// the document renderer, its stylesheet and edition fonts, none of which
// belong in the landing page's first paint.

import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  SHEET_BOX_STYLE,
  STAGE_GRID_CLASS,
  STAGE_NOTE_ROW_CLASS,
  STAGE_RAIL_CLASS,
  STAGE_STACK_CLASS,
} from '../print-showcase/stageLayout';

const ShowcaseStage = lazy(() => import('../print-showcase/ShowcaseStage'));

// Holds the stage's footprint until its chunk arrives: the same grid, a rail
// one chip row tall on a phone, a sheet-shaped box and the note row. It is
// built from stageLayout alone. Importing the stage here would pull the
// renderer into the landing page's first paint.
const StagePlaceholder = () => (
  <div data-testid="showcase-placeholder" className={STAGE_GRID_CLASS}>
    <div className={`min-w-0 ${STAGE_RAIL_CLASS}`} />
    <div className="min-w-0">
      <div className={STAGE_STACK_CLASS}>
        <div className="w-full" style={SHEET_BOX_STYLE} />
        <div className={STAGE_NOTE_ROW_CLASS} />
      </div>
    </div>
  </div>
);

const PrintStudioShowcase = () => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px' }
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="print-studio" className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-80px' }}
        >
          <p className="font-sans text-sm uppercase tracking-widest text-earth-500">Print Studio</p>
          <h2 className="mt-3 font-display text-3xl md:text-4xl text-earth-600 [text-wrap:balance]">
            The plan you made, set as something to keep
          </h2>
          <p className="mt-4 font-sans text-lg text-earth-500 leading-relaxed [text-wrap:pretty]">
            Every trip can be a clean printed PDF, free. For $3.99 a month, the Studio takes the
            same itinerary and designs it: a palette, typefaces, a motif, and a line written for
            each day. Then you rewrite any line you like and print it.
          </p>
        </motion.div>

        <div ref={hostRef} className="mt-10" data-testid="showcase-host">
          {nearViewport ? (
            <Suspense fallback={<StagePlaceholder />}>
              <ShowcaseStage />
            </Suspense>
          ) : (
            // Reserves the stage's exact height so arriving at it shifts nothing.
            <StagePlaceholder />
          )}
        </div>

        <div className="mt-8">
          <Button size="lg" asChild>
            <Link to="/auth?mode=signup">Try it on your trip</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PrintStudioShowcase;
