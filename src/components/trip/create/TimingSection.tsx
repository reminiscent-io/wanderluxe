
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const isEndDateValid = !startDate || !endDate || new Date(endDate) >= new Date(startDate);
  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium text-gray-700">
        When are you planning to travel? 
      </Label>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="startDate"
            className="text-sm font-medium text-gray-700"
          >
            Start Date <span className="text-red-500"> *</span>
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
            End Date <span className="text-red-500"> *</span>
          </Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className={!isEndDateValid ? "border-red-500" : ""}
          />
          {!isEndDateValid && (
            <p className="text-red-500 text-sm mt-1">End date cannot be before start date</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimingSection;
