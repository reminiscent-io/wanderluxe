
import React, { useEffect, useCallback } from 'react';
import { Label } from "@/components/ui/label";
import LuxuryDateTimeRangePicker, { LuxuryDateTimeRange } from "@/components/ui/LuxuryDateTimeRangePicker";
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
        start: startDate ? new Date(startDate) : null,
        end: endDate ? new Date(endDate) : null,
        startTime: undefined,
        endTime: undefined,
      } as LuxuryDateTimeRange
    }
  });

  const handleDateChange = useCallback((values: LuxuryDateTimeRange) => {
    if (values.start) {
      const startStr = format(values.start, 'yyyy-MM-dd');
      onStartDateChange(startStr);
    } else {
      onStartDateChange('');
    }
    
    if (values.end) {
      const endStr = format(values.end, 'yyyy-MM-dd');
      onEndDateChange(endStr);
    } else {
      onEndDateChange('');
    }
  }, [onStartDateChange, onEndDateChange]);

  // Watch for form changes and update parent
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.travelDates) {
        handleDateChange(values.travelDates as LuxuryDateTimeRange);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, handleDateChange]);

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <LuxuryDateTimeRangePicker
          name="travelDates"
          label="Travel Dates"
          required
          hideTimeInputs={true}
          placeholder="Select your travel dates"
        />
      </div>
    </FormProvider>
  );
};

export default TimingSection;
