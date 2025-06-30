
import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import DateTimeRangeField, { DateTimeRange } from "@/components/ui/DateTimeRangeField";
import { useForm, FormProvider } from "react-hook-form";
import { format } from "date-fns";

interface TimingSectionProps {
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
}

const TimingSection: React.FC<TimingSectionProps> = ({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}) => {
  const form = useForm({
    defaultValues: {
      travelDates: {
        from: startDate ? new Date(startDate) : null,
        to: endDate ? new Date(endDate) : null,
        fromTime: undefined,
        toTime: undefined,
      } as DateTimeRange
    }
  });

  // Update form values when props change
  useEffect(() => {
    const newRange = {
      from: startDate ? new Date(startDate) : null,
      to: endDate ? new Date(endDate) : null,
      fromTime: undefined,
      toTime: undefined,
    };
    form.setValue('travelDates', newRange);
  }, [startDate, endDate, form]);

  const handleDateChange = () => {
    const currentValues = form.getValues('travelDates');
    
    if (currentValues.from) {
      const fromStr = format(currentValues.from, 'yyyy-MM-dd');
      onStartDateChange(fromStr);
    } else {
      onStartDateChange('');
    }
    
    if (currentValues.to) {
      const toStr = format(currentValues.to, 'yyyy-MM-dd');
      onEndDateChange(toStr);
    } else {
      onEndDateChange('');
    }
  };

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch(() => {
      handleDateChange();
    });
    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-700">
          When are you planning to travel? 
        </Label>

        <DateTimeRangeField
          name="travelDates"
          label="Travel Dates"
          required
        />
      </div>
    </FormProvider>
  );
};

export default TimingSection;
