import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantSearchInput from './RestaurantSearchInput';
import { Loader } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast"; // Added useToast import


const formSchema = z.object({
  restaurant_name: z.string().min(1, "Restaurant name is required"),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  website: z.string().optional(),
  reservation_time: z.string().optional().nullable(),
  number_of_people: z.number().min(1).optional(),
  notes: z.string().optional(),
  cost: z.number().optional(),
  place_id: z.string().optional(),
  rating: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface RestaurantReservationFormProps {
  onSubmit: (data: FormValues & { tripId: string }) => void; 
  defaultValues?: Partial<FormValues>;
  isSubmitting?: boolean;
  tripId: string; 
}

const formatTimeOption = (time: string | null) => {
  if (!time) return '';

  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12; 
  return `${displayHour}:${minute} ${period}`;
};

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  tripId,
}) => {
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const toast = useToast(); // Initialize toast

  useEffect(() => {
    const loadAPI = async () => {
      try {
        const isLoaded = await loadGoogleMapsAPI(); // Assuming loadGoogleMapsAPI is defined elsewhere
        if (isLoaded) {
          setIsGoogleMapsLoaded(true);
        } else {
          toast.error('Failed to initialize restaurant search');
        }
      } catch (error) {
        console.error('Error initializing Google Places:', error);
        toast.error('Failed to initialize restaurant search');
      }
    };

    loadAPI();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurant_name: '',
      reservation_time: null,
      number_of_people: undefined,
      notes: '',
      cost: undefined,
      ...defaultValues,
    },
  });

  const handlePlaceSelect = (place: any) => {
    form.setValue('restaurant_name', place.name);
    form.setValue('address', place.formatted_address);
    form.setValue('phone_number', place.formatted_phone_number);
    form.setValue('website', place.website);
    form.setValue('place_id', place.place_id);
    form.setValue('rating', place.rating);
  };

  const handleSubmitForm = form.handleSubmit((data) => {
    const processedData = {
      ...data,
      reservation_time: data.reservation_time === '' ? null : data.reservation_time,
      tripId: tripId 
    };
    onSubmit(processedData);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmitForm} className="space-y-4">
        <FormField
          control={form.control}
          name="restaurant_name"
          render={({ field }) => (
            <FormItem>
              {isGoogleMapsLoaded ? (
                <RestaurantSearchInput
                  value={field.value}
                  onChange={(restaurantName, placeDetails) => {
                    field.onChange(restaurantName);
                    if (placeDetails) {
                      form.setValue('address', placeDetails.formatted_address || '');
                      form.setValue('phone_number', placeDetails.formatted_phone_number || '');
                      form.setValue('website', placeDetails.website || '');
                      form.setValue('place_id', placeDetails.place_id || '');
                      form.setValue('rating', placeDetails.rating || 0);
                    }
                  }}
                />
              ) : (
                <div>Loading restaurant search...</div>
              )}
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reservation_time"
            render={({ field }) => {
              const [hour, minute, period] = React.useMemo(() => {
                if (!field.value) return [12, 0, 'AM'];

                const [hourStr, minuteStr] = field.value.split(':');
                const hourNum = parseInt(hourStr, 10);
                const minuteNum = parseInt(minuteStr, 10);

                const period = hourNum >= 12 ? 'PM' : 'AM';
                const hour12 = hourNum % 12 || 12;

                return [hour12, minuteNum, period];
              }, [field.value]);

              const handleTimeChange = (newHour, newMinute, newPeriod) => {
                let hour24 = newHour;
                if (newPeriod === 'PM' && newHour < 12) {
                  hour24 = newHour + 12;
                } else if (newPeriod === 'AM' && newHour === 12) {
                  hour24 = 0;
                }

                const timeString = `${hour24.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
                field.onChange(timeString);
              };

              return (
                <FormItem>
                  <FormLabel>Reservation Time</FormLabel>
                  <div className="flex items-center space-x-2">
                    <select
                      className="h-10 px-3 py-2 bg-white border border-input rounded-md text-sm"
                      value={hour}
                      onChange={(e) => handleTimeChange(parseInt(e.target.value, 10), minute, period)}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <span>:</span>

                    <select
                      className="h-10 px-3 py-2 bg-white border border-input rounded-md text-sm"
                      value={minute}
                      onChange={(e) => handleTimeChange(hour, parseInt(e.target.value, 10), period)}
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {m.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>

                    <select
                      className="h-10 px-3 py-2 bg-white border border-input rounded-md text-sm"
                      value={period}
                      onChange={(e) => handleTimeChange(hour, minute, e.target.value)}
                    >
                      <option value="AM">AM</option>
                      <option value="PM">PM</option>
                    </select>
                  </div>
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="number_of_people"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of People</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                    className="bg-white"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} className="bg-white" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cost</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  className="bg-white"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-sand-500 hover:bg-sand-600 text-white"
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Reservation'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default RestaurantReservationForm;

// Placeholder for the Google Maps API loading function.  Replace with your actual implementation.
const loadGoogleMapsAPI = async (): Promise<boolean> => {
  // Your Google Maps API loading logic here.  Return true if successful, false otherwise.
  // Example:  Check if the google maps script is already loaded or load it.
  return true; // Replace with your actual API loading and success check.
};