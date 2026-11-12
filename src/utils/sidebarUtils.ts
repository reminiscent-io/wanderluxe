export function formatDateSafe(dateString: string): string {
  if (!dateString || dateString === 'No Date') return 'No Date';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  // Use local date to avoid timezone offset issues
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function compareDatesSafe(a: string, b: string): number {
  if (a === 'No Date') return 1;
  if (b === 'No Date') return -1;
  return a.localeCompare(b);
}

export function formatTime(time: string): string {
  if (!time) return '';
  try {
    const date = new Date(`2000-01-01T${time}`);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase();
  } catch {
    return time;
  }
}
