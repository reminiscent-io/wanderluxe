/**
 * Slowly rotating "ENTER HERE" text ring that encircles the hero logo so the
 * logo reads as the page's entry point. Decorative only: the parent button
 * carries the accessible label, so the ring is aria-hidden.
 *
 * Render inside a `relative group` element sized to the logo — the ring is a
 * centered square that overflows it symmetrically. The spin pauses while the
 * button is hovered (easier to read) and never runs under
 * prefers-reduced-motion; the ring stays visible as a static affordance.
 */

// Text sits at radius 93 in a 200-unit viewBox (≈93% of the box), so with the
// parent adding ~6rem to the logo width the ring clears even a wordmark whose
// art runs edge-to-edge. Four phrases and four separator dots alternate every
// 12.5% so spacing stays perfectly even without depending on glyph metrics;
// the whole set is phase-shifted by 5% so nothing straddles the path seam at
// offset 0.
const PHRASE_OFFSETS = ["5%", "30%", "55%", "80%"];
const DOT_OFFSETS = ["17.5%", "42.5%", "67.5%", "92.5%"];

// Static id is safe: the ring appears once (landing hero). React 19's useId
// would emit «…» characters, which are unreliable inside SVG href fragments.
const PATH_ID = "enter-here-ring-path";

const EnterHereRing = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute left-1/2 top-1/2 aspect-square w-[calc(100%+3.5rem)] -translate-x-1/2 -translate-y-1/2 text-white/75 transition-colors duration-300 group-hover:text-white sm:w-[calc(100%+6rem)]"
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full motion-safe:animate-spin-slow group-hover:[animation-play-state:paused]"
      >
        <defs>
          <path
            id={PATH_ID}
            d="M 100 100 m -93 0 a 93 93 0 1 1 186 0 a 93 93 0 1 1 -186 0"
            fill="none"
          />
        </defs>
        {/* Hairline with a small orbiting gap so the rotation stays perceptible
            even between the words */}
        <circle
          cx="100"
          cy="100"
          r="98"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="0.35"
          strokeLinecap="round"
          strokeDasharray="577 39"
        />
        <text
          fill="currentColor"
          fontSize="5.4"
          fontWeight="600"
          letterSpacing="1.5"
          className="select-none font-sans"
        >
          {PHRASE_OFFSETS.map((offset) => (
            <textPath
              key={offset}
              href={`#${PATH_ID}`}
              startOffset={offset}
              textAnchor="middle"
            >
              ENTER HERE
            </textPath>
          ))}
          {DOT_OFFSETS.map((offset) => (
            <textPath
              key={offset}
              href={`#${PATH_ID}`}
              startOffset={offset}
              textAnchor="middle"
            >
              •
            </textPath>
          ))}
        </text>
      </svg>
    </div>
  );
};

export default EnterHereRing;
