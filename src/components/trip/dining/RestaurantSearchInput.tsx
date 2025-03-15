import React from 'react';
import { Label } from "@/components/ui/label";
import GooglePlacesAutocomplete from '../accommodation/GooglePlacesAutocomplete';

interface RestaurantSearchInputProps {
  value: string;
  onChange: (restaurantName: string, placeDetails?: google.maps.places.PlaceResult) => void;
}

const RestaurantSearchInput: React.FC<RestaurantSearchInputProps> = ({
  value,
  onChange
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="restaurant">Restaurant Name *</Label>
      <GooglePlacesAutocomplete
        value={value}
        onChange={onChange}
        placeholder="Start typing to search for restaurants..."
      />
    </div>
  );
};

export default RestaurantSearchInput;

const handleSaveReservation = async (reservationData, tripId) => {
  try {
    if (!tripId) {
      console.error("Missing trip_id - cannot save reservation");
      throw new Error("Missing trip_id");
    }
    
    const dataWithTripId = {
      ...reservationData,
      trip_id: tripId,
    };

    const result = await supabase
      .from('restaurant_reservations')
      .insert(dataWithTripId);

    if (result.error) {
      console.error("Error saving reservation:", result.error);
      throw result.error;
    }

    return result.data;
  } catch (error) {
    console.error("Error saving reservation:", error);
    throw error;
  }
};