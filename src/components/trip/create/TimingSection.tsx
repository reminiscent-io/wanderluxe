
import React, { useEffect, useCallback } from 'react';
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

  const handleDateChange = useCallback((values: DateTimeRange) => {
    if (values.from) {
      const fromStr = format(values.from, 'yyyy-MM-dd');
      onStartDateChange(fromStr);
    } else {
      onStartDateChange('');
    }
    
    if (values.to) {
      const toStr = format(values.to, 'yyyy-MM-dd');
      onEndDateChange(toStr);
    } else {
      onEndDateChange('');
    }
  }, [onStartDateChange, onEndDateChange]);

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.travelDates) {
        handleDateChange(values.travelDates as DateTimeRange);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, handleDateChange]);

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
          hideTimeInputs={true}
        />
      </div>
    </FormProvider>
  );
};

export default TimingSection;
