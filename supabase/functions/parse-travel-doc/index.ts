// supabase/functions/parse-travel-doc/index.ts
// Deno Edge Function: OCR + structured extraction via Gemini 2.5 Flash.
// Returns a canonical response: { itemType, fields, missingRequired, meta } for single-item mode
// OR { items: [...], meta } for multi-item mode (when itemType is not specified).
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://wanderluxe.io';
const ALLOWED_ORIGIN_PATTERNS = [
  /\.replit\.dev(:\d+)?$/,
  /\.repl\.co(:\d+)?$/,
  /\.replit\.app(:\d+)?$/,
];
function getCorsHeaders(origin: string | null): Record<string, string> {
  let allowOrigin = ALLOWED_ORIGIN;
  if (origin && ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin))) {
    allowOrigin = origin;
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
  };
}
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
// Hardcoded model — locked at the function layer so the request path cannot
// redirect to a different model.
const MODEL = "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_ITEMS = 10; // Maximum items to extract in multi-item mode
// --- Date inference configuration ---
/**
 * Business rule:
 * - If the document omits a year, assume it is one of 2025, 2026, or 2027.
 * - Prefer a year that matches day-of-week + day number (if present).
 * - Otherwise choose the nearest date in the future relative to "today" (server date).
 *
 * NOTE: If a 4-digit year is explicitly present on the document, use it verbatim.
 */ const TODAY_UTC = new Date(); // server time; we use UTC math below
const BASE_YEAR = Math.max(2025, TODAY_UTC.getUTCFullYear());
const INFER_YEARS = [
  BASE_YEAR,
  BASE_YEAR + 1,
  BASE_YEAR + 2
]; // e.g., 2025–2027 as requested
// ----------------- CORS helpers -----------------
let cors: Record<string, string> = getCorsHeaders(null);
const ok = (json: unknown, status = 200)=>new Response(JSON.stringify(json), {
    status,
    headers: {
      "content-type": "application/json",
      ...cors
    }
  });
const err = (msg: string, status = 400)=>ok({
    error: msg
  }, status);
// ----------------- File → inline base64 -----------------
// SAFE: chunked base64 conversion (prevents call stack overflow). Returns the
// raw base64 string + mime, which Gemini consumes via inlineData.
const toInlineData = async (file)=>{
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000; // 32k chars per slice
  for(let i = 0; i < bytes.length; i += CHUNK){
    const slice = bytes.subarray(i, i + CHUNK);
    binary += String.fromCharCode.apply(null, slice);
  }
  return {
    data: btoa(binary),
    mimeType: file.type || "application/octet-stream",
  };
};
// ----------------- Prompt builder -----------------
/**
 * We encode deterministic date rules directly in the prompt and also request a small __meta block
 * so we can tell if a year was explicitly present on the document for each date field.
 */ const promptFor = (type)=>{
  const todayIso = [
    TODAY_UTC.getUTCFullYear(),
    String(TODAY_UTC.getUTCMonth() + 1).padStart(2, "0"),
    String(TODAY_UTC.getUTCDate()).padStart(2, "0")
  ].join("-");
  const sys = [
    "You extract structured JSON from travel booking images. Output JSON only, no prose.",
    "",
    "DATE EXTRACTION (critical — follow exactly):",
    "- Dates MUST always be in full ISO format YYYY-MM-DD. Never emit a partial date.",
    "- If a 4-digit year is visible on the document, use it verbatim.",
    "- If NO year is visible (common on boarding passes and screenshots), use 0000 as a placeholder year — e.g., '0000-11-25'. Do NOT return null just because the year is missing; the server will infer the year.",
    "- Only return null for a date field if the month or day cannot be read at all.",
    "",
    "TIME EXTRACTION (critical — follow exactly):",
    "- Times MUST always be in 24-hour HH:mm format. Convert AM/PM to 24-hour (e.g., '8:45 PM' → '20:45', '12:30 AM' → '00:30', '12:15 PM' → '12:15').",
    "- Pad single-digit hours with a leading zero ('9:05' → '09:05').",
    "- Only return null if the time is not visible at all.",
    "",
    "GENERAL RULES:",
    "- Return null only for fields that are not visible on the document.",
    "- Be precise with confirmation numbers, addresses, phone numbers, and costs."
  ].join("\n");
  // Per-type extraction schemas
  const map = {
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
  "currency": string|null
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
  "currency": string|null
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
  "currency": string|null
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
  "currency": string|null
}`
  };
  return {
    system: sys,
    user: map[type]
  };
};

// ----------------- Multi-item extraction prompt -----------------
/**
 * Prompt for auto-detecting and extracting ALL items from a travel document.
 * Returns an array of items with their types.
 */
const multiItemPrompt = ()=>{
  const sys = [
    "You extract structured JSON from travel booking images. Output JSON only, no prose.",
    "",
    "DATE EXTRACTION (critical — follow exactly):",
    "- Dates MUST always be in full ISO format YYYY-MM-DD. Never emit a partial date.",
    "- If a 4-digit year is visible on the document, use it verbatim.",
    "- If NO year is visible (common on boarding passes and screenshots), use 0000 as a placeholder year — e.g., '0000-11-25'. Do NOT return null just because the year is missing; the server will infer the year.",
    "- Only return null for a date field if the month or day cannot be read at all.",
    "",
    "TIME EXTRACTION (critical — follow exactly):",
    "- Times MUST always be in 24-hour HH:mm format. Convert AM/PM to 24-hour (e.g., '8:45 PM' → '20:45', '12:30 AM' → '00:30', '12:15 PM' → '12:15').",
    "- Pad single-digit hours with a leading zero ('9:05' → '09:05').",
    "- Only return null if the time is not visible at all.",
    "",
    "GENERAL RULES:",
    "- Return null only for fields that are not visible on the document.",
    "- Be precise with confirmation numbers, addresses, phone numbers, and costs.",
    "- Each flight leg (outbound vs return) should be a SEPARATE item.",
    "- Multi-night hotel stays should be ONE item (not per-night).",
    `- Maximum ${MAX_ITEMS} items per document.`
  ].join("\n");

  const user = `Analyze this travel document and extract ALL distinct bookable items.

For each item found, determine its type and extract the appropriate fields:

TRANSPORTATION (flights, trains, ferries, shuttles, car rentals, car services):
{
  "itemType": "transportation",
  "fields": {
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
    "currency": string|null
  },
  "confidence": 0.0-1.0
}

ACCOMMODATION (hotels, vacation rentals, hostels):
{
  "itemType": "accommodation",
  "fields": {
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
    "currency": string|null
  },
  "confidence": 0.0-1.0
}

ACTIVITY (tours, tickets, attractions, events):
{
  "itemType": "activity",
  "fields": {
    "name": string|null,
    "date": "YYYY-MM-DD"|null,
    "start_time": "HH:mm"|null,
    "end_time": "HH:mm"|null,
    "location": string|null,
    "provider": string|null,
    "confirmation_number": string|null,
    "notes": string|null,
    "cost": number|null,
    "currency": string|null
  },
  "confidence": 0.0-1.0
}

RESERVATION (restaurants, dining):
{
  "itemType": "reservation",
  "fields": {
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
    "currency": string|null
  },
  "confidence": 0.0-1.0
}

Return JSON in this exact format:
{
  "items": [
    { "itemType": "...", "fields": {...}, "confidence": 0.95 },
    ...
  ],
  "totalDetected": number
}

If no items are found, return: { "items": [], "totalDetected": 0 }`;

  return { system: sys, user };
};
// ----------------- Required-by-type -----------------
const requiredByType = {
  accommodation: [
    "name",
    "check_in_date",
    "check_out_date"
  ],
  transportation: [
    "type",
    "departure_location",
    "arrival_location",
    "departure_date"
  ],
  activity: [
    "name",
    "date"
  ],
  reservation: [
    "restaurant_name",
    "date",
    "time"
  ]
};
// ----------------- Normalization helpers -----------------
// Tolerant time parser: accepts "HH:mm", "H:mm", "h:mm AM/PM", "h AM/PM", and 4-digit military.
const fixTime = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const to24 = (h: number, min: number) =>
    h >= 0 && h <= 23 && min >= 0 && min <= 59 ? `${pad2(h)}:${pad2(min)}` : null;
  const ampmTo24 = (h: number, isPm: boolean) => {
    if (h < 1 || h > 12) return null;
    const base = h === 12 ? 0 : h;
    return base + (isPm ? 12 : 0);
  };

  let m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (m) return to24(Number(m[1]), Number(m[2]));

  m = /^(\d{1,2}):(\d{2})\s*([ap])\.?\s*m\.?$/i.exec(s);
  if (m) {
    const h24 = ampmTo24(Number(m[1]), m[3].toLowerCase() === "p");
    return h24 === null ? null : to24(h24, Number(m[2]));
  }

  m = /^(\d{1,2})\s*([ap])\.?\s*m\.?$/i.exec(s);
  if (m) {
    const h24 = ampmTo24(Number(m[1]), m[2].toLowerCase() === "p");
    return h24 === null ? null : to24(h24, 0);
  }

  m = /^(\d{2})(\d{2})$/.exec(s);
  if (m) return to24(Number(m[1]), Number(m[2]));

  return null;
};

const fixDate = (v: unknown): string | null =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

const normalizeFields = (type, fields)=>{
  const out = {
    ...fields
  };
  // force empty strings → nulls for optional fields
  for (const k of Object.keys(out)){
    if (out[k] === "") out[k] = null;
  }
  const fix = (k, f)=>{
    if (k in out) out[k] = f(out[k]);
  };
  if (type === "accommodation") {
    fix("check_in_date", fixDate);
    fix("check_out_date", fixDate);
    fix("check_in_time", fixTime);
    fix("check_out_time", fixTime);
  } else if (type === "transportation") {
    for (const k of [
      "departure_date",
      "arrival_date"
    ])fix(k, fixDate);
    for (const k of [
      "departure_time",
      "arrival_time"
    ])fix(k, fixTime);
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
const pad2 = (n)=>String(n).padStart(2, "0");
const iso = (y, m, d)=>`${y}-${pad2(m)}-${pad2(d)}`;
const toUTC = (y, m, d)=>new Date(Date.UTC(y, m - 1, d));
const isValidYMD = (y, m, d)=>{
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = toUTC(y, m, d);
  return dt.getUTCFullYear() === y && dt.getUTCMonth() + 1 === m && dt.getUTCDate() === d;
};
const parseIso = (s)=>{
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  return isValidYMD(y, mo, d) ? {
    y,
    m: mo,
    d
  } : null;
};
const DOW_MAP = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  weds: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6
};
const MONTH_MAP = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12
};
const parseDowMaybe = (s)=>{
  if (typeof s !== "string" || !s) return null;
  const k = s.trim().toLowerCase();
  return DOW_MAP[k] ?? null;
};
const parseMonthMaybe = (s)=>{
  if (s == null) return null;
  if (typeof s === "number") return s >= 1 && s <= 12 ? s : null;
  const t = s.trim().toLowerCase();
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  return MONTH_MAP[t] ?? null;
};
const parseDayMaybe = (v)=>{
  if (typeof v === "number") return v >= 1 && v <= 31 ? v : null;
  if (typeof v !== "string") return null;
  const m = v.trim().toLowerCase().match(/^(\d{1,2})/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 31 ? n : null;
};
const pickFutureByDow = (month, day, wantDow, now)=>{
  const candidates = INFER_YEARS.map((y)=>({
      y,
      dt: toUTC(y, month, day)
    })).filter(({ dt })=>dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day && dt.getUTCDay() === wantDow);
  // Prefer on/after TODAY, else earliest match
  const onOrAfter = candidates.filter(({ dt })=>dt >= stripTime(now));
  if (onOrAfter.length) return onOrAfter.sort((a, b)=>+a.dt - +b.dt)[0].dt;
  if (candidates.length) return candidates.sort((a, b)=>+a.dt - +b.dt)[0].dt;
  return null;
};
const stripTime = (d)=>new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
const pickNearestFuture = (month, day, now)=>{
  const today = stripTime(now);
  const ordered = INFER_YEARS.map((y)=>toUTC(y, month, day)).filter((dt)=>dt.getUTCMonth() + 1 === month && dt.getUTCDate() === day);
  const onOrAfter = ordered.filter((dt)=>dt >= today).sort((a, b)=>+a - +b);
  if (onOrAfter.length) return onOrAfter[0];
  // If none are in the future (e.g., all three are in the past), pick the earliest in the set.
  return ordered.sort((a, b)=>+a - +b)[0] ?? null;
};
/**
 * Adjusts dates according to business rules.
 * Since the AI extracts dates as-is without inference, we apply year correction
 * server-side to ensure dates fall within the expected range (2025-2027+).
 */ const DATE_FIELDS_BY_TYPE = {
  accommodation: [
    "check_in_date",
    "check_out_date"
  ],
  transportation: [
    "departure_date",
    "arrival_date"
  ],
  activity: [
    "date"
  ],
  reservation: [
    "date"
  ]
};
const correctOutOfRangeYear = (fields, key)=>{
  const current = typeof fields[key] === "string" ? fields[key] : null;
  if (!current) return;
  // Handle explicit "0000" placeholder the model emits when no year is visible on the document.
  const placeholder = /^0000-(\d{2})-(\d{2})$/.exec(current);
  if (placeholder) {
    const m = Number(placeholder[1]);
    const d = Number(placeholder[2]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const picked = pickNearestFuture(m, d, TODAY_UTC);
      if (picked) {
        fields[key] = iso(picked.getUTCFullYear(), m, d);
        return;
      }
    }
    fields[key] = null;
    return;
  }
  const parsed = parseIso(current);
  if (!parsed) return;
  const { y, m, d } = parsed;
  if (INFER_YEARS.includes(y)) return;
  const picked = pickNearestFuture(m, d, TODAY_UTC);
  if (picked) fields[key] = iso(picked.getUTCFullYear(), m, d);
};

const ensureCheckoutAfterCheckin = (fields)=>{
  if (typeof fields["check_in_date"] !== "string" || typeof fields["check_out_date"] !== "string") return;
  const ci = parseIso(fields["check_in_date"]);
  const co = parseIso(fields["check_out_date"]);
  if (!ci || !co) return;
  const ciDt = toUTC(ci.y, ci.m, ci.d);
  const coDt = toUTC(co.y, co.m, co.d);
  if (coDt >= ciDt) return;
  const picked = pickNearestFuture(co.m, co.d, ciDt);
  if (picked) {
    fields["check_out_date"] = iso(picked.getUTCFullYear(), co.m, co.d);
  } else {
    const next = new Date(ciDt.getTime() + 24 * 60 * 60 * 1000);
    fields["check_out_date"] = iso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
  }
};

const applyDateAssumptions = (itemType, fields)=>{
  const targets = DATE_FIELDS_BY_TYPE[itemType] ?? [];
  for (const key of targets) correctOutOfRangeYear(fields, key);
  if (itemType === "accommodation") ensureCheckoutAfterCheckin(fields);
  return fields;
};
// ----------------- Shared helpers -----------------
const buildVisionPayload = (system, user, inlineData, maxTokens)=>({
  contents: [
    {
      role: "user",
      parts: [
        { text: user },
        { inlineData }
      ]
    }
  ],
  systemInstruction: { parts: [{ text: system }] },
  generationConfig: {
    temperature: 0,
    maxOutputTokens: maxTokens,
    responseMimeType: "application/json",
    // gemini-2.5-flash is a thinking model and thinking tokens count against
    // maxOutputTokens. For deterministic structured extraction we don't need
    // thinking, and on real document images it can consume the entire token
    // budget — leaving the JSON output empty ("No content generated") or
    // truncated (invalid JSON), both of which surface as a 500. Disable it.
    thinkingConfig: { thinkingBudget: 0 }
  }
});

const callGemini = async (payload)=>{
  const url = `${GEMINI_BASE}/models/${MODEL}:generateContent`;
  const aiRes = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": GEMINI_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  if (!aiRes.ok) {
    const txt = await aiRes.text();
    console.error("Gemini error:", aiRes.status, txt);
    return { error: err("Gemini request failed", 502) };
  }
  const json = await aiRes.json();
  // generateContent returns candidates[0].content.parts[]; with
  // responseMimeType=application/json the model's JSON is in the text part.
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const raw = parts.map((p)=>typeof p?.text === "string" ? p.text : "").join("").trim();
  if (!raw) return { error: err("No content generated", 500) };
  try {
    return { data: JSON.parse(raw) };
  } catch {
    return { error: err("Model returned non-JSON output", 500) };
  }
};

const processExtractedItem = (item, idx)=>{
  const type = item.itemType;
  const fields = item.fields || {};
  const confidence = typeof item.confidence === "number" ? item.confidence : 0.5;
  const withAssumptions = applyDateAssumptions(type, fields);
  const normalized = normalizeFields(type, withAssumptions);
  const required = requiredByType[type] || [];
  const missingRequired = required.filter((k)=>!normalized[k]);
  return {
    id: `item-${idx}-${Date.now()}`,
    itemType: type,
    fields: normalized,
    missingRequired,
    confidence,
    status: "pending"
  };
};

const authenticateRequest = async (req)=>{
  const authHeader = req.headers.get("authorization") ?? "";
  const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userErr } = await supa.auth.getUser();
  if (userErr || !userData?.user) return null;
  return { user: userData.user, supa };
};

// Daily OCR cap (default 20/day per user, every tier). Counted before the
// Gemini call so a failed parse still consumes an attempt — this endpoint is
// the most abusable one we run, so we count attempts, not successes.
const checkImportAllowance = async (supa, userId)=>{
  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supa.rpc("increment_ai_import_usage", {
    check_user_id: userId,
    check_date: today
  });
  if (error || !data?.[0]) {
    console.error("increment_ai_import_usage failed", error);
    // Fail open on infra errors: a broken counter should not take OCR down.
    return { allowed: true };
  }
  return {
    allowed: !!data[0].allowed,
    used: data[0].current_count,
    limit: data[0].daily_limit
  };
};

const validateFile = (file)=>{
  if (!file) return "Missing file";
  if (!("type" in file)) return "Missing file content-type";
  if (!["image/", "application/pdf"].some((p)=>file.type.startsWith(p))) {
    return "Unsupported file type. Please upload an image or PDF.";
  }
  if (file.size > MAX_FILE_BYTES) return "File too large (max 15 MB)";
  return null;
};

const handleMultiItem = async (inlineData, file)=>{
  const { system, user } = multiItemPrompt();
  const payload = buildVisionPayload(system, user, inlineData, 4000);
  const result = await callGemini(payload);
  if (result.error) return result.error;

  const rawItems = Array.isArray(result.data.items) ? result.data.items : [];
  const processedItems = rawItems.slice(0, MAX_ITEMS).map(processExtractedItem);

  return ok({
    items: processedItems,
    meta: {
      model: MODEL,
      pagesUsed: 1,
      totalItemsDetected: result.data.totalDetected || processedItems.length,
      originalFileName: file.name || "document"
    }
  });
};

const handleSingleItem = async (itemType, inlineData, file)=>{
  const validTypes = ["accommodation", "transportation", "activity", "reservation"];
  if (!validTypes.includes(itemType)) {
    return err(`Invalid itemType. Must be one of: ${validTypes.join(", ")} or 'auto' for multi-item mode`);
  }

  const { system, user } = promptFor(itemType);
  const payload = buildVisionPayload(system, user, inlineData, 1200);
  const result = await callGemini(payload);
  if (result.error) return result.error;

  const withAssumptions = applyDateAssumptions(itemType, result.data);
  const normalized = normalizeFields(itemType, withAssumptions);
  const required = requiredByType[itemType] || [];
  const missingRequired = required.filter((k)=>!normalized[k]);

  return ok({
    itemType,
    fields: normalized,
    missingRequired,
    meta: { model: MODEL, pagesUsed: 1 }
  });
};

// ----------------- Handler -----------------
serve(async (req)=>{
  try {
    cors = getCorsHeaders(req.headers.get('origin'));
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: cors });
    }
    if (req.method !== "POST") return err("Method not allowed", 405);

    const auth = await authenticateRequest(req);
    if (!auth) return err("Unauthorized", 401);
    const { user, supa } = auth;

    const ctype = req.headers.get("content-type") || "";
    if (!ctype.includes("multipart/form-data")) {
      return err("Send multipart/form-data with fields: file (required), itemType (optional)");
    }

    const form = await req.formData();
    const file = form.get("file");
    const fileError = validateFile(file);
    if (fileError) return err(fileError);

    // Enforce the daily import cap only once the request carries a valid file,
    // so malformed uploads don't burn an attempt.
    const allowance = await checkImportAllowance(supa, user.id);
    if (!allowance.allowed) {
      return ok({
        error: `Daily document import limit reached (${allowance.limit ?? 20} per day). Your imports reset at midnight UTC.`,
        code: "DAILY_LIMIT_REACHED",
        used: allowance.used,
        limit: allowance.limit
      }, 429);
    }

    const itemType = String(form.get("itemType") ?? "").toLowerCase();
    const isMultiItemMode = !itemType || itemType === "auto";
    const inlineData = await toInlineData(file);

    if (isMultiItemMode) return await handleMultiItem(inlineData, file);
    return await handleSingleItem(itemType, inlineData, file);
  } catch (e) {
    console.error("parse-travel-doc error", e);
    return err("Server error", 500);
  }
});
