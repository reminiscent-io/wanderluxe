const handleEditActivityWrapper = (activityId: string) => {
    console.log("Editing activity with ID:", activityId);
    if (typeof onEditActivity === 'function' && activityId) {
      onEditActivity(activityId);
    } else {
      console.error('onEditActivity is not a function or activityId is missing in DayCardContent');
    }
  };