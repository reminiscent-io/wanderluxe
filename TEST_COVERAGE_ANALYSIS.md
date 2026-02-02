# Test Coverage Analysis - WanderLuxe

## Executive Summary

WanderLuxe currently has **minimal test coverage**. Only **4 test files** exist covering a small subset of utility functions and services. The vast majority of the codebase - including critical business logic, all components, all pages, and most hooks - remains untested.

### Current Coverage at a Glance

| Category | Files | Tested | Coverage |
|----------|-------|--------|----------|
| Services | 8 | 1 | 12.5% |
| Hooks | 14 | 0 | 0% |
| Utils | 16 | 2 | 12.5% |
| Contexts | ~2 | 1 | 50% |
| Components | 100+ | 0 | 0% |
| Pages | 15 | 0 | 0% |

---

## What's Currently Tested

### 1. `src/services/travelers.test.ts` (289 lines)
**Good coverage for:**
- `listTravelers()` - fetching and normalizing travelers
- `upsertTraveler()` - creating/updating travelers
- `deleteTraveler()` - removing travelers
- `getAccommodationTravelerIds()`, `setAccommodationTravelers()`
- `getTransportationTravelerIds()`, `setTransportationTravelers()`
- `getDayActivityTravelerIds()`, `setDayActivityTravelers()`
- `getReservationTravelerIds()`, `setReservationTravelers()`
- Permission normalization (`'EDIT'` → `'edit'`, `'VIEW'` → `'read'`)

**Quality:** Well-structured with good edge case coverage (empty arrays, errors, authentication)

### 2. `src/utils/dateUtils.test.ts` (124 lines)
**Good coverage for:**
- `formatDate()` - date string formatting
- `formatToTime()` - time formatting with AM/PM
- `getDaysBetweenDates()` - generating date ranges
- `calculateDurationInDays()` - computing trip duration
- `formatDateRange()` - smart date range display

**Quality:** Good boundary tests (month/year boundaries, null handling)

### 3. `src/utils/costUtils.test.ts` (125 lines)
**Good coverage for:**
- `formatCost()` - formatting numbers to currency strings
- `parseCost()` - parsing currency strings to numbers
- `isValidCost()` - validation
- `formatCostWithCurrency()` - internationalized formatting

**Quality:** Solid coverage including edge cases and known limitations documented

### 4. `src/contexts/AuthContext.test.tsx` (512 lines)
**Good coverage for:**
- Initial state handling
- Session loading on mount
- Profile management (fetch, create, subscription tier)
- Auth state changes (sign in/out)
- Session refresh (20-minute interval)
- Visibility change handling (tab focus)
- Cleanup on unmount

**Quality:** Excellent - comprehensive React Testing Library tests with proper async handling

---

## Critical Testing Gaps

### HIGH PRIORITY: Untested Services

#### 1. `tripDaysService.ts`
**Risk Level:** HIGH
**Why:** Core trip functionality - creates trip days when dates change
```typescript
// Function that should be tested:
createTripDays(tripId: string, dates: string[])
```
**Suggested Tests:**
- Creating days for new trip
- Handling duplicate dates (idempotency)
- Error handling for database failures
- Empty date array handling

#### 2. `tripSharingService.ts`
**Risk Level:** HIGH
**Why:** Collaboration feature - controls who can access trips
**Suggested Tests:**
- Sharing a trip with another user
- Permission level enforcement (view vs edit)
- Revoking access
- Duplicate share handling

#### 3. `pdfmake-export.ts` (1,210 lines)
**Risk Level:** HIGH
**Why:** Complex business logic, user-facing feature, large file
**Suggested Tests:**
- Document structure generation
- Data aggregation for trips with various entities
- Handling missing/null data gracefully
- Currency formatting in PDF
- Date formatting across timezones

#### 4. `bulkImportService.ts`
**Risk Level:** MEDIUM-HIGH
**Why:** Data integrity - imports external data
**Suggested Tests:**
- Parsing various input formats
- Validation of imported data
- Handling malformed data
- Transaction rollback on partial failures

#### 5. `engagementService.ts`
**Risk Level:** MEDIUM
**Suggested Tests:**
- Tracking user actions
- Analytics data aggregation

#### 6. `contactsService.ts`
**Risk Level:** MEDIUM
**Suggested Tests:**
- CRUD operations
- Contact validation

---

### HIGH PRIORITY: Untested Custom Hooks

#### 1. `useSidebarState.ts` (799 lines)
**Risk Level:** CRITICAL
**Why:** Manages ~40 state variables, controls entire sidebar UI
**Suggested Tests:**
- State initialization
- Dialog open/close sequences
- Panel switching logic
- Reset functionality
- Event handlers
- State persistence

#### 2. `useChat.ts`
**Risk Level:** HIGH
**Why:** Real-time chat with AI - complex async behavior
**Suggested Tests:**
- Message sending/receiving
- Real-time subscription setup
- Error handling
- Loading states
- Message history pagination

#### 3. `useAIAssistant.ts`
**Risk Level:** HIGH
**Why:** AI integration with streaming responses
**Suggested Tests:**
- Prompt submission
- Streaming response handling
- Error states
- Usage limit enforcement

#### 4. `useTravelers.ts`
**Risk Level:** HIGH
**Why:** Real-time collaboration - already has service tests, needs hook tests
**Suggested Tests:**
- Initial data fetching
- Real-time updates via subscription
- Cache invalidation
- Error state handling

#### 5. `useSessionKeepAlive.ts`
**Risk Level:** MEDIUM-HIGH
**Why:** Security feature - token refresh
**Suggested Tests:**
- Timer-based refresh
- Visibility change handling
- Network error recovery

#### 6. Other Untested Hooks
- `useWeather.ts` - External API integration
- `useTravelStats.ts` - Data aggregation
- `useDocumentExtraction.ts` - File parsing
- `useTripViewingStatus.ts` - Presence system
- `usePWAInstall.ts` - PWA prompt handling
- `useAdminMetrics.ts` - Admin dashboard data
- `useIsAdmin.ts` - Authorization
- `useVisualViewport.ts` - Mobile keyboard handling

---

### HIGH PRIORITY: Untested Utils

#### 1. `transportationUtils.ts`
**Risk Level:** MEDIUM-HIGH
**Why:** Used throughout the app for display
**Suggested Tests:**
- `formatTransportationType()` - all transportation types
- `getTransportationIcon()` - icon mapping
- `getTransportationColor()` - CSS class mapping
- Unknown/null type handling

#### 2. `itineraryUtils.ts`
**Risk Level:** HIGH
**Why:** Core trip display logic
**Suggested Tests:**
- Itinerary generation
- Event sorting
- Time slot calculations

#### 3. `timeline.ts`
**Risk Level:** HIGH
**Why:** Complex timeline calculations
**Suggested Tests:**
- Event positioning
- Overlap detection
- Time range calculations

#### 4. `phoneUtils.ts`
**Risk Level:** MEDIUM
**Why:** User input validation
**Suggested Tests:**
- International phone number parsing
- Formatting for display
- Validation rules

#### 5. `formatDateRange.ts`
**Risk Level:** LOW (may duplicate dateUtils)
**Why:** Potential redundancy with tested dateUtils

#### 6. Other Untested Utils
- `storageUtils.ts` - Local storage helpers
- `queryKeys.ts` - React Query key generation
- `sidebarUtils.ts` - Sidebar helper functions
- `googleMapsLoader.ts` - Google Maps API loading
- `placePhotoCache.ts` - Image caching
- `currencyConstants.ts` - Currency definitions
- `env.ts` - Environment variable access

---

### MEDIUM PRIORITY: Component Testing

No components are currently tested. Priority should be given to:

#### Form Components (Business Logic Heavy)
1. `AccommodationForm.tsx` - Hotel booking forms
2. `TransportationForm.tsx` - Flight/train forms
3. `ActivityForm.tsx` - Activity scheduling
4. `TravelerDialog.tsx` - Adding collaborators

#### Display Components (User-Facing)
1. `TripCard.tsx` - Trip list display
2. `TimelineContent.tsx` - Itinerary view
3. `BudgetSummary.tsx` - Financial overview
4. `ChatMessage.tsx` - AI chat display

#### Critical UI Components
1. `AccommodationDialog.tsx` - Modal workflows
2. `TransportationDialog.tsx` - Modal workflows
3. `ActivityDialog.tsx` - Modal workflows
4. `PdfExportDialog.tsx` - Export flow

---

### LOW PRIORITY: Page-Level Tests

Integration/E2E tests would be more valuable for pages, but unit tests could cover:

1. `TripDetails.tsx` - Route switching logic
2. `MyTrips.tsx` - Trip list filtering/sorting
3. `Budget.tsx` - Budget calculations
4. `CreateTrip.tsx` - Form validation

---

## Recommended Test Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal:** Cover critical business logic

1. **`transportationUtils.test.ts`** - Simple, high-value
2. **`tripDaysService.test.ts`** - Core trip functionality
3. **`itineraryUtils.test.ts`** - Display logic

### Phase 2: Services (Week 3-4)
**Goal:** Cover all services

4. **`tripSharingService.test.ts`** - Collaboration
5. **`bulkImportService.test.ts`** - Data import
6. **`pdfmake-export.test.ts`** - PDF generation (can be partial)

### Phase 3: Hooks (Week 5-6)
**Goal:** Cover complex state management

7. **`useTravelers.test.ts`** - Real-time hook pattern
8. **`useChat.test.ts`** - Async streaming
9. **`useSidebarState.test.ts`** - Complex UI state

### Phase 4: Components (Week 7-8)
**Goal:** Cover form components

10. Form components with validation logic
11. Dialog components with workflows
12. Display components with data transformation

### Phase 5: Integration (Ongoing)
**Goal:** End-to-end workflows

13. Consider Playwright/Cypress for E2E tests
14. API integration tests for Supabase edge functions

---

## Testing Patterns to Adopt

### 1. Supabase Mocking Pattern
Already established in `src/test/mocks/supabase.ts` - use this consistently:
```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      // ... other methods
    }),
  },
}));
```

### 2. React Query Hook Testing
Use `@tanstack/react-query` test utilities:
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);
```

### 3. Real-time Subscription Testing
Mock Supabase channels:
```typescript
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
};
vi.mocked(supabase.channel).mockReturnValue(mockChannel);
```

### 4. Component Testing
Use React Testing Library with user-event:
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('form submission', async () => {
  const user = userEvent.setup();
  render(<MyForm />);
  await user.type(screen.getByLabelText(/name/i), 'Test');
  await user.click(screen.getByRole('button', { name: /submit/i }));
});
```

---

## Metrics & Goals

### Short-term Goals (30 days)
- Achieve 30% coverage on services
- Achieve 50% coverage on utils
- Add at least 3 hook tests

### Medium-term Goals (90 days)
- Achieve 60% overall coverage
- All services tested
- All critical hooks tested
- Key form components tested

### Long-term Goals (180 days)
- Achieve 80% overall coverage
- E2E test suite in place
- All new code requires tests (CI enforcement)

---

## Infrastructure Recommendations

1. **Add Coverage Threshold to CI**
   ```json
   // vitest.config.ts
   coverage: {
     statements: 50,
     branches: 50,
     functions: 50,
     lines: 50,
   }
   ```

2. **Pre-commit Hooks**
   Consider adding husky + lint-staged to run tests on changed files

3. **Coverage Reporting**
   Add Codecov or similar for PR coverage diffs

4. **Test File Colocation**
   Continue placing `.test.ts` files alongside source files

---

## Conclusion

WanderLuxe has a solid testing foundation with well-written existing tests, proper mocking patterns, and good test infrastructure. However, the coverage is extremely sparse. The priority should be:

1. **Immediately:** Test untested utils (quick wins)
2. **This sprint:** Test core services (tripDaysService, tripSharingService)
3. **Next sprint:** Test complex hooks (useSidebarState, useChat)
4. **Ongoing:** Add component tests and consider E2E testing

The existing test patterns are good - they just need to be applied more broadly across the codebase.
