# Trip Assistant Collapse & Floating Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On desktop, collapsing the Trip Assistant folds it into a floating bottom-right button (timeline reclaims full width), and calendar view always gets full page width with the assistant as a floating overlay panel.

**Architecture:** A new `AssistantDock` positioning shell wraps a single always-mounted `AIAssistantPanel` in `TimelineView` and switches its wrapper between three CSS modes (docked column / fixed overlay / hidden + floating button). The panel is never remounted, so panel-local state (streaming, extracted items) survives collapse/expand and view switches. `AIAssistantPanel`'s broken internal collapse state is removed and replaced by an optional `onCollapse` callback prop.

**Tech Stack:** React 19 + TypeScript, Tailwind CSS, Vitest + @testing-library/react, lucide-react icons, Shadcn/ui Button.

**Spec:** `docs/superpowers/specs/2026-07-16-trip-assistant-collapse-design.md`

## Global Constraints

- Desktop-only feature: every new surface is gated `lg+` (`hidden lg:*`); mobile (`AIAssistantDrawer`, bottom nav) untouched.
- No persistence: `assistantOpen` is `useState(true)`; nothing is written to localStorage.
- The `AIAssistantPanel` instance must stay mounted across collapse/expand and timeline↔calendar switches (CSS visibility only, never conditional unmount).
- Floating button/overlay use `z-40` (above page content, below Radix dialogs at z-50).
- Design system: `rounded-card`, `shadow-warm-lg`/`shadow-warm-xl`, `bg-earth-500` accent — never plain `shadow-*`.
- Do NOT set `position` via custom utility classes in `index.css` (source-order gotcha); use Tailwind built-ins (`fixed`, `sticky`) directly.
- Tests run with `npx vitest run <path>` (bun is not on PATH). Do not gate on `npm run type-check` (verifies nothing) or `tsc -p tsconfig.app.json` (pre-existing ~438-error backlog); just don't add new errors in touched files.

---

### Task 1: `AssistantDock` positioning shell

**Files:**
- Create: `src/components/trip/ai-assistant/AssistantDock.tsx`
- Test: `src/components/trip/ai-assistant/AssistantDock.test.tsx`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `AssistantDock` default export, props `{ open: boolean; mode: 'docked' | 'overlay'; onOpen: () => void; children: React.ReactNode }`. Task 3 imports it directly from `./ai-assistant/AssistantDock` (intentionally NOT added to the barrel `index.ts`, so Task 3's test can mock the barrel while keeping the real dock).

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/ai-assistant/AssistantDock.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AssistantDock from './AssistantDock';

describe('AssistantDock', () => {
  it('renders children in the docked column when open in docked mode', () => {
    render(
      <AssistantDock open mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('lg:w-[42%]');
    expect(dock.className).not.toContain('fixed');
    expect(screen.queryByRole('button', { name: /open trip assistant/i })).not.toBeInTheDocument();
  });

  it('renders a fixed bottom-right overlay when open in overlay mode', () => {
    render(
      <AssistantDock open mode="overlay" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('fixed');
    expect(dock.className).toContain('z-40');
    expect(dock.className).not.toContain('lg:w-[42%]');
  });

  it('hides the wrapper but keeps children mounted when collapsed, and shows the floating button', () => {
    const onOpen = vi.fn();
    render(
      <AssistantDock open={false} mode="docked" onOpen={onOpen}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    // Children stay mounted (state preservation) — only CSS-hidden.
    expect(screen.getByTestId('panel')).toBeInTheDocument();
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    const fab = screen.getByRole('button', { name: /open trip assistant/i });
    fireEvent.click(fab);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('preserves the same child DOM node across collapse/expand and mode switches', () => {
    const { rerender } = render(
      <AssistantDock open mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    const node = screen.getByTestId('panel');
    rerender(
      <AssistantDock open={false} mode="docked" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    rerender(
      <AssistantDock open mode="overlay" onOpen={() => {}}>
        <div data-testid="panel" />
      </AssistantDock>
    );
    expect(screen.getByTestId('panel')).toBe(node);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/ai-assistant/AssistantDock.test.tsx`
Expected: FAIL — cannot resolve `./AssistantDock`.

- [ ] **Step 3: Write the implementation**

Create `src/components/trip/ai-assistant/AssistantDock.tsx`:

```tsx
import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssistantDockProps {
  open: boolean;
  mode: 'docked' | 'overlay';
  onOpen: () => void;
  children: React.ReactNode;
}

/**
 * Desktop-only (lg+) positioning shell for the Trip Assistant.
 * Children stay mounted across collapse/expand and mode switches so
 * panel-local state (streaming, extracted items) survives — visibility
 * is CSS-only, never a conditional unmount.
 */
const AssistantDock: React.FC<AssistantDockProps> = ({ open, mode, onOpen, children }) => {
  let wrapperClass = 'hidden';
  if (open) {
    wrapperClass =
      mode === 'docked'
        ? 'hidden lg:block lg:w-[42%] lg:pr-6 lg:pt-6'
        : 'hidden lg:block fixed bottom-6 right-6 z-40 w-[400px] max-w-[calc(100vw-3rem)]';
  }

  return (
    <>
      <div className={wrapperClass} data-testid="assistant-dock">
        {mode === 'docked' ? (
          <div
            className="sticky"
            style={{
              top: 'calc(var(--app-nav-h, 56px) + 0.5rem)',
              height: 'calc(100dvh - var(--app-nav-h, 56px) - 1rem)',
            }}
          >
            {children}
          </div>
        ) : (
          <div className="h-[min(70vh,640px)] rounded-card shadow-warm-xl">
            {children}
          </div>
        )}
      </div>

      {!open && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open Trip Assistant"
          className="hidden lg:flex fixed bottom-6 right-6 z-40 h-14 w-14 items-center justify-center rounded-full bg-earth-500 text-background shadow-warm-lg transition-transform hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </>
  );
};

export default AssistantDock;
```

Notes for the implementer:
- The sticky `top`/`height` styles are copied verbatim from the current assistant column in `TimelineView.tsx:309-314`; Task 3 deletes them there.
- Both mode branches render a `<div>` at the same child position, so React updates the element in place and the `children` subtree (the chat panel) keeps its DOM and state.
- `max-w-[calc(100vw-3rem)]` keeps the overlay inside the viewport on narrow lg screens.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/ai-assistant/AssistantDock.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/ai-assistant/AssistantDock.tsx src/components/trip/ai-assistant/AssistantDock.test.tsx
git commit -m "feat(assistant): add AssistantDock positioning shell for desktop collapse/overlay modes"
```

---

### Task 2: `AIAssistantPanel` — replace dead internal collapse with `onCollapse` prop

**Files:**
- Modify: `src/components/trip/ai-assistant/AIAssistantPanel.tsx`
- Test: `src/components/trip/ai-assistant/AIAssistantPanel.test.tsx` (new)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `AIAssistantPanelProps` becomes `{ tripId: string; onCollapse?: () => void }`. With `onCollapse` set, the header renders a chevron button (`aria-label="Collapse assistant"`) that calls it; without it, no collapse button renders (this is the `TripDetails.tsx` Chat-tab case — that file needs NO change). Panel content is always rendered.

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/ai-assistant/AIAssistantPanel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AIAssistantPanel from './AIAssistantPanel';

vi.mock('@/hooks/useAIAssistant', () => ({
  useAIAssistant: () => ({
    messages: [],
    isLoading: false,
    isStreaming: false,
    streamingContent: '',
    error: null,
    usage: undefined,
    hasMore: false,
    isLoadingMore: false,
    isAnonymous: false,
    historyLoaded: true,
    sendMessage: vi.fn(),
    clearThread: vi.fn(),
    loadMoreMessages: vi.fn(),
    loadHistory: vi.fn(),
  }),
}));

vi.mock('@/hooks/useDocumentExtraction', () => ({
  useDocumentExtraction: () => ({
    isExtracting: false,
    extractDocument: vi.fn(),
    updateItemStatus: vi.fn(),
    clearExtraction: vi.fn(),
  }),
}));

vi.mock('@/services/bulkImportService', () => ({ bulkImportItems: vi.fn() }));
vi.mock('@/services/placeCardAddService', () => ({
  addPlaceCardItem: vi.fn(),
  undoPlaceCardItem: vi.fn(),
}));

vi.mock('./ChatMessageList', () => ({ default: () => <div data-testid="message-list" /> }));
vi.mock('./ChatInput', () => ({ default: () => <div data-testid="chat-input" /> }));
vi.mock('./UsageMeter', () => ({ default: () => null }));
vi.mock('./PaywallModal', () => ({ default: () => null }));
vi.mock('./ItemStepperDialog', () => ({ default: () => null }));
vi.mock('./PromptChips', () => ({ default: () => null }));

const renderPanel = (props: { onCollapse?: () => void } = {}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AIAssistantPanel tripId="trip-1" {...props} />
    </QueryClientProvider>
  );
};

describe('AIAssistantPanel collapse button', () => {
  it('renders the collapse button and calls onCollapse when provided', () => {
    const onCollapse = vi.fn();
    renderPanel({ onCollapse });
    fireEvent.click(screen.getByRole('button', { name: 'Collapse assistant' }));
    expect(onCollapse).toHaveBeenCalledTimes(1);
  });

  it('renders no collapse button when onCollapse is absent', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Collapse assistant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expand assistant' })).not.toBeInTheDocument();
  });

  it('always renders the chat content (no internal collapsed state)', () => {
    renderPanel({ onCollapse: vi.fn() });
    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/ai-assistant/AIAssistantPanel.test.tsx`
Expected: FAIL — first test fails because clicking the current button toggles internal state instead of calling `onCollapse` (the prop doesn't exist yet; TypeScript will also flag the unknown prop).

- [ ] **Step 3: Modify the panel**

In `src/components/trip/ai-assistant/AIAssistantPanel.tsx`:

3a. Update imports (line 2) — drop `ChevronUp`:

```tsx
import { Sparkles, ChevronDown } from 'lucide-react';
```

3b. Update the props interface (lines 18-20):

```tsx
interface AIAssistantPanelProps {
  tripId: string;
  /** Renders a collapse button in the header when provided (desktop dock). */
  onCollapse?: () => void;
}
```

3c. Update the component signature (line 54):

```tsx
const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({ tripId, onCollapse }) => {
```

3d. Delete the internal collapse state (line 58):

```tsx
// DELETE this line:
const [isCollapsed, setIsCollapsed] = useState(false);
```

3e. Replace the header button (lines 298-311) with a conditional collapse button:

```tsx
{onCollapse && (
  <Button
    variant="ghost"
    size="icon"
    onClick={onCollapse}
    className="h-8 w-8 text-muted-foreground hover:text-foreground"
    title="Collapse"
    aria-label="Collapse assistant"
  >
    <ChevronDown className="w-4 h-4" />
  </Button>
)}
```

3f. Remove the `{!isCollapsed && (` wrapper around the content (line 315) and its closing `)}` (line 366), keeping the fragment `<>...</>` and everything inside it rendered unconditionally. The surrounding structure becomes:

```tsx
{/* Content — always rendered; visibility is the dock's job */}
<>
  {/* Messages area */}
  <ChatMessageList
    ...unchanged props...
  />

  {/* Error display */}
  {error && ( ...unchanged... )}

  {/* Usage meter */}
  <UsageMeter ...unchanged props... />

  {/* Input */}
  <ChatInput ...unchanged props... />
</>
```

(Only the `!isCollapsed &&` condition is removed — all child JSX stays byte-identical. The fragment may also be dropped entirely since it's no longer needed; either is fine.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/ai-assistant/AIAssistantPanel.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Verify no other usages break**

Run: `grep -rn "AIAssistantPanel" src --include="*.tsx" | grep -v ai-assistant/`
Expected: exactly two consumers — `src/pages/TripDetails.tsx` (Chat tab, no `onCollapse`, now correctly shows no dead button) and `src/components/trip/TimelineView.tsx` (updated in Task 3).

Run: `npx vitest run src/components/trip/ai-assistant`
Expected: PASS (Task 1 + Task 2 suites).

- [ ] **Step 6: Commit**

```bash
git add src/components/trip/ai-assistant/AIAssistantPanel.tsx src/components/trip/ai-assistant/AIAssistantPanel.test.tsx
git commit -m "feat(assistant): replace dead internal collapse with onCollapse prop"
```

---

### Task 3: `TimelineView` integration — full-width reflow + floating modes

**Files:**
- Modify: `src/components/trip/TimelineView.tsx`
- Test: `src/components/trip/TimelineView.test.tsx` (new)

**Interfaces:**
- Consumes: `AssistantDock` (Task 1) via `import AssistantDock from './ai-assistant/AssistantDock'`; `AIAssistantPanel` with `onCollapse` (Task 2).
- Produces: user-facing behavior; nothing downstream.

- [ ] **Step 1: Write the failing test**

Create `src/components/trip/TimelineView.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TimelineView from './TimelineView';

vi.mock('@/hooks/use-timeline-events', () => ({
  useTimelineEvents: () => ({ events: [], refreshEvents: vi.fn() }),
}));
vi.mock('@/hooks/use-trip-days', () => ({
  useTripDays: () => ({ days: [], refreshDays: vi.fn() }),
}));
vi.mock('@/hooks/use-transportation-events', () => ({
  useTransportationEvents: () => ({ transportationData: [], refreshTransportation: vi.fn() }),
}));
vi.mock('@/hooks/useSessionKeepAlive', () => ({ useSessionKeepAlive: vi.fn() }));
vi.mock('@/hooks/useWeather', () => ({ useWeather: () => ({ data: undefined }) }));
vi.mock('@/utils/googleMapsLoader', () => ({ loadGoogleMapsAPI: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));
vi.mock('./timeline/TimelineContent', () => ({
  default: () => <div data-testid="timeline-content" />,
}));
vi.mock('./timeline/ViewingStatusAvatars', () => ({ default: () => null }));
vi.mock('./ExportPdfButton', () => ({ default: () => null }));
vi.mock('./calendar/CalendarSyncSheet', () => ({ default: () => null }));
vi.mock('./calendar/TripCalendarView', () => ({
  default: () => <div data-testid="calendar-view" />,
}));
// Stub the panel via the barrel; the real AssistantDock (direct import) stays under test.
vi.mock('./ai-assistant', () => ({
  AIAssistantPanel: ({ onCollapse }: { onCollapse?: () => void }) => (
    <button type="button" onClick={onCollapse}>stub-collapse</button>
  ),
}));

const tripDates = { arrival_date: '2026-08-01', departure_date: '2026-08-07' };

const renderView = () =>
  render(<TimelineView tripId="trip-1" tripDates={tripDates} tripDestination="Kyoto" canEdit />);

describe('TimelineView assistant dock', () => {
  beforeEach(() => {
    (window as { gtag?: unknown }).gtag = vi.fn();
  });
  afterEach(() => {
    delete (window as { gtag?: unknown }).gtag;
  });

  it('defaults to open: docked column next to a 58% timeline, no floating button', () => {
    renderView();
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toContain('lg:w-[42%]');
    expect(screen.queryByRole('button', { name: /open trip assistant/i })).not.toBeInTheDocument();
  });

  it('collapse folds the assistant into a floating button and the timeline goes full width', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-full');
    expect(screen.getByTestId('itinerary-column').className).not.toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    expect(screen.getByRole('button', { name: /open trip assistant/i })).toBeInTheDocument();
  });

  it('the floating button restores the docked panel', () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    fireEvent.click(screen.getByRole('button', { name: /open trip assistant/i }));
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-[58%]');
    expect(screen.getByTestId('assistant-dock').className).toContain('lg:w-[42%]');
  });

  it('calendar view is always full width with the assistant as a fixed overlay', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(await screen.findByTestId('calendar-view')).toBeInTheDocument();
    expect(screen.getByTestId('itinerary-column').className).toContain('lg:w-full');
    const dock = screen.getByTestId('assistant-dock');
    expect(dock.className).toContain('fixed');
    expect(dock.className).toContain('z-40');
  });

  it('open state carries across view switches (open in calendar after collapsing + reopening in timeline)', async () => {
    renderView();
    fireEvent.click(screen.getByRole('button', { name: 'stub-collapse' }));
    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    await screen.findByTestId('calendar-view');
    // still collapsed after the switch
    expect(screen.getByTestId('assistant-dock').className).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: /open trip assistant/i }));
    expect(screen.getByTestId('assistant-dock').className).toContain('fixed');
  });
});
```

Note: the exact name `{ name: 'Calendar' }` targets the view toggle; a regex like `/calendar/i` would also match the "Add to calendar" button and make `getByRole` throw.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/trip/TimelineView.test.tsx`
Expected: FAIL — `itinerary-column` / `assistant-dock` test ids don't exist yet, and there is no collapse wiring.

- [ ] **Step 3: Modify `TimelineView.tsx`**

3a. Add the import (after the existing `./ai-assistant` import on line 20):

```tsx
import AssistantDock from './ai-assistant/AssistantDock';
```

3b. Add state next to `itineraryView` (line 63):

```tsx
const [itineraryView, setItineraryView] = useState<'timeline' | 'calendar'>('timeline');
// Desktop assistant visibility. Defaults open on every load (deliberately unpersisted).
const [assistantOpen, setAssistantOpen] = useState(true);
```

3c. Replace the main column's opening div (line 211):

```tsx
{/* Itinerary column: full width below lg; from lg+ 58% beside the docked
    assistant, full width when it's collapsed or floating over the calendar */}
<div
  data-testid="itinerary-column"
  className={`w-full px-0 sm:px-4 md:px-6 pt-4 md:pt-6 space-y-6 ${
    itineraryView === 'timeline' && assistantOpen ? 'lg:w-[58%]' : 'lg:w-full'
  }`}
>
```

3d. Replace the assistant column block (lines 307-318) — the old wrapper divs and their sticky styles move into `AssistantDock`:

```tsx
<AssistantDock
  open={assistantOpen}
  mode={itineraryView === 'calendar' ? 'overlay' : 'docked'}
  onOpen={() => setAssistantOpen(true)}
>
  <AIAssistantPanel tripId={tripId} onCollapse={() => setAssistantOpen(false)} />
</AssistantDock>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/trip/TimelineView.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the surrounding suites**

Run: `npx vitest run src/components/trip`
Expected: PASS — no regressions in calendar/booking/ai-assistant suites.

- [ ] **Step 6: Lint the touched files**

Run: `npx eslint src/components/trip/TimelineView.tsx src/components/trip/ai-assistant/AssistantDock.tsx src/components/trip/ai-assistant/AIAssistantPanel.tsx`
Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/trip/TimelineView.tsx src/components/trip/TimelineView.test.tsx
git commit -m "feat(assistant): collapse to floating button; full-width calendar with floating overlay panel"
```

---

### Task 4: Visual verification in the running app

**Files:** none (verification only).

**Interfaces:**
- Consumes: the complete feature from Tasks 1-3.
- Produces: confirmation evidence (screenshots) that the CSS modes render correctly — jsdom cannot verify sticky/fixed layering, stacking contexts, or the warm-shadow styling.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background) and wait for `http://localhost:8080` to respond.

- [ ] **Step 2: Verify desktop behaviors with Playwright MCP (viewport ≥ 1280px)**

On a trip's timeline page, check each of:
1. Default: timeline + docked assistant side by side (as before).
2. Click the header chevron → panel disappears, timeline stretches full width, round Sparkles button sits bottom-right.
3. Click the button → docked panel returns.
4. Switch to Calendar → calendar spans full width; assistant floats bottom-right above it (open by default if not collapsed), collapse works there too.
5. Open a Radix dialog (e.g. calendar sync) with the overlay open → dialog renders above the overlay.
6. Chat tab (`/trip/<id>/…` Chat view): no collapse chevron in the header.
7. Reload the page → assistant is open again (no persistence).

- [ ] **Step 3: Verify mobile is untouched**

Resize to 390px width: no floating button, no overlay; the bottom-nav AI trigger still opens the full-screen drawer.

- [ ] **Step 4: Screenshot evidence**

Capture: collapsed timeline with floating button; calendar with floating overlay panel. Report both to the user.
