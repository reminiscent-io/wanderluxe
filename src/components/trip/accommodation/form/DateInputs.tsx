
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label htmlFor="hotel_checkin_date">Check-in Date *</Label>
        <Input
          id="hotel_checkin_date"
          type="date"
          value={checkinDate}
          onChange={(e) => onCheckinChange(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="hotel_checkout_date">Check-out Date *</Label>
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
