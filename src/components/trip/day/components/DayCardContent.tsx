const handleEditActivityWrapper = (activityId: string) => {
    console.log("Editing activity with ID:", activityId);
    if (typeof onEditActivity === 'function') {
      onEditActivity(activityId);
    } else {
      console.error('onEditActivity is not a function in DayCardContent');
    }
  };