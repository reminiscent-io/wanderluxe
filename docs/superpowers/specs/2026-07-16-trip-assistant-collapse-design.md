# Trip Assistant Collapse & Floating Modes (Desktop)

**Date:** 2026-07-16
**Status:** Approved
**Branch:** feat/trip-calendar-view (or successor)

## Problem

On desktop (`lg+`), the Trip Assistant renders as a sticky 42% column next to the
timeline (`src/components/trip/TimelineView.tsx`). Its collapse button
(`AIAssistantPanel.tsx`, internal `isCollapsed` state) only hides the panel's
internals — the header box and the 42% column remain, so collapsing accomplishes
nothing visually and the timeline never reclaims the width.

Additionally, the calendar itinerary view renders inside the 58% timeline column,
cramping a layout that wants the full page width.

## Decisions (user-confirmed)

1. **Collapse → floating button.** Collapsing the assistant folds it into a
   floating round button fixed at the bottom-right of the viewport. Clicking the
   button expands the assistant back to its current-mode surface.
2. **Calendar view = full width + floating overlay panel.** In calendar view the
   main column always spans the full width. The open assistant floats above the
   calendar bottom-right as an Intercom-style overlay panel with the full chat UI
   (not a slim input bar, not a docked column).
3. **No persistence.** `assistantOpen` defaults to `true` on every page load.
   Collapsing lasts only for the current visit; nothing is written to
   localStorage.

## Design

### State

- `TimelineView` owns `assistantOpen: boolean` (useState, default `true`).
- One flag carries across itinerary view switches: open in timeline → open
  (floating) in calendar, collapsed stays collapsed.
- `AIAssistantPanel`'s internal `isCollapsed` state and its expand/collapse
  branch are **removed**.
- `AIAssistantPanel` gains an optional prop `onCollapse?: () => void`:
  - Provided → header shows the chevron-down button which calls it.
  - Absent → the header button is not rendered. This applies to the Chat tab in
    `TripDetails.tsx`, where collapsing is meaningless (fixes the same
    dead-collapse behavior there).

### Rendering strategy: single mounted panel, CSS-repositioned

The panel holds local state that must survive collapse/expand and view switches:
in-flight streaming (`useAIAssistant`) and `extractionMessages` (document
extraction results exist only in component state). Therefore the panel is
mounted **once** in `TimelineView` inside a single wrapper element whose classes
switch by mode — never remounted in a different DOM position:

| Mode | Wrapper styling |
| --- | --- |
| Timeline + open | Current behavior: `lg:block lg:w-[42%]` column, sticky, `top/height` from `--app-nav-h` (unchanged) |
| Calendar + open | `fixed` overlay bottom-right: `bottom-6 right-6 w-[400px] h-[min(70vh,640px)] z-40`, same card chrome (`rounded-card shadow-warm-*`) |
| Collapsed (either view) | Wrapper `hidden`; floating button rendered |

The wrapper stays the same React element so the subtree is preserved.
The whole feature is `lg+` only — below `lg` the wrapper remains hidden and the
existing mobile `AIAssistantDrawer` + bottom-nav trigger are untouched.

### Main column width

- Timeline view: `lg:w-[58%]` when `assistantOpen`, `lg:w-full` when collapsed.
- Calendar view: always `lg:w-full` (assistant never occupies layout space).

### Floating button

- 56px (`h-14 w-14`) round button, Sparkles icon, warm accent background
  (earth/sunset per design system), `shadow-warm-lg`, subtle hover scale.
- `fixed bottom-6 right-6 z-40`, `hidden lg:flex` so it never collides with the
  mobile bottom nav.
- `aria-label="Open Trip Assistant"`; click sets `assistantOpen = true`.
- Rendered only when `assistantOpen === false` (both itinerary views).

### Z-index / stacking

Overlay panel and button sit at `z-40` — above page content, below modals and
dialogs (Radix portals). Verify no clash with the sticky app nav.

## Error handling

No new failure surface: chat/extraction error handling stays inside
`AIAssistantPanel`. Collapse during streaming is allowed (state survives because
the panel stays mounted); the mobile drawer's block-close-while-streaming
behavior is unchanged.

## Testing

Extend existing component tests (Vitest):

- Chevron collapse hides the panel and shows the floating button; clicking the
  button restores the panel.
- Timeline column drops the width cap when collapsed.
- Calendar view renders the main column full width, with the panel as a fixed
  overlay when open.
- `AIAssistantPanel` without `onCollapse` renders no header collapse button.
- Panel-local state survives a collapse/expand cycle (same instance assertion or
  state-preservation test).

## Out of scope

- Mobile behavior (`AIAssistantDrawer`, bottom nav) — unchanged.
- Persistence of open state — explicitly rejected.
- Unread-message badge on the floating button — possible follow-up.
