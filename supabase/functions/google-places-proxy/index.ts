// supabase/functions/parse-travel-doc/index.ts
// Deno Edge Function: OCR + structured extraction via OpenAI (gpt-4o-mini by default).
// Returns a canonical response: { itemType, fields, missingRequired, meta }.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_OCR_MODEL") ?? "gpt-4o-mini";
const ALLOW_ORIGIN = Deno.env.get("ALLOW_ORIGIN") ?? "*"; // set to your app URL in prod
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

// --- Date inference configuration ---
/**
 * Business rule:
 * - If the document omits a year, assume it is one of 2025, 2026, or 2027.
 * - Prefer a year that matches day-of-week + day number (if present).
 * - Otherwise choose the nearest date in the future relative to "today" (server date).
 *
 * NOTE: If a 4-digit year is explicitly present on the document, use it verbatim.
 */
const TODAY_UTC = new Date(); // server time; we use UTC math below
const BASE_YEAR = Math.max(2025, TODAY_UTC.getUTCFullYear());
const INFER_YEARS = [BASE_YEAR, BASE_YEAR + 1, BASE_YEAR + 2]; // e.g., 2025–2027 as requested

// ----------------- CORS helpers -----------------
const cors = {
  "access-control-allow-origin": ALLOW_ORIGIN,
  "access-control-allow-headers": "authorization, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const ok = (json: unknown, status = 200) =>
  new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json", ...cors },
  });
const err = (msg: string, status = 400) => ok({ error: msg }, status);

// ----------------- File → data URL -----------------
// SAFE: chunked base64 conversion (prevents call stack overflow)
const toDataUrl = async (file: File) => {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000; // 32k chars per slice
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  const base64 = btoa(binary);
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${base64}`;
};

// ----------------- Prompt builder -----------------
/**
 * We encode deterministic date rules directly in the prompt and also request a small __meta block
 * so we can tell if a year was explicitly present on the document for each date field.
 */
const promptFor = (type: string) => {
  const todayIso = [
    TODAY_UTC.getUTCFullYear(),
    String(TODAY_UTC.getUTCMonth() + 1).padStart(2, "0"),
    String(TODAY_UTC.getUTCDate()).padStart(2, "0"),
  ].join("-");

  const sys = [
    "You extract structured JSON from travel booking images. Output JSON only, no prose.",
    "",
    "DATE RULES (apply deterministically):",
    `- Treat TODAY (UTC) as ${todayIso}.`,
    `- If a date on the document lacks a visible 4-digit year, you MUST infer the year using ONLY {${INFER_YEARS.join(
      ", "
    )}}.`,
    "- Prefer a year that makes the day-of-week match the text (e.g., “Tuesday the 23rd”) when month & day are known; if multiple match, pick the earliest on/after TODAY. If none are on/after TODAY, pick the earliest in the set.",
    "- Otherwise (no day-of-week clue), choose the nearest date in the FUTURE relative to TODAY using that month/day.",
    "- If a 4-digit year is explicitly present on the document, use it verbatim (even if outside that set).",
    "- All dates must be ISO `YYYY-MM-DD`; times must be `HH:mm` (24h). Use null for unknown.",
    "",
    "TRACE META:",
    "- Also include `__meta.date_hints`: an array of objects with keys:",
    "  { field: string, source_text: string|null, year_was_explicit: boolean, dow: string|null, month: string|null, day: number|null }",
    "- Provide one entry per date field you output so the server can verify your inferences.",
  ].join("\n");

  // Per-type shapes with __meta block appended
  const map: Record<string, string> = {
    accommodation: `Extract hotel booking details. Return ONLY JSON:
{
  "name": string|null,
  "address": string|null,
  "phone": string|null,
  "website": string|null,
  "check_in_date": "YYYY-MM-DD"|null,
  "check_in_time": "HH:mm"|null,
  "check_out_date": "YYYY-MM-DD"|null,
  "check_out_time": "HH:mm"|null,
  "confirmation_number": string|null,
  "provider": string|null,
  "cost": number|null,
  "currency": string|null,
  "__meta": {
    "date_hints": [
      { "field": "check_in_date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null },
      { "field": "check_out_date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null }
    ]
  }
}`,
    transportation: `Extract transport details. Return ONLY JSON:
{
  "type": "flight"|"train"|"shuttle"|"car_service"|"ferry"|"rental_car"|"other",
  "carrier": string|null,
  "departure_location": string|null,
  "arrival_location": string|null,
  "departure_date": "YYYY-MM-DD"|null,
  "departure_time": "HH:mm"|null,
  "arrival_date": "YYYY-MM-DD"|null,
  "arrival_time": "HH:mm"|null,
  "confirmation_number": string|null,
  "cost": number|null,
  "currency": string|null,
  "__meta": {
    "date_hints": [
      { "field": "departure_date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null },
      { "field": "arrival_date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null }
    ]
  }
}`,
    activity: `Extract activity ticket details. Return ONLY JSON:
{
  "name": string|null,
  "date": "YYYY-MM-DD"|null,
  "start_time": "HH:mm"|null,
  "end_time": "HH:mm"|null,
  "location": string|null,
  "provider": string|null,
  "confirmation_number": string|null,
  "notes": string|null,
  "cost": number|null,
  "currency": string|null,
  "__meta": {
    "date_hints": [
      { "field": "date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null }
    ]
  }
}`,
    reservation: `Extract restaurant reservation details. Return ONLY JSON:
{
  "restaurant_name": string|null,
  "date": "YYYY-MM-DD"|null,
  "time": "HH:mm"|null,
  "party_size": number|null,
  "address": string|null,
  "phone": string|null,
  "website": string|null,
  "confirmation_number": string|null,
  "notes": string|null,
  "cost": number|null,
  "currency": string|null,
  "__meta": {
    "date_hints": [
      { "field": "date", "source_text": string|null, "year_was_explicit": boolean, "dow": string|null, "month": string|null, "day": number|null }
    ]
  }
}`,
  };

  return { system: sys, user: map[type] };
};

// ----------------- Required-by-type -----------------
const requiredByType: Record<string, string[]> = {
  accommodation: ["name", "check_in_date", "check_out_date"],
  transportation: ["type", "departure_location", "arrival_location", "departure_date"],
  activity: ["name", "date"],
  reservation: ["restaurant_name", "date", "time"],
};

// ----------------- Normalization helpers -----------------
const normalizeFields = (type: string, fields: Record<string, any>) => {
  const out: Record<string, any> = { ...fields };
  // force empty strings → nulls for optional fields
  for (const k of Object.keys(out)) {
    if (out[k] === "") out[k] = null;
  }
  const fixTime = (v: unknown) =>
    typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null;
  const fixDate = (v: unknown) =>
    typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  const fix = (k: string, f: (v: unknown) => unknown) => {
    if (k in out) out[k] = f(out[k]);
  };

  if (type === "accommodation") {
    fix("check_in_date", fixDate);
    fix("check_out_date", fixDate);
    fix("check_in_time", fixTime);
    fix("check_out_time", fixTime);
  } else if (type === "transportation") {
    for (const k of ["departure_date", "arrival_date"]) fix(k, fixDate);
    for (const k of ["departure_time", "arrival_time"]) fix(k, fixTime);
    // Default type if missing but carrier + airports suggest a flight
    if (!out["type"] && (out["carrier"] || out["departure_location"] || out["arrival_location"])) {
      out["type"] = "flight";
    }
  } else if (type === "activity") {
    fix("date", fixDate);
    fix("start_time", fixTime);
    fix("end_time", fixTime);
  } else if (type === "reservation") {
    fix("date", fixDate);
    fix("time", fixTime);
  }
  return out;
};

// ----------------- Year inference & correction -----------------

const pad2 = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad2(m)}-${pad2(d)}`;
const toUTC = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const isValidYMD = (y: number, m: number, d: number) => {
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = toUTC(y, m, d);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
};
const parseIso = (s: string | null) => {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return isValidYMD(y, mo, d) ? { y, m: mo, d } : null;
};

const DOW_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};
const MONTH_MAP: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

const parseDowMaybe = (s: unknown): number | null => {
  if (typeof s !== "string" || !s) return null;
  const k = s.trim().toLowerCase();
  return DOW_MAP[k] ?? null;
};
const parseMonthMaybe = (s: unknown): number | null => {
  if (s == null) return null;
  if (typeof s === "number") return s >= 1 && s <= 12 ? s : null;
  const t = (s as string).trim().toLowerCase();
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  return MONTH_MAP[t] ?? null;
};
const parseDayMaybe = (v: unknown): number | null => {
  if (typeof v === "number") return v >= 1 && v <= 31 ? v : null;
  if (typeof v !== "string") return null;
  const m = v.trim().toLowerCase().match(/^(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 31 ? n : null;
};

const pickFutureByDow = (month: number, day: number, wantDow: number, now: Date) => {
  const candidates = INFER_YEARS
    .map((y) => ({ y, dt: toUTC(y, month, day) }))
    .filter(({ dt }) => dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day && dt.getUTCDay() === wantDow);

  // Prefer on/after TODAY, else earliest match
  const onOrAfter = candidates.filter(({ dt }) => dt >= stripTime(now));
  if (onOrAfter.length) return onOrAfter.sort((a, b) => +a.dt - +b.dt)[0].dt;
  if (candidates.length) return candidates.sort((a, b) => +a.dt - +b.dt)[0].dt;
  return null;
};

const stripTime = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const pickNearestFuture = (month: number, day: number, now: Date) => {
  const today = stripTime(now);
  const ordered = INFER_YEARS.map((y) => toUTC(y, month, day)).filter(
    (dt) => dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day
  );
  const onOrAfter = ordered.filter((dt) => dt >= today).sort((a, b) => +a - +b);
  if (onOrAfter.length) return onOrAfter[0];
  // If none are in the future (e.g., all three are in the past), pick the earliest in the set.
  return ordered.sort((a, b) => +a - +b)[0] ?? null;
};

/**
 * Adjusts dates according to business rules **only when the year was not explicit**.
 * Uses model-provided hints if present; otherwise relies on the model having already
 * applied the rules in its own output.
 */
const DATE_FIELDS_BY_TYPE: Record<string, string[]> = {
  accommodation: ["check_in_date", "check_out_date"],
  transportation: ["departure_date", "arrival_date"],
  activity: ["date"],
  reservation: ["date"],
};

type DateHint = {
  field: string;
  source_text: string | null;
  year_was_explicit: boolean;
  dow: string | null;
  month: string | null | number;
  day: number | null | string;
};

const applyDateAssumptions = (itemType: string, fields: Record<string, any>) => {
  const hints: DateHint[] = fields?.__meta?.date_hints ?? [];
  const hintMap = new Map<string, DateHint>();
  for (const h of hints) {
    if (h && typeof h.field === "string") hintMap.set(h.field, h);
  }

  const targets = DATE_FIELDS_BY_TYPE[itemType] ?? [];
  for (const key of targets) {
    const current = typeof fields[key] === "string" ? fields[key] : null;
    const parsed = parseIso(current);
    const hint = hintMap.get(key);

    // Only act when the year wasn't explicit (or we can safely infer)
    const yearExplicit = hint?.year_was_explicit === true;

    // If we have no ISO date at all, try to build one from hint month/day.
    if (!parsed && hint && !yearExplicit) {
      const m = parseMonthMaybe(hint.month);
      const d = parseDayMaybe(hint.day);
      if (m && d) {
        const wantDow = parseDowMaybe(hint.dow);
        let picked: Date | null = null;
        if (wantDow != null) picked = pickFutureByDow(m, d, wantDow, TODAY_UTC);
        if (!picked) picked = pickNearestFuture(m, d, TODAY_UTC);
        if (picked) fields[key] = iso(picked.getUTCFullYear(), m, d);
      }
      continue;
    }

    // If a valid ISO date is present but the model "guessed" an old year (common: 2023/2024),
    // and the year wasn't explicit, re-infer using our rules.
    if (parsed && !yearExplicit) {
      const { y, m, d } = parsed;
      const wantDow = hint ? parseDowMaybe(hint.dow) : null;

      // If year is before our allowed window, or if caller wants strict future, fix it.
      if (!INFER_YEARS.includes(y)) {
        let picked: Date | null = null;
        if (wantDow != null) picked = pickFutureByDow(m, d, wantDow, TODAY_UTC);
        if (!picked) picked = pickNearestFuture(m, d, TODAY_UTC);
        if (picked) fields[key] = iso(picked.getUTCFullYear(), m, d);
      }
    }
  }

  // Optional: basic coherence for accommodation check-in/out (ensure check_out >= check_in if both inferred)
  if (itemType === "accommodation" && typeof fields["check_in_date"] === "string" && typeof fields["check_out_date"] === "string") {
    const ci = parseIso(fields["check_in_date"]);
    const co = parseIso(fields["check_out_date"]);
    if (ci && co) {
      const ciDt = toUTC(ci.y, ci.m, ci.d);
      const coDt = toUTC(co.y, co.m, co.d);
      if (coDt < ciDt) {
        // push checkout to the nearest valid future date with same month/day as hinted (if any),
        // otherwise, minimally adjust to ciDt+1 day.
        const hint = (fields?.__meta?.date_hints || []).find((h: DateHint) => h.field === "check_out_date");
        if (hint) {
          const hm = parseMonthMaybe(hint.month) ?? co.m;
          const hd = parseDayMaybe(hint.day) ?? co.d;
          const wantDow = parseDowMaybe(hint.dow);
          let picked: Date | null = null;
          if (wantDow != null) picked = pickFutureByDow(hm, hd, wantDow, ciDt);
          if (!picked) picked = pickNearestFuture(hm, hd, ciDt);
          if (picked) fields["check_out_date"] = iso(picked.getUTCFullYear(), hm, hd);
        } else {
          // Fallback: next day
          const next = new Date(ciDt.getTime() + 24 * 60 * 60 * 1000);
          fields["check_out_date"] = iso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
        }
      }
    }
  }

  return fields;
};

// ----------------- Handler -----------------
serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }
    if (req.method !== "POST") return err("Method not allowed", 405);

    // ---- Auth: verify JWT ----
    const authHeader = req.headers.get("authorization") ?? "";
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) return err("Unauthorized", 401);

    // ---- Parse form-data ----
    const ctype = req.headers.get("content-type") || "";
    if (!ctype.includes("multipart/form-data")) {
      return err("Send multipart/form-data with fields: itemType, file");
    }
    const form = await req.formData();
    const file = form.get("file") as unknown as File | null;
    const itemType = String(form.get("itemType") ?? "");
    if (!file || !itemType) return err("Missing file or itemType");
    if (!("type" in (file as File))) return err("Missing file content-type");
    if (!["image/", "application/pdf"].some((p) => (file as File).type.startsWith(p))) {
      return err("Unsupported file type");
    }
    if ((file as File).size > MAX_FILE_BYTES) return err("File too large (max 15 MB)");

    // ---- Build prompt ----
    const { system, user } = promptFor(itemType);
    const dataUrl = await toDataUrl(file as File);

    // ---- Call OpenAI ----
    const payload = {
      model: MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: user },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 800,
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("OpenAI error:", aiRes.status, txt);
      return err("OpenAI request failed", 502);
    }

    const json = await aiRes.json();
    const raw = json?.choices?.[0]?.message?.content?.trim();
    if (!raw) return err("No content generated", 500);

    let fields: Record<string, any>;
    try {
      fields = JSON.parse(raw);
    } catch {
      return err("Model returned non-JSON output", 500);
    }

    // --- Apply deterministic date assumptions BEFORE normalization
    const withAssumptions = applyDateAssumptions(itemType, fields);

    // Normalize + compute missing
    const normalized = normalizeFields(itemType, withAssumptions);
    const required = requiredByType[itemType] || [];
    const missingRequired = required.filter((k) => !normalized[k]);

    // Canonical response
    return ok({
      itemType,
      fields: normalized,
      missingRequired,
      meta: {
        model: MODEL,
        pagesUsed: (file as File).type === "application/pdf" ? 1 : 1,
      },
    });
  } catch (e) {
    console.error("parse-travel-doc error", e);
    return err("Server error", 500);
  }
});
