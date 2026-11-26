import { useEffect, useRef, useState } from "react";
import { BedDouble, Plane, RotateCcw, Utensils, type LucideIcon } from "lucide-react";

/**
 * The landing page's one piece of motion below the hero: a confirmation types
 * itself into a paste box, then lands as a row on the day it belongs to. Three
 * of them build an arrival day. It shows what the product does in the time it
 * takes to read a sentence about it, which is why the sections around it no
 * longer fade and slide on scroll.
 *
 * It plays once when scrolled into view and then rests on the finished day; a
 * Replay button runs it again. With reduced motion, or without
 * IntersectionObserver, it renders the finished day and never animates.
 */

interface Step {
  paste: string;
  time: string;
  title: string;
  meta: string;
  Icon: LucideIcon;
}

export const PASTE_DEMO_STEPS: Step[] = [
  {
    paste: "ANA NH 111 · Chicago ORD to Tokyo HND · arrives Sep 17, 1:30 PM",
    time: "1:30p",
    title: "Arrive at Haneda Airport",
    meta: "ANA NH 111 from Chicago",
    Icon: Plane,
  },
  {
    paste: "Aman Tokyo · check-in Sep 17, 3:00 PM · 4 nights",
    time: "3:00p",
    title: "Check-in: Aman Tokyo",
    meta: "4 nights",
    Icon: BedDouble,
  },
  {
    paste: "New York Bar, Park Hyatt · table for 2 · Sep 17, 7:00 PM",
    time: "7:00p",
    title: "Drinks at the New York Bar",
    meta: "Table for 2",
    Icon: Utensils,
  },
];

const TYPE_MS = 28; // per character
const LAND_MS = 550; // pause on the finished line before it lands
const START_MS = 300; // beat before the first line starts
const NEXT_MS = 900; // pause on the new row before the next line starts

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const PasteDemo = () => {
  const total = PASTE_DEMO_STEPS.length;
  const sectionRef = useRef<HTMLDivElement>(null);

  // `landed` rows are on the day; `typed` is how much of the next line shows.
  const [landed, setLanded] = useState(total);
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [canAnimate, setCanAnimate] = useState(false);

  // Start once, the first time the demo is on screen.
  useEffect(() => {
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    const node = sectionRef.current;
    if (!node) return;
    setCanAnimate(true);
    setLanded(0);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setPlaying(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // One timer per tick: type a character, or land the line and move on.
  useEffect(() => {
    if (!playing) return;
    if (landed >= total) {
      setPlaying(false);
      return;
    }
    const line = PASTE_DEMO_STEPS[landed].paste;
    const id = window.setTimeout(
      () => {
        if (typed < line.length) {
          setTyped(typed + 1);
        } else {
          setLanded(landed + 1);
          setTyped(0);
        }
      },
      typed === 0 ? (landed === 0 ? START_MS : NEXT_MS) : typed < line.length ? TYPE_MS : LAND_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, landed, typed, total]);

  const replay = () => {
    setLanded(0);
    setTyped(0);
    setPlaying(true);
  };

  const currentLine = landed < total ? PASTE_DEMO_STEPS[landed].paste.slice(0, typed) : "";
  const finished = landed >= total;

  return (
    <section className="relative overflow-hidden bg-sand-50" aria-labelledby="paste-demo-heading">
      <div className="absolute inset-0 bg-grain" />
      <div className="relative z-10 mx-auto max-w-xl px-6 py-14 md:py-20">
        <h2
          id="paste-demo-heading"
          className="text-center font-display text-3xl leading-tight text-earth-600 [text-wrap:balance] md:text-4xl"
        >
          Paste a confirmation. It lands on the right day.
        </h2>

        <div ref={sectionRef} className="mt-8 space-y-3">
          {/* The paste box. Decorative: the rows below carry the content. */}
          <div
            aria-hidden="true"
            className="flex min-h-[4.5rem] items-start rounded-card border border-dashed border-earth-200 bg-background px-4 py-3 font-mono text-ui-sm text-earth-500"
          >
            {finished ? (
              <span>Paste a flight, hotel or dinner confirmation</span>
            ) : (
              <span>
                {currentLine}
                <span className="ml-px inline-block h-[1em] w-px translate-y-[2px] animate-pulse bg-earth-500" />
              </span>
            )}
          </div>

          {/* The day it builds. */}
          <div className="overflow-hidden rounded-card bg-background shadow-warm ring-1 ring-earth-100">
            <div className="border-b border-earth-100 px-4 py-3">
              <p className="font-display text-xl leading-tight text-foreground">Arrival day</p>
              <p className="font-sans text-ui-sm text-earth-500">Thursday, September 17 · Tokyo</p>
            </div>
            <ol className="list-none px-4 py-2">
              {PASTE_DEMO_STEPS.map((step, i) => {
                const shown = i < landed;
                return (
                  <li
                    key={step.title}
                    aria-hidden={!shown}
                    className={`flex items-start gap-3 py-2.5 ${
                      canAnimate ? "transition-all duration-500 ease-out" : ""
                    } ${shown ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
                  >
                    <span className="w-12 shrink-0 pt-0.5 text-right font-sans text-ui-base tabular-nums text-earth-500">
                      {step.time}
                    </span>
                    <step.Icon className="mt-0.5 h-5 w-5 shrink-0 text-earth-500" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block font-sans text-ui-md font-medium text-foreground">
                        {step.title}
                      </span>
                      <span className="block font-sans text-ui-sm text-earth-500">{step.meta}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {canAnimate && (
            <div className="flex h-8 justify-center">
              {finished && (
                <button
                  type="button"
                  onClick={replay}
                  className="inline-flex items-center gap-1.5 rounded-sm font-sans text-sm font-medium text-earth-500 hover:text-earth-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-earth-500 focus-visible:ring-offset-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Replay
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default PasteDemo;
