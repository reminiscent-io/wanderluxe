// RequiredLabel.jsx
import React from 'react';

const RequiredLabel = ({ children, ...props }) => (
  <label {...props}>
    {children} <span style={{ color: 'red' }}>*</span>
  </label>
);

export default RequiredLabel;


// Example Accommodation Form (placeholder)
import React from 'react';
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const AccommodationForm = () => {
  return (
    <form>
      <RequiredLabel htmlFor="address">Address</RequiredLabel>
      <input type="text" id="address" />
      {/* other accommodation fields */}
    </form>
  );
};

export default AccommodationForm;


// Example Transportation Form (placeholder)
import React from 'react';
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const TransportationForm = () => {
  return (
    <form>
      <RequiredLabel htmlFor="transport_type">Transportation Type</RequiredLabel>
      <input type="text" id="transport_type" />
      {/* other transportation fields */}
    </form>
  );
};

export default TransportationForm;


// Example Activity Form (placeholder)
import React from 'react';
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const ActivityForm = () => {
  return (
    <form>
      <RequiredLabel htmlFor="activity_name">Activity Name</RequiredLabel>
      <input type="text" id="activity_name" />
      {/* other activity fields */}
    </form>
  );
};

export default ActivityForm;


// Example Dining Form (placeholder)
import React from 'react';
import { Label } from "@/components/ui/label";
import RequiredLabel from "@/components/ui/RequiredLabel";

const DiningForm = () => {
  return (
    <form>
      <RequiredLabel htmlFor="restaurant_name">Restaurant Name</RequiredLabel>
      <input type="text" id="restaurant_name" />
      <RequiredLabel htmlFor="reservation_date">Reservation Date</RequiredLabel>
      <input type="date" id="reservation_date" />
      <RequiredLabel htmlFor="reservation_time">Reservation Time</RequiredLabel>
      <input type="time" id="reservation_time" />
      {/* other dining fields */}
    </form>
  );
};

export default DiningForm;