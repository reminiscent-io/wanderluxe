import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface TimingSectionProps {
  timingType: string;
  onTimingTypeChange: (value: string) => void;
  timeOfYear: string;
  onTimeOfYearChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  arrivalDate: string;
  onArrivalDateChange: (value: string) => void;
  departureDate: string;
  onDepartureDateChange: (value: string) => void;
}

const TimingSection: React.FC<TimingSectionProps> = ({
  timingType,
  onTimingTypeChange,
  timeOfYear,
  onTimeOfYearChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  arrivalDate,
  onArrivalDateChange,
  departureDate,
  onDepartureDateChange,
}) => {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">
        When are you planning to travel?
      </Label>
      <RadioGroup
        value={timingType}
        onValueChange={onTimingTypeChange}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="timeOfYear" id="timeOfYear" />
          <Label htmlFor="timeOfYear">Time of Year</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="specificDates" id="specificDates" />
          <Label htmlFor="specificDates">Specific Dates</Label>
        </div>
      </RadioGroup>

      {timingType === "timeOfYear" && (
        <div className="space-y-2">
          <Label
            htmlFor="timeOfYear"
            className="text-sm font-medium text-gray-700"
          >
            Time of Year
          </Label>
          <Input
            id="timeOfYear"
            type="text"
            placeholder="e.g., Summer, June, Winter holidays"
            value={timeOfYear}
            onChange={(e) => onTimeOfYearChange(e.target.value)}
          />
        </div>
      )}

      {timingType === "specificDates" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="startDate"
              className="text-sm font-medium text-gray-700"
            >
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="endDate"
              className="text-sm font-medium text-gray-700"
            >
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="arrivalDate"
              className="text-sm font-medium text-gray-700"
            >
              Arrival Date
            </Label>
            <Input
              id="arrivalDate"
              type="date"
              value={arrivalDate}
              onChange={(e) => onArrivalDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="departureDate"
              className="text-sm font-medium text-gray-700"
            >
              Departure Date
            </Label>
            <Input
              id="departureDate"
              type="date"
              value={departureDate}
              onChange={(e) => onDepartureDateChange(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TimingSection;