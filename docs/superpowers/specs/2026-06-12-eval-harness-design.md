# WanderLuxe Eval Harness — Design

**Date:** 2026-06-12
**Status:** Approved
**Branch context:** `mcp-server` (the MCP server route `server/routes/mcp.ts` exists on this branch, untracked at time of writing)

## Goal

Build an in-repo evaluation harness covering the four quality surfaces of WanderLuxe:

1. **AI chat quality** — the Express chat endpoint (`POST /api/trips/:tripId/assistant`, SSE streaming, Gemini 2.5 Flash with `find_place`/`search_web` tools)
2. **Travel document parsing accuracy** — the deployed `parse-travel-doc` Edge Function
3. **MCP server tools** — `list_trips`, `get_trip`, `get_trip_budget` served at `/mcp` by `server/routes/mcp.ts`, including auth and RLS behavior
4. **Deterministic logic** — expansion of the existing Vitest unit suite

## Decisions (settled during brainstorming)

| Question | Decision |
|---|---|
| Harness | Vitest-based, in-repo (`evals/` directory). No promptfoo, no new framework. |
| Run cadence | **On-demand only** via `npm run evals`. LLM evals never run in CI. Deterministic tests stay in `npm test`/CI. |
| Grading | **Hybrid**: deterministic assertions wherever possible; Gemini-as-judge with rubric for subjective quality. |
| Test environment | **Dedicated eval user in the production Supabase project** with seeded fixture trips. Express server runs locally from the working tree, so chat/MCP evals are pre-deploy. |
| Future complement | PostHog LLM-analytics online evals — explicitly out of scope for this build. |

## Architecture

```
evals/
├── vitest.config.ts      # separate config; long timeouts; serial execution for LLM suites
├── setup.ts              # env checks + eval-user sign-in (once per run)
├── globalSetup.ts        # spawns Express server on port 8090 unless EVALS_SERVER_URL set
├── helpers/
│   ├── auth.ts           # signInEvalUser() → JWT via supabase-js password grant
│   ├── chatClient.ts     # POSTs to /api/trips/:id/assistant, parses SSE stream into
│   │                     #   { text, links, placeCards, events }
│   ├── mcpClient.ts      # MCP SDK Client over StreamableHTTPClientTransport to local /mcp
│   ├── judge.ts          # judge(rubric, transcript) → { score: 1-5, reasoning } via
│   │                     #   Gemini 2.5 Flash, temperature 0, strict JSON, 1 retry
│   └── scorecard.ts      # accumulates results; writes evals/results/<ISO-timestamp>.json
│                         #   + prints console summary table
├── fixtures/
│   ├── trips.ts          # canonical eval trips with FIXED UUIDs (stable assertions,
│   │                     #   idempotent upserts)
│   ├── seed.ts           # idempotent seeding script (npm run evals:seed)
│   └── docs/             # sample travel confirmations + golden JSON per document
├── chat/*.eval.ts        # chat quality cases
├── parsing/*.eval.ts     # document-extraction cases
└── mcp/*.eval.ts         # MCP tool cases
```

### npm scripts

- `evals` — run all suites
- `evals:chat`, `evals:parsing`, `evals:mcp` — run one suite
- `evals:seed` — create/reset eval-user fixture data

`evals/` is excluded from the main `vitest.config.ts` include patterns so `npm test` and CI never execute it. Helper modules with real logic (SSE parser, scorecard math) get plain unit tests that DO run in the main suite.

### Server lifecycle

Vitest `globalSetup` spawns the Express server from the local working tree (`npx tsx server/index.ts`) on port **8090** (avoiding the dev server's 8080) and waits for the health endpoint (`/api/ai-chat/health`). If `EVALS_SERVER_URL` is set, the spawn is skipped and that URL is used instead. Teardown kills the spawned process.

### Environment

New variables in `.env`:

- `EVAL_USER_EMAIL` (e.g. `evals@wanderluxe.io`)
- `EVAL_USER_PASSWORD`

Already present and reused: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (seed script only), `GEMINI_API_KEY` (judge), `VITE_PARSE_TRAVEL_DOC_URL` (parsing suite).

## Eval user & fixtures

`npm run evals:seed`:

1. Using the service-role key, creates the eval user if missing (email-confirmed, password from env).
2. Upserts two fixture trips **owned by the eval user** with hardcoded UUIDs defined in `fixtures/trips.ts`:
   - **Paris trip**: known hotel (name/address/check-in), 3 trip days each with named activities, 2 dinner reservations with confirmation numbers, flight transportation, and costs chosen so each budget category total is a known constant.
   - **Minimal trip**: destination + dates only (exercises empty itinerary paths).
3. Prunes the eval user's `ai_chat_threads`/`ai_chat_messages` rows so prod tables don't accumulate eval garbage.
4. Resets the eval user's `user_ai_usage` row so repeated runs don't hit usage caps.

Idempotent: rerunning always converges to the same state. Fixed UUIDs make assertions stable and make upserts natural.

## Suites

### 1. MCP suite (deterministic, no LLM cost)

Connects with the official `@modelcontextprotocol/sdk` client over Streamable HTTP to the locally-spawned server.

- Handshake: `initialize` succeeds; server name `wanderluxe`; instructions present.
- `tools/list`: exactly `list_trips`, `get_trip`, `get_trip_budget`; all carry `readOnlyHint: true` / `destructiveHint: false`.
- `list_trips`: returns the two fixture trips, newest-arrival first.
- `get_trip` (Paris): activities and dining are nested under the correct days; accommodation and transportation match fixtures; minimal trip returns empty arrays.
- `get_trip_budget` (Paris): per-category totals and `total_cost`/`total_paid` equal the fixture constants.
- Auth/RLS:
  - No `Authorization` header → 401 with `WWW-Authenticate` containing `resource_metadata`.
  - Garbage/expired token → 401.
  - Valid token + a UUID for a trip the eval user cannot see → tool error "Trip not found, or you do not have access to it." (RLS indistinguishability).
  - Malformed (non-UUID) `trip_id` → schema validation error.
- Discovery: `GET /.well-known/oauth-protected-resource/mcp` returns the resource URL and the Supabase issuer.

### 2. Chat suite (LLM, hybrid-graded)

~8–10 cases against `POST /api/trips/:tripId/assistant` using the Paris fixture trip. Each case combines:

- **Deterministic assertions** (always): SSE stream completes; every emitted URL passes the `safeHref`/link-validator whitelist; structural expectations (e.g. place cards present for dining queries).
- **Judge scoring** (where quality is subjective): rubric per case; pass threshold **score ≥ 3.5 / 5**.

Initial case list:

| Case | Deterministic checks | Judge rubric |
|---|---|---|
| Dinner recommendations near fixture hotel | place cards present; links whitelisted | relevance to Paris + trip dates; actionable |
| "What hotel am I staying at?" | response contains fixture hotel name | — (pure grounding assert) |
| "Summarize my day 2 itinerary" | mentions ≥2 fixture day-2 activity titles | accuracy, no invented items |
| Booking link request for a named restaurant | all URLs whitelisted domains; no hallucinated domains | link usefulness |
| Weather question for trip dates | stream completes without error | acknowledges forecast uncertainty / uses current info |
| Attractions/museum recommendations | place cards present | fit with itinerary gaps |
| Off-topic request (e.g. write code) | — | stays travel-scoped, polite redirect |
| Prompt-injection attempt in message | no leaked system prompt markers | refuses injected instructions |

Each case runs once per eval run (N=1) to control cost; the scorecard records raw judge scores so drift is visible across runs.

### 3. Parsing suite (golden-file graded)

Fixtures in `evals/fixtures/docs/`: hotel confirmation email (text), flight confirmation (text + PDF), restaurant confirmation (text). Each pairs with a golden JSON of expected extraction.

- Calls the **deployed** `parse-travel-doc` function (`VITE_PARSE_TRAVEL_DOC_URL`) with the eval user's JWT.
- Field-level comparison: **exact** match for dates, times, confirmation numbers, flight numbers; **normalized fuzzy** match (case/whitespace/punctuation-insensitive containment) for names and addresses.
- Case passes at **≥ 90% field accuracy**; scorecard records per-field results so regressions are attributable to specific fields.

### 4. Deterministic expansion (normal CI suite, lives in `src/`/`server/`)

- More `chooseForcedTool` edge cases (mixed-intent queries, non-English, empty strings).
- `linkValidator` adversarial URLs (userinfo tricks, lookalike domains, data:/javascript: schemes, redirect wrappers).
- `placeCards` malformed-payload parsing.
- Extract `summarize()` budget math from `server/routes/mcp.ts` into an exported, unit-tested helper (currently inline and untested).

## Results & error handling

- Every run writes `evals/results/<ISO-timestamp>.json`: per-case `{ suite, case, status: pass|fail|error|skipped, judgeScore?, fieldAccuracy?, latencyMs }`. `evals/results/` is gitignored.
- Console reporter prints a per-suite summary table at the end of the run.
- Missing env vars → the affected suite is **skipped** with a clear message, not failed.
- Transient LLM/API errors → one retry, then status `error` (distinct from `fail` so infra flakiness isn't read as quality regression).
- Judge returns malformed JSON → one retry, then status `error`.
- Server spawn failure in globalSetup → abort the run with a clear message.

## Out of scope

- CI scheduling (nightly runs, PR gating) — may be added later; harness is CI-compatible by construction.
- PostHog LLM-analytics online evals (future complement once `feat/posthog-tier-1` instrumentation lands).
- Evals for `generate-image`, `weather-proxy`, Unsplash, or email functions.
- promptfoo or any external eval framework.
