
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HotelOptionalDetailsProps {
  hotelDetails: string;
  hotelUrl: string;
  onDetailsChange: (value: string) => void;
  onUrlChange: (value: string) => void;
}

const HotelOptionalDetails: React.FC<HotelOptionalDetailsProps> = ({
  hotelDetails,
  hotelUrl,
  onDetailsChange,
  onUrlChange
}) => {
  return (
    <>
      <div>
        <Label htmlFor="hotel_details">Details (Optional)</Label>
        <Textarea
          id="hotel_details"
          value={hotelDetails}
          onChange={(e) => onDetailsChange(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="hotel_url">URL (Optional)</Label>
        <Input
          id="hotel_url"
          type="url"
          value={hotelUrl}
          placeholder="https://..."
          onChange={(e) => onUrlChange(e.target.value)}
        />
      </div>
    </>
  );
};

export default HotelOptionalDetails;
