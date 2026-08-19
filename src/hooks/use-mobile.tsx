import * as React from "react"

export const MOBILE_BREAKPOINT = 768

const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`
const COARSE_POINTER_QUERY = "(pointer: coarse)"

const supportsMatchMedia = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function"

const noop = (): void => undefined

/**
 * One `MediaQueryList` per distinct query, shared by every consumer.
 *
 * These hooks are called per timeline row, so a long itinerary would otherwise
 * open hundreds of identical subscriptions to answer the same question.
 */
const queryLists = new Map<string, MediaQueryList>()

const getQueryList = (query: string): MediaQueryList | null => {
  if (!supportsMatchMedia()) return null
  let mql = queryLists.get(query)
  if (!mql) {
    mql = window.matchMedia(query)
    queryLists.set(query, mql)
  }
  return mql
}

/**
 * `useSyncExternalStore` reads the match during render rather than in an effect,
 * so the first paint is already correct. Deciding this in an effect instead made
 * every consumer render the desktop branch once on a phone and then swap — a
 * visible layout jump, and for the map a second billable Dynamic Maps load.
 */
const useMediaQuery = (query: string): boolean => {
  const subscribe = React.useCallback(
    (onStoreChange: () => void): (() => void) => {
      const mql = getQueryList(query)
      if (!mql) return noop
      mql.addEventListener("change", onStoreChange)
      return (): void => mql.removeEventListener("change", onStoreChange)
    },
    [query]
  )

  const getSnapshot = React.useCallback(() => getQueryList(query)?.matches ?? false, [query])

  // Prerender (puppeteer) and any non-browser render fall back to the desktop
  // branch, matching the layout the crawler-facing HTML is generated at.
  const getServerSnapshot = React.useCallback(() => false, [])

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}

/**
 * True on touch-first devices (phones, tablets). Distinct from `useIsMobile`,
 * which is about available width — a touch laptop is wide but still coarse, and
 * a narrow desktop window is narrow but still precise. Use this to pick
 * interaction models (long-press vs. hover-revealed handles), not layout.
 */
export function useIsCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER_QUERY)
}
