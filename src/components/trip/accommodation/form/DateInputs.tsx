import React from 'react';
import { Input } from "@/components/ui/input";

interface RequiredLabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

const RequiredLabel: React.FC<RequiredLabelProps> = ({ children, ...props }) => (
  <label {...props}>
    {children}
    <span style={{ color: 'red' }}>*</span>
  </label>
);


interface DateInputsProps {
  checkinDate: string;
  checkoutDate: string;
  onCheckinChange: (value: string) => void;
  onCheckoutChange: (value: string) => void;
}

const DateInputs: React.FC<DateInputsProps> = ({
  checkinDate,
  checkoutDate,
  onCheckinChange,
  onCheckoutChange
}) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <RequiredLabel htmlFor="hotel_checkin_date">Check-in Date</RequiredLabel>
        <Input
          id="hotel_checkin_date"
          type="date"
          value={checkinDate}
          onChange={(e) => onCheckinChange(e.target.value)}
          required
        />
      </div>
      <div>
        <RequiredLabel htmlFor="hotel_checkout_date">Check-out Date</RequiredLabel>
        <Input
          id="hotel_checkout_date"
          type="date"
          value={checkoutDate}
          onChange={(e) => onCheckoutChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
};

export default DateInputs;