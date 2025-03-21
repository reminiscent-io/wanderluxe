/**
 * Safely formats a time string into a readable format.
 * Handles null/undefined values gracefully.
 * 
 * @param time Time in HH:MM or HH:MM:SS format (24-hour)
 * @returns Formatted time string or empty string if invalid
 */
export const formatTime = (time?: string | null): string => {
  if (!time) return '';

  try {
    // Extract hours and minutes
    const [hours, minutes] = time.split(':');
    if (!hours || !minutes) return '';

    const hoursNum = parseInt(hours, 10);
    const minutesNum = parseInt(minutes, 10);

    if (isNaN(hoursNum) || isNaN(minutesNum)) return '';

    // Convert to 12-hour format
    const period = hoursNum >= 12 ? 'PM' : 'AM';
    const hours12 = hoursNum % 12 || 12; // Convert 0 to 12 for 12 AM

    return `${hours12}:${minutesNum.toString().padStart(2, '0')} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};