// components/ui/RequiredLabel.jsx
import React from 'react';

const RequiredLabel = ({ children, ...props }) => (
  <label {...props}>
    {children} <span style={{ color: 'red' }}>*</span>
  </label>
);

export default RequiredLabel;

// activity form component (example)
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const ActivityForm = () => {
  // Assuming activity and onActivityChange are defined elsewhere
  const activity = { title: '', description: '' }; //Example
  const onActivityChange = (updatedActivity) => {
    //Example implementation
    console.log("Activity updated:", updatedActivity);
  };


  return (
    <form>
      <div>
        <RequiredLabel htmlFor="title">Title</RequiredLabel>
        <Input
          id="title"
          value={activity.title}
          onChange={(e) => onActivityChange({ ...activity, title: e.target.value })}
          required
        />
      </div>
      <div>
        <RequiredLabel htmlFor="activity_date">Date</RequiredLabel>
        <input type="date" id="activity_date" />
      </div>
      {/* ... other activity fields ... */}
    </form>
  );
};

export default ActivityForm;