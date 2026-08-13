# SonarQube Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass the SonarCloud quality gate for `reminiscent-io_wanderluxe` and burn down the backlog of 36 critical+ open issues plus 8 unreviewed security hotspots, in priority order.

**Architecture:** Two parallel tracks. Track A is *triage* — one-shot SonarQube MCP calls that mark false-positive / safe / won't-fix without code changes (this alone flips two of three failing gate conditions). Track B is *real fixes* — small focused commits that genuinely lower complexity, improve typing, or close real risk in code.

**Tech Stack:** SonarQube MCP server (`mcp__sonarqube__*`), TypeScript/React 19, Vitest, ESLint, the existing project codebase.

**Pre-flight notes for the executor:**
- Current quality-gate failures: `new_reliability_rating=4` (driven by 1 BLOCKER), `new_duplicated_lines_density=4.2%` (limit 3%), `new_security_hotspots_reviewed=12.5%` (need 100%).
- The `type-check-address` branch has many unstaged changes already. Before starting Track B (real code edits), check `git status` and either commit or stash existing work so each task lands as a clean focused commit.
- All MCP triage calls require the SonarQube MCP server to be loaded. Tool names appear under `mcp__sonarqube__` once loaded via `ToolSearch`.
- Project key everywhere: `reminiscent-io_wanderluxe`.
- Not everything in this plan needs to ship in one PR. Phase 1 (triage) is its own PR. Phase 4 / Phase 5 each pick one function and ship as a separate PR.

---

## Phase 1: Hotspot & Issue Triage (~15 min, no code changes)

Goal: clear two of three failing quality-gate conditions by marking known false positives. Each step is one MCP call.

### Task 1: Mark the BLOCKER bug in `public/sw.js` as Won't Fix

**Files:**
- Reference only: [public/sw.js:42-45](public/sw.js#L42-L45)

**Why this is a false positive:** The `fetch` event handler uses early `return` to skip non-GET requests and external origins — this is the textbook service-worker pattern. The handler's job is to call `event.respondWith(...)` as a side effect, not to return a value. SonarQube's `S3516 "function always returns the same value"` rule does not understand the SW event-handler contract.

- [ ] **Step 1: Add an explanatory comment to the issue**

Tool: `mcp__sonarqube__addCommentToIssue`
Args:
- `issue_key`: `AZrBh2DpElQpyrulH3Xv`
- `text`: `Service-worker fetch handler. Early returns are intentional skip-cases; the handler's effect is event.respondWith(...), not its return value. S3516 doesn't model SW event-handler semantics. Marking won't fix.`

Expected: comment appears on the issue.

- [ ] **Step 2: Mark as Won't Fix**

Tool: `mcp__sonarqube__markIssueWontFix`
Args:
- `issue_key`: `AZrBh2DpElQpyrulH3Xv`
- `comment`: `SW fetch handler — early returns are intentional. False positive against the SW pattern.`

Expected: tool returns success; quality gate's `new_reliability_rating` should drop to 1 on next analysis.

---

### Task 2: Mark the 4 ReDoS hotspots as Safe

All four flag the same email-validation regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Each character class excludes whitespace and `@`, so they cannot overlap — no nested-quantifier backtracking is possible. This is a SonarQube false-positive pattern that's been documented upstream for years.

Hotspot keys:
- `AZvjfrImkMOdTevuj093` — [server/routes/ai-chat.ts:360](server/routes/ai-chat.ts#L360)
- `AZoJI3LJrYpZhVWlkLhi` — [src/components/trip/ShareTripDialog.tsx:49](src/components/trip/ShareTripDialog.tsx#L49)
- `AZv18S8KUFY_jNLCC6jm` — [src/pages/Profile.tsx:76](src/pages/Profile.tsx#L76)
- `AZn9x7eH2dvTjDwPQs_0` — [supabase/functions/send-email/index.ts:16](supabase/functions/send-email/index.ts#L16)

- [ ] **Step 1: Mark `ai-chat.ts:360` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZvjfrImkMOdTevuj093`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Regex /` + "`{1,3}(c(r(e(...)?)?)?$" + `/ has only nested optional literal characters with no quantifier-on-class — linear time, no catastrophic backtracking. Safe.`

Note: The ai-chat.ts:360 hotspot is actually on the partial-marker regex `PARTIAL_MARKER_RE`, not the email regex. Read the line first to confirm; the analysis still holds (no overlapping repeated classes).

- [ ] **Step 2: Mark `ShareTripDialog.tsx` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZoJI3LJrYpZhVWlkLhi`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Email regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ — character classes exclude \s and @, no overlap, linear time. Safe.`

- [ ] **Step 3: Mark `Profile.tsx` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZv18S8KUFY_jNLCC6jm`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Email regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ — same regex as ShareTripDialog. Linear, no backtracking. Safe.`

- [ ] **Step 4: Mark `send-email/index.ts` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZn9x7eH2dvTjDwPQs_0`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Email regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ — character classes exclude \s and @, plus a CRLF guard. No backtracking. Safe.`

---

### Task 3: Mark the stale `noopener` hotspot as Safe

The flagged file already has `rel="noopener noreferrer sponsored"` at [src/components/trip/BookingView.tsx:111](src/components/trip/BookingView.tsx#L111). The hotspot's text-range pointer is stale.

- [ ] **Step 1: Mark Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZilups_A5P4kbAU9QM7`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Stale hotspot — the only target="_blank" in this file is at line 110 with rel="noopener noreferrer sponsored". Already mitigated.`

---

### Task 4: Mark the weak-crypto hotspot in shadcn/ui sidebar as Safe

`src/components/ui/sidebar.tsx:663` uses `Math.random()` to generate cosmetic skeleton-loader widths in vendor shadcn/ui code. Not security-relevant.

- [ ] **Step 1: Mark Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZVslbbDDnG7ZCffSk47`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Vendor shadcn/ui skeleton component using Math.random() to vary loader-bar widths. Cosmetic only, no security context.`

---

### Task 5: Properly review the 2 CORS hotspots, then mark Safe

These need a real (brief) review, not auto-dismissal.

- [ ] **Step 1: Verify production CORS is scoped**

Read [server/index.ts:16-35](server/index.ts#L16-L35). Confirm:
- `allowedOrigins` reads from `ALLOWED_ORIGINS` env var with sensible localhost dev defaults.
- `allowedOriginPatterns` restricts to `*.replit.dev`, `*.repl.co`, `wanderluxe.io`.
- The wildcard `(origin, callback) => callback(null, true)` only fires when `NODE_ENV !== 'production'`.
- `credentials: true` is paired with explicit allow-list (not `*`).

Expected: configuration is sound; the hotspot's "make sure CORS is safe" warning is satisfied.

- [ ] **Step 2: Verify dev-server CORS is dev-only**

Read [server/dev-server.ts:1-15](server/dev-server.ts#L1-L15). Confirm `app.use(cors())` is only used in the dev-server entry point (Vite middleware mode), not the production server. Confirm the file is not imported from `server/index.ts`.

Run: `grep -rn "dev-server" server/ src/ vite.config.ts`
Expected: only referenced from dev tooling and `package.json`'s `dev:server` script.

- [ ] **Step 3: Mark `server/index.ts` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZbvlw1aYa1G_XRDILiP`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Production CORS uses an allow-list (ALLOWED_ORIGINS env + replit/wanderluxe.io patterns) with credentials=true. Wildcard fallback gated on NODE_ENV !== 'production'. Reviewed and accepted.`

- [ ] **Step 4: Mark `server/dev-server.ts` Safe**

Tool: `mcp__sonarqube__update_hotspot_status`
Args:
- `hotspot_key`: `AZvX40kh1nqMkAuXyzTg`
- `status`: `REVIEWED`
- `resolution`: `SAFE`
- `comment`: `Dev-only Vite-middleware server. Open CORS is intentional for local development; not used in production builds.`

---

### Task 6: Mark the 5 PL/SQL string-duplication issues in migrations as Won't Fix

Migration files are immutable historical records. Refactoring them to extract constants would either rewrite history or pollute the live schema with unused PL/SQL constants.

Issue keys:
- `AZvzIzHbjVQihlc3gJC8`
- `AZvxxpPmkWn7WrlPuAsq`
- `AZvxxpPzkWn7WrlPuAsz`
- `AZvnTqkGDGw5MlN0DhIL`
- `AZvd-6LPmtn06y5TLSnG`

- [ ] **Step 1: Bulk-mark as Won't Fix**

Tool: `mcp__sonarqube__markIssuesWontFix`
Args:
- `issue_keys`: `["AZvzIzHbjVQihlc3gJC8", "AZvxxpPmkWn7WrlPuAsq", "AZvxxpPzkWn7WrlPuAsz", "AZvnTqkGDGw5MlN0DhIL", "AZvd-6LPmtn06y5TLSnG"]`
- `comment`: `Supabase migration files are immutable history. We do not refactor applied migrations.`

Expected: all 5 issues resolved with `WONTFIX` status.

---

### Task 7: Phase-1 verification

- [ ] **Step 1: Re-fetch the quality gate status**

Tool: `mcp__sonarqube__quality_gate_status`
Args: `project_key: "reminiscent-io_wanderluxe"`

Expected:
- `new_reliability_rating` → status `OK` (was `ERROR`).
- `new_security_hotspots_reviewed` → status `OK`, value `100`.
- `new_duplicated_lines_density` → still `ERROR` (Phase 3 addresses this).

- [ ] **Step 2: Re-fetch open critical+ issue count**

Tool: `mcp__sonarqube__issues`
Args:
- `projects`: `["reminiscent-io_wanderluxe"]`
- `severities`: `["BLOCKER", "CRITICAL"]`
- `statuses`: `["OPEN", "CONFIRMED", "REOPENED"]`
- `page_size`: `1`

Expected: `paging.total` drops from 37 to 31 (1 BLOCKER + 5 PL/SQL all marked).

---

## Phase 2: Quick code wins (~10 min)

### Task 8: Fix the always-`any` intersection type in `timeline-utils.ts`

**Files:**
- Modify: `src/components/trip/day/components/timeline-utils.ts:16`

The `Record<string, unknown> & { __depart_time_on_this_day?: string; __arrive_time_on_this_day?: string }` intersection collapses to `any` in TS because `unknown` and a partial-string are incompatible at the property level. The fix is to drop the index signature in favor of named optional properties (the rule `S4335` calls this out as misuse).

- [ ] **Step 1: Read the surrounding type to understand callers**

Read [src/components/trip/day/components/timeline-utils.ts:1-50](src/components/trip/day/components/timeline-utils.ts#L1-L50).
Note every property accessed via the `data?` field elsewhere in the file (`grep -n 'data?\.' src/components/trip/day/components/timeline-utils.ts` and downstream files).

- [ ] **Step 2: Replace the broken intersection**

Edit [src/components/trip/day/components/timeline-utils.ts:16-19](src/components/trip/day/components/timeline-utils.ts#L16-L19). Replace:

```ts
data?: Record<string, unknown> & {
  __depart_time_on_this_day?: string;
  __arrive_time_on_this_day?: string;
};
```

With a named interface declared next to the parent type:

```ts
export interface TimelineRowData {
  __depart_time_on_this_day?: string;
  __arrive_time_on_this_day?: string;
  [key: string]: unknown;
}
```

And change the property to `data?: TimelineRowData;`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors. If callers spread arbitrary keys onto `data`, the index signature accepts them. If callers only use the two named keys, the index signature is harmless.

- [ ] **Step 4: Lint**

Run: `npx eslint src/components/trip/day/components/timeline-utils.ts`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/trip/day/components/timeline-utils.ts
git commit -m "fix(timeline): replace always-any intersection with named TimelineRowData interface"
```

---

## Phase 3: Investigate and fix new-code duplication (gate-blocking)

### Task 9: Identify what's contributing to the 4.2% new-duplication

Without this, we don't know which files to deduplicate.

- [ ] **Step 1: Pull duplication metrics for the project**

Tool: `mcp__sonarqube__measures_component`
Args:
- `component`: `reminiscent-io_wanderluxe`
- `metric_keys`: `["new_duplicated_lines", "new_duplicated_blocks", "new_duplicated_lines_density", "duplicated_files"]`
- `additional_fields`: `["periods"]`

- [ ] **Step 2: Pull duplication-density per file (top 20)**

Tool: `mcp__sonarqube__issues`
Args:
- `projects`: `["reminiscent-io_wanderluxe"]`
- `rules`: `["common-ts:DuplicatedBlocks", "common-js:DuplicatedBlocks"]`
- `in_new_code_period`: `true`
- `facets`: `["files"]`
- `page_size`: `50`

Note: if `common-*:DuplicatedBlocks` returns nothing, fall back to fetching the project tree:

Tool: `mcp__sonarqube__components`
Args (only the relevant ones the schema accepts):
- `component`: `reminiscent-io_wanderluxe`
- `metric_keys`: `["new_duplicated_lines_density"]`
- sort by metric desc

Expected: a list of 1–5 files responsible for most of the new duplication.

- [ ] **Step 3: Decide remediation strategy**

Three legitimate outcomes — pick based on what the data shows:

1. **Real duplication** (e.g. two near-identical components copy-pasted): extract a shared helper. Add a Task 10 to this plan with the specific extraction.
2. **Acceptable duplication** (e.g. two SQL migrations with similar boilerplate, or test fixtures): mark the duplication issues as Won't Fix with a comment.
3. **Quality-gate threshold misconfigured**: if `new_duplicated_lines_density=4.2%` is being driven by ~1% of legitimate duplication on a small "new code" base, consider raising the gate threshold to 5% in SonarCloud project admin (a separate config-only change).

Document the decision in this plan's commit message and proceed accordingly.

- [ ] **Step 4: Execute the chosen strategy and commit**

If extraction: write the helper, add tests, replace duplicates, run `npx tsc --noEmit && npx vitest run && npx eslint .`, commit.
If mark-as-wontfix: bulk MCP call, no code change.
If gate threshold: adjust in SonarCloud UI, document in commit message.

```bash
git add <files>
git commit -m "<scope>: address new-code duplication (path A/B/C)"
```

---

## Phase 4: Cognitive-complexity refactors (one function per task, separate PRs)

Goal: lower the 27 `S3776` issues. Each task picks one function, lowers complexity below 15, ships as its own commit so reviewers see one focused diff. Order is by ROI: highest complexity, hottest path, in code we own (skip vendor and migrations). Do **not** batch these into a single PR.

For each refactor task, the recipe is the same: read → identify → extract → verify. Steps below are written generically — substitute the function and file per task header.

**Generic refactor recipe (apply to each function in this phase):**

- [ ] **R1: Read the full function**

Read the entire function (start line ± 200 lines). Note:
- nested branches (each `if`, `else`, ternary, `&&`, `||`, `for`, `while`, `try/catch`, `switch case`)
- variables that are assigned-then-read inside one branch only (extraction candidates)
- repeated subtrees (extraction targets)

- [ ] **R2: Identify the cheapest 1–3 extractions**

A pure helper that takes 1–3 args and returns one value is the gold standard. Aim for 2–3 small named helpers, not one huge helper. Each extracted helper drops complexity by ~3–5 points.

- [ ] **R3: Check for existing tests**

Run: `find . -path ./node_modules -prune -o -name "*.test.ts*" -print | xargs grep -l "<functionOrSymbolName>"`

If the function has no tests, write one happy-path test before refactoring (TDD-light — protects against regression). If tests exist, run them now to verify they pass before touching the code.

- [ ] **R4: Extract the helpers, one at a time**

After each extraction:
- Run `npx tsc --noEmit` (must stay clean).
- Run `npx vitest run <related-test-paths>` (must stay green).

- [ ] **R5: Verify complexity reduced**

Either re-run the SonarCloud scan locally (if the executor can) or wait for the next CI scan. The MCP query for verification:

Tool: `mcp__sonarqube__issues`
Args:
- `projects`: `["reminiscent-io_wanderluxe"]`
- `rules`: `["typescript:S3776"]`
- `files`: `["<the file you refactored>"]`

Expected: the offending issue is resolved or reports a complexity below 15.

- [ ] **R6: Commit**

```bash
git add <files>
git commit -m "refactor(<scope>): reduce cognitive complexity of <fn> from <X> to <Y>"
```

---

### Task 10: Refactor `supabase/functions/ai-chat/index.ts:10` (complexity 51 → ≤15)

**Files:**
- Modify: `supabase/functions/ai-chat/index.ts` (the top-level `serve()` handler beginning at line 10)

This is the single highest-complexity function in the codebase, in the AI chat hot path. Likely extractions: request validation, message-history loading, system-prompt assembly, streaming-response setup, error mapping. Apply recipe R1–R6.

Hint when reading: the function is also the entry point for `find_place` + `search_web` function-calling, so factor those out into a `handleToolCall(toolName, args, ctx)` helper if they're inlined.

---

### Task 11: Refactor `src/components/trip/day/components/useDayTimeline.ts:93` (complexity 47 → ≤15)

**Files:**
- Modify: `src/components/trip/day/components/useDayTimeline.ts`

Hot path used on every trip-detail render. Likely extractions: row-merging logic, hint-detection (layover / free-time / overlap), grouping by time. The codebase already has a sibling `timeline-utils.ts` — strongly prefer adding pure helpers there rather than inside the hook file. Apply recipe R1–R6.

---

### Task 12: Refactor `src/components/trip/ai-assistant/ExtractedItemCard.tsx:45` (complexity 44 → ≤15)

**Files:**
- Modify: `src/components/trip/ai-assistant/ExtractedItemCard.tsx`

Likely extractions: per-type render branches (accommodation / activity / transportation / dining) into typed sub-components or a render map. Apply recipe R1–R6.

---

### Task 13: Refactor `server/routes/stripe.ts:194` (complexity 42 → ≤15)

**Files:**
- Modify: `server/routes/stripe.ts`

This is risky surface area (webhook). Read the surrounding webhook-event switch carefully, check `STRIPE_WEBHOOK_SECRET` verification stays in place, and write at least one test (against a fixture event) before refactoring. Likely extractions: per-event handlers (`checkout.session.completed`, `customer.subscription.updated`, etc.) into a dispatch map. Apply recipe R1–R6 with extra care on R3.

---

### Task 14: Refactor `server/routes/ai-chat.ts:625` (complexity 40 → ≤15)

**Files:**
- Modify: `server/routes/ai-chat.ts`

Likely the SSE-streaming reducer. Likely extractions: the partial-marker buffer, the JSON-frame extractor, the suppression state machine. Each is a candidate for a small named state object with `feed(chunk)` and `flush()` methods. Apply recipe R1–R6.

---

### Task 15 (optional cleanup): Remaining 22 `S3776` issues

The remaining 22 functions fall in the 16–28 complexity range — each is 6–24 minutes of effort. Address them opportunistically when next touching the file. Do **not** create a single mega-PR. To track them:

- [ ] **Step 1: Pull the up-to-date list**

Tool: `mcp__sonarqube__issues`
Args:
- `projects`: `["reminiscent-io_wanderluxe"]`
- `rules`: `["typescript:S3776"]`
- `severities`: `["CRITICAL"]`
- `statuses`: `["OPEN", "CONFIRMED", "REOPENED"]`
- `s`: `FILE_LINE`
- `asc`: `true`
- `page_size`: `50`

Save the list to `docs/superpowers/plans/2026-05-04-sonarqube-complexity-backlog.md` for ongoing reference.

---

## Final verification

### Task 16: Confirm the quality gate is green

- [ ] **Step 1: Re-fetch the quality gate**

Tool: `mcp__sonarqube__quality_gate_status`
Args: `project_key: "reminiscent-io_wanderluxe"`

Expected: `projectStatus.status: "OK"`. All three conditions report `OK`.

- [ ] **Step 2: Confirm zero open BLOCKER+CRITICAL issues**

Tool: `mcp__sonarqube__issues`
Args:
- `projects`: `["reminiscent-io_wanderluxe"]`
- `severities`: `["BLOCKER", "CRITICAL"]`
- `statuses`: `["OPEN", "CONFIRMED", "REOPENED"]`
- `page_size`: `1`

Expected after Phase 1+2+3 only: `paging.total ≈ 30` (down from 37).
Expected after Phase 4 tasks 10–14: `paging.total ≈ 25`.
Expected after full Phase 4 burn-down: `paging.total ≈ 0`.
