export const generateDatesArray = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  
  // Parse dates without time component
  let currentDate = new Date(startDate.split('T')[0]);
  const lastDate = new Date(endDate.split('T')[0]);

  // Set both dates to start of day for consistent comparison
  currentDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  // Generate dates including both check-in and check-out dates
  while (currentDate <= lastDate) {
    // Store only the date portion
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};
