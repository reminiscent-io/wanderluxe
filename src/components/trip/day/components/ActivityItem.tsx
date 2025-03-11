<div 
  className={cn(
    "p-3 rounded-md cursor-pointer transition-colors",
    "hover:bg-gray-50"
  )}
  onClick={() => {
    console.log("Activity item clicked:", activity);
    if (activity && activity.id) {
      onActivityClick(activity.id);
    } else {
      console.error("Activity or activity ID is missing");
    }
  }}
>