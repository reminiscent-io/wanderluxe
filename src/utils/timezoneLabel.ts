/**
 * Timezone display helpers. Timezone here is a LABEL layered on floating
 * wall-clock times — nothing in this module converts a time value.
 */

export function effectiveTz(
  entityTz: string | null | undefined,
  tripTz: string | null | undefined,
): string | null {
  return entityTz ?? tripTz ?? null;
}

/** DST-correct short zone label (EST vs EDT) evaluated at noon UTC on `onDate`. */
export function tzAbbrev(tz: string, onDate: string): string {
  if (!tz || !onDate) return '';
  const m = onDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return '';
  try {
    const probe = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' }).formatToParts(probe);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

export function shouldShowBadge(
  entityTz: string | null | undefined,
  tripTz: string | null | undefined,
): boolean {
  const eff = effectiveTz(entityTz, tripTz);
  return !!eff && eff !== (tripTz ?? null);
}

/**
 * Zone labels for a transport leg. Both labels when the two effective zones
 * differ; both = one shared label when the leg sits in a single zone that
 * differs from the trip; empty otherwise (no badge).
 */
export function transportTzLabels(
  depTz: string | null | undefined,
  arrTz: string | null | undefined,
  tripTz: string | null | undefined,
  onDate: string,
): { dep: string; arr: string } {
  const effDep = effectiveTz(depTz, tripTz);
  const effArr = effectiveTz(arrTz, tripTz);
  if (effDep && effArr && effDep !== effArr) {
    return { dep: tzAbbrev(effDep, onDate), arr: tzAbbrev(effArr, onDate) };
  }
  if (shouldShowBadge(depTz ?? arrTz, tripTz)) {
    const label = tzAbbrev(effectiveTz(depTz ?? arrTz, tripTz)!, onDate);
    return { dep: label, arr: label };
  }
  return { dep: '', arr: '' };
}

const FALLBACK_ZONES = [
  'UTC',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Anchorage',
  'Pacific/Honolulu', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome',
  'Europe/Amsterdam', 'Europe/Zurich', 'Europe/Lisbon', 'Europe/Athens', 'Europe/Istanbul', 'Europe/Moscow',
  'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Nairobi', 'Africa/Lagos',
  'Asia/Dubai', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore',
  'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
  'Australia/Sydney', 'Australia/Melbourne', 'Australia/Perth', 'Pacific/Auckland', 'Pacific/Fiji',
];

export function getTimezoneOptions(): string[] {
  try {
    const zones = Intl.supportedValuesOf?.('timeZone');
    if (zones && zones.length > 0) return zones as string[];
  } catch {
    // fall through to the curated list
  }
  return FALLBACK_ZONES;
}
