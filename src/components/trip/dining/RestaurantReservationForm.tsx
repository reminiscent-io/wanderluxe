import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantSearchInput from './RestaurantSearchInput';
import { Loader } from 'lucide-react';

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
  onSubmit: (data: FormValues & { tripId: string }) => void; // Added tripId to onSubmit data
  defaultValues?: Partial<FormValues>;
  isSubmitting?: boolean;
  tripId: string; // Added tripId prop
}

const RestaurantReservationForm: React.FC<RestaurantReservationFormProps> = ({
  onSubmit,
  defaultValues,
  isSubmitting = false,
  tripId, // Using tripId prop
}) => {
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
    // Convert empty string to null for reservation_time
    const processedData = {
      ...data,
      reservation_time: data.reservation_time === '' ? null : data.reservation_time,
      tripId: tripId // Adding tripId to the data
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
              <RestaurantSearchInput
                onPlaceSelect={handlePlaceSelect}
                defaultValue={field.value}
                tripId={tripId} // Passing tripId to RestaurantSearchInput
              />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reservation_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reservation Time</FormLabel>
                <FormControl>
                  <Input 
                    type="time" 
                    {...field} 
                    value={field.value || ''} 
                    onChange={(e) => field.onChange(e.target.value || null)}
                    className="bg-white" 
                  />
                </FormControl>
              </FormItem>
            )}
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