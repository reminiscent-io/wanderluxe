
import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import DateRangeField, { DateRange } from "@/components/ui/DateRangeField";
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
      dateRange: {
        from: startDate ? new Date(startDate) : null,
        to: endDate ? new Date(endDate) : null,
      } as DateRange
    }
  });

  // Update form values when props change
  useEffect(() => {
    const newRange = {
      from: startDate ? new Date(startDate) : null,
      to: endDate ? new Date(endDate) : null,
    };
    form.setValue('dateRange', newRange);
  }, [startDate, endDate, form]);

  const handleDateRangeChange = (range: DateRange) => {
    if (range.from) {
      const fromStr = format(range.from, 'yyyy-MM-dd');
      onStartDateChange(fromStr);
    } else {
      onStartDateChange('');
    }
    
    if (range.to) {
      const toStr = format(range.to, 'yyyy-MM-dd');
      onEndDateChange(toStr);
    } else {
      onEndDateChange('');
    }
  };

  return (
    <FormProvider {...form}>
      <div className="space-y-4">
        <Label className="text-sm font-medium text-gray-700">
          When are you planning to travel? 
        </Label>

        <DateRangeField
          name="dateRange"
          label="Travel Dates"
          required
          onChange={handleDateRangeChange}
        />
      </div>
    </FormProvider>
  );
};

export default TimingSection;
