export const generateDatesArray = (startDate: string, endDate: string) => {
  console.log('Generating dates array with:', { startDate, endDate });
  const dates = [];
  let currentDate = new Date(startDate);
  const lastDate = new Date(endDate);

  while (currentDate <= lastDate) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log('Generated dates:', dates);
  return dates;
};