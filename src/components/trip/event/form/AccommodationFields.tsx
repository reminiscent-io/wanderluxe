import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AccommodationFieldsProps {
  hotel: string;
  hotelDetails: string;
  hotelUrl: string;
  checkinDate: string;
  checkoutDate: string;
  onHotelChange: (value: string) => void;
  onHotelDetailsChange: (value: string) => void;
  onHotelUrlChange: (value: string) => void;
  onCheckinDateChange: (value: string) => void;
  onCheckoutDateChange: (value: string) => void;
  isExistingStay?: boolean;
}

const AccommodationFields: React.FC<AccommodationFieldsProps> = ({
  hotel,
  hotelDetails,
  hotelUrl,
  checkinDate,
  checkoutDate,
  onHotelChange,
  onHotelDetailsChange,
  onHotelUrlChange,
  onCheckinDateChange,
  onCheckoutDateChange,
  isExistingStay = false
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="hotel">Hotel</Label>
        <Input
          id="hotel"
          value={hotel}
          onChange={(e) => onHotelChange(e.target.value)}
          disabled={isExistingStay}
          className={isExistingStay ? "bg-gray-100" : ""}
        />
      </div>
      <div>
        <Label htmlFor="hotelDetails">Hotel Details</Label>
        <Textarea
          id="hotelDetails"
          value={hotelDetails}
          onChange={(e) => onHotelDetailsChange(e.target.value)}
          disabled={isExistingStay}
          className={isExistingStay ? "bg-gray-100" : ""}
        />
      </div>
      <div>
        <Label htmlFor="hotel_url">Hotel URL (optional)</Label>
        <Input
          id="hotel_url"
          type="url"
          value={hotelUrl}
          placeholder="https://..."
          onChange={(e) => onHotelUrlChange(e.target.value)}
          disabled={isExistingStay}
          className={isExistingStay ? "bg-gray-100" : ""}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotel_checkin_date">Check-in Date</Label>
          <Input
            id="hotel_checkin_date"
            type="date"
            value={checkinDate}
            onChange={(e) => onCheckinDateChange(e.target.value)}
            required={hotel ? true : false}
            disabled={isExistingStay}
            className={isExistingStay ? "bg-gray-100" : ""}
          />
        </div>
        <div>
          <Label htmlFor="hotel_checkout_date">Check-out Date</Label>
          <Input
            id="hotel_checkout_date"
            type="date"
            value={checkoutDate}
            onChange={(e) => onCheckoutDateChange(e.target.value)}
            required={hotel ? true : false}
            disabled={isExistingStay}
            className={isExistingStay ? "bg-gray-100" : ""}
          />
        </div>
      </div>
    </div>
  );
};

export default AccommodationFields;