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
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const ActivityForm = () => {
  return (
    <form>
      <div>
        <RequiredLabel htmlFor="activity_name">Activity Name</RequiredLabel>
        <input type="text" id="activity_name" />
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