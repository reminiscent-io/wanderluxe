export const generateDatesArray = (startDate: string, endDate: string) => {
  console.log('Generating dates array with:', { startDate, endDate });
  const dates = [];
  
  // Parse dates without time component
  let currentDate = new Date(startDate.split('T')[0]);
  const lastDate = new Date(endDate.split('T')[0]);

  // Set time to noon to avoid any timezone issues
  currentDate.setHours(12, 0, 0, 0);
  lastDate.setHours(12, 0, 0, 0);

  while (currentDate <= lastDate) {
    // Store only the date portion
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('Generated dates:', dates);
  return dates;
};