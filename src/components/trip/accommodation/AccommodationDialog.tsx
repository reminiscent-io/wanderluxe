
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Currency, CURRENCIES } from "@/utils/currencyConstants";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseCost } from "@/utils/costUtils";
import { Accommodation } from "@/types/trip";
import { PlaceResult } from "@/components/places/PlaceSearchInput";
import { HotelSearchDialog } from "./HotelSearchDialog";

const accommodationSchema = z.object({
  hotel: z.string().min(1, "Hotel name is required"),
  hotel_details: z.string().optional(),
  hotel_url: z.string().optional(),
  hotel_checkin_date: z.date(),
  hotel_checkout_date: z.date(),
  cost: z.string().optional(),
  currency: z.string().optional(),
  expense_type: z.string().optional(),
  is_paid: z.boolean().optional(),
  expense_date: z.string().optional(),
  hotel_address: z.string().optional(),
  hotel_phone: z.string().optional(),
  hotel_place_id: z.string().optional(),
  hotel_website: z.string().optional(),
  order_index: z.number().optional(),
});

type FormData = z.infer<typeof accommodationSchema>;

interface AccommodationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: FormData) => Promise<void>;
  accommodation?: Accommodation;
  arrivalDate: string;
  departureDate: string;
}

const AccommodationDialog: React.FC<AccommodationDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  accommodation,
  arrivalDate,
  departureDate,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(accommodationSchema),
    defaultValues: {
      hotel: accommodation?.hotel || "",
      hotel_details: accommodation?.hotel_details || "",
      hotel_url: accommodation?.hotel_url || "",
      hotel_checkin_date: accommodation?.hotel_checkin_date ? new Date(accommodation.hotel_checkin_date) : new Date(arrivalDate),
      hotel_checkout_date: accommodation?.hotel_checkout_date ? new Date(accommodation.hotel_checkout_date) : new Date(departureDate),
      cost: accommodation?.cost?.toString() || "",
      currency: accommodation?.currency || "USD",
      is_paid: accommodation?.is_paid || false,
      hotel_address: accommodation?.hotel_address || "",
      hotel_phone: accommodation?.hotel_phone || "",
      hotel_place_id: accommodation?.hotel_place_id || "",
      hotel_website: accommodation?.hotel_website || "",
    },
  });

  const onSubmit = async (data: FormData) => {
    await onSave(data);
    onClose();
  };

  const handleHotelSelect = (place: PlaceResult) => {
    form.setValue("hotel", place.name);
    form.setValue("hotel_address", place.formatted_address);
    form.setValue("hotel_phone", place.formatted_phone_number || "");
    form.setValue("hotel_place_id", place.place_id);
    form.setValue("hotel_website", place.website || "");
  };

  const formatDisplayCost = (value: string) => {
    const numericValue = parseCost(value);
    return numericValue ? numericValue.toLocaleString() : value;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{accommodation ? "Edit" : "Add"} Accommodation</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="hotel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Name*</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input {...field} />
                      <HotelSearchDialog onSelect={handleHotelSelect} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hotel_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hotel Details</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hotel_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Booking URL</FormLabel>
                  <FormControl>
                    <Input {...field} type="url" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="hotel_checkin_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-in Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hotel_checkout_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Check-out Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-[240px] pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="text"
                        value={formatDisplayCost(field.value || '')}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d.]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <FormField
                control={form.control}
                name="is_paid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Mark as Paid
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AccommodationDialog;
