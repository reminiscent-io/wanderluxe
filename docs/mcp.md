# WanderLuxe MCP Server

WanderLuxe runs a remote [Model Context Protocol](https://modelcontextprotocol.io) server that lets Claude, ChatGPT and other MCP clients read and edit your WanderLuxe trips. Ask Claude to "add dinner at Le Comptoir on Thursday at 8pm" and the reservation shows up in your itinerary, on your calendar feed, and on your travel companions' screens in real time.

| | |
|---|---|
| Server URL | `https://wanderluxe.io/mcp` |
| Transport | Streamable HTTP, stateless (JSON responses, no SSE stream) |
| Authentication | OAuth 2.1, with WanderLuxe (Supabase Auth) as the authorization server |
| Tools | 20: 3 read-only, 17 write (6 of them destructive) |
| Cost | Free on every WanderLuxe plan |
| Support | [info@wanderluxe.io](mailto:info@wanderluxe.io) |
| Privacy policy | [wanderluxe.io/privacy](https://wanderluxe.io/privacy) |
| Source | [`server/routes/mcp.ts`](../server/routes/mcp.ts), [`server/lib/mcpTools.ts`](../server/lib/mcpTools.ts) |

## Contents

- [Connect it](#connect-it)
- [What it can see and change](#what-it-can-see-and-change)
- [Conventions](#conventions)
- [Tools](#tools)
- [Example prompts](#example-prompts)
- [Safety](#safety)
- [Authentication details](#authentication-details)
- [Limits and errors](#limits-and-errors)
- [Privacy and data handling](#privacy-and-data-handling)
- [Troubleshooting](#troubleshooting)
- [For developers](#for-developers)

## Connect it

You need a WanderLuxe account. Sign up free at [wanderluxe.io](https://wanderluxe.io) with Google or email.

### Claude (claude.ai, Claude Desktop, Claude mobile)

1. Open **Settings → Connectors** and choose **Add custom connector**.
2. Name it `WanderLuxe` and paste `https://wanderluxe.io/mcp` as the URL. Leave the OAuth client fields empty.
3. Select **Connect**. A WanderLuxe window opens: sign in, review the access request, and choose **Approve**.
4. In a new chat, enable WanderLuxe from the tools menu and ask something like "What trips do I have coming up?"

On Team and Enterprise plans an owner may need to add the connector for the organization first.

### Claude Code

```bash
claude mcp add --transport http wanderluxe https://wanderluxe.io/mcp
```

Then run `/mcp` inside Claude Code and pick `wanderluxe` to sign in.

### Other MCP clients

Any client that supports remote Streamable HTTP servers with OAuth works. Point it at `https://wanderluxe.io/mcp`; the client discovers the authorization server from the `401` response (see [Authentication details](#authentication-details)).

### Disconnect

Remove the connector in your client's settings. The client discards its tokens and can no longer reach your trips. To have WanderLuxe revoke the grant on its side as well, email [info@wanderluxe.io](mailto:info@wanderluxe.io).

## What it can see and change

The server acts as you, with your own WanderLuxe permissions. Every query runs under your access token through the database's row-level security, so it can reach exactly what you can reach in the app:

- Trips you own: read and write.
- Trips shared with you with edit permission: read and write.
- Trips shared with you view-only: read. Writes are refused.
- Anyone else's trip: invisible. Asking for one returns the same "not found" error as a trip that doesn't exist, so the tools can't be used to probe for trip IDs.

It can't delete a whole trip, change who a trip is shared with, touch billing or your subscription, or make bookings or payments. Those stay in the app.

## Conventions

These hold for every tool. The server also sends them to the client as MCP `instructions`, so the model sees them before its first call.

- **IDs.** Trip IDs are UUIDs and not guessable. Call `list_trips` first. Item IDs (activities, dining, stays, transportation) come from `get_trip`; expense IDs come from `get_trip_budget`.
- **Dates** are `YYYY-MM-DD`. Items are added by date and the server finds the matching trip day. A date outside the trip's range is rejected with a message saying to change the trip's dates first.
- **Times** are 24-hour `HH:MM` wall-clock values: "9:30 in the morning wherever you are that day". They're never converted between time zones.
- **Time zones.** Each trip has a default IANA zone (for example `Europe/Paris`). An item can carry its own zone (transportation has `departure_timezone` and `arrival_timezone`) when it differs from the trip default, such as a flight landing in another country. Omit the field to inherit the default; pass `null` to clear an override. A zone is a label and never shifts the stored time.
- **Money.** `cost` and `amount_paid` are plain numbers in the item's own `currency`, a three-letter ISO code such as `EUR`. The server never converts currencies. Budget totals add up raw amounts, so check each category's `currencies` list before treating a total as one currency.
- **Partial updates.** `update_*` tools change only the fields you pass.
- **Results** come back as JSON text. Failures come back as tool errors (`isError: true`) with a message written for the model to act on.

## Tools

| Tool | Title | Kind | What it does |
|---|---|---|---|
| `list_trips` | List trips | read-only | Your trips and trips shared with you, newest first |
| `get_trip` | Get trip itinerary | read-only | Full day-by-day itinerary with stays and transportation |
| `get_trip_budget` | Get trip budget | read-only | Budget, spend by category, paid vs unpaid, misc expenses |
| `create_trip` | Create trip | write | New trip with one day per date |
| `update_trip` | Update trip | destructive | Destination, dates, budget, default time zone |
| `add_activity` | Add activity | write | Add an activity on a date |
| `update_activity` | Update activity | write | Edit or move an activity |
| `delete_activity` | Delete activity | destructive | Remove an activity |
| `add_dining` | Add dining reservation | write | Add a restaurant reservation on a date |
| `update_dining` | Update dining reservation | write | Edit or move a reservation |
| `delete_dining` | Delete dining reservation | destructive | Remove a reservation |
| `add_accommodation` | Add accommodation | write | Add a hotel or rental stay |
| `update_accommodation` | Update accommodation | write | Edit a stay, including its dates |
| `delete_accommodation` | Delete accommodation | destructive | Remove a stay |
| `add_transportation` | Add transportation | write | Add a flight, train, car service, shuttle, ferry or rental car |
| `update_transportation` | Update transportation | write | Edit a leg |
| `delete_transportation` | Delete transportation | destructive | Remove a leg |
| `add_expense` | Add expense | write | Add a non-booking expense (tickets, shopping, fees) |
| `update_expense` | Update expense | write | Edit an expense |
| `delete_expense` | Delete expense | destructive | Remove an expense |

Every tool declares a `title` plus `readOnlyHint` and `destructiveHint` annotations. The three read tools set `readOnlyHint: true`. `update_*` tools also set `idempotentHint: true`: repeating the same call leaves the same result.

### Read tools

#### `list_trips`

No parameters. Returns `trips[]` with `trip_id`, `destination`, `arrival_date`, `departure_date`, `budget`, `timezone` and `created_at`.

#### `get_trip`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | From `list_trips` |

Returns `trip`, `days[]` (each with `date`, `title`, `description`, `activities[]` and `dining[]`), `accommodations[]` and `transportation[]`. Each item includes its ID for later updates and its `timezone` (`null` means the trip default).

#### `get_trip_budget`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | From `list_trips` |

Returns `budget`, `total_cost`, `total_paid`, `categories` (accommodations, transportation, activities, dining, other; each with `total`, `paid`, `currencies` and `items`), and `other_expenses[]` with their `id`s.

### Trips

#### `create_trip`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `destination` | string | yes | Trip name, e.g. `Paris, France` |
| `arrival_date` | date | yes | First day |
| `departure_date` | date | yes | Last day, on or after `arrival_date`; at most 366 days total |
| `budget` | number > 0 | no | Total trip budget |
| `timezone` | IANA zone | no | Default zone for the trip's times |

Returns `trip_id` and `day_dates[]`, so the model can add items straight away. The model is told to ask for dates rather than invent them.

#### `update_trip`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `destination` | string | no | |
| `arrival_date` | date | no | |
| `departure_date` | date | no | |
| `budget` | number > 0 or `null` | no | `null` clears it |
| `timezone` | IANA zone or `null` | no | `null` clears it; the app re-resolves it from the destination |
| `confirm_remove_days` | boolean | no | Required to drop days that still have items |

Extending the dates adds days. Shrinking them onto empty days removes those days. Shrinking them onto days that still hold items changes nothing and returns `status: "confirmation_required"` with `at_risk_days[]` (each day's activities, dining and accommodation nights). The model shows you that list; only after you agree does it call again with `confirm_remove_days: true`. A successful call returns `status: "updated"` with `days_added[]` and `days_removed[]`.

### Activities

#### `add_activity`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `date` | date | yes | Within the trip's range |
| `title` | string | yes | |
| `description` | string | no | |
| `start_time`, `end_time` | `HH:MM` | no | |
| `location_address` | string | no | |
| `cost`, `amount_paid` | number ≥ 0 | no | |
| `currency` | ISO code | no | |
| `is_paid` | boolean | no | |
| `timezone` | IANA zone or `null` | no | Only when it differs from the trip default |

#### `update_activity`

`activity_id` (from `get_trip`) plus any field from `add_activity` except `trip_id`. Passing a new `date` moves the activity to that day.

#### `delete_activity`

`activity_id`. Returns `{ deleted: true, id }`.

### Dining

#### `add_dining`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `date` | date | yes | Within the trip's range |
| `restaurant_name` | string | yes | |
| `reservation_time` | `HH:MM` | no | |
| `end_time` | `HH:MM` | no | Defaults to 90 minutes after the start |
| `number_of_people` | integer > 0 | no | |
| `address`, `confirmation_number`, `notes` | string | no | |
| `cost`, `amount_paid` | number ≥ 0 | no | |
| `currency` | ISO code | no | |
| `is_paid` | boolean | no | |
| `timezone` | IANA zone or `null` | no | |

#### `update_dining`

`reservation_id` (from `get_trip`) plus any field from `add_dining` except `trip_id`. Changing only `reservation_time` shifts the end time with it, keeping the reservation's length.

#### `delete_dining`

`reservation_id`.

### Accommodations

#### `add_accommodation`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `hotel` | string | yes | Property name |
| `hotel_checkin_date`, `hotel_checkout_date` | date | yes | Each night in between is mapped to its trip day |
| `checkin_time`, `checkout_time` | `HH:MM` | no | |
| `hotel_address`, `hotel_phone`, `hotel_website` | string | no | |
| `hotel_details` | string | no | Room type, booking notes |
| `cost`, `amount_paid` | number ≥ 0 | no | |
| `currency` | ISO code | no | |
| `is_paid` | boolean | no | |
| `timezone` | IANA zone or `null` | no | |

Returns the stay with its `stay_id`.

#### `update_accommodation`

`stay_id` plus any field from `add_accommodation` except `trip_id`. New dates recompute the night mappings.

#### `delete_accommodation`

`stay_id`. Also removes its night mappings.

### Transportation

#### `add_transportation`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `type` | enum | yes | `flight`, `train`, `car_service`, `shuttle`, `ferry`, `rental_car` |
| `start_date` | date | yes | |
| `start_time` | `HH:MM` | no | |
| `end_date`, `end_time` | date, `HH:MM` | no | Arrival, or rental car return |
| `departure_location`, `arrival_location` | string | no | |
| `provider`, `flight_number`, `confirmation_number` | string | no | |
| `details` | string | no | Terminal, gate, seat, baggage |
| `cost` | number ≥ 0 | no | |
| `currency` | ISO code | no | |
| `departure_timezone`, `arrival_timezone` | IANA zone or `null` | no | Set both on legs that cross zones |

#### `update_transportation`

`id` (from `get_trip`) plus any field from `add_transportation` except `trip_id`.

#### `delete_transportation`

`id`.

### Expenses

For spending that isn't a booking: museum tickets, shopping, visa fees.

#### `add_expense`

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `trip_id` | UUID | yes | |
| `description` | string | yes | |
| `cost` | number ≥ 0 | yes | |
| `currency` | ISO code | yes | |
| `date` | date | no | When it was spent |
| `amount_paid` | number ≥ 0 | no | |
| `is_paid` | boolean | no | |

#### `update_expense`

`id` (from `get_trip_budget`) plus any field from `add_expense` except `trip_id`.

#### `delete_expense`

`id`.

## Example prompts

Each of these works against a real account. The comments show the tools the model typically calls.

1. **"What's on my Lisbon trip for Saturday?"**
   `list_trips` → `get_trip`. Claude answers from the itinerary, times shown as local wall-clock times.

2. **"Plan me 4 days in Kyoto from November 12. Book-end it with the flights I pasted below, put me at the Hotel Kanra for all four nights, and add a tea ceremony on the second afternoon."**
   `create_trip` (with `timezone: "Asia/Tokyo"`) → `add_transportation` ×2 → `add_accommodation` → `add_activity`.

3. **"My flight home moved to 7:40pm on the 18th, and it lands in New York at 10:55pm."**
   `get_trip` → `update_transportation` with the new times and `arrival_timezone: "America/New_York"`.

4. **"How much have I spent on the Italy trip so far, and what's still unpaid? Add €38 for the Uffizi tickets, paid."**
   `get_trip_budget` → `add_expense` (`cost: 38`, `currency: "EUR"`, `is_paid: true`).

5. **"Cut the trip down to end on the 20th instead of the 22nd."**
   `update_trip` returns the items on the 21st and 22nd; Claude lists them and waits for your go-ahead before calling again with `confirm_remove_days: true`.

## Safety

- **Destructive tools are marked.** Every `delete_*` tool and `update_trip` set `destructiveHint: true`, so clients that ask before destructive actions will ask.
- **Date shrinks are two-step.** `update_trip` never drops a day that holds items on the first call. It returns what would be lost and requires an explicit `confirm_remove_days: true`.
- **No whole-trip delete, no sharing changes, no payments.** Those actions exist only in the app.
- **Nothing is invented server-side.** Tools write exactly the fields they're given. The server instructions tell the model to ask when dates or names aren't established rather than guess.
- **Input validation.** Dates must be real calendar dates, times `HH:MM`, currencies three capital letters, zones valid IANA IDs, and IDs UUIDs. Bad input is rejected before any database call.
- **Prompt injection.** Tool results contain your own trip text (titles, notes, addresses). The server returns them as JSON data and never follows instructions inside them. Treat shared trips' notes with the same care as any user-written text.

## Authentication details

The server is an OAuth 2.1 protected resource ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728)). WanderLuxe's Supabase Auth instance is the authorization server.

1. An unauthenticated `POST /mcp` returns `401` with
   `WWW-Authenticate: Bearer error="invalid_token", ..., resource_metadata="https://wanderluxe.io/.well-known/oauth-protected-resource/mcp"`.
2. `GET https://wanderluxe.io/.well-known/oauth-protected-resource/mcp` (also served at `/.well-known/oauth-protected-resource`) returns:

   ```json
   {
     "resource": "https://wanderluxe.io/mcp",
     "authorization_servers": ["https://<project>.supabase.co/auth/v1"],
     "bearer_methods_supported": ["header"],
     "scopes_supported": ["openid", "email", "profile"],
     "resource_name": "WanderLuxe",
     "resource_documentation": "https://github.com/reminiscent-io/wanderluxe/blob/main-agent/docs/mcp.md"
   }
   ```

3. The client registers and runs the authorization-code flow with PKCE against that authorization server. The user signs in and approves on WanderLuxe's consent page (`https://wanderluxe.io/oauth/consent`), which lists the client name and requested scopes in plain language and offers **Approve** or **Deny**.
4. The client sends `Authorization: Bearer <access token>` on every `POST /mcp`. The server verifies the token as an ES256 JWT against the issuer's JWKS (issuer `…/auth/v1`, audience `authenticated`), then forwards it to the database so row-level security scopes every query to that user.

Access tokens are short-lived; the client refreshes them with the refresh token it received. The server holds no session state: each request builds a fresh MCP server bound to that request's token, and nothing is shared between users or requests.

`GET /mcp` and `DELETE /mcp` return `405` because the stateless transport has no stream to resume and no session to end.

## Limits and errors

- **Rate limit:** 300 requests per 15 minutes per IP address on `/mcp`. Claude's traffic arrives from shared IPs, so the ceiling is set well above what one person needs. Over the limit you get HTTP `429`.
- **Trip length:** 1 to 366 days.
- **Errors:**

| Situation | Response |
|---|---|
| Missing, expired or invalid token | HTTP `401`, JSON-RPC error `-32001`, with the discovery header above |
| Invalid arguments | Tool error naming the field and the expected format |
| Trip or item not found, or not yours | Tool error: "Trip not found, or you do not have access to it." |
| Write on a view-only shared trip | Tool error from the database's permission check |
| Date outside the trip | Tool error suggesting you change the trip's dates first |
| Server misconfigured or crashed | HTTP `500`, JSON-RPC error `-32603` |

## Privacy and data handling

The full policy is at [wanderluxe.io/privacy](https://wanderluxe.io/privacy). For the MCP server specifically:

- **What it reads and writes:** only trip data in your own WanderLuxe account (trips, days, activities, dining, stays, transportation, expenses), and only what your permissions allow.
- **What it receives:** tool calls and their arguments. It never sees your conversation with the AI client, and it doesn't store or log prompts.
- **Where data goes:** WanderLuxe's own database (Supabase). The MCP server calls no third-party APIs and sends your data nowhere else. Anything a tool returns goes to the AI client you connected, under that client's own privacy terms.
- **Retention:** trip data stays until you delete it in the app or delete your account. Deleting your account removes your trips. The server keeps no copy of tool calls; operational error logs are kept for debugging only.
- **Contact:** [privacy@wanderluxe.io](mailto:privacy@wanderluxe.io).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Sign-in window never opens | Allow pop-ups for claude.ai, or remove and re-add the connector |
| "Unauthorized" after it was working | The session expired or was revoked. Disconnect and reconnect the connector |
| "Trip not found" for a trip you can see in the app | Make sure you signed in to the connector with the same WanderLuxe account |
| "No day matches …" | The date is outside the trip. Ask Claude to extend the trip's dates first |
| Times look shifted by a few hours | They shouldn't: times are wall-clock values. Check the item's `timezone` field, then email support with the trip and item |
| Edits fail on a friend's trip | They shared it view-only. Ask them to give you edit access |

Still stuck? Email [info@wanderluxe.io](mailto:info@wanderluxe.io) with the prompt you used, the time, and the trip name.

## For developers

- **Code:** the Express route and OAuth plumbing live in [`server/routes/mcp.ts`](../server/routes/mcp.ts); tool definitions and schemas in [`server/lib/mcpTools.ts`](../server/lib/mcpTools.ts); all writes go through [`server/lib/tripWrites.ts`](../server/lib/tripWrites.ts).
- **Config:** `MCP_PUBLIC_BASE_URL` sets the public origin advertised in discovery (default `https://wanderluxe.io`). The server also needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. It uses the anon key plus the user's token, never the service-role key.
- **Run locally:** `npm run dev`, then point [MCP Inspector](https://github.com/modelcontextprotocol/inspector) at `http://localhost:5001/mcp`. To connect Claude to a local build, expose it through an HTTPS tunnel and set `MCP_PUBLIC_BASE_URL` to the tunnel's origin.
- **Tests:** `npx vitest run server/lib/mcpTools.test.ts server/lib/tripWrites.test.ts` covers schemas, annotations and write logic. `npm run evals:mcp` runs the full read/write lifecycle plus auth, row-level security and discovery checks against a real account (see `evals/`).
- **Adding a tool:** give it a `title`, `readOnlyHint` and `destructiveHint`, validate every argument with zod, route writes through `tripWrites.ts`, and add it to this page. The registry test fails on a tool without a title or hints.
