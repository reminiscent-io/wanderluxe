// OpenWeatherMap's direct geocoder matches town names, not full addresses.
// A trip destination is Google's formatted_address, which for a hamlet reads
// like "Elmau, 82493 Krün, Germany", so try progressively looser queries:
// the full string, then without postal codes, then dropping the leading
// segment (falling back to the nearest town). Never down to the country
// alone, which would put the weather at its geographic centre.
export function geocodeCandidates(destination: string): string[] {
  const full = destination.trim().replace(/\s+/g, ' ');
  if (!full) return [];

  const segments = full
    .split(',')
    .map((s) => s.split(' ').filter((w) => !/\d/.test(w)).join(' ').trim())
    .filter(Boolean);

  const candidates = [full];
  for (let i = 0; segments.length - i >= 2; i++) {
    candidates.push(segments.slice(i).join(', '));
  }
  return [...new Set(candidates)];
}
