# SonarQube Remediation — v2 (Validated)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pass the SonarCloud quality gate for `reminiscent-io_wanderluxe` and burn down the validated backlog of 32 open BLOCKER+CRITICAL issues (S3776, S2004, S4335, S3516) plus 8 unreviewed security hotspots, in priority order — with current-state re-validation before each refactor.

**Architecture:** Two tracks. Track A is one user action (SonarCloud project config) plus SonarCloud-UI triage of false-positive issues/hotspots — the MCP server cannot do mutations (confirmed broken). Track B is per-file refactors that genuinely reduce complexity and duplication; each task starts with a validation step that re-queries SonarCloud and re-reads the code so we never refactor something that's already been fixed.

**Tech Stack:** SonarCloud MCP server (`mcp__sonarqube__*`, read tools only), TypeScript/React 19, Vitest, ESLint.

**Supersedes:** `2026-05-04-sonarqube-remediation.md` (v1). This v2 incorporates: validation-first workflow, reordered Phase 4 by combined complexity+duplication impact, the confirmed-broken MCP mutation tools, and the Task 9 duplication findings.

**Pre-flight notes for the executor:**
- Current branch: `type-check-address`. Many unrelated files are unstaged on this branch. Each task must `git add <specific files>` — never `git add .` / `git add -A`.
- `bun` is NOT on PATH. Use `npx tsc --noEmit` and `npx eslint <file>`.
- Commit-message co-author trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Never use `--no-verify` on commits.
- Quality-gate conditions still failing: `new_reliability_rating=4`, `new_duplicated_lines_density=4.2`, `new_security_hotspots_reviewed=12.5`.
- The "new code" period is `previous_version` since 2025-03-29 — so `new_lines` ≈ entire codebase (59,826). This makes new-* metrics behave like all-* metrics. Phase 0 addresses this.
- Validated current state of all 32 open issues was captured 2026-05-04 evening; the issue-key list in this plan reflects that snapshot.

---

## Phase 0: User-only actions (Track A)

Track A items can only be completed by a human via the SonarCloud web UI — the MCP server returns `"The 'issue' parameter is missing"` for every mutation tool (`markIssueWontFix`, `markIssueFalsePositive`, `resolveIssue`, `addCommentToIssue`, `markIssuesWontFix`, `update_hotspot_status`). Confirmed across 6 different mutation endpoints. Until that MCP bug is fixed, do these in the web UI.

### Task 0a: Update the "New Code" reference period (highest-leverage gate fix)

The current `previous_version` reference is stale (last tag 2025-03-29, >13 months old), so `new_lines = 59,826`. Switching to a 30-day sliding window will likely drop `new_duplicated_lines_density` from 4.23% to well under the 3% threshold without any code changes.

- [ ] In SonarCloud, go to `Project Settings → New Code` for `reminiscent-io_wanderluxe`.
- [ ] Change reference from `previous_version` to `Number of days = 30`.
- [ ] Save.
- [ ] Trigger a fresh analysis (or wait for next push).
- [ ] Verify via MCP:
  ```
  mcp__sonarqube__quality_gate_status({project_key: "reminiscent-io_wanderluxe"})
  ```
  Expected: `new_duplicated_lines_density` flips to `OK`.

### Task 0b: Triage hotspots and issues in SonarCloud UI

The MCP mutation tools are broken. Until fixed, do these via web UI. Each entry below = one UI click + paste-comment.

**Mark these 8 hotspots as "Reviewed → Safe" with the indicated comment:**

| Hotspot key | File:Line | Comment to paste |
|---|---|---|
| `AZrBh2DpElQpyrulH3Xv` | `public/sw.js:43` (S3516 issue, not hotspot — see below) | (Use Issue UI, not Hotspot UI) |
| `AZvjfrImkMOdTevuj093` | `server/routes/ai-chat.ts:360` | Partial-marker regex with only nested optional literals — no quantifier-on-class, linear time. Safe. |
| `AZoJI3LJrYpZhVWlkLhi` | `src/components/trip/ShareTripDialog.tsx:47` | Email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` — character classes exclude `\s` and `@`, no overlap, linear time. Safe. |
| `AZv18S8KUFY_jNLCC6jm` | `src/pages/Profile.tsx:76` | Same email regex pattern. Linear, no backtracking. Safe. |
| `AZn9x7eH2dvTjDwPQs_0` | `supabase/functions/send-email/index.ts:15` | Same email regex pattern, plus CRLF guard. Safe. |
| `AZilups_A5P4kbAU9QM7` | `src/components/trip/BookingView.tsx:62` | Stale — the only `target="_blank"` in this file (now at line 110) already has `rel="noopener noreferrer sponsored"`. |
| `AZVslbbDDnG7ZCffSk47` | `src/components/ui/sidebar.tsx:663` | Vendor shadcn/ui skeleton using `Math.random()` for cosmetic loader-bar widths. Not security-relevant. |
| `AZvX40kh1nqMkAuXyzTg` | `server/dev-server.ts:10` | Dev-only Vite middleware server; open CORS is intentional for local dev. Not used in production builds. |
| `AZbvlw1aYa1G_XRDILiP` | `server/index.ts:14` | Production CORS uses allowlist (`ALLOWED_ORIGINS` env + replit/wanderluxe.io patterns) with `credentials=true`. Wildcard fallback gated on `NODE_ENV !== 'production'`. Reviewed. |

**Mark these 6 issues as "Won't Fix" with the indicated comment:**

| Issue key | File:Line | Rule | Comment to paste |
|---|---|---|---|
| `AZrBh2DpElQpyrulH3Xv` | `public/sw.js:43` | `javascript:S3516` | Service-worker `fetch` event handler. Early `return;` statements are intentional skip-cases (non-GET, cross-origin, version.json). Handler's effect is `event.respondWith(...)`, not return value. S3516 doesn't model SW event-handler semantics. |
| `AZvzIzHbjVQihlc3gJC8` | `supabase/migrations/20260121000000_create_avatars_bucket.sql:3` | `plsql:S1192` | Applied migration files are immutable history. We do not refactor them. |
| `AZvxxpPmkWn7WrlPuAsq` | `supabase/migrations/20260122000000_fix_trip_shares_email_matching.sql:29` | `plsql:S1192` | Same — immutable migration. |
| `AZvxxpPzkWn7WrlPuAsz` | `supabase/migrations/20260124000000_fix_trip_shares_rls_access.sql:25` | `plsql:S1192` | Same — immutable migration. |
| `AZvnTqkGDGw5MlN0DhIL` | `supabase/migrations/20260124000001_fix_trips_access_urgent.sql:56` | `plsql:S1192` | Same — immutable migration. |
| `AZvd-6LPmtn06y5TLSnG` | `supabase/migrations/20260124000005_cleanup_rls_policies.sql:31` | `plsql:S1192` | Same — immutable migration. |

After completing 0a + 0b, the quality gate should flip:
- `new_reliability_rating` → `OK` (S3516 marked won't fix removes the only bug)
- `new_security_hotspots_reviewed` → `OK` (all 8 hotspots reviewed)
- `new_duplicated_lines_density` → `OK` (new-code period now 30 days)

---

## Phase 1 (DONE): Task 8 — intersection type fix

✅ **Already completed** on this branch as commit `a424ffd`. Sonar's S4335 issue `AZoDLQMSKkjxch7R8yip` still shows as `OPEN` until next analysis runs and confirms the fix.

---

## Phase 2 (DONE): Task 9 — duplication investigation

✅ **Findings recorded.** Summary:
- 4.2% new-duplication is measuring the entire codebase (period stale).
- Worst real duplication: `GroupedEventCard.tsx` (190 lines / 63.1%), `TimelineRow.tsx` (117 lines / 40.8%), `stripe.ts` (155 lines / 28.0%).
- These overlap heavily with the complexity hotlist — Phase 3 tasks address both gate conditions.

---

## Phase 3: Validated refactors

Reordered by combined complexity + duplication impact, grouping the three timeline-area tasks together so context carries between them. The high-risk webhook is last.

**Every Task in this phase starts with validation (V-steps).** Do not skip them — if validation fails (the issue no longer exists, the function changed, the file moved), report back without writing code. The plan author cannot predict whether someone else will have already fixed an issue.

**Generic validation recipe (V1–V3) — applied at the start of every Task in this phase:**

- [ ] **V1: Re-query SonarCloud for this specific issue**

  Tool: `mcp__sonarqube__issues`
  Args: `projects: ["reminiscent-io_wanderluxe"]`, `issues: ["<the key listed in the task>"]`, `page_size: 1`
  Expected: `paging.total == 1` and the issue's `status` is `OPEN` / `CONFIRMED` / `REOPENED`. Read the returned `line`, `message` (extract the current complexity number) — these are the source of truth, not the values written in this plan.
  If `paging.total == 0` or `status == RESOLVED/CLOSED`: report "ALREADY FIXED — issue not present in current SonarCloud state" and stop.

- [ ] **V2: Re-read the file at the reported line**

  Read 30 lines starting 5 lines before the function start (use the line number from V1).
  Confirm: a function exists at that line, the function's branching looks consistent with the reported complexity (lots of `if`/`else`/`for`/`switch`/`&&`/`||`/`try`).
  If the file has been refactored such that the function no longer exists at the reported line: search the file with `grep -n "<function name from message or context>"`. If still not found, report "STALE — function no longer exists at reported location" and stop.

- [ ] **V3: Check tests exist**

  Run: `find . -path ./node_modules -prune -o \( -name "*.test.ts" -o -name "*.test.tsx" \) -print | xargs grep -l "<function-name-or-key-identifier>"`
  If tests exist: run them now (`npx vitest run <test-path>`) to confirm they currently pass — that's the regression baseline.
  If no tests exist: write one happy-path Vitest test before refactoring (you'll add it in the implementation step). Don't write tests for code you can't see executed — for hooks, render them via `@testing-library/react`'s `renderHook`; for pure functions, just call them.

**Generic refactor recipe (R1–R5) — applied after V1–V3 pass:**

- [ ] **R1: Identify 2–3 cheap extractions**

  Re-read the function with all branches in mind. A pure helper that takes 1–3 args and returns one value is the gold standard. Aim for 2–3 small named helpers, not one huge helper. Each extraction drops complexity by ~3–5 points.
  Cognitive complexity counts: `if/else` (+1 each), nested levels (+1 per level of nesting), `&&` / `||` chains (+1 each beyond the first), `switch case` (+1 each), ternaries (+1 nested), `for`/`while`/`do-while` (+1 each).

- [ ] **R2: Extract one helper at a time**

  After each extraction:
  - Run `npx tsc --noEmit` — must stay clean.
  - Run the test from V3 (or any related test in the same file) — must stay green.
  - If something breaks, revert *that helper extraction only* and try a different cut. Don't pile on more changes hoping it works out.

- [ ] **R3: Verify complexity dropped below 15**

  Run `npx eslint <file>` — if `sonarjs/cognitive-complexity` is enabled in ESLint config it will flag complexity locally. Otherwise the truth-check is the next CI scan; before committing, eyeball the function: count branches and ensure you're plausibly under 15.

- [ ] **R4: Run the full type-check + relevant tests**

  Run: `npx tsc --noEmit`
  Run: `npx vitest run <changed test files>`
  Both must pass.

- [ ] **R5: Commit only the changed files**

  ```bash
  git add <exact paths>
  git commit -m "$(cat <<'EOF'
  refactor(<scope>): reduce cognitive complexity of <fn> from <X> to <Y>

  Sonar S3776: extracted <N> helpers (<helper-names>).

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  EOF
  )"
  ```

---

### Task 10: GroupedEventCard.tsx (complexity 24, 190 dup-lines / 63.1%)

**Why first:** highest duplication count in the codebase. Component is a UI variant renderer — extraction candidates are usually obvious (per-event-type branches → typed sub-components or a render map). Low risk: pure presentation.

**Files:**
- Modify: `src/components/trip/day/components/GroupedEventCard.tsx`
- Possible new files: a colocated helper file if extractions get sizable.

**Issue to validate:** key `AZs0b1UQpJ4aqRPR_tAT`, expected at line 31, expected complexity 24.

- [ ] **V1: Validate issue still exists** (recipe V1 above)
- [ ] **V2: Re-read the file** (recipe V2 above)
- [ ] **V3: Check tests** (recipe V3 above)
- [ ] **R1: Plan extractions** (recipe R1 above). Likely candidates: per-event-type render branches (activity / accommodation / transportation / dining → small typed components), grouped header rendering, time-formatting helper.
- [ ] **R2: Extract helpers** (recipe R2 above)
- [ ] **R3: Verify complexity** (recipe R3 above)
- [ ] **R4: Type-check + tests** (recipe R4 above)
- [ ] **R5: Commit** (recipe R5 above). Use scope `(timeline)`.

---

### Task 11: TimelineRow.tsx (complexity 28, 117 dup-lines / 40.8%)

**Why second:** sibling of Task 10, second-biggest duplication. Likely shares extraction patterns with GroupedEventCard.

**Files:**
- Modify: `src/components/trip/day/components/TimelineRow.tsx`

**Issue to validate:** key `AZs0b1TXpJ4aqRPR_tAH`, expected at line 23, expected complexity 28.

Apply recipes V1–V3 then R1–R5. Scope `(timeline)`. Watch for shared helpers with GroupedEventCard — if both files duplicate the same render branches, consider extracting to `timeline-utils.ts` (already exists in the same directory and was just made cleaner by Task 8).

---

### Task 12: useDayTimeline.ts (complexity 47)

**Why third:** same area as Tasks 10–11 (timeline). Largest hook in the timeline subsystem. No duplication flagged, but complexity is huge.

**Files:**
- Modify: `src/components/trip/day/components/useDayTimeline.ts`
- Likely new pure helpers in: `src/components/trip/day/components/timeline-utils.ts` (preferred — hooks should stay thin; logic belongs in pure utils that can be tested without React).

**Issues to validate:**
- Primary: key `AZoDLQMCKkjxch7R8yij`, expected at line 93, expected complexity 47.
- Also affecting same file (separate, optional): key `AZs0b1SxpJ4aqRPR_s__`, expected at line 214, expected complexity 24. If time permits, tackle in the same task; otherwise leave for Phase 4.

Apply recipes V1–V3 then R1–R5. Scope `(timeline)`. Likely extractions: row-merging logic, hint-detection (`layover` / `free-time` / `overlap`), grouping by time. Strongly prefer adding pure helpers in `timeline-utils.ts` rather than nested helpers inside the hook file — pure helpers test trivially.

---

### Task 13: supabase/functions/ai-chat/index.ts (complexity 51)

**Why fourth:** highest single complexity in the codebase. AI chat hot path. No duplication flagged.

**Files:**
- Modify: `supabase/functions/ai-chat/index.ts`
- Note: this is a Deno edge function. Same TS rules but uses Deno-specific imports (`Deno.env`, `Deno.serve`). Don't try to run it through Vitest (which is Node); use `npx tsc --noEmit` and visual inspection. Manual smoke-test against the deployed function is optional but recommended after deploy.

**Issues to validate:**
- Primary: key `AZvW__9UWUEden2ptaxy`, expected at line 10, expected complexity 51.
- Also same file: key `AZvW__9UWUEden2ptax0`, expected at line 230, expected complexity 18. Tackle in same task if time permits.

Apply recipes V1–V3 (V3 may not find Vitest tests — that's normal for Deno files; do a manual read-through of the function instead and document the happy path in a comment block before refactoring) then R1–R5. Scope `(ai-chat-fn)`. Likely extractions: request validation, message-history loading, system-prompt assembly, streaming-response setup, the `find_place` / `search_web` function-calling handlers (extract into `handleToolCall(toolName, args, ctx)`).

---

### Task 14: ExtractedItemCard.tsx (complexity 44)

**Why fifth:** UI variant renderer like Tasks 10–11, but in the AI-assistant subsystem. Clean extraction territory.

**Files:**
- Modify: `src/components/trip/ai-assistant/ExtractedItemCard.tsx`

**Issue to validate:** key `AZvjfqygkMOdTevuj09K`, expected at line 45, expected complexity 44.

Apply recipes V1–V3 then R1–R5. Scope `(ai-assistant)`. Likely extractions: per-extracted-type render branches (accommodation / activity / transportation / dining → typed sub-components or a render map keyed by `item.type`).

---

### Task 15: server/routes/ai-chat.ts (complexity 40, 88 dup-lines / 10.5%)

**Why sixth:** moderate complexity + some duplication. SSE streaming-reducer territory.

**Files:**
- Modify: `server/routes/ai-chat.ts`

**Issue to validate:** key `AZvRpqEIzogFapBNQuxN`, expected at line 625, expected complexity 40.

Apply recipes V1–V3 then R1–R5. Scope `(ai-chat-route)`. Likely extractions: the partial-marker buffer state machine, the JSON-frame extractor, the suppression state machine. Each is a candidate for a small named object with `feed(chunk)` and `flush()` methods, testable in isolation against fixture chunks.

---

### Task 16: server/routes/stripe.ts (complexity 42, 155 dup-lines / 28.0%) ⚠ HIGHEST RISK

**Why last:** webhook surface area — breaking this breaks payments. Save until the workflow has been validated on lower-risk tasks.

**Files:**
- Modify: `server/routes/stripe.ts`

**Issue to validate:** key `AZvX40lZ1nqMkAuXyzTi`, expected at line 194, expected complexity 42.

**Extra precautions for this task (overrides V3 baseline):**

- [ ] **V3-stripe: Tests are mandatory before any refactor.** If tests don't exist, write at least one fixture-driven test per webhook event type you'll touch (use Stripe's test fixture payloads — `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, etc.). Tests must pass on the unrefactored code first to establish the baseline.
- [ ] **V3-stripe: Confirm signature verification stays untouched.** Re-read the lines where `STRIPE_WEBHOOK_SECRET` and `stripe.webhooks.constructEvent(...)` appear. Note exactly where in the request flow they sit. Your refactor must leave that flow byte-identical — the verification is what stops attackers from forging events.

Then apply recipes V1–V2 then R1–R5 (V3 already strengthened above). Scope `(stripe)`. Likely extractions: per-event handlers (`handleCheckoutCompleted(event)`, `handleSubscriptionUpdated(event)`, etc.) dispatched from a small `EVENT_HANDLERS` map keyed by `event.type`. Each handler should be a small async function that takes the typed Stripe event and returns a result.

**Post-refactor manual smoke test:** trigger one webhook locally (`stripe trigger checkout.session.completed`) and confirm a real database row was written or the subscription was updated as before. Don't merge without this.

---

## Phase 4: Optional cleanup — remaining S3776 / S2004 backlog

The 32 validated issues minus the 7 addressed in Phase 3 leaves ~25 cognitive-complexity issues with complexity scores between 16 and 34. Address them opportunistically when next touching the file. Do not create a single mega-PR.

### Task 17: Snapshot the remaining backlog

- [ ] **Step 1: Pull the current S3776/S2004 list**

  Tool: `mcp__sonarqube__issues`
  Args: `projects: ["reminiscent-io_wanderluxe"]`, `rules: ["typescript:S3776", "typescript:S2004"]`, `statuses: ["OPEN", "CONFIRMED", "REOPENED"]`, `s: "FILE_LINE"`, `asc: true`, `page_size: 50`

- [ ] **Step 2: Filter out Phase 3 targets and save the rest**

  Save the remaining ~25 issues to `docs/superpowers/plans/2026-05-04-sonarqube-complexity-backlog.md` as a table with: file, line, current complexity, issue key, estimated effort. This becomes the running backlog for ad-hoc cleanup.

---

## Phase 5: Final verification

### Task 18: Confirm the quality gate is green

- [ ] **Step 1: Re-fetch the quality gate**

  Tool: `mcp__sonarqube__quality_gate_status`
  Args: `project_key: "reminiscent-io_wanderluxe"`
  Expected: `projectStatus.status: "OK"`. All three conditions report `OK`.

- [ ] **Step 2: Confirm Phase 3 targets are resolved**

  Tool: `mcp__sonarqube__issues`
  Args: `projects: ["reminiscent-io_wanderluxe"]`, `issues: ["AZs0b1UQpJ4aqRPR_tAT", "AZs0b1TXpJ4aqRPR_tAH", "AZoDLQMCKkjxch7R8yij", "AZvW__9UWUEden2ptaxy", "AZvjfqygkMOdTevuj09K", "AZvRpqEIzogFapBNQuxN", "AZvX40lZ1nqMkAuXyzTi"]`, `statuses: ["RESOLVED", "CLOSED"]`, `page_size: 10`
  Expected: `paging.total == 7` (all 7 targeted issues are now resolved).
  If fewer, look up the open ones — the refactor either did not lower complexity below 15, or SonarCloud has not re-scanned. Trigger a fresh scan and re-check.

- [ ] **Step 3: Confirm no new BLOCKER+CRITICAL issues were introduced**

  Tool: `mcp__sonarqube__issues`
  Args: `projects: ["reminiscent-io_wanderluxe"]`, `severities: ["BLOCKER", "CRITICAL"]`, `statuses: ["OPEN", "CONFIRMED", "REOPENED"]`, `created_in_last: "7d"`, `page_size: 50`
  Expected: 0 new issues. If any appeared during refactoring, address them before declaring done.
