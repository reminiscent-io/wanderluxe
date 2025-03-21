export const generateDatesArray = (startDate: string, endDate: string): string[] => {
  if (!startDate || !endDate) {
    console.error('Invalid dates provided to generateDatesArray', { startDate, endDate });
    return [];
  }

  // Ensure proper date format (YYYY-MM-DD)
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    // If the string already has the correct format, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

    // Otherwise convert to ISO and extract date part
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  };

  const formattedStart = formatDate(startDate);
  const formattedEnd = formatDate(endDate);

  const start = new Date(formattedStart);
  const end = new Date(formattedEnd);
  const datesArray: string[] = [];

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date conversion in generateDatesArray', { 
      startDate, endDate, formattedStart, formattedEnd, 
      startTime: start.getTime(), endTime: end.getTime() 
    });
    return [];
  }

  console.log(`Generating dates from ${formattedStart} to ${formattedEnd}`);

  // Generate array of dates between start and end (inclusive of start, exclusive of end)
  const current = new Date(start);
  while (current < end) {
    const dateString = current.toISOString().split('T')[0];
    datesArray.push(dateString);
    current.setDate(current.getDate() + 1);
  }

  console.log(`Generated ${datesArray.length} dates:`, datesArray);
  return datesArray;
};