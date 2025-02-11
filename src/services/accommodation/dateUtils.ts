
export const generateDatesArray = (startDate: string, endDate: string) => {
  const dates: string[] = [];
  
  // Parse dates without timezone, ensuring they're treated as local dates
  const currentDate = new Date(startDate.split('T')[0]);
  const lastDate = new Date(endDate.split('T')[0]);

  // Generate dates array including both check-in and check-out dates
  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};
