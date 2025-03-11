<div 
  className={cn(
    "p-3 rounded-md cursor-pointer transition-colors",
    "hover:bg-gray-50"
  )}
  onClick={() => {
    console.log("Activity item clicked:", activity);
    if (onActivityClick && activity && activity.id) {
      console.log('Sending activity ID for click:', activity.id);
      onActivityClick(activity.id);
    } else {
      console.error("Missing activity ID or onActivityClick handler");
    }
  }}
>