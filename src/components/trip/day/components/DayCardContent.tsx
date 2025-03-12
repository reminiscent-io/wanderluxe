const handleEditActivityWrapper = (activityId: string) => {
  console.log("Editing activity with ID:", activityId);
  onEditActivity?.(activityId) || console.error('onEditActivity is not a function in DayCardContent');
};
